/**
 * Recap Service
 * 
 * Service xử lý aggregation dữ liệu cho Recap 2025
 * Thu thập thống kê từ Posts, Comments, Cultivation, RankedMatch, etc.
 * 
 * @module recapService
 */

import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import Story from '../models/Story.js';
import FriendRequest from '../models/FriendRequest.js';
import Cultivation from '../models/Cultivation.js';
import RankedMatch from '../models/RankedMatch.js';
import Rank from '../models/Rank.js';
import User from '../models/User.js';

// Recap availability period
const RECAP_START_DATE = new Date('2025-12-25T00:00:00+07:00');
const RECAP_END_DATE = new Date('2026-01-31T23:59:59+07:00');
const RECAP_YEAR = 2025;

// Date range for 2025 data
const YEAR_START = new Date('2025-01-01T00:00:00+07:00');
const YEAR_END = new Date('2025-12-31T23:59:59+07:00');

/**
 * Check if recap is available to view
 */
export const checkRecapAvailability = () => {
    const now = new Date();
    return {
        isAvailable: now >= RECAP_START_DATE && now <= RECAP_END_DATE,
        startDate: RECAP_START_DATE,
        endDate: RECAP_END_DATE,
        daysRemaining: Math.max(0, Math.ceil((RECAP_END_DATE - now) / (1000 * 60 * 60 * 24)))
    };
};

/**
 * Get social activity stats for a user
 */
export const getSocialStats = async (userId) => {
    const dateFilter = { createdAt: { $gte: YEAR_START, $lte: YEAR_END } };

    // Posts stats
    const [postStats] = await Post.aggregate([
        { $match: { author: userId, ...dateFilter } },
        {
            $group: {
                _id: null,
                totalPosts: { $sum: 1 },
                totalUpvotes: { $sum: '$upvoteCount' },
                totalViews: { $sum: '$views' },
                totalComments: { $sum: '$commentCount' }
            }
        }
    ]);

    // Top post (most upvoted)
    const topPost = await Post.findOne({ author: userId, ...dateFilter })
        .sort({ upvoteCount: -1 })
        .select('title slug upvoteCount views commentCount createdAt coverUrl')
        .lean();

    // Comments count
    const commentsCount = await Comment.countDocuments({ author: userId, ...dateFilter });

    // Upvotes given to others
    const upvotesGiven = await Post.countDocuments({
        upvotes: userId,
        author: { $ne: userId },
        ...dateFilter
    });

    // Stories count
    const storiesCount = await Story.countDocuments({ author: userId, ...dateFilter });

    // New friends made
    const newFriends = await FriendRequest.countDocuments({
        $or: [{ from: userId }, { to: userId }],
        status: 'accepted',
        ...dateFilter
    });

    return {
        totalPosts: postStats?.totalPosts || 0,
        totalUpvotesReceived: postStats?.totalUpvotes || 0,
        totalViews: postStats?.totalViews || 0,
        totalCommentsOnPosts: postStats?.totalComments || 0,
        commentsWritten: commentsCount,
        upvotesGiven,
        storiesShared: storiesCount,
        newFriends,
        topPost: topPost || null
    };
};

/**
 * Get cultivation (tu luyện) stats for a user
 */
export const getCultivationStats = async (userId) => {
    const cultivation = await Cultivation.findOne({ user: userId }).lean();

    if (!cultivation) {
        return {
            hasData: false,
            currentRealm: null,
            currentRealmName: 'Chưa tu luyện',
            totalExp: 0,
            spiritStones: 0,
            questsCompleted: { daily: 0, weekly: 0, achievement: 0 },
            inventoryCount: 0
        };
    }

    // Count completed quests
    const dailyCompleted = (cultivation.dailyQuests || []).filter(q => q.completed).length;
    const weeklyCompleted = (cultivation.weeklyQuests || []).filter(q => q.completed).length;
    const achievementCompleted = (cultivation.achievements || []).filter(q => q.completed).length;

    // Get realm name from CULTIVATION_REALMS
    const { CULTIVATION_REALMS } = await import('../models/Cultivation.js');
    const currentRealm = CULTIVATION_REALMS.find(r => r.level === cultivation.realmLevel);

    return {
        hasData: true,
        currentRealm: cultivation.realmLevel,
        currentRealmName: currentRealm?.name || 'Phàm Nhân',
        currentRealmColor: currentRealm?.color || '#9CA3AF',
        totalExp: cultivation.exp || 0,
        spiritStones: cultivation.spiritStones || 0,
        questsCompleted: {
            daily: dailyCompleted,
            weekly: weeklyCompleted,
            achievement: achievementCompleted,
            total: dailyCompleted + weeklyCompleted + achievementCompleted
        },
        inventoryCount: (cultivation.inventory || []).length,
        equippedItems: cultivation.equippedItems || {}
    };
};

/**
 * Get arena (võ đài) stats for a user
 */
export const getArenaStats = async (userId) => {
    const dateFilter = { createdAt: { $gte: YEAR_START, $lte: YEAR_END } };

    // Get current rank
    const rank = await Rank.findOne({ user: userId }).lean();

    // Get match history for the year
    const matches = await RankedMatch.find({
        $or: [{ player1: userId }, { player2: userId }],
        ...dateFilter
    }).lean();

    if (!rank || matches.length === 0) {
        return {
            hasData: false,
            totalMatches: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            winRate: 0,
            currentTier: null,
            currentTierName: 'Chưa xếp hạng',
            highestTier: null,
            longestWinStreak: 0,
            currentMmr: 0,
            mmrChange: 0
        };
    }

    // Calculate stats
    let wins = 0, losses = 0, draws = 0;
    let mmrGained = 0, mmrLost = 0;
    let currentStreak = 0, longestWinStreak = 0;

    matches.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    matches.forEach(match => {
        const isPlayer1 = match.player1?.toString() === userId.toString();

        if (match.isDraw) {
            draws++;
            currentStreak = 0;
        } else if (
            (isPlayer1 && match.winnerSide === 'player1') ||
            (!isPlayer1 && match.winnerSide === 'player2')
        ) {
            wins++;
            currentStreak++;
            longestWinStreak = Math.max(longestWinStreak, currentStreak);
            mmrGained += Math.abs(isPlayer1 ? match.player1MmrChange : match.player2MmrChange);
        } else {
            losses++;
            currentStreak = 0;
            mmrLost += Math.abs(isPlayer1 ? match.player1MmrChange : match.player2MmrChange);
        }
    });

    // Get tier name
    const { RANK_TIERS } = await import('../models/Rank.js');
    const currentTierInfo = RANK_TIERS.find(t => t.tier === rank.tier);

    return {
        hasData: true,
        totalMatches: matches.length,
        wins,
        losses,
        draws,
        winRate: matches.length > 0 ? ((wins / matches.length) * 100).toFixed(1) : 0,
        currentTier: rank.tier,
        currentTierName: currentTierInfo?.name || 'Phàm Giả',
        currentTierColor: currentTierInfo?.color || '#9CA3AF',
        highestTier: rank.highestTier || rank.tier,
        longestWinStreak: Math.max(longestWinStreak, rank.longestWinStreak || 0),
        currentMmr: rank.mmr || 1000,
        mmrChange: mmrGained - mmrLost
    };
};

/**
 * Get top moments for a user
 */
export const getTopMoments = async (userId) => {
    const dateFilter = { createdAt: { $gte: YEAR_START, $lte: YEAR_END } };

    // Most upvoted post
    const topPost = await Post.findOne({ author: userId, ...dateFilter })
        .sort({ upvoteCount: -1 })
        .select('title slug upvoteCount views createdAt')
        .lean();

    // Most viewed post
    const mostViewedPost = await Post.findOne({ author: userId, ...dateFilter })
        .sort({ views: -1 })
        .select('title slug views upvoteCount createdAt')
        .lean();

    // Most commented post
    const mostCommentedPost = await Post.findOne({ author: userId, ...dateFilter })
        .sort({ commentCount: -1 })
        .select('title slug commentCount createdAt')
        .lean();

    // Top interactor (person who commented most on user's posts)
    const [topInteractor] = await Comment.aggregate([
        {
            $lookup: {
                from: 'posts',
                localField: 'post',
                foreignField: '_id',
                as: 'postInfo'
            }
        },
        { $unwind: '$postInfo' },
        {
            $match: {
                'postInfo.author': userId,
                author: { $ne: userId },
                ...dateFilter
            }
        },
        {
            $group: {
                _id: '$author',
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } },
        { $limit: 1 },
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'userInfo'
            }
        },
        { $unwind: '$userInfo' },
        {
            $project: {
                userId: '$_id',
                name: '$userInfo.name',
                avatarUrl: '$userInfo.avatarUrl',
                interactionCount: '$count'
            }
        }
    ]);

    return {
        topPost,
        mostViewedPost: mostViewedPost?._id?.toString() !== topPost?._id?.toString() ? mostViewedPost : null,
        mostCommentedPost,
        topInteractor: topInteractor || null
    };
};

/**
 * Get community ranking (Top X%)
 */
export const getCommunityRanking = async (userId, userStats) => {
    // Count total active users (users with at least 1 post in 2025)
    const dateFilter = { createdAt: { $gte: YEAR_START, $lte: YEAR_END } };

    const totalActiveUsers = await Post.distinct('author', dateFilter);
    const totalCount = totalActiveUsers.length || 1;

    // Count users with more posts than current user
    const usersWithMorePosts = await Post.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$author', count: { $sum: 1 } } },
        { $match: { count: { $gt: userStats.totalPosts } } },
        { $count: 'count' }
    ]);

    const rank = (usersWithMorePosts[0]?.count || 0) + 1;
    const percentile = Math.round((1 - rank / totalCount) * 100);

    return {
        totalActiveUsers: totalCount,
        postRank: rank,
        postPercentile: Math.max(1, percentile),
        isTopPerformer: percentile >= 90
    };
};

/**
 * Get complete recap data for a user
 */
export const getRecapData = async (userId) => {
    // Check availability first
    const availability = checkRecapAvailability();

    // Get all stats in parallel
    const [social, cultivation, arena, topMoments] = await Promise.all([
        getSocialStats(userId),
        getCultivationStats(userId),
        getArenaStats(userId),
        getTopMoments(userId)
    ]);

    // Get community ranking based on social stats
    const ranking = await getCommunityRanking(userId, social);

    // Get user basic info
    const user = await User.findById(userId)
        .select('name avatarUrl displayBadgeType cultivationCache createdAt firstLoginAt')
        .lean();

    // Calculate membership duration - try createdAt first, then firstLoginAt
    const joinDate = user?.createdAt || user?.firstLoginAt || new Date();
    const now = new Date();
    const membershipDays = Math.floor((now - new Date(joinDate)) / (1000 * 60 * 60 * 24));

    console.log('[DEBUG][RECAP] User membership:', {
        userId,
        createdAt: user?.createdAt,
        firstLoginAt: user?.firstLoginAt,
        joinDate,
        membershipDays
    });

    return {
        user: {
            name: user?.name || 'Tu Sĩ',
            avatarUrl: user?.avatarUrl || '',
            displayBadgeType: user?.displayBadgeType || 'cultivation',
            joinedAt: joinDate,
            membershipDays
        },
        year: RECAP_YEAR,
        availability,
        social,
        cultivation,
        arena,
        topMoments,
        ranking,
        generatedAt: new Date()
    };
};

export default {
    checkRecapAvailability,
    getSocialStats,
    getCultivationStats,
    getArenaStats,
    getTopMoments,
    getCommunityRanking,
    getRecapData
};
