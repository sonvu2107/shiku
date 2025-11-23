import mongoose from "mongoose";

/**
 * Comment Schema - Định nghĩa cấu trúc dữ liệu cho comments
 * Bao gồm nội dung, tác giả, emotes, likes và nested replies
 */
const CommentSchema = new mongoose.Schema({
  // ==================== THÔNG TIN CƠ BẢN ====================
  post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true, index: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: false, trim: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null }, // Comment cha (cho nested replies)
  edited: { type: Boolean, default: false },
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }], // Users được mention trong comment
  
  // ==================== MEDIA ====================
  images: [{
    url: { type: String, required: false },
    publicId: { type: String, required: false },
    width: { type: Number },
    height: { type: Number },
    alt: { type: String, default: "" }
  }],
  
  // ==================== EMOTES & LIKES ====================
  emotes: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, required: true }, // "like", "love", "laugh", "angry", etc.
    createdAt: { type: Date, default: Date.now }
  }],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Danh sách users đã like
  
  // ==================== THỐNG KÊ ====================
  likeCount: { type: Number, default: 0 }, // Số lượng likes
  emoteCount: { type: Number, default: 0 }, // Tổng số emotes
}, { timestamps: true });

// ==================== DATABASE INDEXES ====================
// Indexes for common queries
CommentSchema.index({ post: 1, createdAt: -1 }); // Get comments by post, sorted by date - CRITICAL
CommentSchema.index({ author: 1, createdAt: -1 }); // Get comments by author
CommentSchema.index({ parent: 1 }); // Get replies to a comment
CommentSchema.index({ 'emotes.user': 1 }); // Find comments by emote user
CommentSchema.index({ 'likes': 1 }); // Find comments by likes

// FIX MISSING INDEXES: Additional indexes for better performance
CommentSchema.index({ post: 1, parent: 1, createdAt: -1 }); // Top-level comments only

// Pre-save middleware để cập nhật counts và validation
// FIX SYNC VALIDATION: Already using optimal methods (length, findIndex) ✅
CommentSchema.pre('save', function(next) {
  // Direct property access - O(1)
  this.likeCount = this.likes.length;
  this.emoteCount = this.emotes.length;
  
  // Validation: comment phải có content hoặc ít nhất 1 ảnh
  if ((!this.content || this.content.trim() === "") && (!this.images || this.images.length === 0)) {
    return next(new Error('Comment phải có nội dung hoặc ít nhất 1 ảnh'));
  }
  
  // Nếu có ảnh, đảm bảo mỗi ảnh có url và publicId
  // findIndex - O(n) but necessary for validation, early exit on first invalid
  if (this.images && this.images.length > 0) {
    const invalidIndex = this.images.findIndex(image => !image.url || !image.publicId);
    if (invalidIndex !== -1) {
      return next(new Error(`Image ${invalidIndex + 1} missing url or publicId`));
    }
  }
  
  next();
});

export default mongoose.model("Comment", CommentSchema);
