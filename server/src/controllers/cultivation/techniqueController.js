/**
 * Technique Controller - Quản lý công pháp tu luyện
 * APIs: list, learn, equip, activate (semi-auto), claim
 */

import Cultivation, { CULTIVATION_REALMS } from "../../models/Cultivation.js";
import { formatCultivationResponse, formatLightweightCultivationPatch, invalidateCultivationCache } from "./coreController.js";
import {
    consumeExpCap,
    getCapByRealm,
    getPassiveExpPerMin,
    getExpCapRemaining,
    getDayKeyInBangkok
} from "../../services/expCapService.js";
import {
    CULTIVATION_TECHNIQUES,
    TECHNIQUE_TYPES,
    getTechniqueById,
    checkUnlockCondition,
    getAvailableTechniques
} from "../../data/cultivationTechniques.js";
import { TECHNIQUES_MAP } from "../../data/shopItems.js";
import { isTechniqueUnlocked, getUnlockRequirementText } from "../../services/techniqueUnlockService.js";
import crypto from "crypto";
import { getClient, isRedisConnected, redisConfig } from "../../services/redisClient.js";
import { saveWithRetry } from "../../utils/dbUtils.js";

// Cache TTL for techniques list (seconds)
const TECHNIQUES_CACHE_TTL = 10;

// Cooldown between technique sessions (15 seconds)
const TECHNIQUE_SESSION_COOLDOWN_MS = 15000;

// ==================== ANTI-EXPLOIT CONSTANTS ====================
// Daily quota: 30 phút = 1800 giây nhập định/ngày
const MAX_DAILY_MEDITATION_SECONDS = 1800;
// Minimum session time để claim (50% duration)
const MIN_SESSION_PERCENT = 0.5;

// Lua script để release lock an toàn (chỉ xóa nếu value khớp)
const LUA_RELEASE_LOCK = `
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
`;

// ============================================================
// GET /techniques - Danh sách công pháp
// ============================================================

export const listTechniques = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const redis = getClient();
        const cacheKey = `${redisConfig.keyPrefix} techniques:${userId} `;

        // Try cache first
        if (redis && isRedisConnected()) {
            try {
                const cached = await redis.get(cacheKey);
                if (cached) {
                    return res.json(JSON.parse(cached));
                }
            } catch (err) {
                console.error('[REDIS] Techniques cache read error:', err.message);
            }
        }

        const cultivation = await Cultivation.getOrCreate(userId);

        // Lấy userProgress từ dungeon/quest
        const dungeonProgressArray = cultivation.dungeonProgress || [];
        const maxDungeonFloor = dungeonProgressArray.reduce((max, p) => Math.max(max, p.highestFloor || 0), 0);

        console.log(`[Techniques] User ${userId} MaxFloor: ${maxDungeonFloor}`);
        // Log details if maxFloor is 0 but array is not empty
        if (maxDungeonFloor === 0 && dungeonProgressArray.length > 0) {
            console.log('[Techniques] Dungeon Progress Details:', JSON.stringify(dungeonProgressArray, null, 2));
        }

        const userProgress = {
            maxDungeonFloor,
            completedQuests: []
        };

        const techniques = getAvailableTechniques(cultivation, userProgress);

        // Add unlock status for techniques from TECHNIQUES_MAP (new system)
        const enrichedTechniques = techniques.map(tech => {
            const shopTech = TECHNIQUES_MAP.get(tech.id);
            if (shopTech && shopTech.unlockCondition) {
                return {
                    ...tech,
                    isUnlocked: isTechniqueUnlocked(shopTech, cultivation),
                    unlockRequirement: getUnlockRequirementText(shopTech.unlockCondition)
                };
            }
            return { ...tech, isUnlocked: true }; // Legacy techniques always unlocked if available
        });

        // Check active session còn hạn không
        // Không cần grace period vì user có thể claim bất cứ lúc nào sau khi session bắt đầu
        // Session chỉ bị coi là invalid nếu đã claim rồi
        let activeSession = null;
        if (cultivation.activeTechniqueSession?.sessionId) {
            const session = cultivation.activeTechniqueSession;
            const now = Date.now();
            const endsAt = new Date(session.endsAt).getTime();

            // Nếu chưa claim và session chưa quá 24 giờ thì vẫn trả về để user có thể claim
            // Grace period 24h cho phép user claim dù treo app/chuyển tab lâu
            const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000; // 24 giờ
            if (!session.claimedAt && now < endsAt + GRACE_PERIOD_MS) {
                activeSession = {
                    sessionId: session.sessionId,
                    techniqueId: session.techniqueId,
                    startedAt: session.startedAt,
                    endsAt: session.endsAt,
                    realmAtStart: session.realmAtStart,
                    timeRemaining: Math.max(0, endsAt - now)
                };
            }
        }

        const result = {
            success: true,
            data: {
                techniques: enrichedTechniques,
                learned: cultivation.learnedTechniques || [],
                equippedEfficiency: cultivation.equippedEfficiencyTechnique,
                activeSession
            }
        };

        // Cache result
        if (redis && isRedisConnected()) {
            redis.set(cacheKey, JSON.stringify(result), 'EX', TECHNIQUES_CACHE_TTL).catch(() => { });
        }

        res.json(result);
    } catch (error) {
        next(error);
    }
};

// ============================================================
// POST /techniques/learn - Học công pháp
// ============================================================

export const learnTechnique = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { techniqueId } = req.body;

        if (!techniqueId) {
            return res.status(400).json({ success: false, message: "Thiếu techniqueId" });
        }

        const technique = getTechniqueById(techniqueId);
        if (!technique) {
            return res.status(404).json({ success: false, message: "Công pháp không tồn tại" });
        }

        const cultivation = await Cultivation.getOrCreate(userId);

        // Check đã học chưa (idempotent)
        const alreadyLearned = (cultivation.learnedTechniques || [])
            .some(t => t.techniqueId === techniqueId);

        if (alreadyLearned) {
            return res.json({
                success: true,
                message: "Đã lĩnh ngộ công pháp này",
                alreadyLearned: true
            });
        }

        // Check điều kiện unlock - Try new system first (for shopItems techniques)
        const shopTechnique = TECHNIQUES_MAP.get(techniqueId);
        if (shopTechnique && shopTechnique.unlockCondition) {
            // New unlock system for techniques from shopItems.js
            const isUnlocked = isTechniqueUnlocked(shopTechnique, cultivation);
            if (!isUnlocked) {
                const requirement = getUnlockRequirementText(shopTechnique.unlockCondition);
                return res.status(403).json({
                    success: false,
                    message: requirement || "Chưa đủ điều kiện lĩnh ngộ"
                });
            }
        } else {
            // Old unlock system for legacy techniques
            const dungeonProgressArray = cultivation.dungeonProgress || [];
            const maxDungeonFloor = dungeonProgressArray.reduce((max, p) => Math.max(max, p.highestFloor || 0), 0);
            const userProgress = {
                maxDungeonFloor,
                completedQuests: []
            };

            const { canUnlock, reason } = checkUnlockCondition(technique, cultivation, userProgress);
            if (!canUnlock) {
                return res.status(400).json({
                    success: false,
                    message: reason || "Chưa đủ điều kiện lĩnh ngộ"
                });
            }
        }

        // Học công pháp
        if (!cultivation.learnedTechniques) cultivation.learnedTechniques = [];
        cultivation.learnedTechniques.push({
            techniqueId,
            level: 1,
            exp: 0,
            learnedAt: new Date()
        });

        await saveWithRetry(cultivation);

        // Invalidate both caches
        invalidateCultivationCache(userId).catch(() => { });
        const redis = getClient();
        if (redis && isRedisConnected()) {
            redis.del(`${redisConfig.keyPrefix} techniques:${userId} `).catch(() => { });
        }

        res.json({
            success: true,
            message: `Đã lĩnh ngộ ${technique.name} !`,
            data: {
                technique: {
                    id: technique.id,
                    name: technique.name,
                    type: technique.type,
                    description: technique.description
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// ============================================================
// POST /techniques/equip - Trang bị công pháp efficiency
// ============================================================

export const equipTechnique = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { techniqueId } = req.body;

        // techniqueId = null để tháo công pháp
        if (techniqueId === null || techniqueId === '') {
            const cultivation = await Cultivation.getOrCreate(userId);
            cultivation.equippedEfficiencyTechnique = null;
            await saveWithRetry(cultivation);
            return res.json({ success: true, message: "Đã tháo công pháp" });
        }

        const technique = getTechniqueById(techniqueId);
        if (!technique) {
            return res.status(404).json({ success: false, message: "Công pháp không tồn tại" });
        }

        if (technique.type !== TECHNIQUE_TYPES.EFFICIENCY) {
            return res.status(400).json({
                success: false,
                message: "Chỉ có thể trang bị công pháp loại hiệu suất"
            });
        }

        const cultivation = await Cultivation.getOrCreate(userId);

        // Check đã học chưa
        const learned = (cultivation.learnedTechniques || [])
            .some(t => t.techniqueId === techniqueId);

        if (!learned) {
            return res.status(400).json({
                success: false,
                message: "Chưa lĩnh ngộ công pháp này"
            });
        }

        cultivation.equippedEfficiencyTechnique = techniqueId;
        await saveWithRetry(cultivation);

        // Invalidate cache
        invalidateCultivationCache(userId).catch(() => { });

        res.json({
            success: true,
            message: `Đã trang bị ${technique.name} `,
            data: {
                equipped: techniqueId,
                bonusPercent: technique.bonusPercent
            }
        });
    } catch (error) {
        next(error);
    }
};

// ============================================================
// POST /techniques/activate - Kích hoạt vận công (semi-auto)
// ANTI-EXPLOIT: Atomic quota + Redis lock + state machine
// ============================================================

export const activateTechnique = async (req, res, next) => {
    const userId = req.user.id;
    const redis = getClient();
    const lockKey = redisConfig.keyPrefix + `techLock:${userId}`;
    const lockValue = crypto.randomUUID();
    let lockAcquired = false;

    try {
        const { techniqueId } = req.body;

        if (!techniqueId) {
            return res.status(400).json({ success: false, message: "Thiếu techniqueId" });
        }

        const technique = getTechniqueById(techniqueId);
        if (!technique) {
            return res.status(404).json({ success: false, message: "Công pháp không tồn tại" });
        }

        if (technique.type !== TECHNIQUE_TYPES.SEMI_AUTO) {
            return res.status(400).json({
                success: false,
                message: "Công pháp này không phải loại vận công"
            });
        }

        // ==================== REDIS LOCK ====================
        // Acquire lock để ngăn race condition từ multi-tab/multi-device
        if (redis && isRedisConnected()) {
            const lockResult = await redis.set(lockKey, lockValue, 'PX', 5000, 'NX');
            if (lockResult !== 'OK') {
                return res.status(429).json({
                    success: false,
                    message: "Đang xử lý yêu cầu khác, vui lòng thử lại"
                });
            }
            lockAcquired = true;
        }

        // ==================== PRE-CHECK: Đã học chưa ====================
        // Quick check - sẽ được verify lại trong atomic update
        const cultivationCheck = await Cultivation.findOne({ user: userId })
            .select('learnedTechniques realmLevel')
            .lean();

        if (!cultivationCheck) {
            return res.status(404).json({ success: false, message: "Không tìm thấy thông tin tu luyện" });
        }

        const learned = (cultivationCheck.learnedTechniques || [])
            .some(t => t.techniqueId === techniqueId);

        if (!learned) {
            return res.status(400).json({
                success: false,
                message: "Chưa lĩnh ngộ công pháp này"
            });
        }

        // ==================== ATOMIC QUOTA + SESSION CREATE ====================
        const todayKey = getDayKeyInBangkok();
        const now = new Date();
        const durationSec = technique.durationSec;
        const sessionId = crypto.randomUUID();
        const endsAt = new Date(now.getTime() + durationSec * 1000);

        // Cooldown: lastTechniqueClaimTime stores the END of cooldown (claim time + 15s)
        // So we check: now >= lastTechniqueClaimTime (cooldown expired)
        const cooldownCutoff = now;

        // MongoDB Aggregation Pipeline Update:
        // 1. Check no active session
        // 2. Check cooldown expired
        // 3. Reset quota if dayKey changed
        // 4. Check quota remaining
        // 5. Reserve quota + create session
        const doc = await Cultivation.findOneAndUpdate(
            {
                user: userId,
                // No active session (null or has been claimed)
                $or: [
                    { activeTechniqueSession: null },
                    { 'activeTechniqueSession.sessionId': null },
                    { 'activeTechniqueSession.claimedAt': { $ne: null } }
                ]
            },
            [
                // Stage 1: Reset dayKey và quota nếu ngày mới
                {
                    $set: {
                        'dailyProgress.dayKey': todayKey,
                        'dailyProgress.meditationSeconds': {
                            $cond: [
                                { $eq: ['$dailyProgress.dayKey', todayKey] },
                                { $ifNull: ['$dailyProgress.meditationSeconds', 0] },
                                0 // Reset to 0 if different day
                            ]
                        }
                    }
                },
                // Stage 2: Check conditions and apply updates
                {
                    $set: {
                        // Compute if can activate
                        '_canActivate': {
                            $and: [
                                // Quota check: current + duration <= max
                                {
                                    $lte: [
                                        { $add: ['$dailyProgress.meditationSeconds', durationSec] },
                                        MAX_DAILY_MEDITATION_SECONDS
                                    ]
                                },
                                // Cooldown check
                                {
                                    $or: [
                                        { $eq: ['$lastTechniqueClaimTime', null] },
                                        { $lte: ['$lastTechniqueClaimTime', cooldownCutoff] }
                                    ]
                                }
                            ]
                        }
                    }
                },
                // Stage 3: Conditionally create session and reserve quota
                {
                    $set: {
                        activeTechniqueSession: {
                            $cond: [
                                '$_canActivate',
                                {
                                    sessionId: sessionId,
                                    techniqueId: techniqueId,
                                    startedAt: now,
                                    endsAt: endsAt,
                                    durationSec: durationSec,
                                    realmAtStart: '$realmLevel',
                                    claimedAt: null
                                },
                                '$activeTechniqueSession' // Keep existing if can't activate
                            ]
                        },
                        'dailyProgress.meditationSeconds': {
                            $cond: [
                                '$_canActivate',
                                { $add: ['$dailyProgress.meditationSeconds', durationSec] },
                                '$dailyProgress.meditationSeconds'
                            ]
                        }
                    }
                },
                // Stage 4: Clean up temp field
                {
                    $unset: '_canActivate'
                }
            ],
            { new: true }
        );

        // Check if update succeeded
        if (!doc || doc.activeTechniqueSession?.sessionId !== sessionId) {
            // Activation failed - determine reason
            const current = await Cultivation.findOne({ user: userId })
                .select('dailyProgress lastTechniqueClaimTime activeTechniqueSession')
                .lean();

            // Check if has active session
            if (current?.activeTechniqueSession?.sessionId &&
                !current.activeTechniqueSession.claimedAt) {
                const sessionEndsAt = new Date(current.activeTechniqueSession.endsAt).getTime();
                const timeRemaining = Math.max(0, Math.ceil((sessionEndsAt - Date.now()) / 1000));
                return res.status(400).json({
                    success: false,
                    message: "Đang trong trạng thái vận công",
                    activeSession: current.activeTechniqueSession,
                    timeRemaining
                });
            }

            // Check cooldown
            if (current?.lastTechniqueClaimTime &&
                new Date(current.lastTechniqueClaimTime) > now) {
                const waitMs = new Date(current.lastTechniqueClaimTime).getTime() - now.getTime();
                const waitSec = Math.ceil(waitMs / 1000);
                return res.status(429).json({
                    success: false,
                    message: `Chưa hết cooldown, chờ ${waitSec}s để vận công tiếp`,
                    cooldownRemaining: waitSec
                });
            }

            // Check quota
            const usedSeconds = current?.dailyProgress?.meditationSeconds || 0;
            const remainingSeconds = MAX_DAILY_MEDITATION_SECONDS - usedSeconds;
            if (remainingSeconds < durationSec) {
                return res.status(429).json({
                    success: false,
                    message: `Đã nhập định ${Math.floor(usedSeconds / 60)} phút hôm nay. Còn ${Math.floor(remainingSeconds / 60)} phút khả dụng.`,
                    dailyQuota: {
                        maxSeconds: MAX_DAILY_MEDITATION_SECONDS,
                        usedSeconds,
                        remainingSeconds
                    }
                });
            }

            // Unknown error
            return res.status(500).json({
                success: false,
                message: "Không thể kích hoạt vận công, vui lòng thử lại"
            });
        }

        // ==================== SUCCESS ====================
        // Invalidate cache
        invalidateCultivationCache(userId).catch(() => { });

        // Estimate EXP
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
        const range = expRanges[doc.realmLevel] || expRanges[14];
        const avgClickExp = Math.floor((range.min + range.max) / 2);
        const estimatedExp = Math.floor(durationSec * avgClickExp * technique.techniqueMultiplier);

        // Get remaining quota for response
        const usedSeconds = doc.dailyProgress?.meditationSeconds || 0;
        const remainingSeconds = MAX_DAILY_MEDITATION_SECONDS - usedSeconds;

        // ==================== INVALIDATE TECHNIQUES CACHE ====================
        // Khi activate thành công, xóa cache để lần load tiếp theo sẽ có activeSession
        if (redis && isRedisConnected()) {
            const cacheKey = `${redisConfig.keyPrefix} techniques:${userId} `;
            redis.del(cacheKey).catch(() => { });
        }

        res.json({
            success: true,
            message: `Bắt đầu ${technique.name}`,
            data: {
                sessionId,
                techniqueId,
                techniqueName: technique.name,
                durationSec,
                startedAt: now,
                endsAt,
                estimatedExp,
                dailyQuota: {
                    maxSeconds: MAX_DAILY_MEDITATION_SECONDS,
                    usedSeconds,
                    remainingSeconds
                }
            }
        });
    } catch (error) {
        next(error);
    } finally {
        // ==================== RELEASE REDIS LOCK ====================
        if (lockAcquired && redis && isRedisConnected()) {
            try {
                await redis.eval(LUA_RELEASE_LOCK, 1, lockKey, lockValue);
            } catch (err) {
                console.error('[TechniqueController] Failed to release lock:', err.message);
            }
        }
    }
};

// ============================================================
// POST /techniques/claim - Thu thập EXP vận công
// ANTI-EXPLOIT: Redis lock + min time + EXP cap + atomic gate
// ============================================================

export const claimTechnique = async (req, res, next) => {
    const userId = req.user.id;
    const redis = getClient();
    const lockKey = redisConfig.keyPrefix + `techLock:${userId}`;
    const lockValue = crypto.randomUUID();
    let lockAcquired = false;

    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({ success: false, message: "Thiếu sessionId" });
        }

        // ==================== REDIS LOCK ====================
        if (redis && isRedisConnected()) {
            const lockResult = await redis.set(lockKey, lockValue, 'PX', 5000, 'NX');
            if (lockResult !== 'OK') {
                return res.status(429).json({
                    success: false,
                    message: "Đang xử lý yêu cầu khác, vui lòng thử lại"
                });
            }
            lockAcquired = true;
        }

        // ==================== CHECK SESSION + MIN TIME ====================
        const cultivation = await Cultivation.findOne({ user: userId })
            .select('activeTechniqueSession lastTechniqueClaim realmLevel activeBoosts equipped')
            .lean();

        if (!cultivation) {
            return res.status(404).json({ success: false, message: "Không tìm thấy thông tin tu luyện" });
        }

        const session = cultivation.activeTechniqueSession;

        // Check idempotent first (cached result)
        if (!session?.sessionId || session.sessionId !== sessionId) {
            const cached = cultivation.lastTechniqueClaim;
            if (cached?.sessionId === sessionId) {
                return res.json({
                    success: true,
                    alreadyClaimed: true,
                    data: {
                        allowedExp: cached.allowedExp,
                        requestedExp: cached.requestedExp,
                        elapsedSec: cached.elapsedSec,
                        claimedAt: cached.claimedAt
                    }
                });
            }
            return res.status(400).json({
                success: false,
                message: "Không có phiên vận công nào đang hoạt động hoặc sessionId không hợp lệ"
            });
        }

        // Check already claimed
        if (session.claimedAt) {
            const cached = cultivation.lastTechniqueClaim;
            if (cached?.sessionId === sessionId) {
                return res.json({
                    success: true,
                    alreadyClaimed: true,
                    data: {
                        allowedExp: cached.allowedExp,
                        requestedExp: cached.requestedExp,
                        elapsedSec: cached.elapsedSec,
                        claimedAt: cached.claimedAt
                    }
                });
            }
            return res.json({ success: true, alreadyClaimed: true });
        }

        // ==================== MIN TIME CHECK (50% duration) ====================
        const technique = getTechniqueById(session.techniqueId);
        if (!technique) {
            return res.status(400).json({ success: false, message: "Công pháp không hợp lệ" });
        }

        const now = Date.now();
        const startedAt = new Date(session.startedAt).getTime();
        const durationSec = session.durationSec || technique.durationSec;
        const minSecRequired = Math.floor(durationSec * MIN_SESSION_PERCENT);
        const elapsedSec = Math.floor((now - startedAt) / 1000);

        if (elapsedSec < minSecRequired) {
            const waitSec = minSecRequired - elapsedSec;
            return res.status(400).json({
                success: false,
                message: `Cần tối thiểu ${minSecRequired}s nhập định. Còn ${waitSec}s nữa.`,
                minRequired: minSecRequired,
                elapsed: elapsedSec,
                remaining: waitSec
            });
        }

        // Cap elapsed to duration
        const effectiveElapsedSec = Math.min(elapsedSec, durationSec);

        // ==================== CALCULATE EXP ====================
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
        const realmAtStart = session.realmAtStart || cultivation.realmLevel;
        const range = expRanges[realmAtStart] || expRanges[14];
        const avgClickExp = Math.floor((range.min + range.max) / 2);
        const baseExp = effectiveElapsedSec * avgClickExp;

        // Apply technique multiplier
        let multipliedExp = Math.floor(baseExp * technique.techniqueMultiplier);

        // Apply boosts (với trần cho technique để không phá balance)
        // Đan dược 5x vẫn full hiệu quả ở dungeon/YinYang, nhưng nhập định chỉ được 1.5x max
        const TECHNIQUE_MAX_BOOST_MULTIPLIER = 1.5;
        const activeBoosts = (cultivation.activeBoosts || []).filter(b => new Date(b.expiresAt) > new Date());
        let boostMultiplier = 1;
        for (const boost of activeBoosts) {
            if (boost.type === 'exp' || boost.type === 'exp_boost') {
                boostMultiplier = Math.max(boostMultiplier, boost.multiplier);
            }
        }
        // Cap multiplier cho technique claims
        const originalBoost = boostMultiplier;
        boostMultiplier = Math.min(boostMultiplier, TECHNIQUE_MAX_BOOST_MULTIPLIER);
        multipliedExp = Math.floor(multipliedExp * boostMultiplier);

        console.log(`[ClaimTechnique] userId=${userId}, technique=${technique.name}, elapsed=${effectiveElapsedSec}s, baseExp=${baseExp}, multipliedExp=${multipliedExp}`);

        // ==================== NO EXP CAP FOR TECHNIQUE CLAIMS ====================
        // Technique đã có các lớp anti-exploit:
        // 1. Quota 30 phút/ngày (giới hạn tổng reward/ngày)
        // 2. Min 50% duration mới được claim (không claim sớm)
        // 3. Cooldown 15s + Redis lock + Mongo atomic (chặn spam, race)
        // 4. Time-gated (30/60s) - auto click không giúp nhanh hơn
        // => EXP cap 5 phút trở thành thừa và chỉ làm UX xấu ở realm cao
        const allowedExp = multipliedExp;

        console.log(`[ClaimTechnique] technique claim (no cap applied), allowedExp=${allowedExp}`);

        // ==================== ATOMIC CLAIM (Phase A: mark claimed) ====================
        const claimTime = new Date();
        // Cooldown từ actual claim time (NOW + 15s), không phải session end
        const cooldownEndTime = new Date(claimTime.getTime() + TECHNIQUE_SESSION_COOLDOWN_MS);

        const updateResult = await Cultivation.findOneAndUpdate(
            {
                user: userId,
                'activeTechniqueSession.sessionId': sessionId,
                'activeTechniqueSession.claimedAt': null
            },
            {
                $set: {
                    lastTechniqueClaim: {
                        sessionId,
                        techniqueId: session.techniqueId,
                        allowedExp,
                        requestedExp: multipliedExp,
                        durationSec,
                        elapsedSec: effectiveElapsedSec,
                        claimedAt: claimTime
                    },
                    lastTechniqueClaimTime: cooldownEndTime
                },
                $unset: {
                    activeTechniqueSession: ''
                },
                $inc: {
                    exp: allowedExp,
                    dataVersion: 1
                },
                $push: {
                    expLog: {
                        $each: [{
                            amount: allowedExp,
                            source: 'technique_claim',
                            description: `${technique.name} (${effectiveElapsedSec}s)`,
                            createdAt: claimTime
                        }],
                        $slice: -100
                    }
                }
            },
            { new: true }
        );

        if (!updateResult) {
            // Idempotent check
            const latest = await Cultivation.findOne({ user: userId })
                .select('lastTechniqueClaim')
                .lean();

            if (latest?.lastTechniqueClaim?.sessionId === sessionId) {
                return res.json({
                    success: true,
                    alreadyClaimed: true,
                    data: {
                        allowedExp: latest.lastTechniqueClaim.allowedExp,
                        requestedExp: latest.lastTechniqueClaim.requestedExp,
                        elapsedSec: latest.lastTechniqueClaim.elapsedSec,
                        claimedAt: latest.lastTechniqueClaim.claimedAt
                    }
                });
            }

            return res.status(409).json({
                success: false,
                message: 'Session already claimed or invalid'
            });
        }

        // ==================== SUCCESS ====================
        // Invalidate cache
        invalidateCultivationCache(userId).catch(() => { });

        // ==================== INVALIDATE TECHNIQUES CACHE ====================
        // Sau claim, xóa cache để lần load tiếp theo sẽ không có activeSession nữa
        if (redis && isRedisConnected()) {
            const techCacheKey = `${redisConfig.keyPrefix} techniques:${userId} `;
            redis.del(techCacheKey).catch(() => { });
        }

        // Check if client requested patch mode
        const isPatchMode = req.query.mode === 'patch';

        if (isPatchMode) {
            return res.json({
                success: true,
                mode: 'patch',
                dataVersion: updateResult.dataVersion,
                message: allowedExp > 0 ? `+${allowedExp} Tu Vi` : "Không nhận được tu vi (đã hết cap)",
                data: {
                    allowedExp,
                    requestedExp: multipliedExp,
                    elapsedSec: effectiveElapsedSec,
                    capApplied: allowedExp < multipliedExp
                },
                patch: formatLightweightCultivationPatch(updateResult)
            });
        }

        // Full response
        res.json({
            success: true,
            message: allowedExp > 0 ? `+${allowedExp} Tu Vi` : "Không nhận được tu vi (đã hết cap)",
            data: {
                allowedExp,
                requestedExp: multipliedExp,
                elapsedSec: effectiveElapsedSec,
                capApplied: allowedExp < multipliedExp,
                cultivation: await formatCultivationResponse(updateResult)
            }
        });
    } catch (error) {
        next(error);
    } finally {
        // ==================== RELEASE REDIS LOCK ====================
        if (lockAcquired && redis && isRedisConnected()) {
            try {
                await redis.eval(LUA_RELEASE_LOCK, 1, lockKey, lockValue);
            } catch (err) {
                console.error('[TechniqueController] Failed to release claim lock:', err.message);
            }
        }
    }
};

// ============================================================
// Helper function to Vietnamese-ize stat names
// ============================================================
const vietnamizeStats = (text) => {
    if (!text) return text;

    const statMap = {
        'ATK': 'Tấn Công',
        'DEF': 'Phòng Thủ',
        'HP': 'Sinh Mệnh',
        'Speed': 'Tốc Độ',
        'Crit Rate': 'Tỷ Lệ Chí Mạng',
        'Crit Dmg': 'Sát Thương Chí Mạng',
        'Penetration': 'Xuyên Thấu',
        'Lifesteal': 'Hồi Máu',
        'Resist': 'Kháng Tính',
        'ZhenYuan': 'Chân Nguyên',
        'qiBlood': 'Khí Huyết',
        'Regen': 'Hồi Phục',
        'Dodge': 'Né Tránh',
        'heal': 'Hồi Máu',
        'AOE': 'Diện Tích',
        'Stun': 'Choáng Váng',
        'Evade': 'Né Tránh',
        'Berserk': 'Cuồng Nộ',
        'DOT': 'Sát Thương Suốt Thời Gian',
        'burst': 'Nổ Tung',
        'poison': 'Độc'
    };

    let result = text;
    Object.entries(statMap).forEach(([eng, vn]) => {
        const regex = new RegExp(`\\b${eng}\\b`, 'gi');
        result = result.replace(regex, vn);
    });

    return result;
};

// ============================================================
// GET /techniques/combat-slots - Lấy thông tin slots
// ============================================================

export const getCombatSlots = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const cultivation = await Cultivation.getOrCreate(userId);

        const maxSlots = cultivation.getMaxCombatSlots();
        const equippedSlots = cultivation.equippedCombatTechniques || [];

        // Get available techniques (learned + có skill) - deduplicate by techniqueId
        // Search in both TECHNIQUES_MAP (shopItems) and CULTIVATION_TECHNIQUES
        const techniqueMap = new Map();
        (cultivation.learnedTechniques || []).forEach(learned => {
            // Try both sources: shopItems first, then cultivationTechniques
            let technique = TECHNIQUES_MAP.get(learned.techniqueId);
            if (!technique) {
                technique = getTechniqueById(learned.techniqueId);
            }

            // Include techniques that have skill OR are combat techniques
            if (technique && (technique.skill || technique.type === 'combat') && !techniqueMap.has(learned.techniqueId)) {
                // Map tier to rarity for combat techniques
                let displayRarity = technique.rarity;
                if (technique.type === 'combat' && !displayRarity) {
                    const tier = technique.tier || 0;
                    if (tier >= 9) displayRarity = 'legendary';
                    else if (tier >= 7) displayRarity = 'epic';
                    else if (tier >= 5) displayRarity = 'rare';
                    else if (tier >= 3) displayRarity = 'uncommon';
                    else displayRarity = 'common';
                }

                // Only add the first instance to avoid duplicates
                techniqueMap.set(learned.techniqueId, {
                    techniqueId: learned.techniqueId,
                    name: technique.name,
                    level: learned.level,
                    type: technique.type,
                    rarity: displayRarity,
                    description: vietnamizeStats(technique.description),
                    skillName: technique.skill?.name || technique.name,
                    skillDescription: vietnamizeStats(technique.skill?.description || technique.description)
                });
            }
        });

        const availableTechniques = Array.from(techniqueMap.values());

        res.json({
            success: true,
            data: {
                maxSlots,
                currentRealmLevel: cultivation.realmLevel,
                equippedSlots,
                availableTechniques
            }
        });
    } catch (error) {
        next(error);
    }
};

// ============================================================
// POST /techniques/equip-combat-slot - Trang bị công pháp vào slot
// ============================================================

export const equipCombatSlot = async (req, res, next) => {
    try {
        const userId = req.user.id;
        let { slotIndex, techniqueId } = req.body;

        // Validate input - Convert to number to handle string "0" case
        slotIndex = parseInt(slotIndex, 10);
        if (isNaN(slotIndex) || slotIndex === undefined || !techniqueId) {
            return res.status(400).json({
                success: false,
                message: "Thiếu slotIndex hoặc techniqueId"
            });
        }

        if (slotIndex < 0 || slotIndex > 4) {
            return res.status(400).json({
                success: false,
                message: "Slot index phải từ 0-4"
            });
        }

        const cultivation = await Cultivation.getOrCreate(userId);
        const maxSlots = cultivation.getMaxCombatSlots();

        // Check if slot is unlocked
        if (slotIndex >= maxSlots) {
            const requiredRealm = slotIndex <= 1 ? 1 : slotIndex <= 2 ? 3 : slotIndex <= 3 ? 5 : 7;
            const realmName = CULTIVATION_REALMS.find(r => r.level === requiredRealm)?.name;
            return res.status(400).json({
                success: false,
                message: `Slot ${slotIndex + 1} chưa mở khóa.Cần đạt ${realmName} `
            });
        }

        // Check if technique is learned
        const learned = cultivation.learnedTechniques?.find(t => t.techniqueId === techniqueId);
        if (!learned) {
            return res.status(400).json({
                success: false,
                message: "Chưa lĩnh ngộ công pháp này"
            });
        }

        // Check if technique has skill - search in both sources
        let technique = TECHNIQUES_MAP.get(techniqueId);
        if (!technique) {
            technique = getTechniqueById(techniqueId);
        }
        if (!technique || !technique.skill) {
            return res.status(400).json({
                success: false,
                message: "Công pháp này không có kỹ năng chiến đấu"
            });
        }

        // Initialize array if not exists
        if (!cultivation.equippedCombatTechniques) {
            cultivation.equippedCombatTechniques = [];
        }

        // Check if slot already has a technique
        const existingSlotIndex = cultivation.equippedCombatTechniques.findIndex(s => s.slotIndex === slotIndex);
        if (existingSlotIndex >= 0) {
            // Replace existing
            cultivation.equippedCombatTechniques[existingSlotIndex].techniqueId = techniqueId;
        } else {
            // Add new
            cultivation.equippedCombatTechniques.push({
                slotIndex,
                techniqueId
            });
        }

        await saveWithRetry(cultivation);

        // Invalidate cache
        invalidateCultivationCache(userId).catch(() => { });

        res.json({
            success: true,
            message: `Đã trang bị ${technique.name} vào Slot ${slotIndex + 1} `,
            data: {
                slotIndex,
                techniqueId,
                techniqueName: technique.name
            }
        });
    } catch (error) {
        next(error);
    }
};

// ============================================================
// POST /techniques/unequip-combat-slot - Tháo công pháp khỏi slot
// ============================================================

export const unequipCombatSlot = async (req, res, next) => {
    try {
        const userId = req.user.id;
        let { slotIndex } = req.body;

        // Validate input - Convert to number to handle string "0" case
        slotIndex = parseInt(slotIndex, 10);
        if (isNaN(slotIndex) || slotIndex === undefined) {
            return res.status(400).json({
                success: false,
                message: "Thiếu slotIndex"
            });
        }

        const cultivation = await Cultivation.getOrCreate(userId);

        if (!cultivation.equippedCombatTechniques || cultivation.equippedCombatTechniques.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Chưa có công pháp nào được trang bị"
            });
        }

        // Find and remove
        const slotIdx = cultivation.equippedCombatTechniques.findIndex(s => s.slotIndex === slotIndex);
        if (slotIdx < 0) {
            return res.status(400).json({
                success: false,
                message: `Slot ${slotIndex + 1} đang trống`
            });
        }

        cultivation.equippedCombatTechniques.splice(slotIdx, 1);
        await saveWithRetry(cultivation);

        // Invalidate cache
        invalidateCultivationCache(userId).catch(() => { });

        res.json({
            success: true,
            message: `Đã tháo công pháp khỏi Slot ${slotIndex + 1} `
        });
    } catch (error) {
        next(error);
    }
};

export default {
    listTechniques,
    learnTechnique,
    equipTechnique,
    activateTechnique,
    claimTechnique,
    getCombatSlots,
    equipCombatSlot,
    unequipCombatSlot
};
