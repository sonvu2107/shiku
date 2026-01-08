import { executeSkill, applyStatusEffects } from './combatSkillService.js';

/**
 * Battle Engine Service
 * Centralizes all combat simulation logic for PK, Arena, and Dungeon.
 */

// ==================== HELPER FUNCTIONS ====================

/**
 * Calculate hit chance based on accuracy and dodge
 */
export function calculateHitChance(accuracy, dodge) {
    // Improved formula: accuracy reduces dodge effectiveness multiplicative
    const accuracyFactor = Math.min(accuracy / 100, 1.5);
    const dodgeReduction = dodge / (dodge + accuracy);
    const hitChance = accuracyFactor * (1 - dodgeReduction);
    // Clamp between 5% and 95%
    return Math.max(0.05, Math.min(hitChance, 0.95));
}

/**
 * Simulate a single battle between two entities
 * @param {Object} challengerStats - Combat stats of the attacker/challenger
 * @param {Object} opponentStats - Combat stats of the defender/opponent
 * @param {Array} challengerSkills - Skills arrays for challenger
 * @param {Array} opponentSkills - Skills arrays for opponent
 * @param {Object|null} options - Additional options (e.g., nghichThienMeta for PK damage reduction)
 * @returns {Object} Battle result with logs, winner, etc.
 */
export const simulateBattle = (challengerStats, opponentStats, challengerSkills = [], opponentSkills = [], options = {}) => {
    const {
        nghichThienMeta = null, // PK specific damage reduction
        maxTurns = 50,
        isDungeon = false
    } = options;

    const logs = [];

    // Initialize HP
    let challengerHp = challengerStats.qiBlood;
    let opponentHp = opponentStats.qiBlood;
    const challengerMaxHp = challengerStats.maxQiBlood || challengerStats.qiBlood;
    const opponentMaxHp = opponentStats.maxQiBlood || opponentStats.qiBlood;

    // Initialize Mana
    let challengerMana = challengerStats.zhenYuan || 0;
    let opponentMana = opponentStats.zhenYuan || 0;
    const challengerMaxMana = challengerStats.maxZhenYuan || challengerStats.zhenYuan || 0;
    const opponentMaxMana = opponentStats.maxZhenYuan || opponentStats.zhenYuan || 0;

    let turn = 0;
    let totalDamageByChallenger = 0;
    let totalDamageByOpponent = 0;

    // Skill cooldowns tracking
    const challengerSkillCooldowns = {};
    const opponentSkillCooldowns = {};
    challengerSkills.forEach(s => challengerSkillCooldowns[s.techniqueId || s.name] = 0);
    opponentSkills.forEach(s => opponentSkillCooldowns[s.techniqueId || s.name] = 0);

    // Buff/Debuff tracking
    let challengerBuffs = [];
    let challengerDebuffs = [];
    let opponentBuffs = [];
    let opponentDebuffs = [];

    // Determine initial turn order
    let currentAttacker = challengerStats.speed >= opponentStats.speed ? 'challenger' : 'opponent';

    while (challengerHp > 0 && opponentHp > 0 && turn < maxTurns) {
        turn++;

        const attacker = currentAttacker === 'challenger' ? challengerStats : opponentStats;
        const defender = currentAttacker === 'challenger' ? opponentStats : challengerStats;
        const attackerSkills = currentAttacker === 'challenger' ? challengerSkills : opponentSkills;
        const attackerCooldowns = currentAttacker === 'challenger' ? challengerSkillCooldowns : opponentSkillCooldowns;
        const attackerMaxMana = currentAttacker === 'challenger' ? challengerMaxMana : opponentMaxMana;

        // --- START TURN PHASE ---

        // Reduce cooldowns
        Object.keys(attackerCooldowns).forEach(key => {
            if (attackerCooldowns[key] > 0) attackerCooldowns[key]--;
        });

        // Mana regeneration (5% per turn) for more frequent skill usage
        const manaRegen = Math.floor(attackerMaxMana * 0.05);
        if (currentAttacker === 'challenger') {
            challengerMana = Math.min(challengerMaxMana, challengerMana + manaRegen);
        } else {
            opponentMana = Math.min(opponentMaxMana, opponentMana + manaRegen);
        }

        // Variable to track current mana for skill check
        let currentMana = currentAttacker === 'challenger' ? challengerMana : opponentMana;

        // --- SKILL SELECTION PHASE ---
        let usedSkill = null;
        let skillDamageBonus = 0;
        let skillResult = null;
        let manaConsumed = 0;

        for (const skill of attackerSkills) {
            const skillId = skill.techniqueId || skill.name;
            const cost = skill.manaCost !== undefined ? skill.manaCost : 10;

            if (attackerCooldowns[skillId] <= 0 && currentMana >= cost) {
                usedSkill = skill;
                manaConsumed = cost;
                attackerCooldowns[skillId] = skill.cooldown !== undefined ? skill.cooldown : 3;

                // Prepare context for skill execution
                const attackerContext = {
                    ...attacker,
                    maxQiBlood: currentAttacker === 'challenger' ? challengerMaxHp : opponentMaxHp,
                    qiBlood: currentAttacker === 'challenger' ? challengerHp : opponentHp,
                    maxZhenYuan: attackerMaxMana,
                    zhenYuan: currentMana
                };
                const defenderContext = {
                    ...defender,
                    maxQiBlood: currentAttacker === 'challenger' ? opponentMaxHp : challengerMaxHp,
                    qiBlood: currentAttacker === 'challenger' ? opponentHp : challengerHp
                };

                // Execute skill
                skillResult = executeSkill(skill, attackerContext, defenderContext);

                // Process immediate skill results
                skillDamageBonus = skillResult.damage; // Base skill damage

                // Update resources
                currentMana = Math.max(0, currentMana - manaConsumed);
                if (skillResult.manaRestore > 0) {
                    currentMana = Math.min(attackerMaxMana, currentMana + skillResult.manaRestore);
                }

                // Update attacker HP (Self-heal)
                if (skillResult.healing > 0) {
                    if (currentAttacker === 'challenger') {
                        challengerHp = Math.min(challengerMaxHp, challengerHp + skillResult.healing);
                    } else {
                        opponentHp = Math.min(opponentMaxHp, opponentHp + skillResult.healing);
                    }
                }

                // Push Buffs/Debuffs
                if (skillResult.buffs?.length > 0) {
                    if (currentAttacker === 'challenger') challengerBuffs.push(...skillResult.buffs);
                    else opponentBuffs.push(...skillResult.buffs);
                }
                if (skillResult.debuffs?.length > 0) {
                    if (currentAttacker === 'challenger') opponentDebuffs.push(...skillResult.debuffs);
                    else challengerDebuffs.push(...skillResult.debuffs);
                }

                break; // Use only one skill per turn
            }
        }

        // Sync mana back to main variables
        if (currentAttacker === 'challenger') challengerMana = currentMana;
        else opponentMana = currentMana;


        // --- STATS RECALCULATION PHASE (Buffs/Debuffs) ---
        let effectiveAttacker = { ...attacker };
        let effectiveDefender = { ...defender };

        if (currentAttacker === 'challenger') {
            if (challengerBuffs.length > 0) effectiveAttacker = applyStatusEffects(effectiveAttacker, challengerBuffs);
            if (opponentDebuffs.length > 0) effectiveDefender = applyStatusEffects(effectiveDefender, opponentDebuffs);
        } else {
            if (opponentBuffs.length > 0) effectiveAttacker = applyStatusEffects(effectiveAttacker, opponentBuffs);
            if (challengerDebuffs.length > 0) effectiveDefender = applyStatusEffects(effectiveDefender, challengerDebuffs);
        }


        // --- ACTION PHASE ---

        let damage = 0;
        let isCritical = false;
        let isDodged = false;
        let lifestealHealed = 0;
        let regenerationHealed = 0;
        let description = '';
        let actualDamageDealt = 0;

        // 1. Check Stun
        if (effectiveAttacker.stunned) {
            description = `Bị choáng! Không thể hành động!`;
        } else {
            // 2. Check Hit/Dodge
            const hitChance = calculateHitChance(effectiveAttacker.accuracy || 100, effectiveDefender.dodge || 0);
            isDodged = Math.random() > hitChance;

            if (isDodged) {
                description = `Đòn đánh bị né tránh!`;
            } else {
                // 3. Calculate Base Damage
                let effectiveDefense = effectiveDefender.defense || 0;

                // Handle Ignore Defense
                if (effectiveAttacker.ignoreDef) {
                    effectiveDefense = 0;
                } else {
                    const penetration = effectiveAttacker.penetration || 0;
                    effectiveDefense = effectiveDefense * (1 - Math.min(penetration, 80) / 100);
                }

                // Improved defense scaling: DEF now reduces 70% of its value from damage
                damage = Math.max(1, (effectiveAttacker.attack || 0) - effectiveDefense * 0.7);

                // Add Skill Damage (before other multipliers)
                if (skillDamageBonus > 0) damage += skillDamageBonus;

                // Resistance Reduction
                const resistance = effectiveDefender.resistance || 0;
                damage = damage * (1 - Math.min(resistance, 50) / 100);

                // 4. Handle Invulnerable
                if (effectiveDefender.invulnerable) {
                    damage = 0;
                    description += " [Bất Tử]";
                }

                // 5. Critical & Variance (only if damage > 0)
                if (damage > 0) {
                    const critRate = effectiveAttacker.criticalRate || 0;
                    const critDamage = effectiveAttacker.criticalDamage || 150;
                    if (Math.random() * 100 < critRate) {
                        isCritical = true;
                        damage = damage * (critDamage / 100);
                    }

                    // Random variance +/- 10%
                    damage = Math.floor(damage * (0.9 + Math.random() * 0.2));
                    damage = Math.max(1, damage);

                    // ========== FINAL DAMAGE CAP (Prevent 1-hit kills) ==========
                    // Cap damage at 20% of defender's max HP per hit AFTER all multipliers
                    // This ensures battles last at least 5+ turns regardless of power gap
                    const defenderMaxHp = currentAttacker === 'challenger' ? opponentMaxHp : challengerMaxHp;
                    const maxDamagePerHit = Math.floor(defenderMaxHp * 0.20);
                    if (damage > maxDamagePerHit) {
                        damage = maxDamagePerHit;
                        description += " [Damage Capped]";
                    }

                    // 6. Handle Shield (Absorb)
                    if (effectiveDefender.shield > 0) {
                        const absorbed = Math.min(damage, effectiveDefender.shield);
                        damage -= absorbed;
                        description += ` [Khiên chắn ${absorbed}]`;
                    }
                }

                // 7. Lifesteal
                if (damage > 0 && (effectiveAttacker.lifesteal || 0) > 0) {
                    lifestealHealed = Math.floor(damage * (effectiveAttacker.lifesteal || 0) / 100);
                }
            }
        }

        // Regeneration (Passive)
        if ((effectiveAttacker.regeneration || 0) > 0) {
            const maxHp = currentAttacker === 'challenger' ? challengerMaxHp : opponentMaxHp;
            const regenRate = Math.min(effectiveAttacker.regeneration, 5); // Cap 5%
            regenerationHealed = Math.floor(maxHp * regenRate / 100);
        }


        // --- RESULT APPLICATION PHASE ---

        if (!effectiveAttacker.stunned && !isDodged) {
            // Apply Damage
            let incomingDamage = damage;

            // Apply Defender's Damage Reduction Buff (Thiết Bốc, Đại Địa Hộ, etc.)
            if ((effectiveDefender.damageReduction || 0) > 0) {
                const reduction = Math.min(effectiveDefender.damageReduction, 0.75); // Cap at 75%
                incomingDamage = Math.floor(incomingDamage * (1 - reduction));
            }

            // Special PK Damage Reduction (Nghich Thien)
            if (currentAttacker !== 'challenger' && nghichThienMeta?.damageReduction > 0) {
                incomingDamage = Math.floor(incomingDamage * (1 - nghichThienMeta.damageReduction));
            }

            if (currentAttacker === 'challenger') {
                opponentHp = Math.max(0, opponentHp - incomingDamage);
                totalDamageByChallenger += incomingDamage;
            } else {
                challengerHp = Math.max(0, challengerHp - incomingDamage);
                totalDamageByOpponent += incomingDamage;
            }
            actualDamageDealt = incomingDamage;
        }

        // Apply Healing (Lifesteal + Regen)
        if (currentAttacker === 'challenger') {
            challengerHp = Math.min(challengerMaxHp, challengerHp + lifestealHealed + regenerationHealed);
        } else {
            opponentHp = Math.min(opponentMaxHp, opponentHp + lifestealHealed + regenerationHealed);
        }

        // 8. Handle Reflect Damage
        if (actualDamageDealt > 0 && effectiveDefender.reflectDamage > 0) {
            const reflected = Math.floor(actualDamageDealt * effectiveDefender.reflectDamage);
            if (currentAttacker === 'challenger') {
                challengerHp = Math.max(0, challengerHp - reflected);
                description += ` [Bị phản ${reflected} sát thương]`;
            } else {
                opponentHp = Math.max(0, opponentHp - reflected);
                description += ` [Bị phản ${reflected} sát thương]`;
            }
        }

        // 9. Handle Poison (End of turn DOT)
        // Check local debuffs of the current ATTACKER (since it's their turn end?)
        // Standard DOT usually ticks on affected unit's turn start/end.
        // Let's tick poison on the currently active unit (Attacker)
        const myDebuffs = currentAttacker === 'challenger' ? challengerDebuffs : opponentDebuffs;
        let poisonDamage = 0;
        myDebuffs.forEach(d => {
            if (d.type === 'poison') {
                const pDmg = Math.floor((currentAttacker === 'challenger' ? challengerMaxHp : opponentMaxHp) * (d.damagePerTick || 0.01));
                if (currentAttacker === 'challenger') challengerHp = Math.max(0, challengerHp - pDmg);
                else opponentHp = Math.max(0, opponentHp - pDmg);
                poisonDamage += pDmg;
            }
        });


        // --- LOG GENERATION ---

        // Construct description if not set by special states
        if (!description) {
            if (usedSkill) {
                description = `Sử dụng [${usedSkill.name}]! ${isCritical ? 'Chí mạng! ' : ''}Gây ${actualDamageDealt} sát thương`;
                if (usedSkill.name === 'Phá Giáp') description += ' [Phá Giáp]';
                // Add skill specific effect texts
                if (skillResult && skillResult.effects.length > 0) {
                    description += ` [${skillResult.effects.join(', ')}]`;
                }
            } else {
                description = `Gây ${actualDamageDealt} sát thương`;
            }
        }

        if (poisonDamage > 0) description += ` [Độc sát -${poisonDamage}]`;
        if (regenerationHealed > 0) description += ` [Hồi ${regenerationHealed}]`;
        if (lifestealHealed > 0) description += ` [Hút ${lifestealHealed}]`;

        logs.push({
            turn,
            attacker: currentAttacker,
            damage: actualDamageDealt,
            isCritical,
            isDodged,
            lifestealHealed,
            regenerationHealed,
            challengerHp: Math.floor(challengerHp),
            opponentHp: Math.floor(opponentHp),
            challengerMana: Math.floor(challengerMana),
            opponentMana: Math.floor(opponentMana),
            manaConsumed: manaConsumed > 0 ? manaConsumed : undefined,
            description,
            skillUsed: usedSkill ? usedSkill.name : null,
            isStunned: effectiveAttacker.stunned
        });

        // Cleanup Buffs/Debuffs (Duration--)
        const cleanup = (list) => {
            for (let i = list.length - 1; i >= 0; i--) {
                list[i].duration--;
                if (list[i].duration <= 0) list.splice(i, 1);
            }
        };
        cleanup(challengerBuffs);
        cleanup(challengerDebuffs);
        cleanup(opponentBuffs);
        cleanup(opponentDebuffs);

        // Switch turn
        currentAttacker = currentAttacker === 'challenger' ? 'opponent' : 'challenger';
    }

    return {
        winner: challengerHp > 0 ? 'challenger' : 'opponent',
        isDraw: challengerHp > 0 && opponentHp > 0, // Should typically not happen if turns exhausted unless both alive
        logs,
        totalTurns: turn,
        totalDamageByChallenger,
        totalDamageByOpponent,
        finalChallengerHp: challengerHp,
        finalOpponentHp: opponentHp
    };
};

export default {
    simulateBattle,
    calculateHitChance
};
