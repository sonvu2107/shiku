// models/Sect.js
import mongoose from "mongoose";

const BuildingSchema = new mongoose.Schema(
    {
        buildingId: { type: String, required: true },
        level: { type: Number, default: 1, min: 1 },
        builtAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const CurrentRaidSchema = new mongoose.Schema(
    {
        raidId: { type: String },
        weekKey: { type: String },
        raidCountThisWeek: { type: Number, default: 1 }, // Số lần triệu hồi trong tuần (để scale HP)
        healthMax: { type: Number, default: 0 },
        healthRemaining: { type: Number, default: 0 },
        totalDamage: { type: Number, default: 0 },
        startedAt: { type: Date },
        completedAt: { type: Date },
    },
    { _id: false }
);

const SectSchema = new mongoose.Schema(
    {
        // Basic info
        name: { type: String, required: true, trim: true, maxlength: 50 },
        description: { type: String, trim: true, maxlength: 500 },
        avatar: { type: String },
        banner: { type: String },

        // Owner (Môn Chủ)
        owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

        // Aggregates
        memberCount: { type: Number, default: 1, min: 0 },

        level: { type: Number, default: 1, min: 1, max: 5 },
        spiritEnergy: { type: Number, default: 0, min: 0 },
        totalEnergyEarned: { type: Number, default: 0, min: 0 },

        buildings: { type: [BuildingSchema], default: [] },
        currentRaid: { type: CurrentRaidSchema, default: null },

        // Lazy weekly role rotation key
        lastRoleRotationWeekKey: { type: String, default: null },

        settings: {
            isPublic: { type: Boolean, default: true },
            joinApproval: { type: String, enum: ["anyone", "approval"], default: "anyone" },
            minRealmLevel: { type: Number, default: 1 },
        },

        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

// Indexes
SectSchema.index({ name: "text", description: "text" });
SectSchema.index({ level: -1, spiritEnergy: -1 });
SectSchema.index({ isActive: 1, "settings.isPublic": 1 });

export default mongoose.model("Sect", SectSchema);
