/**
 * Activity Leaderboard Routes
 * 
 * API để lấy bảng xếp hạng hoạt động của users dựa trên:
 * - Số bài viết đã đăng
 * - Số bình luận đã viết
 * - Số reactions nhận được từ bài viết
 * - Số ngày tham gia
 */

import express from "express";
import mongoose from "mongoose";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import User from "../models/User.js";
import { authOptional } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/activity-leaderboard
 * Lấy bảng xếp hạng hoạt động của users
 * 
 * Query params:
 * - period: 'all' | 'week' | 'month' (default: 'all')
 * - limit: number (default: 10, max: 50)
 */
router.get("/", authOptional, async (req, res, next) => {
    try {
        const { period = 'all', limit = 10 } = req.query;
        const sanitizedLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 50);

        // Calculate date filter based on period
        let dateFilter = {};
        const now = new Date();

        if (period === 'week') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            dateFilter = { $gte: weekAgo };
        } else if (period === 'month') {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            dateFilter = { $gte: monthAgo };
        }

        // Run aggregations in parallel
        const [postStats, commentStats, upvoteStats] = await Promise.all([
            // Posts count per user
            Post.aggregate([
                {
                    $match: {
                        status: 'published',
                        ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {})
                    }
                },
                {
                    $group: {
                        _id: '$author',
                        postCount: { $sum: 1 }
                    }
                }
            ]),

            // Comments count per user
            Comment.aggregate([
                {
                    $match: Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}
                },
                {
                    $group: {
                        _id: '$author',
                        commentCount: { $sum: 1 }
                    }
                }
            ]),

            // Upvotes RECEIVED on user's posts (count total upvotes each author got)
            Post.aggregate([
                {
                    $match: {
                        status: 'published',
                        upvoteCount: { $gt: 0 },
                        ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {})
                    }
                },
                {
                    $group: {
                        _id: '$author',
                        upvoteCount: { $sum: '$upvoteCount' }
                    }
                }
            ])
        ]);

        // Merge all stats into a Map
        const userStatsMap = new Map();

        // Add post stats
        postStats.forEach(item => {
            if (!item._id) return;
            const id = item._id.toString();
            if (!userStatsMap.has(id)) {
                userStatsMap.set(id, { userId: id, postCount: 0, commentCount: 0, upvoteCount: 0 });
            }
            userStatsMap.get(id).postCount = item.postCount;
        });

        // Add comment stats
        commentStats.forEach(item => {
            if (!item._id) return;
            const id = item._id.toString();
            if (!userStatsMap.has(id)) {
                userStatsMap.set(id, { userId: id, postCount: 0, commentCount: 0, upvoteCount: 0 });
            }
            userStatsMap.get(id).commentCount = item.commentCount;
        });

        // Add upvote stats
        upvoteStats.forEach(item => {
            if (!item._id) return;
            const id = item._id.toString();
            if (!userStatsMap.has(id)) {
                userStatsMap.set(id, { userId: id, postCount: 0, commentCount: 0, upvoteCount: 0 });
            }
            userStatsMap.get(id).upvoteCount = item.upvoteCount;
        });

        // Calculate total score and sort
        const userStatsArray = Array.from(userStatsMap.values()).map(stats => ({
            ...stats,
            totalScore: stats.postCount * 5 + stats.commentCount * 2 + stats.upvoteCount * 1
        }));

        // Sort by total score descending
        userStatsArray.sort((a, b) => b.totalScore - a.totalScore);

        // Take top N users
        const topUsers = userStatsArray.slice(0, sanitizedLimit);

        // Fetch user details for top users
        const userIds = topUsers.map(u => new mongoose.Types.ObjectId(u.userId));
        const users = await User.find({ _id: { $in: userIds } })
            .select('_id name nickname avatarUrl createdAt role cultivationCache')
            .lean();

        // Create user lookup map
        const userMap = new Map();
        users.forEach(u => userMap.set(u._id.toString(), u));

        // Calculate days joined and build final result
        const result = topUsers.map((stats, index) => {
            const user = userMap.get(stats.userId);
            if (!user) return null;

            const createdAt = new Date(user.createdAt);
            const daysJoined = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

            return {
                rank: index + 1,
                userId: stats.userId,
                name: user.nickname || user.name,
                avatarUrl: user.avatarUrl,
                role: user.role,
                cultivationCache: user.cultivationCache,
                postCount: stats.postCount,
                commentCount: stats.commentCount,
                upvoteCount: stats.upvoteCount,
                totalScore: stats.totalScore,
                daysJoined: Math.max(1, daysJoined), // Minimum 1 day
                joinedAt: user.createdAt
            };
        }).filter(Boolean);

        res.json({
            success: true,
            period,
            data: result,
            total: result.length
        });

    } catch (error) {
        console.error('[ActivityLeaderboard] Error:', error);
        next(error);
    }
});

export default router;
