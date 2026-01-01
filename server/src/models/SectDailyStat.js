// models/SectDailyStat.js
import mongoose from "mongoose";

const SectDailyStatSchema = new mongoose.Schema(
    {
        sect: { type: mongoose.Schema.Types.ObjectId, ref: "Sect", required: true, index: true },
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        dateKey: { type: String, required: true, index: true }, // YYYY-MM-DD UTC

        posts: { type: Number, default: 0, min: 0 },
        comments: { type: Number, default: 0, min: 0 },
        upvotesReceived: { type: Number, default: 0, min: 0 },

        // Checkin flag
        checkinDone: { type: Boolean, default: false },

        // Minimal anti-spam without Redis
        lastCommentHash: { type: String, default: null },
        lastCommentAt: { type: Date, default: null },
    },
    { timestamps: true }
);

SectDailyStatSchema.index({ sect: 1, user: 1, dateKey: 1 }, { unique: true });

export default mongoose.model("SectDailyStat", SectDailyStatSchema);
