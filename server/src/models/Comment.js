import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema({
  post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true, index: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true, trim: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null }, 
  edited: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model("Comment", CommentSchema);
