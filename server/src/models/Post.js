import mongoose from "mongoose";
import slugify from "slugify";

const EmoteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, required: true } // Ví dụ: 👍, ❤️, 😂, 😮, 😢, 😡
}, { _id: false });


const PostSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, index: true },
  content: { type: String, required: true },
  coverUrl: { type: String, default: "" },
  files: [
    {
      url: { type: String, required: true },
      type: { type: String, enum: ["image", "video"], required: true }
    }
  ],
  tags: [{ type: String, index: true }],
  status: { type: String, enum: ["private", "published"], default: "published" },
  emotes: [EmoteSchema],
  views: { type: Number, default: 0 },
  isEdited: { type: Boolean, default: false }
}, { timestamps: true });

// Đánh dấu bài đã chỉnh sửa nếu không phải là bài mới
PostSchema.pre("save", function(next) {
  if (!this.isNew) {
    this.isEdited = true;
  }
  next();
});

PostSchema.pre("validate", function(next) {
  if (!this.slug && this.title) {
    this.slug = slugify(this.title, { lower: true, strict: true }) + "-" + this._id.toString().slice(-6);
  }
  next();
});

export default mongoose.model("Post", PostSchema);
