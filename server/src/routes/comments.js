import express from "express";
import Comment from "../models/Comment.js";
import Post from "../models/Post.js";
import { authRequired } from "../middleware/auth.js";
import { checkBanStatus } from "../middleware/banCheck.js";
import NotificationService from "../services/NotificationService.js";

const router = express.Router();

// list comments for a post (trả về cả parent để FE dựng cây)
router.get("/post/:postId", async (req, res, next) => {
  try {
    const items = await Comment.find({ post: req.params.postId })
      .populate("author", "name avatarUrl")
      .populate("parent")
      .sort({ createdAt: -1 });
    res.json({ items });
  } catch (e) { next(e); }
});

// add comment (có thể là trả lời bình luận khác)
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
      parent: parentId || null 
    });
    
    await c.populate([
      { path: "author", select: "name avatarUrl" },
      { path: "parent" }
    ]);

    // Create notifications
    try {
      if (parent) {
        // This is a reply - notify the parent comment author
        await NotificationService.createReplyNotification(c, parent, post, req.user);
      } else {
        // This is a comment on post - notify the post author
        await NotificationService.createCommentNotification(c, post, req.user);
      }
    } catch (notifError) {
      console.error("Error creating notification:", notifError);
      // Don't fail the comment creation if notification fails
    }
    
    res.json({ comment: c });
  } catch (e) { next(e); }
});

// update comment (chỉ người cmt)
router.put("/:id", authRequired, async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: "Vui lòng nhập nội dung bình luận" });
    
    const c = await Comment.findById(req.params.id);
    if (!c) return res.status(404).json({ error: "Không tìm thấy bình luận" });
    
    const isOwner = c.author.toString() === req.user._id.toString();
    if (!isOwner) return res.status(403).json({ error: "Bạn chỉ có thể sửa bình luận của mình" });
    
    c.content = content;
    await c.save();
    
    await c.populate([
      { path: "author", select: "name avatarUrl" },
      { path: "parent" }
    ]);
    
    res.json({ comment: c });
  } catch (e) { next(e); }
});

// delete comment (người cmt hoặc chủ bài hoặc admin)
router.delete("/:id", authRequired, async (req, res, next) => {
  try {
    const c = await Comment.findById(req.params.id);
    if (!c) return res.status(404).json({ error: "Không tìm thấy bình luận" });
    const post = await Post.findById(c.post);
    const isOwner = c.author.toString() === req.user._id.toString();
    const isPostOwner = post && post.author.toString() === req.user._id.toString();
    if (!isOwner && !isPostOwner && req.user.role !== "admin")
      return res.status(403).json({ error: "Bạn không có quyền xóa bình luận này" });
    await c.deleteOne();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// edit comment (người cmt)
router.put("/:id", authRequired, async (req, res, next) => {
  try {
    const c = await Comment.findById(req.params.id);
    if (!c) return res.status(404).json({ error: "Không tìm thấy bình luận" });
    if (c.author.toString() !== req.user._id.toString())
      return res.status(403).json({ error: "Bạn không có quyền chỉnh sửa bình luận này" });
    c.content = req.body.content || c.content;
    c.edited = true;
    await c.save();
    res.json({ comment: await c.populate("author", "name avatarUrl") });
  } catch (e) { next(e); }
});

export default router;
