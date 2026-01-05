import Cultivation, { CULTIVATION_REALMS } from "../../models/Cultivation.js";
import { formatCultivationResponse, invalidateCultivationCache } from "./coreController.js";
import { consumeExpCap, checkClickCooldown, getCapByRealm, getExpCapRemaining } from "../../services/expCapService.js";

// Cache for leaderboard with automatic cleanup
const leaderboardCache = new Map();
const LEADERBOARD_CACHE_TTL = 30 * 1000; // 30 seconds
const MAX_CACHE_ENTRIES = 20; // Limit cache size

// ==================== YINYANG CLICK RATE LIMITING ====================
const yinyangClickLastRequest = new Map();
const YINYANG_MIN_INTERVAL_MS = 200; // Minimum 200ms between requests

// ==================== CLEANUP WITH GRACEFUL SHUTDOWN ====================
let leaderboardCleanupIntervalId = null;
let yinyangCleanupIntervalId = null;

const startExpCleanup = () => {
    // Leaderboard cache cleanup (every 60 seconds)
    if (!leaderboardCleanupIntervalId) {
        leaderboardCleanupIntervalId = setInterval(() => {
            const now = Date.now();
            let deleted = 0;
            for (const [key, value] of leaderboardCache.entries()) {
                if (now - value.timestamp > LEADERBOARD_CACHE_TTL) {
                    leaderboardCache.delete(key);
                    deleted++;
                }
            }
            if (deleted > 0) {
                console.log(`[LEADERBOARD CACHE] Cleaned up ${deleted} expired entries`);
            }
        }, 60000);
    }

    // Yinyang rate limit cleanup (every 60 seconds)
    if (!yinyangCleanupIntervalId) {
        yinyangCleanupIntervalId = setInterval(() => {
            const cutoff = Date.now() - 60000;
            for (const [userId, timestamp] of yinyangClickLastRequest.entries()) {
                if (timestamp < cutoff) {
                    yinyangClickLastRequest.delete(userId);
                }
            }
        }, 60000);
    }
};

const stopExpCleanup = () => {
    if (leaderboardCleanupIntervalId) {
        clearInterval(leaderboardCleanupIntervalId);
        leaderboardCleanupIntervalId = null;
    }
    if (yinyangCleanupIntervalId) {
        clearInterval(yinyangCleanupIntervalId);
        yinyangCleanupIntervalId = null;
    }
};

// Start cleanup on module load
startExpCleanup();

// Export cleanup function for coordinated shutdown (called from main app)
export { stopExpCleanup };

async function getCachedLeaderboard(type, limit) {
    const cacheKey = `${type}:${limit}`;
    const cached = leaderboardCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < LEADERBOARD_CACHE_TTL) {
        return { data: cached.data, fromCache: true };
    }

    // Limit cache size to prevent memory bloat
    if (leaderboardCache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = leaderboardCache.keys().next().value;
        leaderboardCache.delete(oldestKey);
    }

    const data = await Cultivation.getLeaderboard(type, limit);
    leaderboardCache.set(cacheKey, { data, timestamp: Date.now() });
    return { data, fromCache: false };
}

export const collectPassiveExp = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const cultivation = await Cultivation.getOrCreate(userId);
        const result = cultivation.collectPassiveExp();
        if (!result.collected) return res.json({ success: true, data: result });

        // Cập nhật quest progress cho nhiệm vụ tĩnh tọa tu luyện
        cultivation.updateQuestProgress('passive_collect', 1);

        await cultivation.save();
        res.json({
            success: true,
            message: result.multiplier > 1 ? `Thu thập ${result.expEarned} tu vi (x${result.multiplier})!` : `Thu thập ${result.expEarned} tu vi!`,
            data: { ...result, cultivation: await formatCultivationResponse(cultivation) }
        });
    } catch (error) { next(error); }
};

export const getPassiveExpStatus = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const cultivation = await Cultivation.getOrCreate(userId);
        const now = new Date();
        const lastCollected = cultivation.lastPassiveExpCollected || now;
        const elapsedMinutes = Math.min(1440, Math.floor((now.getTime() - new Date(lastCollected).getTime()) / 60000));
        const expPerMinuteByRealm = { 1: 2, 2: 4, 3: 8, 4: 15, 5: 25, 6: 40, 7: 60, 8: 100, 9: 150, 10: 250 };
        const baseExpPerMinute = expPerMinuteByRealm[cultivation.realmLevel] || 2;
        const baseExp = elapsedMinutes * baseExpPerMinute;
        let multiplier = 1;
        const activeBoosts = cultivation.activeBoosts.filter(b => b.expiresAt > now);
        for (const boost of activeBoosts) {
            if (boost.type === 'exp' || boost.type === 'exp_boost') multiplier = Math.max(multiplier, boost.multiplier);
        }
        res.json({ success: true, data: { pendingExp: Math.floor(baseExp * multiplier), baseExp, multiplier, expPerMinute: baseExpPerMinute, minutesElapsed: elapsedMinutes, lastCollected, realmLevel: cultivation.realmLevel, activeBoosts: activeBoosts.map(b => ({ type: b.type, multiplier: b.multiplier, expiresAt: b.expiresAt })) } });
    } catch (error) { next(error); }
};

export const getLeaderboard = async (req, res, next) => {
    try {
        const { type = 'exp', limit = 50 } = req.query;
        const userId = req.user.id;
        const { data: leaderboard } = await getCachedLeaderboard(type, parseInt(limit));
        const userCultivation = await Cultivation.findOne({ user: userId });
        let userRank = null;
        if (userCultivation) {
            let countQuery = type === 'exp' ? { exp: { $gt: userCultivation.exp } } : type === 'realm' ? { $or: [{ realmLevel: { $gt: userCultivation.realmLevel } }, { realmLevel: userCultivation.realmLevel, exp: { $gt: userCultivation.exp } }] } : type === 'spiritStones' ? { totalSpiritStonesEarned: { $gt: userCultivation.totalSpiritStonesEarned } } : { longestStreak: { $gt: userCultivation.longestStreak } };
            userRank = (await Cultivation.countDocuments(countQuery)) + 1;
        }
        res.json({ success: true, data: { type, leaderboard: leaderboard.map((e, i) => ({ rank: i + 1, user: e.user, exp: e.exp, realm: { level: e.realmLevel, name: e.realmName }, spiritStones: e.spiritStones, loginStreak: e.loginStreak, longestStreak: e.longestStreak, equipped: e.equipped, stats: e.stats, isCurrentUser: e.user?._id?.toString() === userId })), userRank } });
    } catch (error) { next(error); }
};

export const getRealms = async (req, res, next) => {
    try {
        const cultivation = await Cultivation.getOrCreate(req.user.id);
        const currentRealm = cultivation.getRealmFromExp();
        res.json({ success: true, data: { realms: CULTIVATION_REALMS.map(r => ({ ...r, isCurrent: r.level === currentRealm.level, isUnlocked: cultivation.exp >= r.minExp })), currentLevel: currentRealm.level } });
    } catch (error) { next(error); }
};

export const getExpLog = async (req, res, next) => {
    try {
        const cultivation = await Cultivation.findOne({ user: req.user.id }).select('+expLog');
        res.json({ success: true, data: cultivation?.expLog?.slice(-50).reverse() || [] });
    } catch (error) { next(error); }
};

export const addExp = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { amount, source = 'activity', spiritStones = 0 } = req.body;

        // ==================== REDIS COOLDOWN CHECK ====================
        if (source === 'yinyang_click') {
            // Redis-based cooldown (fallback to in-memory if Redis unavailable)
            const cooldownResult = await checkClickCooldown(userId, YINYANG_MIN_INTERVAL_MS);
            if (!cooldownResult.allowed) {
                return res.status(429).json({
                    success: false,
                    message: "Đang xử lý, vui lòng chậm hơn",
                    retryAfter: cooldownResult.waitMs
                });
            }
        }

        const cultivation = await Cultivation.getOrCreate(userId);
        const realmLevel = cultivation.realmLevel || 1;
        const expRanges = { 1: { min: 1, max: 3 }, 2: { min: 3, max: 10 }, 3: { min: 10, max: 30 }, 4: { min: 20, max: 60 }, 5: { min: 50, max: 150 }, 6: { min: 100, max: 200 }, 7: { min: 100, max: 200 }, 8: { min: 100, max: 200 }, 9: { min: 100, max: 200 }, 10: { min: 100, max: 200 }, 11: { min: 100, max: 200 } };
        const range = expRanges[realmLevel] || expRanges[1];

        if (!amount || typeof amount !== 'number' || amount < range.min || amount > range.max) {
            return res.status(400).json({ success: false, message: `Số exp không hợp lệ (${range.min}-${range.max})` });
        }

        // ==================== REDIS ATOMIC CAP CHECK ====================
        let expEarned = amount;
        let techniqueBonus = 0;

        if (source === 'yinyang_click') {
            // Get efficiency technique bonus if equipped
            const equippedTechniqueId = cultivation.equippedEfficiencyTechnique;
            if (equippedTechniqueId) {
                // Dynamic import to avoid circular dependency
                const { getTechniqueById } = await import('../../data/cultivationTechniques.js');
                const technique = getTechniqueById(equippedTechniqueId);
                if (technique && technique.bonusPercent) {
                    techniqueBonus = technique.bonusPercent / 100;
                }
            }

            // Apply technique bonus
            const boostedAmount = Math.floor(amount * (1 + techniqueBonus));

            const capLimit = getCapByRealm(realmLevel);
            const { allowedExp, capRemaining } = await consumeExpCap(userId, boostedAmount, capLimit);

            if (allowedExp === 0) {
                return res.status(429).json({
                    success: false,
                    message: "Linh khí đã cạn kiệt",
                    capRemaining: 0
                });
            }

            expEarned = allowedExp;
            cultivation.updateQuestProgress('yinyang_click', 1);
            await cultivation.save(); // Save quest progress separately
        }

        // ==================== ATOMIC UPDATE CULTIVATION ====================
        // Use findOneAndUpdate to avoid VersionError race condition
        let stonesEarned = 0;
        if (spiritStones > 0 && typeof spiritStones === 'number' && spiritStones <= 100) {
            stonesEarned = spiritStones;
        }

        const updateOps = {
            $inc: {
                exp: expEarned,
                ...(stonesEarned > 0 && {
                    spiritStones: stonesEarned,
                    totalSpiritStonesEarned: stonesEarned
                })
            },
            $push: {
                expLog: {
                    $each: [{
                        amount: expEarned,
                        source,
                        description: source === 'yinyang_click' ? 'Thu thập linh khí' : 'Hoạt động',
                        createdAt: new Date()
                    }],
                    $slice: -100 // Keep only last 100 logs
                }
            }
        };

        const updatedCultivation = await Cultivation.findOneAndUpdate(
            { user: userId },
            updateOps,
            { new: true }
        );

        if (!updatedCultivation) {
            return res.status(404).json({ success: false, message: 'Cultivation not found' });
        }

        // Invalidate cache after mutation
        invalidateCultivationCache(userId).catch(() => { });

        const potentialRealm = updatedCultivation.getRealmFromExp();
        const canBreakthrough = potentialRealm.level > updatedCultivation.realmLevel;

        res.json({
            success: true,
            message: stonesEarned > 0 ? `+${expEarned} Tu Vi, +${stonesEarned} Linh Thạch` : `+${expEarned} Tu Vi`,
            data: {
                expEarned,
                stonesEarned,
                totalExp: updatedCultivation.exp,
                totalSpiritStones: updatedCultivation.spiritStones,
                canBreakthrough,
                potentialRealm: canBreakthrough ? potentialRealm : null,
                cultivation: await formatCultivationResponse(updatedCultivation)
            }
        });
    } catch (error) { next(error); }
};

export const getStats = async (req, res, next) => {
    try {
        const [totalCultivators, realmDistribution, topCultivators, totalExpResult] = await Promise.all([
            Cultivation.countDocuments(),
            Cultivation.aggregate([{ $group: { _id: "$realmLevel", count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
            Cultivation.getLeaderboard('exp', 3),
            Cultivation.aggregate([{ $group: { _id: null, totalExp: { $sum: "$exp" }, totalStones: { $sum: "$totalSpiritStonesEarned" } } }])
        ]);
        res.json({ success: true, data: { totalCultivators, realmDistribution: realmDistribution.map(r => ({ realm: CULTIVATION_REALMS.find(realm => realm.level === r._id), count: r.count })), topCultivators: topCultivators.map(c => ({ user: c.user, realm: { level: c.realmLevel, name: c.realmName }, exp: c.exp })), serverStats: { totalExp: totalExpResult[0]?.totalExp || 0, totalSpiritStones: totalExpResult[0]?.totalStones || 0 } } });
    } catch (error) { next(error); }
};
