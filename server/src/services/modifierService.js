/**
 * Modifier Service - Equipment Modifier Effects Engine
 * Handles modifier calculations and combat integration
 */

// ==================== MODIFIER DEFINITIONS ====================
export const MODIFIER_TYPES = {
    // Combat Offensive
    'crit_vs_higher_realm': {
        name: 'Phá Cản Chí Mệnh',
        description: 'Tăng {value}% tỷ lệ chí mạng khi đánh cảnh giới cao hơn',
        category: 'offensive',
        applyPhase: 'pre_attack'
    },
    'damage_when_low_hp': {
        name: 'Tuyệt Địa Phản Kích',
        description: 'Tăng {value}% sát thương khi HP dưới {trigger}%',
        category: 'offensive',
        applyPhase: 'pre_attack'
    },
    'first_strike_bonus': {
        name: 'Tiên Phát Chế Nhân',
        description: 'Tăng {value}% sát thương đòn tấn công đầu tiên',
        category: 'offensive',
        applyPhase: 'first_attack'
    },
    'last_hit_bonus': {
        name: 'Trảm Thảo Trừ Căn',
        description: 'Tăng {value}% sát thương khi địch dưới {trigger}% HP',
        category: 'offensive',
        applyPhase: 'pre_attack'
    },
    'lifesteal_on_crit': {
        name: 'Hút Huyết Chí Mệnh',
        description: 'Hút {value}% sát thương thành HP khi chí mạng',
        category: 'offensive',
        applyPhase: 'on_crit'
    },
    'penetration_vs_armor': {
        name: 'Phá Giáp Cường Công',
        description: 'Tăng {value}% xuyên giáp khi đối thủ có phòng thủ cao',
        category: 'offensive',
        applyPhase: 'pre_attack'
    },
    'speed_boost_combat': {
        name: 'Thần Tốc',
        description: 'Tăng {value} tốc độ trong chiến đấu',
        category: 'offensive',
        applyPhase: 'combat_start'
    },
    'mana_regen_combat': {
        name: 'Linh Khí Hồi Phục',
        description: 'Hồi {value} nguyên khí mỗi lượt',
        category: 'offensive',
        applyPhase: 'turn_start'
    },

    // Combat Defensive
    'damage_reduction_percent': {
        name: 'Kim Chung Hộ Thể',
        description: 'Giảm {value}% sát thương nhận vào',
        category: 'defensive',
        applyPhase: 'on_hit'
    },
    'block_chance': {
        name: 'Thiết Bích Phòng Ngự',
        description: '{value}% xác suất đỡ đòn (giảm 50% sát thương)',
        category: 'defensive',
        applyPhase: 'on_hit'
    },
    'reflect_damage': {
        name: 'Phản Thương',
        description: 'Phản đòn {value}% sát thương nhận vào',
        category: 'defensive',
        applyPhase: 'on_hit'
    },
    'counter_attack': {
        name: 'Phản Kích',
        description: '{value}% xác suất phản đòn khi bị tấn công',
        category: 'defensive',
        applyPhase: 'on_hit'
    },
    'dodge_after_hit': {
        name: 'Né Tránh Linh Hoạt',
        description: 'Tăng {value}% né tránh sau khi bị đánh (stack 3 lần)',
        category: 'defensive',
        applyPhase: 'on_hit'
    },
    'heal_on_kill': {
        name: 'Sát Địch Hồi Sinh',
        description: 'Hồi {value}% HP khi hạ gục đối thủ',
        category: 'defensive',
        applyPhase: 'on_kill'
    },

    // Elemental
    'element_damage_bonus': {
        name: 'Ngũ Hành Cường Hóa',
        description: 'Tăng {value}% sát thương {element}',
        category: 'elemental',
        applyPhase: 'pre_attack'
    },
    'element_resist_bonus': {
        name: 'Ngũ Hành Kháng Tính',
        description: 'Tăng {value}% kháng {element}',
        category: 'elemental',
        applyPhase: 'on_hit'
    },

    // Special / Out of combat
    'exp_bonus': {
        name: 'Tu Luyện Gia Tốc',
        description: 'Tăng {value}% kinh nghiệm nhận được',
        category: 'special',
        applyPhase: 'reward'
    },
    'spirit_stone_bonus': {
        name: 'Tụ Linh',
        description: 'Tăng {value}% linh thạch nhận được',
        category: 'special',
        applyPhase: 'reward'
    },
    'item_drop_bonus': {
        name: 'Tài Vận',
        description: 'Tăng {value}% tỷ lệ rơi vật phẩm',
        category: 'special',
        applyPhase: 'reward'
    }
};

// ==================== ELEMENT SYNERGY CONFIG ====================
export const ELEMENT_SYNERGY = {
    // 2-piece bonus
    '2_piece': {
        metal: { type: 'penetration_vs_armor', value: 5 },
        wood: { type: 'heal_on_kill', value: 3 },
        water: { type: 'mana_regen_combat', value: 10 },
        fire: { type: 'crit_vs_higher_realm', value: 5 },
        earth: { type: 'damage_reduction_percent', value: 3 }
    },
    // 4-piece bonus (stronger)
    '4_piece': {
        metal: { type: 'first_strike_bonus', value: 15 },
        wood: { type: 'dodge_after_hit', value: 8 },
        water: { type: 'lifesteal_on_crit', value: 10 },
        fire: { type: 'damage_when_low_hp', value: 20, trigger: 30 },
        earth: { type: 'block_chance', value: 10 }
    }
};

// ==================== MODIFIER ROLL CONFIG ====================
// Probability of getting modifiers based on rarity
export const MODIFIER_CHANCE_BY_RARITY = {
    common: { count: 0, chance: 0 },
    uncommon: { count: 1, chance: 30 }, // 30% chance for 1 modifier
    rare: { count: 1, chance: 60 },     // 60% chance for 1 modifier
    epic: { count: 1, chance: 100 },    // 100% chance for 1+ modifier
    legendary: { count: 2, chance: 100 }, // 2 modifiers guaranteed
    mythic: { count: 3, chance: 100 }     // 3 modifiers guaranteed
};

// Modifier value range by rarity
export const MODIFIER_VALUE_RANGE = {
    common: { min: 1, max: 3 },
    uncommon: { min: 2, max: 5 },
    rare: { min: 3, max: 8 },
    epic: { min: 5, max: 12 },
    legendary: { min: 8, max: 18 },
    mythic: { min: 12, max: 25 }
};

// ==================== CORE FUNCTIONS ====================

/**
 * Roll random modifiers for newly crafted equipment
 * @param {string} rarity - Equipment rarity
 * @param {string} element - Equipment element (optional)
 * @returns {Array} Array of modifier objects
 */
export function rollModifiers(rarity, element = null) {
    const config = MODIFIER_CHANCE_BY_RARITY[rarity];
    if (!config || config.count === 0) {
        return [];
    }

    const modifiers = [];
    const modifierTypes = Object.keys(MODIFIER_TYPES);
    const valueRange = MODIFIER_VALUE_RANGE[rarity];

    // Roll for each potential modifier
    for (let i = 0; i < config.count; i++) {
        if (Math.random() * 100 < config.chance || i === 0 && rarity !== 'uncommon') {
            // Pick random modifier type
            const availableTypes = modifierTypes.filter(t =>
                !modifiers.find(m => m.type === t) // No duplicates
            );

            if (availableTypes.length === 0) break;

            const randomType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
            const modDef = MODIFIER_TYPES[randomType];

            // Roll value
            const value = Math.floor(
                valueRange.min + Math.random() * (valueRange.max - valueRange.min + 1)
            );

            const modifier = {
                type: randomType,
                value,
                scope: 'all'
            };

            // Add trigger for certain types
            if (['damage_when_low_hp', 'last_hit_bonus'].includes(randomType)) {
                modifier.trigger = 30; // Default trigger threshold
            }

            // Add element for elemental types
            if (['element_damage_bonus', 'element_resist_bonus'].includes(randomType) && element) {
                modifier.element = element;
            }

            modifiers.push(modifier);
        }
    }

    return modifiers;
}

/**
 * Calculate total modifiers from all equipped items
 * @param {Array} equippedItems - Array of equipped items with modifiers
 * @returns {Object} Aggregated modifier effects
 */
export function calculateActiveModifiers(equippedItems) {
    const activeModifiers = {};

    for (const item of equippedItems) {
        if (!item.modifiers || !Array.isArray(item.modifiers)) continue;

        // Check durability - items with 0 durability don't apply modifiers
        if (item.durability && item.durability.current <= 0) continue;

        for (const mod of item.modifiers) {
            if (!activeModifiers[mod.type]) {
                activeModifiers[mod.type] = {
                    totalValue: 0,
                    sources: [],
                    trigger: mod.trigger,
                    element: mod.element,
                    scope: mod.scope
                };
            }

            activeModifiers[mod.type].totalValue += mod.value;
            activeModifiers[mod.type].sources.push({
                itemName: item.name,
                value: mod.value
            });
        }
    }

    return activeModifiers;
}

/**
 * Calculate element synergy bonus from equipped items
 * @param {Array} equippedItems - Array of equipped items
 * @returns {Object} Synergy bonuses { element, pieces, bonuses }
 */
export function calculateElementSynergy(equippedItems) {
    const elementCounts = {};

    for (const item of equippedItems) {
        if (item.element) {
            elementCounts[item.element] = (elementCounts[item.element] || 0) + 1;
        }
    }

    const synergies = {};

    for (const [element, count] of Object.entries(elementCounts)) {
        if (count >= 4 && ELEMENT_SYNERGY['4_piece'][element]) {
            synergies[element] = {
                pieces: count,
                bonus: ELEMENT_SYNERGY['4_piece'][element],
                tier: '4_piece'
            };
        } else if (count >= 2 && ELEMENT_SYNERGY['2_piece'][element]) {
            synergies[element] = {
                pieces: count,
                bonus: ELEMENT_SYNERGY['2_piece'][element],
                tier: '2_piece'
            };
        }
    }

    return synergies;
}

/**
 * Apply modifiers to combat stats before battle
 * @param {Object} baseStats - Base combat stats
 * @param {Object} activeModifiers - Calculated active modifiers
 * @param {Object} context - Combat context { enemyRealm, playerRealm, isPvE, etc }
 * @returns {Object} Modified combat stats
 */
export function applyPreCombatModifiers(baseStats, activeModifiers, context = {}) {
    const stats = { ...baseStats };

    // Speed boost
    if (activeModifiers['speed_boost_combat']) {
        stats.speed = (stats.speed || 0) + activeModifiers['speed_boost_combat'].totalValue;
    }

    // Crit vs higher realm
    if (activeModifiers['crit_vs_higher_realm'] && context.enemyRealm > context.playerRealm) {
        stats.criticalRate = (stats.criticalRate || 0) + activeModifiers['crit_vs_higher_realm'].totalValue;
    }

    return stats;
}

/**
 * Calculate damage modifier based on combat context
 * @param {number} baseDamage - Base damage
 * @param {Object} activeModifiers - Active modifiers
 * @param {Object} context - Combat context
 * @returns {Object} { finalDamage, bonuses }
 */
export function calculateDamageModifiers(baseDamage, activeModifiers, context = {}) {
    let damage = baseDamage;
    const bonuses = [];

    // First strike bonus
    if (activeModifiers['first_strike_bonus'] && context.isFirstAttack) {
        const bonus = damage * (activeModifiers['first_strike_bonus'].totalValue / 100);
        damage += bonus;
        bonuses.push({ type: 'first_strike_bonus', value: bonus });
    }

    // Low HP bonus
    if (activeModifiers['damage_when_low_hp'] && context.playerHpPercent < (activeModifiers['damage_when_low_hp'].trigger || 30)) {
        const bonus = damage * (activeModifiers['damage_when_low_hp'].totalValue / 100);
        damage += bonus;
        bonuses.push({ type: 'damage_when_low_hp', value: bonus });
    }

    // Last hit bonus
    if (activeModifiers['last_hit_bonus'] && context.enemyHpPercent < (activeModifiers['last_hit_bonus'].trigger || 30)) {
        const bonus = damage * (activeModifiers['last_hit_bonus'].totalValue / 100);
        damage += bonus;
        bonuses.push({ type: 'last_hit_bonus', value: bonus });
    }

    // Penetration vs armor
    if (activeModifiers['penetration_vs_armor'] && context.enemyDefense > 100) {
        const bonus = damage * (activeModifiers['penetration_vs_armor'].totalValue / 100);
        damage += bonus;
        bonuses.push({ type: 'penetration_vs_armor', value: bonus });
    }

    // Element damage bonus
    if (activeModifiers['element_damage_bonus'] && context.attackElement === activeModifiers['element_damage_bonus'].element) {
        const bonus = damage * (activeModifiers['element_damage_bonus'].totalValue / 100);
        damage += bonus;
        bonuses.push({ type: 'element_damage_bonus', value: bonus });
    }

    return {
        finalDamage: Math.floor(damage),
        bonuses
    };
}

/**
 * Calculate damage taken with defensive modifiers
 * @param {number} incomingDamage - Damage before mitigation
 * @param {Object} activeModifiers - Active modifiers
 * @param {Object} context - Combat context
 * @returns {Object} { finalDamage, blocked, reflected, effects }
 */
export function calculateDefensiveModifiers(incomingDamage, activeModifiers, context = {}) {
    let damage = incomingDamage;
    const effects = [];
    let blocked = false;
    let reflected = 0;

    // Block chance
    if (activeModifiers['block_chance'] && Math.random() * 100 < activeModifiers['block_chance'].totalValue) {
        damage = Math.floor(damage * 0.5);
        blocked = true;
        effects.push({ type: 'block_chance', message: 'Đỡ đòn!' });
    }

    // Damage reduction
    if (activeModifiers['damage_reduction_percent']) {
        const reduction = damage * (activeModifiers['damage_reduction_percent'].totalValue / 100);
        damage -= reduction;
        effects.push({ type: 'damage_reduction_percent', value: reduction });
    }

    // Reflect damage
    if (activeModifiers['reflect_damage']) {
        reflected = Math.floor(incomingDamage * (activeModifiers['reflect_damage'].totalValue / 100));
        effects.push({ type: 'reflect_damage', value: reflected });
    }

    // Element resist
    if (activeModifiers['element_resist_bonus'] && context.attackElement === activeModifiers['element_resist_bonus'].element) {
        const reduction = damage * (activeModifiers['element_resist_bonus'].totalValue / 100);
        damage -= reduction;
        effects.push({ type: 'element_resist_bonus', value: reduction });
    }

    return {
        finalDamage: Math.max(0, Math.floor(damage)),
        blocked,
        reflected,
        effects
    };
}

/**
 * Calculate reward bonuses from modifiers
 * @param {Object} baseRewards - { exp, spiritStones }
 * @param {Object} activeModifiers - Active modifiers
 * @returns {Object} Modified rewards
 */
export function calculateRewardModifiers(baseRewards, activeModifiers) {
    const rewards = { ...baseRewards };
    const bonuses = [];

    if (activeModifiers['exp_bonus']) {
        const bonus = Math.floor(rewards.exp * (activeModifiers['exp_bonus'].totalValue / 100));
        rewards.exp += bonus;
        bonuses.push({ type: 'exp_bonus', value: bonus });
    }

    if (activeModifiers['spirit_stone_bonus']) {
        const bonus = Math.floor(rewards.spiritStones * (activeModifiers['spirit_stone_bonus'].totalValue / 100));
        rewards.spiritStones += bonus;
        bonuses.push({ type: 'spirit_stone_bonus', value: bonus });
    }

    return { rewards, bonuses };
}

/**
 * Reduce durability after combat
 * Chỉ có 30% cơ hội giảm độ bền mỗi trận để tránh hao mòn quá nhanh
 * @param {Object} equipment - Equipment document
 * @param {number} amount - Durability loss
 * @param {boolean} guaranteed - Nếu true, luôn giảm (không random)
 * @returns {Object} Updated durability info
 */
export function reduceDurability(equipment, amount = 1, guaranteed = false) {
    if (!equipment.durability) {
        equipment.durability = { current: 100, max: 100 };
    }

    const oldCurrent = equipment.durability.current;
    
    // Chỉ 30% cơ hội giảm độ bền (trừ khi guaranteed)
    const shouldReduce = guaranteed || Math.random() < 0.3;
    
    if (shouldReduce) {
        equipment.durability.current = Math.max(0, equipment.durability.current - amount);
    }

    return {
        oldCurrent,
        newCurrent: equipment.durability.current,
        max: equipment.durability.max,
        isBroken: equipment.durability.current <= 0,
        reduced: shouldReduce
    };
}

/**
 * Repair equipment durability
 * @param {Object} equipment - Equipment document
 * @param {number} amount - Amount to repair (or 'full')
 * @returns {Object} Updated durability info
 */
export function repairDurability(equipment, amount = 'full') {
    if (!equipment.durability) {
        equipment.durability = { current: 100, max: 100 };
        return equipment.durability;
    }

    if (amount === 'full') {
        equipment.durability.current = equipment.durability.max;
    } else {
        equipment.durability.current = Math.min(
            equipment.durability.max,
            equipment.durability.current + amount
        );
    }

    return equipment.durability;
}

/**
 * Check if player can equip item (realm lock)
 * @param {number} playerRealm - Player's realm level
 * @param {Object} equipment - Equipment to check
 * @returns {Object} { canEquip, reason }
 */
export function checkRealmLock(playerRealm, equipment) {
    const requiredRealm = equipment.realm_required || equipment.level_required || 1;

    if (playerRealm < requiredRealm) {
        return {
            canEquip: false,
            reason: `Yêu cầu cảnh giới ${requiredRealm}, bạn đang ở cảnh giới ${playerRealm}`
        };
    }

    return { canEquip: true };
}

export default {
    MODIFIER_TYPES,
    ELEMENT_SYNERGY,
    MODIFIER_CHANCE_BY_RARITY,
    rollModifiers,
    calculateActiveModifiers,
    calculateElementSynergy,
    applyPreCombatModifiers,
    calculateDamageModifiers,
    calculateDefensiveModifiers,
    calculateRewardModifiers,
    reduceDurability,
    repairDurability,
    checkRealmLock
};
