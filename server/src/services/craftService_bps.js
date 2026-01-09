/**
 * Craft Service - BPS (Basis Points System) for Pity
 * Production-grade probability system with validation
 */

// ==================== BPS PROBABILITY TABLES ====================
// All probabilities in basis points (10000 = 100%)
// Sum MUST equal 10000 for each table

export const CRAFT_PROBABILITIES_BPS = {
    common: {
        common: 9000,    // 90%
        uncommon: 1000,  // 10%
        rare: 0,
        epic: 0,
        legendary: 0,
        mythic: 0
    },
    uncommon: {
        common: 1000,    // 10%
        uncommon: 6000,  // 60%
        rare: 3000,      // 30%
        epic: 0,
        legendary: 0,
        mythic: 0
    },
    rare: {
        common: 0,
        uncommon: 3000,  // 30%
        rare: 6000,      // 60%
        epic: 1000,      // 10%
        legendary: 0,
        mythic: 0
    },
    epic: {
        rare: 4000,      // 40%
        epic: 5000,      // 50%
        legendary: 1000, // 10%
        mythic: 0        //  0%
    },
    legendary: {
        rare: 0,         //  0%
        epic: 5000,      // 50%
        legendary: 4800, // 48%
        mythic: 200      //  2%
    },
    mythic: {
        rare: 0,         //  0%
        epic: 3000,      // 30%
        legendary: 6000, // 60%
        mythic: 1000     // 10%
    }
};

// ==================== PITY CONFIG ====================
const PITY_CONFIG = {
    epic: {
        targetRarity: 'legendary',
        incrementPerFail: 100,  // +1% per fail (100 bps)
        maxBonus: 5000,         // Max +50% bonus
        takeFrom: ['rare', 'epic'] // Take weight from these
    },
    legendary: {
        targetRarity: 'mythic',
        incrementPerFail: 20,   // +0.2% per fail (20 bps)
        maxBonus: 1000,         // Max +10% bonus
        takeFrom: ['epic', 'legendary'] // Take weight from these
    }
};

/**
 * Get pity config for table (null if no pity for this table)
 */
export function getPityConfig(tableKey) {
    return PITY_CONFIG[tableKey] || null;
}

/**
 * Apply pity bonus to probability table (BPS)
 * @param {object} baseTable - Base probabilities in BPS
 * @param {string} targetRarity - Rarity to boost
 * @param {number} bonusBPS - Bonus in basis points
 * @param {string[]} takeFrom - Rarities to reduce
 * @returns {object} - New table with pity applied
 */
export function applyPityBPS(baseTable, targetRarity, bonusBPS, takeFrom = []) {
    const result = { ...baseTable };

    // Add bonus to target
    result[targetRarity] = (result[targetRarity] || 0) + bonusBPS;

    // Remove from others proportionally
    const totalToTake = takeFrom.reduce((sum, r) => sum + (baseTable[r] || 0), 0);

    if (totalToTake === 0) {
        // Fallback: take from ALL non-target
        const allKeys = Object.keys(baseTable).filter(k => k !== targetRarity);
        const allTotal = allKeys.reduce((sum, k) => sum + baseTable[k], 0);

        if (allTotal > 0) {
            allKeys.forEach(k => {
                const ratio = baseTable[k] / allTotal;
                result[k] = Math.max(0, result[k] - Math.floor(bonusBPS * ratio));
            });
        }
        return result;
    }

    // Normal case: take proportionally from specified
    takeFrom.forEach(rarity => {
        const ratio = (baseTable[rarity] || 0) / totalToTake;
        const toReduce = Math.floor(bonusBPS * ratio);
        result[rarity] = Math.max(0, (result[rarity] || 0) - toReduce);
    });

    return result;
}

export const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

const RARITY_CAPS_BPS = {
    common: 10000,
    uncommon: 9000,
    rare: 8000,
    epic: 5000,      // Cap at 50%
    legendary: 2000, // Cap at 20%
    mythic: 800      // Cap at 8%
};

/**
 * Apply multiplier bonus to target rarity with CAP
 * Porduction-grade: Strict Sum=10000, Non-negative, Deterministic Order
 * @param {object} baseTable - Base BPS table
 * @param {string} targetRarity - Rarity to boost
 * @param {number} bonusPercent - Percentage increase (e.g. 20 for +20%)
 * @returns {object} - New table
 */
export function applyBonusBPS(baseTable, targetRarity, bonusPercent) {
    const result = { ...baseTable };
    const currentVal = result[targetRarity] || 0;

    // 1. Calculate new value with Multiplier
    let newVal = Math.floor(currentVal * (1 + bonusPercent / 100));

    // 2. Apply Cap
    const cap = RARITY_CAPS_BPS[targetRarity] || 10000;
    newVal = Math.min(newVal, cap);

    // 3. Calculate Delta
    const delta = newVal - currentVal;
    if (delta <= 0) return result; // No change if capped or zero

    result[targetRarity] = newVal;

    // 4. Distribute reduction across others
    const others = RARITY_ORDER.filter(k => k !== targetRarity);
    const totalOthers = others.reduce((sum, k) => sum + (result[k] || 0), 0);

    if (totalOthers > 0) {
        others.forEach(k => {
            const ratio = (result[k] || 0) / totalOthers;
            const reduction = Math.floor(delta * ratio);
            result[k] = Math.max(0, (result[k] || 0) - reduction);
        });
    }

    // 5. Strict Normalization (Fix Rounding Errors)
    const sum = RARITY_ORDER.reduce((acc, key) => acc + (result[key] || 0), 0);
    let diff = 10000 - sum;

    if (diff !== 0) {
        if (diff > 0) {
            // Underflow: Add to largest non-target (sort safest)
            // or just add to common if not target.
            const dumpKey = targetRarity === 'common' ? 'uncommon' : 'common';
            result[dumpKey] = (result[dumpKey] || 0) + diff;
        } else {
            // Overflow (diff < 0): Subtract from largest non-targets iteratively
            // Use RARITY_ORDER to be deterministic or value sort
            const sortedOthers = [...others].sort((a, b) => (result[b] || 0) - (result[a] || 0));

            let remainToRemove = -diff;
            for (const key of sortedOthers) {
                if (remainToRemove <= 0) break;
                const current = result[key] || 0;
                // Don't reduce to 0 ideally but if needed
                const canRemove = Math.min(current, remainToRemove);

                result[key] -= canRemove;
                remainToRemove -= canRemove;
            }

            // Safeguard: if still remaining, remove from target
            if (remainToRemove > 0) {
                result[targetRarity] = Math.max(0, result[targetRarity] - remainToRemove);
            }
        }
    }

    return result;
}

/**
 * Roll rarity from BPS table
 * @param {object} table - Probability table in BPS (sum = 10000)
 * @returns {string} - Rarity key
 */
export function rollRarityBPS(table) {
    const roll = Math.floor(Math.random() * 10000);
    let cumulative = 0;

    // Use RARITY_ORDER to ensure deterministic rolling order
    for (const rarity of RARITY_ORDER) {
        const bps = table[rarity] || 0;
        if (bps === 0) continue;

        cumulative += bps;
        if (roll < cumulative) return rarity;
    }

    // Fallback: return last non-zero
    for (let i = RARITY_ORDER.length - 1; i >= 0; i--) {
        const r = RARITY_ORDER[i];
        if ((table[r] || 0) > 0) return r;
    }

    return 'common'; // Ultimate fallback
}

/**
 * Validate BPS table (dev-only, throws on error)
 * @param {object} table - Table to validate
 * @param {string} tableKey - Table identifier for error message
 */
export function validateBPSTable(table, tableKey) {
    if (!table || typeof table !== 'object') {
        throw new Error(`BPS table invalid: ${tableKey} is not an object`);
    }

    const sum = Object.values(table).reduce((a, b) => a + b, 0);

    if (sum !== 10000) {
        throw new Error(
            `BPS table invalid: ${tableKey} sum=${sum} (expected 10000)\n` +
            JSON.stringify(table, null, 2)
        );
    }

    // Check for negative
    for (const [rarity, bps] of Object.entries(table)) {
        if (bps < 0) {
            throw new Error(`BPS table invalid: ${tableKey}.${rarity} = ${bps} (negative)`);
        }
    }
}

/**
 * Validate ALL tables at server startup
 */
/**
 * Calculate weighted BPS table based on all input materials
 * Average of all material's base probabilities
 */
export function calculateWeightedBPSTable(materials) {
    const finalTable = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0, mythic: 0 };

    const count = materials.length;
    if (count === 0) return CRAFT_PROBABILITIES_BPS.common;

    for (const mat of materials) {
        // Get rarity of this material. 
        // If config missing, fallback to common
        const matRarity = mat.rarity || 'common';
        const baseTable = CRAFT_PROBABILITIES_BPS[matRarity] || CRAFT_PROBABILITIES_BPS.common;

        for (const [r, bps] of Object.entries(baseTable)) {
            if (finalTable[r] !== undefined) {
                finalTable[r] += bps;
            }
        }
    }

    // Average
    for (const r of Object.keys(finalTable)) {
        finalTable[r] = Math.floor(finalTable[r] / count);
    }

    // Normalize to 10000 (handle rounding errors)
    const sum = Object.values(finalTable).reduce((a, b) => a + b, 0);
    const diff = 10000 - sum;

    // Safety: Handle rounding errors strictly
    if (diff > 0) {
        // Underflow: Add to 'common' (safest bucket)
        finalTable.common = (finalTable.common || 0) + diff;
    } else if (diff < 0) {
        // Overflow: Subtract iteratively starting from 'common' up to 'mythic'
        // This ensures we never make a bucket negative
        let remainToRemove = -diff;
        for (const key of RARITY_ORDER) {
            if (remainToRemove <= 0) break;
            const current = finalTable[key] || 0;
            const toRemove = Math.min(current, remainToRemove);

            finalTable[key] = current - toRemove;
            remainToRemove -= toRemove;
        }

        // If remainToRemove > 0 here, it means the table sum was > 10000 
        // and we couldn't remove enough even after zeroing everything. 
        // This theoretically shouldn't happen with valid inputs.
    }

    return finalTable;
}

export function validateAllTables() {
    console.log('[BPS] Validating probability tables...');

    for (const [tableKey, table] of Object.entries(CRAFT_PROBABILITIES_BPS)) {
        validateBPSTable(table, tableKey);
    }

    console.log('[BPS] ✓ All tables valid');
}
