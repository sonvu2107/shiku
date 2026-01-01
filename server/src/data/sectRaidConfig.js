// data/sectRaidConfig.js
// Configuration for Sect Raid (Thần Thú Tông Môn) - Option A

/**
 * Attack Types Configuration
 * - multiplier: damage = playerAttack × multiplier
 * - cooldownMs: cooldown in milliseconds
 * - label: skill name for display
 */
export const RAID_ATTACKS = {
    basic: {
        multiplier: 0.5,  // 50% of player attack
        cooldownMs: 1000, // 1 second
        label: "Chưởng Thường"
    },
    artifact: {
        multiplier: 1.5,  // 150% of player attack
        cooldownMs: 15000, // 15 seconds
        label: "Pháp Bảo"
    },
    ultimate: {
        multiplier: 4.0,  // 400% of player attack
        cooldownMs: 6 * 60 * 60 * 1000, // 6 hours
        label: "Tuyệt Kỹ Tông Môn"
    }
};

/**
 * Flavor effects for battle log (randomly selected)
 */
export const FLAVOR_EFFECTS = [
    "Thiên Lôi",
    "Huyết Vũ",
    "Chấn Nhiếp",
    "Xích Diệm",
    "Hàn Băng",
    "Huyền Phong"
];

/**
 * Weekly contribution bonus formula
 * bonus = floor(min(weeklyEnergy, maxEnergy) / divisor)
 */
export const BONUS_CONFIG = {
    maxEnergy: 500,
    divisor: 50,
    maxBonus: 10
};

/**
 * Helper: Calculate damage for an attack using player's combat stats
 * @param {string} attackType - 'basic' | 'artifact' | 'ultimate'
 * @param {Object} playerStats - Player's combat stats from cultivation.calculateCombatStats()
 * @param {number} weeklyEnergy - User's weekly contribution energy
 * @returns {{ damage: number, isCrit: boolean, label: string, flavorEffect: string }}
 */
export function calculateRaidDamage(attackType, playerStats, weeklyEnergy = 0) {
    const attack = RAID_ATTACKS[attackType];
    if (!attack) {
        throw new Error("INVALID_ATTACK_TYPE");
    }

    // Default stats if no cultivation data
    const stats = playerStats || { attack: 10, criticalRate: 5, criticalDamage: 150 };

    // Base damage from player's attack stat × skill multiplier
    const baseDamage = Math.floor(stats.attack * attack.multiplier);

    // Weekly bonus (capped)
    const cappedEnergy = Math.min(weeklyEnergy, BONUS_CONFIG.maxEnergy);
    const weeklyBonus = Math.floor(cappedEnergy / BONUS_CONFIG.divisor);

    // Crit check using player's criticalRate
    const critChance = (stats.criticalRate || 5) / 100; // Convert percentage to decimal
    const isCrit = Math.random() < critChance;

    // Crit multiplier from player's criticalDamage (e.g. 150 = 1.5x, 200 = 2x)
    const critMult = isCrit ? (stats.criticalDamage || 150) / 100 : 1;

    // Final damage (always at least 1)
    const damage = Math.max(1, Math.floor((baseDamage + weeklyBonus) * critMult));

    // Random flavor effect
    const flavorEffect = FLAVOR_EFFECTS[Math.floor(Math.random() * FLAVOR_EFFECTS.length)];

    return {
        damage,
        isCrit,
        label: attack.label,
        flavorEffect
    };
}

/**
 * Helper: Check if attack is on cooldown
 * @param {Date|null} lastAttackAt - Timestamp of last attack
 * @param {string} attackType - 'basic' | 'artifact' | 'ultimate'
 * @returns {number} - Remaining cooldown in ms (0 if ready)
 */
export function getCooldownRemaining(lastAttackAt, attackType) {
    if (!lastAttackAt) return 0;

    const attack = RAID_ATTACKS[attackType];
    if (!attack) return 0;

    const elapsed = Date.now() - new Date(lastAttackAt).getTime();
    const remaining = attack.cooldownMs - elapsed;

    return Math.max(0, remaining);
}
