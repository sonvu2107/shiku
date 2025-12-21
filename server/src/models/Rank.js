import mongoose from 'mongoose';
const Schema = mongoose.Schema;

/**
 * Rank Tiers Configuration
 * Cảnh giới xếp hạng trong Võ Đài
 */
export const RANK_TIERS = [
    { tier: 1, name: 'Phàm Giả', minMmr: 0, maxMmr: 799, color: '#9CA3AF', logo: '/assets/rank_area/phamgia.png', title: '/assets/rank_title/phamgia.jpg' },
    { tier: 2, name: 'Tu Sĩ', minMmr: 800, maxMmr: 1199, color: '#10B981', logo: '/assets/rank_area/tusi.png', title: '/assets/rank_title/tusi.jpg' },
    { tier: 3, name: 'Tinh Anh', minMmr: 1200, maxMmr: 1599, color: '#3B82F6', logo: '/assets/rank_area/tinhanh.png', title: '/assets/rank_title/tinhanh.jpg' },
    { tier: 4, name: 'Thiên Kiêu', minMmr: 1600, maxMmr: 1999, color: '#8B5CF6', logo: '/assets/rank_area/thienkieu.png', title: '/assets/rank_title/thienkieu.jpg' },
    { tier: 5, name: 'Vương Giả', minMmr: 2000, maxMmr: 2399, color: '#F59E0B', logo: '/assets/rank_area/vuonggia.png', title: '/assets/rank_title/vuonggia.jpg' },
    { tier: 6, name: 'Bá Chủ', minMmr: 2400, maxMmr: 2799, color: '#EF4444', logo: '/assets/rank_area/bachu.png', title: '/assets/rank_title/bachu.jpg' },
    { tier: 7, name: 'Chí Tôn', minMmr: 2800, maxMmr: 3199, color: '#EC4899', logo: '/assets/rank_area/chiton.png', title: '/assets/rank_title/chiton.jpg' },
    { tier: 8, name: 'Tiên Tôn', minMmr: 3200, maxMmr: 3999, color: '#FFD700', logo: '/assets/rank_area/tienton.png', title: '/assets/rank_title/tienton.jpg', faction: 'tien' },
    { tier: 8, name: 'Ma Tôn', minMmr: 3200, maxMmr: 3999, color: '#7C3AED', logo: '/assets/rank_area/maton.png', title: '/assets/rank_title/maton.jpg', faction: 'ma' },
    { tier: 9, name: 'Truyền Thuyết', minMmr: 4000, maxMmr: Infinity, color: '#FF00FF', logo: '/assets/rank_area/truyenthuyet.png', title: '/assets/rank_title/truyenthuyet.jpg' }
];

/**
 * Ranked Bots Configuration
 * Bot đối thủ khi không tìm được người chơi
 */
export const RANKED_BOTS = [
    // Tier 1: Phàm Giả
    { id: 'ranked_bot_1_1', tier: 1, name: 'Luyện Khí Sơ Nhân', statMultiplier: 0.8, mmrChangeRate: 0.5 },
    { id: 'ranked_bot_1_2', tier: 1, name: 'Vô Danh Tiểu Tốt', statMultiplier: 0.8, mmrChangeRate: 0.5 },
    // Tier 2: Tu Sĩ
    { id: 'ranked_bot_2_1', tier: 2, name: 'Phàm Trần Đạo Sĩ', statMultiplier: 0.9, mmrChangeRate: 0.5 },
    { id: 'ranked_bot_2_2', tier: 2, name: 'Thanh Vân Tiểu Đồng', statMultiplier: 0.9, mmrChangeRate: 0.5 },
    // Tier 3: Tinh Anh
    { id: 'ranked_bot_3_1', tier: 3, name: 'Hắc Phong Kiếm Khách', statMultiplier: 1.0, mmrChangeRate: 0.6 },
    { id: 'ranked_bot_3_2', tier: 3, name: 'Tử Vân Sứ Giả', statMultiplier: 1.0, mmrChangeRate: 0.6 },
    // Tier 4: Thiên Kiêu
    { id: 'ranked_bot_4_1', tier: 4, name: 'Lôi Điện Tông Chủ', statMultiplier: 1.1, mmrChangeRate: 0.6 },
    { id: 'ranked_bot_4_2', tier: 4, name: 'Huyết Nguyệt Ma Tăng', statMultiplier: 1.1, mmrChangeRate: 0.6 },
    // Tier 5: Vương Giả
    { id: 'ranked_bot_5_1', tier: 5, name: 'Thiên Cơ Đại Sư', statMultiplier: 1.2, mmrChangeRate: 0.7 },
    { id: 'ranked_bot_5_2', tier: 5, name: 'Bắc Minh Hải Vương', statMultiplier: 1.2, mmrChangeRate: 0.7 },
    // Tier 6: Bá Chủ
    { id: 'ranked_bot_6_1', tier: 6, name: 'Vạn Kiếm Tông Chủ', statMultiplier: 1.3, mmrChangeRate: 0.7 },
    { id: 'ranked_bot_6_2', tier: 6, name: 'Hắc Viêm Ma Chủ', statMultiplier: 1.3, mmrChangeRate: 0.7 },
    // Tier 7: Chí Tôn
    { id: 'ranked_bot_7_1', tier: 7, name: 'Thiên Kiếp Chân Nhân', statMultiplier: 1.4, mmrChangeRate: 0.8 },
    { id: 'ranked_bot_7_2', tier: 7, name: 'Hỗn Độn Cổ Ma', statMultiplier: 1.4, mmrChangeRate: 0.8 },
    // Tier 8: Tiên/Ma Tôn
    { id: 'ranked_bot_8_1', tier: 8, name: 'Thượng Cổ Tiên Tôn', statMultiplier: 1.5, mmrChangeRate: 0.8, faction: 'tien' },
    { id: 'ranked_bot_8_2', tier: 8, name: 'Vô Cực Ma Đế', statMultiplier: 1.5, mmrChangeRate: 0.8, faction: 'ma' },
    // Tier 9: Truyền Thuyết
    { id: 'ranked_bot_9_1', tier: 9, name: 'Hồng Mông Tổ Sư', statMultiplier: 1.6, mmrChangeRate: 0.9 },
    { id: 'ranked_bot_9_2', tier: 9, name: 'Vạn Giới Chí Tôn', statMultiplier: 1.6, mmrChangeRate: 0.9 }
];

/**
 * Recent Match Schema (embedded)
 */
const RecentMatchSchema = new Schema({
    matchId: { type: Schema.Types.ObjectId, ref: 'RankedMatch' },
    opponentId: { type: Schema.Types.ObjectId, ref: 'User' },
    opponentUsername: { type: String },
    opponentMmr: { type: Number },
    result: { type: String, enum: ['win', 'loss', 'draw'] },
    mmrChange: { type: Number },
    isBot: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
}, { _id: false });

/**
 * Rank Schema - Thông tin xếp hạng của người chơi
 */
const RankSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },

    // Current rank info
    mmr: { type: Number, default: 1000 },
    tier: { type: Number, default: 2 }, // 1-9
    tierName: { type: String, default: 'Tu Sĩ' },
    faction: { type: String, enum: ['none', 'tien', 'ma'], default: 'none' },

    // Placement matches (10 trận đầu)
    placementMatches: { type: Number, default: 0 },
    placementWins: { type: Number, default: 0 },
    isPlaced: { type: Boolean, default: false },

    // Season stats
    seasonWins: { type: Number, default: 0 },
    seasonLosses: { type: Number, default: 0 },
    seasonDraws: { type: Number, default: 0 },

    // Streak tracking
    winStreak: { type: Number, default: 0 },
    lossStreak: { type: Number, default: 0 },
    bestWinStreak: { type: Number, default: 0 },

    // Peak stats
    highestMmr: { type: Number, default: 1000 },
    highestTier: { type: Number, default: 2 },

    // Cooldown & Decay
    lastMatchAt: { type: Date },
    matchCooldownUntil: { type: Date },
    lastDecayCheck: { type: Date, default: Date.now },

    // Match history (last 20)
    recentMatches: {
        type: [RecentMatchSchema],
        default: [],
        validate: [arr => arr.length <= 20, 'Max 20 recent matches']
    },

    // Season info
    currentSeason: { type: Number, default: 1 }
}, {
    timestamps: true
});

// Indexes
RankSchema.index({ mmr: -1 });
RankSchema.index({ currentSeason: 1, mmr: -1 });
RankSchema.index({ tier: 1, mmr: -1 });

/**
 * Get tier info from MMR
 */
RankSchema.statics.getTierFromMmr = function (mmr, faction = 'none') {
    for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
        const tier = RANK_TIERS[i];
        if (mmr >= tier.minMmr) {
            // Handle faction split at tier 8
            if (tier.tier === 8 && faction !== 'none') {
                return RANK_TIERS.find(t => t.tier === 8 && t.faction === faction) || tier;
            }
            // Skip Ma Tôn if no faction (default to Tiên Tôn for unfactioned)
            if (tier.faction === 'ma' && faction !== 'ma') continue;
            return tier;
        }
    }
    return RANK_TIERS[0];
};

/**
 * Calculate loss protection based on loss streak
 * Returns multiplier (0.25 - 1.0)
 */
RankSchema.statics.getLossProtection = function (lossStreak) {
    if (lossStreak <= 2) return 1.0;
    if (lossStreak <= 4) return 0.75;
    if (lossStreak <= 6) return 0.50;
    return 0.25;
};

/**
 * Calculate MMR decay based on days inactive
 */
RankSchema.statics.calculateDecay = function (daysSinceLastMatch, currentMmr, tierFloor) {
    if (daysSinceLastMatch < 7) return 0;

    let decayPerDay = 0;
    if (daysSinceLastMatch <= 14) decayPerDay = 10;
    else if (daysSinceLastMatch <= 30) decayPerDay = 20;
    else decayPerDay = 30;

    const totalDecay = decayPerDay * (daysSinceLastMatch - 6);

    // Don't decay below tier floor
    const maxDecay = currentMmr - tierFloor;
    return Math.min(totalDecay, Math.max(0, maxDecay));
};

/**
 * Update tier based on current MMR
 */
RankSchema.methods.updateTier = function () {
    const tierInfo = this.constructor.getTierFromMmr(this.mmr, this.faction);
    this.tier = tierInfo.tier;
    this.tierName = tierInfo.name;

    // Track highest
    if (this.mmr > this.highestMmr) {
        this.highestMmr = this.mmr;
    }
    if (this.tier > this.highestTier) {
        this.highestTier = this.tier;
    }
};

/**
 * Add match result and update stats
 */
RankSchema.methods.addMatchResult = function (result, mmrChange, matchData) {
    // Update MMR
    this.mmr = Math.max(0, this.mmr + mmrChange);

    // Update streaks
    if (result === 'win') {
        this.seasonWins++;
        this.winStreak++;
        this.lossStreak = 0;
        if (this.winStreak > this.bestWinStreak) {
            this.bestWinStreak = this.winStreak;
        }
    } else if (result === 'loss') {
        this.seasonLosses++;
        this.lossStreak++;
        this.winStreak = 0;
    } else {
        this.seasonDraws++;
    }

    // Update placement
    if (!this.isPlaced) {
        this.placementMatches++;
        if (result === 'win') this.placementWins++;
        if (this.placementMatches >= 10) {
            this.isPlaced = true;
        }
    }

    // Update tier
    this.updateTier();

    // Add to recent matches
    this.recentMatches.unshift({
        matchId: matchData.matchId,
        opponentId: matchData.opponentId,
        opponentUsername: matchData.opponentUsername,
        opponentMmr: matchData.opponentMmr,
        result,
        mmrChange,
        isBot: matchData.isBot || false,
        timestamp: new Date()
    });

    // Keep only last 20
    if (this.recentMatches.length > 20) {
        this.recentMatches = this.recentMatches.slice(0, 20);
    }

    // Update timestamps
    this.lastMatchAt = new Date();
    // No cooldown - players can immediately queue for next match
};

/**
 * Check and apply decay
 */
RankSchema.methods.checkAndApplyDecay = function () {
    if (!this.lastMatchAt) return 0;

    const daysSinceLastMatch = Math.floor((Date.now() - this.lastMatchAt) / (1000 * 60 * 60 * 24));
    const tierInfo = this.constructor.getTierFromMmr(this.mmr, this.faction);
    const tierFloor = tierInfo.minMmr;

    const decay = this.constructor.calculateDecay(daysSinceLastMatch, this.mmr, tierFloor);

    if (decay > 0) {
        this.mmr -= decay;
        this.updateTier();
        this.lastDecayCheck = new Date();
    }

    return decay;
};

/**
 * Get or create rank for user
 */
RankSchema.statics.getOrCreate = async function (userId) {
    let rank = await this.findOne({ user: userId });
    if (!rank) {
        rank = new this({ user: userId });
        await rank.save();
    }
    return rank;
};

const Rank = mongoose.model('Rank', RankSchema);
export default Rank;
