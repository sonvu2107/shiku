import mongoose from "mongoose";
import slugify from "slugify";

/**
 * Emote Schema
 * Cấu trúc cho các reaction (emote) trên bài viết: user + loại emote
 */
const EmoteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // User thực hiện emote
  type: { type: String, required: true } // Loại emote: 👍, ❤️, 😂, 😮, 😢, 😡
}, { _id: false }); // Không tạo _id riêng cho emote

/**
 * Post Schema
 * Lưu thông tin bài viết: tác giả, tiêu đề, nội dung, media, tags, emotes và thống kê
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

  // ==================== YOUTUBE MUSIC ====================
  youtubeUrl: { type: String, default: "" }, // YouTube URL for music/video embed

  // ==================== METADATA ====================
  tags: [{ type: String, index: true }], // Tags để phân loại (có index để search nhanh)
  status: { type: String, enum: ["private", "published"], default: "published" }, // Trạng thái bài viết
  group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", default: null }, // Nhóm (nếu bài viết thuộc nhóm)
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }], // Users được mention trong bài viết

  // ==================== INTERACTIONS (TƯƠNG TÁC) ====================
  // NEW: Upvote system (replaces emotes for ranking)
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index: true
  }], // Users đã upvote
  upvoteCount: { type: Number, default: 0, index: true }, // Số upvotes (denormalized)

  // Legacy emotes (read-only, kept for migration)
  emotes: [EmoteSchema], // Danh sách emotes/reactions (legacy)

  // Ranking score (cached, recalculated periodically)
  rankingScore: { type: Number, default: 0, index: true }, // Score cho HOT feed
  lastRankingUpdate: { type: Date, default: Date.now }, // Lần cuối tính score

  views: { type: Number, default: 0 }, // Số lượt xem
  commentCount: { type: Number, default: 0 }, // Số lượng bình luận (denormalized)
  latestCommentAt: { type: Date, default: null, index: true }, // Thời điểm comment mới nhất (cho ranking boost)
  savedCount: { type: Number, default: 0 }, // Số lượng người đã lưu (denormalized)

  // ==================== POLL (TÙY CHỌN) ====================
  hasPoll: { type: Boolean, default: false }, // Có chứa poll không

  // ==================== TRACKING ====================
  isEdited: { type: Boolean, default: false }, // Đánh dấu bài đã chỉnh sửa

  // ==================== PINNING (ADMIN) ====================
  isPinned: { type: Boolean, default: false, index: true }, // Bài viết ghim lên đầu feed?
  pinnedAt: { type: Date, default: null }, // Thời điểm ghim
  pinnedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null } // Admin đã ghim
}, {
  timestamps: true // Tự động thêm createdAt và updatedAt
});

// ==================== INDEX CƠ SỞ DỮ LIỆU ====================
// Indexes phục vụ các truy vấn phổ biến: theo tác giả, trạng thái, nhóm, tags và tìm kiếm text
PostSchema.index({ author: 1, status: 1, createdAt: -1 });
PostSchema.index({ group: 1, status: 1, createdAt: -1 });
PostSchema.index({ status: 1, createdAt: -1 });
PostSchema.index({ tags: 1, status: 1 });
PostSchema.index({ title: "text", content: "text" });
PostSchema.index({ views: -1, status: 1 });
PostSchema.index({ createdAt: -1, status: 1 });

// OPTIMIZATION: Compound index for homepage feed query (group=null, status=published, sorted by createdAt)
// This is the most common query pattern
PostSchema.index({ status: 1, group: 1, createdAt: -1 });

// Các index bổ sung
PostSchema.index({ status: 1 });
PostSchema.index({ author: 1, createdAt: -1 });

// NEW: Indexes for upvote system and ranking
PostSchema.index({ upvoteCount: -1, createdAt: -1 }); // Sort by upvotes
PostSchema.index({ rankingScore: -1, status: 1 }); // HOT feed
PostSchema.index({ 'upvotes': 1 }); // Check if user upvoted

// NEW: Compound index for friends feed query (covers author $in + status + group + sort)
PostSchema.index({ author: 1, status: 1, group: 1, createdAt: -1 });

// NEW: Index for pinned posts
PostSchema.index({ isPinned: -1, pinnedAt: -1, status: 1 }); // Pinned posts first

// ==================== MIDDLEWARE/HOOKS ====================

/**
 * Pre-save hook: nếu không phải bài mới, đánh dấu là đã chỉnh sửa
 */
PostSchema.pre("save", function (next) {
  if (!this.isNew) {
    this.isEdited = true; // Đánh dấu đã edit nếu không phải bài mới
  }
  next();
});

/**
 * Pre-validate hook: tạo `slug` tự động từ `title` nếu chưa có
 */
PostSchema.pre("validate", function (next) {
  if (!this.slug && this.title) {
    // Tạo slug từ title + 6 ký tự cuối của _id để đảm bảo unique
    this.slug = slugify(this.title, { lower: true, strict: true }) + "-" + this._id.toString().slice(-6);
  }
  next();
});

export default mongoose.model("Post", PostSchema);
