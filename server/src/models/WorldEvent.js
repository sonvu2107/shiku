import mongoose from "mongoose";

/**
 * World Event Schema - Thiên Hạ Ký
 * Lưu các sự kiện đáng nhớ trong thiên hạ: độ kiếp, bí cảnh, PK vượt cấp...
 * TTL 24h để tự động dọn dẹp events cũ
 */

const WorldEventSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: [
            'breakthrough_success',    // Độ kiếp thành công
            'breakthrough_fail',       // Độ kiếp thất bại (cảnh giới cao)
            'dungeon_clear',          // Hoàn thành bí cảnh
            'pk_overkill',            // Vượt cấp thắng PK
            'rare_encounter',         // Kỳ ngộ hiếm
        ],
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    username: {
        type: String,
        required: true
    },
    realm: {
        type: String,
        default: ''
    },
    targetRealm: {
        type: String,
        default: ''
    },
    metadata: {
        dungeonName: { type: String },
        dungeonFloor: { type: Number },
        opponentName: { type: String },
        opponentRealm: { type: String },
        itemName: { type: String },
        description: { type: String }
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// TTL Index - tự động xóa sau 24h
WorldEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

// Compound index for efficient queries
WorldEventSchema.index({ createdAt: -1, type: 1 });

// Static method: Log event mới
WorldEventSchema.statics.logEvent = async function (type, userId, username, data = {}) {
    try {
        const event = await this.create({
            type,
            userId,
            username,
            realm: data.realm || '',
            targetRealm: data.targetRealm || '',
            metadata: data.metadata || {}
        });
        console.log(`[WorldEvent] Logged: ${type} - ${username} - ${data.targetRealm || data.realm || ''}`);
        return event;
    } catch (error) {
        console.error('[WorldEvent] Error logging event:', error.message);
        return null;
    }
};

// Static method: Lấy events trong ngày
WorldEventSchema.statics.getTodayEvents = async function (limit = 20) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    return this.find({
        createdAt: { $gte: startOfDay }
    })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};

const WorldEvent = mongoose.model('WorldEvent', WorldEventSchema);

export default WorldEvent;
