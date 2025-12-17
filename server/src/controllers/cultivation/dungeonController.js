import mongoose from "mongoose";
import Cultivation, { CULTIVATION_REALMS, SHOP_ITEMS } from "../../models/Cultivation.js";
import {
    DUNGEON_TEMPLATES,
    DIFFICULTY_CONFIG,
    calculateMonsterStats,
    selectMonsterForFloor,
    calculateFloorRewards,
    rollItemDrop,
    DungeonRun
} from "../../models/Dungeon.js";
import { formatCultivationResponse, mergeEquipmentStatsIntoCombatStats } from "./coreController.js";

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
 * Simulate combat between player and monster
 * Returns battle result with logs
 */
const simulateDungeonBattle = async (cultivation, monster, dungeonId = null) => {
    // Get player stats
    let playerStats = cultivation.calculateCombatStats();
    const equipmentStats = await cultivation.getEquipmentStats();
    playerStats = mergeEquipmentStatsIntoCombatStats(playerStats, equipmentStats);

    // Chaos realm bonuses: Player gets combat advantages
    const isChaosRealm = dungeonId === 'chaos_realm';
    if (isChaosRealm) {
        // Bonus stats for player in chaos realm
        playerStats.criticalRate = (playerStats.criticalRate || 0) + 15; // +15% crit rate
        playerStats.dodge = (playerStats.dodge || 0) + 10; // +10% dodge
        playerStats.lifesteal = (playerStats.lifesteal || 0) + 20; // +20% lifesteal
        playerStats.criticalDamage = (playerStats.criticalDamage || 150) + 30; // +30% crit damage
    }

    const monsterStats = monster.stats;

    // Initialize HP
    let playerHp = playerStats.qiBlood;
    let monsterHp = monsterStats.qiBlood;
    const maxPlayerHp = playerStats.qiBlood;
    const maxMonsterHp = monsterStats.qiBlood;

    const logs = [];
    let round = 0;
    const maxRounds = isChaosRealm ? 80 : 50; // More rounds for chaos realm

    // Determine who attacks first based on speed
    let playerFirst = playerStats.speed >= monsterStats.speed;

    while (playerHp > 0 && monsterHp > 0 && round < maxRounds) {
        round++;

        const attackOrder = playerFirst ? ['player', 'monster'] : ['monster', 'player'];

        for (const attacker of attackOrder) {
            if (playerHp <= 0 || monsterHp <= 0) break;

            if (attacker === 'player') {
                // Player attacks monster
                const isCrit = Math.random() * 100 < playerStats.criticalRate;
                const isDodged = Math.random() * 100 < monsterStats.dodge;

                if (isDodged) {
                    logs.push({
                        round,
                        attacker: 'player',
                        action: 'attack',
                        isDodged: true,
                        damage: 0
                    });
                } else {
                    let damage = Math.max(1, playerStats.attack - monsterStats.defense * 0.5);
                    if (isCrit) damage = Math.floor(damage * (playerStats.criticalDamage / 100));
                    damage = Math.floor(damage * (0.9 + Math.random() * 0.2)); // 90-110% variance

                    monsterHp = Math.max(0, monsterHp - damage);

                    // Lifesteal
                    const lifesteal = Math.floor(damage * (playerStats.lifesteal / 100));
                    playerHp = Math.min(maxPlayerHp, playerHp + lifesteal);

                    logs.push({
                        round,
                        attacker: 'player',
                        action: 'attack',
                        damage,
                        isCritical: isCrit,
                        lifesteal,
                        monsterHpAfter: monsterHp,
                        playerHpAfter: playerHp
                    });
                }
            } else {
                // Monster attacks player
                const isCrit = Math.random() * 100 < (monsterStats.criticalRate || 10);
                const isDodged = Math.random() * 100 < playerStats.dodge;

                if (isDodged) {
                    logs.push({
                        round,
                        attacker: 'monster',
                        action: 'attack',
                        isDodged: true,
                        damage: 0
                    });
                } else {
                    let damage = Math.max(1, monsterStats.attack - playerStats.defense * 0.5);
                    if (isCrit) damage = Math.floor(damage * ((monsterStats.criticalDamage || 150) / 100));
                    damage = Math.floor(damage * (0.9 + Math.random() * 0.2));

                    playerHp = Math.max(0, playerHp - damage);

                    logs.push({
                        round,
                        attacker: 'monster',
                        action: 'attack',
                        damage,
                        isCritical: isCrit,
                        playerHpAfter: playerHp,
                        monsterHpAfter: monsterHp
                    });
                }
            }
        }
    }

    const playerWon = monsterHp <= 0;

    return {
        won: playerWon,
        rounds: round,
        logs,
        finalPlayerHp: playerHp,
        finalMonsterHp: monsterHp,
        maxPlayerHp,
        maxMonsterHp,
        playerStats,
        monsterStats
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
                const scaledMonster = calculateMonsterStats(currentMonster, progress.currentFloor + 1, dungeon.difficulty, dungeonId);

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

        await cultivation.save();

        // Get first floor monster
        const firstMonster = selectMonsterForFloor(dungeonId, 1, config.floors);
        const scaledMonster = calculateMonsterStats(firstMonster, 1, dungeon.difficulty, dungeonId);

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
        const scaledMonster = calculateMonsterStats(monster, nextFloor, dungeon.difficulty, dungeonId);
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
    try {
        const { dungeonId } = req.params;
        const cultivation = await Cultivation.getOrCreate(req.user.id);

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
        
        // For chaos realm, get player stats to scale monsters
        let playerStats = null;
        if (dungeonId === 'chaos_realm') {
            playerStats = cultivation.calculateCombatStats();
            const equipmentStats = await cultivation.getEquipmentStats();
            playerStats = mergeEquipmentStatsIntoCombatStats(playerStats, equipmentStats);
        }
        
        const scaledMonster = calculateMonsterStats(monster, currentFloor, dungeon.difficulty, dungeonId, playerStats);

        // Simulate battle
        const battleResult = await simulateDungeonBattle(cultivation, scaledMonster, dungeonId);

        // Get the run record
        const run = await DungeonRun.findById(progress.currentRunId);
        if (!run) {
            return res.status(400).json({ success: false, message: "Không tìm thấy phiên khám phá" });
        }

        if (battleResult.won) {
            // Calculate rewards
            const rewards = calculateFloorRewards(dungeon.difficulty, currentFloor, monster.type);
            let itemDropped = null;

            // Roll for item drop
            if (Math.random() < rewards.itemDropRate) {
                itemDropped = rollItemDrop(dungeon.difficulty);
                if (itemDropped) {
                    const shopItem = SHOP_ITEMS.find(i => i.id === itemDropped);
                    if (shopItem) {
                        // Add to inventory with full item information
                        const existingItem = cultivation.inventory.find(i => i.itemId === itemDropped);
                        if (existingItem) {
                            existingItem.quantity = (existingItem.quantity || 1) + 1;
                        } else {
                            // Create inventory item with all shop item metadata
                            const inventoryItem = {
                                itemId: itemDropped,
                                name: shopItem.name,
                                type: shopItem.type,
                                quantity: 1,
                                acquiredAt: new Date(),
                                // Store all item metadata for display
                                icon: shopItem.icon || null,
                                description: shopItem.description || null,
                                rarity: shopItem.rarity || 'common',
                                img: shopItem.img || null,
                                // Avatar frame specific
                                color: shopItem.color || null,
                                animated: shopItem.animated || false,
                                // Exp boost specific
                                duration: shopItem.duration || null,
                                multiplier: shopItem.multiplier || null,
                                // Breakthrough pill specific
                                breakthroughBonus: shopItem.breakthroughBonus || null,
                                // Consumable specific
                                expReward: shopItem.expReward || null,
                                spiritStoneReward: shopItem.spiritStoneReward || null,
                                spiritStoneBonus: shopItem.spiritStoneBonus || null,
                                // Pet specific
                                expBonus: shopItem.expBonus || null,
                                questExpBonus: shopItem.questExpBonus || null,
                                // Technique specific
                                stats: shopItem.stats || null,
                                skill: shopItem.skill || null
                            };
                            cultivation.inventory.push(inventoryItem);
                        }
                    }
                }
            }

            // Add exp and spirit stones
            cultivation.addExp(rewards.exp, 'dungeon', `Bí cảnh ${dungeon.name} - Tầng ${currentFloor}`);
            cultivation.spiritStones += rewards.spiritStones;
            cultivation.totalSpiritStonesEarned += rewards.spiritStones;

            // Update dungeon stats
            if (!cultivation.dungeonStats) cultivation.dungeonStats = {};
            cultivation.dungeonStats.totalMonstersKilled = (cultivation.dungeonStats.totalMonstersKilled || 0) + 1;
            cultivation.dungeonStats.totalDungeonExpEarned = (cultivation.dungeonStats.totalDungeonExpEarned || 0) + rewards.exp;
            cultivation.dungeonStats.totalDungeonSpiritStonesEarned = (cultivation.dungeonStats.totalDungeonSpiritStonesEarned || 0) + rewards.spiritStones;
            if (monster.type === 'boss') {
                cultivation.dungeonStats.totalBossesKilled = (cultivation.dungeonStats.totalBossesKilled || 0) + 1;
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
                const shopItem = SHOP_ITEMS.find(i => i.id === itemDropped);
                run.itemsEarned.push({
                    itemId: itemDropped,
                    name: shopItem?.name || itemDropped,
                    quantity: 1,
                    // Store full item info for display
                    rarity: shopItem?.rarity || 'common',
                    icon: shopItem?.icon || null,
                    description: shopItem?.description || null,
                    type: shopItem?.type || null
                });
            }

            // Check if dungeon completed
            const isCompleted = currentFloor >= config.floors;

            // Prepare next monster if not completed
            let nextMonster = null;
            if (!isCompleted) {
                const nextFloorMonster = selectMonsterForFloor(dungeonId, currentFloor + 1, config.floors);
                nextMonster = calculateMonsterStats(nextFloorMonster, currentFloor + 1, dungeon.difficulty, dungeonId);
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
            }

            await run.save();
            await cultivation.save();

            res.json({
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
                        finalMonsterHp: battleResult.finalMonsterHp
                    },
                    rewards: {
                        exp: rewards.exp,
                        spiritStones: rewards.spiritStones,
                        item: itemDropped ? (() => {
                            const shopItem = SHOP_ITEMS.find(i => i.id === itemDropped);
                            if (shopItem) {
                                // Return full item info with all metadata
                                return {
                                    id: shopItem.id,
                                    name: shopItem.name,
                                    type: shopItem.type,
                                    rarity: shopItem.rarity || 'common',
                                    icon: shopItem.icon || null,
                                    description: shopItem.description || null,
                                    img: shopItem.img || null,
                                    // Include all relevant fields
                                    color: shopItem.color || null,
                                    animated: shopItem.animated || false,
                                    duration: shopItem.duration || null,
                                    multiplier: shopItem.multiplier || null,
                                    breakthroughBonus: shopItem.breakthroughBonus || null,
                                    expReward: shopItem.expReward || null,
                                    spiritStoneReward: shopItem.spiritStoneReward || null,
                                    spiritStoneBonus: shopItem.spiritStoneBonus || null,
                                    expBonus: shopItem.expBonus || null,
                                    questExpBonus: shopItem.questExpBonus || null,
                                    stats: shopItem.stats || null,
                                    skill: shopItem.skill || null
                                };
                            }
                            return null;
                        })() : null
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
            });
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
            await cultivation.save();

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
                        finalMonsterHp: battleResult.finalMonsterHp
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

        // Give rewards to player (exp, spirit stones, items)
        if (run.totalExpEarned > 0) {
            cultivation.addExp(run.totalExpEarned, 'dungeon', `Thoát bí cảnh ${dungeon.name} - Tầng ${run.floorsCleared}`);
        }
        if (run.totalSpiritStonesEarned > 0) {
            cultivation.spiritStones += run.totalSpiritStonesEarned;
            cultivation.totalSpiritStonesEarned += run.totalSpiritStonesEarned;
        }
        
        // Add items to inventory with full information
        if (run.itemsEarned && run.itemsEarned.length > 0) {
            for (const item of run.itemsEarned) {
                const shopItem = SHOP_ITEMS.find(i => i.id === item.itemId);
                if (shopItem) {
                    const existingItem = cultivation.inventory.find(i => i.itemId === item.itemId);
                    if (existingItem) {
                        existingItem.quantity = (existingItem.quantity || 1) + (item.quantity || 1);
                    } else {
                        // Create inventory item with all shop item metadata
                        const inventoryItem = {
                            itemId: item.itemId,
                            name: shopItem.name,
                            type: shopItem.type,
                            quantity: item.quantity || 1,
                            acquiredAt: new Date(),
                            // Store all item metadata for display
                            icon: shopItem.icon || null,
                            description: shopItem.description || null,
                            rarity: shopItem.rarity || 'common',
                            img: shopItem.img || null,
                            // Avatar frame specific
                            color: shopItem.color || null,
                            animated: shopItem.animated || false,
                            // Exp boost specific
                            duration: shopItem.duration || null,
                            multiplier: shopItem.multiplier || null,
                            // Breakthrough pill specific
                            breakthroughBonus: shopItem.breakthroughBonus || null,
                            // Consumable specific
                            expReward: shopItem.expReward || null,
                            spiritStoneReward: shopItem.spiritStoneReward || null,
                            spiritStoneBonus: shopItem.spiritStoneBonus || null,
                            // Pet specific
                            expBonus: shopItem.expBonus || null,
                            questExpBonus: shopItem.questExpBonus || null,
                            // Technique specific
                            stats: shopItem.stats || null,
                            skill: shopItem.skill || null
                        };
                        cultivation.inventory.push(inventoryItem);
                    }
                }
            }
        }

        // Update dungeon stats
        if (!cultivation.dungeonStats) cultivation.dungeonStats = {};
        cultivation.dungeonStats.totalDungeonExpEarned = (cultivation.dungeonStats.totalDungeonExpEarned || 0) + run.totalExpEarned;
        cultivation.dungeonStats.totalDungeonSpiritStonesEarned = (cultivation.dungeonStats.totalDungeonSpiritStonesEarned || 0) + run.totalSpiritStonesEarned;

        // Mark as completed (early exit)
        run.isCompleted = true;
        run.completedAt = new Date();
        await run.save();

        // Update progress
        progress.inProgress = false;
        progress.currentRunId = null;
        // Full cooldown on voluntary exit
        progress.cooldownUntil = new Date(Date.now() + config.cooldownHours * 60 * 60 * 1000);

        await cultivation.save();

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

        await cultivation.save();

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
                dungeonIcon: dungeon?.icon || '🏔️'
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
