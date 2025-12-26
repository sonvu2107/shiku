/**
 * VibeCheck Routes
 * 
 * API endpoints cho Vibe Check feature
 * - GET /api/vibecheck/today - Lấy vibe check hôm nay
 * - POST /api/vibecheck/vote - Vote cho 1 option
 * - GET /api/vibecheck/history - Lịch sử votes của user
 */

import express from "express";
import { authRequired, authOptional } from "../middleware/auth.js";
import VibeCheckService from "../services/VibeCheckService.js";

const router = express.Router();

/**
 * GET /api/vibecheck/today
 * Lấy vibe check hôm nay + kết quả
 * Public endpoint nhưng nếu có auth sẽ check hasVoted
 */
router.get("/today", authOptional, async (req, res, next) => {
    try {
        const userId = req.user?._id || null;
        const data = await VibeCheckService.getTodayVibeCheck(userId);
        res.json(data);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/vibecheck/vote
 * Vote cho 1 option
 * Yêu cầu đăng nhập
 */
router.post("/vote", authRequired, async (req, res, next) => {
    try {
        const { optionId } = req.body;

        if (!optionId) {
            return res.status(400).json({ error: "Thiếu optionId" });
        }

        const data = await VibeCheckService.vote(req.user._id, optionId);
        res.json(data);
    } catch (error) {
        if (error.message === "Bạn đã vote rồi!" || error.message === "Option không hợp lệ") {
            return res.status(400).json({ error: error.message });
        }
        next(error);
    }
});

/**
 * GET /api/vibecheck/history
 * Lịch sử votes của user (7 ngày gần nhất)
 */
router.get("/history", authRequired, async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 7;
        const data = await VibeCheckService.getUserHistory(req.user._id, limit);
        res.json(data);
    } catch (error) {
        next(error);
    }
});

export default router;
