import express from "express";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import sanitizeHtml from "sanitize-html";
import { authRequired, authOptional } from "../middleware/auth.js";
import { checkBanStatus } from "../middleware/banCheck.js";
import { paginate } from "../utils/paginate.js";
import { withCache, postCache, invalidateCache } from "../utils/cache.js";
import mongoose from "mongoose";

const router = express.Router();

// Get current user's posts only (both published and private) - Optimized with caching
router.get("/my-posts", authRequired, async (req, res, next) => {
  try {
    const { page = 1, limit = 100, status } = req.query;
    const userId = req.user._id.toString();
    const statusFilter = status || "all";
    
    const cacheKey = `my-posts:${userId}:${page}:${limit}:${statusFilter}`;
    
    const result = await withCache(postCache, cacheKey, async () => {
      const filter = { 
        author: req.user._id,
        status: status || { $in: ["published", "private"] },
        $and: [
          {
            $or: [
              { group: { $exists: false } },
              { group: null }
            ]
          }
        ]
      };
      
      // Use aggregation for better performance
      const [posts, total] = await Promise.all([
        Post.aggregate([
          { $match: filter },
          { $sort: { createdAt: -1 } },
          { $skip: (page - 1) * limit },
          { $limit: parseInt(limit) },
          {
            $lookup: {
              from: "users",
              localField: "author",
              foreignField: "_id",
              as: "author",
              pipeline: [{ $project: { name: 1, avatarUrl: 1 } }]
            }
          },
          {
            $lookup: {
              from: "groups",
              localField: "group",
              foreignField: "_id",
              as: "group",
              pipeline: [{ $project: { name: 1 } }]
            }
          },
          {
            $addFields: {
              author: { $arrayElemAt: ["$author", 0] },
              group: { $arrayElemAt: ["$group", 0] }
            }
          }
        ]),
        Post.countDocuments(filter)
      ]);
      
      return {
        posts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    }, 5 * 60 * 1000); // 5 minutes cache
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get current user's published posts only
router.get("/my-published", authRequired, async (req, res, next) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const filter = { 
      author: req.user._id,
      status: "published"
    };
    
    // Exclude group posts from personal profile
    filter.$and = [
      {
        $or: [
          { group: { $exists: false } },
          { group: null }
        ]
      }
    ];
    
    const posts = await Post.find(filter)
      .populate("author", "name avatarUrl")
      .populate("group", "name")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Post.countDocuments(filter);
    
    res.json({
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get current user's private posts only
router.get("/my-private", authRequired, async (req, res, next) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const filter = { 
      author: req.user._id,
      status: "private"
    };
    
    // Exclude group posts from personal profile
    filter.$and = [
      {
        $or: [
          { group: { $exists: false } },
          { group: null }
        ]
      }
    ];
    
    const posts = await Post.find(filter)
      .populate("author", "name avatarUrl")
      .populate("group", "name")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Post.countDocuments(filter);
    
    res.json({
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get posts by specific user ID (public posts only)
router.get("/user-posts", authOptional, async (req, res, next) => {
  try {
    const { userId, page = 1, limit = 100 } = req.query;
    
    if (!userId || userId === "undefined") {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "User ID không hợp lệ" });
    }
    
    const filter = { 
      author: userId,
      status: "published" // Only public posts
    };
    
    // Exclude group posts from user profile
    filter.$and = [
      {
        $or: [
          { group: { $exists: false } },
          { group: null }
        ]
      }
    ];
    
    const posts = await Post.find(filter)
      .populate("author", "name avatarUrl")
      .populate("group", "name")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Post.countDocuments(filter);
    
    res.json({
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get all published posts for homepage (public feed)
router.get("/feed", authOptional, async (req, res, next) => {
  try {
    const { page = 1, limit = 100, tag, q } = req.query;
    const filter = { status: "published" };
    
    // Exclude group posts from homepage feed
    filter.$and = [
      {
        $or: [
          { group: { $exists: false } },
          { group: null }
        ]
      }
    ];
    
    if (tag) filter.tags = tag;
    
    if (q) {
      const trimmedQuery = q.trim();
      if (trimmedQuery.length > 0 && trimmedQuery.length <= 100) {
        const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        filter.$and.push({
          $or: [
            { title: { $regex: escapedQuery, $options: "i" } },
            { content: { $regex: escapedQuery, $options: "i" } }
          ]
        });
      }
    }
    
    const posts = await Post.find(filter)
      .populate("author", "name avatarUrl")
      .populate("group", "name")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Post.countDocuments(filter);
    
    res.json({
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// List with filters & search
router.get("/", authOptional, async (req, res, next) => {
  try {
    const { page = 1, limit = 100, tag, author, q, status = "published" } = req.query;
    const filter = {};

    if (status === "private") {
      if (!req.user) return res.status(401).json({ error: "Cần đăng nhập để xem bài riêng tư" });
      if (author && author !== "undefined" && author !== req.user._id.toString()) {
        return res.status(403).json({ error: "Chỉ có thể xem bài riêng tư của chính mình" });
      }
      filter.status = "private";
      filter.author = req.user._id;
      // Cũng loại trừ bài đăng private trong group khỏi trang Home
      filter.$and = [
        {
          $or: [
            { group: { $exists: false } },
            { group: null }
          ]
        }
      ];
    } else {
      filter.status = "published";
      // Loại trừ bài đăng trong group khỏi trang Home (chỉ hiện bài đăng không thuộc group nào)
      filter.$and = [
        {
          $or: [
            { group: { $exists: false } },
            { group: null }
          ]
        }
      ];
    }

    if (tag) filter.tags = tag;
    if (author && author !== "undefined" && status !== "private") {
      // Validate MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(author)) {
        return res.status(400).json({ error: "ID không hợp lệ" });
      }
      filter.author = author;
    }

    if (q) {
      const trimmedQuery = q.trim();
      if (trimmedQuery.length > 0 && trimmedQuery.length <= 100) {
        const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        filter.$and.push({
          $or: [
            { title: { $regex: escapedQuery, $options: "i" } },
            { content: { $regex: escapedQuery, $options: "i" } },
            { tags: { $regex: escapedQuery, $options: "i" } }
          ]
        });
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
    // Sanitize input để chống XSS
    const sanitizedTitle = sanitizeHtml(title.trim(), {
      allowedTags: [],
      allowedAttributes: {}
    });
    const sanitizedContent = sanitizeHtml(content.trim(), {
      allowedTags: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'a'],
      allowedAttributes: {
        'a': ['href', 'title'],
        'h1': ['id'],
        'h2': ['id'],
        'h3': ['id'],
        'h4': ['id'],
        'h5': ['id'],
        'h6': ['id']
      }
    });
    const sanitizedTags = Array.isArray(tags) ? tags.map(tag => sanitizeHtml(tag.trim(), { allowedTags: [], allowedAttributes: {} })) : [];
    const sanitizedCoverUrl = sanitizeHtml(coverUrl.trim(), { allowedTags: [], allowedAttributes: {} });

    const post = await Post.create({
      author: req.user._id,
      title: sanitizedTitle,
      content: sanitizedContent,
      tags: sanitizedTags,
      coverUrl: sanitizedCoverUrl,
      status,
      files: Array.isArray(files) ? files : [],
      group
    });
    
    // Invalidate cache for this user's posts
    invalidateCache(postCache, `my-posts:${req.user._id.toString()}`);
    invalidateCache(postCache, `posts:`);
    
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
    
    // Invalidate cache for this user's posts and general posts
    invalidateCache(postCache, `my-posts:${post.author.toString()}`);
    invalidateCache(postCache, `posts:`);
    
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
    
    // Invalidate cache for this user's posts and general posts
    invalidateCache(postCache, `my-posts:${post.author.toString()}`);
    invalidateCache(postCache, `posts:`);
    
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

// ==================== SAVED POSTS ====================

// Toggle save/unsave a post
router.post("/:id/save", authRequired, async (req, res, next) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: "Post ID không hợp lệ" });
    }

    const post = await Post.findById(postId).select("_id status author");
    if (!post) return res.status(404).json({ error: "Không tìm thấy bài viết" });

    // Optional: If post is private and not owner, do not allow save
    if (post.status === "private" && post.author.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Không thể lưu bài viết riêng tư của người khác" });
    }

    const user = await User.findById(userId).select("savedPosts");
    const alreadySaved = user.savedPosts?.some(id => id.toString() === postId);

    if (alreadySaved) {
      user.savedPosts = user.savedPosts.filter(id => id.toString() !== postId);
    } else {
      user.savedPosts = user.savedPosts || [];
      user.savedPosts.unshift(postId);
    }

    await user.save();
    res.json({ saved: !alreadySaved });
  } catch (e) { next(e); }
});

// Check if a post is saved by current user
router.get("/:id/is-saved", authRequired, async (req, res, next) => {
  try {
    const postId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: "Post ID không hợp lệ" });
    }
    const user = await User.findById(req.user._id).select("savedPosts");
    const saved = (user.savedPosts || []).some(id => id.toString() === postId);
    res.json({ saved });
  } catch (e) { next(e); }
});

// Get saved posts list
router.get("/saved/list", authRequired, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const user = await User.findById(req.user._id).select("savedPosts");
    const ids = (user.savedPosts || []).map(id => id.toString());

    const start = (parseInt(page) - 1) * parseInt(limit);
    const end = start + parseInt(limit);
    const pageIds = ids.slice(start, end);

    const posts = await Post.find({ _id: { $in: pageIds } })
      .populate("author", "name avatarUrl")
      .populate("group", "name")
      .sort({ createdAt: -1 });

    res.json({
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: ids.length,
        pages: Math.ceil(ids.length / parseInt(limit))
      }
    });
  } catch (e) { next(e); }
});

export default router;