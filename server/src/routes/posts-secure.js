import express from "express";
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
        .populate("author", "name avatarUrl role")
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
        .populate("author", "name avatarUrl role");

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
        .populate("author", "name avatarUrl role")
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

export default router;
