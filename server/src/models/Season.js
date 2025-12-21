import mongoose from 'mongoose';
const Schema = mongoose.Schema;

/**
 * Season Rewards Configuration
 */
export const SEASON_REWARDS = [
    { tier: 1, tierName: 'Phàm Giả', spiritStones: 50, exp: 200, title: null },
    { tier: 2, tierName: 'Tu Sĩ', spiritStones: 100, exp: 500, title: null },
    { tier: 3, tierName: 'Tinh Anh', spiritStones: 200, exp: 1000, title: null },
    { tier: 4, tierName: 'Thiên Kiêu', spiritStones: 400, exp: 2000, title: 'Thiên Kiêu Đấu Sĩ' },
    { tier: 5, tierName: 'Vương Giả', spiritStones: 800, exp: 4000, title: 'Vương Giả Chiến Thần' },
    { tier: 6, tierName: 'Bá Chủ', spiritStones: 1500, exp: 7000, title: 'Bá Chủ Vô Địch' },
    { tier: 7, tierName: 'Chí Tôn', spiritStones: 3000, exp: 12000, title: 'Chí Tôn Đại Đế' },
    { tier: 8, tierName: 'Tiên Tôn', spiritStones: 5000, exp: 18000, title: 'Tiên Tôn Giáng Thế', avatarFrame: 'frame_tienton' },
    { tier: 8, tierName: 'Ma Tôn', spiritStones: 5000, exp: 18000, title: 'Ma Tôn Quật Khởi', avatarFrame: 'frame_maton', faction: 'ma' },
    { tier: 9, tierName: 'Truyền Thuyết', spiritStones: 10000, exp: 30000, title: 'Huyền Thoại Bất Diệt', avatarFrame: 'frame_truyenthuyet', pet: 'pet_legendary' }
];

/**
 * Season Schema - Quản lý mùa giải
 */
const SeasonSchema = new Schema({
    seasonNumber: {
        type: Number,
        required: true,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: true
    }, // "Mùa 1: Long Hổ Tranh Đấu"

    // Timing
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: false },

    // Stats
    totalParticipants: { type: Number, default: 0 },
    totalMatches: { type: Number, default: 0 },

    // Rewards claimed tracking
    rewardsClaimed: [{
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        tier: Number,
        claimedAt: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true
});

// Indexes
SeasonSchema.index({ isActive: 1 });
SeasonSchema.index({ startDate: 1, endDate: 1 });

/**
 * Get current active season
 */
SeasonSchema.statics.getCurrentSeason = async function () {
    let season = await this.findOne({ isActive: true });

    // If no active season, check if we need to create one
    if (!season) {
        const now = new Date();

        // Find any season that should be active
        season = await this.findOne({
            startDate: { $lte: now },
            endDate: { $gte: now }
        });

        if (season && !season.isActive) {
            season.isActive = true;
            await season.save();
        }
    }

    return season;
};

/**
 * Get rewards for a tier
 */
SeasonSchema.statics.getRewardsForTier = function (tier, faction = 'none') {
    // Handle faction-specific rewards for tier 8
    if (tier === 8 && faction === 'ma') {
        return SEASON_REWARDS.find(r => r.tier === 8 && r.faction === 'ma');
    }
    return SEASON_REWARDS.find(r => r.tier === tier && !r.faction);
};

/**
 * Check if user has claimed rewards
 */
SeasonSchema.methods.hasClaimedRewards = function (userId) {
    return this.rewardsClaimed.some(r => r.userId.toString() === userId.toString());
};

/**
 * Mark rewards as claimed
 */
SeasonSchema.methods.claimRewards = function (userId, tier) {
    if (!this.hasClaimedRewards(userId)) {
        this.rewardsClaimed.push({
            userId,
            tier,
            claimedAt: new Date()
        });
    }
};

/**
 * Get days remaining in season
 */
SeasonSchema.methods.getDaysRemaining = function () {
    const now = new Date();
    const diff = this.endDate - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

/**
 * Create first season if none exists
 */
SeasonSchema.statics.ensureSeasonExists = async function () {
    const count = await this.countDocuments();
    if (count === 0) {
        const now = new Date();
        const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

        const season = new this({
            seasonNumber: 1,
            name: 'Mùa 1: Long Hổ Tranh Đấu',
            startDate: now,
            endDate,
            isActive: true
        });

        await season.save();
        return season;
    }
    return null;
};

const Season = mongoose.model('Season', SeasonSchema);
export default Season;
