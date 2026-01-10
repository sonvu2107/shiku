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
    const acc = Math.max(0, accuracy || 0);
    const dod = Math.max(0, dodge || 0);
    const hit = acc / (acc + dod + 1e-9); // 1e-9 prevents division by zero
    // Clamp between 5% and 95%
    return Math.max(0.05, Math.min(hit, 0.95));
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
// Helper to normalize percentage inputs (handles both 128 and 1.28)
// If x > 1, treat as integer percentage (128 -> 128%). If <= 1, treat as fraction (0.5 -> 50%).
// Helper to normalize percentage inputs
// Examples: 128 -> 128, 1.28 -> 128, 0.5 -> 50
// Helper to normalize percentage inputs
// Accepts two formats only:
// - fraction: 0..1   (0.25 => 25%)
// - percent:  >1     (25 => 25%, 1.28 => 1.28%)
// NOTE: 128 means 128% (1.28 fraction). Use only where allowed (e.g. critDamage), not for caps like DR/regen.
const toFrac = (x) => {
    const v = Number(x);
    if (!Number.isFinite(v) || v <= 0) return 0;
    if (v <= 1) return v;
    return v / 100;
};
const toPct = (x) => toFrac(x) * 100;

export const simulateBattle = (challengerStats, opponentStats, challengerSkills = [], opponentSkills = [], options = {}) => {
    const {
        nghichThienMeta = null, // PK specific damage reduction
        maxTurns = 100, // Increased to 100 to reduce draws
        isDungeon = false,
        debug = false
    } = options;

    const DOT_CAP_FRAC = 0.15; // Cap DOT at 15% MaxHP/turn
    const logs = [];
    const isDebug = debug || process.env.BATTLE_DEBUG;
    if (isDebug) {
        console.log('\n========== BATTLE START ==========');
        console.log('[INIT] Challenger Stats:', JSON.stringify({
            atk: challengerStats.attack,
            def: challengerStats.defense,
            hp: challengerStats.qiBlood,
            spd: challengerStats.speed,
            crit: challengerStats.criticalRate,
            critDmg: challengerStats.criticalDamage,
            lifesteal: challengerStats.lifesteal,
            regen: challengerStats.regeneration,
            pen: challengerStats.penetration
        }));
        console.log('[INIT] Opponent Stats:', JSON.stringify({
            atk: opponentStats.attack,
            def: opponentStats.defense,
            hp: opponentStats.qiBlood,
            spd: opponentStats.speed,
            crit: opponentStats.criticalRate,
            critDmg: opponentStats.criticalDamage,
            lifesteal: opponentStats.lifesteal,
            regen: opponentStats.regeneration,
            pen: opponentStats.penetration
        }));
        console.log('[INIT] Skills - Challenger:', challengerSkills.map(s => s.name).join(', ') || 'None');
        console.log('[INIT] Skills - Opponent:', opponentSkills.map(s => s.name).join(', ') || 'None');
        console.log('[INIT] First Attacker:', challengerStats.speed >= opponentStats.speed ? 'Challenger' : 'Opponent');
        console.log('===================================\n');
    }

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

    // Fatal protection usage tracking (one trigger per turn max)
    let challengerFatalUsedThisTurn = false;
    let opponentFatalUsedThisTurn = false;

    // Shield state tracking (shields deplete as they absorb damage)
    // Pool starts with base shield, gains come from skills/buffs (event-based, not delta-based)
    let challengerShield = challengerStats.shield || 0;
    let opponentShield = opponentStats.shield || 0;

    // Determine initial turn order
    let currentAttacker = challengerStats.speed >= opponentStats.speed ? 'challenger' : 'opponent';

    while (challengerHp > 0 && opponentHp > 0 && turn < maxTurns) {
        turn++;

        challengerFatalUsedThisTurn = false;
        opponentFatalUsedThisTurn = false;
        let description = '';
        let skillHealed = 0;

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

        // Variable to track current mana for skill check
        let currentMana = currentAttacker === 'challenger' ? challengerMana : opponentMana;

        // --- SKILL SELECTION PHASE ---
        let usedSkill = null;
        let skillDamageBonus = 0;
        let skillResult = null;
        let manaConsumed = 0;

        // Check Silence and Stun (Stun prevents Casting too)
        if (!effectiveAttacker.silenced && !effectiveAttacker.stunned) {
            for (const skill of attackerSkills) {
                const skillId = skill.techniqueId || skill.name;
                const cost = skill.manaCost !== undefined ? skill.manaCost : 0; // Default 0 for tower mobs

                // Check Cooldown and Mana and Condition (via helper)
                // Note: We need a temporary 'canUse' check here or reuse the logic
                const isReady = attackerCooldowns[skillId] <= 0 && currentMana >= cost;

                // Also check conditionals if any
                let conditionMet = true;
                if (skill.condition?.hpBelowPct) {
                    const hpPct = (currentAttacker === 'challenger' ? challengerHp / challengerMaxHp : opponentHp / opponentMaxHp);
                    if (hpPct >= skill.condition.hpBelowPct) conditionMet = false;
                }

                if (isReady && conditionMet) {
                    usedSkill = skill;
                    manaConsumed = cost;
                    attackerCooldowns[skillId] = skill.cooldown !== undefined ? skill.cooldown : 3;

                    // Prepare context for skill execution
                    const attackerContext = {
                        ...attacker,
                        maxQiBlood: currentAttacker === 'challenger' ? challengerMaxHp : opponentMaxHp,
                        qiBlood: currentAttacker === 'challenger' ? challengerHp : opponentHp,
                        maxZhenYuan: attackerMaxMana,
                        zhenYuan: currentMana,
                        id: currentAttacker // context id
                    };
                    const defenderContext = {
                        ...defender,
                        maxQiBlood: currentAttacker === 'challenger' ? opponentMaxHp : challengerMaxHp,
                        qiBlood: currentAttacker === 'challenger' ? opponentHp : challengerHp
                    };

                    // Execute skill
                    skillResult = executeSkill(skill, attackerContext, defenderContext) || {};

                    // Process immediate skill results
                    skillDamageBonus = skillResult.damage || 0;

                    // Update resources (Mana)
                    currentMana = Math.max(0, currentMana - manaConsumed);
                    if (skillResult.manaRestore > 0) {
                        currentMana = Math.min(attackerMaxMana, currentMana + skillResult.manaRestore);
                    }

                    // Update Attacker HP (Heal)
                    if (skillResult.healing > 0) {
                        skillHealed = skillResult.healing;
                        // FIX: Do NOT apply heal here to avoid double-healing.
                        // Heal is applied in ACTION/RESULT phase after sustainMultiplier.
                    }

                    // Handle HP Cost (Self Damage)
                    if (skillResult.hpCost > 0) {
                        if (currentAttacker === 'challenger') {
                            challengerHp = Math.max(1, challengerHp - skillResult.hpCost);
                            description = description ? description : '';
                            // Add note about sacrifice? Handled in description mainly
                        } else {
                            opponentHp = Math.max(1, opponentHp - skillResult.hpCost);
                        }
                    }

                    // Handle Dispel (Clear Opponent Buffs)
                    if (skillResult.dispel) {
                        if (currentAttacker === 'challenger') {
                            opponentBuffs = [];
                            opponentShield = 0; // Clear shield pool
                        } else {
                            challengerBuffs = [];
                            challengerShield = 0; // Clear shield pool
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
                            // Handle hpCost in buffs (legacy support)
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
                            if (d.target === 'self') {
                                if (currentAttacker === 'challenger') challengerDebuffs.push(d);
                                else opponentDebuffs.push(d);
                            } else {
                                if (currentAttacker === 'challenger') opponentDebuffs.push(d);
                                else challengerDebuffs.push(d);
                            }
                        }
                    }

                    // Debug: Log skill usage
                    if (isDebug) {
                        console.log(`[SKILL] Turn ${turn} ${currentAttacker}: ${skill.name} | Mana: ${currentMana + manaConsumed} -> ${currentMana} | CD: ${skill.cooldown || 3}t`);
                        if (skillResult.healing > 0) console.log(`  -> Heal: +${skillResult.healing} (raw)`);
                        if (skillResult.damage > 0) console.log(`  -> Bonus Dmg: +${skillResult.damage}`);
                        if (skillResult.buffs?.length) console.log(`  -> Buffs: ${skillResult.buffs.map(b => b.type).join(', ')}`);
                        if (skillResult.debuffs?.length) console.log(`  -> Debuffs: ${skillResult.debuffs.map(d => d.type).join(', ')}`);
                    }

                    break; // Use only one skill per turn
                }
            }
        }

        // Sync mana back to main variables
        if (currentAttacker === 'challenger') challengerMana = currentMana;
        else opponentMana = currentMana;




        // Helper: Try to trigger fatal protection (revive) for a side
        const tryFatalProtection = (side, reason) => {
            if (side === 'challenger') {
                if (challengerHp > 0) return false;
                if (challengerFatalUsedThisTurn) return false;

                // 1) Determine Fatal Fraction (fp)
                let fp = toFrac(effectiveChallenger.fatalProtection);

                // 2) Fallback if stat is 0
                if (fp <= 0) {
                    const hasBuff = challengerBuffs.find(b => b.type === 'fatalProtection' && (b.value > 0 || b.pct > 0));
                    if (hasBuff) fp = toFrac(hasBuff.value || hasBuff.pct || 0);
                }

                if (fp <= 0) return false;

                // Sync effective stat for clarity (optional but good for consistency)
                effectiveChallenger.fatalProtection = fp;

                const reviveHp = Math.max(1, Math.floor(challengerMaxHp * fp));
                challengerHp = reviveHp;
                description += ` [Hộ mệnh kích hoạt${reason ? ` (${reason})` : ''}! Hồi ${Math.floor(fp * 100)}% HP]`;

                // Consume oneTime fatalProtection
                for (let i = challengerBuffs.length - 1; i >= 0; i--) {
                    if (challengerBuffs[i].type === 'fatalProtection' && challengerBuffs[i].oneTime) {
                        challengerBuffs.splice(i, 1);
                        break;
                    }
                }
                // Clear the stat so it doesn't trigger again this turn
                effectiveChallenger.fatalProtection = 0;
                challengerFatalUsedThisTurn = true;
                return true;
            } else {
                if (opponentHp > 0) return false;
                if (opponentFatalUsedThisTurn) return false;

                // 1) Determine Fatal Fraction (fp)
                let fp = toFrac(effectiveOpponent.fatalProtection);

                // 2) Fallback if stat is 0
                if (fp <= 0) {
                    const hasBuff = opponentBuffs.find(b => b.type === 'fatalProtection' && (b.value > 0 || b.pct > 0));
                    if (hasBuff) fp = toFrac(hasBuff.value || hasBuff.pct || 0);
                }

                if (fp <= 0) return false;

                effectiveOpponent.fatalProtection = fp;

                const reviveHp = Math.max(1, Math.floor(opponentMaxHp * fp));
                opponentHp = reviveHp;
                description += ` [Hộ mệnh kích hoạt${reason ? ` (${reason})` : ''}! Hồi ${Math.floor(fp * 100)}% HP]`;

                for (let i = opponentBuffs.length - 1; i >= 0; i--) {
                    if (opponentBuffs[i].type === 'fatalProtection' && opponentBuffs[i].oneTime) {
                        opponentBuffs.splice(i, 1);
                        break;
                    }
                }
                effectiveOpponent.fatalProtection = 0;
                opponentFatalUsedThisTurn = true;
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

        let actualDamageDealt = 0;

        // Cap variables - declared here so they're accessible in RESULT APPLICATION PHASE
        let shouldCapDamage = true;
        let capPercentage = 0.18; // Default for PvP/Arena

        // --- 0. CALCULATE SUSTAIN MULTIPLIER (Start of Turn) ---
        // Fix Crash/Design: Calculate this independent of Stun/Dodge
        let sustainMultiplier = 1.0;
        if (!isDungeon && turn >= 20) {
            // Decay 2% per turn after 20, max 60% reduction (multiplier 0.4)
            const decayAmount = Math.min(0.6, (turn - 20) * 0.02);
            sustainMultiplier = 1.0 - decayAmount;
        }

        // Apply Anti-Heal Debuff (Receiver-based: 'reduced_healing' on the one receiving HP)
        // Since we are calculating self-sustain (Regen/Lifesteal/SkillSelfHeal), the receiver is the currentAttacker.
        // Rename for clarity: healingReceiverDebuffs
        const healingReceiverDebuffs = currentAttacker === 'challenger' ? challengerDebuffs : opponentDebuffs;
        const antiHealDebuff = healingReceiverDebuffs.find(d => d.type === 'reduced_healing');
        if (antiHealDebuff) {
            const reduction = Math.min(toFrac(antiHealDebuff.value ?? antiHealDebuff.pct ?? 0.5), 0.95);
            sustainMultiplier *= (1 - reduction);
        }

        if (turn >= 20 && !isDungeon && turn % 10 === 0 && isDebug) {
            console.log(`[Turn ${turn}] Sustain Multiplier: ${(sustainMultiplier * 100).toFixed(0)}%`);
        }

        // Apply Sustain Multiplier to Skill Heal (if any)
        if (skillHealed > 0) {
            skillHealed = Math.floor(skillHealed * sustainMultiplier);
        }

        // Apply Sustain Multiplier to Regeneration (Passive)
        // Fix Design: Regen applies even if Stunned/Dodged, but respects Anti-Heal/Decay
        if ((effectiveAttacker.regeneration || 0) > 0) {
            const maxHp = currentAttacker === 'challenger' ? challengerMaxHp : opponentMaxHp;
            const regenCap = isDungeon ? 5 : 3; // PvP: 3%, PvE: 5%
            const effectiveRegen = Math.min(toPct(effectiveAttacker.regeneration), regenCap);

            // Calculate Raw Regen
            let rawRegen = Math.floor(maxHp * effectiveRegen / 100);

            // Apply Multiplier
            regenerationHealed = Math.floor(rawRegen * sustainMultiplier);
        }

        // 1. Check Stun
        if (effectiveAttacker.stunned) {
            description = `Bị choáng! Không thể hành động!`;
        } else {
            // 2. Check Hit/Dodge (Standardized)
            const acc = effectiveAttacker.accuracy || 100;
            const dod = effectiveDefender.dodge || 0;
            const hitChance = calculateHitChance(acc, dod);

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

                // Fix Balance: Removed Frenzy Multiplier (double scaling issue)
                // Scaling is now handled purely by Cap Release later

                // 4. Handle Invulnerable
                if (effectiveDefender.invulnerable) {
                    damage = 0;
                    description += " [Bất Tử]";
                }

                // 5. Critical & Variance (only if damage > 0)
                if (damage > 0) {
                    // ===== Dungeon One-shot Policy (FINAL) =====
                    // Disable cap ONLY if the player's expected NON-CRIT hit (pre-variance) after Shield + DR
                    // would already one-shot the monster.
                    // Threshold 1.12 ~= 1/0.9 to survive worst-case -10% variance and rounding.
                    if (isDungeon && currentAttacker === 'challenger') {
                        const monsterMaxHp = opponentMaxHp;

                        // `damage` at this point already includes: def formula + skillDamageBonus + resistance,
                        // but is pre-crit and pre-variance (exactly what we want).
                        let expected = damage;

                        // 1) Shield absorb first (matches RESULT PHASE ordering)
                        const shield = opponentShield || 0;
                        expected = Math.max(0, expected - shield);

                        // 2) Defender damage reduction after shield (cap at 75%)
                        const dr = Math.min(toFrac(effectiveDefender.damageReduction || 0), 0.75);
                        expected = Math.floor(expected * (1 - dr));

                        const powerGap = expected / Math.max(1, monsterMaxHp);

                        if (powerGap >= 1.12) {
                            shouldCapDamage = false;
                        }
                    }
                    // Clamp critRate/critDamage in PvP to prevent runaway scaling
                    let critRate = effectiveAttacker.criticalRate || 0;

                    // Normalize criticalDamage: Supports both 250 (%) and 2.5 (x)
                    // Heuristic: <= 10 is multiplier, > 10 is percent
                    const cd = (() => {
                        const v = Number(effectiveAttacker.criticalDamage);
                        if (!Number.isFinite(v) || v <= 0) return 1.5;   // default 150% => 1.5x
                        if (v <= 10) return v;                           // treat 2.5 as 2.5x (fraction multiplier)
                        return v / 100;                                  // treat 250 as 2.5x
                    })();

                    let finalCritMult = cd;
                    if (!isDungeon) {
                        critRate = Math.min(critRate, 65);       // PvP cap 65%
                        finalCritMult = Math.min(cd, 2.5);       // PvP cap 250% (2.5x)
                    }

                    if (Math.random() * 100 < critRate) {
                        isCritical = true;
                        damage = damage * finalCritMult;
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
                    // EXCEPTION: Disable cap if expected non-crit damage (after shield+DR) can one-shot (>=112% HP)
                    const defenderMaxHp = currentAttacker === 'challenger' ? opponentMaxHp : challengerMaxHp;

                    // NOTE: Damage cap is now applied AFTER DamageReduction in RESULT APPLICATION PHASE
                    // This ensures the cap limits actual damage dealt, not pre-reduction damage

                    // Determine cap percentage for later use
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
                    } else if (isDungeon && currentAttacker !== 'challenger') {
                        // Monster attacking player
                        capPercentage = 0.30; // Cap damage at 30% HP to prevent one-shots but allow pressure
                    }

                    // NOTE: Shield absorb moved to RESULT APPLICATION PHASE
                    // Shield is a depletable resource, not a per-turn buffer
                }

                // NOTE: Lifesteal moved to RESULT APPLICATION PHASE (after actualDamageDealt)
                // This ensures lifesteal is based on actual damage dealt, not raw damage
            }
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
                const reduction = Math.min(toFrac(effectiveDefender.damageReduction), 0.75); // Cap at 75%
                incomingDamage = Math.floor(incomingDamage * (1 - reduction));
            }

            // Special PK Damage Reduction (Nghich Thien)
            const pkDR = toFrac(nghichThienMeta?.damageReduction);
            if (currentAttacker !== 'challenger' && pkDR > 0) {
                incomingDamage = Math.floor(incomingDamage * (1 - Math.min(pkDR, 0.75)));
            }

            // Anti-stalemate: gradually raise PvP cap after turn 12 (keeps anti one-shot early)
            // This approach is safer than multiplying damage directly
            // Anti-stalemate: gradually raise PvP cap after turn 12
            if (!isDungeon && turn >= 12 && capPercentage !== null) {
                const baseCap = 0.18; // Baseline PvP cap

                if (turn >= 40) {
                    // Sudden Death Phase: Rapidly release cap
                    // Start from 25% (max mid-game cap), add 3% per turn (gentler slope).
                    const startCap = 0.25;
                    const suddenDeathExtra = Math.max(0, turn - 40) * 0.03;
                    const calculatedCap = startCap + suddenDeathExtra;

                    // Optimization: If cap >= 100%, disable it entirely
                    if (calculatedCap >= 1.0) {
                        capPercentage = null;
                    } else {
                        capPercentage = calculatedCap;
                    }

                    if (isDebug && turn >= 38 && (turn % 5 === 0 || turn === 40)) {
                        console.log(`[SUDDEN-DEATH] Turn ${turn} | Cap Released To: ${capPercentage ? (capPercentage * 100).toFixed(0) + '%' : 'UNLEASHED'}`);
                    }
                } else {
                    // Mid Game: Slow scaling to 25% (limit max mid-game cap)
                    const extra = Math.floor((turn - 12) / 2) * 0.01;
                    capPercentage = Math.min(baseCap + extra, 0.25);
                }
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
            } else {
                challengerHp = Math.max(0, challengerHp - incomingDamage);
                totalDamageByOpponent += incomingDamage;
            }
            actualDamageDealt = incomingDamage;

            // Enhanced Debug Logging
            if (isDebug && (turn <= 10 || turn % 10 === 0 || turn >= 40)) {
                const target = currentAttacker === 'challenger' ? 'Opponent' : 'Challenger';
                const targetHp = currentAttacker === 'challenger' ? opponentHp : challengerHp;
                const targetMaxHp = currentAttacker === 'challenger' ? opponentMaxHp : challengerMaxHp;
                const hpPct = ((targetHp / targetMaxHp) * 100).toFixed(1);
                console.log(`[T${turn}] ${currentAttacker.toUpperCase()} -> ${target}: ${actualDamageDealt.toLocaleString()} dmg ${isCritical ? '(CRIT!)' : ''} | ${target} HP: ${targetHp.toLocaleString()} (${hpPct}%)`);
                if (damage !== actualDamageDealt) {
                    console.log(`  -> Raw: ${damage.toLocaleString()} | After Cap/DR: ${actualDamageDealt.toLocaleString()}`);
                }
            }

            // Lifesteal - based on ACTUAL damage dealt (post-reduction/cap)


            const lsCapFrac = isDungeon ? 0.50 : 0.10; // 50% PvE, 10% PvP

            // Base stat lifesteal
            const baseLsFrac = toFrac(effectiveAttacker.lifesteal);
            // Skill immediate lifesteal
            const skillLsFrac = toFrac(skillResult?.lifestealPct);

            // Total lifesteal fraction, capped
            let totalLsFrac = Math.min(baseLsFrac + skillLsFrac, lsCapFrac);

            if (actualDamageDealt > 0 && totalLsFrac > 0) {
                // Apply pre-calculated sustainMultiplier
                lifestealHealed = Math.floor(actualDamageDealt * totalLsFrac * sustainMultiplier);
            }
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

        // 8. Handle Reflect Damage (Damage -> Reflect)
        if (actualDamageDealt > 0 && effectiveDefender.reflectDamage > 0) {
            const reflectFrac = Math.min(toFrac(effectiveDefender.reflectDamage), 1.0); // Cap reflect at 100%
            const reflected = Math.floor(actualDamageDealt * reflectFrac);
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

        // 9. Handle Poison DOT (Reflect -> DOT)
        // ticks on the ACTIVE UNIT only (their turn end)
        let poisonDamage = 0;
        if (currentAttacker === 'challenger') {
            challengerDebuffs.forEach(d => {
                if (d.type === 'poison') {
                    const tick = toFrac(d.damagePerTick ?? d.pct ?? 0.01);
                    poisonDamage += Math.floor(challengerMaxHp * tick);
                }
            });
            // Cap Poison Damage (Max 15% HP per turn to prevent infinite stack exploit)
            poisonDamage = Math.min(poisonDamage, Math.floor(challengerMaxHp * DOT_CAP_FRAC));

            if (poisonDamage > 0) {
                challengerHp = Math.max(0, challengerHp - poisonDamage);
                // Check Fatal Protection after poison
                tryFatalProtection('challenger', 'độc');
            }
        } else {
            opponentDebuffs.forEach(d => {
                if (d.type === 'poison') {
                    const tick = toFrac(d.damagePerTick ?? d.pct ?? 0.01);
                    poisonDamage += Math.floor(opponentMaxHp * tick);
                } else if (d.type === 'burn') { /* burn damage logic here */ }
            });

            // Cap Poison Damage (Max 15% HP per turn)
            poisonDamage = Math.min(poisonDamage, Math.floor(opponentMaxHp * DOT_CAP_FRAC));

            if (poisonDamage > 0) {
                opponentHp = Math.max(0, opponentHp - poisonDamage);
                tryFatalProtection('opponent', 'độc');
            }
        }

        // 10. Apply Healing (Heal LAST: Damage -> Reflect -> DOT -> Heal -> Cleanup)
        // Consolidating all healing application here
        const totalHealing = skillHealed + lifestealHealed + regenerationHealed;
        if (currentAttacker === 'challenger') {
            // Apply to CURRENT HP (which might have been reduced by reflect/dot)
            if (challengerHp > 0) { // Only heal if alive? Usually yes, unless fatal protection triggered
                challengerHp = Math.min(challengerMaxHp, challengerHp + totalHealing);
            }
        } else {
            if (opponentHp > 0) {
                opponentHp = Math.min(opponentMaxHp, opponentHp + totalHealing);
            }
        }

        // Debug: Log healing
        if (isDebug && totalHealing > 0 && (turn <= 10 || turn % 10 === 0 || turn >= 20)) {
            console.log(`  -> Heal: +${totalHealing.toLocaleString()} (Skill: ${skillHealed}, LS: ${lifestealHealed}, Regen: ${regenerationHealed}) [Mult: ${sustainMultiplier.toFixed(2)}]`);
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
            heal: skillHealed + lifestealHealed + regenerationHealed,
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
                // Guard: if duration is invalid/missing, treat as expired
                if (typeof list[i].duration !== 'number' || isNaN(list[i].duration)) {
                    list.splice(i, 1);
                    continue;
                }

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

    const result = {
        winner: isDraw ? null : (challengerHp > 0 ? 'challenger' : 'opponent'),
        isDraw,
        logs,
        totalTurns: turn,
        totalDamageByChallenger,
        totalDamageByOpponent,
        finalChallengerHp: challengerHp,
        finalOpponentHp: opponentHp
    };

    // Final Summary Log
    if (isDebug) {
        console.log('\n========== BATTLE END ==========');
        console.log(`[RESULT] Winner: ${result.winner ? result.winner.toUpperCase() : 'DRAW'} after ${turn} turns`);
        console.log(`[STATS] Challenger: ${challengerHp.toLocaleString()} HP | Total Dmg Dealt: ${totalDamageByChallenger.toLocaleString()}`);
        console.log(`[STATS] Opponent: ${opponentHp.toLocaleString()} HP | Total Dmg Dealt: ${totalDamageByOpponent.toLocaleString()}`);
        console.log('=================================\n');
    }

    return result;
};

export default {
    simulateBattle,
    calculateHitChance
};
