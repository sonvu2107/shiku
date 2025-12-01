/**
 * Notifications Routes
 * 
 * Routes xử lý các thao tác liên quan đến thông báo (notifications):
 * - Lấy danh sách thông báo
 * - Đếm số thông báo chưa đọc
 * - Đánh dấu đã đọc
 * - Xóa thông báo
 * 
 * @module notifications
 */

import express from "express";
import { authRequired } from "../middleware/auth.js";
import NotificationService from "../services/NotificationService.js";
import { withCache, statsCache, invalidateCacheByPrefix } from "../utils/cache.js";

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

// Get unread count - OPTIMIZED with caching
// Lightweight unread count (PHASE 4 optimization: avoid full notifications fetch)
router.get("/unread-count", authRequired, async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const cacheKey = `notifications:unread:${userId}`;
    
    // Cache for 10 seconds - unread count doesn't need to be real-time
    const unreadCount = await withCache(statsCache, cacheKey, async () => {
      // Direct count using indexed fields { recipient, read }
      const count = await NotificationService.countUnread?.(userId);
      if (typeof count === 'number') {
        return count;
      }
      // Fallback if countUnread helper not implemented yet
      const { default: Notification } = await import("../models/Notification.js");
      return await Notification.countDocuments({ recipient: userId, read: false });
    }, 10 * 1000); // 10 seconds cache
    
    res.json({ unreadCount });
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
      return res.status(403).json({ error: "Chỉ admin mới có quyền gửi thông báo" });
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
