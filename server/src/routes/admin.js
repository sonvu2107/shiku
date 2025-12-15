import express from "express";
import mongoose from "mongoose";
import AuditLog from "../models/AuditLog.js";
import { authRequired } from "../middleware/auth.js";
import { getClientAgent } from "../utils/clientAgent.js";
import {
  adminRateLimit,
  strictAdminRateLimit,
  notificationSlowDown,
  statsCache,
  userCache,
  noCache
} from "../middleware/adminSecurity.js";

// Import all controllers
import {
  // User management
  banUser,
  unbanUser,
  getUsers,
  getUser,
  updateUserRole,
  deleteUser,
  isFullAdmin,
  // Stats
  getStats,
  getOnlineUsers,
  getTotalVisitors,
  updateOfflineUsers,
  getDailyStats,
  // Audit
  getAuditLogs,
  getSuspiciousActivities,
  // Notifications
  sendNotification,
  testSendNotification,
  // Bot
  autoLikePosts,
  autoViewPosts,
  clearTestReactions
} from "../controllers/admin/index.js";

const router = express.Router();

/**
 * Middleware kiểm tra quyền admin với audit logging
 * Cho phép user có role "admin" HOẶC có bất kỳ permission admin.* nào
 */
const adminRequired = async (req, res, next) => {
  try {
    let hasAdminAccess = false;

    // Check 1: Full admin role
    if (req.user.role === "admin") {
      hasAdminAccess = true;
    }

    // Check 2: User has admin.* permissions via their role
    if (!hasAdminAccess && req.user.role && req.user.role !== 'user') {
      try {
        const Role = mongoose.model('Role');
        const roleDoc = await Role.findOne({ name: req.user.role, isActive: true }).lean();
        if (roleDoc && roleDoc.permissions) {
          hasAdminAccess = Object.keys(roleDoc.permissions).some(
            key => key.startsWith('admin.') && roleDoc.permissions[key] === true
          );
        }
      } catch (roleError) {
        console.error('[ERROR][ADMIN] Error checking role permissions:', roleError);
      }
    }

    if (!hasAdminAccess) {
      await AuditLog.logAction(req.user._id, 'login_admin', {
        result: 'failed',
        ipAddress: req.ip,
        clientAgent: getClientAgent(req),
        reason: 'Insufficient permissions'
      });
      return res.status(403).json({ error: "Chỉ admin mới có quyền truy cập" });
    }

    // Check if admin is banned
    if (req.user.isBanned && req.user.banExpiresAt && req.user.banExpiresAt > new Date()) {
      await AuditLog.logAction(req.user._id, 'login_admin', {
        result: 'failed',
        ipAddress: req.ip,
        clientAgent: getClientAgent(req),
        reason: 'Admin account is banned'
      });
      return res.status(403).json({ error: "Tài khoản admin bị cấm" });
    }

    next();
  } catch (error) {
    console.error('[ERROR][ADMIN] Admin middleware error:', error);
    res.status(500).json({ error: "Lỗi server" });
  }
};

// ============================================================
// USER MANAGEMENT ROUTES
// ============================================================

router.post("/ban-user", strictAdminRateLimit, authRequired, adminRequired, banUser);
router.post("/unban-user", authRequired, adminRequired, unbanUser);
router.get("/users", adminRateLimit, userCache, authRequired, adminRequired, getUsers);
router.get("/users/:id", authRequired, adminRequired, getUser);
router.put("/users/:id/role", authRequired, adminRequired, updateUserRole);
router.delete("/users/:id", authRequired, adminRequired, deleteUser);

// ============================================================
// STATISTICS ROUTES
// ============================================================

router.get("/stats", adminRateLimit, statsCache, authRequired, adminRequired, getStats);
router.get("/stats/daily", adminRateLimit, statsCache, authRequired, adminRequired, getDailyStats);
router.get("/online-users", adminRateLimit, noCache, authRequired, adminRequired, getOnlineUsers);
router.get("/total-visitors", authRequired, adminRequired, getTotalVisitors);
router.post("/update-offline-users", authRequired, adminRequired, updateOfflineUsers);

// ============================================================
// AUDIT ROUTES
// ============================================================

router.get("/audit-logs", adminRateLimit, userCache, authRequired, adminRequired, getAuditLogs);
router.get("/suspicious-activities", adminRateLimit, noCache, authRequired, adminRequired, getSuspiciousActivities);

// ============================================================
// NOTIFICATION ROUTES
// ============================================================

router.post("/send-notification", notificationSlowDown, authRequired, adminRequired, sendNotification);
router.get("/test-send-notification", authRequired, adminRequired, testSendNotification);

// ============================================================
// BOT ROUTES
// ============================================================

router.post("/auto-like-posts", authRequired, adminRequired, strictAdminRateLimit, autoLikePosts);
router.post("/auto-view-posts", authRequired, adminRequired, strictAdminRateLimit, autoViewPosts);
router.post("/clear-test-reactions", authRequired, adminRequired, strictAdminRateLimit, clearTestReactions);

// ============================================================
// DATA INTEGRITY ROUTES
// ============================================================

/**
 * POST /sync-comment-counts - Sync commentCount for all posts
 * Recounts actual comments and updates Post.commentCount
 * Also removes orphan comments (comments with deleted authors)
 */
router.post("/sync-comment-counts", authRequired, adminRequired, strictAdminRateLimit, async (req, res, next) => {
  try {
    const Post = mongoose.model('Post');
    const Comment = mongoose.model('Comment');
    const User = mongoose.model('User');

    // Step 1: Find and delete orphan comments (comments with non-existent authors)
    const allUsers = await User.find({}).select('_id').lean();
    const userIds = new Set(allUsers.map(u => u._id.toString()));

    const allComments = await Comment.find({}).select('_id author post').lean();
    const orphanCommentIds = allComments
      .filter(c => !c.author || !userIds.has(c.author.toString()))
      .map(c => c._id);

    let orphansDeleted = 0;
    if (orphanCommentIds.length > 0) {
      const deleteResult = await Comment.deleteMany({ _id: { $in: orphanCommentIds } });
      orphansDeleted = deleteResult.deletedCount;
    }

    // Step 2: Recount comments for each post
    const posts = await Post.find({}).select('_id commentCount').lean();
    let postsUpdated = 0;

    for (const post of posts) {
      const actualCount = await Comment.countDocuments({ post: post._id });
      if (post.commentCount !== actualCount) {
        await Post.findByIdAndUpdate(post._id, { commentCount: actualCount });
        postsUpdated++;
      }
    }

    await AuditLog.logAction(req.user._id, 'admin_auto_like', {
      result: 'success',
      ipAddress: req.ip,
      clientAgent: getClientAgent(req),
      details: {
        action: 'sync_comment_counts',
        orphansDeleted,
        postsUpdated,
        totalPosts: posts.length
      }
    });

    res.json({
      success: true,
      message: `Đã đồng bộ comment count`,
      orphansDeleted,
      postsUpdated,
      totalPosts: posts.length
    });
  } catch (error) {
    console.error('[ERROR][ADMIN] Sync comment counts error:', error);
    next(error);
  }
});

export default router;
