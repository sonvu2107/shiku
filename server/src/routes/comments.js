import express from "express";
import Comment from "../models/Comment.js";
import Post from "../models/Post.js";
import User from "../models/User.js";
import { authRequired, authOptional } from "../middleware/auth.js";
import { checkBanStatus } from "../middleware/banCheck.js";
import NotificationService from "../services/NotificationService.js";

const router = express.Router();

/**
 * GET /post/:postId - Lấy danh sách comment cho 1 bài post
 * Lọc comment dựa trên blocked users nếu user đã đăng nhập
 * @param {string} req.params.postId - ID của bài post
 * @returns {Array} Danh sách comments đã lọc
 */
router.get("/post/:postId", authOptional, async (req, res, next) => {
  try {
    let items = await Comment.find({ post: req.params.postId })
      .populate("author", "name avatarUrl role blockedUsers")
      .populate("parent")
      .populate("likes", "name")
      .populate("emotes.user", "name avatarUrl")
      .sort({ createdAt: -1 });

    // 🔒 Lọc comment nếu user đã đăng nhập
    if (req.user) {
      const currentUser = await User.findById(req.user._id).select("blockedUsers");

      items = items.filter(c => {
        if (!c.author) return false; // bỏ comment không có tác giả
        const authorId = c.author._id.toString();

        // mình block họ
        const iBlockedThem = (currentUser.blockedUsers || [])
          .map(id => id.toString())
          .includes(authorId);

        // họ block mình
        const theyBlockedMe = (c.author.blockedUsers || [])
          .map(id => id.toString())
          .includes(req.user._id.toString());

        return !iBlockedThem && !theyBlockedMe;
      });
    }

    res.json({ items });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /post/:postId - Thêm comment (có thể là trả lời bình luận khác)
 * Tạo comment mới hoặc reply cho comment khác
 * @param {string} req.params.postId - ID của bài post
 * @param {string} req.body.content - Nội dung comment
 * @param {string} req.body.parentId - ID comment cha (nếu là reply)
 * @returns {Object} Comment đã tạo
 */
router.post("/post/:postId", authRequired, checkBanStatus, async (req, res, next) => {
  try {
    const { content, parentId } = req.body;
    if (!content) return res.status(400).json({ error: "Vui lòng nhập nội dung bình luận" });

    const post = await Post.findById(req.params.postId).populate("author", "name");
    if (!post) return res.status(404).json({ error: "Không tìm thấy bài viết" });

    let parent = null;
    if (parentId) {
      parent = await Comment.findById(parentId).populate("author", "name");
      if (!parent) return res.status(400).json({ error: "Không tìm thấy bình luận gốc" });
    }

    const c = await Comment.create({
      post: post._id,
      author: req.user._id,
      content,
      parent: parentId || null,
    });

    await c.populate([
      { path: "author", select: "name avatarUrl role" },
      { path: "parent" },
    ]);

    // 📢 Gửi thông báo
    try {
      if (parent) {
        await NotificationService.createReplyNotification(c, parent, post, req.user);
      } else {
        await NotificationService.createCommentNotification(c, post, req.user);
      }
    } catch (notifError) {
      console.error("Error creating notification:", notifError);
    }

    res.json({ comment: c });
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /:id - Cập nhật comment (chỉ người viết)
 * Chỉ cho phép tác giả comment sửa nội dung
 * @param {string} req.params.id - ID của comment
 * @param {string} req.body.content - Nội dung comment mới
 * @returns {Object} Comment đã cập nhật
 */
router.put("/:id", authRequired, async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: "Vui lòng nhập nội dung bình luận" });

    const c = await Comment.findById(req.params.id);
    if (!c) return res.status(404).json({ error: "Không tìm thấy bình luận" });

    const isOwner = c.author.toString() === req.user._id.toString();
    if (!isOwner) return res.status(403).json({ error: "Bạn chỉ có thể sửa bình luận của mình" });

    c.content = content;
    c.edited = true;
    await c.save();

    await c.populate([
      { path: "author", select: "name avatarUrl role" },
      { path: "parent" },
    ]);

    res.json({ comment: c });
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /:id - Xóa comment (người viết, chủ post hoặc admin)
 * Cho phép tác giả, chủ post hoặc admin xóa comment
 * @param {string} req.params.id - ID của comment
 * @returns {Object} Thông báo xóa thành công
 */
router.delete("/:id", authRequired, async (req, res, next) => {
  try {
    const c = await Comment.findById(req.params.id);
    if (!c) return res.status(404).json({ error: "Không tìm thấy bình luận" });

    const post = await Post.findById(c.post);
    const isOwner = c.author.toString() === req.user._id.toString();
    const isPostOwner = post && post.author.toString() === req.user._id.toString();

    if (!isOwner && !isPostOwner && req.user.role !== "admin") {
      return res.status(403).json({ error: "Bạn không có quyền xóa bình luận này" });
    }

    await c.deleteOne();
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /:id/like - Like/Unlike comment
 * Toggle like status cho comment
 * @param {string} req.params.id - ID của comment
 * @returns {Object} Comment đã cập nhật với like status
 */
router.post("/:id/like", authRequired, async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ error: "Không tìm thấy bình luận" });

    const userId = req.user._id;
    const isLiked = comment.likes.includes(userId);

    if (isLiked) {
      // Unlike - xóa user khỏi danh sách likes
      comment.likes = comment.likes.filter(id => !id.equals(userId));
    } else {
      // Like - thêm user vào danh sách likes
      comment.likes.push(userId);
    }

    await comment.save();

    // Populate để trả về thông tin đầy đủ
    await comment.populate([
      { path: "author", select: "name avatarUrl role" },
      { path: "parent" },
      { path: "likes", select: "name" }
    ]);

    res.json({ 
      comment,
      isLiked: !isLiked,
      likeCount: comment.likeCount
    });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /:id/emote - Thêm/xóa emote cho comment
 * Toggle emote status cho comment
 * @param {string} req.params.id - ID của comment
 * @param {string} req.body.type - Loại emote (like, love, laugh, angry, etc.)
 * @returns {Object} Comment đã cập nhật với emote status
 */
router.post("/:id/emote", authRequired, async (req, res, next) => {
  try {
    const { type } = req.body;
    if (!type) return res.status(400).json({ error: "Thiếu loại emote" });

    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ error: "Không tìm thấy bình luận" });

    const userId = req.user._id;
    
    // Tìm emote hiện tại của user
    const existingEmoteIndex = comment.emotes.findIndex(
      emote => emote.user.equals(userId) && emote.type === type
    );

    if (existingEmoteIndex >= 0) {
      // Xóa emote nếu đã tồn tại
      comment.emotes.splice(existingEmoteIndex, 1);
    } else {
      // Thêm emote mới
      comment.emotes.push({
        user: userId,
        type: type,
        createdAt: new Date()
      });
    }

    await comment.save();

    // Populate để trả về thông tin đầy đủ
    await comment.populate([
      { path: "author", select: "name avatarUrl role" },
      { path: "parent" },
      { path: "emotes.user", select: "name" }
    ]);

    res.json({ 
      comment,
      emoteCount: comment.emoteCount
    });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /:id/emotes - Lấy danh sách emotes của comment
 * @param {string} req.params.id - ID của comment
 * @returns {Object} Danh sách emotes với thống kê
 */
router.get("/:id/emotes", authRequired, async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id)
      .populate("emotes.user", "name avatarUrl")
      .select("emotes");

    if (!comment) return res.status(404).json({ error: "Không tìm thấy bình luận" });

    // Nhóm emotes theo type
    const emoteStats = {};
    comment.emotes.forEach(emote => {
      if (!emoteStats[emote.type]) {
        emoteStats[emote.type] = {
          count: 0,
          users: []
        };
      }
      emoteStats[emote.type].count++;
      emoteStats[emote.type].users.push(emote.user);
    });

    res.json({ 
      emotes: comment.emotes,
      stats: emoteStats
    });
  } catch (e) {
    next(e);
  }
});

export default router;
