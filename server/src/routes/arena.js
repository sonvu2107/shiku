/**
 * Arena Routes - Ranked Arena API
 * Võ Đài Xếp Hạng
 */

import express from 'express';
import { authRequired } from '../middleware/auth.js';
import Rank, { RANK_TIERS, RANKED_BOTS } from '../models/Rank.js';
import RankedMatch from '../models/RankedMatch.js';
import Season, { SEASON_REWARDS } from '../models/Season.js';
import Cultivation, { CULTIVATION_REALMS, SHOP_ITEMS, ITEM_TYPES, TECHNIQUES_MAP } from '../models/Cultivation.js';
import Battle from '../models/Battle.js';
import User from '../models/User.js';
import Equipment from '../models/Equipment.js';
import arenaService from '../services/arenaService.js';
import { reduceDurability } from '../services/modifierService.js';

const router = express.Router();

// All routes require authentication
router.use(authRequired);

// ==================== HELPER FUNCTIONS ====================

/**
 * Reduce durability for all equipped items after battle
 * GIẢM ĐỘ BỀN TRONG INVENTORY CỦA USER, KHÔNG PHẢI EQUIPMENT COLLECTION
 * Chỉ có 20% cơ hội giảm 1 độ bền mỗi trận
 */
async function reduceEquipmentDurability(cultivation) {
    const equipmentSlots = ['weapon', 'magicTreasure', 'helmet', 'chest', 'shoulder', 'gloves', 'boots', 'belt', 'ring', 'necklace', 'earring', 'bracelet', 'powerItem'];
    
    let hasChanges = false;
    
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
            // Khởi tạo durability nếu chưa có
            if (!invItem.metadata) invItem.metadata = {};
            if (!invItem.metadata.durability) {
                invItem.metadata.durability = { current: 100, max: 100 };
            }
            
            // Giảm 1 độ bền
            invItem.metadata.durability.current = Math.max(0, invItem.metadata.durability.current - 1);
            hasChanges = true;
        }
    }
    
    // Đánh dấu inventory đã thay đổi để mongoose save
    if (hasChanges) {
        cultivation.markModified('inventory');
    }
}

/**
 * Merge equipment stats into combat stats (from battle.js)
 */
function mergeEquipmentStats(combatStats, equipStats) {
    if (!equipStats) return;

    const statKeys = ['attack', 'defense', 'qiBlood', 'zhenYuan', 'speed', 'criticalRate',
        'criticalDamage', 'dodge', 'accuracy', 'penetration', 'resistance', 'lifesteal', 'regeneration'];

    statKeys.forEach(key => {
        if (equipStats[key]) {
            combatStats[key] = (combatStats[key] || 0) + equipStats[key];
        }
    });
}

/**
 * Tính mana cost dựa trên rarity của công pháp và max mana của người dùng
 */
function getManaCostByRarity(rarity, maxMana = 1000) {
    const manaCostPercentMap = {
        'common': 0.15,
        'uncommon': 0.20,
        'rare': 0.25,
        'epic': 0.30,
        'legendary': 0.35
    };
    const costPercent = manaCostPercentMap[rarity] || 0.15;
    const manaCost = Math.floor(maxMana * costPercent);
    return Math.max(20, Math.min(manaCost, Math.floor(maxMana * 0.4)));
}

/**
 * Lấy skills từ công pháp đã học
 */
function getLearnedSkills(cultivation, maxMana = null) {
    const skills = [];
    let actualMaxMana = maxMana;
    if (!actualMaxMana) {
        if (cultivation.calculateCombatStats) {
            const combatStats = cultivation.calculateCombatStats();
            actualMaxMana = combatStats.zhenYuan || 1000;
        } else if (cultivation.combatStats?.zhenYuan) {
            actualMaxMana = cultivation.combatStats.zhenYuan;
        } else {
            actualMaxMana = 1000;
        }
    }

    if (cultivation.learnedTechniques && cultivation.learnedTechniques.length > 0) {
        cultivation.learnedTechniques.forEach(learned => {
            // Use TECHNIQUES_MAP for O(1) lookup
            const technique = TECHNIQUES_MAP.get(learned.techniqueId);
            if (technique && technique.skill) {
                skills.push({
                    ...technique.skill,
                    techniqueId: technique.id,
                    techniqueName: technique.name,
                    rarity: technique.rarity || 'common',
                    level: learned.level,
                    damageMultiplier: 1 + (learned.level - 1) * 0.15,
                    manaCost: getManaCostByRarity(technique.rarity || 'common', actualMaxMana)
                });
            }
        });
    }
    return skills;
}

/**
 * Simulate battle with full stats (synced from battle.js)
 * Includes: skills, accuracy, resistance, regeneration, mana system
 */
function simulateBattle(challengerStats, opponentStats, challengerSkills = [], opponentSkills = []) {
    const MAX_TURNS = 50;
    const logs = [];

    let challengerHp = challengerStats.qiBlood;
    let opponentHp = opponentStats.qiBlood;
    const challengerMaxHp = challengerStats.qiBlood;
    const opponentMaxHp = opponentStats.qiBlood;

    let challengerMana = challengerStats.zhenYuan || challengerMaxHp * 0.5;
    let opponentMana = opponentStats.zhenYuan || opponentMaxHp * 0.5;
    const challengerMaxMana = challengerMana;
    const opponentMaxMana = opponentMana;

    let turn = 0;
    let totalDamageByChallenger = 0;
    let totalDamageByOpponent = 0;

    // Skill cooldowns tracking
    const challengerSkillCooldowns = {};
    const opponentSkillCooldowns = {};
    challengerSkills.forEach(s => challengerSkillCooldowns[s.techniqueId] = 0);
    opponentSkills.forEach(s => opponentSkillCooldowns[s.techniqueId] = 0);

    let currentAttacker = challengerStats.speed >= opponentStats.speed ? 'challenger' : 'opponent';

    while (challengerHp > 0 && opponentHp > 0 && turn < MAX_TURNS) {
        turn++;

        const attacker = currentAttacker === 'challenger' ? challengerStats : opponentStats;
        const defender = currentAttacker === 'challenger' ? opponentStats : challengerStats;
        const attackerSkills = currentAttacker === 'challenger' ? challengerSkills : opponentSkills;
        const attackerCooldowns = currentAttacker === 'challenger' ? challengerSkillCooldowns : opponentSkillCooldowns;
        const attackerMana = currentAttacker === 'challenger' ? challengerMana : opponentMana;

        // Reduce cooldowns
        Object.keys(attackerCooldowns).forEach(key => {
            if (attackerCooldowns[key] > 0) attackerCooldowns[key]--;
        });

        // Mana regeneration (5% per turn)
        const manaRegen = Math.floor((currentAttacker === 'challenger' ? challengerMaxMana : opponentMaxMana) * 0.05);
        if (currentAttacker === 'challenger') {
            challengerMana = Math.min(challengerMaxMana, challengerMana + manaRegen);
        } else {
            opponentMana = Math.min(opponentMaxMana, opponentMana + manaRegen);
        }

        // Check skill usage
        let usedSkill = null;
        let skillDamageBonus = 0;
        let manaConsumed = 0;
        for (const skill of attackerSkills) {
            if (attackerCooldowns[skill.techniqueId] <= 0 && attackerMana >= (skill.manaCost || 20)) {
                usedSkill = skill;
                skillDamageBonus = Math.floor(attacker.attack * (skill.damageMultiplier || 1));
                manaConsumed = skill.manaCost || 20;
                attackerCooldowns[skill.techniqueId] = skill.cooldown || 3;
                if (currentAttacker === 'challenger') {
                    challengerMana = Math.max(0, challengerMana - manaConsumed);
                } else {
                    opponentMana = Math.max(0, opponentMana - manaConsumed);
                }
                break;
            }
        }

        // Calculate dodge (using accuracy vs dodge)
        // OLD: hitChance = (accuracy - dodge) / 100 -> 100 accuracy vs 50 dodge = 50% hit (too low!)
        // NEW: Use multiplicative formula - accuracy reduces dodge effectiveness
        // accuracy 100 vs dodge 50 -> hitChance = 1.0 * (1 - 50/(50+100)) = 1.0 * 0.67 = 67%
        // accuracy 100 vs dodge 25 -> hitChance = 1.0 * (1 - 25/(25+100)) = 1.0 * 0.80 = 80%
        const accuracyFactor = Math.min((attacker.accuracy || 100) / 100, 1.5); // Cap at 150%
        const dodgeReduction = (defender.dodge || 0) / ((defender.dodge || 0) + (attacker.accuracy || 100));
        const hitChance = accuracyFactor * (1 - dodgeReduction);
        const isDodged = Math.random() > Math.max(0.3, Math.min(hitChance, 0.95)); // Min 30% hit, max 95% hit

        let damage = 0;
        let isCritical = false;
        let lifestealHealed = 0;
        let regenerationHealed = 0;
        let skillUsed = usedSkill ? usedSkill.name : null;

        // Regeneration
        if (attacker.regeneration > 0) {
            const maxHp = currentAttacker === 'challenger' ? challengerMaxHp : opponentMaxHp;
            const regenRate = Math.min(attacker.regeneration, 5);
            regenerationHealed = Math.floor(maxHp * regenRate / 100);
        }

        if (!isDodged) {
            // Calculate damage with penetration
            const effectiveDefense = defender.defense * (1 - Math.min(attacker.penetration || 0, 80) / 100);
            damage = Math.max(1, attacker.attack - effectiveDefense * 0.5);

            // Skill damage bonus
            if (skillDamageBonus > 0) {
                damage += skillDamageBonus;
            }

            // Resistance reduces damage (max 50%)
            damage = damage * (1 - Math.min(defender.resistance || 0, 50) / 100);

            // Critical hit
            if (Math.random() * 100 < (attacker.criticalRate || 0)) {
                isCritical = true;
                damage = damage * ((attacker.criticalDamage || 150) / 100);
            }

            // Random variance 10%
            damage = Math.floor(damage * (0.9 + Math.random() * 0.2));
            damage = Math.max(1, damage);

            // Lifesteal
            if (attacker.lifesteal > 0) {
                lifestealHealed = Math.floor(damage * attacker.lifesteal / 100);
            }
        }

        // Apply damage and healing
        if (currentAttacker === 'challenger') {
            opponentHp = Math.max(0, opponentHp - damage);
            challengerHp = Math.min(challengerMaxHp, challengerHp + lifestealHealed + regenerationHealed);
            totalDamageByChallenger += damage;
        } else {
            challengerHp = Math.max(0, challengerHp - damage);
            opponentHp = Math.min(opponentMaxHp, opponentHp + lifestealHealed + regenerationHealed);
            totalDamageByOpponent += damage;
        }

        logs.push({
            turn,
            attacker: currentAttacker,
            damage,
            isCritical,
            isDodged,
            lifestealHealed,
            regenerationHealed,
            challengerHp: Math.floor(challengerHp),
            opponentHp: Math.floor(opponentHp),
            challengerMana: Math.floor(challengerMana),
            opponentMana: Math.floor(opponentMana),
            manaConsumed: manaConsumed > 0 ? manaConsumed : undefined,
            skillUsed
        });

        if (challengerHp <= 0 || opponentHp <= 0) break;
        currentAttacker = currentAttacker === 'challenger' ? 'opponent' : 'challenger';
    }

    let winner = null;
    let isDraw = false;

    if (challengerHp <= 0 && opponentHp <= 0) {
        isDraw = true;
    } else if (opponentHp <= 0) {
        winner = 'challenger';
    } else if (challengerHp <= 0) {
        winner = 'opponent';
    } else {
        if (challengerHp > opponentHp) {
            winner = 'challenger';
        } else if (opponentHp > challengerHp) {
            winner = 'opponent';
        } else {
            isDraw = true;
        }
    }

    return {
        winner,
        isDraw,
        logs,
        totalTurns: turn,
        totalDamageByChallenger,
        totalDamageByOpponent,
        finalChallengerHp: Math.floor(challengerHp),
        finalOpponentHp: Math.floor(opponentHp)
    };
}

// ==================== ROUTES ====================

/**
 * GET /api/arena/me
 * Get current user's rank info
 */
router.get('/me', async (req, res, next) => {
    try {
        const userId = req.user._id;

        // Ensure season exists
        await Season.ensureSeasonExists();

        // Get or create rank
        const rank = await Rank.getOrCreate(userId);

        // Apply decay
        const decayAmount = rank.checkAndApplyDecay();
        if (decayAmount > 0) {
            await rank.save();
        }

        // Get tier info
        const tierInfo = Rank.getTierFromMmr(rank.mmr, rank.faction);
        const nextTierInfo = RANK_TIERS.find(t => t.minMmr > rank.mmr && t.faction !== 'ma');

        // Check cooldown
        const cooldownInfo = await arenaService.checkCooldown(userId);

        // Get season info
        const season = await Season.getCurrentSeason();

        res.json({
            success: true,
            data: {
                mmr: rank.mmr,
                tier: rank.tier,
                tierName: tierInfo.name,
                tierColor: tierInfo.color,
                tierLogo: tierInfo.logo,
                tierTitle: tierInfo.title,
                faction: rank.faction,

                // Progress to next tier
                nextTier: nextTierInfo ? {
                    name: nextTierInfo.name,
                    minMmr: nextTierInfo.minMmr,
                    mmrNeeded: nextTierInfo.minMmr - rank.mmr
                } : null,
                progress: nextTierInfo ? Math.floor(((rank.mmr - tierInfo.minMmr) / (nextTierInfo.minMmr - tierInfo.minMmr)) * 100) : 100,

                // Placement
                isPlaced: rank.isPlaced,
                placementMatches: rank.placementMatches,
                placementWins: rank.placementWins,

                // Stats
                seasonWins: rank.seasonWins,
                seasonLosses: rank.seasonLosses,
                seasonDraws: rank.seasonDraws,
                winStreak: rank.winStreak,
                lossStreak: rank.lossStreak,
                bestWinStreak: rank.bestWinStreak,
                highestMmr: rank.highestMmr,
                highestTier: rank.highestTier,

                // Cooldown
                cooldown: cooldownInfo,

                // Decay info
                decayApplied: decayAmount,
                lastMatchAt: rank.lastMatchAt,

                // Season
                season: season ? {
                    number: season.seasonNumber,
                    name: season.name,
                    daysRemaining: season.getDaysRemaining(),
                    endDate: season.endDate
                } : null
            }
        });
    } catch (error) {
        console.error('[ARENA] Get me error:', error);
        next(error);
    }
});

/**
 * POST /api/arena/find-match
 * Find an opponent within MMR range
 */
router.post('/find-match', async (req, res, next) => {
    try {
        const userId = req.user._id;

        // Check cooldown
        const cooldownInfo = await arenaService.checkCooldown(userId);
        if (cooldownInfo.inCooldown) {
            return res.status(429).json({
                success: false,
                message: `Vui lòng đợi ${cooldownInfo.remainingSeconds} giây`,
                cooldown: cooldownInfo.remainingSeconds
            });
        }

        // Get user rank
        const rank = await Rank.getOrCreate(userId);

        // Try to find opponent with expanding range
        let opponent = null;
        let range = 200;
        const maxRange = 500;
        const attempts = 3;

        for (let i = 0; i < attempts && !opponent; i++) {
            opponent = await arenaService.findRandomOpponent(userId, rank.mmr, range);
            range += 100;
            if (range > maxRange) break;
        }

        if (opponent) {
            const tierInfo = Rank.getTierFromMmr(opponent.mmr, opponent.faction);
            res.json({
                success: true,
                found: true,
                isBot: false,
                data: {
                    opponentId: opponent.user._id,
                    username: opponent.user.name,
                    avatar: opponent.user.avatarUrl,
                    mmr: opponent.mmr,
                    tier: tierInfo.tier,
                    tierName: tierInfo.name,
                    tierColor: tierInfo.color
                }
            });
        } else {
            // No opponent found - suggest bot
            const bot = arenaService.getRankedBot(rank.tier, rank.faction);
            const tierInfo = RANK_TIERS.find(t => t.tier === bot.tier && !t.faction);

            res.json({
                success: true,
                found: false,
                suggestBot: true,
                message: 'Không tìm thấy đối thủ. Bạn có muốn đấu với Tiên Ma?',
                data: {
                    botId: bot.id,
                    name: bot.name,
                    tier: bot.tier,
                    tierName: tierInfo?.name,
                    tierColor: tierInfo?.color,
                    statMultiplier: bot.statMultiplier,
                    mmrChangeRate: bot.mmrChangeRate
                }
            });
        }
    } catch (error) {
        console.error('[ARENA] Find match error:', error);
        next(error);
    }
});

/**
 * POST /api/arena/challenge
 * Challenge a player for ranked match
 */
router.post('/challenge', async (req, res, next) => {
    try {
        const challengerId = req.user._id;
        const { opponentId } = req.body;

        if (!opponentId) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chọn đối thủ'
            });
        }

        // Check cooldown
        const cooldownInfo = await arenaService.checkCooldown(challengerId);
        if (cooldownInfo.inCooldown) {
            return res.status(429).json({
                success: false,
                message: `Vui lòng đợi ${cooldownInfo.remainingSeconds} giây`,
                cooldown: cooldownInfo.remainingSeconds
            });
        }

        // Get players
        const challenger = await User.findById(challengerId);
        const opponent = await User.findById(opponentId);

        if (!opponent) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đối thủ'
            });
        }

        // Get cultivations
        const challengerCult = await Cultivation.findOne({ user: challengerId });
        const opponentCult = await Cultivation.findOne({ user: opponentId });

        if (!challengerCult) {
            return res.status(400).json({
                success: false,
                message: 'Bạn chưa bắt đầu tu tiên'
            });
        }

        // Calculate combat stats
        const challengerStats = challengerCult.calculateCombatStats();
        const challengerEquipStats = await challengerCult.getEquipmentStats();
        mergeEquipmentStats(challengerStats, challengerEquipStats);

        const opponentStats = opponentCult?.calculateCombatStats() || { attack: 10, defense: 5, qiBlood: 100 };
        if (opponentCult) {
            const opponentEquipStats = await opponentCult.getEquipmentStats();
            mergeEquipmentStats(opponentStats, opponentEquipStats);
        }

        // Get skills from learned techniques
        const challengerSkills = getLearnedSkills(challengerCult, challengerStats.zhenYuan);
        const opponentSkills = opponentCult ? getLearnedSkills(opponentCult, opponentStats.zhenYuan) : [];

        // Simulate battle with skills
        const battleResult = simulateBattle(challengerStats, opponentStats, challengerSkills, opponentSkills);

        // Create battle record
        const battle = new Battle({
            challenger: challengerId,
            challengerUsername: challenger.name,
            challengerStats,
            opponent: opponentId,
            opponentUsername: opponent.name,
            opponentStats,
            winner: battleResult.isDraw ? null : (battleResult.winner === 'challenger' ? challengerId : opponentId),
            isDraw: battleResult.isDraw,
            battleLogs: battleResult.logs,
            totalTurns: battleResult.totalTurns,
            totalDamageByChallenger: battleResult.totalDamageByChallenger,
            totalDamageByOpponent: battleResult.totalDamageByOpponent,
            status: 'completed',
            completedAt: new Date()
        });

        await battle.save();

        // Giảm độ bền trang bị sau chiến đấu (PvP)
        try {
            await reduceEquipmentDurability(challengerCult);
            await reduceEquipmentDurability(opponentCult);
        } catch (durabilityError) {
            console.error('[ARENA PvP] Durability reduction error:', durabilityError.message);
        }

        // Process ranked match
        const rankedResult = await arenaService.processRankedMatch(
            challengerId,
            opponentId,
            {
                ...battleResult,
                battleId: battle._id,
                challengerUsername: challenger.name,
                opponentUsername: opponent.name
            },
            false
        );

        // Get tier info for response
        const challengerTierInfo = rankedResult.challengerTier;
        const opponentTierInfo = rankedResult.opponentTier;

        res.json({
            success: true,
            message: battleResult.isDraw
                ? 'Trận đấu hòa!'
                : `${battleResult.winner === 'challenger' ? challenger.name : opponent.name} chiến thắng!`,
            data: {
                battleId: battle._id,
                winner: battleResult.winner,
                isDraw: battleResult.isDraw,

                challenger: {
                    id: challengerId,
                    username: challenger.name,
                    avatar: challenger.avatarUrl,
                    mmrChange: rankedResult.challengerMmrChange,
                    newMmr: rankedResult.challengerNewMmr,
                    tier: challengerTierInfo,
                    stats: {
                        qiBlood: challengerStats.qiBlood,
                        zhenYuan: challengerStats.zhenYuan || challengerStats.qiBlood * 0.5
                    }
                },
                opponent: {
                    id: opponentId,
                    username: opponent.name,
                    avatar: opponent.avatarUrl,
                    mmrChange: rankedResult.opponentMmrChange,
                    newMmr: rankedResult.opponentNewMmr,
                    tier: opponentTierInfo,
                    stats: {
                        qiBlood: opponentStats.qiBlood,
                        zhenYuan: opponentStats.zhenYuan || opponentStats.qiBlood * 0.5
                    }
                },

                battleLogs: battleResult.logs,
                totalTurns: battleResult.totalTurns
            }
        });
    } catch (error) {
        console.error('[ARENA] Challenge error:', error);
        next(error);
    }
});

/**
 * POST /api/arena/challenge-bot
 * Challenge a ranked bot
 */
router.post('/challenge-bot', async (req, res, next) => {
    try {
        const challengerId = req.user._id;
        const { botId } = req.body;

        if (!botId) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chọn đối thủ'
            });
        }

        // Check cooldown
        const cooldownInfo = await arenaService.checkCooldown(challengerId);
        if (cooldownInfo.inCooldown) {
            return res.status(429).json({
                success: false,
                message: `Vui lòng đợi ${cooldownInfo.remainingSeconds} giây`,
                cooldown: cooldownInfo.remainingSeconds
            });
        }

        // Find bot
        const bot = RANKED_BOTS.find(b => b.id === botId);
        if (!bot) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đối thủ'
            });
        }

        // Get challenger
        const challenger = await User.findById(challengerId);
        const challengerCult = await Cultivation.findOne({ user: challengerId });

        if (!challengerCult) {
            return res.status(400).json({
                success: false,
                message: 'Bạn chưa bắt đầu tu tiên'
            });
        }

        // Calculate stats
        const challengerStats = challengerCult.calculateCombatStats();
        const challengerEquipStats = await challengerCult.getEquipmentStats();
        mergeEquipmentStats(challengerStats, challengerEquipStats);

        // Get challenger skills
        const challengerSkills = getLearnedSkills(challengerCult, challengerStats.zhenYuan);

        const botStats = arenaService.generateBotStats(bot.tier, bot.statMultiplier);

        // Simulate battle (bot has no skills)
        const battleResult = simulateBattle(challengerStats, botStats, challengerSkills, []);

        // Create battle record
        const battle = new Battle({
            challenger: challengerId,
            challengerUsername: challenger.name,
            challengerStats,
            opponent: challengerId, // Placeholder for bot
            opponentUsername: bot.name,
            opponentStats: botStats,
            winner: battleResult.isDraw ? null : (battleResult.winner === 'challenger' ? challengerId : null),
            isDraw: battleResult.isDraw,
            battleLogs: battleResult.logs,
            totalTurns: battleResult.totalTurns,
            totalDamageByChallenger: battleResult.totalDamageByChallenger,
            totalDamageByOpponent: battleResult.totalDamageByOpponent,
            status: 'completed',
            completedAt: new Date()
        });

        await battle.save();

        // Giảm độ bền trang bị sau chiến đấu (vs Bot)
        try {
            await reduceEquipmentDurability(challengerCult);
        } catch (durabilityError) {
            console.error('[ARENA Bot] Durability reduction error:', durabilityError.message);
        }

        // Process ranked match
        const rankedResult = await arenaService.processRankedMatch(
            challengerId,
            null,
            {
                ...battleResult,
                battleId: battle._id,
                challengerUsername: challenger.name,
                opponentUsername: bot.name
            },
            true,
            bot
        );

        const tierInfo = RANK_TIERS.find(t => t.tier === bot.tier && !t.faction);

        res.json({
            success: true,
            message: battleResult.isDraw
                ? `Trận đấu với ${bot.name} hòa!`
                : battleResult.winner === 'challenger'
                    ? `Bạn đã đánh bại ${bot.name}!`
                    : `${bot.name} đã đánh bại bạn!`,
            data: {
                battleId: battle._id,
                winner: battleResult.winner,
                isDraw: battleResult.isDraw,
                isBot: true,

                challenger: {
                    id: challengerId,
                    username: challenger.name,
                    avatar: challenger.avatarUrl,
                    mmrChange: rankedResult.challengerMmrChange,
                    newMmr: rankedResult.challengerNewMmr,
                    tier: rankedResult.challengerTier,
                    stats: {
                        qiBlood: challengerStats.qiBlood,
                        zhenYuan: challengerStats.zhenYuan || challengerStats.qiBlood * 0.5
                    }
                },
                opponent: {
                    id: `bot_${bot.id}`,
                    username: bot.name,
                    // Use tamma.jpg for Ma bots, tienthan.jpg for Tien bots
                    avatar: bot.faction === 'ma' ? '/assets/tamma.jpg' : '/assets/tienthan.jpg',
                    tier: bot.tier,
                    tierName: tierInfo?.name,
                    tierColor: tierInfo?.color,
                    statMultiplier: bot.statMultiplier,
                    isBot: true,
                    stats: {
                        qiBlood: botStats.qiBlood,
                        zhenYuan: botStats.zhenYuan || botStats.qiBlood * 0.5
                    }
                },

                battleLogs: battleResult.logs,
                totalTurns: battleResult.totalTurns,
                mmrChangeRate: bot.mmrChangeRate
            }
        });
    } catch (error) {
        console.error('[ARENA] Challenge bot error:', error);
        next(error);
    }
});

/**
 * GET /api/arena/leaderboard
 * Get ranked leaderboard
 */
router.get('/leaderboard', async (req, res, next) => {
    try {
        const { limit = 100 } = req.query;

        const leaderboard = await arenaService.getLeaderboard(parseInt(limit));

        // Find current user's rank
        const userId = req.user._id;
        const userRankIndex = leaderboard.findIndex(r => r.userId?.toString() === userId.toString());

        res.json({
            success: true,
            data: {
                leaderboard,
                userRank: userRankIndex >= 0 ? userRankIndex + 1 : null
            }
        });
    } catch (error) {
        console.error('[ARENA] Leaderboard error:', error);
        next(error);
    }
});

/**
 * GET /api/arena/history
 * Get ranked match history
 */
router.get('/history', async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { limit = 20, skip = 0 } = req.query;

        const season = await Season.getCurrentSeason();
        if (!season) {
            return res.json({
                success: true,
                data: { matches: [], stats: null }
            });
        }

        const matches = await RankedMatch.getHistoryForUser(
            userId,
            season.seasonNumber,
            parseInt(limit),
            parseInt(skip)
        );

        const stats = await RankedMatch.getSeasonStats(userId, season.seasonNumber);

        // Format matches
        const formattedMatches = matches.map(match => {
            const isPlayer1 = match.player1?._id?.toString() === userId.toString();
            const isWinner = !match.isDraw && (
                (isPlayer1 && match.winnerSide === 'player1') ||
                (!isPlayer1 && match.winnerSide === 'player2')
            );

            return {
                _id: match._id,
                createdAt: match.createdAt,
                opponent: {
                    id: isPlayer1 ? match.player2?._id : match.player1?._id,
                    username: isPlayer1 ? match.player2Username : match.player1Username,
                    avatar: isPlayer1 ? match.player2?.avatarUrl : match.player1?.avatarUrl,
                    mmr: isPlayer1 ? match.player2Mmr : match.player1Mmr,
                    tier: isPlayer1 ? match.player2Tier : match.player1Tier,
                    isBot: isPlayer1 ? match.player2IsBot : false
                },
                result: match.isDraw ? 'draw' : (isWinner ? 'win' : 'loss'),
                mmrChange: isPlayer1 ? match.player1MmrChange : match.player2MmrChange,
                totalTurns: match.totalTurns
            };
        });

        res.json({
            success: true,
            data: {
                matches: formattedMatches,
                stats
            }
        });
    } catch (error) {
        console.error('[ARENA] History error:', error);
        next(error);
    }
});

/**
 * GET /api/arena/season
 * Get current season info
 */
router.get('/season', async (req, res, next) => {
    try {
        await Season.ensureSeasonExists();
        const season = await Season.getCurrentSeason();

        if (!season) {
            return res.status(404).json({
                success: false,
                message: 'Không có mùa giải'
            });
        }

        // Get user's highest tier for rewards preview
        const userId = req.user._id;
        const rank = await Rank.findOne({ user: userId }).lean();
        const highestTier = rank?.highestTier || 1;

        // Check if rewards already claimed
        const hasClaimed = season.hasClaimedRewards(userId);

        // Get potential rewards
        const rewards = Season.getRewardsForTier(highestTier, rank?.faction);

        res.json({
            success: true,
            data: {
                season: {
                    number: season.seasonNumber,
                    name: season.name,
                    startDate: season.startDate,
                    endDate: season.endDate,
                    daysRemaining: season.getDaysRemaining(),
                    isActive: season.isActive,
                    totalParticipants: season.totalParticipants,
                    totalMatches: season.totalMatches
                },
                rewards: {
                    currentTier: highestTier,
                    potential: rewards,
                    allTiers: SEASON_REWARDS,
                    hasClaimed
                }
            }
        });
    } catch (error) {
        console.error('[ARENA] Season error:', error);
        next(error);
    }
});

/**
 * POST /api/arena/claim-rewards
 * Claim season rewards
 */
router.post('/claim-rewards', async (req, res, next) => {
    try {
        const userId = req.user._id;

        const rewards = await arenaService.claimSeasonRewards(userId);

        res.json({
            success: true,
            message: 'Nhận thưởng thành công!',
            data: rewards
        });
    } catch (error) {
        console.error('[ARENA] Claim rewards error:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/arena/choose-faction
 * Choose faction when reaching tier 8
 */
router.post('/choose-faction', async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { faction } = req.body;

        if (!['tien', 'ma'].includes(faction)) {
            return res.status(400).json({
                success: false,
                message: 'Faction phải là "tien" hoặc "ma"'
            });
        }

        const rank = await Rank.findOne({ user: userId });

        if (!rank) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thông tin xếp hạng'
            });
        }

        if (rank.tier < 8 || rank.mmr < 3200) {
            return res.status(400).json({
                success: false,
                message: 'Bạn cần đạt 3200 MMR để chọn phe'
            });
        }

        if (rank.faction !== 'none') {
            return res.status(400).json({
                success: false,
                message: 'Bạn đã chọn phe rồi'
            });
        }

        rank.faction = faction;
        rank.updateTier();
        await rank.save();

        const tierInfo = Rank.getTierFromMmr(rank.mmr, rank.faction);

        res.json({
            success: true,
            message: faction === 'tien' ? 'Chúc mừng Tiên Tôn!' : 'Chúc mừng Ma Tôn!',
            data: {
                faction: rank.faction,
                tierName: tierInfo.name,
                tierColor: tierInfo.color,
                tierLogo: tierInfo.logo
            }
        });
    } catch (error) {
        console.error('[ARENA] Choose faction error:', error);
        next(error);
    }
});

/**
 * GET /api/arena/bots
 * Get available ranked bots for current tier
 */
router.get('/bots', async (req, res, next) => {
    try {
        const userId = req.user._id;
        const rank = await Rank.findOne({ user: userId }).lean();

        const tier = rank?.tier || 2;
        const bots = RANKED_BOTS.filter(b => b.tier === tier);

        const botsWithInfo = bots.map(bot => {
            const tierInfo = RANK_TIERS.find(t => t.tier === bot.tier && !t.faction);
            return {
                ...bot,
                tierName: tierInfo?.name,
                tierColor: tierInfo?.color
            };
        });

        res.json({
            success: true,
            data: botsWithInfo
        });
    } catch (error) {
        console.error('[ARENA] Get bots error:', error);
        next(error);
    }
});

export default router;
