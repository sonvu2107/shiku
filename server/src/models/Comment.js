import mongoose from "mongoose";

/**
 * Comment Schema - Định nghĩa cấu trúc dữ liệu cho comments
 * Bao gồm nội dung, tác giả, emotes, likes và nested replies
 */
const CommentSchema = new mongoose.Schema({
  // ==================== THÔNG TIN CƠ BẢN ====================
  post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true, index: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true, trim: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null }, // Comment cha (cho nested replies)
  edited: { type: Boolean, default: false },
  
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

// Pre-save middleware để cập nhật counts
CommentSchema.pre('save', function(next) {
  this.likeCount = this.likes.length;
  this.emoteCount = this.emotes.length;
  next();
});

export default mongoose.model("Comment", CommentSchema);
