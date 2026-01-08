import mongoose from "mongoose";
import Cultivation, { CULTIVATION_REALMS, SHOP_ITEMS, ITEM_TYPES, TECHNIQUES_MAP, SHOP_ITEMS_MAP } from "../../models/Cultivation.js";
import { logDungeonEvent } from "./worldEventController.js";
import {
    DUNGEON_TEMPLATES,
    DIFFICULTY_CONFIG,
    calculateMonsterStats,
    selectMonsterForFloor,
    calculateFloorRewards,
    rollItemDrop,
    DungeonRun,
    getMonsterSkills
} from "../../models/Dungeon.js";
import { formatCultivationResponse, mergeEquipmentStatsIntoCombatStats } from "./coreController.js";
import { generateMaterialDrops } from "../../services/dropService.js";
import { addMaterialsToInventory, logMaterialDrop } from "./materialController.js";
import Equipment from "../../models/Equipment.js";
import { executeSkill, applyStatusEffects } from "../../services/combatSkillService.js";
import { simulateBattle } from "../../services/battleEngine.js";
import {
    calculateActiveModifiers,
    calculateElementSynergy,
    calculateDamageModifiers,
    calculateDefensiveModifiers,
    calculateRewardModifiers,
    reduceDurability
} from "../../services/modifierService.js";
import { getClient, isRedisConnected } from "../../services/redisClient.js";
import { saveWithRetry } from "../../utils/dbUtils.js";
import crypto from "crypto";


// ==================== REDIS LOCK HELPERS (Production-grade) ====================

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Acquire Redis lock with backoff wait (max 2s)
 * No busy-loop, uses exponential backoff with jitter
 */
async function acquireLockWithWait(lockKey, ttlMs = 8000, maxWaitMs = 2000) {
    const redis = getClient();
    if (!redis || !isRedisConnected()) {
        // Fallback: skip lock if Redis unavailable (still use atomic update)
        return { token: crypto.randomUUID(), acquired: true, fallback: true };
    }

    const token = crypto.randomUUID();
    const start = Date.now();
    let delay = 40;

    while (Date.now() - start < maxWaitMs) {
        try {
            const ok = await redis.set(lockKey, token, 'NX', 'PX', ttlMs);
            if (ok) return { token, acquired: true };
        } catch (err) {
            console.error('[Lock] Redis error:', err.message);
            return { token, acquired: true, fallback: true };
        }

        // Backoff with jitter
        const jitter = Math.floor(Math.random() * 20);
        await sleep(delay + jitter);
        delay = Math.min(delay + 40, 200);
    }

    return { token: null, acquired: false };
}

/**
 * Release Redis lock safely with token verification
 */
async function releaseLock(lockKey, token) {
    const redis = getClient();
    if (!redis || !isRedisConnected() || !token) return;

    try {
        const lua = `
            if redis.call("get", KEYS[1]) == ARGV[1]
            then return redis.call("del", KEYS[1])
            else return 0 end
        `;
        await redis.eval(lua, 1, lockKey, token);
    } catch (err) {
        console.error('[Lock] Release error:', err.message);
    }
}

// ==================== IDEMPOTENCY HELPERS ====================

function respKey(userId, requestId) {
    return `battle:resp:${userId}:${requestId}`;
}

async function getCachedResponse(userId, requestId) {
    if (!requestId) return null;
    const redis = getClient();
    if (!redis || !isRedisConnected()) return null;

    try {
        const cached = await redis.get(respKey(userId, requestId));
        return cached ? JSON.parse(cached) : null;
    } catch {
        return null;
    }
}

async function cacheResponse(userId, requestId, response, ttlSec = 30) {
    if (!requestId) return;

    // Only cache terminal responses - don't cache busy/transient errors
    const cacheableStatuses = ['applied', 'already_updated'];
    if (!response.success && !cacheableStatuses.includes(response.status)) {
        return; // Skip caching busy, transient_error, etc.
    }

    const redis = getClient();
    if (!redis || !isRedisConnected()) return;

    try {
        await redis.set(respKey(userId, requestId), JSON.stringify(response), 'EX', ttlSec);
    } catch (err) {
        console.error('[Idempotency] Cache error:', err.message);
    }
}

// ==================== ATOMIC BATTLE UPDATE ====================

/**
 * Apply battle results atomically with floor guard + DB-level idempotency
 * Returns true if update applied, false if state already changed or duplicate request
 */
async function applyBattleAtomic({
    userId, dungeonId, currentFloor, nextFloor,
    finalExp, spiritStones, expEntry, isBoss, now, requestId
}) {
    const filter = {
        user: userId,
        "dungeonProgress.dungeonId": dungeonId,
        "dungeonProgress.currentFloor": currentFloor, // Guard: only update if floor matches
    };

    // Add DB-level idempotency guard if requestId provided
    if (requestId) {
        filter.recentBattleRequestIds = { $nin: [requestId] };
    }

    const update = {
        $inc: {
            exp: finalExp,
            spiritStones: spiritStones,
            totalSpiritStonesEarned: spiritStones,
            "dungeonStats.totalMonstersKilled": 1,
            "dungeonStats.totalDungeonExpEarned": finalExp,
            "dungeonStats.totalDungeonSpiritStonesEarned": spiritStones,
            ...(isBoss && { "dungeonStats.totalBossesKilled": 1 }),
        },
        $set: {
            "dungeonProgress.$.currentFloor": nextFloor,
            updatedAt: now,
        },
        $push: {
            expLog: { $each: [expEntry], $slice: -200 },
            // Store requestId for DB-level idempotency (keep last 50)
            ...(requestId && { recentBattleRequestIds: { $each: [requestId], $slice: -50 } }),
        },
    };

    const result = await Cultivation.updateOne(filter, update);
    return result.modifiedCount === 1;
}

/**
 * ==================== DUNGEON CONTROLLER ====================
 * Quản lý tất cả logic liên quan đến hệ thống Bí Cảnh
 */

// ==================== HELPER FUNCTIONS ====================

/**
 * Kiểm tra user có đủ yêu cầu để vào dungeon không
 */
const checkDungeonRequirements = (cultivation, dungeon) => {
    const config = DIFFICULTY_CONFIG[dungeon.difficulty];

    // Check realm requirement
    if (cultivation.realmLevel < dungeon.requiredRealm) {
        const requiredRealmName = CULTIVATION_REALMS.find(r => r.level === dungeon.requiredRealm)?.name;
        return {
            canEnter: false,
            reason: `Cần đạt cảnh giới ${requiredRealmName} để vào bí cảnh này`
        };
    }

    // Check spirit stones
    if (cultivation.spiritStones < config.baseSpiritStoneCost) {
        return {
            canEnter: false,
            reason: `Cần ${config.baseSpiritStoneCost} linh thạch để vào bí cảnh`
        };
    }

    // Check if already in this dungeon
    const progress = cultivation.dungeonProgress?.find(p => p.dungeonId === dungeon.id);
    if (progress?.inProgress) {
        return { canEnter: false, reason: "Bạn đang trong bí cảnh này", inProgress: true };
    }

    // Check cooldown
    if (progress?.cooldownUntil && new Date(progress.cooldownUntil) > new Date()) {
        const remaining = new Date(progress.cooldownUntil) - new Date();
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        return {
            canEnter: false,
            reason: `Cần chờ ${hours}h ${minutes}m trước khi vào lại`,
            cooldownRemaining: remaining
        };
    }

    return { canEnter: true };
};

/**
 * Simulate combat between player and monster WITH SKILL & MANA SYSTEM
 * @param {Object} cultivation - Player's cultivation data
 * @param {Object} monster - Monster with stats and skills
 * @param {Array} playerSkills - Skills from learned techniques
 * @param {Array} monsterSkills - Monster's skills from dungeon definition
 * @returns {Object} Battle result with logs
 */
const simulateDungeonBattle = async (cultivation, monster, playerSkills = [], monsterSkills = []) => {
    // Get player stats
    let playerStats = cultivation.calculateCombatStats();
    const equipmentStats = await cultivation.getEquipmentStats();
    playerStats = mergeEquipmentStatsIntoCombatStats(playerStats, equipmentStats);

    const monsterStats = monster.stats;

    // Simulate battle using shared engine
    const battleResult = simulateBattle(playerStats, monsterStats, playerSkills, monsterSkills, { isDungeon: true });

    // Map logs to preserve compatibility with Dungeon UI
    const logs = battleResult.logs.map(log => ({
        round: log.turn,
        attacker: log.attacker === 'challenger' ? 'player' : 'monster',
        action: log.skillUsed ? 'skill' : 'attack',
        skillUsed: log.skillUsed,
        damage: log.damage,
        isCritical: log.isCritical,
        isDodged: log.isDodged,
        lifesteal: log.lifestealHealed,
        // Map HP/Mana
        playerHpAfter: log.challengerHp,
        monsterHpAfter: log.opponentHp,
        playerMana: log.challengerMana,
        monsterMana: log.opponentMana,
        manaConsumed: log.manaConsumed,
        description: log.description
    }));

    // Compute summary fields expected by dungeon UI/controller
    const maxPlayerHp = playerStats.maxQiBlood || playerStats.qiBlood || 0;
    const maxMonsterHp = monsterStats.maxQiBlood || monsterStats.qiBlood || 0;
    const maxPlayerMana = playerStats.maxZhenYuan || playerStats.zhenYuan || 0;
    const maxMonsterMana = monsterStats.maxZhenYuan || monsterStats.zhenYuan || 0;
    const finalPlayerHp = battleResult.finalChallengerHp;
    const finalMonsterHp = battleResult.finalOpponentHp;
    const lastLog = battleResult.logs[battleResult.logs.length - 1] || {};
    const finalPlayerMana = lastLog.challengerMana ?? maxPlayerMana;
    const finalMonsterMana = lastLog.opponentMana ?? maxMonsterMana;

    return {
        isWin: battleResult.winner === 'challenger',
        logs,
        rounds: battleResult.totalTurns,
        // Legacy fields expected downstream
        playerStats,
        monsterStats,
        maxPlayerHp,
        maxMonsterHp,
        finalPlayerHp,
        finalMonsterHp,
        maxPlayerMana,
        maxMonsterMana,
        finalPlayerMana,
        finalMonsterMana
    };
};


// ==================== CONTROLLER METHODS ====================

/**
 * GET /api/cultivation/dungeons
 * Lấy danh sách tất cả bí cảnh với trạng thái của user
 */
export const getDungeons = async (req, res, next) => {
    try {
        const cultivation = await Cultivation.getOrCreate(req.user.id);

        const dungeons = DUNGEON_TEMPLATES.map(dungeon => {
            const config = DIFFICULTY_CONFIG[dungeon.difficulty];
            const progress = cultivation.dungeonProgress?.find(p => p.dungeonId === dungeon.id);
            const requirements = checkDungeonRequirements(cultivation, dungeon);
            const requiredRealmName = CULTIVATION_REALMS.find(r => r.level === dungeon.requiredRealm)?.name;

            return {
                ...dungeon,
                floors: config.floors,
                entryCost: config.baseSpiritStoneCost,
                cooldownHours: config.cooldownHours,
                expMultiplier: config.expMultiplier,
                requiredRealmName,
                // User progress
                progress: progress ? {
                    currentFloor: progress.currentFloor,
                    highestFloor: progress.highestFloor,
                    totalClears: progress.totalClears,
                    inProgress: progress.inProgress,
                    cooldownUntil: progress.cooldownUntil,
                    isOnCooldown: progress.cooldownUntil && new Date(progress.cooldownUntil) > new Date()
                } : null,
                // Status
                canEnter: requirements.canEnter,
                statusMessage: requirements.reason || null,
                meetsRequirement: cultivation.realmLevel >= dungeon.requiredRealm,
                hasEnoughStones: cultivation.spiritStones >= config.baseSpiritStoneCost
            };
        });

        res.json({
            success: true,
            data: {
                dungeons,
                playerSpiritStones: cultivation.spiritStones,
                playerRealmLevel: cultivation.realmLevel,
                dungeonStats: cultivation.dungeonStats || {}
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/cultivation/dungeons/:dungeonId/enter
 * Vào bí cảnh (bắt đầu mới hoặc tiếp tục)
 */
export const enterDungeon = async (req, res, next) => {
    try {
        const { dungeonId } = req.params;
        const cultivation = await Cultivation.getOrCreate(req.user.id);

        // Find dungeon template
        const dungeon = DUNGEON_TEMPLATES.find(d => d.id === dungeonId);
        if (!dungeon) {
            return res.status(404).json({ success: false, message: "Không tìm thấy bí cảnh" });
        }

        const config = DIFFICULTY_CONFIG[dungeon.difficulty];

        // Check if already in progress - resume
        let progress = cultivation.dungeonProgress?.find(p => p.dungeonId === dungeonId);
        if (progress?.inProgress && progress.currentRunId) {
            const existingRun = await DungeonRun.findById(progress.currentRunId);
            if (existingRun && !existingRun.isCompleted && !existingRun.isAbandoned) {
                // Resume existing run
                const currentMonster = selectMonsterForFloor(dungeonId, progress.currentFloor + 1, config.floors);
                // Get player stats for chaos realm scaling
                let playerStatsForScaling = null;
                if (dungeonId === 'chaos_realm') {
                    playerStatsForScaling = cultivation.calculateCombatStats();
                    const equipmentStats = await cultivation.getEquipmentStats();
                    playerStatsForScaling = mergeEquipmentStatsIntoCombatStats(playerStatsForScaling, equipmentStats);
                }
                const scaledMonster = calculateMonsterStats(currentMonster, progress.currentFloor + 1, dungeon.difficulty, dungeonId, playerStatsForScaling);

                return res.json({
                    success: true,
                    message: "Tiếp tục khám phá bí cảnh",
                    data: {
                        dungeon: {
                            ...dungeon,
                            totalFloors: config.floors
                        },
                        run: existingRun,
                        currentFloor: progress.currentFloor,
                        nextFloor: progress.currentFloor + 1,
                        nextMonster: scaledMonster,
                        resumed: true
                    }
                });
            }
        }

        // Check requirements for new run
        const requirements = checkDungeonRequirements(cultivation, dungeon);
        if (!requirements.canEnter) {
            return res.status(400).json({
                success: false,
                message: requirements.reason,
                cooldownRemaining: requirements.cooldownRemaining
            });
        }

        // Deduct spirit stones
        cultivation.spiritStones -= config.baseSpiritStoneCost;

        // Create new dungeon run
        const newRun = new DungeonRun({
            user: req.user.id,
            dungeonId,
            totalFloors: config.floors,
            startedAt: new Date()
        });
        await newRun.save();

        // Update or create progress
        if (!progress) {
            if (!cultivation.dungeonProgress) cultivation.dungeonProgress = [];
            cultivation.dungeonProgress.push({
                dungeonId,
                currentFloor: 0,
                highestFloor: 0,
                totalClears: 0,
                inProgress: true,
                currentRunId: newRun._id
            });
            progress = cultivation.dungeonProgress[cultivation.dungeonProgress.length - 1];
        } else {
            progress.currentFloor = 0;
            progress.inProgress = true;
            progress.currentRunId = newRun._id;
        }

        await saveWithRetry(cultivation);

        // Get first floor monster
        const firstMonster = selectMonsterForFloor(dungeonId, 1, config.floors);
        // Get player stats for chaos realm scaling
        let playerStatsForScaling = null;
        if (dungeonId === 'chaos_realm') {
            let tempPlayerStats = cultivation.calculateCombatStats();
            const equipmentStats = await cultivation.getEquipmentStats();
            playerStatsForScaling = mergeEquipmentStatsIntoCombatStats(tempPlayerStats, equipmentStats);
        }
        const scaledMonster = calculateMonsterStats(firstMonster, 1, dungeon.difficulty, dungeonId, playerStatsForScaling);

        res.json({
            success: true,
            message: `Đã vào ${dungeon.name}! Chi phí: ${config.baseSpiritStoneCost} linh thạch`,
            data: {
                dungeon: {
                    ...dungeon,
                    totalFloors: config.floors
                },
                run: newRun,
                currentFloor: 0,
                nextFloor: 1,
                nextMonster: scaledMonster,
                spiritStonesSpent: config.baseSpiritStoneCost,
                remainingSpiritStones: cultivation.spiritStones
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/cultivation/dungeons/:dungeonId/current-floor
 * Lấy thông tin tầng hiện tại
 */
export const getCurrentFloor = async (req, res, next) => {
    try {
        const { dungeonId } = req.params;
        const cultivation = await Cultivation.getOrCreate(req.user.id);

        const progress = cultivation.dungeonProgress?.find(p => p.dungeonId === dungeonId);
        if (!progress?.inProgress) {
            return res.status(400).json({ success: false, message: "Bạn chưa vào bí cảnh này" });
        }

        const dungeon = DUNGEON_TEMPLATES.find(d => d.id === dungeonId);
        const config = DIFFICULTY_CONFIG[dungeon.difficulty];
        const nextFloor = progress.currentFloor + 1;

        if (nextFloor > config.floors) {
            return res.json({
                success: true,
                data: { completed: true, message: "Đã hoàn thành bí cảnh!" }
            });
        }

        const monster = selectMonsterForFloor(dungeonId, nextFloor, config.floors);
        // Get player stats for chaos realm scaling
        let playerStatsForScaling = null;
        if (dungeonId === 'chaos_realm') {
            let tempPlayerStats = cultivation.calculateCombatStats();
            const equipmentStats = await cultivation.getEquipmentStats();
            playerStatsForScaling = mergeEquipmentStatsIntoCombatStats(tempPlayerStats, equipmentStats);
        }
        const scaledMonster = calculateMonsterStats(monster, nextFloor, dungeon.difficulty, dungeonId, playerStatsForScaling);
        const rewards = calculateFloorRewards(dungeon.difficulty, nextFloor, monster.type);

        res.json({
            success: true,
            data: {
                dungeonId,
                dungeonName: dungeon.name,
                currentFloor: progress.currentFloor,
                nextFloor,
                totalFloors: config.floors,
                monster: scaledMonster,
                potentialRewards: rewards,
                isBossFloor: monster.type === 'boss',
                isEliteFloor: monster.type === 'elite'
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/cultivation/dungeons/:dungeonId/battle
 * Chiến đấu với quái vật tầng hiện tại
 */
export const battleMonster = async (req, res, next) => {
    const userId = req.user.id;
    const { dungeonId } = req.params;
    const requestId = req.body?.requestId; // Client-generated UUID for idempotency
    const lockKey = `lock:battle:${userId}`;
    let lockToken = null;

    // ==================== IDEMPOTENCY FAST-PATH ====================
    const cachedResp = await getCachedResponse(userId, requestId);
    if (cachedResp) {
        return res.json(cachedResp);
    }

    // ==================== REDIS LOCK WITH BACKOFF (max 2s wait) ====================
    const { token, acquired } = await acquireLockWithWait(lockKey, 8000, 2000);
    if (!acquired) {
        // Không trả lỗi cứng, trả 200 với status busy
        return res.json({
            success: false,
            status: "busy",
            message: "Đang giao chiến, vui lòng đợi...",
            retryAfterMs: 300
        });
    }
    lockToken = token;

    try {
        const cultivation = await Cultivation.getOrCreate(userId);

        const progress = cultivation.dungeonProgress?.find(p => p.dungeonId === dungeonId);
        if (!progress?.inProgress) {
            return res.status(400).json({ success: false, message: "Bạn chưa vào bí cảnh này" });
        }

        const dungeon = DUNGEON_TEMPLATES.find(d => d.id === dungeonId);
        const config = DIFFICULTY_CONFIG[dungeon.difficulty];
        const currentFloor = progress.currentFloor + 1;

        if (currentFloor > config.floors) {
            return res.status(400).json({ success: false, message: "Đã hoàn thành bí cảnh" });
        }

        // Get monster for this floor
        const monster = selectMonsterForFloor(dungeonId, currentFloor, config.floors);
        // Get player stats for chaos realm scaling
        let playerStatsForScaling = null;
        if (dungeonId === 'chaos_realm') {
            let tempPlayerStats = cultivation.calculateCombatStats();
            const equipmentStats = await cultivation.getEquipmentStats();
            playerStatsForScaling = mergeEquipmentStatsIntoCombatStats(tempPlayerStats, equipmentStats);
        }
        const scaledMonster = calculateMonsterStats(monster, currentFloor, dungeon.difficulty, dungeonId, playerStatsForScaling);

        // ==================== GET PLAYER SKILLS FROM EQUIPPED SLOTS ====================
        const playerSkills = [];

        // Lấy equipped slots và sắp xếp theo slotIndex
        const equippedSlots = cultivation.equippedCombatTechniques || [];

        // Backward compatibility: Auto-equip first technique if no slots
        if (equippedSlots.length === 0 && cultivation.learnedTechniques?.length > 0) {
            const firstTechnique = cultivation.learnedTechniques[0];
            equippedSlots.push({
                slotIndex: 0,
                techniqueId: firstTechnique.techniqueId
            });
        }

        // Get combat stats để tính mana cost
        const combatStats = cultivation.calculateCombatStats();
        const maxMana = combatStats.zhenYuan || 1000;

        // Sắp xếp và build skills từ slots
        const sortedSlots = equippedSlots.sort((a, b) => a.slotIndex - b.slotIndex);

        sortedSlots.forEach(slot => {
            // Tìm learned technique tương ứng
            const learned = cultivation.learnedTechniques?.find(t => t.techniqueId === slot.techniqueId);
            if (!learned) return; // Skip if not learned

            // Use TECHNIQUES_MAP for O(1) lookup
            const technique = TECHNIQUES_MAP.get(learned.techniqueId);
            if (technique && technique.skill) {
                // Calculate mana cost as percentage of max mana (matching PK system)
                // Increase dungeon skill mana cost to reduce burst frequency
                const manaCostPercentMap = { 'common': 0.10, 'uncommon': 0.12, 'rare': 0.15, 'epic': 0.18, 'legendary': 0.22, 'mythic': 0.25 };
                const costPercent = manaCostPercentMap[technique.rarity] || 0.10;
                const manaCost = Math.max(15, Math.min(Math.floor(maxMana * costPercent), Math.floor(maxMana * 0.4)));

                playerSkills.push({
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

        // Get monster skills based on dungeon and monster type
        const monsterSkills = getMonsterSkills(dungeonId, monster.type);

        // Simulate battle with skills
        const battleResult = await simulateDungeonBattle(cultivation, scaledMonster, playerSkills, monsterSkills);

        // Get the run record
        const run = await DungeonRun.findById(progress.currentRunId);
        if (!run) {
            return res.status(400).json({ success: false, message: "Không tìm thấy phiên khám phá" });
        }

        if (battleResult.isWin) {
            // Calculate rewards
            const rewards = calculateFloorRewards(dungeon.difficulty, currentFloor, monster.type);
            let itemDropped = null;

            // Roll for item drop
            if (Math.random() < rewards.itemDropRate) {
                itemDropped = rollItemDrop(dungeon.difficulty);
                if (itemDropped) {
                    // Use SHOP_ITEMS_MAP for O(1) lookup
                    const shopItem = SHOP_ITEMS_MAP.get(itemDropped);
                    if (shopItem) {
                        // Add to inventory
                        const existingItem = cultivation.inventory.find(i => i.itemId === itemDropped);
                        if (existingItem) {
                            existingItem.quantity = (existingItem.quantity || 1) + 1;
                        } else {
                            cultivation.inventory.push({
                                itemId: itemDropped,
                                name: shopItem.name,
                                type: shopItem.type,
                                quantity: 1,
                                acquiredAt: new Date(),
                                rarity: shopItem.rarity,
                                metadata: { ...shopItem }
                            });
                        }
                    }
                }
            }

            // ==================== APPLY MODIFIER BONUSES ====================
            // Get equipped items and calculate active modifiers
            let modifierBonuses = { rewards: { exp: rewards.exp, spiritStones: rewards.spiritStones }, bonuses: [] };
            try {
                // Get equipment IDs from cultivation.equipped slots (new system)
                // Get equipment IDs from cultivation.equipped slots (new system)
                const equipmentSlots = ['weapon', 'magicTreasure', 'helmet', 'chest', 'shoulder', 'gloves', 'boots', 'belt', 'ring', 'necklace', 'earring', 'bracelet', 'powerItem'];
                const equipmentIds = equipmentSlots
                    .map(slot => cultivation.equipped?.[slot])
                    .filter(id => id != null);

                let activeModifiers = {};
                let equipments = [];

                // 1. Get Equipment Modifiers
                if (equipmentIds.length > 0) {
                    equipments = await Equipment.find({ _id: { $in: equipmentIds } });
                    activeModifiers = calculateActiveModifiers(equipments);
                }

                // 2. Add Active Boosts (Charms/Pills)
                const now = new Date();
                if (cultivation.activeBoosts && cultivation.activeBoosts.length > 0) {
                    cultivation.activeBoosts.forEach(boost => {
                        if (new Date(boost.expiresAt) > now) {
                            if (boost.type === 'exp' || boost.type === 'exp_boost') {
                                // Convert multiplier to percentage (e.g. 1.5x -> 50%)
                                const val = Math.round((boost.multiplier - 1) * 100);
                                if (val > 0) {
                                    if (!activeModifiers['exp_bonus']) activeModifiers['exp_bonus'] = { totalValue: 0, sources: [] };
                                    activeModifiers['exp_bonus'].totalValue += val;
                                    activeModifiers['exp_bonus'].sources.push({ itemName: "Đan Dược/Bùa", value: val });
                                }
                            } else if (boost.type === 'spiritStones') {
                                // multiplier (e.g. 1.2x -> 20%)
                                const val = Math.round((boost.multiplier - 1) * 100);
                                if (val > 0) {
                                    if (!activeModifiers['spirit_stone_bonus']) activeModifiers['spirit_stone_bonus'] = { totalValue: 0, sources: [] };
                                    activeModifiers['spirit_stone_bonus'].totalValue += val;
                                    activeModifiers['spirit_stone_bonus'].sources.push({ itemName: "Bùa Linh Thạch", value: val });
                                }
                            }
                        }
                    });
                }

                // 3. Add Pet Bonus
                if (cultivation.equipped?.pet) {
                    const petItem = SHOP_ITEMS_MAP.get(cultivation.equipped.pet);
                    if (petItem) {
                        if (petItem.expBonus) {
                            const val = Math.round(petItem.expBonus * 100);
                            if (!activeModifiers['exp_bonus']) activeModifiers['exp_bonus'] = { totalValue: 0, sources: [] };
                            activeModifiers['exp_bonus'].totalValue += val;
                            activeModifiers['exp_bonus'].sources.push({ itemName: `Linh Thú: ${petItem.name}`, value: val });
                        }
                        if (petItem.spiritStoneBonus) {
                            const val = Math.round(petItem.spiritStoneBonus * 100);
                            if (!activeModifiers['spirit_stone_bonus']) activeModifiers['spirit_stone_bonus'] = { totalValue: 0, sources: [] };
                            activeModifiers['spirit_stone_bonus'].totalValue += val;
                            activeModifiers['spirit_stone_bonus'].sources.push({ itemName: `Linh Thú: ${petItem.name}`, value: val });
                        }
                    }
                }

                // 4. Apply reward modifiers (if any)
                if (Object.keys(activeModifiers).length > 0) {
                    modifierBonuses = calculateRewardModifiers(
                        { exp: rewards.exp, spiritStones: rewards.spiritStones },
                        activeModifiers
                    );
                }

                // 5. Reduce durability after combat - ONLY IF EQUIPMENTS EXIST
                if (equipments.length > 0) {
                    // Chỉ 20% cơ hội giảm độ bền
                    for (const slot of equipmentSlots) {
                        const equipmentId = cultivation.equipped?.[slot];
                        if (!equipmentId) continue;

                        // Chỉ 20% cơ hội giảm độ bền
                        if (Math.random() > 0.2) continue;

                        // Tìm item trong inventory
                        const invItem = cultivation.inventory.find(i =>
                            i.itemId?.toString() === equipmentId.toString() ||
                            i.metadata?._id?.toString() === equipmentId.toString()
                        );

                        if (invItem) {
                            if (!invItem.metadata) invItem.metadata = {};
                            if (!invItem.metadata.durability) {
                                invItem.metadata.durability = { current: 100, max: 100 };
                            }
                            invItem.metadata.durability.current = Math.max(0, invItem.metadata.durability.current - 1);
                        }
                    }
                    cultivation.markModified('inventory');
                }
            } catch (modError) {
                console.error('[Dungeon] Modifier calculation error:', modError.message);
            }

            // Add exp and spirit stones (with modifier bonuses)
            const finalExp = modifierBonuses.rewards.exp;
            const finalSpiritStones = modifierBonuses.rewards.spiritStones;
            cultivation.addExp(finalExp, 'dungeon', `Bí cảnh ${dungeon.name} - Tầng ${currentFloor}`);
            cultivation.spiritStones += finalSpiritStones;
            cultivation.totalSpiritStonesEarned += finalSpiritStones;

            // Update dungeon stats
            if (!cultivation.dungeonStats) cultivation.dungeonStats = {};
            cultivation.dungeonStats.totalMonstersKilled = (cultivation.dungeonStats.totalMonstersKilled || 0) + 1;
            cultivation.dungeonStats.totalDungeonExpEarned = (cultivation.dungeonStats.totalDungeonExpEarned || 0) + rewards.exp;
            cultivation.dungeonStats.totalDungeonSpiritStonesEarned = (cultivation.dungeonStats.totalDungeonSpiritStonesEarned || 0) + rewards.spiritStones;
            if (monster.type === 'boss') {
                cultivation.dungeonStats.totalBossesKilled = (cultivation.dungeonStats.totalBossesKilled || 0) + 1;
            }

            // ==================== MATERIAL DROPS (Luyện Khí System) ====================
            // Drop materials only from elite/boss monsters
            let materialDrops = { drops: [], dropMeta: {} };
            if (monster.type === 'elite' || monster.type === 'boss') {
                // Calculate performance bonuses
                const performance = {
                    noDeath: battleResult.finalPlayerHp > 0, // Player still alive
                    speedClear: battleResult.rounds <= 10, // Quick kill
                    solo: true // Dungeon is always solo
                };

                // Generate drops based on difficulty and dungeon tier
                materialDrops = generateMaterialDrops(
                    dungeon.difficulty,
                    dungeon.requiredRealm,
                    performance
                );

                // Add materials to inventory
                if (materialDrops.drops.length > 0) {
                    await addMaterialsToInventory(req.user.id, materialDrops.drops);

                    // Log for audit
                    logMaterialDrop(
                        req.user.id,
                        dungeonId,
                        materialDrops.drops,
                        materialDrops.dropMeta
                    ).catch(e => console.error('[Dungeon] Material log failed:', e.message));
                }
            }


            // Update progress
            progress.currentFloor = currentFloor;
            if (currentFloor > progress.highestFloor) {
                progress.highestFloor = currentFloor;
            }

            // Update run record
            run.floorsCleared = currentFloor;
            run.totalExpEarned += rewards.exp;
            run.totalSpiritStonesEarned += rewards.spiritStones;
            run.floorLogs.push({
                floor: currentFloor,
                monsterId: monster.id,
                monsterName: monster.name,
                monsterType: monster.type,
                won: true,
                expEarned: rewards.exp,
                spiritStonesEarned: rewards.spiritStones,
                itemDropped: itemDropped
            });

            if (itemDropped) {
                // Use SHOP_ITEMS_MAP for O(1) lookup
                const shopItem = SHOP_ITEMS_MAP.get(itemDropped);
                run.itemsEarned.push({
                    itemId: itemDropped,
                    name: shopItem?.name || itemDropped,
                    quantity: 1
                });
            }

            // Check if dungeon completed
            const isCompleted = currentFloor >= config.floors;

            // Prepare next monster if not completed
            let nextMonster = null;
            if (!isCompleted) {
                const nextFloorMonster = selectMonsterForFloor(dungeonId, currentFloor + 1, config.floors);
                // Reuse playerStatsForScaling if available (already calculated for chaos realm)
                nextMonster = calculateMonsterStats(nextFloorMonster, currentFloor + 1, dungeon.difficulty, dungeonId, playerStatsForScaling);
            }

            if (isCompleted) {
                progress.inProgress = false;
                progress.totalClears += 1;
                progress.lastClearedAt = new Date();
                progress.cooldownUntil = new Date(Date.now() + config.cooldownHours * 60 * 60 * 1000);
                progress.currentRunId = null;

                run.isCompleted = true;
                run.completedAt = new Date();

                cultivation.dungeonStats.totalDungeonsCleared = (cultivation.dungeonStats.totalDungeonsCleared || 0) + 1;

                // Update quest progress cho nhiệm vụ hoàn thành bí cảnh
                cultivation.updateQuestProgress('dungeon_clear', 1);

                // Log Thiên Hạ Ký event (Dungeon Clear)
                if (dungeon.difficulty !== 'easy') {
                    const user = await mongoose.model('User').findById(req.user.id).select('name nickname').lean();
                    const username = user?.name || user?.nickname || 'Tu sĩ ẩn danh';
                    logDungeonEvent(req.user.id, username, dungeon.name, config.floors, cultivation.realmName)
                        .catch(e => console.error('[WorldEvent] Dungeon battle log error:', e));
                }
            }

            // Cập nhật quest progress cho nhiệm vụ thám hiểm bí cảnh
            cultivation.updateQuestProgress('dungeon_floor', 1);

            await run.save();
            await saveWithRetry(cultivation);

            // Build response
            const response = {
                success: true,
                data: {
                    won: true,
                    battleResult: {
                        rounds: battleResult.rounds,
                        logs: battleResult.logs,
                        playerStats: battleResult.playerStats,
                        monsterStats: battleResult.monsterStats,
                        maxPlayerHp: battleResult.maxPlayerHp,
                        maxMonsterHp: battleResult.maxMonsterHp,
                        finalPlayerHp: battleResult.finalPlayerHp,
                        finalMonsterHp: battleResult.finalMonsterHp,
                        maxPlayerMana: battleResult.maxPlayerMana,
                        maxMonsterMana: battleResult.maxMonsterMana,
                        finalPlayerMana: battleResult.finalPlayerMana,
                        finalMonsterMana: battleResult.finalMonsterMana
                    },
                    rewards: {
                        exp: finalExp,
                        spiritStones: finalSpiritStones,
                        baseExp: rewards.exp,
                        baseSpiritStones: rewards.spiritStones,
                        modifierBonuses: modifierBonuses.bonuses.length > 0 ? modifierBonuses.bonuses : null,
                        item: itemDropped ? SHOP_ITEMS_MAP.get(itemDropped) : null,
                        materials: materialDrops.drops.length > 0 ? materialDrops.drops : null
                    },
                    progress: {
                        currentFloor,
                        totalFloors: config.floors,
                        isCompleted,
                        canContinue: !isCompleted
                    },
                    monster: {
                        id: monster.id,
                        name: monster.name,
                        type: monster.type,
                        icon: monster.icon
                    },
                    nextMonster // Include next monster for seamless floor transition
                }
            };

            // Cache response for idempotency (30s TTL)
            await cacheResponse(userId, requestId, response, 30);

            res.json(response);
        } else {
            // Player lost - dungeon failed
            progress.inProgress = false;
            progress.currentFloor = 0;
            progress.currentRunId = null;
            // Partial cooldown (half) on failure
            progress.cooldownUntil = new Date(Date.now() + (config.cooldownHours * 30 * 60 * 1000));

            run.isAbandoned = true;
            run.floorLogs.push({
                floor: currentFloor,
                monsterId: monster.id,
                monsterName: monster.name,
                monsterType: monster.type,
                won: false,
                expEarned: 0,
                spiritStonesEarned: 0
            });

            await run.save();
            await saveWithRetry(cultivation);

            res.json({
                success: true,
                data: {
                    won: false,
                    battleResult: {
                        rounds: battleResult.rounds,
                        logs: battleResult.logs,
                        playerStats: battleResult.playerStats,
                        monsterStats: battleResult.monsterStats,
                        maxPlayerHp: battleResult.maxPlayerHp,
                        maxMonsterHp: battleResult.maxMonsterHp,
                        finalPlayerHp: battleResult.finalPlayerHp,
                        finalMonsterHp: battleResult.finalMonsterHp,
                        maxPlayerMana: battleResult.maxPlayerMana,
                        maxMonsterMana: battleResult.maxMonsterMana,
                        finalPlayerMana: battleResult.finalPlayerMana,
                        finalMonsterMana: battleResult.finalMonsterMana
                    },
                    message: `Đã thất bại tại tầng ${currentFloor}. Phần thưởng đã thu thập được giữ lại.`,
                    rewards: {
                        exp: run.totalExpEarned,
                        spiritStones: run.totalSpiritStonesEarned,
                        items: run.itemsEarned
                    },
                    monster: {
                        id: monster.id,
                        name: monster.name,
                        type: monster.type,
                        icon: monster.icon
                    }
                }
            });
        }
    } catch (error) {
        next(error);
    } finally {
        // Release Redis lock
        await releaseLock(lockKey, lockToken);
    }
};

/**
 * POST /api/cultivation/dungeons/:dungeonId/claim-exit
 * Thu thập phần thưởng và thoát an toàn (giữ nguyên reward)
 */
export const claimRewardsAndExit = async (req, res, next) => {
    try {
        const { dungeonId } = req.params;
        const cultivation = await Cultivation.getOrCreate(req.user.id);

        const progress = cultivation.dungeonProgress?.find(p => p.dungeonId === dungeonId);
        if (!progress?.inProgress) {
            return res.status(400).json({ success: false, message: "Bạn không trong bí cảnh này" });
        }

        const dungeon = DUNGEON_TEMPLATES.find(d => d.id === dungeonId);
        const config = DIFFICULTY_CONFIG[dungeon.difficulty];

        const run = await DungeonRun.findById(progress.currentRunId);
        if (!run) {
            return res.status(400).json({ success: false, message: "Không tìm thấy phiên khám phá" });
        }

        // Mark as completed (early exit)
        run.isCompleted = true;
        run.completedAt = new Date();
        await run.save();

        // Update progress
        progress.inProgress = false;
        progress.currentRunId = null;
        // Full cooldown on voluntary exit
        progress.cooldownUntil = new Date(Date.now() + config.cooldownHours * 60 * 60 * 1000);

        await saveWithRetry(cultivation);

        // Log Thiên Hạ Ký event
        if (dungeon.difficulty !== 'easy') { // Chỉ log khó trở lên để tránh spam
            const user = await mongoose.model('User').findById(req.user.id).select('name nickname').lean();
            const username = user?.name || user?.nickname || 'Tu sĩ ẩn danh';
            logDungeonEvent(req.user.id, username, dungeon.name, run.floorsCleared, cultivation.realmName)
                .catch(e => console.error('[WorldEvent] Dungeon log error:', e));
        }

        res.json({
            success: true,
            message: "Đã thoát bí cảnh và nhận phần thưởng",
            data: {
                floorsCleared: run.floorsCleared,
                totalFloors: run.totalFloors,
                rewards: {
                    exp: run.totalExpEarned,
                    spiritStones: run.totalSpiritStonesEarned,
                    items: run.itemsEarned
                },
                cooldownUntil: progress.cooldownUntil
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/cultivation/dungeons/:dungeonId/abandon
 * Bỏ cuộc (mất tất cả reward chưa claim)
 */
export const abandonDungeon = async (req, res, next) => {
    try {
        const { dungeonId } = req.params;
        const cultivation = await Cultivation.getOrCreate(req.user.id);

        const progress = cultivation.dungeonProgress?.find(p => p.dungeonId === dungeonId);
        if (!progress?.inProgress) {
            return res.status(400).json({ success: false, message: "Bạn không trong bí cảnh này" });
        }

        const dungeon = DUNGEON_TEMPLATES.find(d => d.id === dungeonId);
        const config = DIFFICULTY_CONFIG[dungeon.difficulty];

        const run = await DungeonRun.findById(progress.currentRunId);
        if (run) {
            run.isAbandoned = true;
            await run.save();
        }

        // Reset progress with partial cooldown
        progress.inProgress = false;
        progress.currentFloor = 0;
        progress.currentRunId = null;
        progress.cooldownUntil = new Date(Date.now() + (config.cooldownHours * 30 * 60 * 1000)); // Half cooldown

        await saveWithRetry(cultivation);

        res.json({
            success: true,
            message: "Đã bỏ cuộc khám phá bí cảnh",
            data: {
                cooldownUntil: progress.cooldownUntil
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/cultivation/dungeons/history
 * Lấy lịch sử chạy dungeon
 */
export const getDungeonHistory = async (req, res, next) => {
    try {
        const { limit = 10, skip = 0 } = req.query;

        const runs = await DungeonRun.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .skip(parseInt(skip))
            .limit(parseInt(limit))
            .lean();

        // Add dungeon names
        const runsWithNames = runs.map(run => {
            const dungeon = DUNGEON_TEMPLATES.find(d => d.id === run.dungeonId);
            return {
                ...run,
                dungeonName: dungeon?.name || run.dungeonId,
                dungeonIcon: dungeon?.icon || ''
            };
        });

        res.json({
            success: true,
            data: {
                runs: runsWithNames,
                hasMore: runs.length === parseInt(limit)
            }
        });
    } catch (error) {
        next(error);
    }
};
