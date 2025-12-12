import User from "../../models/User.js";
import Notification from "../../models/Notification.js";
import sanitizeHtml from "sanitize-html";

/**
 * POST /send-notification - Gửi thông báo cho users
 */
export const sendNotification = async (req, res, next) => {
    try {
        const { title: rawTitle, message: rawMessage, type = "info", target = "all", userIds = [] } = req.body;

        const title = sanitizeHtml(rawTitle, { allowedTags: [], allowedAttributes: {} });
        const message = sanitizeHtml(rawMessage, {
            allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
            allowedAttributes: { 'a': ['href'] }
        });

        if (!title || !message) {
            return res.status(400).json({ error: "Thiếu tiêu đề hoặc nội dung thông báo" });
        }

        const validTypes = ["info", "warning", "success", "error"];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: "Loại thông báo không hợp lệ" });
        }

        const validTargets = ["all", "online", "specific"];
        if (!validTargets.includes(target)) {
            return res.status(400).json({ error: "Đối tượng nhận không hợp lệ" });
        }

        if (target === "specific" && (!userIds || userIds.length === 0)) {
            return res.status(400).json({ error: "Cần cung cấp danh sách user IDs" });
        }

        let targetUsers = [];

        if (target === "all") {
            targetUsers = await User.find({}, "_id name email isOnline");
        } else if (target === "online") {
            targetUsers = await User.find({ isOnline: true }, "_id name email isOnline");
        } else if (target === "specific") {
            targetUsers = await User.find({ _id: { $in: userIds } }, "_id name email isOnline");
        }

        if (targetUsers.length === 0) {
            return res.status(400).json({ error: "Không tìm thấy user nào phù hợp" });
        }

        const notifications = targetUsers.map(user => ({
            recipient: user._id,
            sender: req.user._id,
            type: "admin_message",
            title,
            message,
            data: {
                metadata: {
                    adminNotification: true,
                    notificationType: type
                }
            },
            read: false
        }));

        const savedNotifications = await Notification.insertMany(notifications);

        const io = req.app.get('io');
        if (io) {
            targetUsers.forEach(user => {
                if (user.isOnline) {
                    io.to(`user_${user._id}`).emit('admin_notification', {
                        title,
                        message,
                        type,
                        timestamp: new Date().toISOString()
                    });
                }
            });
        }

        res.json({
            success: true,
            message: `Đã gửi thông báo cho ${targetUsers.length} user(s)`,
            data: {
                totalSent: targetUsers.length,
                notificationsSaved: savedNotifications.length,
                target,
                type,
                title,
                message,
                notificationIds: savedNotifications.map(n => n._id)
            }
        });

    } catch (e) {
        next(e);
    }
};

/**
 * GET /test-send-notification - Test endpoint
 */
export const testSendNotification = (req, res) => {
    res.json({
        success: true,
        message: "Send notification endpoint is working!",
        endpoint: "/api/admin/send-notification",
        method: "POST",
        requiredFields: ["title", "message"],
        optionalFields: ["type", "target", "userIds"],
        validTypes: ["info", "warning", "success", "error"],
        validTargets: ["all", "online", "specific"]
    });
};
