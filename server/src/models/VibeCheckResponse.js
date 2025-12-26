/**
 * VibeCheckResponse Model
 * 
 * Schema cho user response - mỗi user chỉ vote 1 lần/ngày
 */

import mongoose from "mongoose";

const vibeCheckResponseSchema = new mongoose.Schema({
    // User đã vote
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    // Vibe check đã vote
    vibeCheck: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "VibeCheck",
        required: true
    },
    // Option đã chọn
    optionId: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// Compound index: 1 user chỉ vote 1 lần cho 1 vibe check
vibeCheckResponseSchema.index({ user: 1, vibeCheck: 1 }, { unique: true });

// Index cho query theo user
vibeCheckResponseSchema.index({ user: 1, createdAt: -1 });

const VibeCheckResponse = mongoose.model("VibeCheckResponse", vibeCheckResponseSchema);

export default VibeCheckResponse;
