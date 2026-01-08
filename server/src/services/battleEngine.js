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
    console.log('[ENGINE-DEBUG] simulateBattle STARTED - challenger ATK:', challengerStats.attack, 'opponent ATK:', opponentStats.attack);

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

    // Shield state tracking (shields deplete as they absorb damage)
    // Pool starts with base shield, gains come from skills/buffs (event-based, not delta-based)
    let challengerShield = challengerStats.shield || 0;
    let opponentShield = opponentStats.shield || 0;

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
                    for (const b of skillResult.buffs) {
                        // Shield gain is event-based: add to pool when buff is created
                        if (b.type === 'shield' && b.value > 0) {
                            if (currentAttacker === 'challenger') challengerShield += b.value;
                            else opponentShield += b.value;
                        }
                        // Handle hpCost in buffs (e.g., Nhiên Huyết)
                        if (b.hpCost && b.hpCost > 0) {
                            if (currentAttacker === 'challenger') {
                                challengerHp = Math.max(1, challengerHp - b.hpCost);
                            } else {
                                opponentHp = Math.max(1, opponentHp - b.hpCost);
                            }
                        }
                    }
                    if (currentAttacker === 'challenger') challengerBuffs.push(...skillResult.buffs);
                    else opponentBuffs.push(...skillResult.buffs);
                }
                if (skillResult.debuffs?.length > 0) {
                    for (const d of skillResult.debuffs) {
                        // Handle target:'self' - debuff applies to caster, not defender
                        if (d.target === 'self') {
                            if (currentAttacker === 'challenger') challengerDebuffs.push(d);
                            else opponentDebuffs.push(d);
                        } else {
                            // Default: debuff applies to opponent
                            if (currentAttacker === 'challenger') opponentDebuffs.push(d);
                            else challengerDebuffs.push(d);
                        }
                    }
                }

                break; // Use only one skill per turn
            }
        }

        // Sync mana back to main variables
        if (currentAttacker === 'challenger') challengerMana = currentMana;
        else opponentMana = currentMana;


        // --- STATS RECALCULATION PHASE (Buffs/Debuffs) ---
        // Calculate effective stats for each entity INDEPENDENTLY (not tied to whose turn)
        let effectiveChallenger = { ...challengerStats };
        let effectiveOpponent = { ...opponentStats };

        // Apply buffs and debuffs to each entity separately
        if (challengerBuffs.length > 0) effectiveChallenger = applyStatusEffects(effectiveChallenger, challengerBuffs);
        if (challengerDebuffs.length > 0) effectiveChallenger = applyStatusEffects(effectiveChallenger, challengerDebuffs);
        if (opponentBuffs.length > 0) effectiveOpponent = applyStatusEffects(effectiveOpponent, opponentBuffs);
        if (opponentDebuffs.length > 0) effectiveOpponent = applyStatusEffects(effectiveOpponent, opponentDebuffs);

        // Derive attacker/defender from the independent effective stats
        const effectiveAttacker = currentAttacker === 'challenger' ? effectiveChallenger : effectiveOpponent;
        const effectiveDefender = currentAttacker === 'challenger' ? effectiveOpponent : effectiveChallenger;

        // Helper: Try to trigger fatal protection (revive) for a side
        const tryFatalProtection = (side, reason) => {
            if (side === 'challenger') {
                if (challengerHp > 0) return false;
                if ((effectiveChallenger.fatalProtection || 0) <= 0) return false;

                const reviveHp = Math.max(1, Math.floor(challengerMaxHp * effectiveChallenger.fatalProtection));
                challengerHp = reviveHp;
                description += ` [Hộ mệnh kích hoạt${reason ? ` (${reason})` : ''}! Hồi ${Math.floor(effectiveChallenger.fatalProtection * 100)}% HP]`;

                // Consume oneTime fatalProtection
                for (let i = challengerBuffs.length - 1; i >= 0; i--) {
                    if (challengerBuffs[i].type === 'fatalProtection' && challengerBuffs[i].oneTime) {
                        challengerBuffs.splice(i, 1);
                        break;
                    }
                }
                // Clear the stat so it doesn't trigger again this turn
                effectiveChallenger.fatalProtection = 0;
                return true;
            } else {
                if (opponentHp > 0) return false;
                if ((effectiveOpponent.fatalProtection || 0) <= 0) return false;

                const reviveHp = Math.max(1, Math.floor(opponentMaxHp * effectiveOpponent.fatalProtection));
                opponentHp = reviveHp;
                description += ` [Hộ mệnh kích hoạt${reason ? ` (${reason})` : ''}! Hồi ${Math.floor(effectiveOpponent.fatalProtection * 100)}% HP]`;

                for (let i = opponentBuffs.length - 1; i >= 0; i--) {
                    if (opponentBuffs[i].type === 'fatalProtection' && opponentBuffs[i].oneTime) {
                        opponentBuffs.splice(i, 1);
                        break;
                    }
                }
                effectiveOpponent.fatalProtection = 0;
                return true;
            }
        };

        // NOTE: Shield sync is now EVENT-BASED (when skill/buff creates shield)
        // No delta-based sync here - avoids infinite shield from cumulative applyStatusEffects


        // --- ACTION PHASE ---

        let damage = 0;
        let isCritical = false;
        let isDodged = false;
        let lifestealHealed = 0;
        let regenerationHealed = 0;
        let description = '';
        let actualDamageDealt = 0;

        // Cap variables - declared here so they're accessible in RESULT APPLICATION PHASE
        let shouldCapDamage = true;
        let capPercentage = 0.18; // Default for PvP/Arena

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
                    // PvP penetration cap 50%, PvE cap 80%
                    const penCap = isDungeon ? 80 : 50;
                    effectiveDefense = effectiveDefense * (1 - Math.min(penetration, penCap) / 100);
                }

                // Percentage-based defense reduction (cap at 75%)
                // Formula: damage = attack * (1 - min(def/(def+atk), 0.75))
                // Ensures defense never reduces damage below 25% of attack
                const baseAttack = effectiveAttacker.attack || 0;
                const defenseRatio = Math.min(effectiveDefense / (effectiveDefense + baseAttack + 1), 0.75);
                damage = Math.max(1, baseAttack * (1 - defenseRatio));

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
                    // Clamp critRate/critDamage in PvP to prevent runaway scaling
                    let critRate = effectiveAttacker.criticalRate || 0;
                    let critDamage = effectiveAttacker.criticalDamage || 150;
                    if (!isDungeon) {
                        critRate = Math.min(critRate, 65);      // PvP cap 65%
                        critDamage = Math.min(critDamage, 250); // PvP cap 250%
                    }

                    if (Math.random() * 100 < critRate) {
                        isCritical = true;
                        damage = damage * (critDamage / 100);
                    }

                    // Random variance +/- 10%
                    damage = Math.floor(damage * (0.9 + Math.random() * 0.2));
                    damage = Math.max(1, damage);

                    // ========== FINAL DAMAGE CAP (Prevent 1-hit kills) ==========
                    // Dynamic cap based on monster type:
                    // - Normal mobs: NO CAP (fast clear)
                    // - Elite mobs: 35% cap (~3 turns)
                    // - Boss: 30% cap (~4-5 turns)
                    // 
                    // EXCEPTION: Disable cap if player >> monster (power gap >= 3x)
                    const defenderMaxHp = currentAttacker === 'challenger' ? opponentMaxHp : challengerMaxHp;

                    // Check power gap - disable cap if player is overpowered
                    // shouldCapDamage already declared in outer scope
                    if (isDungeon && currentAttacker === 'challenger') {
                        // Compare player attack vs monster max HP
                        const playerAttack = effectiveAttacker.attack || 0;
                        const monsterMaxHp = defenderMaxHp;
                        const powerGap = playerAttack / Math.max(1, monsterMaxHp);

                        // If player attack >= 3x monster HP, disable cap (one-shot allowed)
                        if (powerGap >= 3.0) {
                            shouldCapDamage = false;
                        }
                    }

                    // NOTE: Damage cap is now applied AFTER DamageReduction in RESULT APPLICATION PHASE
                    // This ensures the cap limits actual damage dealt, not pre-reduction damage

                    // Determine cap percentage for later use (assignment, not redeclaration)
                    // capPercentage already declared in outer scope with default 0.18

                    if (isDungeon && currentAttacker === 'challenger') {
                        // Player attacking monster - adjust based on monster HP scaling
                        const avgHpForFloor = 5000;
                        const hpRatio = defenderMaxHp / avgHpForFloor;

                        if (hpRatio < 3) {
                            capPercentage = null; // Normal mob - NO CAP
                        } else if (hpRatio < 10) {
                            capPercentage = 0.35; // Elite mob (35% cap)
                        } else {
                            capPercentage = 0.30; // Boss mob (30% cap)
                        }
                    }

                    // NOTE: Shield absorb moved to RESULT APPLICATION PHASE
                    // Shield is a depletable resource, not a per-turn buffer
                }

                // NOTE: Lifesteal moved to RESULT APPLICATION PHASE (after actualDamageDealt)
                // This ensures lifesteal is based on actual damage dealt, not raw damage
            }
        }

        // Regeneration (Passive) - PvP cap reduced to prevent stalemates
        if ((effectiveAttacker.regeneration || 0) > 0) {
            const maxHp = currentAttacker === 'challenger' ? challengerMaxHp : opponentMaxHp;
            const regenCap = isDungeon ? 5 : 3; // PvP: 3%, PvE: 5%
            const regenRate = Math.min(effectiveAttacker.regeneration, regenCap);
            regenerationHealed = Math.floor(maxHp * regenRate / 100);
        }


        // --- RESULT APPLICATION PHASE ---

        if (!effectiveAttacker.stunned && !isDodged) {
            // Apply Damage
            let incomingDamage = damage;

            // Shield Absorb FIRST - shields take raw damage before DR
            // Using state tracking (shields deplete across turns)
            let defenderShield = currentAttacker === 'challenger' ? opponentShield : challengerShield;
            if (defenderShield > 0 && incomingDamage > 0) {
                const absorbed = Math.min(incomingDamage, defenderShield);
                incomingDamage -= absorbed;
                defenderShield -= absorbed;
                description += ` [Khiên chắn ${absorbed}]`;
                // Update shield state
                if (currentAttacker === 'challenger') opponentShield = defenderShield;
                else challengerShield = defenderShield;
            }

            // Apply Defender's Damage Reduction Buff AFTER shield (Thiết Bốc, Đại Địa Hộ, etc.)
            if ((effectiveDefender.damageReduction || 0) > 0) {
                const reduction = Math.min(effectiveDefender.damageReduction, 0.75); // Cap at 75%
                incomingDamage = Math.floor(incomingDamage * (1 - reduction));
            }

            // Special PK Damage Reduction (Nghich Thien)
            if (currentAttacker !== 'challenger' && nghichThienMeta?.damageReduction > 0) {
                incomingDamage = Math.floor(incomingDamage * (1 - nghichThienMeta.damageReduction));
            }

            // Anti-stalemate: gradually raise PvP cap after turn 12 (keeps anti one-shot early)
            // This approach is safer than multiplying damage directly
            if (!isDungeon && turn >= 12 && capPercentage !== null) {
                const extra = Math.floor((turn - 12) / 2) * 0.01; // +1% each 2 turns
                capPercentage = Math.min(capPercentage + extra, 0.25); // up to 25%
            }

            // FINAL DAMAGE CAP - Applied AFTER all reductions for accurate limiting
            if (shouldCapDamage && capPercentage !== null) {
                const defenderMaxHpFinal = (currentAttacker === 'challenger') ? opponentMaxHp : challengerMaxHp;
                const maxDamagePerHit = Math.floor(defenderMaxHpFinal * capPercentage);
                incomingDamage = Math.min(incomingDamage, maxDamagePerHit);
            }
            incomingDamage = Math.max(0, incomingDamage);

            if (currentAttacker === 'challenger') {
                opponentHp = Math.max(0, opponentHp - incomingDamage);
                totalDamageByChallenger += incomingDamage;
                if (turn <= 5) console.log(`[DMG-DEBUG] Turn ${turn} Challenger->Opponent: raw=${damage}, afterCap=${incomingDamage}, opponentHp=${opponentHp}`);
            } else {
                challengerHp = Math.max(0, challengerHp - incomingDamage);
                totalDamageByOpponent += incomingDamage;
                if (turn <= 5) console.log(`[DMG-DEBUG] Turn ${turn} Opponent->Challenger: raw=${damage}, afterCap=${incomingDamage}, challengerHp=${challengerHp}`);
            }
            actualDamageDealt = incomingDamage;

            // Lifesteal - based on ACTUAL damage dealt (post-reduction/cap)
            // PvP cap 10% to balance lifesteal builds while preventing stalemates
            const lsCap = isDungeon ? 100 : 10;
            const ls = Math.min(effectiveAttacker.lifesteal || 0, lsCap);
            if (actualDamageDealt > 0 && ls > 0) {
                lifestealHealed = Math.floor(actualDamageDealt * ls / 100);
            }
        }

        // Apply Healing (Lifesteal + Regen)
        if (currentAttacker === 'challenger') {
            challengerHp = Math.min(challengerMaxHp, challengerHp + lifestealHealed + regenerationHealed);
        } else {
            opponentHp = Math.min(opponentMaxHp, opponentHp + lifestealHealed + regenerationHealed);
        }

        // Check Fatal Protection after direct damage (both sides)
        tryFatalProtection('challenger', 'sát thương');
        tryFatalProtection('opponent', 'sát thương');

        // Consume oneTime buffs after successful attack (not stunned, not dodged, damage dealt)
        if (!effectiveAttacker.stunned && !isDodged && actualDamageDealt > 0) {
            const attackerBuffList = currentAttacker === 'challenger' ? challengerBuffs : opponentBuffs;
            // Consume oneTime crit/ignoreDef buffs
            for (let i = attackerBuffList.length - 1; i >= 0; i--) {
                const buff = attackerBuffList[i];
                if (buff.oneTime && ['criticalRate', 'ignoreDef'].includes(buff.type)) {
                    attackerBuffList.splice(i, 1);
                }
            }
        }

        // 8. Handle Reflect Damage
        if (actualDamageDealt > 0 && effectiveDefender.reflectDamage > 0) {
            const reflected = Math.floor(actualDamageDealt * effectiveDefender.reflectDamage);
            if (currentAttacker === 'challenger') {
                challengerHp = Math.max(0, challengerHp - reflected);
                description += ` [Bị phản ${reflected} sát thương]`;
                // Check Fatal Protection after reflect
                tryFatalProtection('challenger', 'phản sát');
            } else {
                opponentHp = Math.max(0, opponentHp - reflected);
                description += ` [Bị phản ${reflected} sát thương]`;
                tryFatalProtection('opponent', 'phản sát');
            }
        }

        // 9. Handle Poison DOT - ticks on the ACTIVE UNIT only (their turn end)
        // This ensures DOT doesn't tick x2 per full round
        let poisonDamage = 0;
        if (currentAttacker === 'challenger') {
            challengerDebuffs.forEach(d => {
                if (d.type === 'poison') {
                    poisonDamage += Math.floor(challengerMaxHp * (d.damagePerTick || 0.01));
                }
            });
            if (poisonDamage > 0) {
                challengerHp = Math.max(0, challengerHp - poisonDamage);
                // Check Fatal Protection after poison
                tryFatalProtection('challenger', 'độc');
            }
        } else {
            opponentDebuffs.forEach(d => {
                if (d.type === 'poison') {
                    poisonDamage += Math.floor(opponentMaxHp * (d.damagePerTick || 0.01));
                }
            });
            if (poisonDamage > 0) {
                opponentHp = Math.max(0, opponentHp - poisonDamage);
                tryFatalProtection('opponent', 'độc');
            }
        }


        // --- LOG GENERATION ---

        // Construct description if not set by special states
        if (!description) {
            if (usedSkill) {
                description = `Sử dụng [${usedSkill.name}]! ${isCritical ? 'Chí mạng! ' : ''}Gây ${actualDamageDealt} sát thương`;
                if (usedSkill.name === 'Phá Giáp') description += ' [Phá Giáp]';
                // Add skill specific effect texts
                if (skillResult?.effects?.length > 0) {
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
            isStunned: effectiveAttacker.stunned,
            challengerShield: Math.floor(challengerShield),
            opponentShield: Math.floor(opponentShield)
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

    // Draw logic: both alive after max turns OR both dead (double KO)
    const bothDead = challengerHp <= 0 && opponentHp <= 0;
    const isDraw = (challengerHp > 0 && opponentHp > 0) || bothDead;

    return {
        winner: isDraw ? null : (challengerHp > 0 ? 'challenger' : 'opponent'),
        isDraw,
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
