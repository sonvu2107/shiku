import express from "express";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { authRequired } from "../middleware/auth.js";
import { checkBanStatus } from "../middleware/banCheck.js";
import { paginate } from "../utils/paginate.js";

const router = express.Router();


// List with filters & search
router.get("/", async (req, res, next) => {
  try {
    const { page = 1, limit = 10, tag, author, q, status = "published" } = req.query;
    const filter = {};
    
    // Handle status filter with privacy check
    if (status === "private") {
      // Private posts can only be viewed by their author or admin
      if (!req.headers.authorization) {
        return res.status(401).json({ error: "Cần đăng nhập để xem bài riêng tư" });
      }
      
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (author !== decoded.id) {
          return res.status(403).json({ error: "Chỉ có thể xem bài riêng tư của chính mình" });
        }
        
        filter.status = status;
        filter.author = decoded.id; // Ensure only their own private posts
      } catch (authError) {
        return res.status(401).json({ error: "Token không hợp lệ" });
      }
    } else {
      filter.status = status;
    }
    
    if (tag) filter.tags = tag;
    if (author && status !== "private") filter.author = author; // author filter only for non-private
    if (q) {
      // Validate and sanitize search query
      const trimmedQuery = q.trim();
      if (trimmedQuery.length > 0 && trimmedQuery.length <= 100) {
        // Escape special regex characters to prevent regex injection
        const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.$or = [
          { title: { $regex: escapedQuery, $options: "i" } },
          { content: { $regex: escapedQuery, $options: "i" } },
          { tags: { $regex: escapedQuery, $options: "i" } }
        ];
      }
    }

    let query = Post.find(filter)
      .populate("author", "name avatarUrl")
      .sort({ createdAt: -1 });

    const count = await Post.countDocuments(filter);
    const docs = paginate(query, { page: Number(page), limit: Number(limit) });
    const items = await docs.exec();

    res.json({ items, total: count, page: Number(page), pages: Math.ceil(count / Number(limit)) });
  } catch (e) { next(e); }
});

// Get by slug
router.get("/slug/:slug", async (req, res, next) => {
  try {
    console.log('🔍 Looking for slug:', req.params.slug);
    
    // First try to find published post
    let post = await Post.findOneAndUpdate(
      { slug: req.params.slug, status: "published" },
      { $inc: { views: 1 } },
      { new: true }
    ).populate("author", "name avatarUrl");
    
    console.log('📖 Published post found:', !!post);
    
    // If not found, try to find private post
    if (!post) {
      console.log('🔐 Checking for private post...');
      post = await Post.findOneAndUpdate(
        { slug: req.params.slug, status: "private" },
        { $inc: { views: 1 } },
        { new: true }
      ).populate("author", "name avatarUrl");
      
      console.log('🔐 Private post found:', !!post);
      
      // If private post found, check authorization
      if (post && req.headers.authorization) {
        try {
          const token = req.headers.authorization.split(" ")[1];
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const user = await User.findById(decoded.id);
          
          console.log('👤 User:', user?.name, 'Post author:', post.author._id.toString());
          
          // Check if user can view this private post (only author)
          if (post.author._id.toString() !== decoded.id) {
            console.log('❌ Access denied to private post');
            return res.status(403).json({ error: "Bạn không có quyền xem bài viết này" });
          }
        } catch (authError) {
          console.log('❌ Auth error:', authError.message);
          return res.status(401).json({ error: "Cần đăng nhập để xem bài viết này" });
        }
      } else if (post && !req.headers.authorization) {
        console.log('❌ No authorization for private post');
        return res.status(401).json({ error: "Cần đăng nhập để xem bài viết này" });
      }
    }
    
    if (!post) {
      console.log('❌ No post found for slug:', req.params.slug);
      return res.status(404).json({ error: "Không tìm thấy bài viết" });
    }

    console.log('✅ Post found:', post.title);
    
    const comments = await Comment.find({ post: post._id })
      .populate("author", "name avatarUrl")
      .populate("parent", "_id")
      .sort({ createdAt: -1 });
    res.json({ post, comments });
  } catch (e) { 
    console.log('💥 Error in slug route:', e.message);
    next(e); 
  }
});

// Get post by ID (for editing)
router.get("/edit/:id", authRequired, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id).populate("author", "name avatarUrl");
    if (!post) return res.status(404).json({ error: "Không tìm thấy bài viết" });
    if (post.author._id.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ error: "Bạn không có quyền xem bài viết này" });
    }
    res.json({ post });
  } catch (e) { next(e); }
});

// Create
router.post("/", authRequired, checkBanStatus, async (req, res, next) => {
  try {
    const { title, content, tags = [], coverUrl = "", status = "published" } = req.body;
    if (!title || !content) return res.status(400).json({ error: "Vui lòng nhập tiêu đề và nội dung" });
    
    // Validate status
    if (!["private", "published"].includes(status)) {
      return res.status(400).json({ error: "Trạng thái không hợp lệ" });
    }
    
    const post = await Post.create({ author: req.user._id, title, content, tags, coverUrl, status });
    res.json({ post });
  } catch (e) { next(e); }
});

// Update
router.put("/:id", authRequired, checkBanStatus, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Không tìm thấy bài viết" });
    if (post.author.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ error: "Bạn không có quyền chỉnh sửa bài viết này" });
    }
    const { title, content, tags, coverUrl, status } = req.body;
    if (title !== undefined) post.title = title;
    if (content !== undefined) post.content = content;
    if (Array.isArray(tags)) post.tags = tags;
    if (coverUrl !== undefined) post.coverUrl = coverUrl;
    
    // Validate status if provided
    if (status !== undefined) {
      if (!["private", "published"].includes(status)) {
        return res.status(400).json({ error: "Trạng thái không hợp lệ" });
      }
      post.status = status;
    }
    
    await post.save();
    res.json({ post });
  } catch (e) { next(e); }
});

// Delete post
router.delete("/:id", authRequired, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Không tìm thấy bài viết" });
    if (post.author.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ error: "Bạn không có quyền xóa bài viết này" });
    }
    await Comment.deleteMany({ post: post._id });
    await post.deleteOne();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Emote
router.post("/:id/emote", authRequired, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Không tìm thấy bài viết" });

    const { emote } = req.body;
    if (!emote || typeof emote !== "string") {
      return res.status(400).json({ error: "Biểu cảm không hợp lệ" });
    }

    const uid = req.user._id.toString();

    const existed = post.emotes.find(e => e.user.toString() === uid && e.type === emote);
    if (existed) {
      post.emotes = post.emotes.filter(e => !(e.user.toString() === uid && e.type === emote));
    } else {
      post.emotes = post.emotes.filter(e => e.user.toString() !== uid);
      post.emotes.push({ user: req.user._id, type: emote });
    }

    await post.save();
    res.json({ emotes: post.emotes });
  } catch (e) { next(e); }
});

export default router;
