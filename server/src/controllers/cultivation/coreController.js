import mongoose from "mongoose";
import Cultivation, { CULTIVATION_REALMS } from "../../models/Cultivation.js";
import Equipment from "../../models/Equipment.js";
import User from "../../models/User.js";

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

    return combatStats;
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
                    buff_duration: eq.buff_duration
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
                        stats: equipment.stats,
                        special_effect: equipment.special_effect,
                        skill_bonus: equipment.skill_bonus,
                        energy_regen: equipment.energy_regen,
                        lifesteal: equipment.lifesteal,
                        true_damage: equipment.true_damage,
                        buff_duration: equipment.buff_duration,
                        img: equipment.img,
                        description: equipment.description
                    }
                };
            }
        }
        return item.toObject ? item.toObject() : item;
    });

    // Import QUEST_TEMPLATES dynamically
    const { QUEST_TEMPLATES } = await import("../../models/Cultivation.js");

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
        skills: cultivation.getSkills(),
        stats: cultivation.stats,
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
        createdAt: cultivation.createdAt,
        updatedAt: cultivation.updatedAt
    };
};

/**
 * GET / - Lấy thông tin tu tiên của user hiện tại
 */
export const getCultivation = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const cultivation = await Cultivation.getOrCreate(userId);

        try {
            await User.findByIdAndUpdate(userId, {
                $set: {
                    'cultivationCache.realmLevel': cultivation.realmLevel,
                    'cultivationCache.realmName': cultivation.realmName,
                    'cultivationCache.exp': cultivation.exp
                }
            });
        } catch (syncErr) {
            console.error("[CULTIVATION] Error syncing cache:", syncErr);
        }

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

        res.json({ success: true, data: response });
    } catch (error) {
        console.error("[CULTIVATION] Error getting cultivation:", error);
        next(error);
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
