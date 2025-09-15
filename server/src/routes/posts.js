import express from "express";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { authRequired, authOptional } from "../middleware/auth.js";
import { checkBanStatus } from "../middleware/banCheck.js";
import { paginate } from "../utils/paginate.js";

const router = express.Router();

// List with filters & search
router.get("/", authOptional, async (req, res, next) => {
  try {
    const { page = 1, limit = 100, tag, author, q, status = "published" } = req.query;
    const filter = {};

    if (status === "private") {
      if (!req.user) return res.status(401).json({ error: "Cần đăng nhập để xem bài riêng tư" });
      if (author !== req.user._id.toString()) {
        return res.status(403).json({ error: "Chỉ có thể xem bài riêng tư của chính mình" });
      }
      filter.status = "private";
      filter.author = req.user._id;
      // Cũng loại trừ bài đăng private trong group khỏi trang Home
      filter.group = { $exists: false };
    } else {
      filter.status = "published";
      // Loại trừ bài đăng trong group khỏi trang Home (chỉ hiện bài đăng không thuộc group nào)
      filter.group = { $exists: false };
    }

    if (tag) filter.tags = tag;
    if (author && status !== "private") filter.author = author;

    if (q) {
      const trimmedQuery = q.trim();
      if (trimmedQuery.length > 0 && trimmedQuery.length <= 100) {
        const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        filter.$or = [
          { title: { $regex: escapedQuery, $options: "i" } },
          { content: { $regex: escapedQuery, $options: "i" } },
          { tags: { $regex: escapedQuery, $options: "i" } }
        ];
      }
    }

    let query = Post.find(filter)
      .populate({
        path: "author",
        select: "name avatarUrl role blockedUsers"
      })
      .sort({ createdAt: -1 });

    let items = await paginate(query, { page: Number(page), limit: Number(limit) }).exec();

    // Lọc bài viết của user đã block mình hoặc bị mình block
    if (req.user?._id) {
      const currentUser = await User.findById(req.user._id).select("blockedUsers");
      items = items.filter(post => {
        const author = post.author;
        if (!author) return false;
        const iBlockedThem = (currentUser.blockedUsers || []).map(id => id.toString()).includes(author._id.toString());
        const theyBlockedMe = (author.blockedUsers || []).map(id => id.toString()).includes(req.user._id.toString());
        return !iBlockedThem && !theyBlockedMe;
      });
    }

    // Thêm số lượng bình luận cho mỗi bài - optimized batch query
    const postIds = items.map(post => post._id);
    const commentCounts = await Comment.aggregate([
      { $match: { post: { $in: postIds } } },
      { $group: { _id: "$post", count: { $sum: 1 } } }
    ]);
    
    // Create a map for quick lookup
    const commentCountMap = new Map();
    commentCounts.forEach(item => {
      commentCountMap.set(item._id.toString(), item.count);
    });
    
    // Add comment counts to posts
    const itemsWithCommentCount = items.map(post => ({
      ...post.toObject(),
      commentCount: commentCountMap.get(post._id.toString()) || 0
    }));

    const count = items.length;
    res.json({ items: itemsWithCommentCount, total: count, page: Number(page), pages: Math.ceil(count / Number(limit)) });
  } catch (e) {
    next(e);
  }
});

// Get by slug
router.get("/slug/:slug", async (req, res, next) => {
  try {
    let post = await Post.findOneAndUpdate(
      { slug: req.params.slug, status: "published" },
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate("author", "name avatarUrl role blockedUsers")
      .populate("emotes.user", "name avatarUrl role");

    // If not found, check private
    if (!post) {
      post = await Post.findOneAndUpdate(
        { slug: req.params.slug, status: "private" },
        { $inc: { views: 1 } },
        { new: true }
      )
        .populate("author", "name avatarUrl role blockedUsers")
        .populate("emotes.user", "name avatarUrl role");

      if (post) {
        if (!req.headers.authorization && !req.cookies?.token) {
          return res.status(401).json({ error: "Cần đăng nhập để xem bài viết này" });
        }
        try {
          let token = req.cookies?.token;
          if (!token) {
            const header = req.headers.authorization || "";
            token = header.startsWith("Bearer ") ? header.slice(7) : null;
          }
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (post.author._id.toString() !== decoded.id) {
            return res.status(403).json({ error: "Bạn không có quyền xem bài viết này" });
          }
        } catch {
          return res.status(401).json({ error: "Token không hợp lệ" });
        }
      }
    }

    if (!post) return res.status(404).json({ error: "Không tìm thấy bài viết" });

    const comments = await Comment.find({ post: post._id })
      .populate("author", "name avatarUrl role")
      .populate("parent", "_id")
      .sort({ createdAt: -1 });

    // Populate emotes.user kèm role
    await post.populate("emotes.user", "name avatarUrl role");

    res.json({ post: { ...post.toObject(), commentCount: comments.length }, comments });
  } catch (e) {
    next(e);
  }
});

// Get post by ID (for editing)
router.get("/edit/:id", authRequired, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id).populate("author", "name avatarUrl role");
    if (!post) return res.status(404).json({ error: "Không tìm thấy bài viết" });
    if (post.author._id.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ error: "Bạn không có quyền xem bài viết này" });
    }
    res.json({ post });
  } catch (e) {
    next(e);
  }
});

// Create
router.post("/", authRequired, checkBanStatus, async (req, res, next) => {
  try {
    const { title, content, tags = [], coverUrl = "", status = "published", files = [], group = null } = req.body;
    if (!title || !content) return res.status(400).json({ error: "Vui lòng nhập tiêu đề và nội dung" });
    if (!["private", "published"].includes(status)) {
      return res.status(400).json({ error: "Trạng thái không hợp lệ" });
    }
    const post = await Post.create({
      author: req.user._id,
      title,
      content,
      tags,
      coverUrl,
      status,
      files,
      group
    });
    res.json({ post });
  } catch (e) {
    next(e);
  }
});

// Update
router.put("/:id", authRequired, checkBanStatus, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Không tìm thấy bài viết" });
    if (post.author.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ error: "Bạn không có quyền chỉnh sửa bài viết này" });
    }
      const { title, content, tags, coverUrl, status, files } = req.body;
    if (title !== undefined) post.title = title;
    if (content !== undefined) post.content = content;
    if (Array.isArray(tags)) post.tags = tags;
    if (coverUrl !== undefined) post.coverUrl = coverUrl;
      if (Array.isArray(files)) post.files = files;
    if (status !== undefined) {
      if (!["private", "published"].includes(status)) {
        return res.status(400).json({ error: "Trạng thái không hợp lệ" });
      }
      post.status = status;
    }
    await post.save();
    res.json({ post });
  } catch (e) {
    next(e);
  }
});

// Delete
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
  } catch (e) {
    next(e);
  }
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
    await post.populate("emotes.user", "name avatarUrl role");
    res.json({ emotes: post.emotes });
  } catch (e) {
    next(e);
  }
});

export default router;