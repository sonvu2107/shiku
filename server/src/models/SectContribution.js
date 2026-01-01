// models/SectContribution.js
import mongoose from "mongoose";

const SectContributionSchema = new mongoose.Schema(
    {
        sect: { type: mongoose.Schema.Types.ObjectId, ref: "Sect", required: true, index: true },
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

        totalEnergy: { type: Number, default: 0, min: 0 },

        weekly: {
            weekKey: { type: String, default: null, index: true },
            energy: { type: Number, default: 0, min: 0 },
        },
    },
    { timestamps: true }
);

SectContributionSchema.index({ sect: 1, user: 1 }, { unique: true });
SectContributionSchema.index({ sect: 1, "weekly.weekKey": 1, "weekly.energy": -1 });

export default mongoose.model("SectContribution", SectContributionSchema);
