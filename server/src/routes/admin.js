import express from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import Notification from "../models/Notification.js";
import AuditLog from "../models/AuditLog.js";
import { authRequired } from "../middleware/auth.js";
import NotificationService from "../services/NotificationService.js";
import sanitizeHtml from "sanitize-html";
import { 
  adminRateLimit, 
  strictAdminRateLimit, 
  notificationSlowDown,
  statsCache,
  userCache,
  noCache,
  roleCache
} from "../middleware/adminSecurity.js";

const router = express.Router();

/**
 * Middleware kiểm tra quyền admin với audit logging
 * Chỉ cho phép user có role "admin" truy cập các routes admin
 * @param {Object} req - Request object
 * @param {Object} res - Response object  
 * @param {Function} next - Next middleware function
 */
const adminRequired = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      // Log failed admin access attempt
      await AuditLog.logAction(req.user._id, 'login_admin', {
        result: 'failed',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        reason: 'Insufficient permissions'
      });
      return res.status(403).json({ error: "Chỉ admin mới có quyền truy cập" });
    }
    
    // Check if admin is banned
    if (req.user.isBanned && req.user.banExpiresAt && req.user.banExpiresAt > new Date()) {
      await AuditLog.logAction(req.user._id, 'login_admin', {
        result: 'failed',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        reason: 'Admin account is banned'
      });
      return res.status(403).json({ error: "Tài khoản admin bị cấm" });
    }
    
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ error: "Lỗi server" });
  }
};

/**
 * POST /ban-user - Cấm người dùng
 * Admin có thể cấm user với thời gian cụ thể hoặc vĩnh viễn
 * @param {string} req.body.userId - ID của user cần cấm
 * @param {number} req.body.banDurationMinutes - Thời gian cấm (phút), null = vĩnh viễn
 * @param {string} req.body.reason - Lý do cấm
 * @returns {Object} Thông tin user đã bị cấm
 */
router.post("/ban-user", strictAdminRateLimit, authRequired, adminRequired, async (req, res, next) => {
  try {
    const { userId, banDurationMinutes, reason } = req.body;
    
    // Kiểm tra thông tin bắt buộc
    if (!userId || !reason) {
      await AuditLog.logAction(req.user._id, 'ban_user', {
        result: 'failed',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        reason: 'Missing required fields'
      });
      return res.status(400).json({ error: "Thiếu thông tin userId hoặc lý do cấm" });
    }

    // Tìm user cần cấm
    const user = await User.findById(userId);
    if (!user) {
      await AuditLog.logAction(req.user._id, 'ban_user', {
        targetId: userId,
        targetType: 'user',
        result: 'failed',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        reason: 'User not found'
      });
      return res.status(404).json({ error: "User không tồn tại" });
    }

    // Không cho phép admin tự cấm chính mình
    if (user._id.toString() === req.user._id.toString()) {
      await AuditLog.logAction(req.user._id, 'ban_user', {
        targetId: userId,
        targetType: 'user',
        result: 'failed',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        reason: 'Attempted self-ban'
      });
      return res.status(400).json({ error: "Không thể tự cấm chính mình" });
    }

    // Không cho phép cấm admin
    if (user.role === "admin") {
      await AuditLog.logAction(req.user._id, 'ban_user', {
        targetId: userId,
        targetType: 'user',
        result: 'failed',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        reason: 'Attempted to ban another admin'
      });
      return res.status(400).json({ error: "Không thể cấm admin" });
    }

    // Lưu dữ liệu trước khi thay đổi cho audit
    const beforeData = {
      isBanned: user.isBanned,
      banReason: user.banReason,
      bannedAt: user.bannedAt,
      banExpiresAt: user.banExpiresAt
    };

    // Tính thời gian hết hạn cấm
    const banExpiresAt = banDurationMinutes 
      ? new Date(Date.now() + banDurationMinutes * 60 * 1000)
      : null; // null = permanent ban

    // Cập nhật thông tin cấm
    user.isBanned = true;
    user.banReason = reason;
    user.bannedAt = new Date();
    user.banExpiresAt = banExpiresAt;
    user.bannedBy = req.user._id;
    
    await user.save();

    // Log audit action
    await AuditLog.logAction(req.user._id, 'ban_user', {
      targetId: userId,
      targetType: 'user',
      result: 'success',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
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

    // Tạo thông báo cấm cho user
    try {
      await NotificationService.createBanNotification(user, req.user, reason, banExpiresAt);
    } catch (notifError) {
      console.error("Error creating ban notification:", notifError);
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
    // Log failed operation
    await AuditLog.logAction(req.user._id, 'ban_user', {
      result: 'failed',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      reason: 'Server error: ' + error.message
    });
    next(error);
  }
});

/**
 * POST /unban-user - Gỡ cấm người dùng
 * Admin có thể gỡ cấm user đã bị cấm trước đó
 * @param {string} req.body.userId - ID của user cần gỡ cấm
 * @returns {Object} Thông tin user đã được gỡ cấm
 */
router.post("/unban-user", authRequired, adminRequired, async (req, res, next) => {
  try {
    const { userId } = req.body;
    
    // Kiểm tra thông tin bắt buộc
    if (!userId) {
      return res.status(400).json({ error: "Thiếu userId" });
    }

    // Tìm user cần gỡ cấm
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User không tồn tại" });
    }

    // Gỡ cấm user
    user.isBanned = false;
    user.banReason = "";
    user.bannedAt = null;
    user.banExpiresAt = null;
    user.bannedBy = null;
    
    await user.save();

    // Tạo thông báo gỡ cấm cho user
    try {
      await NotificationService.createUnbanNotification(user, req.user);
    } catch (notifError) {
      console.error("Error creating unban notification:", notifError);
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
});

/**
 * GET /stats - Lấy thống kê tổng quan với phần trăm tăng trưởng
 * Cung cấp thống kê chi tiết về posts, users, comments, views, emotes
 * Bao gồm so sánh tháng này vs tháng trước và top rankings
 * @returns {Object} Thống kê chi tiết với growth indicators
 */
router.get("/stats", adminRateLimit, statsCache, authRequired, adminRequired, async (req, res, next) => {
  try {
    // Tính toán các mốc thời gian
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    // Thống kê tổng
    const [
      totalPosts,
      totalUsers,
      totalComments,
      publishedPosts,
      privatePosts,
      adminUsers
    ] = await Promise.all([
      Post.countDocuments(),
      User.countDocuments(),
      Comment.countDocuments(),
      Post.countDocuments({ status: "published" }),
      Post.countDocuments({ status: "private" }),
      User.countDocuments({ role: "admin" })
    ]);

    // Thống kê tháng này
    const [
      thisMonthPosts,
      thisMonthUsers,
      thisMonthComments,
      thisMonthPublished,
      thisMonthPrivates,
      thisMonthAdmins
    ] = await Promise.all([
      Post.countDocuments({ createdAt: { $gte: thisMonth } }),
      User.countDocuments({ createdAt: { $gte: thisMonth } }),
      Comment.countDocuments({ createdAt: { $gte: thisMonth } }),
      Post.countDocuments({ status: "published", createdAt: { $gte: thisMonth } }),
      Post.countDocuments({ status: "private", createdAt: { $gte: thisMonth } }),
      User.countDocuments({ role: "admin", createdAt: { $gte: thisMonth } })
    ]);

    // Thống kê tháng trước
    const [
      lastMonthPosts,
      lastMonthUsers,
      lastMonthComments,
      lastMonthPublished,
      lastMonthPrivates,
      lastMonthAdmins
    ] = await Promise.all([
      Post.countDocuments({ createdAt: { $gte: lastMonth, $lt: thisMonth } }),
      User.countDocuments({ createdAt: { $gte: lastMonth, $lt: thisMonth } }),
      Comment.countDocuments({ createdAt: { $gte: lastMonth, $lt: thisMonth } }),
      Post.countDocuments({ status: "published", createdAt: { $gte: lastMonth, $lt: thisMonth } }),
      Post.countDocuments({ status: "private", createdAt: { $gte: lastMonth, $lt: thisMonth } }),
      User.countDocuments({ role: "admin", createdAt: { $gte: lastMonth, $lt: thisMonth } })
    ]);

    // Tính phần trăm tăng trưởng
    const calculateGrowth = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const postsGrowth = calculateGrowth(thisMonthPosts, lastMonthPosts);
    const usersGrowth = calculateGrowth(thisMonthUsers, lastMonthUsers);
    const commentsGrowth = calculateGrowth(thisMonthComments, lastMonthComments);
    const publishedGrowth = calculateGrowth(thisMonthPublished, lastMonthPublished);
    const privateGrowth = calculateGrowth(thisMonthPrivates, lastMonthPrivates);
    const adminsGrowth = calculateGrowth(thisMonthAdmins, lastMonthAdmins);

    // Optimized: Single aggregation for views and emotes data
    const [viewsData, emotesData] = await Promise.all([
      // Views aggregation
      Post.aggregate([
        {
          $group: {
            _id: null,
            totalViews: { $sum: "$views" },
            thisMonthViews: {
              $sum: {
                $cond: [
                  { $gte: ["$createdAt", thisMonth] },
                  "$views",
                  0
                ]
              }
            },
            lastMonthViews: {
              $sum: {
                $cond: [
                  { $and: [
                    { $gte: ["$createdAt", lastMonth] },
                    { $lt: ["$createdAt", thisMonth] }
                  ]},
                  "$views",
                  0
                ]
              }
            }
          }
        }
      ]),
      // Emotes aggregation
      Post.aggregate([
        {
          $group: {
            _id: null,
            totalEmotes: { $sum: { $size: { $ifNull: ["$emotes", []] } } },
            thisMonthEmotes: {
              $sum: {
                $cond: [
                  { $gte: ["$createdAt", thisMonth] },
                  { $size: { $ifNull: ["$emotes", []] } },
                  0
                ]
              }
            },
            lastMonthEmotes: {
              $sum: {
                $cond: [
                  { $and: [
                    { $gte: ["$createdAt", lastMonth] },
                    { $lt: ["$createdAt", thisMonth] }
                  ]},
                  { $size: { $ifNull: ["$emotes", []] } },
                  0
                ]
              }
            }
          }
        }
      ])
    ]);

    const totalViews = viewsData[0]?.totalViews || 0;
    const thisMonthViews = viewsData[0]?.thisMonthViews || 0;
    const lastMonthViews = viewsData[0]?.lastMonthViews || 0;
    const totalEmotes = emotesData[0]?.totalEmotes || 0;
    const thisMonthEmotes = emotesData[0]?.thisMonthEmotes || 0;

    const lastMonthEmotes = emotesData[0]?.lastMonthEmotes || 0;

    // Tính phần trăm tăng trưởng cho views và emotes
    const viewsGrowth = calculateGrowth(thisMonthViews, lastMonthViews);
    const emotesGrowth = calculateGrowth(thisMonthEmotes, lastMonthEmotes);

    // Top 5 bài viết có nhiều lượt xem nhất
    const topPosts = await Post.find({ status: "published" })
      .populate("author", "name")
      .sort({ views: -1 })
      .limit(5)
      .select("title views author");

    // Top 5 user có nhiều bài viết nhất
    const topUsers = await Post.aggregate([
      { $group: { _id: "$author", postCount: { $sum: 1 } } },
      { $sort: { postCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo"
        }
      },
      { $unwind: "$userInfo" },
      {
        $project: {
          _id: "$userInfo._id",
          name: "$userInfo.name",
          role: "$userInfo.role",
          postCount: 1
        }
      }
    ]);

    const stats = {
      overview: {
        totalPosts: {
          count: totalPosts,
          thisMonth: thisMonthPosts,
          lastMonth: lastMonthPosts,
          growth: postsGrowth
        },
        totalUsers: {
          count: totalUsers,
          thisMonth: thisMonthUsers,
          lastMonth: lastMonthUsers,
          growth: usersGrowth
        },
        totalComments: {
          count: totalComments,
          thisMonth: thisMonthComments,
          lastMonth: lastMonthComments,
          growth: commentsGrowth
        },
        totalViews: {
          count: totalViews,
          thisMonth: thisMonthViews,
          lastMonth: lastMonthViews,
          growth: viewsGrowth
        },
        totalEmotes: {
          count: totalEmotes,
          thisMonth: thisMonthEmotes,
          lastMonth: lastMonthEmotes,
          growth: emotesGrowth
        },
        publishedPosts: {
          count: publishedPosts,
          thisMonth: thisMonthPublished,
          lastMonth: lastMonthPublished,
          growth: publishedGrowth
        },
        draftPosts: {
          count: privatePosts,
          thisMonth: thisMonthPrivates,
          lastMonth: lastMonthPrivates,
          growth: privateGrowth
        },
        adminUsers: {
          count: adminUsers,
          thisMonth: thisMonthAdmins,
          lastMonth: lastMonthAdmins,
          growth: adminsGrowth
        }
      },
      topPosts,
      topUsers
    };

    res.json({ stats });
  } catch (e) {
    next(e);
  }
});

// Lấy danh sách tất cả users với pagination và cache
router.get("/users", adminRateLimit, userCache, authRequired, adminRequired, async (req, res, next) => {
  try {
    // Pagination parameters với validation
    const page = Math.max(1, parseInt(req.query.page) || 1);
    // Allow larger limits for admin dashboard (max 1000), but default to 20
    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    
    // Search filters
    const searchQuery = req.query.search ? {
      $or: [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ]
    } : {};
    
    // Role filter
    const roleFilter = req.query.role ? { role: req.query.role } : {};
    
    // Ban status filter
    let banFilter = {};
    if (req.query.banned === 'true') {
      banFilter = { isBanned: true };
    } else if (req.query.banned === 'false') {
      banFilter = { isBanned: { $ne: true } };
    }
    
    // Combine all filters
    const matchQuery = { ...searchQuery, ...roleFilter, ...banFilter };
    
    // Get total count for pagination
    const total = await User.countDocuments(matchQuery);
    
    // Aggregate để lấy thêm số lượng bài viết của mỗi user với pagination
    const users = await User.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: "posts",
          localField: "_id",
          foreignField: "author",
          as: "posts"
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
          postCount: { $size: "$posts" }
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    ]);

    // Log audit action for viewing user list
    await AuditLog.logAction(req.user._id, 'view_user_list', {
      result: 'success',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
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
    // Log failed operation
    await AuditLog.logAction(req.user._id, 'view_user_list', {
      result: 'failed',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      reason: 'Server error: ' + e.message
    });
    next(e);
  }
});

// Thay đổi quyền user với role caching
router.put("/users/:id/role", authRequired, adminRequired, async (req, res, next) => {
  try {
    const { role } = req.body;
    
    // ✅ OPTIMIZED ROLE VALIDATION - Cache or use simple validation
    const validRoles = ['user', 'admin', 'moderator', 'premium']; // Add your valid roles here
    
    // For custom roles, only check database if not in basic roles
    if (!validRoles.includes(role)) {
      const Role = mongoose.model('Role');
      const existingRole = await Role.findOne({ name: role, isActive: true }).lean(); // Use lean() for performance
      if (!existingRole) {
        return res.status(400).json({ error: "Quyền không hợp lệ hoặc không tồn tại" });
      }
    }

    // ✅ SINGLE DATABASE QUERY - findByIdAndUpdate instead of find + save
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { role: role },
      { 
        new: true, // Return updated document
        runValidators: true,
        lean: true // Performance optimization
      }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }

    // Không cho phép user tự thay đổi quyền của chính mình
    if (updatedUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: "Không thể thay đổi quyền của chính bạn" });
    }

    res.json({ 
      message: "User role updated successfully", 
      user: updatedUser 
    });
  } catch (e) {
    next(e);
  }
});

// Lấy thông tin 1 user cụ thể (tối ưu cho update single user)
router.get("/users/:id", authRequired, adminRequired, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }
    res.json({ user });
  } catch (e) {
    next(e);
  }
});

// Xóa user
router.delete("/users/:id", authRequired, adminRequired, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }

    // Không cho phép user tự xóa chính mình
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: "Không thể xóa chính bạn" });
    }

    // Xóa tất cả bài viết của user
    await Post.deleteMany({ author: user._id });

    // Xóa tất cả comment của user
    await Comment.deleteMany({ author: user._id });

    // Xóa user
    await user.deleteOne();

    res.json({ message: "User deleted successfully" });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /online-users - Lấy danh sách người dùng đang online
 * Lấy tất cả users có isOnline = true
 * @returns {Array} Danh sách users đang online
 */
router.get("/online-users", adminRateLimit, noCache, authRequired, adminRequired, async (req, res, next) => {
  try {
    const onlineUsers = await User.find({ isOnline: true })
      .select('name email avatarUrl role lastSeen isOnline')
      .sort({ lastSeen: -1 });

    res.json({ onlineUsers });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /total-visitors - Lấy tổng số lượt truy cập
 * Tính toán dựa trên số lần login và hoạt động của users
 * @returns {Object} Thống kê chi tiết về visitors
 */
router.get("/total-visitors", authRequired, adminRequired, async (req, res, next) => {
  try {
    // Tổng số users đã đăng ký
    const totalUsers = await User.countDocuments();
    
    // Số users đã từng online (có lastSeen)
    const usersWithActivity = await User.countDocuments({
      lastSeen: { $exists: true, $ne: null }
    });
    
    // Số users đang online
    const onlineUsers = await User.countDocuments({ isOnline: true });
    
    // Tính tổng lượt truy cập dựa trên hoạt động
    // Mỗi lần user login = 1 lượt truy cập
    // Có thể mở rộng để track page views
    const totalVisitors = usersWithActivity;
    
    // Thống kê theo thời gian
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const [todayVisitors, weekVisitors, monthVisitors] = await Promise.all([
      User.countDocuments({ lastSeen: { $gte: today } }),
      User.countDocuments({ lastSeen: { $gte: thisWeek } }),
      User.countDocuments({ lastSeen: { $gte: thisMonth } })
    ]);
    
    res.json({ 
      totalVisitors,
      totalUsers,
      onlineUsers,
      usersWithActivity,
      timeStats: {
        today: todayVisitors,
        thisWeek: weekVisitors,
        thisMonth: monthVisitors
      }
    });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /update-offline-users - Cập nhật trạng thái offline cho users không hoạt động
 * Được gọi định kỳ để cập nhật trạng thái offline cho users không gửi heartbeat
 * @returns {Object} Số lượng users đã được cập nhật
 */
router.post("/update-offline-users", authRequired, adminRequired, async (req, res, next) => {
  try {
    // Tìm users online nhưng không hoạt động trong 2 phút
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const result = await User.updateMany(
      { 
        isOnline: true, 
        lastSeen: { $lt: twoMinutesAgo } 
      },
      { 
        isOnline: false 
      }
    );
    
    res.json({ 
      message: "Updated offline users",
      updatedCount: result.modifiedCount 
    });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /send-notification - Gửi thông báo cho tất cả users
 * Admin có thể gửi thông báo hệ thống cho tất cả users
 * @param {string} req.body.title - Tiêu đề thông báo
 * @param {string} req.body.message - Nội dung thông báo
 * @param {string} req.body.type - Loại thông báo (info, warning, success, error)
 * @param {string} req.body.target - Đối tượng nhận (all, online, specific)
 * @param {Array} req.body.userIds - Danh sách user IDs (nếu target = specific)
 * @returns {Object} Kết quả gửi thông báo
 */
router.post("/send-notification", notificationSlowDown, authRequired, adminRequired, async (req, res, next) => {
  try {
    const { title: rawTitle, message: rawMessage, type = "info", target = "all", userIds = [] } = req.body;

    // XSS Protection: Sanitize title and message
    const title = sanitizeHtml(rawTitle, { allowedTags: [], allowedAttributes: {} });
    const message = sanitizeHtml(rawMessage, {
      allowedTags: [ 'b', 'i', 'em', 'strong', 'a', 'p', 'br' ],
      allowedAttributes: { 'a': [ 'href' ] }
    });
    
    // Kiểm tra thông tin bắt buộc
    if (!title || !message) {
      return res.status(400).json({ error: "Thiếu tiêu đề hoặc nội dung thông báo" });
    }

    // Validate type
    const validTypes = ["info", "warning", "success", "error"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: "Loại thông báo không hợp lệ" });
    }

    // Validate target
    const validTargets = ["all", "online", "specific"];
    if (!validTargets.includes(target)) {
      return res.status(400).json({ error: "Đối tượng nhận không hợp lệ" });
    }

    // Nếu target là specific, cần có userIds
    if (target === "specific" && (!userIds || userIds.length === 0)) {
      return res.status(400).json({ error: "Cần cung cấp danh sách user IDs" });
    }

    let targetUsers = [];

    // Lấy danh sách users dựa trên target
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

    // Tạo thông báo cho từng user
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

    // Lưu thông báo vào database
    const savedNotifications = await Notification.insertMany(notifications);
    
    // Gửi thông báo real-time qua Socket.IO
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
});

/**
 * GET /test-send-notification - Test endpoint để kiểm tra route hoạt động
 * ĐÃ ĐƯỢC BẢO VỆ: Yêu cầu quyền admin.
 */
router.get("/test-send-notification", authRequired, adminRequired, (req, res) => {
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
});

/**
 * GET /audit-logs - Xem nhật ký audit
 * Admin có thể xem các hoạt động của admin khác
 */
router.get("/audit-logs", adminRateLimit, userCache, authRequired, adminRequired, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;
    
    // Filters
    const filters = {};
    if (req.query.action) filters.action = req.query.action;
    if (req.query.adminId) filters.adminId = req.query.adminId;
    if (req.query.result) filters.result = req.query.result;
    
    // Date range filter
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
    
    // Log the audit log viewing
    await AuditLog.logAction(req.user._id, 'view_admin_stats', {
      result: 'success',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
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
      userAgent: req.get('User-Agent'),
      reason: 'Server error: ' + error.message
    });
    next(error);
  }
});

/**
 * GET /suspicious-activities - Xem các hoạt động đáng nghi
 */
router.get("/suspicious-activities", adminRateLimit, noCache, authRequired, adminRequired, async (req, res, next) => {
  try {
    const timeframe = parseInt(req.query.hours) || 24; // Default 24 hours
    
    const suspiciousActivities = await AuditLog.getSuspiciousActivities(timeframe);
    
    await AuditLog.logAction(req.user._id, 'view_admin_stats', {
      result: 'success',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
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
      userAgent: req.get('User-Agent'),
      reason: 'Server error: ' + error.message
    });
    next(error);
  }
});

export default router;
