/**
 * Arena Service - Xử lý logic ranked arena
 * MMR calculation, matchmaking, rewards, decay
 */

import Rank, { RANK_TIERS, RANKED_BOTS } from '../models/Rank.js';
import RankedMatch from '../models/RankedMatch.js';
import Season, { SEASON_REWARDS } from '../models/Season.js';
import Cultivation from '../models/Cultivation.js';
import { saveWithRetry } from '../utils/dbUtils.js';
import { getSectBuildingBonuses } from './sectBuildingBonusService.js';

// ==================== MMR CALCULATION ====================

/**
 * Calculate MMR change based on Elo formula
 * @param {number} winnerMmr - MMR của người thắng
 * @param {number} loserMmr - MMR của người thua
 * @param {number} winStreak - Số trận thắng liên tiếp
 * @returns {Object} { winnerGain, loserLoss }
 */
export function calculateMmrChange(winnerMmr, loserMmr, winStreak = 0) {
    const BASE_CHANGE = 25;
    const MAX_CHANGE = 40;
    const MIN_CHANGE = 10;

    // Expected win probability (Elo formula)
    const expectedWinner = 1 / (1 + Math.pow(10, (loserMmr - winnerMmr) / 400));

    // MMR change based on upset factor
    let change = Math.round(BASE_CHANGE * (1 - expectedWinner) * 2);

    // Clamp
    change = Math.max(MIN_CHANGE, Math.min(MAX_CHANGE, change));

    // Streak bonus (max +15)
    const streakBonus = Math.min(winStreak * 5, 15);

    const winnerGain = change + streakBonus;
    const loserLoss = change; // No streak penalty for losers

    return { winnerGain, loserLoss };
}

/**
 * Calculate MMR change for draw
 */
export function calculateDrawMmrChange(player1Mmr, player2Mmr) {
    const diff = Math.abs(player1Mmr - player2Mmr);
    const baseChange = Math.min(5, Math.floor(diff / 100));

    // Higher MMR player loses a bit, lower gains a bit
    if (player1Mmr > player2Mmr) {
        return { player1Change: -baseChange, player2Change: baseChange };
    } else if (player2Mmr > player1Mmr) {
        return { player1Change: baseChange, player2Change: -baseChange };
    }
    return { player1Change: 0, player2Change: 0 };
}

// ==================== MATCHMAKING ====================

/**
 * Find random opponent within MMR range
 * @param {string} userId - Current user ID
 * @param {number} userMmr - Current user MMR
 * @param {number} range - MMR range (default ±200)
 * @returns {Object|null} Opponent rank data or null
 */
export async function findRandomOpponent(userId, userMmr, range = 200) {
    const ranks = await Rank.find({
        user: { $ne: userId },
        mmr: { $gte: userMmr - range, $lte: userMmr + range },
        lastMatchAt: { $lt: new Date(Date.now() - 60000) } // Not in cooldown
    })
        .limit(20)
        .populate('user', 'name avatarUrl')
        .lean();

    if (ranks.length === 0) return null;

    // Random selection
    const randomIndex = Math.floor(Math.random() * ranks.length);
    return ranks[randomIndex];
}

/**
 * Get ranked bot for tier
 */
export function getRankedBot(tier, faction = 'none') {
    const tierBots = RANKED_BOTS.filter(b => b.tier === tier);

    // Prefer same faction bot at tier 8
    if (tier === 8 && faction !== 'none') {
        const factionBot = tierBots.find(b => b.faction === faction);
        if (factionBot) return factionBot;
    }

    if (tierBots.length === 0) return null;
    return tierBots[Math.floor(Math.random() * tierBots.length)];
}

/**
 * Generate bot stats based on tier
 */
export function generateBotStats(tier, statMultiplier) {
    // Base stats by tier - tăng mạnh cho tier cao
    const baseStatsByTier = {
        1: { attack: 15, defense: 8, qiBlood: 150, zhenYuan: 80, speed: 12, criticalRate: 5, criticalDamage: 150, accuracy: 80, dodge: 5, penetration: 0, resistance: 0, lifesteal: 0, regeneration: 0.5, luck: 5 },
        2: { attack: 40, defense: 20, qiBlood: 400, zhenYuan: 200, speed: 18, criticalRate: 8, criticalDamage: 160, accuracy: 85, dodge: 8, penetration: 2, resistance: 2, lifesteal: 1, regeneration: 1, luck: 8 },
        3: { attack: 80, defense: 40, qiBlood: 800, zhenYuan: 400, speed: 25, criticalRate: 10, criticalDamage: 170, accuracy: 88, dodge: 10, penetration: 5, resistance: 5, lifesteal: 2, regeneration: 1.5, luck: 10 },
        4: { attack: 180, defense: 90, qiBlood: 1800, zhenYuan: 900, speed: 32, criticalRate: 12, criticalDamage: 180, accuracy: 90, dodge: 12, penetration: 8, resistance: 8, lifesteal: 3, regeneration: 2, luck: 12 },
        5: { attack: 400, defense: 200, qiBlood: 4000, zhenYuan: 2000, speed: 40, criticalRate: 15, criticalDamage: 190, accuracy: 92, dodge: 15, penetration: 12, resistance: 12, lifesteal: 5, regeneration: 3, luck: 15 },
        6: { attack: 900, defense: 450, qiBlood: 9000, zhenYuan: 4500, speed: 50, criticalRate: 18, criticalDamage: 200, accuracy: 94, dodge: 18, penetration: 15, resistance: 15, lifesteal: 7, regeneration: 4, luck: 18 },
        7: { attack: 2000, defense: 1000, qiBlood: 20000, zhenYuan: 10000, speed: 60, criticalRate: 20, criticalDamage: 210, accuracy: 96, dodge: 20, penetration: 18, resistance: 18, lifesteal: 10, regeneration: 5, luck: 20 },
        8: { attack: 5000, defense: 2500, qiBlood: 50000, zhenYuan: 25000, speed: 75, criticalRate: 22, criticalDamage: 220, accuracy: 97, dodge: 22, penetration: 20, resistance: 20, lifesteal: 12, regeneration: 6, luck: 22 },
        9: { attack: 12000, defense: 6000, qiBlood: 120000, zhenYuan: 60000, speed: 90, criticalRate: 25, criticalDamage: 230, accuracy: 98, dodge: 25, penetration: 22, resistance: 22, lifesteal: 15, regeneration: 7, luck: 25 }
    };

    // Stats that should NOT be scaled (percentage-based)
    const noScaleStats = ['criticalRate', 'criticalDamage', 'accuracy', 'dodge', 'resistance', 'lifesteal', 'regeneration', 'luck'];

    const baseStats = baseStatsByTier[tier] || baseStatsByTier[1];
    const stats = {};

    for (const [key, value] of Object.entries(baseStats)) {
        if (noScaleStats.includes(key)) {
            // Percentage stats: keep as-is (no scaling)
            stats[key] = value;
        } else {
            // Combat stats: scale with multiplier
            stats[key] = Math.floor(value * statMultiplier);
        }
    }

    return stats;
}

/**
 * Estimate MMR for bot based on tier
 */
export function getBotMmr(tier) {
    const tierInfo = RANK_TIERS.find(t => t.tier === tier && !t.faction);
    if (!tierInfo) return 1000;
    return Math.floor((tierInfo.minMmr + tierInfo.maxMmr) / 2);
}

// ==================== COOLDOWN ====================

/**
 * Check if user is in cooldown
 */
export async function checkCooldown(userId) {
    const rank = await Rank.findOne({ user: userId }).lean();
    if (!rank || !rank.matchCooldownUntil) return { inCooldown: false };

    const now = new Date();
    if (rank.matchCooldownUntil > now) {
        const remainingMs = rank.matchCooldownUntil - now;
        return {
            inCooldown: true,
            remainingSeconds: Math.ceil(remainingMs / 1000)
        };
    }

    return { inCooldown: false };
}

// ==================== MATCH PROCESSING ====================

/**
 * Process ranked match result
 */
export async function processRankedMatch(challengerId, opponentId, battleResult, isBot = false, botData = null) {
    const season = await Season.getCurrentSeason();
    if (!season) {
        throw new Error('Không có mùa giải đang hoạt động');
    }

    // Get or create ranks
    const challengerRank = await Rank.getOrCreate(challengerId);
    let opponentRank = isBot ? null : await Rank.getOrCreate(opponentId);

    // Apply decay before processing
    challengerRank.checkAndApplyDecay();
    if (opponentRank) opponentRank.checkAndApplyDecay();

    // Calculate MMR changes
    let challengerMmrChange = 0;
    let opponentMmrChange = 0;

    const opponentMmr = isBot ? getBotMmr(botData.tier) : opponentRank.mmr;

    if (battleResult.isDraw) {
        const drawChanges = calculateDrawMmrChange(challengerRank.mmr, opponentMmr);
        challengerMmrChange = drawChanges.player1Change;
        opponentMmrChange = drawChanges.player2Change;
    } else {
        const isWinner = battleResult.winner === 'challenger';
        const mmrChange = calculateMmrChange(
            isWinner ? challengerRank.mmr : opponentMmr,
            isWinner ? opponentMmr : challengerRank.mmr,
            isWinner ? challengerRank.winStreak : (opponentRank?.winStreak || 0)
        );

        if (isWinner) {
            challengerMmrChange = mmrChange.winnerGain;
            opponentMmrChange = -mmrChange.loserLoss;

            // Apply loss protection for loser
            if (!isBot && opponentRank) {
                const protection = Rank.getLossProtection(opponentRank.lossStreak);
                opponentMmrChange = Math.floor(opponentMmrChange * protection);
            }
        } else {
            // Apply loss protection for challenger
            const protection = Rank.getLossProtection(challengerRank.lossStreak);
            challengerMmrChange = Math.floor(-mmrChange.loserLoss * protection);
            opponentMmrChange = mmrChange.winnerGain;
        }

        // Bot matches give reduced MMR
        if (isBot) {
            challengerMmrChange = Math.floor(challengerMmrChange * botData.mmrChangeRate);
        }
    }

    // Create match record
    const rankedMatch = new RankedMatch({
        season: season.seasonNumber,
        player1: challengerId,
        player1Username: battleResult.challengerUsername,
        player1Mmr: challengerRank.mmr,
        player1MmrChange: challengerMmrChange,
        player1Tier: challengerRank.tier,
        player2: isBot ? null : opponentId,
        player2Username: isBot ? botData.name : battleResult.opponentUsername,
        player2Mmr: opponentMmr,
        player2MmrChange: opponentMmrChange,
        player2Tier: isBot ? botData.tier : opponentRank?.tier,
        player2IsBot: isBot,
        player2BotId: isBot ? botData.id : null,
        winner: battleResult.isDraw ? null : (battleResult.winner === 'challenger' ? challengerId : opponentId),
        winnerSide: battleResult.isDraw ? 'draw' : (battleResult.winner === 'challenger' ? 'player1' : 'player2'),
        isDraw: battleResult.isDraw,
        battleId: battleResult.battleId,
        totalTurns: battleResult.totalTurns,
        completedAt: new Date()
    });

    await rankedMatch.save();

    // Update challenger rank
    const challengerResult = battleResult.isDraw ? 'draw' : (battleResult.winner === 'challenger' ? 'win' : 'loss');
    challengerRank.addMatchResult(challengerResult, challengerMmrChange, {
        matchId: rankedMatch._id,
        opponentId: isBot ? null : opponentId,
        opponentUsername: isBot ? botData.name : battleResult.opponentUsername,
        opponentMmr,
        isBot
    });
    await challengerRank.save();

    // Update opponent rank (if not bot)
    if (!isBot && opponentRank) {
        const opponentResult = battleResult.isDraw ? 'draw' : (battleResult.winner === 'opponent' ? 'win' : 'loss');
        opponentRank.addMatchResult(opponentResult, opponentMmrChange, {
            matchId: rankedMatch._id,
            opponentId: challengerId,
            opponentUsername: battleResult.challengerUsername,
            opponentMmr: challengerRank.mmr - challengerMmrChange, // Original MMR
            isBot: false
        });
        await opponentRank.save();
    }

    // Update season stats
    season.totalMatches++;
    await season.save();

    return {
        rankedMatch,
        challengerMmrChange,
        opponentMmrChange,
        challengerNewMmr: challengerRank.mmr,
        opponentNewMmr: opponentRank?.mmr || opponentMmr,
        challengerTier: Rank.getTierFromMmr(challengerRank.mmr, challengerRank.faction),
        opponentTier: opponentRank ? Rank.getTierFromMmr(opponentRank.mmr, opponentRank.faction) : RANK_TIERS.find(t => t.tier === botData?.tier)
    };
}

// ==================== SEASON REWARDS ====================

/**
 * Claim season rewards
 */
export async function claimSeasonRewards(userId) {
    const rank = await Rank.findOne({ user: userId });
    if (!rank) {
        throw new Error('Không tìm thấy thông tin xếp hạng');
    }

    const season = await Season.getCurrentSeason();
    if (!season) {
        throw new Error('Không có mùa giải');
    }

    // Check if season has ended
    if (season.endDate > new Date()) {
        throw new Error('Mùa giải chưa kết thúc');
    }

    // Check if already claimed
    if (season.hasClaimedRewards(userId)) {
        throw new Error('Bạn đã nhận thưởng mùa này rồi');
    }

    // Get rewards based on highest tier
    const rewardTier = rank.highestTier;
    const rewards = Season.getRewardsForTier(rewardTier, rank.faction);

    if (!rewards) {
        throw new Error('Không tìm thấy phần thưởng cho tier này');
    }

    // Apply rewards to cultivation
    const cultivation = await Cultivation.findOne({ user: userId });
    if (cultivation) {
        // Lấy bonus từ Luyện Công Trường
        const sectBonuses = await getSectBuildingBonuses(userId);
        const arenaBonus = sectBonuses.arenaBonus || 0;

        // Tính phần thưởng với bonus từ Tông Môn
        const bonusMultiplier = 1 + arenaBonus;
        const finalExp = Math.floor(rewards.exp * bonusMultiplier);
        const finalSpiritStones = Math.floor(rewards.spiritStones * bonusMultiplier);

        cultivation.exp += finalExp;
        cultivation.spiritStones += finalSpiritStones;

        // Add title if any
        if (rewards.title) {
            const titleItem = {
                itemId: `season_${season.seasonNumber}_title_${rank.highestTier}`,
                name: rewards.title,
                type: 'title',
                quantity: 1,
                equipped: false,
                acquiredAt: new Date(),
                metadata: {
                    source: `Mùa ${season.seasonNumber}`,
                    tier: rank.highestTier,
                    rarity: rank.highestTier >= 7 ? 'legendary' : rank.highestTier >= 5 ? 'epic' : 'rare'
                }
            };
            cultivation.inventory.push(titleItem);
        }

        // Add avatar frame if any (tier 8+)
        if (rewards.avatarFrame) {
            const frameItem = {
                itemId: `season_${season.seasonNumber}_${rewards.avatarFrame}`,
                name: `Khung ${rewards.tierName} Mùa ${season.seasonNumber}`,
                type: 'avatar_frame',
                quantity: 1,
                equipped: false,
                acquiredAt: new Date(),
                metadata: {
                    source: `Mùa ${season.seasonNumber}`,
                    tier: rank.highestTier,
                    rarity: 'legendary'
                }
            };
            cultivation.inventory.push(frameItem);
        }

        // Add pet if any (tier 9)
        if (rewards.pet) {
            const petItem = {
                itemId: `season_${season.seasonNumber}_${rewards.pet}`,
                name: `Linh Thú Huyền Thoại Mùa ${season.seasonNumber}`,
                type: 'pet',
                quantity: 1,
                equipped: false,
                acquiredAt: new Date(),
                metadata: {
                    source: `Mùa ${season.seasonNumber}`,
                    tier: rank.highestTier,
                    rarity: 'legendary',
                    expBonus: 0.15,
                    spiritStoneBonus: 0.10
                }
            };
            cultivation.inventory.push(petItem);
        }

        await saveWithRetry(cultivation);
    }

    // Mark as claimed
    season.claimRewards(userId, rewardTier);
    await season.save();

    return {
        tier: rewardTier,
        tierName: rewards.tierName,
        spiritStones: rewards.spiritStones,
        exp: rewards.exp,
        title: rewards.title || null
    };
}

// ==================== LEADERBOARD ====================

/**
 * Get ranked leaderboard
 */
export async function getLeaderboard(limit = 100, season = null) {
    const query = season ? { currentSeason: season } : {};

    const ranks = await Rank.find(query)
        .sort({ mmr: -1 })
        .limit(limit)
        .populate('user', 'name avatarUrl')
        .lean();

    return ranks.map((rank, index) => {
        const tierInfo = Rank.getTierFromMmr(rank.mmr, rank.faction);
        return {
            rank: index + 1,
            userId: rank.user?._id,
            username: rank.user?.name || 'Tu sĩ ẩn danh',
            avatar: rank.user?.avatarUrl,
            mmr: rank.mmr,
            tier: rank.tier,
            tierName: tierInfo.name,
            tierColor: tierInfo.color,
            tierLogo: tierInfo.logo,
            wins: rank.seasonWins,
            losses: rank.seasonLosses,
            winRate: rank.seasonWins + rank.seasonLosses > 0
                ? ((rank.seasonWins / (rank.seasonWins + rank.seasonLosses)) * 100).toFixed(1)
                : 0,
            faction: rank.faction
        };
    });
}

export default {
    calculateMmrChange,
    calculateDrawMmrChange,
    findRandomOpponent,
    getRankedBot,
    generateBotStats,
    getBotMmr,
    checkCooldown,
    processRankedMatch,
    claimSeasonRewards,
    getLeaderboard
};
