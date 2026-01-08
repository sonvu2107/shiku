/**
 * Technique Controller - Quản lý công pháp tu luyện
 * APIs: list, learn, equip, activate (semi-auto), claim
 */

import Cultivation, { CULTIVATION_REALMS } from "../../models/Cultivation.js";
import { formatCultivationResponse, invalidateCultivationCache } from "./coreController.js";
import {
    consumeExpCap,
    getCapByRealm,
    getPassiveExpPerMin,
    getExpCapRemaining
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
        let activeSession = null;
        if (cultivation.activeTechniqueSession?.sessionId) {
            const session = cultivation.activeTechniqueSession;
            const now = Date.now();
            const endsAt = new Date(session.endsAt).getTime();

            if (!session.claimedAt && now < endsAt + 60000) { // +60s grace period
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
// ============================================================

export const activateTechnique = async (req, res, next) => {
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

        if (technique.type !== TECHNIQUE_TYPES.SEMI_AUTO) {
            return res.status(400).json({
                success: false,
                message: "Công pháp này không phải loại vận công"
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

        // ==================== COOLDOWN CHECK (15s between sessions) ====================
        const TECHNIQUE_SESSION_COOLDOWN_MS = 15000; // 15 seconds
        const lastClaimTime = cultivation.lastTechniqueClaimTime ? new Date(cultivation.lastTechniqueClaimTime).getTime() : 0;
        const now = Date.now();
        const timeSinceLastClaim = now - lastClaimTime;

        if (timeSinceLastClaim < TECHNIQUE_SESSION_COOLDOWN_MS) {
            const waitMs = TECHNIQUE_SESSION_COOLDOWN_MS - timeSinceLastClaim;
            const waitSec = Math.ceil(waitMs / 1000);
            return res.status(429).json({
                success: false,
                message: `Chưa hết cooldown, chờ ${waitSec}s để vận công tiếp`,
                cooldownRemaining: waitSec
            });
        }

        // Check không có session đang active
        const existingSession = cultivation.activeTechniqueSession;
        if (existingSession?.sessionId && !existingSession.claimedAt) {
            const endsAt = new Date(existingSession.endsAt).getTime();
            if (now < endsAt + 60000) {
                return res.status(400).json({
                    success: false,
                    message: "Đang trong trạng thái vận công, vui lòng thu thập trước",
                    activeSession: existingSession
                });
            }
        }

        // Check cap còn không (UX: chặn sớm nếu cap = 0)
        const capLimit = getCapByRealm(cultivation.realmLevel);
        const capRemaining = await getExpCapRemaining(userId, capLimit);
        if (capRemaining <= 0) {
            return res.status(429).json({
                success: false,
                message: "Linh khí đã cạn, vui lòng chờ hết chu kỳ 5 phút",
                capRemaining: 0
            });
        }

        // Tạo session mới
        const sessionStart = new Date();
        const sessionId = crypto.randomUUID();
        const endsAt = new Date(sessionStart.getTime() + technique.durationSec * 1000);

        cultivation.activeTechniqueSession = {
            sessionId,
            techniqueId,
            startedAt: sessionStart,
            endsAt,
            realmAtStart: cultivation.realmLevel,
            claimedAt: null
        };

        await saveWithRetry(cultivation);

        // Estimate EXP: 1 giây = 1 click (dùng trung bình click EXP của cảnh giới)
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
        const range = expRanges[cultivation.realmLevel] || expRanges[14];
        const avgClickExp = Math.floor((range.min + range.max) / 2);
        const estimatedExp = Math.floor(
            technique.durationSec * avgClickExp * technique.techniqueMultiplier
        );

        res.json({
            success: true,
            message: `Bắt đầu ${technique.name} `,
            data: {
                sessionId,
                techniqueId,
                techniqueName: technique.name,
                durationSec: technique.durationSec,
                startedAt: sessionStart,
                endsAt,
                estimatedExp,
                capRemaining
            }
        });
    } catch (error) {
        next(error);
    }
};

// ============================================================
// POST /techniques/claim - Thu thập EXP vận công
// ============================================================

export const claimTechnique = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({ success: false, message: "Thiếu sessionId" });
        }

        const cultivation = await Cultivation.getOrCreate(userId);
        const session = cultivation.activeTechniqueSession;

        // Validate session
        if (!session?.sessionId) {
            return res.status(400).json({
                success: false,
                message: "Không có phiên vận công nào đang hoạt động"
            });
        }

        if (session.sessionId !== sessionId) {
            return res.status(400).json({
                success: false,
                message: "SessionId không hợp lệ"
            });
        }

        // Check idempotent (đã claim rồi)
        if (session.claimedAt) {
            // Return cached result
            const cached = cultivation.lastTechniqueClaim;
            if (cached?.sessionId === sessionId) {
                return res.json({
                    success: true,
                    alreadyClaimed: true,
                    data: {
                        allowedExp: cached.allowedExp,
                        requestedExp: cached.requestedExp,
                        claimedAt: cached.claimedAt
                    }
                });
            }
            return res.json({ success: true, alreadyClaimed: true });
        }

        const technique = getTechniqueById(session.techniqueId);
        if (!technique) {
            return res.status(400).json({ success: false, message: "Công pháp không hợp lệ" });
        }

        // Tính EXP (continuous, floor elapsedSec): 1 giây = 1 click
        const now = Date.now();
        const startedAt = new Date(session.startedAt).getTime();
        const endsAt = new Date(session.endsAt).getTime();
        const elapsedSec = Math.max(0, Math.min(
            technique.durationSec,
            Math.floor((now - startedAt) / 1000)
        ));

        // Dùng click EXP trung bình theo cảnh giới
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
        const range = expRanges[session.realmAtStart] || expRanges[14];
        const avgClickExp = Math.floor((range.min + range.max) / 2);
        const baseExp = elapsedSec * avgClickExp;

        // Apply multipliers
        let multipliedExp = Math.floor(baseExp * technique.techniqueMultiplier);

        // Get active boosts
        const activeBoosts = (cultivation.activeBoosts || []).filter(b => b.expiresAt > new Date());
        let boostMultiplier = 1;
        for (const boost of activeBoosts) {
            if (boost.type === 'exp' || boost.type === 'exp_boost') {
                boostMultiplier = Math.max(boostMultiplier, boost.multiplier);
            }
        }

        // Pet bonus
        const petBonuses = cultivation.getPetBonuses?.() || { expBonus: 0 };
        const petMultiplier = petBonuses.expBonus > 0 ? 1 + petBonuses.expBonus : 1;

        multipliedExp = Math.floor(multipliedExp * boostMultiplier * petMultiplier);

        // ==================== NO CAP FOR TECHNIQUE CLAIMS ====================
        // Semi-auto techniques require time investment (30-60s meditation)
        // Unlike spam clicking, this is a deliberate action with cooldown
        // Therefore, we don't apply yinyang exp cap here
        const allowedExp = multipliedExp;

        // Add EXP (full amount, no cap)
        cultivation.exp += allowedExp;

        // Log exp
        if (!cultivation.expLog) cultivation.expLog = [];
        cultivation.expLog.push({
            amount: allowedExp,
            source: 'technique_claim',
            description: `${technique.name} (${elapsedSec}s)`,
            createdAt: new Date()
        });
        if (cultivation.expLog.length > 100) cultivation.expLog = cultivation.expLog.slice(-100);

        // Mark session claimed + save result
        session.claimedAt = new Date();
        cultivation.lastTechniqueClaim = {
            sessionId,
            techniqueId: session.techniqueId,
            allowedExp,
            requestedExp: multipliedExp,
            claimedAt: session.claimedAt
        };

        // Clear active session + set cooldown timestamp
        cultivation.activeTechniqueSession = null;
        cultivation.lastTechniqueClaimTime = new Date();

        // Update technique lastPracticedAt
        const learnedTechnique = (cultivation.learnedTechniques || [])
            .find(t => t.techniqueId === session.techniqueId);
        if (learnedTechnique) {
            learnedTechnique.lastPracticedAt = new Date();
        }

        await saveWithRetry(cultivation);

        // Invalidate cache
        invalidateCultivationCache(userId).catch(() => { });

        res.json({
            success: true,
            message: allowedExp > 0 ? `+ ${allowedExp} Tu Vi` : "Không nhận được tu vi",
            data: {
                allowedExp,
                requestedExp: multipliedExp,
                elapsedSec,
                cultivation: await formatCultivationResponse(cultivation)
            }
        });
    } catch (error) {
        next(error);
    }
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

        // Get available techniques (learned + có skill)
        const availableTechniques = (cultivation.learnedTechniques || [])
            .map(learned => {
                const technique = TECHNIQUES_MAP.get(learned.techniqueId);
                if (technique && technique.skill) {
                    return {
                        techniqueId: learned.techniqueId,
                        name: technique.name,
                        level: learned.level,
                        rarity: technique.rarity,
                        description: technique.description,
                        skillName: technique.skill.name,
                        skillDescription: technique.skill.description
                    };
                }
                return null;
            })
            .filter(Boolean);

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
        const { slotIndex, techniqueId } = req.body;

        // Validate input
        if (slotIndex === undefined || !techniqueId) {
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

        // Check if technique has skill
        const technique = TECHNIQUES_MAP.get(techniqueId);
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
        const { slotIndex } = req.body;

        if (slotIndex === undefined) {
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
