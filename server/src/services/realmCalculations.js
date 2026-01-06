import { CULTIVATION_REALMS } from "../models/Cultivation.js";

/**
 * Pure function: Get realm info from exp (no doc needed)
 */
export function getRealmFromExpPure(exp) {
    for (let i = CULTIVATION_REALMS.length - 1; i >= 0; i--) {
        if (exp >= CULTIVATION_REALMS[i].minExp) return CULTIVATION_REALMS[i];
    }
    return CULTIVATION_REALMS[0];
}

/**
 * Pure function: Calculate realm progress percentage
 */
export function getRealmProgressPure(exp, currentRealmLevel) {
    const currentRealm = CULTIVATION_REALMS.find(r => r.level === currentRealmLevel) || CULTIVATION_REALMS[0];
    if (currentRealm.level >= 14) return 100;

    const progressInRealm = exp - currentRealm.minExp;
    const realmRange = currentRealm.maxExp - currentRealm.minExp + 1;
    return Math.min(100, Math.floor((progressInRealm / realmRange) * 100));
}

/**
 * Pure function: Calculate sub-level from progress percentage
 */
export function calculateSubLevelPure(progressPercent) {
    return Math.max(1, Math.ceil(progressPercent / 10));
}

/**
 * Pure function: Check if user can breakthrough to next realm
 */
export function canBreakthroughPure(exp, currentRealmLevel) {
    const potential = getRealmFromExpPure(exp);
    return potential.level > currentRealmLevel;
}

/**
 * Get base combat stats from realm level
 * Higher realm = higher base stats
 */
export function getRealmStats(realmLevel, subLevel = 1) {
    // Base multiplier increases exponentially with realm
    const baseMultiplier = Math.pow(1.5, realmLevel - 1);
    const subLevelBonus = 1 + (subLevel - 1) * 0.05; // 5% per sub-level

    return {
        attack: Math.floor(100 * baseMultiplier * subLevelBonus),
        defense: Math.floor(80 * baseMultiplier * subLevelBonus),
        qiBlood: Math.floor(500 * baseMultiplier * subLevelBonus),
        zhenYuan: Math.floor(200 * baseMultiplier * subLevelBonus),
        speed: Math.floor(50 + realmLevel * 10 + subLevel)
    };
}
