/**
 * Cultivation Techniques Definitions
 * Công pháp tu luyện - giúp giảm click mỏi tay
 */

// ============================================================
// TECHNIQUE TYPES
// ============================================================

export const TECHNIQUE_TYPES = {
    EFFICIENCY: 'efficiency',   // Tăng % EXP/click
    SEMI_AUTO: 'semi_auto'      // Vận công tự động X giây
};

// ============================================================
// UNLOCK CONDITION TYPES
// ============================================================

export const UNLOCK_TYPES = {
    REALM: 'realm',       // Đạt cảnh giới X
    QUEST: 'quest',       // Hoàn thành quest
    DUNGEON: 'dungeon'    // Hoàn thành dungeon tầng X
};

// ============================================================
// TECHNIQUE DEFINITIONS
// ============================================================

export const CULTIVATION_TECHNIQUES = {
    // ==================== EFFICIENCY TECHNIQUES ====================
    tu_linh_quyet: {
        id: 'tu_linh_quyet',
        name: 'Tụ Linh Quyết',
        description: 'Vận chuyển chân khí, ngưng tụ linh lực thiên địa vào mỗi lần hấp thu, gia tăng hiệu suất tu luyện.',
        shortDesc: 'Mỗi lần hấp thu linh khí tăng 30% tu vi',
        type: TECHNIQUE_TYPES.EFFICIENCY,
        tier: 1,

        // Efficiency params
        bonusPercent: 30,           // +30% EXP/click
        cooldownBonusMs: 100,       // +100ms cooldown (tổng 300ms)

        // Unlock condition
        unlockCondition: {
            type: UNLOCK_TYPES.REALM,
            minLevel: 2               // Cảnh giới 2+
        },

        // Lore
        lore: 'Đây là pháp quyết căn bản mà mọi tu sĩ phải lĩnh ngộ. Khi linh khí thiên địa được dẫn nhập cơ thể, pháp quyết này giúp ngưng tụ và tinh luyện, không để thất tán một tơ hào nào.'
    },

    // ==================== SEMI-AUTO TECHNIQUES ====================
    tinh_tam_van_cong: {
        id: 'tinh_tam_van_cong',
        name: 'Tĩnh Tâm Vận Công',
        description: 'Nhập định thiền tọa, dẫn linh khí tự nhiên lưu chuyển trong kinh mạch, tích lũy tu vi không cần can thiệp.',
        shortDesc: 'Nhập định 30 giây, tự động tích lũy tu vi',
        type: TECHNIQUE_TYPES.SEMI_AUTO,
        tier: 2,

        // Semi-auto params
        durationSec: 30,            // 30 giây vận công
        techniqueMultiplier: 1.0,   // 1x passive exp

        // Unlock condition - Auto unlock cảnh giới 3 (onboarding mượt)
        unlockCondition: {
            type: UNLOCK_TYPES.REALM,
            minLevel: 3
        },

        lore: 'Tu tâm dưỡng tính, loại bỏ tạp niệm. Khi tâm hồn tĩnh lặng như mặt hồ không gợn sóng, linh khí thiên địa sẽ tự nhiên ngưng tụ vào đan điền mà không cần chủ động hấp thu.'
    },

    chu_thien_luan_chuyen: {
        id: 'chu_thien_luan_chuyen',
        name: 'Chu Thiên Luân Chuyển',
        description: 'Vận khí Đại Chu Thiên, linh lực xoay chuyển khắp 365 huyệt đạo, đột phá giới hạn thường nhật.',
        shortDesc: 'Đại Chu Thiên 60 giây, tu vi x1.2',
        type: TECHNIQUE_TYPES.SEMI_AUTO,
        tier: 3,

        // Semi-auto params
        durationSec: 60,            // 60 giây vận công
        techniqueMultiplier: 1.2,   // 1.2x passive exp

        // Unlock condition
        unlockCondition: {
            type: UNLOCK_TYPES.DUNGEON,
            minFloor: 3               // Hoàn thành dungeon tầng 3
        },

        lore: 'Khi đã thông suốt kinh mạch, tu sĩ có thể vận chuyển chân khí theo vòng Đại Chu Thiên - đi qua tất cả 365 huyệt đạo trong cơ thể. Hiệu quả tu luyện vượt xa phương pháp thường.'
    }
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Lấy technique by ID
 */
export function getTechniqueById(techniqueId) {
    return CULTIVATION_TECHNIQUES[techniqueId] || null;
}

/**
 * Lấy tất cả techniques theo type
 */
export function getTechniquesByType(type) {
    return Object.values(CULTIVATION_TECHNIQUES).filter(t => t.type === type);
}

/**
 * Kiểm tra user có đủ điều kiện unlock technique không
 * @param {Object} technique - Technique definition
 * @param {Object} cultivation - User cultivation doc
 * @param {Object} userProgress - Optional: { completedQuests, dungeonFloors }
 * @returns {{ canUnlock: boolean, reason?: string }}
 */
export function checkUnlockCondition(technique, cultivation, userProgress = {}) {
    const { unlockCondition } = technique;

    switch (unlockCondition.type) {
        case UNLOCK_TYPES.REALM:
            if (cultivation.realmLevel >= unlockCondition.minLevel) {
                return { canUnlock: true };
            }
            return {
                canUnlock: false,
                reason: `Cần đạt cảnh giới ${unlockCondition.minLevel}`
            };

        case UNLOCK_TYPES.QUEST:
            const completedQuests = userProgress.completedQuests || [];
            if (completedQuests.includes(unlockCondition.questId)) {
                return { canUnlock: true };
            }
            return {
                canUnlock: false,
                reason: `Cần hoàn thành nhiệm vụ đặc biệt`
            };

        case UNLOCK_TYPES.DUNGEON:
            const maxFloor = userProgress.maxDungeonFloor || 0;
            if (maxFloor >= unlockCondition.minFloor) {
                return { canUnlock: true };
            }
            return {
                canUnlock: false,
                reason: `Cần vượt qua bí cảnh tầng ${unlockCondition.minFloor}`
            };

        default:
            return { canUnlock: false, reason: 'Điều kiện không xác định' };
    }
}

/**
 * Lấy danh sách techniques có thể unlock
 */
export function getAvailableTechniques(cultivation, userProgress = {}) {
    const techniques = Object.values(CULTIVATION_TECHNIQUES);
    const learnedIds = (cultivation.learnedTechniques || []).map(t => t.techniqueId);

    return techniques.map(technique => {
        const learned = learnedIds.includes(technique.id);
        const { canUnlock, reason } = checkUnlockCondition(technique, cultivation, userProgress);

        return {
            ...technique,
            learned,
            canUnlock: learned || canUnlock,
            unlockReason: learned ? null : reason
        };
    });
}

export default {
    CULTIVATION_TECHNIQUES,
    TECHNIQUE_TYPES,
    UNLOCK_TYPES,
    getTechniqueById,
    getTechniquesByType,
    checkUnlockCondition,
    getAvailableTechniques
};
