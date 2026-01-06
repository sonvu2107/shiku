/**
 * Drop Service - Material RNG & Bonus Rolls from Dungeons
 * Server-side only drop logic with full audit trail
 */

import { MATERIAL_RARITY, MATERIAL_TEMPLATES, MATERIAL_ELEMENTS } from '../models/Material.js';

// ==================== DROP CONFIG BY DIFFICULTY ====================
export const MATERIAL_DROP_CONFIG = {
    easy: {
        baseRolls: 1,
        maxRolls: 3,
        rarityWeights: {
            common: 55,
            uncommon: 25,
            rare: 15,
            epic: 4,
            legendary: 0.9,
            mythic: 0.1
        },
        tierRange: [1, 3] // Materials tier 1-3 only
    },
    normal: {
        baseRolls: 2,
        maxRolls: 4,
        rarityWeights: {
            common: 50,
            uncommon: 28,
            rare: 17,
            epic: 4,
            legendary: 0.9,
            mythic: 0.1
        },
        tierRange: [2, 4]
    },
    hard: {
        baseRolls: 3,
        maxRolls: 5,
        rarityWeights: {
            common: 45,
            uncommon: 30,
            rare: 18,
            epic: 5.5,
            legendary: 1.3,
            mythic: 0.2
        },
        tierRange: [3, 6]
    },
    nightmare: {
        baseRolls: 3,
        maxRolls: 6,
        rarityWeights: {
            common: 40,
            uncommon: 30,
            rare: 20,
            epic: 7,
            legendary: 2.5,
            mythic: 0.5
        },
        tierRange: [5, 8]
    },
    hell: {
        baseRolls: 4,
        maxRolls: 7,
        rarityWeights: {
            common: 35,
            uncommon: 28,
            rare: 22,
            epic: 10,
            legendary: 4,
            mythic: 1
        },
        tierRange: [7, 10]
    },
    chaos: {
        baseRolls: 5,
        maxRolls: 8,
        rarityWeights: {
            common: 30,
            uncommon: 25,
            rare: 24,
            epic: 13,
            legendary: 6,
            mythic: 2
        },
        tierRange: [10, 14]
    }
};

// ==================== PERFORMANCE BONUS CONFIG ====================
export const PERFORMANCE_BONUSES = {
    // Clear dungeon without dying
    no_death: {
        extraRolls: 1,
        rarityCap: 'legendary' // This bonus roll can max drop legendary
    },
    // Clear in top 30% time (needs benchmark data)
    speed_clear: {
        extraRolls: 1,
        rarityCap: 'epic' // Speed bonus capped at epic
    },
    // Solo clear (no party)
    solo: {
        extraRolls: 1,
        rarityCap: 'legendary'
    },
    // Streak bonus: 7 consecutive clears
    streak_7: {
        extraRolls: 0,
        pityProgress: 10 // Add 10% to mythic pity
    }
};

// Rarity cap order (for limiting bonus rolls)
const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

/**
 * Weighted random pick from rarity weights
 * @param {Object} weights - { common: 55, uncommon: 25, ... }
 * @param {string|null} rarityCap - Max rarity allowed (null = no cap)
 * @returns {string} Selected rarity
 */
export function weightedPickRarity(weights, rarityCap = null) {
    // Build cumulative weights
    let cumulative = [];
    let total = 0;

    for (const rarity of RARITY_ORDER) {
        // Check cap
        if (rarityCap && RARITY_ORDER.indexOf(rarity) > RARITY_ORDER.indexOf(rarityCap)) {
            continue; // Skip rarities above cap
        }

        const weight = weights[rarity] || 0;
        total += weight;
        cumulative.push({ rarity, threshold: total });
    }

    // Roll
    const roll = Math.random() * total;

    for (const item of cumulative) {
        if (roll < item.threshold) {
            return item.rarity;
        }
    }

    return 'common'; // Fallback
}

/**
 * Pick random element (Ngũ Hành)
 * @returns {string} Random element
 */
export function pickRandomElement() {
    const elements = Object.values(MATERIAL_ELEMENTS);
    return elements[Math.floor(Math.random() * elements.length)];
}

/**
 * Pick random material template for a tier
 * @param {number} tier - Material tier (1-14)
 * @param {string|null} element - Preferred element or null for random
 * @returns {Object} Material template
 */
export function pickMaterialTemplate(tier, element = null) {
    // Find materials matching tier (or closest)
    let candidates = MATERIAL_TEMPLATES.filter(m => m.tier === tier);

    // If no exact match, find closest lower tier
    if (candidates.length === 0) {
        const lowerTiers = MATERIAL_TEMPLATES.filter(m => m.tier <= tier);
        if (lowerTiers.length > 0) {
            const maxTier = Math.max(...lowerTiers.map(m => m.tier));
            candidates = lowerTiers.filter(m => m.tier === maxTier);
        }
    }

    // Still no match? Use tier 1
    if (candidates.length === 0) {
        candidates = MATERIAL_TEMPLATES.filter(m => m.tier === 1);
    }

    // Filter by element if specified
    if (element) {
        const elementMatch = candidates.filter(m => m.element === element);
        if (elementMatch.length > 0) {
            candidates = elementMatch;
        }
    }

    return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * Calculate total rolls including bonuses
 * @param {string} difficulty - Dungeon difficulty
 * @param {Object} performance - { noDeath: bool, speedClear: bool, solo: bool, streak: number }
 * @returns {Object} { totalRolls, bonuses: [], bonusRolls: [{rarityCap: string}] }
 */
export function calculateRolls(difficulty, performance = {}) {
    const config = MATERIAL_DROP_CONFIG[difficulty];
    if (!config) {
        return { totalRolls: 1, bonuses: [], bonusRolls: [] };
    }

    let rolls = config.baseRolls;
    const bonuses = [];
    const bonusRolls = [];

    // Check performance bonuses
    if (performance.noDeath) {
        const bonus = PERFORMANCE_BONUSES.no_death;
        rolls += bonus.extraRolls;
        bonuses.push('no_death');
        bonusRolls.push({ rarityCap: bonus.rarityCap });
    }

    if (performance.speedClear) {
        const bonus = PERFORMANCE_BONUSES.speed_clear;
        rolls += bonus.extraRolls;
        bonuses.push('speed_clear');
        bonusRolls.push({ rarityCap: bonus.rarityCap });
    }

    if (performance.solo) {
        const bonus = PERFORMANCE_BONUSES.solo;
        rolls += bonus.extraRolls;
        bonuses.push('solo');
        bonusRolls.push({ rarityCap: bonus.rarityCap });
    }

    // Cap at max rolls
    rolls = Math.min(rolls, config.maxRolls);

    return {
        baseRolls: config.baseRolls,
        totalRolls: rolls,
        bonuses,
        bonusRolls
    };
}

/**
 * Main drop function - generates material drops for a dungeon clear
 * @param {string} difficulty - Dungeon difficulty
 * @param {number} dungeonTier - Required realm level of dungeon
 * @param {Object} performance - { noDeath: bool, speedClear: bool, solo: bool }
 * @returns {Object} { drops: [], dropMeta: {} }
 */
export function generateMaterialDrops(difficulty, dungeonTier, performance = {}) {
    const config = MATERIAL_DROP_CONFIG[difficulty];
    if (!config) {
        return { drops: [], dropMeta: { error: 'Invalid difficulty' } };
    }

    // Calculate rolls
    const rollInfo = calculateRolls(difficulty, performance);
    const drops = [];

    // Generate drops for each roll
    for (let i = 0; i < rollInfo.totalRolls; i++) {
        // Determine rarity cap for this roll
        let rarityCap = null;

        // Base rolls have no cap, bonus rolls have caps
        if (i >= config.baseRolls && rollInfo.bonusRolls[i - config.baseRolls]) {
            rarityCap = rollInfo.bonusRolls[i - config.baseRolls].rarityCap;
        }

        // Pick rarity
        const rarity = weightedPickRarity(config.rarityWeights, rarityCap);

        // Pick tier within range, but locked to dungeonTier
        const tier = dungeonTier;

        // Pick element randomly
        const element = pickRandomElement();

        // Pick material template
        const template = pickMaterialTemplate(tier, element);

        drops.push({
            templateId: template.id,
            name: template.name,
            rarity,
            tier: template.tier,
            element: template.element,
            icon: template.icon,
            qty: 1
        });
    }

    // Merge same materials (stack)
    const mergedDrops = mergeSameDrops(drops);

    return {
        drops: mergedDrops,
        dropMeta: {
            difficulty,
            dungeonTier,
            rollsBase: config.baseRolls,
            rollsBonus: rollInfo.totalRolls - config.baseRolls,
            totalRolls: rollInfo.totalRolls,
            bonuses: rollInfo.bonuses
        }
    };
}

/**
 * Merge drops with same templateId + rarity into stacks
 */
function mergeSameDrops(drops) {
    const merged = new Map();

    for (const drop of drops) {
        const key = `${drop.templateId}_${drop.rarity}`;
        if (merged.has(key)) {
            merged.get(key).qty += drop.qty;
        } else {
            merged.set(key, { ...drop });
        }
    }

    return Array.from(merged.values());
}

export default {
    MATERIAL_DROP_CONFIG,
    PERFORMANCE_BONUSES,
    weightedPickRarity,
    pickRandomElement,
    pickMaterialTemplate,
    calculateRolls,
    generateMaterialDrops
};
