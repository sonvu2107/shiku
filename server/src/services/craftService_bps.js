/**
 * Craft Service - BPS (Basis Points System) for Pity
 * Production-grade probability system with validation
 */

// ==================== BPS PROBABILITY TABLES ====================
// All probabilities in basis points (10000 = 100%)
// Sum MUST equal 10000 for each table

export const CRAFT_PROBABILITIES_BPS = {
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

/**
 * Roll rarity from BPS table
 * @param {object} table - Probability table in BPS (sum = 10000)
 * @returns {string} - Rarity key
 */
export function rollRarityBPS(table) {
    const roll = Math.floor(Math.random() * 10000);
    let cumulative = 0;
    
    for (const [rarity, bps] of Object.entries(table)) {
        cumulative += bps;
        if (roll < cumulative) return rarity;
    }
    
    // Fallback: return last non-zero
    const entries = Object.entries(table);
    for (let i = entries.length - 1; i >= 0; i--) {
        if (entries[i][1] > 0) return entries[i][0];
    }
    
    return 'rare'; // Ultimate fallback
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
export function validateAllTables() {
    console.log('[BPS] Validating probability tables...');
    
    for (const [tableKey, table] of Object.entries(CRAFT_PROBABILITIES_BPS)) {
        validateBPSTable(table, tableKey);
    }
    
    console.log('[BPS] ✓ All tables valid');
}
