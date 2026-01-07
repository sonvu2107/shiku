/**
 * Craft Service - Crafting RNG Logic
 * Handles equipment creation from materials with probability-based outcomes
 * UPDATED: Synced with Admin Dashboard balancing logic
 */

import { RARITY, ELEMENTAL_TYPES } from '../models/Equipment.js';
import { rollModifiers } from './modifierService.js';

// ==================== RARITY CONFIG ====================
// Keep consistent with Client
const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

// Crafting result probabilities based on highest input rarity
export const CRAFT_RESULT_PROBABILITIES = {
    common: { common: 90, uncommon: 10, rare: 0, epic: 0, legendary: 0, mythic: 0 },
    uncommon: { common: 10, uncommon: 60, rare: 30, epic: 0, legendary: 0, mythic: 0 },
    rare: { common: 0, uncommon: 30, rare: 60, epic: 10, legendary: 0, mythic: 0 },
    epic: { common: 0, uncommon: 0, rare: 40, epic: 50, legendary: 10, mythic: 0 },
    legendary: { common: 0, uncommon: 0, rare: 0, epic: 50, legendary: 48, mythic: 2 },
    mythic: { common: 0, uncommon: 0, rare: 0, epic: 30, legendary: 60, mythic: 10 }
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
    { type: 'weapon', subtype: 'brush', name: 'Bút Pháp', slot: 'weapon', description: 'Sát thương phép' },
    { type: 'weapon', subtype: 'dual_sword', name: 'Song Kiếm', slot: 'weapon', description: 'Tốc độ cực nhanh' },
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

    // ===== MAGIC TREASURES (Limited crafting support in this version) =====
    // Fallback types
    { type: 'magic_treasure', subtype: 'attack', name: 'Công Pháp Bảo', slot: 'magic_treasure', description: 'Tăng sát thương' },
    { type: 'magic_treasure', subtype: 'defense', name: 'Thủ Pháp Bảo', slot: 'magic_treasure', description: 'Tăng phòng ngự' }
];

// ==================== BALANCED STATS CONFIG (FROM ADMIN DASHBOARD) ====================
const SUBTYPE_STATS = {
    // === VŨ KHÍ ===
    sword: { attack: 50, defense: 5, hp: 0, crit_rate: 0.03, crit_damage: 0.12, speed: 5, price: 500 },
    saber: { attack: 65, defense: 0, hp: 0, crit_rate: 0.02, crit_damage: 0.15, speed: 3, price: 550 },
    spear: { attack: 55, defense: 0, hp: 0, crit_rate: 0.02, crit_damage: 0.10, speed: 6, price: 480 },
    bow: { attack: 45, defense: 0, hp: 0, crit_rate: 0.06, crit_damage: 0.20, speed: 4, price: 520 },
    fan: { attack: 35, defense: 10, hp: 50, crit_rate: 0.04, crit_damage: 0.15, speed: 7, price: 600 },
    flute: { attack: 30, defense: 5, hp: 80, crit_rate: 0.03, crit_damage: 0.12, speed: 8, price: 650 },
    brush: { attack: 40, defense: 15, hp: 60, crit_rate: 0.04, crit_damage: 0.18, speed: 5, price: 700 },
    dual_sword: { attack: 70, defense: 0, hp: 0, crit_rate: 0.05, crit_damage: 0.18, speed: 8, price: 650 },
    flying_sword: { attack: 60, defense: 0, hp: 0, crit_rate: 0.04, crit_damage: 0.15, speed: 10, price: 800 },

    // === GIÁP ===
    helmet: { attack: 0, defense: 25, hp: 150, crit_rate: 0, crit_damage: 0, speed: 0, price: 400 },
    chest: { attack: 0, defense: 60, hp: 250, crit_rate: 0, crit_damage: 0, speed: 0, price: 700 },
    shoulder: { attack: 5, defense: 35, hp: 100, crit_rate: 0, crit_damage: 0, speed: 2, price: 500 },
    gloves: { attack: 10, defense: 20, hp: 50, crit_rate: 0.02, crit_damage: 0.08, speed: 3, price: 450 },
    boots: { attack: 0, defense: 30, hp: 80, crit_rate: 0, crit_damage: 0, speed: 8, price: 550 },
    belt: { attack: 5, defense: 25, hp: 120, crit_rate: 0.01, crit_damage: 0.05, speed: 2, price: 400 },

    // === TRANG SỨC ===
    ring: { attack: 20, defense: 5, hp: 30, crit_rate: 0.04, crit_damage: 0.15, speed: 2, price: 500 },
    necklace: { attack: 15, defense: 15, hp: 80, crit_rate: 0.03, crit_damage: 0.12, speed: 3, price: 550 },
    earring: { attack: 10, defense: 10, hp: 40, crit_rate: 0.06, crit_damage: 0.25, speed: 4, price: 500 },
    bracelet: { attack: 15, defense: 20, hp: 60, crit_rate: 0.02, crit_damage: 0.10, speed: 5, price: 450 },

    // Fallback/Legacy
    attack: { attack: 30, defense: 5, hp: 50, crit_rate: 0.02, crit_damage: 0.10, speed: 3, price: 350 },
    defense: { attack: 15, defense: 20, hp: 100, crit_rate: 0.03, crit_damage: 0.12, speed: 2, price: 400 }
};

// Also support Type fallback for legacy/general purposes
const BASE_STATS_BY_TYPE = {
    weapon: { attack: 50, defense: 0, hp: 0, crit_rate: 0.02, crit_damage: 0.1, speed: 5, price: 500 },
    armor: { attack: 0, defense: 40, hp: 200, crit_rate: 0, crit_damage: 0, speed: 0, price: 600 },
    accessory: { attack: 15, defense: 15, hp: 50, crit_rate: 0.05, crit_damage: 0.2, speed: 3, price: 400 },
    magic_treasure: { attack: 30, defense: 10, hp: 100, crit_rate: 0.03, crit_damage: 0.15, speed: 0, price: 800 }
};

// ==================== BALANCING MULTIPLIERS ====================
// Synced with Admin Dashboard
export const RARITY_STAT_MULTIPLIERS = {
    common: 1.0,
    uncommon: 1.4,
    rare: 2.0,
    epic: 3.0,
    legendary: 4.5,
    mythic: 6.0
};

// Flat Bonus for Crit Rate (Additive, not Multiplicative)
const CRIT_RATE_BONUS = {
    common: 0,
    uncommon: 0.01,
    rare: 0.02,
    epic: 0.03,
    legendary: 0.04,
    mythic: 0.05
};

// Tier multiplier
const TIER_STAT_MULTIPLIER = 0.2; // +20% per tier (additive to base 1) -> Multiplier = 1 + (Tier-1)*0.2

// Element bonuses
const ELEMENT_STAT_BONUSES = {
    metal: { primaryBonus: 'penetration', value: 0.15, flatBoost: 5 },  // Kim: Penetration
    wood: { primaryBonus: 'regeneration', value: 0.20, flatBoost: 2 }, // Mộc: Regen
    water: { primaryBonus: 'lifesteal', value: 0.10, flatBoost: 0.02 },   // Thủy: Lifesteal
    fire: { primaryBonus: 'crit_damage', value: 0.12, flatBoost: 0.05 }, // Hỏa: Crit Dmg
    earth: { primaryBonus: 'defense', value: 0.15, flatBoost: 10 }      // Thổ: Defense
};

// ==================== HELPER FUNCTIONS ====================

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

export function getProbabilityTable(materials) {
    const counts = countByRarity(materials);
    // Check for mythic access
    if (counts.mythic >= 1 || counts.legendary >= 2) {
        return 'mythic';
    }
    return getHighestRarity(materials);
}

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
    return maxCount >= 2 ? dominant : null;
}

/**
 * Generate random stats for crafted equipment
 * Synced with Admin Dashboard logic
 */
export function generateEquipmentStats(equipmentType, rarity, tier, element = null, subtype = null) {
    // 1. Determine Base Stats
    let baseValues = {};

    // Try explicit subtype first
    if (subtype && SUBTYPE_STATS[subtype]) {
        baseValues = SUBTYPE_STATS[subtype];
    }
    // Fallback to generic type
    else if (BASE_STATS_BY_TYPE[equipmentType]) {
        baseValues = BASE_STATS_BY_TYPE[equipmentType];
    }
    // Fallback default
    else {
        baseValues = BASE_STATS_BY_TYPE.weapon;
    }

    // 2. Multipliers
    const rarityMult = RARITY_STAT_MULTIPLIERS[rarity] || 1;
    const tierMult = 1 + (tier - 1) * TIER_STAT_MULTIPLIER;
    const critBonus = CRIT_RATE_BONUS[rarity] || 0;

    // Variance: 0.9 to 1.1 (±10% random factor)
    const variance = () => 0.9 + Math.random() * 0.2;

    const stats = {};

    // 3. Calculate Stats
    // Keys defined in SUBTYPE_STATS are: attack, defense, hp, crit_rate, crit_damage, speed

    // Helper: Determine if stat is Percentage (0-1) or Flat
    // In our system: crit_rate, crit_damage, lifesteal, evasion, hit_rate, regeneration (sometimes), penetration (sometimes)
    // Based on Admin Dashboard, crit_rate/crit_damage are handled as Base + Bonus, others as Flat * Mult.

    const FLAT_STATS = ['attack', 'defense', 'hp', 'speed', 'zhenYuan', 'price'];

    for (const [key, val] of Object.entries(baseValues)) {
        if (val === 0) continue;

        if (FLAT_STATS.includes(key)) {
            // Flat Stat Algo: Base * RarityMult * TierMult * Variance
            stats[key] = Math.floor(val * rarityMult * tierMult * variance());
        } else {
            // Percentage Stat Algo (Criticals): Base + FlatBonus
            // Note: Admin dashboard DOES NOT apply rarityMult to percentages typically, OR applies it very conservatively.
            // But SUBTYPE_STATS has base values like 0.03.
            // If we multiply 0.03 * 4.5 (Legendary) = 0.135 (13.5%). Acceptable.
            // Admin Dashboard implemented: base + bonus.
            // Let's stick to Admin Dashboard logic:

            if (key === 'crit_rate') {
                // Crit Rate: Base + Bonus. NO Multiplier (to avoid 100% crit).
                stats[key] = parseFloat((val + critBonus).toFixed(4));
            } else if (key === 'crit_damage') {
                // Crit Damage: Base * Multiplier is usually fine, but let's be safe.
                // Admin Dashboard: base * multiplier.
                stats[key] = parseFloat((val * rarityMult).toFixed(4));
            } else {
                // Other percentages (lifesteal, etc): Base * Multiplier
                stats[key] = parseFloat((val * rarityMult).toFixed(4));
            }
        }
    }

    // 4. Element Bonus
    if (element && ELEMENT_STAT_BONUSES[element]) {
        const bonus = ELEMENT_STAT_BONUSES[element];
        const bonusStat = bonus.primaryBonus;

        // If stat exists, boost it
        if (stats[bonusStat]) {
            if (FLAT_STATS.includes(bonusStat)) {
                stats[bonusStat] = Math.floor(stats[bonusStat] * (1 + bonus.value));
            } else {
                stats[bonusStat] = parseFloat((stats[bonusStat] + (bonus.flatBoost || 0)).toFixed(4));
            }
        } else {
            // Add new stat
            if (FLAT_STATS.includes(bonusStat)) {
                stats[bonusStat] = Math.floor((bonus.flatBoost || 10) * rarityMult * tierMult);
            } else {
                stats[bonusStat] = parseFloat((bonus.flatBoost || 0.05).toFixed(4));
            }
        }

        // Element always adds some elemental damage? (Future feature)
    }

    // 5. Cleanup
    // Map 'hp' -> 'qiBlood' IF schema or legacy requires it. 
    // Current Model uses 'hp' in `stats.hp`.
    // Current Controller maps `stats.qiBlood` to `hp`.
    // TO FIX CONTROLLER MAPPING: We should return BOTH or Update Controller.
    // Let's return standardized keys matching Schema: hp, attack, defense...
    // But to account for legacy Controller logic which looks for `qiBlood`, `criticalRate`.

    // MAPPING FOR LEGACY CONTROLLER COMPATIBILITY
    // Controller looks for: qiBlood, criticalRate, criticalDamage, dodge, accuracy
    stats.qiBlood = stats.hp || 0;
    stats.criticalRate = (stats.crit_rate || 0) * 100; // Legacy expects 0-100
    stats.criticalDamage = (stats.crit_damage || 0) * 100; // Legacy expects 0-100
    stats.dodge = (stats.evasion || 0) * 100;
    stats.accuracy = (stats.hit_rate || 0) * 100;

    return stats;
}

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
        sword: 'Kiếm', saber: 'Đao', spear: 'Thương', bow: 'Cung',
        fan: 'Quạt', flute: 'Tiêu', brush: 'Bút', dual_sword: 'Song Kiếm', flying_sword: 'Linh Kiếm',
        helmet: 'Mũ', chest: 'Giáp', shoulder: 'Vai Giáp',
        gloves: 'Hộ Thủ', boots: 'Hộ Cước', belt: 'Đai',
        ring: 'Nhẫn', necklace: 'Dây Chuyền', earring: 'Ngọc Nhĩ', bracelet: 'Vòng Tay'
    };

    const typeNames = {
        weapon: ['Kiếm', 'Đao', 'Thương'],
        armor: ['Giáp', 'Khải', 'Y'],
        accessory: ['Phù', 'Ấn', 'Bài'],
        magic_treasure: ['Bảo', 'Khí', 'Linh']
    };

    const elementNames = {
        metal: 'Kim', wood: 'Mộc', water: 'Thủy', fire: 'Hỏa', earth: 'Thổ'
    };

    const prefix = prefixes[rarity][Math.floor(Math.random() * prefixes[rarity].length)];

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
 */
export function executeCraft(materials, targetType, targetSubtype, tier) {
    // Validate minimum materials (3-5)
    if (materials.length < 3) return { success: false, error: 'Linh vật bất túc, tối thiểu cần 3 thiên tài địa bảo' };
    if (materials.length > 5) return { success: false, error: 'Linh khí quá thịnh, tối đa 5 thiên tài địa bảo' };

    // Validate same tier
    const tiers = [...new Set(materials.map(m => m.tier))];
    if (tiers.length > 1) return { success: false, error: 'Nguyên liệu không đồng cấp' };

    // Validate target type
    const valid = CRAFTABLE_EQUIPMENT_TYPES.find(t => t.type === targetType && t.subtype === targetSubtype);
    if (!valid) return { success: false, error: 'Công thức không hợp lệ' };

    const probTable = getProbabilityTable(materials);
    const resultRarity = rollResultRarity(probTable);
    const dominantElement = getDominantElement(materials);

    // Generate Stats
    const stats = generateEquipmentStats(targetType, resultRarity, tier, dominantElement, targetSubtype);
    const name = generateEquipmentName(targetType, resultRarity, tier, dominantElement, targetSubtype);
    const modifiers = rollModifiers(resultRarity, dominantElement);

    const durabilityMax = {
        common: 80, uncommon: 100, rare: 120, epic: 150, legendary: 200, mythic: 300
    }[resultRarity] || 100;

    return {
        success: true,
        equipment: {
            name,
            type: targetType,
            subtype: targetSubtype,
            slot: valid.slot,
            rarity: resultRarity,
            tier,
            realmRequired: tier,
            element: dominantElement,
            stats,
            modifiers,
            durability: { current: durabilityMax, max: durabilityMax },
            craftMeta: {
                materialsUsed: materials.length,
                highestInputRarity: getHighestRarity(materials)
            }
        },
        craftInfo: {
            probTableUsed: probTable,
            resultRarity
        }
    };
}

export function previewCraft(materials) {
    if (materials.length < 3) return { valid: false, error: 'Cần ít nhất 3 nguyên liệu' };
    const probTable = getProbabilityTable(materials);
    return {
        valid: true,
        probabilityTable: probTable,
        probabilities: CRAFT_RESULT_PROBABILITIES[probTable],
        dominantElement: getDominantElement(materials),
        inputCount: materials.length,
        inputRarities: countByRarity(materials)
    };
}

export default {
    CRAFT_RESULT_PROBABILITIES,
    executeCraft,
    previewCraft,
    generateEquipmentStats
};
