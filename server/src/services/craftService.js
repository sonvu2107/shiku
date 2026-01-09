/**
 * Craft Service - Crafting RNG Logic
 * Handles equipment creation from materials with probability-based outcomes
 * UPDATED: Synced with Admin Dashboard balancing logic
 */

import { RARITY, ELEMENTAL_TYPES } from '../models/Equipment.js';
import { rollModifiers } from './modifierService.js';
import {
    calculateWeightedBPSTable,
    applyBonusBPS,
    // getProbabilityTable removed (not exported from bps)
    getPityConfig,
    applyPityBPS,
    rollRarityBPS,
    RARITY_ORDER
} from './craftService_bps.js';

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
// 🎯 BALANCE NOTE: Tất cả equipment phải có ATK, HP, DEF để scale đúng với realm
// - Weapon: ATK focus (60-70), DEF thấp (5-15), HP moderate (30-50)
// - Armor: DEF focus (25-60), HP cao (80-250), ATK thấp (0-10)
// - Accessory: Balanced ATK/DEF/HP (10-20 / 10-20 / 30-80), crit bonuses
const SUBTYPE_STATS = {
    // === VŨ KHÍ ===
    sword: { attack: 50, defense: 5, hp: 30, crit_rate: 0.03, crit_damage: 0.12, speed: 5, price: 500 },
    saber: { attack: 65, defense: 8, hp: 25, crit_rate: 0.02, crit_damage: 0.15, speed: 3, price: 550 },
    spear: { attack: 55, defense: 10, hp: 35, crit_rate: 0.02, crit_damage: 0.10, speed: 6, price: 480 },
    bow: { attack: 45, defense: 5, hp: 20, crit_rate: 0.06, crit_damage: 0.20, speed: 4, price: 520 },
    fan: { attack: 35, defense: 10, hp: 50, crit_rate: 0.04, crit_damage: 0.15, speed: 7, price: 600 },
    flute: { attack: 30, defense: 5, hp: 80, crit_rate: 0.03, crit_damage: 0.12, speed: 8, price: 650 },
    brush: { attack: 40, defense: 15, hp: 60, crit_rate: 0.04, crit_damage: 0.18, speed: 5, price: 700 },
    dual_sword: { attack: 70, defense: 12, hp: 40, crit_rate: 0.05, crit_damage: 0.18, speed: 8, price: 650 },
    flying_sword: { attack: 60, defense: 10, hp: 35, crit_rate: 0.04, crit_damage: 0.15, speed: 10, price: 800 },

    // === GIÁP ===
    helmet: { attack: 5, defense: 25, hp: 150, crit_rate: 0, crit_damage: 0, speed: 0, price: 400 },
    chest: { attack: 10, defense: 60, hp: 250, crit_rate: 0, crit_damage: 0, speed: 0, price: 700 },
    shoulder: { attack: 5, defense: 35, hp: 100, crit_rate: 0, crit_damage: 0, speed: 2, price: 500 },
    gloves: { attack: 10, defense: 20, hp: 50, crit_rate: 0.02, crit_damage: 0.08, speed: 3, price: 450 },
    boots: { attack: 8, defense: 30, hp: 80, crit_rate: 0, crit_damage: 0, speed: 8, price: 550 },
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
    weapon: { attack: 50, defense: 8, hp: 35, crit_rate: 0.02, crit_damage: 0.1, speed: 5, price: 500 },
    armor: { attack: 8, defense: 40, hp: 200, crit_rate: 0, crit_damage: 0, speed: 0, price: 600 },
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

// TIER SCALING - Exponential để theo kịp realm + techniques/skills scaling
// Equipment phải đủ mạnh so với tổng stats (base + buffs), không chỉ base
//
// Target: Equipment = 40-100% of realm base ATK
// (Khi player có techniques/skills tăng ~3x base, equipment = 15-30% tổng)
//
// Formula: 2^(tier-1) * 0.05
// Tier 1:  2^0  * 0.05 = 0.05x   → ~50% base (~12% tổng)
// Tier 5:  2^4  * 0.05 = 0.8x    → ~80% base (~20% tổng)
// Tier 10: 2^9  * 0.05 = 25.6x   → ~80% base (~20% tổng)
// Tier 14: 2^13 * 0.05 = 409.6x  → ~110% base (~28% tổng)
const TIER_SCALING_BASE = 2.0;
const TIER_SCALING_MULTIPLIER = 0.25;

const getTierMultiplier = (tier) => {
    if (tier <= 1) return TIER_SCALING_MULTIPLIER;
    return Math.pow(TIER_SCALING_BASE, tier - 1) * TIER_SCALING_MULTIPLIER;
};

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

export function resolveCraftTableKey(materials) {
    const counts = countByRarity(materials);
    // Check for mythic access
    if (counts.mythic >= 1 || counts.legendary >= 2) return 'mythic';
    // Check for legendary access
    if (counts.legendary >= 1 || counts.epic >= 2) return 'legendary';

    // Default to 'epic' to ensure Pity System always has a valid target
    return 'epic';
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
    // Allow single element (return most common), or null if no elements
    // Changed from: maxCount >= 2 (required 2+ same element)
    // To: maxCount >= 1 (allow any element, pick most common)
    return maxCount >= 1 ? dominant : null;
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
    const tierMult = getTierMultiplier(tier);
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
 * PRODUCTION-GRADE PREVIEW CRAFT
 * Uses strictly BPS logic for calculation, only converting to % for display.
 */
export function previewCraft(materials, useCatalyst = false) {
    if (materials.length < 3) return { valid: false, error: 'Cần ít nhất 3 nguyên liệu' };

    // 1. Calculate Base BPS Table (Weighted Average of Materials)
    let bpsTable = calculateWeightedBPSTable(materials);

    // Determine Table Key for Pity Lookup
    // Fallback to 'common' if resolve fails, though resolveCraftTableKey should handle it.
    const tableKey = resolveCraftTableKey ? resolveCraftTableKey(materials) : 'common';
    const pityCfg = getPityConfig(tableKey);

    // 2. Apply Catalyst Bonus (if any)
    if (useCatalyst) {
        // Target priority: Pity Target > Highest Available in Table > Common
        let targetRarity = pityCfg?.targetRarity;

        if (!targetRarity) {
            // Fallback: Find highest non-zero rarity in current table
            const RARITY_ORDER_DESC = [...RARITY_ORDER].reverse();
            for (const r of RARITY_ORDER_DESC) {
                if ((bpsTable[r] || 0) > 0) {
                    targetRarity = r;
                    break;
                }
            }
        }
        targetRarity = targetRarity || 'common'; // Ultimate fallback

        // Apply +20% bonus via BPS helper
        bpsTable = applyBonusBPS(bpsTable, targetRarity, 20); // 20%
    }

    // 3. Convert BPS to Percentage for Display (0-100)
    // bps / 100
    const displayProbabilities = {};
    for (const r of RARITY_ORDER) {
        const bps = bpsTable[r] || 0;
        displayProbabilities[r] = parseFloat((bps / 100).toFixed(2));
    }

    const probTableKey = tableKey;

    return {
        valid: true,
        probabilityTable: probTableKey, // For UI theme
        probabilities: displayProbabilities, // DISPLAY ONLY
        dominantElement: getDominantElement(materials),
        inputCount: materials.length,
        inputRarities: countByRarity(materials)
    };
}




// Keep executeCraft as legacy wrapper if totally needed, but ideally warn or redirect
// For safety, I'll recreate a BPS-safe version of executeCraft just in case something calls it.
// Assuming verify step wanted it gone, but user said "if used, rewrite". 
// I'll keep it simple: it should call verify logic? No, just keep executeCraftWithRarity as main.
// I will just export the new safe functions.

// WRAPPER: executeCraft (Legacy / Safe Wrapper)
// Ensures even simple calls go through BPS logic.
export function executeCraft(materials, targetType, targetSubtype, tier, opts = {}) {
    const { useCatalyst = false, tableKey = null, pityBonusBPS = 0 } = opts;

    // Validate minimum materials (3-5)
    if (materials.length < 3) return { success: false, error: 'Linh vật bất túc, tối thiểu cần 3 thiên tài địa bảo' };

    // 1. Calculate BPS
    let bpsTable = calculateWeightedBPSTable(materials);
    const resolvedKey = tableKey ?? resolveCraftTableKey(materials);
    const pityCfg = getPityConfig(resolvedKey);

    // 2. Apply Pity (If passed in opts - rare case for legacy wrapper)
    if (pityCfg && pityBonusBPS > 0) {
        bpsTable = applyPityBPS(bpsTable, pityCfg.targetRarity, pityBonusBPS, pityCfg.takeFrom);
    }

    // 3. Apply Catalyst
    if (useCatalyst) {
        let target = pityCfg?.targetRarity;
        if (!target) {
            const RARITY_ORDER_DESC = [...RARITY_ORDER].reverse();
            for (const r of RARITY_ORDER_DESC) {
                if ((bpsTable[r] || 0) > 0) { target = r; break; }
            }
        }
        target = target || 'common';
        bpsTable = applyBonusBPS(bpsTable, target, 20);
    }

    // 4. Roll
    const resultRarity = rollRarityBPS(bpsTable);
    const dominantElement = getDominantElement(materials);

    if (!dominantElement) {
        return { success: false, error: 'Không xác định được hệ nguyên tố' };
    }

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
            name, type: targetType, subtype: targetSubtype,
            slot: CRAFTABLE_EQUIPMENT_TYPES.find(t => t.type === targetType && t.subtype === targetSubtype)?.slot || 'weapon',
            rarity: resultRarity, tier, realmRequired: tier, element: dominantElement,
            stats, modifiers,
            durability: { current: durabilityMax, max: durabilityMax },
            craftMeta: {
                materialsUsed: materials.length,
                highestInputRarity: getHighestRarity(materials)
            }
        },
        craftInfo: { probTableUsed: resolvedKey || 'bps_legacy_wrapper', resultRarity }
    };
}

// KEEP getHighestRarity EXPORTED IF USED ELSEWHERE
// (It was previously defined locally and used. I replaced the local def with resolveCraftTableKey block but I should keep getHighestRarity fn available)
// I will re-add getHighestRarity below resolveCraftTableKey to ensure it exists.

export {
    resolveCraftTableKey as getCraftTableKey // Renamed from getProbabilityTable to avoid confusion
};

export default {
    executeCraft,
    previewCraft,
    generateEquipmentStats,
    getHighestRarity,
    resolveCraftTableKey
};
