import express from "express";
import Comment from "../models/Comment.js";
import Post from "../models/Post.js";
import Group from "../models/Group.js";
import User from "../models/User.js";
import { authRequired, authOptional } from "../middleware/auth.js";
import { checkBanStatus } from "../middleware/banCheck.js";
import NotificationService from "../services/NotificationService.js";
import { uploadMultiple, uploadMultipleOptional, uploadToCloudinary, validateFile } from "../middleware/fileUpload.js";
import multer from "multer";

const router = express.Router();

// Test route để kiểm tra server
router.get("/test", (req, res) => {
  res.json({ message: "Comments API is working", timestamp: new Date().toISOString() });
});

// Test route để kiểm tra POST không cần auth
router.post("/test-post", (req, res) => {
  res.json({ 
    message: "POST test successful", 
    body: req.body,
    files: req.files || [],
    timestamp: new Date().toISOString() 
  });
});

// Middleware để xử lý cả JSON và FormData cho comment
const handleCommentUpload = (req, res, next) => {
  const contentType = req.get('Content-Type');
  
  if (contentType && contentType.includes('multipart/form-data')) {
    // FormData - sử dụng multer
    multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per file
        files: 5 // max 5 files
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Chỉ chấp nhận file hình ảnh'), false);
        }
      }
    }).array('files', 5)(req, res, (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({ error: err.message });
      }
      
      // Validate files nếu có (async)
      if (req.files && req.files.length > 0) {
        validateFiles(req, res, next);
      } else {
        next();
      }
    });
  } else {
    // JSON - không cần multer
    req.files = [];
    next();
  }
};

// Helper function để validate files
async function validateFiles(req, res, next) {
  try {
    const validationResults = await Promise.all(
      req.files.map(file => validateFile(file, 'image'))
    );
    
    const invalidFiles = validationResults.filter(result => !result.isValid);
    if (invalidFiles.length > 0) {
      const allErrors = invalidFiles.flatMap(result => result.errors);
      return res.status(400).json({
        error: 'Một số file không hợp lệ',
        details: allErrors
      });
    }
    
    next();
  } catch (validationError) {
    console.error('File validation error:', validationError);
    return res.status(400).json({ error: 'Lỗi khi validate file' });
  }
}

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
 * @param {Array} req.files - Danh sách ảnh upload (optional)
 * @returns {Object} Comment đã tạo
 */
router.post("/post/:postId", authRequired, checkBanStatus, handleCommentUpload, async (req, res, next) => {
  try {
    const { content, parentId } = req.body;
    const hasImages = req.files && req.files.length > 0;
    if (!content && !hasImages) {
      return res.status(400).json({ error: "Vui lòng nhập nội dung bình luận hoặc đính kèm ảnh" });
    }

    const post = await Post.findById(req.params.postId).populate("author", "name");
    if (!post) return res.status(404).json({ error: "Không tìm thấy bài viết" });

    // ===== Group comment permission enforcement (strict) =====
    if (post.group) {
      const group = await Group.findById(post.group);
      if (!group) {
        return res.status(404).json({ error: "Không tìm thấy nhóm của bài viết" });
      }

      const userId = req.user._id;
      const isOwner = group.owner.toString() === userId.toString();
      const isAdmin = isOwner || group.isAdmin(userId);
      const isMember = group.isMember(userId);

      const setting = group.settings?.commentPermissions || 'all_members';
      let allowed = false;
      if (setting === 'admins_only') {
        allowed = isAdmin;
      } else if (setting === 'members_only') {
        allowed = isMember || isAdmin;
      } else { // all_members
        allowed = isMember || isAdmin;
      }

      if (!allowed) {
        return res.status(403).json({ error: "Chỉ quản trị viên được phép bình luận trong nhóm này" });
      }
    }

    let parent = null;
    if (parentId) {
      parent = await Comment.findById(parentId).populate("author", "name");
      if (!parent) return res.status(400).json({ error: "Không tìm thấy bình luận gốc" });
    }

    // Upload ảnh lên Cloudinary nếu có
    let images = [];
    if (hasImages) {
      try {
        const uploadPromises = req.files.map(file => 
          uploadToCloudinary(file, 'blog/comments', 'image')
        );
        const uploadResults = await Promise.all(uploadPromises);
        console.log("[DEBUG] uploadResults:", uploadResults);
        // Chỉ nhận các ảnh có đủ url và publicId
        images = uploadResults
          .filter(result => result.url && result.public_id)
          .map(result => ({
            url: result.url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            alt: ""
          }));
        if (images.length !== uploadResults.length) {
          console.error("[DEBUG] Một hoặc nhiều ảnh upload bị thiếu url hoặc publicId", uploadResults);
          return res.status(400).json({ error: "Một hoặc nhiều ảnh upload bị thiếu url hoặc publicId", uploadResults });
        }
      } catch (uploadError) {
        console.error("Error uploading images:", uploadError);
        return res.status(500).json({ error: "Lỗi khi upload ảnh" });
      }
    }

    const commentData = {
      post: post._id,
      author: req.user._id,
      content: content || "",
      parent: parentId || null
    };
    
    // Chỉ thêm images nếu có
    if (images.length > 0) {
      commentData.images = images;
    }

    const c = await Comment.create(commentData);

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
 * Chỉ cho phép tác giả comment sửa nội dung và ảnh
 * @param {string} req.params.id - ID của comment
 * @param {string} req.body.content - Nội dung comment mới
 * @param {Array} req.files - Danh sách ảnh mới (optional)
 * @returns {Object} Comment đã cập nhật
 */
router.put("/:id", authRequired, handleCommentUpload, async (req, res, next) => {
  try {
    const { content } = req.body;
    const hasImages = req.files && req.files.length > 0;
    if (!content && !hasImages) {
      return res.status(400).json({ error: "Vui lòng nhập nội dung bình luận hoặc đính kèm ảnh" });
    }

    const c = await Comment.findById(req.params.id);
    if (!c) return res.status(404).json({ error: "Không tìm thấy bình luận" });

    const isOwner = c.author.toString() === req.user._id.toString();
    if (!isOwner) return res.status(403).json({ error: "Bạn chỉ có thể sửa bình luận của mình" });

    // Upload ảnh mới lên Cloudinary nếu có
    if (hasImages) {
      try {
        const uploadPromises = req.files.map(file => 
          uploadToCloudinary(file, 'blog/comments', 'image')
        );
        const uploadResults = await Promise.all(uploadPromises);
        
        const newImages = uploadResults.map(result => ({
          url: result.url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          alt: ""
        }));

        // Thay thế ảnh cũ bằng ảnh mới
        c.images = newImages;
      } catch (uploadError) {
        console.error("Error uploading images:", uploadError);
        return res.status(500).json({ error: "Lỗi khi upload ảnh" });
      }
    }

    c.content = content || "";
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
    
    // Xóa tất cả emote cũ của user (đảm bảo chỉ có 1 emote/user)
    comment.emotes = comment.emotes.filter(emote => !emote.user.equals(userId));
    
    // Tìm emote hiện tại của user với type này
    const existingEmoteIndex = comment.emotes.findIndex(
      emote => emote.user.equals(userId) && emote.type === type
    );

    if (existingEmoteIndex >= 0) {
      // Nếu đã có emote này rồi thì xóa (toggle off)
      comment.emotes.splice(existingEmoteIndex, 1);
    } else {
      // Thêm emote mới (đảm bảo chỉ có 1 emote/user)
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
