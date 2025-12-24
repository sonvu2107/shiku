/**
 * Ranked Bots Data
 * Bot opponents for Ranked Arena (Võ Đài Xếp Hạng)
 * Separated from Rank.js for better maintainability
 */

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
    { id: 'ranked_bot_7_1', tier: 7, name: 'Thiên Kiếp Chân Nhân', statMultiplier: 2.4, mmrChangeRate: 0.8 },
    { id: 'ranked_bot_7_2', tier: 7, name: 'Hỗn Độn Cổ Ma', statMultiplier: 2.4, mmrChangeRate: 0.8 },
    // Tier 8: Tiên/Ma Tôn
    { id: 'ranked_bot_8_1', tier: 8, name: 'Thượng Cổ Tiên Tôn', statMultiplier: 3.5, mmrChangeRate: 0.8, faction: 'tien' },
    { id: 'ranked_bot_8_2', tier: 8, name: 'Vô Cực Ma Đế', statMultiplier: 3.5, mmrChangeRate: 0.8, faction: 'ma' },
    // Tier 9: Truyền Thuyết
    { id: 'ranked_bot_9_1', tier: 9, name: 'Hồng Mông Tổ Sư', statMultiplier: 4, mmrChangeRate: 0.9 },
    { id: 'ranked_bot_9_2', tier: 9, name: 'Vạn Giới Chí Tôn', statMultiplier: 4, mmrChangeRate: 0.9 }
];

// ==================== LOOKUP HELPERS ====================

/**
 * Get bots by tier
 * @param {number} tier - Tier level (1-9)
 * @returns {Array} Bots matching the tier
 */
export const getBotsByTier = (tier) => {
    return RANKED_BOTS.filter(bot => bot.tier === tier);
};

/**
 * Get bot by ID
 * @param {string} botId - Bot ID
 * @returns {Object|null} Bot object or null
 */
export const getBotById = (botId) => {
    return RANKED_BOTS.find(bot => bot.id === botId) || null;
};

// Map for O(1) lookup
export const RANKED_BOTS_MAP = new Map(RANKED_BOTS.map(bot => [bot.id, bot]));

export default RANKED_BOTS;
