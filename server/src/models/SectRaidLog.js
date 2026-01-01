// models/SectRaidLog.js
import mongoose from "mongoose";

const SectRaidLogSchema = new mongoose.Schema(
    {
        sect: { type: mongoose.Schema.Types.ObjectId, ref: "Sect", required: true, index: true },
        weekKey: { type: String, required: true, index: true },
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        damage: { type: Number, default: 0, min: 0 },

        // Cooldown tracking per attack type
        lastBasicAt: { type: Date, default: null },
        lastArtifactAt: { type: Date, default: null },
        lastUltimateAt: { type: Date, default: null },

        // Reward tracking
        rewardClaimed: { type: Boolean, default: false },
        expRewarded: { type: Number, default: 0 },
        stonesRewarded: { type: Number, default: 0 },
    },
    { timestamps: true }
);

SectRaidLogSchema.index({ sect: 1, weekKey: 1, user: 1 }, { unique: true });
SectRaidLogSchema.index({ sect: 1, weekKey: 1, damage: -1 });

export default mongoose.model("SectRaidLog", SectRaidLogSchema);
