import mongoose from "mongoose";

const SearchHistorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
  query: { type: String, required: true, trim: true },
  count: { type: Number, default: 1 },
  lastSearchedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Mỗi user + query là duy nhất để dễ upsert
SearchHistorySchema.index({ user: 1, query: 1 }, { unique: true });

export default mongoose.model("SearchHistory", SearchHistorySchema);


