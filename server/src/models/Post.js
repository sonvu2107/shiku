import mongoose from "mongoose";
import slugify from "slugify";

/**
 * Emote Schema - Định nghĩa cấu trúc cho reactions/emotes trên posts
 * Mỗi emote bao gồm user và loại emote
 */
const EmoteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // User thực hiện emote
  type: { type: String, required: true } // Loại emote: 👍, ❤️, 😂, 😮, 😢, 😡
}, { _id: false }); // Không tạo _id riêng cho emote

/**
 * Post Schema - Định nghĩa cấu trúc dữ liệu cho blog posts
 * Bao gồm nội dung, media files, tags, emotes và tracking
 */
const PostSchema = new mongoose.Schema({
  // ==================== THÔNG TIN CƠ BẢN ====================
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Tác giả
  title: { type: String, required: true, trim: true }, // Tiêu đề
  slug: { type: String, required: true, unique: true, index: true }, // URL slug (unique)
  content: { type: String, default: "" }, // Nội dung bài viết
  
  // ==================== MEDIA ====================
  coverUrl: { type: String, default: "" }, // Ảnh cover/thumbnail
  files: [
    {
      url: { type: String, required: true }, // URL của file
      type: { type: String, enum: ["image", "video"], required: true } // Loại file
    }
  ],
  
  // ==================== METADATA ====================
  tags: [{ type: String, index: true }], // Tags để phân loại (có index để search nhanh)
  status: { type: String, enum: ["private", "published"], default: "published" }, // Trạng thái bài viết
  group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", default: null }, // Nhóm (nếu bài viết thuộc nhóm)
  
  // ==================== INTERACTIONS ====================
  emotes: [EmoteSchema], // Danh sách emotes/reactions
  views: { type: Number, default: 0 }, // Số lượt xem

  // ==================== POLL ====================
  hasPoll: { type: Boolean, default: false }, // Có chứa poll không
  
  // ==================== TRACKING ====================
  isEdited: { type: Boolean, default: false } // Đánh dấu bài đã chỉnh sửa
}, { 
  timestamps: true // Tự động thêm createdAt và updatedAt
});

// ==================== DATABASE INDEXES ====================

// Compound indexes for common queries
PostSchema.index({ author: 1, status: 1, createdAt: -1 }); // User posts by status
PostSchema.index({ group: 1, status: 1, createdAt: -1 }); // Group posts by status
PostSchema.index({ status: 1, createdAt: -1 }); // All posts by status
PostSchema.index({ tags: 1, status: 1 }); // Posts by tags
PostSchema.index({ title: "text", content: "text" }); // Text search
PostSchema.index({ views: -1, status: 1 }); // Popular posts
PostSchema.index({ createdAt: -1, status: 1 }); // Recent posts

// ==================== MIDDLEWARE/HOOKS ====================

/**
 * Pre-save hook: Đánh dấu bài đã chỉnh sửa nếu không phải là bài mới
 */
PostSchema.pre("save", function(next) {
  if (!this.isNew) {
    this.isEdited = true; // Đánh dấu đã edit nếu không phải bài mới
  }
  next();
});

/**
 * Pre-validate hook: Tự động tạo slug từ title nếu chưa có
 */
PostSchema.pre("validate", function(next) {
  if (!this.slug && this.title) {
    // Tạo slug từ title + 6 ký tự cuối của _id để đảm bảo unique
    this.slug = slugify(this.title, { lower: true, strict: true }) + "-" + this._id.toString().slice(-6);
  }
  next();
});

export default mongoose.model("Post", PostSchema);
