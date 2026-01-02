import express from "express";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import Group from "../models/Group.js";
import User from "../models/User.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

// GET /api/groups/:groupId/posts - Lấy bài viết thuộc group
router.get("/:groupId/posts", authRequired, async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const groupId = req.params.groupId;

    // Kiểm tra groupId hợp lệ
    if (!groupId || !groupId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "groupId không hợp lệ" });
    }

    // Kiểm tra nhóm có tồn tại không
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: "Không tìm thấy nhóm" });
    }

    // Kiểm tra quyền truy cập nhóm
    const userId = req.user._id;
    const canViewPosts = group.settings?.type === 'public' || group.isMember(userId) || group.owner.toString() === userId.toString();

    if (!canViewPosts) {
      return res.status(403).json({ error: "Bạn không có quyền xem bài viết trong nhóm này" });
    }

    // Tìm bài viết trong nhóm
    // FIX: Dùng group._id (ObjectId) thay vì groupId (string) để match đúng với MongoDB
    const filter = { group: group._id, status: "published" };

    const skip = (Number(page) - 1) * Number(limit);
    const posts = await Post.find(filter)
      .populate("author", "name avatarUrl nickname role displayBadgeType cultivationCache")
      .populate("group", "name avatar")
      // NOTE: emotes.user populate removed - using upvote system now
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Thêm số lượng bình luận và saved cho mỗi bài
    // Lưu ý: populate nested paths như emotes.user có thể không hoạt động đúng với .toObject()
    // Nên chúng ta cần populate lại thủ công
    const postIds = posts.map(p => p._id);

    // Batch query comment counts
    const commentCounts = await Comment.aggregate([
      { $match: { post: { $in: postIds } } },
      { $group: { _id: "$post", count: { $sum: 1 } } }
    ]);
    const commentCountMap = new Map(
      commentCounts.map(c => [c._id.toString(), c.count])
    );

    // Batch query saved counts
    const savedCounts = await User.aggregate([
      { $match: { savedPosts: { $in: postIds } } },
      { $unwind: "$savedPosts" },
      { $match: { savedPosts: { $in: postIds } } },
      { $group: { _id: "$savedPosts", count: { $sum: 1 } } }
    ]);
    const savedCountMap = new Map(
      savedCounts.map(c => [c._id.toString(), c.count])
    );

    // NOTE: emotes processing removed - using upvote system now

    // Map posts with comment and saved counts
    const itemsWithCommentCount = posts.map(post => {
      const postObj = post.toObject();
      const commentCount = commentCountMap.get(post._id.toString()) || 0;
      const savedCount = savedCountMap.get(post._id.toString()) || 0;
      return { ...postObj, commentCount, savedCount };
    });

    // Đếm tổng số bài viết
    const total = await Post.countDocuments(filter);

    res.json({
      items: itemsWithCommentCount,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit))
    });
  } catch (e) {
    console.error('[ERROR][GROUP-POSTS] Error loading group posts:', e);
    next(e);
  }
});

export default router;
