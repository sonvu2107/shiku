import express from "express";
import User from "../models/User.js";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import { authRequired } from "../middleware/auth.js";
import NotificationService from "../services/NotificationService.js";

const router = express.Router();

// Middleware kiểm tra quyền admin
const adminRequired = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Chỉ admin mới có quyền truy cập" });
  }
  next();
};

// Ban user
router.post("/ban-user", authRequired, adminRequired, async (req, res, next) => {
  try {
    const { userId, banDurationMinutes, reason } = req.body;
    
    if (!userId || !reason) {
      return res.status(400).json({ error: "Thiếu thông tin userId hoặc lý do cấm" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User không tồn tại" });
    }

    if (user.role === "admin") {
      return res.status(400).json({ error: "Không thể cấm admin" });
    }

    const banExpiresAt = banDurationMinutes 
      ? new Date(Date.now() + banDurationMinutes * 60 * 1000)
      : null; // null = permanent ban

    user.isBanned = true;
    user.banReason = reason;
    user.bannedAt = new Date();
    user.banExpiresAt = banExpiresAt;
    user.bannedBy = req.user._id;
    
    await user.save();

    // Create ban notification
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
    next(error);
  }
});

// Unban user
router.post("/unban-user", authRequired, adminRequired, async (req, res, next) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: "Thiếu userId" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User không tồn tại" });
    }

    user.isBanned = false;
    user.banReason = "";
    user.bannedAt = null;
    user.banExpiresAt = null;
    user.bannedBy = null;
    
    await user.save();

    // Create unban notification
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

// Lấy thống kê tổng quan với phần trăm tăng trưởng
router.get("/stats", authRequired, adminRequired, async (req, res, next) => {
  try {
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

    // Tổng lượt xem
    const viewsResult = await Post.aggregate([
      { $group: { _id: null, totalViews: { $sum: "$views" } } }
    ]);
    const totalViews = viewsResult[0]?.totalViews || 0;

    // Lượt xem tháng này
    const thisMonthViewsResult = await Post.aggregate([
      { $match: { createdAt: { $gte: thisMonth } } },
      { $group: { _id: null, totalViews: { $sum: "$views" } } }
    ]);
    const thisMonthViews = thisMonthViewsResult[0]?.totalViews || 0;

    // Lượt xem tháng trước
    const lastMonthViewsResult = await Post.aggregate([
      { $match: { createdAt: { $gte: lastMonth, $lt: thisMonth } } },
      { $group: { _id: null, totalViews: { $sum: "$views" } } }
    ]);
    const lastMonthViews = lastMonthViewsResult[0]?.totalViews || 0;

    // Tổng emotes
    const emotesResult = await Post.aggregate([
      { $group: { _id: null, totalEmotes: { $sum: { $size: { $ifNull: ["$emotes", []] } } } } }
    ]);
    const totalEmotes = emotesResult[0]?.totalEmotes || 0;

    // Emotes tháng này
    const thisMonthEmotesResult = await Post.aggregate([
      { $match: { createdAt: { $gte: thisMonth } } },
      { $group: { _id: null, totalEmotes: { $sum: { $size: { $ifNull: ["$emotes", []] } } } } }
    ]);
    const thisMonthEmotes = thisMonthEmotesResult[0]?.totalEmotes || 0;

    // Emotes tháng trước
    const lastMonthEmotesResult = await Post.aggregate([
      { $match: { createdAt: { $gte: lastMonth, $lt: thisMonth } } },
      { $group: { _id: null, totalEmotes: { $sum: { $size: { $ifNull: ["$emotes", []] } } } } }
    ]);
    const lastMonthEmotes = lastMonthEmotesResult[0]?.totalEmotes || 0;

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

// Lấy danh sách tất cả users
router.get("/users", authRequired, adminRequired, async (req, res, next) => {
  try {
    // Aggregate để lấy thêm số lượng bài viết của mỗi user
    const users = await User.aggregate([
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
      { $sort: { createdAt: -1 } }
    ]);

    // Debug log để kiểm tra
    console.log("📋 Users with ban info:", users.map(u => ({
      name: u.name,
      isBanned: u.isBanned,
      banReason: u.banReason
    })));

    res.json({ users });
  } catch (e) {
    next(e);
  }
});

// Thay đổi quyền user
router.put("/users/:id/role", authRequired, adminRequired, async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ error: "Quyền không hợp lệ" });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }

    // Không cho phép user tự thay đổi quyền của chính mình
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: "Không thể thay đổi quyền của chính bạn" });
    }

    user.role = role;
    await user.save();

    res.json({ message: "User role updated successfully", user });
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

export default router;
