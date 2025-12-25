/**
 * Recap Routes
 * 
 * API endpoints cho Recap 2025:
 * - GET /api/recap/2025 - Lấy dữ liệu recap
 * - GET /api/recap/2025/check - Kiểm tra thời hạn xem
 * - POST /api/recap/2025/share - Tạo share link/image
 * 
 * @module recap
 */

import express from 'express';
import { authRequired } from '../middleware/auth.js';
import {
    checkRecapAvailability,
    getRecapData
} from '../services/recapService.js';
import { getClient } from '../services/redisClient.js';

const router = express.Router();

// Cache TTL: 1 hour for recap data (it doesn't change frequently)
const RECAP_CACHE_TTL = 60 * 60;

/**
 * GET /api/recap/2025/check
 * Kiểm tra thời hạn xem recap
 */
router.get('/2025/check', async (req, res) => {
    try {
        const availability = checkRecapAvailability();
        res.json(availability);
    } catch (error) {
        console.error('[ERROR][RECAP] Error checking availability:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

/**
 * GET /api/recap/2025
 * Lấy dữ liệu recap cho user đang đăng nhập
 */
router.get('/2025', authRequired, async (req, res) => {
    try {
        const userId = req.user._id.toString();

        // Check availability
        const availability = checkRecapAvailability();
        if (!availability.isAvailable) {
            return res.status(403).json({
                message: 'Recap 2025 chưa khả dụng hoặc đã hết hạn xem',
                availability
            });
        }

        // Try to get from cache first
        const redis = getClient();
        const cacheKey = `recap:2025:${userId}`;

        if (redis) {
            try {
                const cached = await redis.get(cacheKey);
                if (cached) {
                    const parsedCache = JSON.parse(cached);
                    // Check if cache has new membershipDays field, if not, invalidate
                    if (parsedCache.user && parsedCache.user.membershipDays !== undefined) {
                        console.log('[INFO][RECAP] Serving from cache:', userId);
                        return res.json(parsedCache);
                    } else {
                        console.log('[INFO][RECAP] Cache outdated (missing membershipDays), regenerating:', userId);
                        await redis.del(cacheKey);
                    }
                }
            } catch (cacheError) {
                console.error('[WARN][RECAP] Cache read error:', cacheError.message);
            }
        }

        // Generate recap data
        console.log('[INFO][RECAP] Generating recap for user:', userId);
        const recapData = await getRecapData(req.user._id);

        // Cache the result
        if (redis) {
            try {
                await redis.setex(cacheKey, RECAP_CACHE_TTL, JSON.stringify(recapData));
            } catch (cacheError) {
                console.error('[WARN][RECAP] Cache write error:', cacheError.message);
            }
        }

        res.json(recapData);
    } catch (error) {
        console.error('[ERROR][RECAP] Error getting recap data:', error);
        res.status(500).json({ message: 'Lỗi server khi lấy dữ liệu recap' });
    }
});

/**
 * GET /api/recap/2025/user/:userId
 * Lấy recap của user khác (cho share link)
 */
router.get('/2025/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Check availability
        const availability = checkRecapAvailability();
        if (!availability.isAvailable) {
            return res.status(403).json({
                message: 'Recap 2025 chưa khả dụng hoặc đã hết hạn xem',
                availability
            });
        }

        // Try cache first
        const redis = getClient();
        const cacheKey = `recap:2025:${userId}`;

        if (redis) {
            try {
                const cached = await redis.get(cacheKey);
                if (cached) {
                    return res.json(JSON.parse(cached));
                }
            } catch (cacheError) {
                console.error('[WARN][RECAP] Cache read error:', cacheError.message);
            }
        }

        // Generate recap data
        const recapData = await getRecapData(userId);

        // Cache the result
        if (redis) {
            try {
                await redis.setex(cacheKey, RECAP_CACHE_TTL, JSON.stringify(recapData));
            } catch (cacheError) {
                console.error('[WARN][RECAP] Cache write error:', cacheError.message);
            }
        }

        res.json(recapData);
    } catch (error) {
        console.error('[ERROR][RECAP] Error getting user recap:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

/**
 * POST /api/recap/2025/share
 * Tạo share data cho recap
 */
router.post('/2025/share', authRequired, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const { type = 'link' } = req.body; // 'link' or 'image'

        // Check availability
        const availability = checkRecapAvailability();
        if (!availability.isAvailable) {
            return res.status(403).json({
                message: 'Recap 2025 chưa khả dụng hoặc đã hết hạn xem',
                availability
            });
        }

        // Get recap data for share
        const recapData = await getRecapData(req.user._id);

        // Generate share URL
        const shareUrl = `${process.env.CLIENT_URL || 'https://shiku.click'}/recap/2025/share/${userId}`;

        // For image type, return data needed to generate image on frontend
        if (type === 'image') {
            return res.json({
                shareUrl,
                type: 'image',
                data: {
                    user: recapData.user,
                    stats: {
                        posts: recapData.social.totalPosts,
                        upvotes: recapData.social.totalUpvotesReceived,
                        comments: recapData.social.commentsWritten,
                        friends: recapData.social.newFriends,
                        realm: recapData.cultivation.currentRealmName,
                        tier: recapData.arena.currentTierName,
                        winRate: recapData.arena.winRate
                    },
                    ranking: recapData.ranking.postPercentile
                }
            });
        }

        // Default: return link share data
        res.json({
            shareUrl,
            type: 'link',
            title: `Recap 2025 của ${recapData.user.name}`,
            description: `${recapData.social.totalPosts} bài viết • ${recapData.social.totalUpvotesReceived} upvotes • ${recapData.cultivation.currentRealmName}`
        });
    } catch (error) {
        console.error('[ERROR][RECAP] Error creating share:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

/**
 * DELETE /api/recap/2025/cache
 * Xóa cache recap của user (để lấy data mới)
 */
router.delete('/2025/cache', authRequired, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const redis = getClient();

        if (redis) {
            const cacheKey = `recap:2025:${userId}`;
            await redis.del(cacheKey);
            console.log('[INFO][RECAP] Cache cleared for user:', userId);
        }

        res.json({ message: 'Cache đã được xóa' });
    } catch (error) {
        console.error('[ERROR][RECAP] Error clearing cache:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

export default router;
