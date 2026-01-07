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
import {
    calculateActiveModifiers,
    calculateElementSynergy,
    calculateDamageModifiers,
    calculateDefensiveModifiers,
    calculateRewardModifiers,
    reduceDurability
} from "../../services/modifierService.js";


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

    // Initialize HP
    let playerHp = playerStats.qiBlood;
    let monsterHp = monsterStats.qiBlood;
    const maxPlayerHp = playerStats.qiBlood;
    const maxMonsterHp = monsterStats.qiBlood;

    // Initialize Mana (Chân Nguyên)
    let playerMana = playerStats.zhenYuan || 1000;
    let monsterMana = Math.floor((monsterStats.qiBlood || 1000) * 0.5); // Monster mana = 50% of HP
    const maxPlayerMana = playerMana;
    const maxMonsterMana = monsterMana;

    const logs = [];
    let round = 0;
    const maxRounds = 50;

    // Skill cooldowns tracking
    const playerSkillCooldowns = {};
    const monsterSkillCooldowns = {};
    playerSkills.forEach(s => playerSkillCooldowns[s.name || s.techniqueId] = 0);
    monsterSkills.forEach(s => monsterSkillCooldowns[s.name] = 0);

    // Determine who attacks first based on speed
    let playerFirst = playerStats.speed >= monsterStats.speed;

    while (playerHp > 0 && monsterHp > 0 && round < maxRounds) {
        round++;

        const attackOrder = playerFirst ? ['player', 'monster'] : ['monster', 'player'];

        for (const attacker of attackOrder) {
            if (playerHp <= 0 || monsterHp <= 0) break;

            // Reduce cooldowns at start of each action
            const cooldowns = attacker === 'player' ? playerSkillCooldowns : monsterSkillCooldowns;
            Object.keys(cooldowns).forEach(key => {
                if (cooldowns[key] > 0) cooldowns[key]--;
            });

            // Mana regeneration (5% per turn)
            if (attacker === 'player') {
                playerMana = Math.min(maxPlayerMana, playerMana + Math.floor(maxPlayerMana * 0.05));
            } else {
                monsterMana = Math.min(maxMonsterMana, monsterMana + Math.floor(maxMonsterMana * 0.05));
            }

            if (attacker === 'player') {
                // Player attacks monster
                const currentMana = playerMana;

                // Check for available skill
                let usedSkill = null;
                let skillDamageBonus = 0;
                let manaConsumed = 0;

                for (const skill of playerSkills) {
                    const skillKey = skill.name || skill.techniqueId;
                    const manaCost = skill.manaCost || 20;
                    if (playerSkillCooldowns[skillKey] <= 0 && currentMana >= manaCost) {
                        usedSkill = skill;
                        // Skill damage = base damage + (attack × damageMultiplier)
                        skillDamageBonus = (skill.damage || 0) + Math.floor(playerStats.attack * (skill.damageMultiplier || 0.5));
                        manaConsumed = manaCost;
                        playerSkillCooldowns[skillKey] = skill.cooldown || 3;
                        playerMana = Math.max(0, playerMana - manaConsumed);
                        break;
                    }
                }

                const isCrit = Math.random() * 100 < playerStats.criticalRate;
                const isDodged = Math.random() * 100 < monsterStats.dodge;

                if (isDodged) {
                    logs.push({
                        round,
                        attacker: 'player',
                        action: usedSkill ? 'skill' : 'attack',
                        skillUsed: usedSkill?.name || usedSkill?.techniqueName || null,
                        isDodged: true,
                        damage: 0,
                        playerMana,
                        monsterMana,
                        manaConsumed: manaConsumed > 0 ? manaConsumed : undefined
                    });
                } else {
                    let damage = Math.max(1, playerStats.attack - monsterStats.defense * 0.5);

                    // Add skill damage bonus
                    if (skillDamageBonus > 0) {
                        damage += skillDamageBonus;
                    }

                    if (isCrit) damage = Math.floor(damage * (playerStats.criticalDamage / 100));
                    damage = Math.floor(damage * (0.9 + Math.random() * 0.2)); // 90-110% variance

                    monsterHp = Math.max(0, monsterHp - damage);

                    // Lifesteal
                    const lifesteal = Math.floor(damage * (playerStats.lifesteal / 100));
                    playerHp = Math.min(maxPlayerHp, playerHp + lifesteal);

                    logs.push({
                        round,
                        attacker: 'player',
                        action: usedSkill ? 'skill' : 'attack',
                        skillUsed: usedSkill?.name || usedSkill?.techniqueName || null,
                        damage,
                        isCritical: isCrit,
                        lifesteal,
                        monsterHpAfter: monsterHp,
                        playerHpAfter: playerHp,
                        playerMana,
                        monsterMana,
                        manaConsumed: manaConsumed > 0 ? manaConsumed : undefined
                    });
                }
            } else {
                // Monster attacks player
                const currentMana = monsterMana;

                // Check for available skill
                let usedSkill = null;
                let skillDamageBonus = 0;
                let manaConsumed = 0;

                for (const skill of monsterSkills) {
                    const manaCost = skill.manaCost || 20;
                    if (monsterSkillCooldowns[skill.name] <= 0 && currentMana >= manaCost) {
                        usedSkill = skill;
                        // Monster skill damage = attack × damageMultiplier
                        skillDamageBonus = Math.floor(monsterStats.attack * (skill.damageMultiplier || 0.5));
                        manaConsumed = manaCost;
                        monsterSkillCooldowns[skill.name] = skill.cooldown || 3;
                        monsterMana = Math.max(0, monsterMana - manaConsumed);
                        break;
                    }
                }

                const isCrit = Math.random() * 100 < (monsterStats.criticalRate || 10);
                const isDodged = Math.random() * 100 < playerStats.dodge;

                if (isDodged) {
                    logs.push({
                        round,
                        attacker: 'monster',
                        action: usedSkill ? 'skill' : 'attack',
                        skillUsed: usedSkill?.name || null,
                        isDodged: true,
                        damage: 0,
                        playerMana,
                        monsterMana,
                        manaConsumed: manaConsumed > 0 ? manaConsumed : undefined
                    });
                } else {
                    let damage = Math.max(1, monsterStats.attack - playerStats.defense * 0.5);

                    // Add skill damage bonus
                    if (skillDamageBonus > 0) {
                        damage += skillDamageBonus;
                    }

                    if (isCrit) damage = Math.floor(damage * ((monsterStats.criticalDamage || 150) / 100));
                    damage = Math.floor(damage * (0.9 + Math.random() * 0.2));

                    playerHp = Math.max(0, playerHp - damage);

                    logs.push({
                        round,
                        attacker: 'monster',
                        action: usedSkill ? 'skill' : 'attack',
                        skillUsed: usedSkill?.name || null,
                        damage,
                        isCritical: isCrit,
                        playerHpAfter: playerHp,
                        monsterHpAfter: monsterHp,
                        playerMana,
                        monsterMana,
                        manaConsumed: manaConsumed > 0 ? manaConsumed : undefined
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
        finalPlayerMana: playerMana,
        finalMonsterMana: monsterMana,
        maxPlayerMana,
        maxMonsterMana,
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

        await cultivation.save();

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
        // Get player stats for chaos realm scaling
        let playerStatsForScaling = null;
        if (dungeonId === 'chaos_realm') {
            let tempPlayerStats = cultivation.calculateCombatStats();
            const equipmentStats = await cultivation.getEquipmentStats();
            playerStatsForScaling = mergeEquipmentStatsIntoCombatStats(tempPlayerStats, equipmentStats);
        }
        const scaledMonster = calculateMonsterStats(monster, currentFloor, dungeon.difficulty, dungeonId, playerStatsForScaling);

        // Get player skills from learned techniques
        const playerSkills = [];
        if (cultivation.learnedTechniques && cultivation.learnedTechniques.length > 0) {
            const combatStats = cultivation.calculateCombatStats();
            const maxMana = combatStats.zhenYuan || 1000;

            cultivation.learnedTechniques.forEach(learned => {
                // Use TECHNIQUES_MAP for O(1) lookup
                const technique = TECHNIQUES_MAP.get(learned.techniqueId);
                if (technique && technique.skill) {
                    // Calculate mana cost as percentage of max mana (matching PK system)
                    const manaCostPercentMap = { 'common': 0.15, 'uncommon': 0.20, 'rare': 0.25, 'epic': 0.30, 'legendary': 0.35 };
                    const costPercent = manaCostPercentMap[technique.rarity] || 0.15;
                    const manaCost = Math.max(20, Math.min(Math.floor(maxMana * costPercent), Math.floor(maxMana * 0.4)));

                    playerSkills.push({
                        ...technique.skill,
                        techniqueId: technique.id,
                        techniqueName: technique.name,
                        rarity: technique.rarity || 'common',
                        level: learned.level,
                        damageMultiplier: 1 + (learned.level - 1) * 0.15,
                        manaCost
                    });
                }
            });
        }

        // Get monster skills based on dungeon and monster type
        const monsterSkills = getMonsterSkills(dungeonId, monster.type);

        // Simulate battle with skills
        const battleResult = await simulateDungeonBattle(cultivation, scaledMonster, playerSkills, monsterSkills);

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
                const equipmentSlots = ['weapon', 'magicTreasure', 'helmet', 'chest', 'shoulder', 'gloves', 'boots', 'belt', 'ring', 'necklace', 'earring', 'bracelet', 'powerItem'];
                const equipmentIds = equipmentSlots
                    .map(slot => cultivation.equipped?.[slot])
                    .filter(id => id != null);

                if (equipmentIds.length > 0) {
                    const equipments = await Equipment.find({ _id: { $in: equipmentIds } });
                    const activeModifiers = calculateActiveModifiers(equipments);

                    // Apply reward modifiers
                    modifierBonuses = calculateRewardModifiers(
                        { exp: rewards.exp, spiritStones: rewards.spiritStones },
                        activeModifiers
                    );

                    // Reduce durability after combat - TRONG INVENTORY CỦA USER
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

        await cultivation.save();

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
