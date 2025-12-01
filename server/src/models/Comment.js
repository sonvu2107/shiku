import mongoose from "mongoose";

/**
 * Comment Schema
 * Định nghĩa cấu trúc lưu trữ cho bình luận (comment)
 * Bao gồm: nội dung, tác giả, media, emotes/likes và reply lồng nhau
 */
const CommentSchema = new mongoose.Schema({
  // ==================== THÔNG TIN CƠ BẢN ====================
  post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true, index: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: false, trim: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null }, // Comment cha (cho reply lồng nhau)
  edited: { type: Boolean, default: false },
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }], // Người dùng được mention trong comment

  // ==================== HÌNH ẢNH / VIDEO ====================
  images: [{
    url: { type: String, required: false },
    publicId: { type: String, required: false },
    width: { type: Number },
    height: { type: Number },
    alt: { type: String, default: "" }
  }],

  // ==================== CẢM XÚC (EMOTES) VÀ LIKE ====================
  emotes: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, required: true }, // ví dụ: "like", "love", "laugh", "angry"
    createdAt: { type: Date, default: Date.now }
  }],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Danh sách user đã like

  // ==================== THỐNG KÊ ====================
  likeCount: { type: Number, default: 0 }, // Số lượng likes
  emoteCount: { type: Number, default: 0 }, // Tổng số emotes
}, { timestamps: true });

// ==================== INDEX CƠ SỞ DỮ LIỆU ====================
// Các index phục vụ truy vấn phổ biến (theo bài viết, tác giả, reply, emote, like)
CommentSchema.index({ post: 1, createdAt: -1 });
CommentSchema.index({ author: 1, createdAt: -1 });
CommentSchema.index({ parent: 1 });
CommentSchema.index({ 'emotes.user': 1 });
CommentSchema.index({ likes: 1 });
CommentSchema.index({ post: 1, parent: 1, createdAt: -1 });

// Middleware trước khi lưu: cập nhật số lượng và kiểm tra tính hợp lệ
CommentSchema.pre('save', function(next) {
  // Cập nhật thống kê
  this.likeCount = this.likes.length;
  this.emoteCount = this.emotes.length;

  // Validation: phải có nội dung hoặc ít nhất một ảnh
  if ((!this.content || this.content.trim() === "") && (!this.images || this.images.length === 0)) {
    return next(new Error('Bình luận phải có nội dung hoặc ít nhất một ảnh'));
  }

  // Nếu có ảnh, đảm bảo mỗi ảnh có `url` và `publicId`
  if (this.images && this.images.length > 0) {
    const invalidIndex = this.images.findIndex(image => !image.url || !image.publicId);
    if (invalidIndex !== -1) {
      return next(new Error(`Ảnh ${invalidIndex + 1} thiếu url hoặc publicId`));
    }
  }

  next();
});

export default mongoose.model("Comment", CommentSchema);
