/**
 * Tier Configuration - Server Source of Truth
 * Định nghĩa 4 tầng trong mỗi cảnh giới: Sơ Thành, Trung Thành, Đại Thành, Viên Mãn
 * Client sẽ fetch từ API, không duplicate config
 */

// ==================== TIER DEFINITIONS ====================

export const TIER_CONFIG = {
    SO_THANH: {
        range: [1, 3],
        name: 'Sơ Thành',
        color: '#94A3B8',
        description: 'Mới bước vào cảnh giới, nền tảng chưa vững',
        privileges: {
            canNghichThien: false,
            critBonusVsHigher: 0,
            damageReductionVsHigher: 0,  // Không giảm damage nhận
            rewardMultiplier: 1.0
        }
    },
    TRUNG_THANH: {
        range: [4, 6],
        name: 'Trung Thành',
        color: '#3B82F6',
        description: 'Đã có căn cơ, có thể liều lĩnh',
        privileges: {
            canNghichThien: false,
            critBonusVsHigher: 15,        // +15% crit khi đánh cao hơn (dù không được nghịch thiên)
            damageReductionVsHigher: 0,
            rewardMultiplier: 1.1         // +10% reward
        }
    },
    DAI_THANH: {
        range: [7, 9],
        name: 'Đại Thành',
        color: '#8B5CF6',
        description: 'Căn cơ thâm hậu, có thể nghịch thiên',
        privileges: {
            canNghichThien: true,         // Được đánh +1 cảnh giới
            critBonusVsHigher: 25,        // +25% crit
            damageReductionVsHigher: 0.30, // Giảm 30% incoming damage từ địch cao hơn
            rewardMultiplier: 1.2,
            debuffOnLose: { type: 'trong_thuong', duration: 3 }  // 3 trận
        }
    },
    VIEN_MAN: {
        range: [10, 10],
        name: 'Viên Mãn',
        color: '#FFD700',
        description: 'Đỉnh cao cảnh giới, sẵn sàng đột phá',
        privileges: {
            canNghichThien: true,
            critBonusVsHigher: 35,         // +35% crit
            damageReductionVsHigher: 0.40, // Giảm 40% incoming damage
            rewardMultiplier: 1.5,         // +50% reward
            breakthroughBonus: 10,         // +10% tỷ lệ đột phá thành công
            debuffOnLose: { type: 'trong_thuong', duration: 2 }  // 2 trận (ít hơn vì đã mạnh)
        }
    }
};

// ==================== DEBUFF DEFINITIONS ====================

export const DEBUFF_TYPES = {
    trong_thuong: {
        id: 'trong_thuong',
        name: 'Trọng Thương',
        description: 'Bị thương nặng sau trận nghịch thiên thất bại',
        icon: '💔',
        effects: {
            attackMod: -0.20  // -20% attack
        },
        maxStack: 1  // Không stack, chỉ reset duration
    }
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Lấy tier info từ subLevel
 * @param {number} subLevel - SubLevel của người chơi (1-10)
 * @returns {Object} Tier info với key và privileges
 */
export function getTierBySubLevel(subLevel) {
    const level = subLevel || 1;
    for (const [key, tier] of Object.entries(TIER_CONFIG)) {
        if (level >= tier.range[0] && level <= tier.range[1]) {
            return { key, ...tier };
        }
    }
    return { key: 'SO_THANH', ...TIER_CONFIG.SO_THANH };
}

/**
 * Lấy debuff definition
 * @param {string} debuffType - Loại debuff
 * @returns {Object|null} Debuff definition
 */
export function getDebuffDefinition(debuffType) {
    return DEBUFF_TYPES[debuffType] || null;
}

/**
 * Áp dụng debuff effects vào combat stats
 * Clamp để không âm
 * @param {Object} stats - Combat stats gốc
 * @param {Array} activeDebuffs - Danh sách debuffs đang active
 * @returns {Object} Stats đã bị modify
 */
export function applyDebuffEffects(stats, activeDebuffs) {
    if (!activeDebuffs || activeDebuffs.length === 0) return stats;

    const modified = { ...stats };

    for (const debuff of activeDebuffs) {
        const definition = DEBUFF_TYPES[debuff.type];
        if (!definition || !definition.effects) continue;

        // Apply attack modifier
        if (definition.effects.attackMod) {
            modified.attack = Math.max(1, Math.floor(modified.attack * (1 + definition.effects.attackMod)));
        }

        // Apply defense modifier (if exists)
        if (definition.effects.defenseMod) {
            modified.defense = Math.max(0, Math.floor(modified.defense * (1 + definition.effects.defenseMod)));
        }

        // Apply HP modifier (if exists)
        if (definition.effects.hpMod) {
            modified.qiBlood = Math.max(1, Math.floor(modified.qiBlood * (1 + definition.effects.hpMod)));
        }
    }

    return modified;
}

/**
 * Client display config (stripped privileges - chỉ giữ thông tin cần hiển thị)
 * @returns {Array} Array of tier display info
 */
export function getDisplayConfig() {
    return Object.entries(TIER_CONFIG).map(([key, tier]) => ({
        key,
        name: tier.name,
        color: tier.color,
        range: tier.range,
        description: tier.description,
        canNghichThien: tier.privileges.canNghichThien
    }));
}

export default {
    TIER_CONFIG,
    DEBUFF_TYPES,
    getTierBySubLevel,
    getDebuffDefinition,
    applyDebuffEffects,
    getDisplayConfig
};
