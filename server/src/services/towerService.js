/**
 * Tower 100 Service
 * Climb, Sweep, Reset, and Weekly Chest logic
 */

import { TOWER_CONFIG, TOWER_MATERIAL_DROPS, SWEEP_CONFIG, TOWER_MONSTER_CONFIG, ASCENSION_14_TO_15 } from '../config/Tower100.js';
import { TOWER_MOB_SKILLS, TOWER_TIER_POOLS, TOWER_BOSS_MAP } from '../data/towerSkillsData.js';
import { getDayKeyBangkok, getISOWeekKeyBangkok } from '../utils/timeKeys.js';
import { addTowerMaterial, getTowerMaterialQty, getTowerMaterials } from './towerMaterialService.js';
import { simulateBattle } from './battleEngine.js';
import { mergeEquipmentStatsIntoCombatStats } from '../controllers/cultivation/coreController.js';
import { TECHNIQUES_MAP } from '../models/Cultivation.js';

// ==================== HELPERS ====================

function randomRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Get tier drops config for floor
 */
function getTierDrops(floor) {
    if (floor <= 30) return TOWER_MATERIAL_DROPS.tier1.drops;
    if (floor <= 60) return TOWER_MATERIAL_DROPS.tier2.drops;
    return TOWER_MATERIAL_DROPS.tier3.drops;
}

/**
 * Get drops for a floor
 */
export function getDropsForFloor(floor) {
    const drops = getTierDrops(floor);
    let crystal = randomRange(drops.crystal.min, drops.crystal.max);
    let shard = randomRange(drops.shard.min, drops.shard.max);

    // Boss bonus
    if (TOWER_CONFIG.isBossFloor(floor)) {
        const bonus = TOWER_MATERIAL_DROPS.bossBonus[floor];
        if (bonus) {
            crystal += bonus.crystal || 0;
            shard += bonus.shard || 0;
        }
    }

    return { mat_root_crystal: crystal, mat_heaven_shard: shard };
}

// ==================== RESET LOGIC ====================

/**
 * Ensure daily/weekly resets are applied
 * @returns {boolean} True if any reset was applied
 */
export function ensureTowerResets(cultivation) {
    const today = getDayKeyBangkok();
    const thisWeek = getISOWeekKeyBangkok();

    // Initialize towerProgress if not exists
    if (!cultivation.towerProgress) {
        cultivation.towerProgress = {
            highestFloorEver: 0,
            highestFloorThisWeek: 0,
            weeklyContractClaimed: false,
            weekKey: thisWeek,
            dailyAttemptsUsed: 0,
            dayKey: today,
            clearedBossFloorsEver: [],
            clearedBossFloorsThisWeek: [],
            totalClimbs: 0,
            totalSweeps: 0
        };
        return true;
    }

    const tp = cultivation.towerProgress;
    let changed = false;

    // Daily reset
    if (tp.dayKey !== today) {
        tp.dailyAttemptsUsed = 0;
        tp.dayKey = today;
        changed = true;
    }

    // Weekly reset (Monday)
    if (tp.weekKey !== thisWeek) {
        tp.highestFloorThisWeek = 0;
        tp.weeklyContractClaimed = false;
        tp.clearedBossFloorsThisWeek = [];
        tp.weekKey = thisWeek;
        changed = true;
    }

    return changed;
}

// ==================== MONSTER GENERATION ====================

const REALM_BRACKETS = [
    { min: 1, max: 3, base: { qiBlood: 1800, attack: 120, defense: 80, zhenYuan: 300 } },
    { min: 4, max: 6, base: { qiBlood: 12000, attack: 650, defense: 420, zhenYuan: 900 } },
    { min: 7, max: 9, base: { qiBlood: 80000, attack: 4200, defense: 2600, zhenYuan: 4500 } },
    { min: 10, max: 99, base: { qiBlood: 500000, attack: 30000, defense: 18000, zhenYuan: 25000 } }
];

function getRealmBaseStats(realmLevel) {
    const level = Number.isFinite(realmLevel) ? realmLevel : 1;
    const bracket = REALM_BRACKETS.find((b) => level >= b.min && level <= b.max) || REALM_BRACKETS[REALM_BRACKETS.length - 1];
    return bracket.base;
}

function softCap(value, pivot, strength = 0.5) {
    if (pivot <= 0) return value;
    if (value <= pivot) return value;
    const over = value - pivot;
    return pivot + Math.sqrt(over * pivot) * strength;
}

function blend(base, value, weight) {
    return base * (1 - weight) + value * weight;
}

function safeNumber(value, fallback = 0) {
    return Number.isFinite(value) ? value : fallback;
}

/**
 * Build tower monster based on floor and player stats
 */
export async function buildTowerMonster(floor, cultivation) {
    const diff = TOWER_CONFIG.getDifficulty(floor);
    const boss = TOWER_CONFIG.isBossFloor(floor);
    const reqRealm = TOWER_CONFIG.getRequiredRealm(floor);

    // Get player combat stats
    let playerStats = cultivation.calculateCombatStats() || {};
    const equipmentStats = await cultivation.getEquipmentStats();
    playerStats = mergeEquipmentStatsIntoCombatStats(playerStats, equipmentStats);

    const realmLevel = cultivation.realmLevel || 1;
    const realmBase = getRealmBaseStats(realmLevel);

    const playerQiBlood = safeNumber(playerStats.qiBlood, realmBase.qiBlood);
    const playerAttack = safeNumber(playerStats.attack, realmBase.attack);
    const playerDefense = safeNumber(playerStats.defense, realmBase.defense);
    const playerZhenYuan = safeNumber(playerStats.zhenYuan, realmBase.zhenYuan);

    const expected = {
        qiBlood: realmBase.qiBlood * 1.2,
        attack: realmBase.attack * 1.2,
        defense: realmBase.defense * 1.2,
        zhenYuan: realmBase.zhenYuan * 1.2
    };

    const soft = {
        qiBlood: softCap(playerQiBlood, expected.qiBlood, 0.55),
        attack: softCap(playerAttack, expected.attack, 0.45),
        defense: softCap(playerDefense, expected.defense, 0.45),
        zhenYuan: softCap(playerZhenYuan, expected.zhenYuan, 0.50)
    };

    const blended = {
        qiBlood: blend(realmBase.qiBlood, soft.qiBlood, 0.30),
        attack: blend(realmBase.attack, soft.attack, 0.25),
        defense: blend(realmBase.defense, soft.defense, 0.25),
        zhenYuan: blend(realmBase.zhenYuan, soft.zhenYuan, 0.20)
    };

    // Difficulty multiplier
    const diffMult = Math.max(0.1, TOWER_MONSTER_CONFIG.difficultyMultipliers[diff] || 1.0);

    // Floor multiplier (sqrt curve, floor 60 ~ 1.78)
    const floorMult = Math.max(0.1, 0.85 + Math.sqrt(Math.max(1, floor)) * 0.12);

    // Boss multiplier
    const bossMult = Math.max(0.1, boss ? TOWER_MONSTER_CONFIG.bossMultiplier : 1.0);

    const totalMult = diffMult * floorMult * bossMult;
    const cappedMult = Math.max(0.1, Math.min(totalMult, boss ? 12 : 8));
    const shouldLogCap = process.env.NODE_ENV !== 'test' && process.env.TOWER_DEBUG_CAP === '1';
    if (shouldLogCap && totalMult > cappedMult && Math.random() < 0.01) {
        console.log('[TOWER] Capped multiplier', { floor, diff, boss, totalMult, cappedMult, realmLevel });
    }

    const atk = Math.round(blended.attack * cappedMult * 0.95);
    const def = Math.round(blended.defense * cappedMult);
    const hp = Math.round(blended.qiBlood * cappedMult * 1.1);
    const mana = Math.round(blended.zhenYuan * cappedMult);

    // Monster names - Tiên Hiệp style
    const bossNames = ['Huyết Mang Đại Yêu', 'Thiên Ma Vương', 'Cửu U Minh Quỷ', 'Thái Cổ Hung Thú', 'Hắc Ám Chí Tôn'];
    const normalNames = ['Yêu Thú', 'Ma Quỷ', 'Hung Thú', 'Âm Hồn', 'Tà Linh'];
    const bossName = bossNames[Math.floor(floor / 20)] || 'Thiên Địa Ma Tôn';
    const normalName = normalNames[Math.floor(floor / 20)] || 'Ma Vật';

    return {
        name: boss ? `${bossName} (Tầng ${floor})` : `${normalName} Tầng ${floor}`,
        isBoss: boss,
        floor,
        difficulty: diff,
        requiredRealm: reqRealm,
        stats: {
            attack: atk,
            defense: def,
            qiBlood: hp,
            maxQiBlood: hp,
            zhenYuan: mana,
            maxZhenYuan: mana,
            speed: safeNumber(playerStats.speed, 100),
            criticalRate: 10 + (floor * 0.2),  // 10% base + 0.2% per floor
            criticalDamage: 150 + (floor * 0.5),   // 150% base + 0.5% per floor
            dodge: 5 + (floor * 0.1),
            penetration: 10 + (floor * 0.2),
            resistance: 10 + (floor * 0.2),
            lifesteal: boss ? 5 : 0,
            regeneration: 0
        },
        skills: getTowerMonsterSkills(floor, boss)
    };
}


// ==================== DETERMINISTIC RNG ====================
function sfc32(a, b, c, d) {
    return function () {
        a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
        var t = (a + b) | 0;
        a = b ^ b >>> 9;
        b = c + (c << 3) | 0;
        c = (c << 21 | c >>> 11);
        d = d + 1 | 0;
        t = t + d | 0;
        c = c + t | 0;
        return (t >>> 0) / 4294967296;
    }
}

function makeSeededRng(str) {
    // Simple hash to seed
    let seed1 = 1779033703, seed2 = 3144134277, seed3 = 1013904242, seed4 = 2773480762;
    for (let i = 0; i < str.length; i++) {
        seed1 = (seed2 ^ Math.imul(seed1 ^ str.charCodeAt(i), 597399067));
        seed2 = (seed3 ^ Math.imul(seed2 ^ str.charCodeAt(i), 2869860233));
        seed3 = (seed4 ^ Math.imul(seed3 ^ str.charCodeAt(i), 951274213));
        seed4 = (seed1 ^ Math.imul(seed4 ^ str.charCodeAt(i), 2716044179));
    }
    return sfc32(seed1, seed2, seed3, seed4);
}

/**
 * Get skills for tower monsters (Data Driven)
 */
function getTowerMonsterSkills(floor, isBoss) {
    const skills = [];
    const usedSkillIds = new Set();

    // Deterministic RNG seeded by floor + boss state
    // Ensures same floor always has same skills
    const rng = makeSeededRng(`tower_floor_${floor}_boss_${isBoss ? 'yes' : 'no'}`);

    // 1. Identify Tier
    const tierPool = TOWER_TIER_POOLS.find(p => floor >= p.floors[0] && floor <= p.floors[1])
        || TOWER_TIER_POOLS[TOWER_TIER_POOLS.length - 1]; // Fallback to last tier

    // 2. Boss Logic
    if (isBoss) {
        // Boss Config
        const bossConfig = TOWER_BOSS_MAP[floor];
        if (bossConfig) {
            // Signature Skill (Always First)
            const sigSkill = TOWER_MOB_SKILLS[bossConfig.signature];
            if (sigSkill) {
                skills.push(sigSkill);
                usedSkillIds.add(sigSkill.id);
            }

            // Pick extra skills from Tier Pool (Bosses get more skills: 3-5 total)
            const globalPool = tierPool.skills.filter(id => !usedSkillIds.has(id));

            // Should pick 2-4 more skills depending on floor
            const numExtras = floor >= 80 ? 4 : (floor >= 50 ? 3 : 2);

            for (let i = 0; i < numExtras; i++) {
                if (globalPool.length === 0) break;
                const idx = Math.floor(rng() * globalPool.length);
                const skillId = globalPool[idx];
                const skill = TOWER_MOB_SKILLS[skillId];
                if (skill) {
                    skills.push(skill);
                    usedSkillIds.add(skillId);
                    globalPool.splice(idx, 1); // Remove used
                }
            }
        }
    } else {
        // Normal Mob Logic
        // Pick 2-3 skills from Tier Pool
        const globalPool = [...tierPool.skills]; // Copy
        const numSkills = floor >= 60 ? 3 : 2;

        for (let i = 0; i < numSkills; i++) {
            if (globalPool.length === 0) break;
            const idx = Math.floor(rng() * globalPool.length);
            const skillId = globalPool[idx];
            const skill = TOWER_MOB_SKILLS[skillId];
            if (skill) {
                skills.push(skill);
                usedSkillIds.add(skillId);
                globalPool.splice(idx, 1);
            }
        }
    }

    // 3. Normalize Skills for Engine
    // (towerSkillsData format is already compatible with battleEngine schema,
    // but we ensure clean copies to avoid accidental mutations)
    return skills.map(s => ({
        ...s,
        damageMultiplier: s.damage ? s.damage.multiplier : undefined, // Compatibility mapping if needed
        // Any other adaptions can go here
    }));
}

/**
 * Get player skills from equipped combat techniques
 */
function getPlayerSkills(cultivation) {
    const skills = [];
    const equippedSlots = cultivation.equippedCombatTechniques || [];

    if (equippedSlots.length === 0 && cultivation.learnedTechniques?.length > 0) {
        // Backward compatibility: auto-equip first technique
        equippedSlots.push({
            slotIndex: 0,
            techniqueId: cultivation.learnedTechniques[0].techniqueId
        });
    }

    const combatStats = cultivation.calculateCombatStats();
    const maxMana = combatStats.zhenYuan || 1000;

    const sortedSlots = [...equippedSlots].sort((a, b) => a.slotIndex - b.slotIndex);

    sortedSlots.forEach(slot => {
        const learned = cultivation.learnedTechniques?.find(t => t.techniqueId === slot.techniqueId);
        if (!learned) return;

        const technique = TECHNIQUES_MAP.get(learned.techniqueId);
        if (technique && technique.skill) {
            const manaCostPercentMap = { 'common': 0.10, 'uncommon': 0.12, 'rare': 0.15, 'epic': 0.18, 'legendary': 0.22, 'mythic': 0.25 };
            const costPercent = manaCostPercentMap[technique.rarity] || 0.10;
            const manaCost = Math.max(15, Math.min(Math.floor(maxMana * costPercent), Math.floor(maxMana * 0.4)));

            skills.push({
                ...technique.skill,
                techniqueId: technique.id,
                techniqueName: technique.name,
                rarity: technique.rarity || 'common',
                level: learned.level,
                slotIndex: slot.slotIndex,
                damageMultiplier: 1 + (learned.level - 1) * 0.15,
                manaCost
            });
        }
    });

    return skills;
}

// ==================== BATTLE SIMULATION ====================

/**
 * Simulate tower battle
 */
async function simulateTowerBattle(cultivation, monster) {
    // Get player stats
    let playerStats = cultivation.calculateCombatStats();
    const equipmentStats = await cultivation.getEquipmentStats();
    playerStats = mergeEquipmentStatsIntoCombatStats(playerStats, equipmentStats);

    const playerSkills = getPlayerSkills(cultivation);
    const monsterSkills = monster.skills || [];

    // Use shared battle engine
    const battleResult = simulateBattle(playerStats, monster.stats, playerSkills, monsterSkills, { isDungeon: true });

    return {
        isWin: battleResult.winner === 'challenger',
        logs: battleResult.logs.map(log => ({
            round: log.turn,
            attacker: log.attacker === 'challenger' ? 'player' : 'monster',
            action: log.skillUsed ? 'skill' : 'attack',
            skillUsed: log.skillUsed,
            damage: log.damage,
            isCritical: log.isCritical,
            isDodged: log.isDodged,
            lifesteal: log.lifestealHealed,
            playerHpAfter: log.challengerHp,
            monsterHpAfter: log.opponentHp,
            playerMana: log.challengerMana,
            monsterMana: log.opponentMana,
            description: log.description
        })),
        rounds: battleResult.totalTurns,
        playerStats,
        monsterStats: monster.stats,
        maxPlayerHp: playerStats.maxQiBlood || playerStats.qiBlood,
        maxMonsterHp: monster.stats.maxQiBlood || monster.stats.qiBlood,
        finalPlayerHp: battleResult.finalChallengerHp,
        finalMonsterHp: battleResult.finalOpponentHp
    };
}

// ==================== CLIMB ====================

/**
 * Climb to next floor
 * @returns {Object} Battle result with rewards
 */
export async function climbNextFloor(cultivation) {
    ensureTowerResets(cultivation);

    const tp = cultivation.towerProgress;

    // Check attempts
    if (tp.dailyAttemptsUsed >= TOWER_CONFIG.DAILY_ATTEMPTS) {
        return {
            status: 'error',
            code: 'NO_ATTEMPTS',
            message: `Linh lực đã cạn kiệt! Hãy tĩnh dưỡng đến ngày mai.`,
            attemptsLeft: 0
        };
    }

    // Calculate next floor
    const nextFloor = (tp.highestFloorEver || 0) + 1;

    if (nextFloor > TOWER_CONFIG.TOTAL_FLOORS) {
        return {
            status: 'error',
            code: 'MAX_FLOOR',
            message: 'Đạo hữu đã đăng đỉnh Vạn Kiếp Tháp! Thiên hạ chấn động!'
        };
    }

    // Check realm requirement
    const reqRealm = TOWER_CONFIG.getRequiredRealm(nextFloor);
    const gate = TOWER_CONFIG.getRealmGate(nextFloor);

    if ((cultivation.realmLevel || 1) < reqRealm) {
        return {
            status: 'error',
            code: 'REALM_GATE',
            message: `Cấm chế tầng ${nextFloor}! Yêu cầu cảnh giới ${gate.realmName} trở lên.`,
            requiredRealm: gate
        };
    }

    // Build monster and battle
    const monster = await buildTowerMonster(nextFloor, cultivation);
    const battle = await simulateTowerBattle(cultivation, monster);

    // Consume attempt
    tp.dailyAttemptsUsed += 1;
    tp.totalClimbs = (tp.totalClimbs || 0) + 1;

    if (!battle.isWin) {
        // Lose: spent attempt, no progress
        return {
            status: 'ok',
            result: 'lose',
            floor: nextFloor,
            isBoss: monster.isBoss,
            battle,
            attemptsLeft: TOWER_CONFIG.DAILY_ATTEMPTS - tp.dailyAttemptsUsed,
            message: monster.isBoss
                ? `Đạo hữu bại trận dưới tay ${monster.name}! Hãy tu luyện thêm rồi tái chiến!`
                : `Bại trận tại tầng ${nextFloor}! Ma khí quá mạnh, hãy củng cố tu vi!`
        };
    }

    // Win: update progress
    tp.highestFloorEver = Math.max(tp.highestFloorEver || 0, nextFloor);
    tp.highestFloorThisWeek = Math.max(tp.highestFloorThisWeek || 0, nextFloor);

    // Boss verification
    if (TOWER_CONFIG.isBossFloor(nextFloor)) {
        if (!tp.clearedBossFloorsEver) tp.clearedBossFloorsEver = [];
        if (!tp.clearedBossFloorsThisWeek) tp.clearedBossFloorsThisWeek = [];

        if (!tp.clearedBossFloorsEver.includes(nextFloor)) {
            tp.clearedBossFloorsEver.push(nextFloor);
        }
        if (!tp.clearedBossFloorsThisWeek.includes(nextFloor)) {
            tp.clearedBossFloorsThisWeek.push(nextFloor);
        }
    }

    // Material drops
    const drops = getDropsForFloor(nextFloor);
    addTowerMaterial(cultivation, 'mat_root_crystal', drops.mat_root_crystal);
    addTowerMaterial(cultivation, 'mat_heaven_shard', drops.mat_heaven_shard);

    // Spirit stones
    const spiritStones = Math.round(10 + nextFloor * (monster.isBoss ? 8 : 3));
    cultivation.spiritStones += spiritStones;
    cultivation.totalSpiritStonesEarned = (cultivation.totalSpiritStonesEarned || 0) + spiritStones;

    // EXP (50 base + 5 per floor, boss x3)
    const exp = Math.round((50 + nextFloor * 5) * (monster.isBoss ? 3 : 1));
    cultivation.addExp(exp, 'tower', `Tháp tầng ${nextFloor}`);

    // Check weekly chest eligibility: dùng highestFloorEver (đã update ở trên)
    const hasPassedBoss60 = (tp.highestFloorEver || 0) >= TOWER_CONFIG.WEEKLY_CHEST_FLOOR;
    const weeklyEligible = hasPassedBoss60 && !tp.weeklyContractClaimed;

    // Victory messages - Tiên Hiệp style
    let message;
    if (monster.isBoss) {
        message = `Đạo hữu đã trảm sát ${monster.name}! Uy chấn thiên hạ!`;
    } else if (nextFloor % 10 === 0) {
        message = `Đột phá tầng ${nextFloor}! Tiên cơ ẩn hiện, đạo hữu tiến thêm một bước!`;
    } else {
        message = `Tầng ${nextFloor} đã phá! Thu hoạch ${drops.mat_heaven_shard} Thiên Đạo Mảnh.`;
    }

    return {
        status: 'ok',
        result: 'win',
        floor: nextFloor,
        isBoss: monster.isBoss,
        rewards: {
            ...drops,
            spiritStones,
            exp
        },
        battle,
        attemptsLeft: TOWER_CONFIG.DAILY_ATTEMPTS - tp.dailyAttemptsUsed,
        weeklyEligible,
        message
    };
}

// ==================== SWEEP ====================

/**
 * Sweep a cleared floor for materials
 */
export async function sweepFloor(cultivation, floor) {
    ensureTowerResets(cultivation);

    const tp = cultivation.towerProgress;

    // Check attempts
    if (tp.dailyAttemptsUsed >= TOWER_CONFIG.DAILY_ATTEMPTS) {
        return {
            status: 'error',
            code: 'NO_ATTEMPTS',
            message: `Linh lực đã cạn kiệt! Hãy tĩnh dưỡng đến ngày mai.`,
            attemptsLeft: 0
        };
    }

    const maxClear = tp.highestFloorEver || 0;

    // Default to highest non-boss floor if not specified
    if (!floor) {
        floor = Math.max(1, maxClear);
        // Find highest non-boss floor
        while (floor > 0 && TOWER_CONFIG.isBossFloor(floor)) {
            floor--;
        }
    }

    // Validate floor
    if (floor < 1 || floor > maxClear) {
        return {
            status: 'error',
            code: 'INVALID_FLOOR',
            message: `Chỉ có thể quét đãng tầng 1-${maxClear} (đã chinh phục)`
        };
    }

    // No boss sweep
    if (SWEEP_CONFIG.noBossSweep && TOWER_CONFIG.isBossFloor(floor)) {
        return {
            status: 'error',
            code: 'NO_BOSS_SWEEP',
            message: 'Tầng có Ma Vương trấn thủ, không thể quét đãng!'
        };
    }

    // Consume attempt
    tp.dailyAttemptsUsed += 1;
    tp.totalSweeps = (tp.totalSweeps || 0) + 1;

    // Sweep rewards = 70% of normal
    const mul = SWEEP_CONFIG.rewardMultiplier;
    const drops = getDropsForFloor(floor);
    const crystal = Math.floor(drops.mat_root_crystal * mul);
    const shard = Math.floor(drops.mat_heaven_shard * mul);

    addTowerMaterial(cultivation, 'mat_root_crystal', crystal);
    addTowerMaterial(cultivation, 'mat_heaven_shard', shard);

    const spiritStones = Math.floor((10 + floor * 3) * mul);
    cultivation.spiritStones += spiritStones;
    cultivation.totalSpiritStonesEarned = (cultivation.totalSpiritStonesEarned || 0) + spiritStones;

    const exp = Math.floor((50 + floor * 5) * mul);
    cultivation.addExp(exp, 'tower_sweep', `Sweep tầng ${floor}`);

    // IMPORTANT: Sweep does NOT:
    // - Update highestFloorThisWeek  
    // - Clear boss floors
    // - Drop contract

    return {
        status: 'ok',
        floor,
        rewards: {
            mat_root_crystal: crystal,
            mat_heaven_shard: shard,
            spiritStones,
            exp
        },
        attemptsLeft: TOWER_CONFIG.DAILY_ATTEMPTS - tp.dailyAttemptsUsed,
        message: `Quét đãng tầng ${floor} hoàn tất! Thu hoạch ${shard} Thiên Đạo Mảnh, ${crystal} Linh Căn Tinh Thạch.`
    };
}

// ==================== WEEKLY CHEST ====================

/**
 * Check if weekly chest is claimable
 * Condition: highestFloorEver >= 60 (đã từng vượt boss 60)
 */
export function isWeeklyChestEligible(cultivation) {
    ensureTowerResets(cultivation);
    const tp = cultivation.towerProgress;

    // Đã vượt qua boss tầng 60 ít nhất 1 lần + chưa claim tuần này
    const hasPassedBoss60 = (tp.highestFloorEver || 0) >= TOWER_CONFIG.WEEKLY_CHEST_FLOOR;
    return hasPassedBoss60 && !tp.weeklyContractClaimed;
}

/**
 * Claim weekly chest (1 contract/week)
 * Returns the reward or error
 */
export function claimWeeklyChest(cultivation) {
    ensureTowerResets(cultivation);
    const tp = cultivation.towerProgress;

    // Check eligibility: chỉ cần đã từng vượt boss 60
    const hasPassedBoss60 = (tp.highestFloorEver || 0) >= TOWER_CONFIG.WEEKLY_CHEST_FLOOR;

    if (!hasPassedBoss60) {
        return {
            status: 'error',
            code: 'BOSS_NOT_CLEARED',
            message: `Phải vượt qua tầng ${TOWER_CONFIG.WEEKLY_CHEST_FLOOR} một lần mới có thể nhận Bảo Rương Tuần!`
        };
    }

    if (tp.weeklyContractClaimed) {
        return {
            status: 'error',
            code: 'ALREADY_CLAIMED',
            message: 'Bảo Rương Tuần đã được khai mở. Thiên cơ tái hiện vào Nguyệt Diệu Nhật (thứ Hai).'
        };
    }

    // Claim!
    tp.weeklyContractClaimed = true;
    addTowerMaterial(cultivation, 'mat_contract', 1);

    const currentContracts = getTowerMaterialQty(cultivation, 'mat_contract');
    const requiredContracts = ASCENSION_14_TO_15.required.mat_contract;

    return {
        status: 'ok',
        rewards: {
            mat_contract: 1
        },
        progress: {
            current: currentContracts,
            required: requiredContracts
        },
        message: `Thiên cơ giáng lâm! Nhận được Khế Ước Phi Thăng! (${currentContracts}/${requiredContracts} để phi thăng)`
    };
}

// ==================== ASCENSION CHECK ====================

/**
 * Check if player can ascend from 14 to 15
 */
export function canAscend14to15(cultivation) {
    const req = ASCENSION_14_TO_15.required;

    return {
        eligible: (
            getTowerMaterialQty(cultivation, 'mat_contract') >= req.mat_contract &&
            getTowerMaterialQty(cultivation, 'mat_heaven_shard') >= req.mat_heaven_shard &&
            getTowerMaterialQty(cultivation, 'mat_root_crystal') >= req.mat_root_crystal
        ),
        current: getTowerMaterials(cultivation),
        required: req
    };
}

// ==================== STATUS ====================

/**
 * Get tower status for a player
 */
export function getTowerStatus(cultivation) {
    ensureTowerResets(cultivation);
    const tp = cultivation.towerProgress;

    const attemptsLeft = TOWER_CONFIG.DAILY_ATTEMPTS - (tp.dailyAttemptsUsed || 0);
    // Weekly chest: chỉ cần đã từng vượt boss 60
    const hasPassedBoss60 = (tp.highestFloorEver || 0) >= TOWER_CONFIG.WEEKLY_CHEST_FLOOR;
    const weeklyEligible = hasPassedBoss60 && !tp.weeklyContractClaimed;
    const nextFloor = (tp.highestFloorEver || 0) + 1;
    const nextRealmGate = TOWER_CONFIG.getRealmGate(nextFloor);

    return {
        attemptsLeft,
        attemptsMax: TOWER_CONFIG.DAILY_ATTEMPTS,
        highestFloorEver: tp.highestFloorEver || 0,
        highestFloorThisWeek: tp.highestFloorThisWeek || 0,
        nextFloor: Math.min(nextFloor, TOWER_CONFIG.TOTAL_FLOORS),
        nextRealmGate,
        bossClearedThisWeek: tp.clearedBossFloorsThisWeek || [],
        bossClearedEver: tp.clearedBossFloorsEver || [],
        weeklyEligible,
        weeklyContractClaimed: tp.weeklyContractClaimed || false,
        materials: getTowerMaterials(cultivation),
        ascensionCheck: canAscend14to15(cultivation),
        stats: {
            totalClimbs: tp.totalClimbs || 0,
            totalSweeps: tp.totalSweeps || 0
        }
    };
}

export default {
    ensureTowerResets,
    buildTowerMonster,
    climbNextFloor,
    sweepFloor,
    claimWeeklyChest,
    isWeeklyChestEligible,
    canAscend14to15,
    getTowerStatus,
    getDropsForFloor
};
