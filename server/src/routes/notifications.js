import express from "express";
import { authRequired } from "../middleware/auth.js";
import NotificationService from "../services/NotificationService.js";

const router = express.Router();

// Get user notifications
router.get("/", authRequired, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, filter } = req.query;
    const result = await NotificationService.getUserNotifications(
      req.user._id,
      parseInt(page),
      parseInt(limit),
      filter
    );
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get unread count
router.get("/unread-count", authRequired, async (req, res, next) => {
  try {
    const unreadCount = await NotificationService.getUserNotifications(req.user._id, 1, 1);
    res.json({ unreadCount: unreadCount.unreadCount });
  } catch (error) {
    next(error);
  }
});

// Mark notification as read
router.put("/:id/read", authRequired, async (req, res, next) => {
  try {
    await NotificationService.markAsRead(req.params.id, req.user._id);
    res.json({ message: "Đã đánh dấu đã đọc" });
  } catch (error) {
    next(error);
  }
});

// Mark all as read
router.put("/mark-all-read", authRequired, async (req, res, next) => {
  try {
    await NotificationService.markAllAsRead(req.user._id);
    res.json({ message: "Đã đánh dấu tất cả đã đọc" });
  } catch (error) {
    next(error);
  }
});

// Delete notification
router.delete("/:id", authRequired, async (req, res, next) => {
  try {
    await NotificationService.deleteNotification(req.params.id, req.user._id);
    res.json({ message: "Đã xóa thông báo" });
  } catch (error) {
    next(error);
  }
});

// Admin: Create system notification
router.post("/system", authRequired, async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Chỉ admin mới có quyền tạo thông báo hệ thống" });
    }

    const { title, message, targetRole } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ error: "Thiếu tiêu đề hoặc nội dung" });
    }

    await NotificationService.createSystemNotification(title, message, targetRole);
    res.json({ message: "Đã tạo thông báo hệ thống" });
  } catch (error) {
    next(error);
  }
});

// Admin: Create broadcast message
router.post("/broadcast", authRequired, async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Chỉ admin mới có quyền gửi thông báo broadcast" });
    }

    const { title, message } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ error: "Thiếu tiêu đề hoặc nội dung" });
    }

    await NotificationService.createAdminBroadcast(req.user, title, message);
    res.json({ message: "Đã gửi thông báo đến tất cả người dùng" });
  } catch (error) {
    next(error);
  }
});

export default router;
