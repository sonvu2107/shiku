import Cultivation from "../../models/Cultivation.js";
import { QUEST_META_BY_ID } from "../../services/questRules.js";
import { applyQuestProgressAtomic } from "../../services/questProgressAtomic.js";

function dayKey(d) {
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/**
 * POST /api/cultivation/login - Điểm danh hàng ngày (ATOMIC)
 */
export const processLogin = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const now = new Date();
        const todayKey = dayKey(now);

        // Read minimal old state (lean)
        let old = await Cultivation.findOne({ user: userId })
            .select("lastLoginDate lastLoginDayKey loginStreak longestStreak")
            .lean();

        if (!old) {
            return res.status(409).json({ success: false, message: "Khởi tạo dữ liệu tu luyện, thử lại" });
        }

        // Fast already-logged check
        if (old.lastLoginDayKey === todayKey) {
            return res.json({
                success: true,
                message: "Bạn đã điểm danh hôm nay rồi",
                data: { alreadyLoggedIn: true, streak: old.loginStreak || 1 },
            });
        }

        // Compute streak from old.lastLoginDate
        let newStreak = 1;
        let streakContinued = false;

        if (old.lastLoginDate) {
            const last = new Date(old.lastLoginDate);
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());
            const diffDays = Math.floor((today - lastDay) / 86400000);

            if (diffDays === 1) {
                newStreak = (old.loginStreak || 0) + 1;
                streakContinued = true;
            } else {
                newStreak = 1;
            }
        } else {
            newStreak = 1;
        }

        // Rewards (exact logic from method)
        const baseExp = 20;
        const streakBonus = Math.min(newStreak * 5, 50);

        let baseStones = 10;
        if (newStreak === 1) baseStones = 50;
        else if (newStreak === 2) baseStones = 30;
        else if (newStreak === 3) baseStones = 40;
        else if (newStreak <= 7) baseStones = 20;

        const streakStoneBonus = Math.min((newStreak - 1) * 2, 20);

        let milestoneBonus = 0;
        if (newStreak === 7) milestoneBonus = 70;
        else if (newStreak === 30) milestoneBonus = 250;
        else if (newStreak === 60) milestoneBonus = 500;
        else if (newStreak === 90) milestoneBonus = 1000;
        else if (newStreak === 365) milestoneBonus = 5000;

        const stonesEarned = baseStones + streakStoneBonus + milestoneBonus;
        const expEarned = baseExp + streakBonus;

        // LOCK: set lastLoginDayKey only if not already today (optimistic lock)
        const lock = await Cultivation.updateOne(
            { user: userId, $or: [{ lastLoginDayKey: { $ne: todayKey } }, { lastLoginDayKey: { $exists: false } }] },
            { $set: { lastLoginDayKey: todayKey, lastLoginDate: now } }
        );

        if (lock.modifiedCount === 0) {
            return res.json({
                success: true,
                message: "Bạn đã điểm danh hôm nay rồi",
                data: { alreadyLoggedIn: true, streak: old.loginStreak || 1 },
            });
        }

        // APPLY main updates (atomic)
        await Cultivation.updateOne(
            { user: userId },
            {
                $set: {
                    loginStreak: newStreak,
                    longestStreak: Math.max(old.longestStreak || 0, newStreak),
                },
                $inc: {
                    exp: expEarned,
                    spiritStones: stonesEarned,
                    "stats.totalDaysActive": 1,
                    dataVersion: 1,
                    statsVersion: 1, // exp changes combat stats
                },
            }
        );

        // Auto-complete daily_login quest
        await Cultivation.updateOne(
            { user: userId, "dailyQuests.questId": "daily_login", "dailyQuests.completed": false },
            { $set: { "dailyQuests.$.completed": true, "dailyQuests.$.completedAt": now } }
        );

        // Update achievements login_streak ONLY when streak continued OR first login
        if (streakContinued || !old.lastLoginDate) {
            await applyQuestProgressAtomic(userId, "login_streak", 1, now);
        }

        return res.json({
            success: true,
            message: `Điểm danh thành công! Streak: ${newStreak} ngày`,
            data: {
                alreadyLoggedIn: false,
                streak: newStreak,
                expEarned,
                stonesEarned,
                milestoneBonus: milestoneBonus > 0 ? milestoneBonus : undefined,
            },
        });
    } catch (error) {
        console.error("[CULTIVATION] Error processing login:", error);
        next(error);
    }
};

/**
 * POST /api/cultivation/quest/:questId/claim - Nhận thưởng nhiệm vụ (ATOMIC)
 */
export const claimQuestReward = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { questId } = req.params;
        const now = new Date();

        const meta = QUEST_META_BY_ID.get(questId);
        if (!meta) return res.status(400).json({ success: false, message: "Không tìm thấy nhiệm vụ" });

        const arr = meta.arrayField;

        // LOCK claim (atomic)
        const locked = await Cultivation.findOneAndUpdate(
            {
                user: userId,
                [`${arr}.questId`]: questId,
                [`${arr}.completed`]: true,
                [`${arr}.claimed`]: false,
            },
            {
                $set: {
                    [`${arr}.$.claimed`]: true,
                    [`${arr}.$.claimedAt`]: now,
                },
            },
            { new: false, select: "_id" }
        );

        if (!locked) {
            return res.status(400).json({ success: false, message: "Nhiệm vụ chưa hoàn thành hoặc đã nhận thưởng" });
        }

        const expEarned = Number(meta.tpl.expReward) || 0;
        const stonesEarned = Number(meta.tpl.spiritStoneReward) || 0;

        const inc = {
            spiritStones: stonesEarned,
            "stats.totalQuestsCompleted": 1,
            dataVersion: 1,
        };
        if (expEarned) {
            inc.exp = expEarned;
            inc.statsVersion = 1; // exp affects combat
        }

        await Cultivation.updateOne({ user: userId }, { $inc: inc });

        return res.json({
            success: true,
            message: "Nhận thưởng thành công!",
            data: { expEarned, stonesEarned },
        });
    } catch (error) {
        console.error("[CULTIVATION] Error claiming quest reward:", error);
        next(error);
    }
};
