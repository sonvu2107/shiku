import Cultivation, { CULTIVATION_REALMS, SHOP_ITEMS_MAP } from "../../models/Cultivation.js";
import { formatCultivationResponse, formatLightweightCultivationPatch, invalidateCultivationCache } from "./coreController.js";
import { consumeExpCap, checkClickCooldown, getCapByRealm, getExpCapRemaining } from "../../services/expCapService.js";
import { getClient, isRedisConnected, redisConfig } from "../../services/redisClient.js";
import { logRareEncounterEvent } from "./worldEventController.js";
import { getDisplayConfig, DEBUFF_TYPES } from "../../data/tierConfig.js";
import { saveWithRetry } from "../../utils/dbUtils.js";
import mongoose from "mongoose";

// Cache TTL for passive exp status (seconds)
const PASSIVE_STATUS_CACHE_TTL = 10;

// Helper to invalidate passive status cache
const invalidatePassiveStatusCache = (userId) => {
    const redis = getClient();
    if (redis && isRedisConnected()) {
        const cacheKey = `${redisConfig.keyPrefix}passiveStatus:${userId}`;
        redis.del(cacheKey).catch(err => console.error('[REDIS] Failed to invalidate passive status cache:', err.message));
    }
};

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

const expPerMinuteByRealm = {
    1: 2, 2: 4, 3: 8, 4: 15, 5: 25, 6: 40, 7: 60,
    8: 100, 9: 150, 10: 250, 11: 400, 12: 600, 13: 800, 14: 1000
};

export const collectPassiveExp = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const now = new Date();

        // Minimal lean query (no getOrCreate)
        const c = await Cultivation.findOne({ user: userId })
            .select("exp realmLevel subLevel activeBoosts lastPassiveExpCollected dataVersion statsVersion equipped")
            .lean();

        if (!c) {
            return res.status(409).json({ success: false, message: "Khởi tạo dữ liệu tu luyện, thử lại" });
        }

        const lastCollected = c.lastPassiveExpCollected ? new Date(c.lastPassiveExpCollected) : now;
        const elapsedMs = now.getTime() - lastCollected.getTime();
        const elapsedMinutes = Math.floor(elapsedMs / 60000);
        const effectiveMinutes = Math.min(elapsedMinutes, 1440);

        if (effectiveMinutes < 1) {
            return res.json({
                success: true,
                data: {
                    collected: false,
                    message: "Chưa đủ thời gian để thu thập tu vi",
                    nextCollectIn: 60 - Math.floor((elapsedMs / 1000) % 60),
                },
            });
        }

        // Filter expired boosts
        const boosts = Array.isArray(c.activeBoosts) ? c.activeBoosts : [];
        const validBoosts = boosts.filter(b => b?.expiresAt && new Date(b.expiresAt) > now);

        let multiplier = 1;

        // 1. Calculate Active Boosts (Additive)
        for (const b of validBoosts) {
            if (b.type === "exp" || b.type === "exp_boost") {
                // Additive stacking: 1.5x + 1.2x = 1 + 0.5 + 0.2 = 1.7x
                multiplier += (Number(b.multiplier) || 1) - 1;
            }
        }

        // 2. Calculate Pet Bonus
        if (c.equipped?.pet) {
            const petItem = SHOP_ITEMS_MAP.get(c.equipped.pet);
            if (petItem && petItem.expBonus) {
                multiplier += petItem.expBonus;
            }
        }

        // Fix floating point precision issues if any (e.g. 1.700000000002 -> 1.7)
        multiplier = Math.round(multiplier * 100) / 100;

        const baseExpPerMinute = expPerMinuteByRealm[c.realmLevel] || 2;
        const baseExp = effectiveMinutes * baseExpPerMinute;
        const finalExp = Math.floor(baseExp * multiplier);

        // Pure realm calculations
        const { getRealmProgressPure, calculateSubLevelPure, canBreakthroughPure, getRealmFromExpPure } = await import("../../services/realmCalculations.js");

        const newExp = (c.exp || 0) + finalExp;
        const newProgress = getRealmProgressPure(newExp, c.realmLevel);
        const newSubLevel = calculateSubLevelPure(newProgress);
        const breakthrough = canBreakthroughPure(newExp, c.realmLevel);
        const potentialRealm = breakthrough ? getRealmFromExpPure(newExp) : null;

        const logEntry = {
            amount: finalExp,
            source: "passive",
            description: multiplier > 1
                ? `Tu luyện ${effectiveMinutes} phút (x${multiplier} buff)`
                : `Tu luyện ${effectiveMinutes} phút`,
            timestamp: now,
        };

        // Optimistic lock
        const updateRes = await Cultivation.updateOne(
            { user: userId, lastPassiveExpCollected: c.lastPassiveExpCollected || null },
            {
                $set: { lastPassiveExpCollected: now, activeBoosts: validBoosts, subLevel: newSubLevel },
                $inc: { exp: finalExp, dataVersion: 1, statsVersion: 1 },
                $push: { expLog: { $each: [logEntry], $slice: -100 } },
            }
        );

        if (updateRes.modifiedCount === 0) {
            return res.json({
                success: true,
                data: { collected: false, message: "Bạn vừa thu thập tu vi xong, thử lại sau" },
            });
        }

        // Atomic quest progress
        const { applyQuestProgressAtomic } = await import("../../services/questProgressAtomic.js");
        await applyQuestProgressAtomic(userId, "passive_collect", 1, now);

        invalidatePassiveStatusCache(userId);

        // Random event (fire-and-forget)
        if (Math.random() < 0.05) {
            const encounters = [
                "tình cờ phát hiện một hang động cổ xưa đầy linh khí",
                "nhặt được một viên linh thạch thất lạc bên đường",
                "ngộ ra một đạo lý mới trong lúc tĩnh tọa",
                "được một cao nhân bí ẩn chỉ điểm vài chiêu",
                "nhìn thấy phượng hoàng bay ngang qua bầu trời",
                "cảm ngộ được sự vận chuyển của thiên địa linh khí"
            ];
            const description = encounters[Math.floor(Math.random() * encounters.length)];
            mongoose.model('User').findById(userId).select('name nickname').lean()
                .then(user => {
                    const username = user?.name || user?.nickname || 'Tu sĩ ẩn danh';
                    logRareEncounterEvent(userId, username, description).catch(() => { });
                }).catch(() => { });
        }

        return res.json({
            success: true,
            message: multiplier > 1 ? `Thu thập ${finalExp} tu vi (x${multiplier})!` : `Thu thập ${finalExp} tu vi!`,
            data: {
                collected: true,
                expEarned: finalExp,
                baseExp,
                multiplier,
                minutesElapsed: effectiveMinutes,
                totalExp: newExp,
                canBreakthrough: breakthrough,
                potentialRealm: breakthrough ? { name: potentialRealm.name, level: potentialRealm.level } : null,
                activeBoosts: validBoosts.map(b => ({ type: b.type, multiplier: b.multiplier, expiresAt: b.expiresAt })),
            },
        });
    } catch (error) { next(error); }
};

export const getPassiveExpStatus = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const redis = getClient();
        const cacheKey = `${redisConfig.keyPrefix}passiveStatus:${userId}`;

        // Try cache first
        if (redis && isRedisConnected()) {
            try {
                const cached = await redis.get(cacheKey);
                if (cached) {
                    return res.json(JSON.parse(cached));
                }
            } catch (err) {
                console.error('[REDIS] Passive status cache read error:', err.message);
            }
        }

        const cultivation = await Cultivation.getOrCreate(userId);
        const now = new Date();
        const lastCollected = cultivation.lastPassiveExpCollected || now;
        const elapsedMinutes = Math.min(1440, Math.floor((now.getTime() - new Date(lastCollected).getTime()) / 60000));
        const expPerMinuteByRealm = { 1: 2, 2: 4, 3: 8, 4: 15, 5: 25, 6: 40, 7: 60, 8: 100, 9: 150, 10: 250, 11: 400, 12: 600, 13: 800, 14: 1000 };
        const baseExpPerMinute = expPerMinuteByRealm[cultivation.realmLevel] || 2;
        const baseExp = elapsedMinutes * baseExpPerMinute;
        let multiplier = 1;
        const activeBoosts = cultivation.activeBoosts.filter(b => b.expiresAt > now);

        // 1. Calculate Active Boosts (Additive)
        for (const boost of activeBoosts) {
            if (boost.type === 'exp' || boost.type === 'exp_boost') {
                multiplier += (boost.multiplier - 1);
            }
        }

        // 2. Calculate Pet Bonus
        if (cultivation.equipped?.pet) {
            const petItem = SHOP_ITEMS_MAP.get(cultivation.equipped.pet);
            if (petItem && petItem.expBonus) {
                multiplier += petItem.expBonus;
            }
        }

        // Fix floating point precision
        multiplier = Math.round(multiplier * 100) / 100;

        const result = { success: true, data: { pendingExp: Math.floor(baseExp * multiplier), baseExp, multiplier, expPerMinute: baseExpPerMinute, minutesElapsed: elapsedMinutes, lastCollected, realmLevel: cultivation.realmLevel, activeBoosts: activeBoosts.map(b => ({ type: b.type, multiplier: b.multiplier, expiresAt: b.expiresAt })) } };

        // Cache result
        if (redis && isRedisConnected()) {
            redis.set(cacheKey, JSON.stringify(result), 'EX', PASSIVE_STATUS_CACHE_TTL)
                .catch(err => console.error('[REDIS] Passive status cache write error:', err.message));
        }

        res.json(result);
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
        // Lookup realm from CULTIVATION_REALMS để luôn hiển thị tên mới nhất
        res.json({
            success: true, data: {
                type, leaderboard: leaderboard.map((e, i) => {
                    const realm = CULTIVATION_REALMS.find(r => r.level === e.realmLevel) || CULTIVATION_REALMS[0];
                    return { rank: i + 1, user: e.user, exp: e.exp, realm: { level: e.realmLevel, name: realm.name, color: realm.color }, spiritStones: e.spiritStones, loginStreak: e.loginStreak, longestStreak: e.longestStreak, equipped: e.equipped, stats: e.stats, isCurrentUser: e.user?._id?.toString() === userId };
                }), userRank
            }
        });
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
        // Extended exp ranges for all 14 realms
        const expRanges = {
            1: { min: 1, max: 3 },
            2: { min: 3, max: 10 },
            3: { min: 10, max: 30 },
            4: { min: 20, max: 60 },
            5: { min: 50, max: 150 },
            6: { min: 100, max: 200 },
            7: { min: 150, max: 300 },
            8: { min: 200, max: 400 },
            9: { min: 300, max: 600 },
            10: { min: 400, max: 800 },
            11: { min: 500, max: 1000 },
            12: { min: 600, max: 1200 },
            13: { min: 800, max: 1600 },
            14: { min: 1000, max: 2000 }
        };
        const range = expRanges[realmLevel] || expRanges[14]; // Fallback to max realm, not min

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
                    console.log(`[Efficiency] User ${userId} - Technique: ${technique.name}, Bonus: ${technique.bonusPercent}%`);
                }
            } else {
                console.log(`[Efficiency] User ${userId} - No technique equipped`);
            }

            // Apply technique bonus
            let boostedAmount = Math.floor(amount * (1 + techniqueBonus));

            // Apply active boosts (Pills)
            const activeBoosts = (cultivation.activeBoosts || []).filter(b => b.expiresAt > new Date());
            let boostMultiplier = 1;
            for (const boost of activeBoosts) {
                if (boost.type === 'exp' || boost.type === 'exp_boost') {
                    boostMultiplier = Math.max(boostMultiplier, boost.multiplier);
                }
            }
            boostedAmount = Math.floor(boostedAmount * boostMultiplier);

            const capLimit = getCapByRealm(realmLevel);
            const { allowedExp, capRemaining } = await consumeExpCap(userId, boostedAmount, capLimit);

            if (allowedExp === 0) {
                // Tính thời gian còn lại đến khi cap reset (5 phút window)
                const { getWindowInfo } = await import('../../services/expCapService.js');
                const { windowEnd, now } = getWindowInfo(userId);
                const retryAfterMs = windowEnd - now;
                const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));

                return res.status(429).json({
                    success: false,
                    message: `Linh khí đã cạn kiệt, chờ ${retryAfterSeconds} giây`,
                    capRemaining: 0,
                    retryAfter: retryAfterSeconds
                });
            }

            expEarned = allowedExp;
            cultivation.updateQuestProgress('yinyang_click', 1);
            await saveWithRetry(cultivation); // Save quest progress separately
        }

        // Validate spirit stones (allow up to 10000 for dungeon/quest rewards)
        let stonesEarned = 0;
        if (spiritStones > 0 && typeof spiritStones === 'number' && spiritStones <= 10000) {
            stonesEarned = spiritStones;
        }

        const updateOps = {
            $inc: {
                exp: expEarned,
                dataVersion: 1,
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
        invalidatePassiveStatusCache(userId);

        const potentialRealm = updatedCultivation.getRealmFromExp();
        const canBreakthrough = potentialRealm.level > updatedCultivation.realmLevel;

        // Check if client requested patch mode (lightweight response)
        const isPatchMode = req.query.mode === 'patch';

        if (isPatchMode) {
            // Lightweight patch response for high-frequency requests
            return res.json({
                success: true,
                mode: 'patch',
                dataVersion: updatedCultivation.dataVersion,
                message: stonesEarned > 0 ? `+${expEarned} Tu Vi, +${stonesEarned} Linh Thạch` : `+${expEarned} Tu Vi`,
                patch: formatLightweightCultivationPatch(updatedCultivation)
            });
        }

        // Legacy full response
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

/**
 * GET /api/cultivation/tier-config
 * Trả về tier display config cho client (server source of truth)
 */
export const getTierConfig = async (req, res, next) => {
    try {
        const displayConfig = getDisplayConfig();
        const debuffTypes = Object.values(DEBUFF_TYPES).map(d => ({
            id: d.id,
            name: d.name,
            description: d.description,
            icon: d.icon,
            effects: d.effects
        }));

        res.json({
            success: true,
            data: {
                tiers: displayConfig,
                debuffs: debuffTypes
            }
        });
    } catch (error) { next(error); }
};
