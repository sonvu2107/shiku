/**
 * Craft Service - Crafting RNG Logic
 * Handles equipment creation from materials with probability-based outcomes
 */

import { MATERIAL_RARITY, MATERIAL_ELEMENTS } from '../models/Material.js';
import { rollModifiers } from './modifierService.js';

// ==================== RARITY CONFIG ====================
const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

// Crafting result probabilities based on highest input rarity
export const CRAFT_RESULT_PROBABILITIES = {
    // All common materials
    common: {
        common: 90,
        uncommon: 10,
        rare: 0,
        epic: 0,
        legendary: 0,
        mythic: 0
    },
    // Has at least 1 uncommon
    uncommon: {
        common: 10,
        uncommon: 60,
        rare: 30,
        epic: 0,
        legendary: 0,
        mythic: 0
    },
    // Has at least 1 rare
    rare: {
        common: 0,
        uncommon: 30,
        rare: 60,
        epic: 10,
        legendary: 0,
        mythic: 0
    },
    // Has at least 1 epic
    epic: {
        common: 0,
        uncommon: 0,
        rare: 40,
        epic: 50,
        legendary: 10,
        mythic: 0
    },
    // Has at least 1 legendary
    legendary: {
        common: 0,
        uncommon: 0,
        rare: 0,
        epic: 50,
        legendary: 48,
        mythic: 2 // Only 2% mythic with 1 legendary
    },
    // Has at least 2 legendary OR 1 mythic material
    mythic: {
        common: 0,
        uncommon: 0,
        rare: 0,
        epic: 30,
        legendary: 60,
        mythic: 10 // 10% mythic only with 2+ legendary or 1 mythic
    }
};

// ==================== EQUIPMENT TYPES & SUBTYPES ====================
export const CRAFTABLE_EQUIPMENT_TYPES = [
    // ===== WEAPONS =====
    { type: 'weapon', subtype: 'sword', name: 'Kiếm', slot: 'weapon', description: 'Cân bằng công thủ' },
    { type: 'weapon', subtype: 'saber', name: 'Đao', slot: 'weapon', description: 'Sát thương cao, chậm' },
    { type: 'weapon', subtype: 'spear', name: 'Thương', slot: 'weapon', description: 'Xuyên giáp tốt' },
    { type: 'weapon', subtype: 'bow', name: 'Cung', slot: 'weapon', description: 'Né cao, crit tốt' },
    { type: 'weapon', subtype: 'fan', name: 'Quạt', slot: 'weapon', description: 'Hỗ trợ pháp thuật' },
    { type: 'weapon', subtype: 'flute', name: 'Tiêu', slot: 'weapon', description: 'Điều khiển, debuff' },
    { type: 'weapon', subtype: 'flying_sword', name: 'Linh Kiếm', slot: 'weapon', description: 'Phi kiếm, nguyên khí' },

    // ===== ARMORS =====
    { type: 'armor', subtype: 'helmet', name: 'Mũ', slot: 'helmet', description: 'Bảo vệ đầu' },
    { type: 'armor', subtype: 'chest', name: 'Giáp Ngực', slot: 'chest', description: 'Phòng ngự chính' },
    { type: 'armor', subtype: 'shoulder', name: 'Vai Giáp', slot: 'shoulder', description: 'Kháng đòn đánh' },
    { type: 'armor', subtype: 'gloves', name: 'Hộ Thủ', slot: 'gloves', description: 'Tốc đánh, chính xác' },
    { type: 'armor', subtype: 'boots', name: 'Hộ Cước', slot: 'boots', description: 'Tốc độ, né tránh' },
    { type: 'armor', subtype: 'belt', name: 'Đai Lưng', slot: 'belt', description: 'HP, phục hồi' },

    // ===== ACCESSORIES =====
    { type: 'accessory', subtype: 'ring', name: 'Nhẫn', slot: 'ring', description: 'Nguyên khí, crit' },
    { type: 'accessory', subtype: 'necklace', name: 'Dây Chuyền', slot: 'necklace', description: 'Kháng phép, hút máu' },
    { type: 'accessory', subtype: 'earring', name: 'Ngọc Nhĩ', slot: 'earring', description: 'Né, tốc độ' },
    { type: 'accessory', subtype: 'bracelet', name: 'Vòng Tay', slot: 'bracelet', description: 'Công phép, buff' },

    // ===== MAGIC TREASURES =====
    { type: 'magic_treasure', subtype: 'attack', name: 'Công Pháp Bảo', slot: 'magic_treasure', description: 'Tăng sát thương' },
    { type: 'magic_treasure', subtype: 'defense', name: 'Thủ Pháp Bảo', slot: 'magic_treasure', description: 'Tăng phòng ngự' },
    { type: 'magic_treasure', subtype: 'utility', name: 'Linh Pháp Bảo', slot: 'magic_treasure', description: 'Hiệu ứng đặc biệt' }
];

// ==================== BASE STATS BY TYPE & SUBTYPE ====================
const BASE_STATS_BY_TYPE = {
    // ===== WEAPON SUBTYPES =====
    'weapon_sword': {
        primaryStat: 'attack',
        secondaryStats: ['criticalRate', 'criticalDamage', 'speed'],
        baseValues: { attack: 12, criticalRate: 2, criticalDamage: 8, speed: 2 }
    },
    'weapon_saber': {
        primaryStat: 'attack',
        secondaryStats: ['criticalDamage', 'penetration', 'lifesteal'],
        baseValues: { attack: 16, criticalDamage: 12, penetration: 4, lifesteal: 1 }
    },
    'weapon_spear': {
        primaryStat: 'attack',
        secondaryStats: ['penetration', 'accuracy', 'criticalRate'],
        baseValues: { attack: 14, penetration: 6, accuracy: 4, criticalRate: 2 }
    },
    'weapon_bow': {
        primaryStat: 'attack',
        secondaryStats: ['criticalRate', 'dodge', 'speed'],
        baseValues: { attack: 10, criticalRate: 4, dodge: 3, speed: 3 }
    },
    'weapon_fan': {
        primaryStat: 'zhenYuan',
        secondaryStats: ['attack', 'speed', 'regeneration'],
        baseValues: { zhenYuan: 25, attack: 8, speed: 4, regeneration: 1 }
    },
    'weapon_flute': {
        primaryStat: 'zhenYuan',
        secondaryStats: ['speed', 'dodge', 'resistance'],
        baseValues: { zhenYuan: 30, speed: 5, dodge: 3, resistance: 2 }
    },
    'weapon_flying_sword': {
        primaryStat: 'attack',
        secondaryStats: ['zhenYuan', 'criticalDamage', 'penetration'],
        baseValues: { attack: 15, zhenYuan: 20, criticalDamage: 10, penetration: 3 }
    },

    // ===== ARMOR SUBTYPES =====
    'armor_helmet': {
        primaryStat: 'defense',
        secondaryStats: ['resistance', 'qiBlood', 'accuracy'],
        baseValues: { defense: 6, resistance: 3, qiBlood: 30, accuracy: 2 }
    },
    'armor_chest': {
        primaryStat: 'defense',
        secondaryStats: ['qiBlood', 'resistance', 'regeneration'],
        baseValues: { defense: 12, qiBlood: 80, resistance: 3, regeneration: 1 }
    },
    'armor_shoulder': {
        primaryStat: 'defense',
        secondaryStats: ['qiBlood', 'resistance'],
        baseValues: { defense: 8, qiBlood: 40, resistance: 2 }
    },
    'armor_gloves': {
        primaryStat: 'accuracy',
        secondaryStats: ['attack', 'criticalRate', 'speed'],
        baseValues: { accuracy: 5, attack: 4, criticalRate: 2, speed: 2 }
    },
    'armor_boots': {
        primaryStat: 'speed',
        secondaryStats: ['dodge', 'defense', 'qiBlood'],
        baseValues: { speed: 6, dodge: 4, defense: 4, qiBlood: 20 }
    },
    'armor_belt': {
        primaryStat: 'qiBlood',
        secondaryStats: ['defense', 'regeneration', 'resistance'],
        baseValues: { qiBlood: 60, defense: 5, regeneration: 2, resistance: 1 }
    },

    // ===== ACCESSORY SUBTYPES =====
    'accessory_ring': {
        primaryStat: 'zhenYuan',
        secondaryStats: ['criticalRate', 'criticalDamage', 'attack'],
        baseValues: { zhenYuan: 35, criticalRate: 3, criticalDamage: 6, attack: 3 }
    },
    'accessory_necklace': {
        primaryStat: 'resistance',
        secondaryStats: ['qiBlood', 'lifesteal', 'regeneration'],
        baseValues: { resistance: 5, qiBlood: 40, lifesteal: 2, regeneration: 1 }
    },
    'accessory_earring': {
        primaryStat: 'dodge',
        secondaryStats: ['speed', 'accuracy', 'criticalRate'],
        baseValues: { dodge: 4, speed: 3, accuracy: 3, criticalRate: 2 }
    },
    'accessory_bracelet': {
        primaryStat: 'zhenYuan',
        secondaryStats: ['attack', 'speed', 'criticalDamage'],
        baseValues: { zhenYuan: 25, attack: 5, speed: 2, criticalDamage: 5 }
    },

    // ===== MAGIC TREASURE SUBTYPES =====
    'magic_treasure_attack': {
        primaryStat: 'attack',
        secondaryStats: ['criticalDamage', 'penetration', 'zhenYuan'],
        baseValues: { attack: 12, criticalDamage: 10, penetration: 5, zhenYuan: 15 }
    },
    'magic_treasure_defense': {
        primaryStat: 'defense',
        secondaryStats: ['qiBlood', 'resistance', 'regeneration'],
        baseValues: { defense: 10, qiBlood: 50, resistance: 4, regeneration: 2 }
    },
    'magic_treasure_utility': {
        primaryStat: 'zhenYuan',
        secondaryStats: ['speed', 'lifesteal', 'dodge'],
        baseValues: { zhenYuan: 40, speed: 4, lifesteal: 2, dodge: 3 }
    },

    // ===== FALLBACK FOR OLD TYPE-ONLY SYSTEM =====
    'weapon': {
        primaryStat: 'attack',
        secondaryStats: ['criticalRate', 'criticalDamage', 'penetration'],
        baseValues: { attack: 12, criticalRate: 2, criticalDamage: 6, penetration: 3 }
    },
    'armor': {
        primaryStat: 'defense',
        secondaryStats: ['qiBlood', 'resistance', 'regeneration'],
        baseValues: { defense: 8, qiBlood: 50, resistance: 2, regeneration: 0.5 }
    },
    'accessory': {
        primaryStat: 'speed',
        secondaryStats: ['dodge', 'accuracy', 'luck'],
        baseValues: { speed: 3, dodge: 2, accuracy: 3, luck: 1 }
    },
    'ring': {
        primaryStat: 'zhenYuan',
        secondaryStats: ['criticalRate', 'lifesteal', 'resistance'],
        baseValues: { zhenYuan: 30, criticalRate: 1, lifesteal: 1, resistance: 1 }
    },
    'magic_treasure': {
        primaryStat: 'attack',
        secondaryStats: ['zhenYuan', 'criticalDamage', 'penetration'],
        baseValues: { attack: 10, zhenYuan: 20, criticalDamage: 8, penetration: 3 }
    }
};


// ==================== RARITY MULTIPLIERS ====================
const RARITY_STAT_MULTIPLIERS = {
    common: 1.0,
    uncommon: 1.5,
    rare: 2.2,
    epic: 3.5,
    legendary: 5.0,
    mythic: 8.0
};

// Tier multiplier (per tier level)
const TIER_STAT_MULTIPLIER = 0.2; // +20% per tier

// ==================== ELEMENT BONUS CONFIG ====================
const ELEMENT_STAT_BONUSES = {
    metal: { primaryBonus: 'penetration', value: 0.15 },  // Kim: +15% penetration
    wood: { primaryBonus: 'regeneration', value: 0.20 }, // Mộc: +20% regen
    water: { primaryBonus: 'lifesteal', value: 0.10 },   // Thủy: +10% lifesteal
    fire: { primaryBonus: 'criticalDamage', value: 0.12 }, // Hỏa: +12% crit dmg
    earth: { primaryBonus: 'defense', value: 0.15 }      // Thổ: +15% defense
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Get highest rarity from materials array
 */
export function getHighestRarity(materials) {
    let highestIndex = 0;

    for (const mat of materials) {
        const index = RARITY_ORDER.indexOf(mat.rarity);
        if (index > highestIndex) {
            highestIndex = index;
        }
    }

    return RARITY_ORDER[highestIndex];
}

/**
 * Count materials by rarity
 */
export function countByRarity(materials) {
    const counts = {};
    for (const rarity of RARITY_ORDER) {
        counts[rarity] = 0;
    }
    for (const mat of materials) {
        counts[mat.rarity] = (counts[mat.rarity] || 0) + 1;
    }
    return counts;
}

/**
 * Determine probability table to use
 * Special rule: 2+ legendary OR 1 mythic = mythic table
 */
export function getProbabilityTable(materials) {
    const counts = countByRarity(materials);

    // Check for mythic access first
    if (counts.mythic >= 1 || counts.legendary >= 2) {
        return 'mythic';
    }

    // Otherwise use highest rarity
    return getHighestRarity(materials);
}

/**
 * Roll for result rarity based on probability table
 */
export function rollResultRarity(probabilityTable) {
    const probabilities = CRAFT_RESULT_PROBABILITIES[probabilityTable];
    if (!probabilities) {
        return 'common';
    }

    const roll = Math.random() * 100;
    let cumulative = 0;

    for (const rarity of RARITY_ORDER) {
        cumulative += probabilities[rarity];
        if (roll < cumulative) {
            return rarity;
        }
    }

    return 'common';
}

/**
 * Get dominant element from materials
 */
export function getDominantElement(materials) {
    const elementCounts = {};

    for (const mat of materials) {
        if (mat.element) {
            elementCounts[mat.element] = (elementCounts[mat.element] || 0) + 1;
        }
    }

    let dominant = null;
    let maxCount = 0;

    for (const [element, count] of Object.entries(elementCounts)) {
        if (count > maxCount) {
            maxCount = count;
            dominant = element;
        }
    }

    // Need at least 2 of same element to get bonus
    return maxCount >= 2 ? dominant : null;
}

/**
 * Generate random stats for crafted equipment
 * @param {string} equipmentType - Type like 'weapon' or 'weapon_sword'
 */
export function generateEquipmentStats(equipmentType, rarity, tier, element = null, subtype = null) {
    // Try type_subtype first, then fallback to type only
    const lookupKey = subtype ? `${equipmentType}_${subtype}` : equipmentType;
    const config = BASE_STATS_BY_TYPE[lookupKey] || BASE_STATS_BY_TYPE[equipmentType];
    if (!config) {
        return {};
    }

    const rarityMult = RARITY_STAT_MULTIPLIERS[rarity] || 1;
    const tierMult = 1 + (tier - 1) * TIER_STAT_MULTIPLIER;
    const variance = 0.85 + Math.random() * 0.3; // 85%-115% variance

    const stats = {};

    // Primary stat
    const basePrimary = config.baseValues[config.primaryStat] || 10;
    stats[config.primaryStat] = Math.floor(basePrimary * rarityMult * tierMult * variance);

    // Secondary stats (random selection, 1-2 stats)
    const numSecondary = rarity === 'mythic' ? 3 :
        rarity === 'legendary' ? 2 :
            rarity === 'epic' ? 2 : 1;

    const shuffled = [...config.secondaryStats].sort(() => Math.random() - 0.5);
    const selectedSecondary = shuffled.slice(0, numSecondary);

    for (const stat of selectedSecondary) {
        const baseValue = config.baseValues[stat] || 1;
        const secondaryVariance = 0.7 + Math.random() * 0.6; // 70%-130% for secondary
        stats[stat] = Math.floor(baseValue * rarityMult * tierMult * secondaryVariance);
    }

    // Apply element bonus if present
    if (element && ELEMENT_STAT_BONUSES[element]) {
        const bonus = ELEMENT_STAT_BONUSES[element];
        const bonusStat = bonus.primaryBonus;
        if (stats[bonusStat]) {
            stats[bonusStat] = Math.floor(stats[bonusStat] * (1 + bonus.value));
        } else {
            // Add the bonus stat
            const baseValue = config.baseValues[bonusStat] || 5;
            stats[bonusStat] = Math.floor(baseValue * rarityMult * tierMult * bonus.value);
        }
    }

    return stats;
}

/**
 * Generate equipment name based on rarity, type and subtype
 */
export function generateEquipmentName(equipmentType, rarity, tier, element = null, subtype = null) {
    const prefixes = {
        common: ['Phàm', 'Thường', 'Bình'],
        uncommon: ['Linh', 'Tinh', 'Nguyên'],
        rare: ['Chân', 'Huyền', 'Cổ'],
        epic: ['Địa', 'Thiên', 'Thần'],
        legendary: ['Tiên', 'Thánh', 'Hoàng'],
        mythic: ['Hỗn Độn', 'Thái Cổ', 'Vô Thượng']
    };

    const subtypeNames = {
        // Weapons
        sword: 'Kiếm', saber: 'Đao', spear: 'Thương', bow: 'Cung',
        fan: 'Quạt', flute: 'Tiêu', flying_sword: 'Linh Kiếm',
        // Armors
        helmet: 'Mũ', chest: 'Giáp', shoulder: 'Vai Giáp',
        gloves: 'Hộ Thủ', boots: 'Hộ Cước', belt: 'Đai',
        // Accessories
        ring: 'Nhẫn', necklace: 'Liên', earring: 'Nhĩ', bracelet: 'Hoàn',
        // Magic Treasures
        attack: 'Công Bảo', defense: 'Thủ Bảo', utility: 'Linh Bảo'
    };

    const typeNames = {
        weapon: ['Kiếm', 'Đao', 'Thương'],
        armor: ['Giáp', 'Khải', 'Y'],
        accessory: ['Phù', 'Ấn', 'Bài'],
        magic_treasure: ['Bảo', 'Khí', 'Linh']
    };

    const elementNames = {
        metal: 'Kim',
        wood: 'Mộc',
        water: 'Thủy',
        fire: 'Hỏa',
        earth: 'Thổ'
    };

    const prefix = prefixes[rarity][Math.floor(Math.random() * prefixes[rarity].length)];

    // Use subtype name if available, otherwise random from type
    let typeName;
    if (subtype && subtypeNames[subtype]) {
        typeName = subtypeNames[subtype];
    } else if (typeNames[equipmentType]) {
        typeName = typeNames[equipmentType][Math.floor(Math.random() * typeNames[equipmentType].length)];
    } else {
        typeName = 'Khí';
    }

    const elementPart = element ? elementNames[element] + ' ' : '';

    return `${prefix} ${elementPart}${typeName}`;
}

/**
 * Main crafting function
 * @param {Array} materials - Array of material objects with { templateId, rarity, tier, element, qty }
 * @param {string} targetType - Equipment type to craft (e.g., 'weapon', 'armor')
 * @param {string} targetSubtype - Equipment subtype (e.g., 'sword', 'helmet')
 * @param {number} tier - Target tier
 * @returns {Object} Crafted equipment data or error
 */
export function executeCraft(materials, targetType, targetSubtype, tier) {
    // Validate minimum materials (3-5)
    if (materials.length < 3) {
        return { success: false, error: 'Linh vật bất túc, tối thiểu cần 3 thiên tài địa bảo để tế luyện' };
    }
    if (materials.length > 5) {
        return { success: false, error: 'Linh khí quá thịnh, tối đa 5 thiên tài địa bảo mỗi lần đúc luyện' };
    }

    // Validate same tier
    const tiers = [...new Set(materials.map(m => m.tier))];
    if (tiers.length > 1) {
        return { success: false, error: 'Thiên tài địa bảo bất đồng phẩm chất, khí tức hỗn loạn, vô pháp dung hợp' };
    }

    // Validate target type + subtype
    const craftableItem = CRAFTABLE_EQUIPMENT_TYPES.find(t =>
        t.type === targetType && t.subtype === targetSubtype
    );
    if (!craftableItem) {
        return { success: false, error: 'Pháp khí hình thái không tồn tại trong luyện khí bí lục' };
    }

    // Get probability table and roll
    const probTable = getProbabilityTable(materials);
    const resultRarity = rollResultRarity(probTable);

    // Get dominant element
    const dominantElement = getDominantElement(materials);

    // Generate stats with subtype
    const stats = generateEquipmentStats(targetType, resultRarity, tier, dominantElement, targetSubtype);

    // Generate name with subtype
    const name = generateEquipmentName(targetType, resultRarity, tier, dominantElement, targetSubtype);

    // Roll modifiers based on rarity
    const modifiers = rollModifiers(resultRarity, dominantElement);

    // Calculate durability based on rarity
    const durabilityMax = {
        common: 80,
        uncommon: 100,
        rare: 120,
        epic: 150,
        legendary: 200,
        mythic: 300
    }[resultRarity] || 100;

    // Build result
    const result = {
        success: true,
        equipment: {
            name,
            type: targetType,
            subtype: targetSubtype,
            slot: craftableItem.slot,
            rarity: resultRarity,
            tier,
            realmRequired: tier, // Realm-lock to tier
            element: dominantElement,
            stats,
            modifiers,
            durability: {
                current: durabilityMax,
                max: durabilityMax
            },
            craftedAt: new Date(),
            // Metadata for tracking
            craftMeta: {
                materialsUsed: materials.length,
                highestInputRarity: getHighestRarity(materials),
                probTableUsed: probTable
            }
        },
        // Info for UI
        craftInfo: {
            inputRarities: countByRarity(materials),
            probTableUsed: probTable,
            resultRarity,
            gotElement: !!dominantElement
        }
    };

    return result;
}

/**
 * Preview craft result probabilities (no actual crafting)
 */
export function previewCraft(materials) {
    if (materials.length < 3) {
        return { valid: false, error: 'Cần ít nhất 3 nguyên liệu' };
    }

    const tiers = [...new Set(materials.map(m => m.tier))];
    if (tiers.length > 1) {
        return { valid: false, error: 'Tất cả nguyên liệu phải cùng tier' };
    }

    const probTable = getProbabilityTable(materials);
    const probabilities = CRAFT_RESULT_PROBABILITIES[probTable];
    const dominantElement = getDominantElement(materials);

    return {
        valid: true,
        tier: tiers[0],
        probabilityTable: probTable,
        probabilities,
        dominantElement,
        inputCount: materials.length,
        inputRarities: countByRarity(materials)
    };
}

export default {
    CRAFT_RESULT_PROBABILITIES,
    CRAFTABLE_EQUIPMENT_TYPES,
    executeCraft,
    previewCraft,
    getHighestRarity,
    getDominantElement,
    generateEquipmentStats,
    generateEquipmentName
};
