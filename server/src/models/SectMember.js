// models/SectMember.js
import mongoose from "mongoose";

const SectMemberSchema = new mongoose.Schema(
    {
        sect: { type: mongoose.Schema.Types.ObjectId, ref: "Sect", required: true, index: true },
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        role: {
            type: String,
            enum: ["owner", "elder", "protector", "disciple"],
            default: "disciple",
            index: true,
        },
        status: {
            type: String,
            enum: ["active", "pending", "rejected"],
            default: "active",
            index: true,
        },
        joinedAt: { type: Date, default: Date.now },
        isActive: { type: Boolean, default: true, index: true },
    },
    { timestamps: true }
);

// A user can have only ONE active membership across all sects
SectMemberSchema.index(
    { user: 1 },
    { unique: true, partialFilterExpression: { isActive: true } }
);

// Also prevent duplicates within same sect
SectMemberSchema.index({ sect: 1, user: 1 }, { unique: true });

SectMemberSchema.index({ sect: 1, role: 1, isActive: 1 });

export default mongoose.model("SectMember", SectMemberSchema);
