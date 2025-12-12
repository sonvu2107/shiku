import AuditLog from "../../models/AuditLog.js";
import { getClientAgent } from "../../utils/clientAgent.js";

/**
 * GET /audit-logs - Xem nhật ký audit
 */
export const getAuditLogs = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
        const skip = (page - 1) * limit;

        const filters = {};
        if (req.query.action) filters.action = req.query.action;
        if (req.query.adminId) filters.adminId = req.query.adminId;
        if (req.query.result) filters.result = req.query.result;

        if (req.query.fromDate || req.query.toDate) {
            filters.timestamp = {};
            if (req.query.fromDate) filters.timestamp.$gte = new Date(req.query.fromDate);
            if (req.query.toDate) filters.timestamp.$lte = new Date(req.query.toDate);
        }

        const total = await AuditLog.countDocuments(filters);

        const logs = await AuditLog.find(filters)
            .populate('adminId', 'name email role')
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        await AuditLog.logAction(req.user._id, 'view_admin_stats', {
            result: 'success',
            ipAddress: req.ip,
            clientAgent: getClientAgent(req),
            details: { endpoint: 'audit-logs', page, limit, total }
        });

        res.json({
            logs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        await AuditLog.logAction(req.user._id, 'view_admin_stats', {
            result: 'failed',
            ipAddress: req.ip,
            clientAgent: getClientAgent(req),
            reason: 'Server error: ' + error.message
        });
        next(error);
    }
};

/**
 * GET /suspicious-activities - Xem các hoạt động đáng nghi
 */
export const getSuspiciousActivities = async (req, res, next) => {
    try {
        const timeframe = parseInt(req.query.hours) || 24;

        const suspiciousActivities = await AuditLog.getSuspiciousActivities(timeframe);

        await AuditLog.logAction(req.user._id, 'view_admin_stats', {
            result: 'success',
            ipAddress: req.ip,
            clientAgent: getClientAgent(req),
            details: { endpoint: 'suspicious-activities', timeframe }
        });

        res.json({
            suspiciousActivities,
            timeframe,
            count: suspiciousActivities.length
        });
    } catch (error) {
        await AuditLog.logAction(req.user._id, 'view_admin_stats', {
            result: 'failed',
            ipAddress: req.ip,
            clientAgent: getClientAgent(req),
            reason: 'Server error: ' + error.message
        });
        next(error);
    }
};
