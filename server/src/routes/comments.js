import express from "express";
import Comment from "../models/Comment.js";
import Post from "../models/Post.js";
import User from "../models/User.js";
import { authRequired, authOptional } from "../middleware/auth.js";
import { checkBanStatus } from "../middleware/banCheck.js";
import NotificationService from "../services/NotificationService.js";

const router = express.Router();

// 📌 Lấy danh sách comment cho 1 bài post
router.get("/post/:postId", authOptional, async (req, res, next) => {
  try {
    let items = await Comment.find({ post: req.params.postId })
      .populate("author", "name avatarUrl role blockedUsers")
      .populate("parent")
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

// 📌 Thêm comment (có thể là trả lời bình luận khác)
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

// 📌 Update comment (chỉ người viết)
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

// 📌 Xóa comment (người viết, chủ post hoặc admin)
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

export default router;
