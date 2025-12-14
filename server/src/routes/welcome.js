/**
 * Welcome Routes
 * 
 * Routes xử lý hệ thống chào mừng user mới:
 * - GET / - Lấy welcome data cho user hiện tại
 * - POST /shown - Đánh dấu đã hiển thị welcome
 * - POST /complete - Hoàn thành onboarding thủ công
 * 
 * @module welcome
 */

import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import WelcomeService from "../services/WelcomeService.js";

const router = Router();

/**
 * GET / - Lấy welcome data cho user hiện tại
 * @returns {Object} { shouldShowWelcome, isNewUser, hasFirstPost }
 */
router.get("/", authRequired, async (req, res, next) => {
    try {
        const data = await WelcomeService.getWelcomeData(req.user._id);
        res.json(data);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /shown - Đánh dấu đã hiển thị welcome modal
 */
router.post("/shown", authRequired, async (req, res, next) => {
    try {
        await WelcomeService.markWelcomeShown(req.user._id);
        res.json({ success: true, message: "Đã đánh dấu welcome shown" });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /complete - Hoàn thành onboarding thủ công (nếu cần)
 */
router.post("/complete", authRequired, async (req, res, next) => {
    try {
        await WelcomeService.markFirstPost(req.user._id);
        res.json({ success: true, message: "Đã đánh dấu hoàn thành onboarding" });
    } catch (error) {
        next(error);
    }
});

export default router;
