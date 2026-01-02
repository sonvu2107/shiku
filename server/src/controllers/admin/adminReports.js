import mongoose from "mongoose";
import Report from "../../models/Report.js";
import Post from "../../models/Post.js";
import Comment from "../../models/Comment.js";
import User from "../../models/User.js";
import AuditLog from "../../models/AuditLog.js";
import { getClientAgent } from "../../utils/clientAgent.js";

/**
 * Helper: Batch fetch targets cho reports - tránh N+1 query problem
 * Giảm từ N queries xuống còn 3 queries (1 per targetType)
 */
async function enrichReportsWithTargets(reports) {
    if (!reports || reports.length === 0) return [];

    // Group report IDs by targetType
    const postIds = [];
    const commentIds = [];
    const userIds = [];

    for (const report of reports) {
        const id = report.targetId;
        if (!id) continue;

        if (report.targetType === 'post') postIds.push(id);
        else if (report.targetType === 'comment') commentIds.push(id);
        else if (report.targetType === 'user') userIds.push(id);
    }

    // Batch fetch - chỉ 3 queries thay vì N queries
    const [posts, comments, users] = await Promise.all([
        postIds.length > 0
            ? Post.find({ _id: { $in: postIds } })
                .select('title slug author')
                .populate('author', 'name avatarUrl')
                .lean()
            : [],
        commentIds.length > 0
            ? Comment.find({ _id: { $in: commentIds } })
                .select('content author post')
                .populate('author', 'name avatarUrl')
                .populate('post', 'title slug')
                .lean()
            : [],
        userIds.length > 0
            ? User.find({ _id: { $in: userIds } })
                .select('name email avatarUrl')
                .lean()
            : []
    ]);

    // Build Maps for O(1) lookup
    const postMap = new Map(posts.map(p => [p._id.toString(), p]));
    const commentMap = new Map(comments.map(c => [c._id.toString(), c]));
    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    // Enrich reports với map lookup - không có thêm query nào
    return reports.map(report => {
        let target = null;
        const id = report.targetId?.toString();

        if (report.targetType === 'post') target = postMap.get(id);
        else if (report.targetType === 'comment') target = commentMap.get(id);
        else if (report.targetType === 'user') target = userMap.get(id);

        return {
            ...report,
            target,
            isTargetDeleted: !target
        };
    });
}

/**
 * GET /api/admin/reports
 * Lấy danh sách reports với pagination và filters
 */
export async function getReports(req, res, next) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const { status, targetType, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

        const result = await Report.getReports({
            page,
            limit,
            status,
            targetType,
            sortBy,
            sortOrder
        });

        // Batch fetch targets - 3 queries thay vì N queries
        const enrichedReports = await enrichReportsWithTargets(result.reports);

        res.json({
            success: true,
            reports: enrichedReports,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('[ERROR][ADMIN] Get reports error:', error);
        next(error);
    }
}

/**
 * GET /api/admin/reports/stats
 * Lấy thống kê reports
 */
export async function getReportStats(req, res, next) {
    try {
        // Single $facet pipeline - 1 query thay vì 6 queries
        const [statsResult] = await Report.aggregate([
            {
                $facet: {
                    byStatus: [
                        { $group: { _id: '$status', count: { $sum: 1 } } }
                    ],
                    byType: [
                        { $group: { _id: '$targetType', count: { $sum: 1 } } }
                    ],
                    byReason: [
                        { $match: { status: 'pending' } },
                        { $group: { _id: '$reason', count: { $sum: 1 } } }
                    ],
                    total: [
                        { $count: 'count' }
                    ]
                }
            }
        ]);

        // Parse status counts
        const statusCounts = { pending: 0, resolved: 0, dismissed: 0 };
        for (const s of statsResult.byStatus) {
            if (s._id) statusCounts[s._id] = s.count;
        }

        const total = statsResult.total[0]?.count || 0;

        res.json({
            success: true,
            stats: {
                pending: statusCounts.pending,
                resolved: statusCounts.resolved,
                dismissed: statusCounts.dismissed,
                total,
                byType: Object.fromEntries(statsResult.byType.map(t => [t._id, t.count])),
                byReason: Object.fromEntries(statsResult.byReason.map(r => [r._id, r.count]))
            }
        });
    } catch (error) {
        console.error('[ERROR][ADMIN] Get report stats error:', error);
        next(error);
    }
}

/**
 * POST /api/admin/reports/:id/resolve
 * Đánh dấu report đã xử lý với các action: delete_target, ban_user, warn_user
 */
export async function resolveReport(req, res, next) {
    try {
        const { id } = req.params;
        const { resolution, action, banReason } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: "ID không hợp lệ" });
        }

        const report = await Report.findById(id);
        if (!report) {
            return res.status(404).json({ success: false, error: "Không tìm thấy báo cáo" });
        }

        if (report.status !== 'pending') {
            return res.status(400).json({ success: false, error: "Báo cáo này đã được xử lý" });
        }

        let actionTaken = [];
        const targetAuthorId = report.targetSnapshot?.authorId;

        // Action: Delete target content
        if (action === 'delete_target' || action === 'delete_and_ban' || action === 'delete_and_warn') {
            if (report.targetType === 'post') {
                await Post.findByIdAndDelete(report.targetId);
                actionTaken.push('Đã xóa bài viết');
            } else if (report.targetType === 'comment') {
                await Comment.findByIdAndDelete(report.targetId);
                actionTaken.push('Đã xóa bình luận');
            }
        }

        // Action: Ban user
        if (action === 'ban_user' || action === 'delete_and_ban') {
            if (targetAuthorId) {
                await User.findByIdAndUpdate(targetAuthorId, {
                    isBanned: true,
                    bannedAt: new Date(),
                    bannedBy: req.user._id,
                    banReason: banReason || resolution || 'Vi phạm nội quy cộng đồng'
                });
                actionTaken.push('Đã cấm người dùng');

                // Create notification for banned user
                const Notification = mongoose.model('Notification');
                await Notification.create({
                    recipient: targetAuthorId,
                    type: 'ban',
                    title: 'Tài khoản bị cấm',
                    message: `Tài khoản của bạn đã bị cấm do vi phạm nội quy: ${banReason || resolution || 'Bài viết/bình luận vi phạm'}`,
                    data: { metadata: { reportId: report._id } }
                });
            }
        }

        // Action: Warn user (send notification)
        if (action === 'warn_user' || action === 'delete_and_warn') {
            if (targetAuthorId) {
                const Notification = mongoose.model('Notification');
                await Notification.create({
                    recipient: targetAuthorId,
                    type: 'system',
                    title: 'Cảnh báo vi phạm',
                    message: resolution || 'Nội dung của bạn đã bị báo cáo và xử lý. Vui lòng tuân thủ nội quy cộng đồng.',
                    data: { metadata: { reportId: report._id } }
                });
                actionTaken.push('Đã gửi cảnh báo');
            }
        }

        report.status = 'resolved';
        report.resolvedBy = req.user._id;
        report.resolvedAt = new Date();
        report.resolution = resolution || actionTaken.join(', ') || 'Đã xử lý';
        await report.save();

        // Audit log
        await AuditLog.logAction(req.user._id, 'resolve_report', {
            targetId: report._id,
            targetType: 'report',
            result: 'success',
            ipAddress: req.ip,
            clientAgent: getClientAgent(req),
            details: { reportTargetType: report.targetType, action, actionTaken }
        });

        res.json({
            success: true,
            message: actionTaken.length > 0 ? actionTaken.join(', ') : "Đã xử lý báo cáo",
            report
        });
    } catch (error) {
        console.error('[ERROR][ADMIN] Resolve report error:', error);
        next(error);
    }
}

/**
 * POST /api/admin/reports/:id/dismiss
 * Bỏ qua report
 */
export async function dismissReport(req, res, next) {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: "ID không hợp lệ" });
        }

        const report = await Report.findById(id);
        if (!report) {
            return res.status(404).json({ success: false, error: "Không tìm thấy báo cáo" });
        }

        if (report.status !== 'pending') {
            return res.status(400).json({ success: false, error: "Báo cáo này đã được xử lý" });
        }

        report.status = 'dismissed';
        report.resolvedBy = req.user._id;
        report.resolvedAt = new Date();
        report.resolution = reason || 'Báo cáo không hợp lệ';
        await report.save();

        // Audit log
        await AuditLog.logAction(req.user._id, 'dismiss_report', {
            targetId: report._id,
            targetType: 'report',
            result: 'success',
            ipAddress: req.ip,
            clientAgent: getClientAgent(req),
            details: { reportTargetType: report.targetType, reason }
        });

        res.json({
            success: true,
            message: "Đã bỏ qua báo cáo",
            report
        });
    } catch (error) {
        console.error('[ERROR][ADMIN] Dismiss report error:', error);
        next(error);
    }
}

/**
 * DELETE /api/admin/reports/:id
 * Xóa report
 */
export async function deleteReport(req, res, next) {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: "ID không hợp lệ" });
        }

        const report = await Report.findByIdAndDelete(id);
        if (!report) {
            return res.status(404).json({ success: false, error: "Không tìm thấy báo cáo" });
        }

        // Audit log
        await AuditLog.logAction(req.user._id, 'delete_report', {
            targetId: id,
            targetType: 'report',
            result: 'success',
            ipAddress: req.ip,
            clientAgent: getClientAgent(req)
        });

        res.json({
            success: true,
            message: "Đã xóa báo cáo"
        });
    } catch (error) {
        console.error('[ERROR][ADMIN] Delete report error:', error);
        next(error);
    }
}
