import mongoose from "mongoose";
import Cultivation, { CULTIVATION_REALMS, SHOP_ITEMS, ITEM_TYPES, SHOP_ITEMS_MAP } from "../../models/Cultivation.js";
import { formatCultivationResponse, mergeEquipmentStatsIntoCombatStats, invalidateCultivationCache } from "./coreController.js";
import { logBreakthroughEvent } from "./worldEventController.js";

const hasAdminAccess = async (user) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (!user.role || user.role === 'user') return false;
    try {
        const Role = mongoose.model('Role');
        const roleDoc = await Role.findOne({ name: user.role, isActive: true }).lean();
        if (roleDoc?.permissions) {
            return Object.keys(roleDoc.permissions).some(k => k.startsWith('admin.') && roleDoc.permissions[k] === true);
        }
    } catch (e) { console.error('[ERROR] Role check:', e); }
    return false;
};

// ==================== BREAKTHROUGH RATE LIMITING ====================
// In-memory lock để ngăn race condition khi breakthrough
const breakthroughLocks = new Map();
const BREAKTHROUGH_LOCK_TIMEOUT = 10000; // 10 seconds max lock

const acquireBreakthroughLock = (userId) => {
    const existing = breakthroughLocks.get(userId);
    const now = Date.now();

    // Cleanup expired lock
    if (existing && now - existing > BREAKTHROUGH_LOCK_TIMEOUT) {
        breakthroughLocks.delete(userId);
    }

    if (breakthroughLocks.has(userId)) {
        return false; // Already locked
    }

    breakthroughLocks.set(userId, now);
    return true;
};

const releaseBreakthroughLock = (userId) => {
    breakthroughLocks.delete(userId);
};

// ==================== CLEANUP WITH GRACEFUL SHUTDOWN ====================
let breakthroughCleanupIntervalId = null;

const startBreakthroughCleanup = () => {
    if (breakthroughCleanupIntervalId) return; // Already running
    breakthroughCleanupIntervalId = setInterval(() => {
        const now = Date.now();
        for (const [userId, timestamp] of breakthroughLocks.entries()) {
            if (now - timestamp > BREAKTHROUGH_LOCK_TIMEOUT) {
                breakthroughLocks.delete(userId);
            }
        }
    }, 30000);
};

const stopBreakthroughCleanup = () => {
    if (breakthroughCleanupIntervalId) {
        clearInterval(breakthroughCleanupIntervalId);
        breakthroughCleanupIntervalId = null;
    }
};

// Start cleanup on module load
startBreakthroughCleanup();

// Export cleanup function for coordinated shutdown (called from main app)
export { stopBreakthroughCleanup };

export const getCombatStats = async (req, res, next) => {
    try {
        const cultivation = await Cultivation.getOrCreate(req.user.id);
        let combatStats = cultivation.calculateCombatStats();
        const equipmentStats = await cultivation.getEquipmentStats();
        combatStats = mergeEquipmentStatsIntoCombatStats(combatStats, equipmentStats);
        res.json({ success: true, data: combatStats });
    } catch (error) { next(error); }
};

export const getUserCombatStats = async (req, res, next) => {
    try {
        const cultivation = await Cultivation.findOne({ user: req.params.userId });
        if (!cultivation) return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin tu tiên' });
        let combatStats = cultivation.calculateCombatStats();
        const equipmentStats = await cultivation.getEquipmentStats();
        combatStats = mergeEquipmentStatsIntoCombatStats(combatStats, equipmentStats);
        res.json({ success: true, data: combatStats });
    } catch (error) { next(error); }
};

export const practiceTechnique = async (req, res, next) => {
    try {
        const { techniqueId, expGain } = req.body;
        if (!techniqueId) return res.status(400).json({ success: false, message: 'Vui lòng chọn công pháp' });
        const cultivation = await Cultivation.getOrCreate(req.user.id);
        const result = cultivation.practiceTechnique(techniqueId, expGain || 10);
        await cultivation.save();
        res.json({ success: true, message: result.leveledUp ? `Công pháp lên cấp ${result.newLevel}!` : `Luyện thành công!`, data: result });
    } catch (error) { next(error); }
};

export const breakthrough = async (req, res, next) => {
    const userId = req.user.id;

    // Acquire lock để ngăn race condition
    if (!acquireBreakthroughLock(userId)) {
        return res.status(429).json({
            success: false,
            message: "Đang xử lý độ kiếp, vui lòng đợi...",
            retryAfter: BREAKTHROUGH_LOCK_TIMEOUT
        });
    }

    try {
        const cultivation = await Cultivation.getOrCreate(userId);
        const currentRealm = CULTIVATION_REALMS.find(r => r.level === cultivation.realmLevel) || CULTIVATION_REALMS[0];
        const nextRealm = CULTIVATION_REALMS.find(r => r.level === currentRealm.level + 1);

        if (!nextRealm) {
            return res.status(400).json({ success: false, message: "Đã đạt cảnh giới tối đa!" });
        }
        if (cultivation.exp < nextRealm.minExp) {
            return res.status(400).json({ success: false, message: `Cần ${nextRealm.minExp.toLocaleString()} Tu Vi để độ kiếp` });
        }

        const now = new Date();
        if (cultivation.breakthroughCooldownUntil && cultivation.breakthroughCooldownUntil > now) {
            const remainingMs = cultivation.breakthroughCooldownUntil - now;
            return res.status(400).json({ success: false, message: `Cần chờ ${Math.ceil(remainingMs / 60000)} phút`, cooldownRemaining: remainingMs });
        }

        const baseRates = { 1: 95, 2: 90, 3: 85, 4: 75, 5: 65, 6: 55, 7: 45, 8: 35, 9: 25, 10: 20, 11: 15, 12: 10, 13: 5, 14: 1 };
        const bonusPerFailure = { 1: 15, 2: 15, 3: 12, 4: 10, 5: 8, 6: 7, 7: 6, 8: 5, 9: 5, 10: 5, 11: 5, 12: 5, 13: 5, 14: 5 };
        const baseSuccessRate = baseRates[currentRealm.level] || 30;
        const bonus = bonusPerFailure[currentRealm.level] || 10;

        let breakthroughBonus = 0, usedPill = null;
        const breakthroughPills = cultivation.inventory.filter(item =>
            item.type === ITEM_TYPES.BREAKTHROUGH_BOOST && !item.used && (!item.expiresAt || new Date(item.expiresAt) > now)
        );
        if (breakthroughPills.length > 0) {
            breakthroughPills.sort((a, b) => (SHOP_ITEMS_MAP.get(b.itemId)?.breakthroughBonus || 0) - (SHOP_ITEMS_MAP.get(a.itemId)?.breakthroughBonus || 0));
            usedPill = breakthroughPills[0];
            breakthroughBonus = SHOP_ITEMS_MAP.get(usedPill.itemId)?.breakthroughBonus || 0;
        }

        const failureBonus = (cultivation.breakthroughFailureCount || 0) * bonus;
        const currentSuccessRate = Math.min(100, baseSuccessRate + failureBonus + breakthroughBonus);
        const success = Math.random() * 100 < currentSuccessRate;

        if (usedPill) {
            const pillIndex = cultivation.inventory.findIndex(i => i.itemId === usedPill.itemId && i._id?.toString() === usedPill._id?.toString());
            if (pillIndex !== -1) cultivation.inventory.splice(pillIndex, 1);
        }

        cultivation.lastBreakthroughAttempt = now;

        if (success) {
            const oldRealm = currentRealm;
            cultivation.realmLevel = nextRealm.level;
            cultivation.realmName = nextRealm.name;
            cultivation.breakthroughFailureCount = 0;
            cultivation.breakthroughSuccessRate = baseRates[nextRealm.level] || 30;
            cultivation.breakthroughCooldownUntil = null;

            cultivation.updateQuestProgress('realm', nextRealm.level);

            await cultivation.save();
            invalidateCultivationCache(userId).catch(() => { });

            // Log Thiên Hạ Ký event
            const user = await mongoose.model('User').findById(userId).select('name nickname').lean();
            const username = user?.name || user?.nickname || 'Tu sĩ ẩn danh';
            logBreakthroughEvent(userId, username, true, oldRealm.name, nextRealm.name).catch(e => console.error('[WorldEvent] Log error:', e));

            res.json({ success: true, breakthroughSuccess: true, message: `Chúc mừng! Đạt cảnh giới ${nextRealm.name}!`, data: { oldRealm: oldRealm.name, newRealm: nextRealm, successRate: currentSuccessRate, usedPill: usedPill ? { name: usedPill.name, bonus: breakthroughBonus } : null, cultivation: await formatCultivationResponse(cultivation) } });
        } else {
            cultivation.breakthroughFailureCount = (cultivation.breakthroughFailureCount || 0) + 1;
            cultivation.breakthroughCooldownUntil = new Date(now.getTime() + 3600000);
            cultivation.breakthroughSuccessRate = baseSuccessRate;
            await cultivation.save();
            invalidateCultivationCache(userId).catch(() => { });

            // Log Thiên Hạ Ký event (chỉ log fail ở cảnh giới cao)
            const user = await mongoose.model('User').findById(userId).select('name nickname').lean();
            const username = user?.name || user?.nickname || 'Tu sĩ ẩn danh';
            logBreakthroughEvent(userId, username, false, currentRealm.name, nextRealm.name).catch(e => console.error('[WorldEvent] Log error:', e));

            const nextSuccessRate = Math.min(100, baseSuccessRate + cultivation.breakthroughFailureCount * bonus);
            res.json({ success: true, breakthroughSuccess: false, message: `Độ kiếp thất bại! Tỷ lệ lần sau: ${nextSuccessRate}%`, data: { currentRealm: currentRealm.name, targetRealm: nextRealm.name, failureCount: cultivation.breakthroughFailureCount, nextSuccessRate, usedPill: usedPill ? { name: usedPill.name, bonus: breakthroughBonus } : null, cooldownUntil: cultivation.breakthroughCooldownUntil, cooldownRemaining: 3600000, cultivation: await formatCultivationResponse(cultivation) } });
        }
    } catch (error) {
        next(error);
    } finally {
        // Always release lock
        releaseBreakthroughLock(userId);
    }
};

export const fixRealms = async (req, res, next) => {
    try {
        const isAdmin = await hasAdminAccess(req.user);
        if (!isAdmin) return res.status(403).json({ success: false, error: "Chỉ admin có quyền" });
        const cultivations = await Cultivation.find().populate('user', 'name');
        let fixed = 0;
        const details = [];
        for (const cult of cultivations) {
            let correctRealm = CULTIVATION_REALMS[0];
            for (let i = CULTIVATION_REALMS.length - 1; i >= 0; i--) {
                if (cult.exp >= CULTIVATION_REALMS[i].minExp) { correctRealm = CULTIVATION_REALMS[i]; break; }
            }
            const needsFix = cult.realmLevel !== correctRealm.level || cult.realmName !== correctRealm.name;
            details.push({ userName: cult.user?.name || 'Unknown', exp: cult.exp, currentLevel: cult.realmLevel, correctLevel: correctRealm.level, needsFix });
            if (needsFix) { cult.realmLevel = correctRealm.level; cult.realmName = correctRealm.name; await cult.save(); fixed++; }
        }
        res.json({ success: true, message: `Đã sửa ${fixed}/${cultivations.length} bản ghi`, fixed, total: cultivations.length, details });
    } catch (error) { next(error); }
};
