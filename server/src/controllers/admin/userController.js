import User from "../../models/User.js";
import Post from "../../models/Post.js";
import Comment from "../../models/Comment.js";
import AuditLog from "../../models/AuditLog.js";
import NotificationService from "../../services/NotificationService.js";
import { getClientAgent } from "../../utils/clientAgent.js";
import { escapeRegex } from "../../utils/mongoSecurity.js";

/**
 * Helper to check if user is a FULL admin (role === 'admin')
 * Only full admins can affect other admin accounts
 */
export const isFullAdmin = (user) => user?.role === 'admin';

/**
 * POST /ban-user - Cấm người dùng
 */
export const banUser = async (req, res, next) => {
    try {
        const { userId, banDurationMinutes, reason } = req.body;

        if (!userId || !reason) {
            await AuditLog.logAction(req.user._id, 'ban_user', {
                result: 'failed',
                ipAddress: req.ip,
                clientAgent: getClientAgent(req),
                reason: 'Missing required fields'
            });
            return res.status(400).json({ error: "Thiếu thông tin userId hoặc lý do cấm" });
        }

        const user = await User.findById(userId);
        if (!user) {
            await AuditLog.logAction(req.user._id, 'ban_user', {
                targetId: userId,
                targetType: 'user',
                result: 'failed',
                ipAddress: req.ip,
                clientAgent: getClientAgent(req),
                reason: 'User not found'
            });
            return res.status(404).json({ error: "User không tồn tại" });
        }

        if (user._id.toString() === req.user._id.toString()) {
            await AuditLog.logAction(req.user._id, 'ban_user', {
                targetId: userId,
                targetType: 'user',
                result: 'failed',
                ipAddress: req.ip,
                clientAgent: getClientAgent(req),
                reason: 'Attempted self-ban'
            });
            return res.status(400).json({ error: "Không thể tự cấm chính mình" });
        }

        if (user.role === "admin" && !isFullAdmin(req.user)) {
            await AuditLog.logAction(req.user._id, 'ban_user', {
                targetId: userId,
                targetType: 'user',
                result: 'failed',
                ipAddress: req.ip,
                clientAgent: getClientAgent(req),
                reason: 'Non-full admin attempted to ban admin account'
            });
            return res.status(403).json({ error: "Chỉ admin toàn quyền mới có thể tác động lên tài khoản admin khác" });
        }

        const beforeData = {
            isBanned: user.isBanned,
            banReason: user.banReason,
            bannedAt: user.bannedAt,
            banExpiresAt: user.banExpiresAt
        };

        const banExpiresAt = banDurationMinutes
            ? new Date(Date.now() + banDurationMinutes * 60 * 1000)
            : null;

        user.isBanned = true;
        user.banReason = reason;
        user.bannedAt = new Date();
        user.banExpiresAt = banExpiresAt;
        user.bannedBy = req.user._id;

        await user.save();

        await AuditLog.logAction(req.user._id, 'ban_user', {
            targetId: userId,
            targetType: 'user',
            result: 'success',
            ipAddress: req.ip,
            clientAgent: getClientAgent(req),
            reason: reason,
            beforeData,
            afterData: {
                isBanned: user.isBanned,
                banReason: user.banReason,
                bannedAt: user.bannedAt,
                banExpiresAt: user.banExpiresAt
            },
            details: {
                banDurationMinutes,
                targetUserName: user.name,
                targetUserEmail: user.email
            }
        });

        try {
            await NotificationService.createBanNotification(user, req.user, reason, banExpiresAt);
        } catch (notifError) {
            console.error("[ERROR][ADMIN] Error creating ban notification:", notifError);
        }

        res.json({
            message: banDurationMinutes
                ? `Đã cấm user ${user.name} trong ${banDurationMinutes} phút`
                : `Đã cấm vĩnh viễn user ${user.name}`,
            user: {
                _id: user._id,
                name: user.name,
                isBanned: user.isBanned,
                banReason: user.banReason,
                banExpiresAt: user.banExpiresAt
            }
        });
    } catch (error) {
        await AuditLog.logAction(req.user._id, 'ban_user', {
            result: 'failed',
            ipAddress: req.ip,
            clientAgent: getClientAgent(req),
            reason: 'Server error: ' + error.message
        });
        next(error);
    }
};

/**
 * POST /unban-user - Gỡ cấm người dùng
 */
export const unbanUser = async (req, res, next) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: "Thiếu userId" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User không tồn tại" });
        }

        if (user.role === "admin" && !isFullAdmin(req.user)) {
            return res.status(403).json({ error: "Chỉ admin toàn quyền mới có thể tác động lên tài khoản admin khác" });
        }

        user.isBanned = false;
        user.banReason = "";
        user.bannedAt = null;
        user.banExpiresAt = null;
        user.bannedBy = null;

        await user.save();

        try {
            await NotificationService.createUnbanNotification(user, req.user);
        } catch (notifError) {
            console.error("[ERROR][ADMIN] Error creating unban notification:", notifError);
        }

        res.json({
            message: `Đã gỡ cấm user ${user.name}`,
            user: {
                _id: user._id,
                name: user.name,
                isBanned: user.isBanned
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /users - Lấy danh sách users với pagination
 */
export const getUsers = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const searchQuery = req.query.search ? {
            $or: [
                { name: { $regex: escapeRegex(req.query.search), $options: 'i' } },
                { email: { $regex: escapeRegex(req.query.search), $options: 'i' } }
            ]
        } : {};

        const allowedRoles = ['user', 'admin', 'moderator', 'vip'];
        const roleFilter = req.query.role && typeof req.query.role === 'string' && allowedRoles.includes(req.query.role)
            ? { role: req.query.role }
            : {};

        let banFilter = {};
        if (req.query.banned === 'true') {
            banFilter = { isBanned: true };
        } else if (req.query.banned === 'false') {
            banFilter = { isBanned: { $ne: true } };
        }

        const matchQuery = { ...searchQuery, ...roleFilter, ...banFilter };
        const total = await User.countDocuments(matchQuery);

        const users = await User.aggregate([
            { $match: matchQuery },
            {
                $lookup: {
                    from: "posts",
                    let: { userId: "$_id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$author", "$$userId"] } } },
                        { $count: "count" }
                    ],
                    as: "postStats"
                }
            },
            {
                $project: {
                    name: 1,
                    email: 1,
                    role: 1,
                    avatarUrl: 1,
                    createdAt: 1,
                    isBanned: 1,
                    banReason: 1,
                    bannedAt: 1,
                    banExpiresAt: 1,
                    bannedBy: 1,
                    postCount: {
                        $ifNull: [{ $arrayElemAt: ["$postStats.count", 0] }, 0]
                    }
                }
            },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit }
        ]);

        await AuditLog.logAction(req.user._id, 'view_user_list', {
            result: 'success',
            ipAddress: req.ip,
            clientAgent: getClientAgent(req),
            details: {
                page,
                limit,
                total,
                filters: { search: req.query.search, role: req.query.role, banned: req.query.banned }
            }
        });

        res.json({
            users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1
            }
        });
    } catch (e) {
        await AuditLog.logAction(req.user._id, 'view_user_list', {
            result: 'failed',
            ipAddress: req.ip,
            clientAgent: getClientAgent(req),
            reason: 'Server error: ' + e.message
        });
        next(e);
    }
};

/**
 * GET /users/:id - Lấy thông tin 1 user
 */
export const getUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id).lean();
        if (!user) {
            return res.status(404).json({ error: "Không tìm thấy người dùng" });
        }
        res.json({ user });
    } catch (e) {
        next(e);
    }
};

/**
 * PUT /users/:id/role - Thay đổi role user
 */
export const updateUserRole = async (req, res, next) => {
    try {
        const { role } = req.body;
        const validRoles = ['user', 'admin', 'moderator', 'premium'];

        if (!validRoles.includes(role)) {
            const mongoose = await import('mongoose');
            const Role = mongoose.default.model('Role');
            const existingRole = await Role.findOne({ name: role, isActive: true }).lean();
            if (!existingRole) {
                return res.status(400).json({ error: "Quyền không hợp lệ hoặc không tồn tại" });
            }
        }

        const targetUser = await User.findById(req.params.id).lean();
        if (!targetUser) {
            return res.status(404).json({ error: "Không tìm thấy người dùng" });
        }

        if (targetUser._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ error: "Không thể thay đổi quyền của chính bạn" });
        }

        if (targetUser.role === "admin" && !isFullAdmin(req.user)) {
            return res.status(403).json({ error: "Chỉ admin toàn quyền mới có thể tác động lên tài khoản admin khác" });
        }

        if (role === "admin" && !isFullAdmin(req.user)) {
            return res.status(403).json({ error: "Chỉ admin toàn quyền mới có thể cấp quyền admin cho người khác" });
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { role: role },
            { new: true, runValidators: true, lean: true }
        );

        res.json({
            message: "User role updated successfully",
            user: updatedUser
        });
    } catch (e) {
        next(e);
    }
};

/**
 * DELETE /users/:id - Xóa user
 */
export const deleteUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: "Không tìm thấy người dùng" });
        }

        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ error: "Không thể xóa chính bạn" });
        }

        if (user.role === "admin" && !isFullAdmin(req.user)) {
            return res.status(403).json({ error: "Chỉ admin toàn quyền mới có thể xóa tài khoản admin khác" });
        }

        // Get all comments by this user to update commentCount on posts
        const userComments = await Comment.find({ author: user._id }).select('post').lean();

        // Group comments by post and count
        const postCommentCounts = {};
        for (const comment of userComments) {
            if (comment.post) {
                const postId = comment.post.toString();
                postCommentCounts[postId] = (postCommentCounts[postId] || 0) + 1;
            }
        }

        // Update commentCount for each affected post
        const updatePromises = Object.entries(postCommentCounts).map(([postId, count]) =>
            Post.findByIdAndUpdate(postId, { $inc: { commentCount: -count } })
        );

        await Promise.all([
            ...updatePromises,
            Post.deleteMany({ author: user._id }),
            Comment.deleteMany({ author: user._id })
        ]);

        await user.deleteOne();

        res.json({ message: "User deleted successfully" });
    } catch (e) {
        next(e);
    }
};
