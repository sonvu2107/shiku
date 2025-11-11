import express from "express";
import mongoose from "mongoose";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import User from "../models/User.js";
import { authRequired, authOptional } from "../middleware/jwtSecurity.js";
import { checkBanStatus } from "../middleware/banCheck.js";
import { 
  createPostSchema, 
  createCommentSchema, 
  searchSchema,
  validate,
  sanitizeHtml,
  escapeRegex
} from "../middleware/validation.js";
import { 
  createSafeTextSearch, 
  createPaginationQuery,
  sanitizeQueryParams 
} from "../utils/mongoSecurity.js";
import { 
  logSecurityEvent,
  SECURITY_EVENTS,
  LOG_LEVELS 
} from "../middleware/securityLogging.js";

const router = express.Router();

/**
 * GET / - Lấy danh sách bài viết với filters & search
 * @param {Object} req.query - Query parameters
 * @returns {Object} Danh sách bài viết và pagination
 */
router.get("/", 
  authOptional,
  validate(searchSchema, 'query'),
  async (req, res, next) => {
    try {
      const { page = 1, limit = 20, tag, author, q, status = "published" } = req.query;
      
      // Sanitize query parameters
      const sanitizedQuery = sanitizeQueryParams(req.query);
      
      // Tạo filter object
      const filter = {};

      if (status === "private") {
        if (!req.user) {
          return res.status(401).json({ 
            error: "Cần đăng nhập để xem bài riêng tư",
            code: "AUTH_REQUIRED"
          });
        }
        
        if (author !== req.user._id.toString()) {
          return res.status(403).json({ 
            error: "Chỉ có thể xem bài riêng tư của chính mình",
            code: "FORBIDDEN"
          });
        }
        
        filter.status = "private";
        filter.author = req.user._id;
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
        filter.$and = [
          {
            $or: [
              { group: { $exists: false } },
              { group: null }
            ]
          }
        ];
      }

      if (tag) filter.tags = escapeRegex(tag);
      if (author && status !== "private") filter.author = author;

      // Tạo search query an toàn
      if (q) {
        const searchQuery = createSafeTextSearch(q, ['title', 'content']);
        if (searchQuery.$or) {
          filter.$and = filter.$and || [];
          filter.$and.push(searchQuery);
        }
      }

      // Tạo pagination query
      const pagination = createPaginationQuery({ page, limit, sortBy: 'createdAt', sortOrder: 'desc' });

      // Thực hiện query với timeout
      const posts = await Post.find(filter)
        .populate("author", "name nickname avatarUrl role")
        .sort(pagination.sort)
        .skip(pagination.skip)
        .limit(pagination.limit)
        .maxTimeMS(5000) // 5 second timeout
        .lean();

      const totalPosts = await Post.countDocuments(filter).maxTimeMS(5000);

      res.json({
        posts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalPosts / parseInt(limit)),
          totalPosts,
          hasMore: posts.length === parseInt(limit),
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      // Log potential security issues
      if (error.message.includes('timeout')) {
        logSecurityEvent(LOG_LEVELS.WARN, SECURITY_EVENTS.SUSPICIOUS_ACTIVITY, {
          type: 'query_timeout',
          query: req.query,
          ip: req.ip
        }, req);
      }
      
      next(error);
    }
  }
);

/**
 * GET /:id - Lấy chi tiết bài viết
 * @param {string} req.params.id - ID bài viết
 * @returns {Object} Chi tiết bài viết và comments
 */
router.get("/:id", 
  authOptional,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      
      // Validate ObjectId
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ 
          error: "ID bài viết không hợp lệ",
          code: "INVALID_ID"
        });
      }

      let post = await Post.findById(id)
        .populate("author", "name nickname avatarUrl role");

      // Kiểm tra quyền truy cập cho bài viết private
      if (post && post.status === "private") {
        if (!req.user || post.author._id.toString() !== req.user._id.toString()) {
          return res.status(403).json({ 
            error: "Không có quyền truy cập bài viết này",
            code: "FORBIDDEN"
          });
        }
      }

      if (!post) {
        return res.status(404).json({ 
          error: "Không tìm thấy bài viết",
          code: "POST_NOT_FOUND"
        });
      }

      // Lấy comments
      const comments = await Comment.find({ post: post._id })
        .populate("author", "name nickname avatarUrl role")
        .populate("parent", "_id")
        .sort({ createdAt: -1 })
        .maxTimeMS(3000);

      // Populate emotes
      await post.populate("emotes.user", "name avatarUrl role");

      res.json({ 
        post: { 
          ...post.toObject(), 
          commentCount: comments.length 
        }, 
        comments 
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST / - Tạo bài viết mới
 * @param {Object} req.body - Dữ liệu bài viết
 * @returns {Object} Bài viết đã tạo
 */
router.post("/", 
  authRequired,
  checkBanStatus,
  validate(createPostSchema, 'body'),
  async (req, res, next) => {
    try {
      const { title, content, tags, status, group } = req.body;
      
      // Sanitize HTML content
      const sanitizedTitle = sanitizeHtml(title);
      const sanitizedContent = sanitizeHtml(content);
      const sanitizedTags = tags ? tags.map(tag => sanitizeHtml(tag)) : [];

      // Tạo bài viết mới
      const post = new Post({
        title: sanitizedTitle,
        content: sanitizedContent,
        tags: sanitizedTags,
        status: status || 'published',
        author: req.user._id,
        group: group || null
      });

      await post.save();
      await post.populate("author", "name avatarUrl role");

      // Log security event
      logSecurityEvent(LOG_LEVELS.INFO, SECURITY_EVENTS.ADMIN_ACTION, {
        action: 'post_created',
        postId: post._id,
        userId: req.user._id,
        ip: req.ip
      }, req);

      res.status(201).json(post);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /:id - Cập nhật bài viết
 * @param {string} req.params.id - ID bài viết
 * @param {Object} req.body - Dữ liệu cập nhật
 * @returns {Object} Bài viết đã cập nhật
 */
router.put("/:id", 
  authRequired,
  checkBanStatus,
  validate(createPostSchema, 'body'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { title, content, tags, status } = req.body;
      
      // Validate ObjectId
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ 
          error: "ID bài viết không hợp lệ",
          code: "INVALID_ID"
        });
      }

      const post = await Post.findById(id);
      
      if (!post) {
        return res.status(404).json({ 
          error: "Không tìm thấy bài viết",
          code: "POST_NOT_FOUND"
        });
      }

      // Kiểm tra quyền sở hữu
      if (post.author.toString() !== req.user._id.toString()) {
        return res.status(403).json({ 
          error: "Chỉ có thể chỉnh sửa bài viết của chính mình",
          code: "FORBIDDEN"
        });
      }

      // Sanitize và cập nhật
      if (title) post.title = sanitizeHtml(title);
      if (content) post.content = sanitizeHtml(content);
      if (tags) post.tags = tags.map(tag => sanitizeHtml(tag));
      if (status) post.status = status;

      await post.save();
      await post.populate("author", "name avatarUrl role");

      // Log security event
      logSecurityEvent(LOG_LEVELS.INFO, SECURITY_EVENTS.ADMIN_ACTION, {
        action: 'post_updated',
        postId: post._id,
        userId: req.user._id,
        ip: req.ip
      }, req);

      res.json(post);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /:id - Xóa bài viết
 * @param {string} req.params.id - ID bài viết
 * @returns {Object} Thông báo xóa thành công
 */
router.delete("/:id", 
  authRequired,
  checkBanStatus,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      
      // Validate ObjectId
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ 
          error: "ID bài viết không hợp lệ",
          code: "INVALID_ID"
        });
      }

      const post = await Post.findById(id);
      
      if (!post) {
        return res.status(404).json({ 
          error: "Không tìm thấy bài viết",
          code: "POST_NOT_FOUND"
        });
      }

      // Kiểm tra quyền sở hữu hoặc admin
      if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ 
          error: "Chỉ có thể xóa bài viết của chính mình",
          code: "FORBIDDEN"
        });
      }

      // Xóa bài viết và comments liên quan
      await Post.findByIdAndDelete(id);
      await Comment.deleteMany({ post: id });

      // Log security event
      logSecurityEvent(LOG_LEVELS.INFO, SECURITY_EVENTS.ADMIN_ACTION, {
        action: 'post_deleted',
        postId: id,
        userId: req.user._id,
        ip: req.ip
      }, req);

      res.json({ message: "Xóa bài viết thành công" });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /:id/comments - Tạo comment mới
 * @param {string} req.params.id - ID bài viết
 * @param {Object} req.body - Dữ liệu comment
 * @returns {Object} Comment đã tạo
 */
router.post("/:id/comments", 
  authRequired,
  checkBanStatus,
  validate(createCommentSchema, 'body'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { content, parent } = req.body;
      
      // Validate ObjectId
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ 
          error: "ID bài viết không hợp lệ",
          code: "INVALID_ID"
        });
      }

      // Kiểm tra bài viết tồn tại
      const post = await Post.findById(id);
      if (!post) {
        return res.status(404).json({ 
          error: "Không tìm thấy bài viết",
          code: "POST_NOT_FOUND"
        });
      }

      // Tạo comment mới
      const comment = new Comment({
        content: sanitizeHtml(content),
        author: req.user._id,
        post: id,
        parent: parent || null
      });

      await comment.save();
      await comment.populate("author", "name avatarUrl role");

      // Log security event
      logSecurityEvent(LOG_LEVELS.INFO, SECURITY_EVENTS.ADMIN_ACTION, {
        action: 'comment_created',
        commentId: comment._id,
        postId: id,
        userId: req.user._id,
        ip: req.ip
      }, req);

      res.status(201).json(comment);
    } catch (error) {
      next(error);
    }
  }
);

// ==================== SAVED POSTS ====================

// Batch check if posts are saved by current user
router.get("/is-saved", authRequired, async (req, res, next) => {
  try {
    const rawIds = req.query.ids;
    if (!rawIds) {
      return res.json({});
    }

    const ids = rawIds
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      return res.json({});
    }

    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      const emptyResponse = {};
      ids.forEach((id) => {
        emptyResponse[id] = false;
      });
      return res.json(emptyResponse);
    }

    const user = await User.findById(req.user._id).select("savedPosts");
    const savedIds = new Set(
      (user?.savedPosts || []).map((savedId) => savedId.toString())
    );

    const response = {};
    ids.forEach((id) => {
      response[id] = savedIds.has(id);
    });

    res.json(response);
  } catch (error) {
    next(error);
  }
});

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
    
    // Tính số lượng users đã save post này
    const savedCount = await User.countDocuments({ savedPosts: postId });
    
    res.json({ saved: !alreadySaved, savedCount });
  } catch (error) { next(error); }
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
  } catch (error) { next(error); }
});

// Toggle interest/not interested for a post
router.post("/:id/interest", authRequired, async (req, res, next) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;
    const { interested } = req.body; // true = quan tâm, false = không quan tâm

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: "Post ID không hợp lệ" });
    }

    if (typeof interested !== 'boolean') {
      return res.status(400).json({ error: "Giá trị 'interested' phải là boolean" });
    }

    const post = await Post.findById(postId).select("_id status author");
    if (!post) {
      return res.status(404).json({ error: "Không tìm thấy bài viết" });
    }

    if (post.status === "private" && post.author.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Không thể đánh dấu bài viết riêng tư của người khác" });
    }

    const user = await User.findById(userId).select("interestedPosts notInterestedPosts");
    
    // Remove from both lists first (toggle behavior)
    user.interestedPosts = (user.interestedPosts || []).filter(id => id.toString() !== postId);
    user.notInterestedPosts = (user.notInterestedPosts || []).filter(id => id.toString() !== postId);

    // Add to appropriate list based on interested value
    if (interested) {
      user.interestedPosts = user.interestedPosts || [];
      if (!user.interestedPosts.some(id => id.toString() === postId)) {
        user.interestedPosts.unshift(postId);
      }
    } else {
      user.notInterestedPosts = user.notInterestedPosts || [];
      if (!user.notInterestedPosts.some(id => id.toString() === postId)) {
        user.notInterestedPosts.unshift(postId);
      }
    }

    await user.save();
    
    res.json({ 
      success: true, 
      interested,
      message: interested 
        ? "Đã đánh dấu quan tâm bài viết này" 
        : "Đã đánh dấu không quan tâm bài viết này"
    });
  } catch (error) {
    next(error);
  }
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
      .populate({
        path: "emotes.user",
        select: "name nickname avatarUrl role"
      })
      .sort({ createdAt: -1 });

    // Đảm bảo emotes.user được populate đúng cách
    // Lưu ý: populate nested paths như emotes.user có thể không hoạt động đúng với .toObject()
    // Nên chúng ta cần populate lại thủ công
    const postsWithPopulatedEmotes = posts.map(post => {
      const postObj = post.toObject();
      
      // Đảm bảo emotes.user được populate - kiểm tra và populate lại nếu cần
      if (postObj.emotes && Array.isArray(postObj.emotes) && postObj.emotes.length > 0) {
        // Lấy tất cả user IDs từ emotes chưa được populate
        const emoteUserIds = [];
        postObj.emotes.forEach(emote => {
          if (emote && emote.user) {
            // Nếu đã được populate (có _id và name), không cần populate lại
            if (typeof emote.user === 'object' && emote.user._id && emote.user.name) {
              // Đã được populate - skip
              return;
            }
            // Nếu chưa được populate, lấy ID
            let userId = null;
            if (typeof emote.user === 'object' && emote.user._id) {
              userId = emote.user._id.toString();
            } else if (typeof emote.user === 'string') {
              userId = emote.user;
            } else if (emote.user && emote.user.toString) {
              userId = emote.user.toString();
            }
            if (userId) {
              emoteUserIds.push(userId);
            }
          }
        });
        
        // Populate users nếu có (sẽ được xử lý bên ngoài để tối ưu batch query)
        // Tạm thời giữ nguyên structure, sẽ populate sau
      }
      
      return postObj;
    });
    
    // Batch populate tất cả users từ tất cả posts
    const allEmoteUserIds = new Set();
    postsWithPopulatedEmotes.forEach(post => {
      if (post.emotes && Array.isArray(post.emotes)) {
        post.emotes.forEach(emote => {
          if (emote && emote.user) {
            // Nếu đã được populate, skip
            if (typeof emote.user === 'object' && emote.user._id && emote.user.name) {
              return;
            }
            // Lấy ID để populate
            let userId = null;
            if (typeof emote.user === 'object' && emote.user._id) {
              userId = emote.user._id.toString();
            } else if (typeof emote.user === 'string') {
              userId = emote.user;
            } else if (emote.user && emote.user.toString) {
              userId = emote.user.toString();
            }
            if (userId) {
              allEmoteUserIds.add(userId);
            }
          }
        });
      }
    });
    
    // Populate users nếu có
    let userMap = new Map();
    if (allEmoteUserIds.size > 0) {
      const uniqueUserIds = Array.from(allEmoteUserIds);
      const users = await User.find({ _id: { $in: uniqueUserIds } })
        .select("name nickname avatarUrl role")
        .lean();
      
      users.forEach(u => userMap.set(u._id.toString(), u));
    }
    
    // Populate lại emotes.user trong posts
    const finalPosts = postsWithPopulatedEmotes.map(post => {
      if (post.emotes && Array.isArray(post.emotes) && userMap.size > 0) {
        post.emotes = post.emotes.map(emote => {
          if (emote && emote.user) {
            // Nếu đã được populate, giữ nguyên
            if (typeof emote.user === 'object' && emote.user._id && emote.user.name) {
              return emote;
            }
            
            // Nếu chưa được populate, populate lại
            let userId = null;
            if (typeof emote.user === 'object' && emote.user._id) {
              userId = emote.user._id.toString();
            } else if (typeof emote.user === 'string') {
              userId = emote.user;
            } else if (emote.user && emote.user.toString) {
              userId = emote.user.toString();
            }
            
            if (userId) {
              const populatedUser = userMap.get(userId);
              if (populatedUser) {
                return { ...emote, user: populatedUser };
              }
            }
          }
          return emote;
        });
      }
      return post;
    });

    // Tính số lượng saved cho mỗi bài - batch query
    const savedPostIds = finalPosts.map(p => p._id);
    let savedCounts = [];
    if (savedPostIds.length > 0) {
      savedCounts = await User.aggregate([
        { $match: { savedPosts: { $in: savedPostIds } } },
        { $unwind: "$savedPosts" },
        { $match: { savedPosts: { $in: savedPostIds } } },
        { $group: { _id: "$savedPosts", count: { $sum: 1 } } }
      ]);
    }
    
    const savedCountMap = new Map();
    savedCounts.forEach(item => {
      savedCountMap.set(item._id.toString(), item.count);
    });

    // Thêm savedCount vào mỗi post
    const postsWithSavedCount = finalPosts.map(post => ({
      ...post,
      savedCount: savedCountMap.get(post._id.toString()) || 0
    }));

    res.json({
      posts: postsWithSavedCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: ids.length,
        pages: Math.ceil(ids.length / parseInt(limit))
      }
    });
  } catch (error) { next(error); }
});

export default router;
