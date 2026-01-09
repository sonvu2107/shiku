import mongoose from "mongoose";
import Cultivation, { CULTIVATION_REALMS, QUEST_TEMPLATES } from "../../models/Cultivation.js";
import Equipment from "../../models/Equipment.js";
import User from "../../models/User.js";
import { getClient, isRedisConnected, redisConfig } from "../../services/redisClient.js";
import { saveWithRetry } from "../../utils/dbUtils.js";
import { SECT_TECHNIQUES_MAP } from "../../data/sectTechniques.js";

// ==================== CACHE CONFIG ====================
const CULTIVATION_CACHE_TTL = 5; // 5 seconds - short TTL for frequently changing data

/**
 * Merge equipment stats vào combat stats
 */
export const mergeEquipmentStatsIntoCombatStats = (combatStats, equipmentStats) => {
    if (!equipmentStats) return combatStats;

    combatStats.attack = (combatStats.attack || 0) + (equipmentStats.attack || 0);
    combatStats.defense = (combatStats.defense || 0) + (equipmentStats.defense || 0);
    combatStats.qiBlood = (combatStats.qiBlood || 0) + (equipmentStats.hp || 0);
    combatStats.speed = (combatStats.speed || 0) + (equipmentStats.speed || 0);
    combatStats.criticalRate = (combatStats.criticalRate || 0) + ((equipmentStats.crit_rate || 0) * 100);
    combatStats.criticalDamage = (combatStats.criticalDamage || 0) + ((equipmentStats.crit_damage || 0) * 100);
    combatStats.accuracy = (combatStats.accuracy || 0) + ((equipmentStats.hit_rate || 0) * 100);
    combatStats.dodge = (combatStats.dodge || 0) + ((equipmentStats.evasion || 0) * 100);
    combatStats.penetration = (combatStats.penetration || 0) + (equipmentStats.penetration || 0);
    combatStats.lifesteal = (combatStats.lifesteal || 0) + ((equipmentStats.lifesteal || 0) * 100);
    combatStats.regeneration = (combatStats.regeneration || 0) + (equipmentStats.energy_regen || 0);
    combatStats.zhenYuan = (combatStats.zhenYuan || 0) + (equipmentStats.zhenYuan || equipmentStats.mp || 0);

    return combatStats;
};

/**
 * Format lightweight cultivation patch for high-frequency requests (addExp)
 * PURE COMPUTE ONLY - NO DATABASE QUERIES
 */
export const formatLightweightCultivationPatch = (cultivation) => {
    const currentRealm = CULTIVATION_REALMS.find(r => r.level === cultivation.realmLevel) || CULTIVATION_REALMS[0];
    const nextRealm = CULTIVATION_REALMS.find(r => r.level === currentRealm.level + 1);
    const expToNext = nextRealm ? Math.max(0, nextRealm.minExp - cultivation.exp) : 0;

    // Calculate progress between current and next realm
    const progress = nextRealm
        ? Math.min(((cultivation.exp - currentRealm.minExp) / (nextRealm.minExp - currentRealm.minExp)) * 100, 100)
        : 100;

    // Filter active boosts (server-side Date.now())
    const now = new Date();
    const activeBoosts = (cultivation.activeBoosts || [])
        .filter(b => b.expiresAt && new Date(b.expiresAt) > now)
        .map(b => ({
            multiplier: b.multiplier,
            expiresAt: b.expiresAt
        }));

    const patch = {
        exp: cultivation.exp,
        spiritStones: cultivation.spiritStones,
        totalSpiritStonesEarned: cultivation.totalSpiritStonesEarned,
        realmLevel: cultivation.realmLevel,
        subLevel: cultivation.subLevel,
        // Realm info (calculated in-memory)
        realm: {
            level: currentRealm.level,
            name: currentRealm.name,
            description: currentRealm.description,
            color: currentRealm.color,
            icon: currentRealm.icon
        },
        expToNextRealm: expToNext,
        progress,
        canBreakthrough: nextRealm && cultivation.exp >= nextRealm.minExp,
        breakthroughFailureCount: cultivation.breakthroughFailureCount || 0,
        breakthroughCooldownUntil: cultivation.breakthroughCooldownUntil,
        activeBoosts
    };

    // Development assertion: ensure no heavy fields leaked into patch
    if (process.env.NODE_ENV !== 'production') {
        const forbiddenKeys = ['inventory', 'equipment', 'equipped', 'learnedTechniques', 'combatStats', 'equipmentStats'];
        for (const key of forbiddenKeys) {
            if (key in patch) {
                console.error(`[PATCH SAFETY] Heavy field "${key}" found in patch response!`);
                throw new Error(`Patch response must not include heavy field: ${key}`);
            }
        }
    }

    return patch;
};

/**
 * Format cultivation data cho response
 */
export const formatCultivationResponse = async (cultivation) => {
    const currentRealm = CULTIVATION_REALMS.find(r => r.level === cultivation.realmLevel) || CULTIVATION_REALMS[0];
    const potentialRealm = cultivation.getRealmFromExp();
    const progress = cultivation.getRealmProgress();

    const nextRealm = CULTIVATION_REALMS.find(r => r.level === currentRealm.level + 1);
    const expToNext = nextRealm ? Math.max(0, nextRealm.minExp - cultivation.exp) : 0;

    // Load equipment data for inventory items
    const equipmentIds = cultivation.inventory
        .filter(item => item.type?.startsWith('equipment_') && item.itemId)
        .map(item => {
            try {
                return mongoose.Types.ObjectId.isValid(item.itemId) ? new mongoose.Types.ObjectId(item.itemId) : null;
            } catch {
                return null;
            }
        })
        .filter(id => id !== null);

    let equipmentMap = new Map();
    if (equipmentIds.length > 0) {
        try {
            const equipments = await Equipment.find({ _id: { $in: equipmentIds } }).lean();
            equipments.forEach(eq => {
                let elementalDamage = {};
                if (eq.stats?.elemental_damage) {
                    if (eq.stats.elemental_damage instanceof Map) {
                        elementalDamage = Object.fromEntries(eq.stats.elemental_damage);
                    } else {
                        elementalDamage = eq.stats.elemental_damage;
                    }
                }

                equipmentMap.set(eq._id.toString(), {
                    _id: eq._id,
                    name: eq.name,
                    type: eq.type,
                    subtype: eq.subtype,
                    rarity: eq.rarity,
                    level_required: eq.level_required,
                    img: eq.img,
                    description: eq.description,
                    stats: { ...eq.stats, elemental_damage: elementalDamage },
                    special_effect: eq.special_effect,
                    skill_bonus: eq.skill_bonus,
                    energy_regen: eq.energy_regen,
                    lifesteal: eq.lifesteal,
                    true_damage: eq.true_damage,
                    buff_duration: eq.buff_duration,
                    durability: eq.durability
                });
            });
        } catch (err) {
            console.error("[CULTIVATION] Error loading equipment for inventory:", err);
        }
    }

    const updatedInventory = cultivation.inventory.map(item => {
        if (item.type?.startsWith('equipment_') && item.itemId) {
            const equipmentIdStr = item.itemId.toString();
            const equipment = equipmentMap.get(equipmentIdStr);

            if (equipment) {
                // Ưu tiên durability từ inventory của user, fallback về Equipment collection
                const userDurability = item.metadata?.durability;
                const finalDurability = userDurability && typeof userDurability.current === 'number'
                    ? userDurability
                    : equipment.durability || { current: 100, max: 100 };

                // Merge lifesteal, energy_regen vào stats để frontend hiển thị đầy đủ
                const mergedStats = {
                    ...equipment.stats,
                    lifesteal: equipment.lifesteal || equipment.stats?.lifesteal || 0,
                    energy_regen: equipment.energy_regen || equipment.stats?.energy_regen || 0
                };

                return {
                    ...item.toObject ? item.toObject() : item,
                    name: equipment.name,
                    metadata: {
                        ...(item.metadata || {}),
                        _id: equipment._id,
                        equipmentType: equipment.type,
                        subtype: equipment.subtype,
                        rarity: equipment.rarity,
                        level_required: equipment.level_required,
                        stats: mergedStats,
                        special_effect: equipment.special_effect,
                        skill_bonus: equipment.skill_bonus,
                        energy_regen: equipment.energy_regen,
                        lifesteal: equipment.lifesteal,
                        true_damage: equipment.true_damage,
                        buff_duration: equipment.buff_duration,
                        durability: finalDurability,
                        img: equipment.img,
                        description: equipment.description
                    }
                };
            }
        }
        return item.toObject ? item.toObject() : item;
    });

    // QUEST_TEMPLATES is now imported statically at the top of the file

    return {
        _id: cultivation._id,
        user: cultivation.user,
        exp: cultivation.exp,
        realm: {
            level: currentRealm.level,
            name: currentRealm.name,
            description: currentRealm.description,
            color: currentRealm.color,
            icon: currentRealm.icon
        },
        subLevel: cultivation.subLevel,
        progress: progress,
        expToNextRealm: expToNext,
        canBreakthrough: potentialRealm.level > currentRealm.level,
        spiritStones: cultivation.spiritStones,
        totalSpiritStonesEarned: cultivation.totalSpiritStonesEarned,
        loginStreak: cultivation.loginStreak,
        longestStreak: cultivation.longestStreak,
        lastLoginDate: cultivation.lastLoginDate,
        dailyQuests: cultivation.dailyQuests.map(q => {
            const template = QUEST_TEMPLATES.daily.find(t => t.id === q.questId);
            return {
                ...q.toObject(),
                ...template,
                progressPercent: template?.requirement ? Math.min(100, (q.progress / template.requirement.count) * 100) : 100
            };
        }),
        weeklyQuests: cultivation.weeklyQuests.map(q => {
            const template = QUEST_TEMPLATES.weekly.find(t => t.id === q.questId);
            return {
                ...q.toObject(),
                ...template,
                progressPercent: template?.requirement ? Math.min(100, (q.progress / template.requirement.count) * 100) : 100
            };
        }),
        achievements: cultivation.achievements.map(q => {
            const template = QUEST_TEMPLATES.achievement.find(t => t.id === q.questId);
            return {
                ...q.toObject(),
                ...template,
                progressPercent: template?.requirement ? Math.min(100, (q.progress / template.requirement.count) * 100) : 100
            };
        }),
        inventory: updatedInventory,
        equipped: cultivation.equipped,
        activeBoosts: cultivation.activeBoosts.filter(b => new Date(b.expiresAt) > new Date()),
        learnedTechniques: cultivation.learnedTechniques || [],
        sectTechniques: (cultivation.sectTechniques || []).map(learned => {
            const technique = SECT_TECHNIQUES_MAP.get(learned.id);
            return technique ? {
                id: learned.id,
                learnedAt: learned.learnedAt,
                technique: technique
            } : null;
        }).filter(Boolean),
        skills: cultivation.getSkills(),
        stats: (() => {
            // Merge legacy likes vào upvotes nếu upvotes = 0 hoặc chưa có
            // Sau khi migration, totalUpvotesGiven sẽ có giá trị, nhưng vẫn giữ fallback cho dữ liệu cũ
            const stats = { ...cultivation.stats };
            if ((!stats.totalUpvotesGiven || stats.totalUpvotesGiven === 0) && stats.totalLikesGiven > 0) {
                stats.totalUpvotesGiven = stats.totalLikesGiven;
            }
            if ((!stats.totalUpvotesReceived || stats.totalUpvotesReceived === 0) && stats.totalLikesReceived > 0) {
                stats.totalUpvotesReceived = stats.totalLikesReceived;
            }
            // Ưu tiên totalUpvotesGiven (sau migration sẽ có giá trị)
            // Nếu cả hai đều có, lấy giá trị lớn hơn
            if (stats.totalUpvotesGiven && stats.totalLikesGiven) {
                stats.totalUpvotesGiven = Math.max(stats.totalUpvotesGiven, stats.totalLikesGiven);
            }
            if (stats.totalUpvotesReceived && stats.totalLikesReceived) {
                stats.totalUpvotesReceived = Math.max(stats.totalUpvotesReceived, stats.totalLikesReceived);
            }
            return stats;
        })(),
        combatStats: cultivation.calculateCombatStats(),
        equipmentStats: null,
        breakthroughSuccessRate: (() => {
            const baseRates = { 1: 90, 2: 80, 3: 70, 4: 60, 5: 50, 6: 40, 7: 30, 8: 20, 9: 15, 10: 10, 11: 5 };
            const bonusPerFailure = { 1: 15, 2: 15, 3: 12, 4: 10, 5: 8, 6: 7, 7: 6, 8: 5, 9: 5, 10: 5, 11: 5 };
            const baseRate = baseRates[currentRealm.level] || 30;
            const bonus = bonusPerFailure[currentRealm.level] || 10;
            const failureCount = cultivation.breakthroughFailureCount || 0;
            return Math.min(100, baseRate + failureCount * bonus);
        })(),
        breakthroughFailureCount: cultivation.breakthroughFailureCount || 0,
        lastBreakthroughAttempt: cultivation.lastBreakthroughAttempt,
        breakthroughCooldownUntil: cultivation.breakthroughCooldownUntil,
        characterAppearance: cultivation.characterAppearance || 'Immortal_male',
        lastAppearanceChangeAt: cultivation.lastAppearanceChangeAt,
        sectTechniques: (cultivation.sectTechniques || []).map(learned => {
            const technique = SECT_TECHNIQUES_MAP.get(learned.id);
            return technique ? {
                id: learned.id,
                learnedAt: learned.learnedAt,
                technique: technique
            } : null;
        }).filter(Boolean),
        materials: cultivation.materials || [],
        craftPity: cultivation.craftPity || { epic: 0, legendary: 0 }, // BPS Pity System
        createdAt: cultivation.createdAt,
        updatedAt: cultivation.updatedAt,
        dailyProgress: cultivation.dailyProgress
    };
};

/**
 * GET / - Lấy thông tin tu tiên của user hiện tại
 * Cached trong Redis 5s để giảm DB load
 */
export const getCultivation = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const redis = getClient();
        const cacheKey = `${redisConfig.keyPrefix}cultivation:${userId}`;

        // Try cache first
        if (redis && isRedisConnected()) {
            try {
                const cached = await redis.get(cacheKey);
                if (cached) {
                    return res.json(JSON.parse(cached));
                }
            } catch (cacheErr) {
                // Cache miss or error, continue to DB
            }
        }

        const cultivation = await Cultivation.getOrCreate(userId);

        // Sync user cache (async, don't block response)
        User.findByIdAndUpdate(userId, {
            $set: {
                'cultivationCache.realmLevel': cultivation.realmLevel,
                'cultivationCache.realmName': cultivation.realmName,
                'cultivationCache.exp': cultivation.exp
            }
        }).catch(err => console.error("[CULTIVATION] Sync cache error:", err));

        let equipmentStats = null;
        try {
            equipmentStats = await cultivation.getEquipmentStats();
        } catch (equipErr) {
            console.error("[CULTIVATION] Error loading equipment stats:", equipErr);
        }

        const response = await formatCultivationResponse(cultivation);
        response.equipmentStats = equipmentStats;

        if (response.combatStats) {
            response.combatStats = mergeEquipmentStatsIntoCombatStats(response.combatStats, equipmentStats);
        }

        const result = { success: true, data: response };

        // Cache response
        if (redis && isRedisConnected()) {
            redis.set(cacheKey, JSON.stringify(result), 'EX', CULTIVATION_CACHE_TTL)
                .catch(err => console.error("[CULTIVATION] Cache set error:", err));
        }

        res.json(result);
    } catch (error) {
        console.error("[CULTIVATION] Error getting cultivation:", error);
        next(error);
    }
};

/**
 * Invalidate cultivation cache cho user
 * Gọi sau khi có mutation (addExp, equip, breakthrough, etc.)
 */
export const invalidateCultivationCache = async (userId) => {
    const redis = getClient();
    if (redis && isRedisConnected()) {
        const cacheKey = `${redisConfig.keyPrefix}cultivation:${userId}`;
        try {
            await redis.del(cacheKey);
        } catch (err) {
            console.error("[CULTIVATION] Cache invalidate error:", err);
        }
    }
};

/**
 * POST /sync-cache - Force sync cultivation cache
 */
export const syncCache = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const cultivation = await Cultivation.findOne({ user: userId });

        if (!cultivation) {
            return res.status(404).json({ success: false, message: "Chưa có thông tin tu tiên" });
        }

        await User.findByIdAndUpdate(userId, {
            $set: {
                'cultivationCache.realmLevel': cultivation.realmLevel,
                'cultivationCache.realmName': cultivation.realmName,
                'cultivationCache.exp': cultivation.exp,
                'cultivationCache.equipped.title': cultivation.equipped?.title || null,
                'cultivationCache.equipped.badge': cultivation.equipped?.badge || null,
                'cultivationCache.equipped.avatarFrame': cultivation.equipped?.avatarFrame || null,
                'cultivationCache.equipped.profileEffect': cultivation.equipped?.profileEffect || null
            }
        });

        res.json({
            success: true,
            message: "Đã đồng bộ thông tin tu tiên",
            data: {
                realmLevel: cultivation.realmLevel,
                realmName: cultivation.realmName,
                exp: cultivation.exp,
                equipped: cultivation.equipped
            }
        });
    } catch (error) {
        console.error("[CULTIVATION] Error syncing cache:", error);
        next(error);
    }
};

/**
 * POST /batch - Lấy thông tin tu tiên của nhiều users
 */
export const getBatch = async (req, res, next) => {
    try {
        const { userIds } = req.body;

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ success: false, message: "userIds phải là một mảng không rỗng" });
        }

        const limitedUserIds = userIds.slice(0, 50);

        const cultivations = await Cultivation.find({
            user: { $in: limitedUserIds }
        }).select('user exp realmLevel realmName').lean();

        const result = {};
        cultivations.forEach(c => {
            const realm = CULTIVATION_REALMS.find(r => r.level === c.realmLevel) || CULTIVATION_REALMS[0];
            result[c.user.toString()] = {
                exp: c.exp,
                realmLevel: c.realmLevel || realm.level,
                realmName: c.realmName || realm.name,
                realm: { level: realm.level, name: realm.name, color: realm.color }
            };
        });

        res.json({ success: true, data: result });
    } catch (error) {
        console.error("[CULTIVATION] Error getting batch cultivation:", error);
        next(error);
    }
};

/**
 * GET /user/:userId - Lấy thông tin tu tiên của user khác
 */
export const getUserCultivation = async (req, res, next) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId).select('name avatarUrl');
        if (!user) {
            return res.status(404).json({ success: false, message: "Không tìm thấy vị đạo hữu này" });
        }

        const cultivation = await Cultivation.getOrCreate(userId);
        const realm = cultivation.getRealmFromExp();

        res.json({
            success: true,
            data: {
                user: { _id: user._id, name: user.name, avatarUrl: user.avatarUrl },
                exp: cultivation.exp,
                realm: { level: realm.level, name: realm.name, color: realm.color, icon: realm.icon },
                subLevel: cultivation.subLevel,
                equipped: cultivation.equipped,
                stats: {
                    totalPostsCreated: cultivation.stats.totalPostsCreated,
                    totalDaysActive: cultivation.stats.totalDaysActive,
                    totalQuestsCompleted: cultivation.stats.totalQuestsCompleted
                },
                loginStreak: cultivation.loginStreak,
                longestStreak: cultivation.longestStreak
            }
        });
    } catch (error) {
        console.error("[CULTIVATION] Error getting user cultivation:", error);
        next(error);
    }
};

/**
 * POST /update-character-appearance - Cập nhật hình tượng nhân vật
 * Cooldown 7 ngày giữa các lần đổi
 */
export const updateCharacterAppearance = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { characterAppearance } = req.body;

        // Validate characterAppearance
        const validAppearances = ['Immortal_male', 'Immortal_female', 'Demon_male', 'Demon_female'];
        if (!validAppearances.includes(characterAppearance)) {
            return res.status(400).json({
                success: false,
                message: "Hình tượng không hợp lệ. Vui lòng chọn: Tiên Nam, Tiên Nữ, Ma Nam, hoặc Ma Nữ"
            });
        }

        const cultivation = await Cultivation.getOrCreate(userId);

        // Check cooldown (7 days = 7 * 24 * 60 * 60 * 1000 ms)
        const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
        const now = new Date();

        if (cultivation.lastAppearanceChangeAt) {
            const timeSinceLastChange = now.getTime() - new Date(cultivation.lastAppearanceChangeAt).getTime();
            if (timeSinceLastChange < COOLDOWN_MS) {
                const remainingTime = COOLDOWN_MS - timeSinceLastChange;
                const remainingDays = Math.ceil(remainingTime / (24 * 60 * 60 * 1000));
                return res.status(400).json({
                    success: false,
                    message: `Bạn cần đợi thêm ${remainingDays} ngày nữa để đổi hình tượng`,
                    cooldownRemaining: remainingTime,
                    canChangeAt: new Date(cultivation.lastAppearanceChangeAt.getTime() + COOLDOWN_MS)
                });
            }
        }

        // Update appearance
        cultivation.characterAppearance = characterAppearance;
        cultivation.lastAppearanceChangeAt = now;
        await saveWithRetry(cultivation);

        // Get appearance label for response
        const appearanceLabels = {
            'Immortal_male': 'Tiên Nam',
            'Immortal_female': 'Tiên Nữ',
            'Demon_male': 'Ma Nam',
            'Demon_female': 'Ma Nữ'
        };

        res.json({
            success: true,
            message: `Đã thay đổi hình tượng thành ${appearanceLabels[characterAppearance]}`,
            data: {
                characterAppearance: cultivation.characterAppearance,
                lastAppearanceChangeAt: cultivation.lastAppearanceChangeAt,
                nextChangeAvailableAt: new Date(now.getTime() + COOLDOWN_MS)
            }
        });
    } catch (error) {
        console.error("[CULTIVATION] Error updating character appearance:", error);
        next(error);
    }
};
