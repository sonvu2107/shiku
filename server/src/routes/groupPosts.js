import express from "express";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import Group from "../models/Group.js";
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
    const canViewPosts = group.settings.type === 'public' || group.isMember(userId) || group.owner.toString() === userId.toString();
    
    if (!canViewPosts) {
      return res.status(403).json({ error: "Bạn không có quyền xem bài viết trong nhóm này" });
    }

    // Tìm bài viết trong nhóm
    const filter = { group: groupId, status: "published" };
    
    const skip = (Number(page) - 1) * Number(limit);
    const posts = await Post.find(filter)
      .populate("author", "name avatarUrl")
      .populate("group", "name avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Thêm số lượng bình luận cho mỗi bài
    const itemsWithCommentCount = await Promise.all(posts.map(async post => {
      const commentCount = await Comment.countDocuments({ post: post._id });
      return { ...post.toObject(), commentCount };
    }));

    // Đếm tổng số bài viết
    const total = await Post.countDocuments(filter);

    res.json({ 
      items: itemsWithCommentCount, 
      total, 
      page: Number(page),
      pages: Math.ceil(total / Number(limit))
    });
  } catch (e) {
    console.error('Error loading group posts:', e);
    next(e);
  }
});

export default router;
