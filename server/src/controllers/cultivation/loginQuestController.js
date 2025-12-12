import Cultivation from "../../models/Cultivation.js";
import { formatCultivationResponse } from "./coreController.js";

/**
 * POST /login - Điểm danh hàng ngày
 */
export const processLogin = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const cultivation = await Cultivation.getOrCreate(userId);

        const result = cultivation.processLogin();

        if (result.alreadyLoggedIn) {
            return res.json({
                success: true,
                message: "Bạn đã điểm danh hôm nay rồi",
                data: { alreadyLoggedIn: true, streak: result.streak }
            });
        }

        await cultivation.save();

        res.json({
            success: true,
            message: `Điểm danh thành công! Streak: ${result.streak} ngày`,
            data: {
                alreadyLoggedIn: false,
                streak: result.streak,
                expEarned: result.expEarned,
                stonesEarned: result.stonesEarned,
                leveledUp: result.leveledUp,
                newRealm: result.newRealm,
                cultivation: await formatCultivationResponse(cultivation)
            }
        });
    } catch (error) {
        console.error("[CULTIVATION] Error processing login:", error);
        next(error);
    }
};

/**
 * POST /quest/:questId/claim - Nhận thưởng nhiệm vụ
 */
export const claimQuestReward = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { questId } = req.params;

        const cultivation = await Cultivation.getOrCreate(userId);

        try {
            const result = cultivation.claimQuestReward(questId);
            await cultivation.save();

            res.json({
                success: true,
                message: "Nhận thưởng thành công!",
                data: {
                    expEarned: result.expEarned,
                    stonesEarned: result.stonesEarned,
                    leveledUp: result.leveledUp,
                    newRealm: result.newRealm,
                    cultivation: await formatCultivationResponse(cultivation)
                }
            });
        } catch (claimError) {
            return res.status(400).json({ success: false, message: claimError.message });
        }
    } catch (error) {
        console.error("[CULTIVATION] Error claiming quest reward:", error);
        next(error);
    }
};
