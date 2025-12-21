import express from "express";
import mongoose from "mongoose";
import Report from "../models/Report.js";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import User from "../models/User.js";
import { authRequired, authOptional } from "../middleware/auth.js";

const router = express.Router();

/**
 * POST /api/reports - Tạo báo cáo mới
 * Yêu cầu đăng nhập
 */
router.post("/", authRequired, async (req, res, next) => {
    try {
        const { targetType, targetId, reason, description } = req.body;

        // Validate required fields
        if (!targetType || !targetId || !reason) {
            return res.status(400).json({
                success: false,
                error: "Thiếu thông tin: targetType, targetId, reason là bắt buộc"
            });
        }

        // Validate targetType
        if (!["post", "comment", "user"].includes(targetType)) {
            return res.status(400).json({
                success: false,
                error: "targetType phải là: post, comment, hoặc user"
            });
        }

        // Validate reason
        const validReasons = ["spam", "harassment", "inappropriate", "misinformation", "other"];
        if (!validReasons.includes(reason)) {
            return res.status(400).json({
                success: false,
                error: "Lý do không hợp lệ"
            });
        }

        // Check if already reported by this user
        const existingReport = await Report.findOne({
            reporter: req.user._id,
            targetId: new mongoose.Types.ObjectId(targetId)
        });

        if (existingReport) {
            return res.status(400).json({
                success: false,
                error: "Bạn đã báo cáo nội dung này rồi"
            });
        }

        // Get target info for snapshot
        let targetSnapshot = {};

        if (targetType === "post") {
            const post = await Post.findById(targetId).populate("author", "name").lean();
            if (!post) {
                return res.status(404).json({ success: false, error: "Không tìm thấy bài viết" });
            }
            // Cannot report own post
            if (post.author._id.toString() === req.user._id.toString()) {
                return res.status(400).json({ success: false, error: "Không thể báo cáo bài viết của chính bạn" });
            }
            targetSnapshot = {
                content: (post.title || "").slice(0, 200) + (post.content || "").slice(0, 300),
                authorId: post.author._id,
                authorName: post.author.name
            };
        } else if (targetType === "comment") {
            const comment = await Comment.findById(targetId).populate("author", "name").lean();
            if (!comment) {
                return res.status(404).json({ success: false, error: "Không tìm thấy bình luận" });
            }
            // Cannot report own comment
            if (comment.author._id.toString() === req.user._id.toString()) {
                return res.status(400).json({ success: false, error: "Không thể báo cáo bình luận của chính bạn" });
            }
            targetSnapshot = {
                content: (comment.content || "").slice(0, 500),
                authorId: comment.author._id,
                authorName: comment.author.name
            };
        } else if (targetType === "user") {
            const targetUser = await User.findById(targetId).select("name").lean();
            if (!targetUser) {
                return res.status(404).json({ success: false, error: "Không tìm thấy người dùng" });
            }
            // Cannot report self
            if (targetId === req.user._id.toString()) {
                return res.status(400).json({ success: false, error: "Không thể báo cáo chính bạn" });
            }
            targetSnapshot = {
                content: "",
                authorId: targetUser._id,
                authorName: targetUser.name
            };
        }

        // Create report
        const report = await Report.create({
            reporter: req.user._id,
            targetType,
            targetId: new mongoose.Types.ObjectId(targetId),
            reason,
            description: description?.slice(0, 500) || "",
            targetSnapshot
        });

        res.status(201).json({
            success: true,
            message: "Báo cáo đã được gửi. Chúng tôi sẽ xem xét trong thời gian sớm nhất.",
            reportId: report._id
        });
    } catch (error) {
        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                error: "Bạn đã báo cáo nội dung này rồi"
            });
        }
        console.error("[ERROR][REPORTS] Create report error:", error);
        next(error);
    }
});

/**
 * GET /api/reports/my - Lấy danh sách báo cáo của user hiện tại
 */
router.get("/my", authRequired, async (req, res, next) => {
    try {
        const reports = await Report.find({ reporter: req.user._id })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

        res.json({ success: true, reports });
    } catch (error) {
        console.error("[ERROR][REPORTS] Get my reports error:", error);
        next(error);
    }
});

export default router;
