import User from "../../models/User.js";
import Post from "../../models/Post.js";
import Comment from "../../models/Comment.js";
import { withCache, withSWR } from "../../utils/hybridCache.js";

// Cache keys for admin stats
const STATS_CACHE_KEY = 'admin:stats';
const DAILY_STATS_CACHE_KEY = 'admin:daily-stats';

/**
 * GET /stats - Lấy thống kê tổng quan với phần trăm tăng trưởng
 * Cached for 5 minutes using hybridCache
 */
export const getStats = async (req, res, next) => {
    try {
        // Use withCache to cache stats for 5 minutes (300 seconds)
        const stats = await withCache(STATS_CACHE_KEY, async () => {
            return await fetchStatsFromDB();
        }, 300);

        res.json({ stats });
    } catch (e) {
        next(e);
    }
};

/**
 * Internal function to fetch stats from database
 */
async function fetchStatsFromDB() {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
        totalPosts,
        totalUsers,
        totalComments,
        publishedPosts,
        privatePosts,
        adminUsers
    ] = await Promise.all([
        Post.estimatedDocumentCount(),
        User.estimatedDocumentCount(),
        Comment.estimatedDocumentCount(),
        Post.countDocuments({ status: "published" }),
        Post.countDocuments({ status: "private" }),
        User.countDocuments({ role: "admin" })
    ]);

    const [
        thisMonthPosts,
        thisMonthUsers,
        thisMonthComments,
        thisMonthPublished,
        thisMonthPrivates,
        thisMonthAdmins
    ] = await Promise.all([
        Post.countDocuments({ createdAt: { $gte: thisMonth } }),
        User.countDocuments({ createdAt: { $gte: thisMonth } }),
        Comment.countDocuments({ createdAt: { $gte: thisMonth } }),
        Post.countDocuments({ status: "published", createdAt: { $gte: thisMonth } }),
        Post.countDocuments({ status: "private", createdAt: { $gte: thisMonth } }),
        User.countDocuments({ role: "admin", createdAt: { $gte: thisMonth } })
    ]);

    const [
        lastMonthPosts,
        lastMonthUsers,
        lastMonthComments,
        lastMonthPublished,
        lastMonthPrivates,
        lastMonthAdmins
    ] = await Promise.all([
        Post.countDocuments({ createdAt: { $gte: lastMonth, $lt: thisMonth } }),
        User.countDocuments({ createdAt: { $gte: lastMonth, $lt: thisMonth } }),
        Comment.countDocuments({ createdAt: { $gte: lastMonth, $lt: thisMonth } }),
        Post.countDocuments({ status: "published", createdAt: { $gte: lastMonth, $lt: thisMonth } }),
        Post.countDocuments({ status: "private", createdAt: { $gte: lastMonth, $lt: thisMonth } }),
        User.countDocuments({ role: "admin", createdAt: { $gte: lastMonth, $lt: thisMonth } })
    ]);

    const calculateGrowth = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
    };

    const postsGrowth = calculateGrowth(thisMonthPosts, lastMonthPosts);
    const usersGrowth = calculateGrowth(thisMonthUsers, lastMonthUsers);
    const commentsGrowth = calculateGrowth(thisMonthComments, lastMonthComments);
    const publishedGrowth = calculateGrowth(thisMonthPublished, lastMonthPublished);
    const privateGrowth = calculateGrowth(thisMonthPrivates, lastMonthPrivates);
    const adminsGrowth = calculateGrowth(thisMonthAdmins, lastMonthAdmins);

    const [viewsData, emotesData] = await Promise.all([
        Post.aggregate([
            {
                $group: {
                    _id: null,
                    totalViews: { $sum: "$views" },
                    thisMonthViews: {
                        $sum: {
                            $cond: [
                                { $gte: ["$createdAt", thisMonth] },
                                "$views",
                                0
                            ]
                        }
                    },
                    lastMonthViews: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $gte: ["$createdAt", lastMonth] },
                                        { $lt: ["$createdAt", thisMonth] }
                                    ]
                                },
                                "$views",
                                0
                            ]
                        }
                    }
                }
            }
        ]),
        Post.aggregate([
            {
                $group: {
                    _id: null,
                    totalEmotes: { $sum: { $size: { $ifNull: ["$emotes", []] } } },
                    thisMonthEmotes: {
                        $sum: {
                            $cond: [
                                { $gte: ["$createdAt", thisMonth] },
                                { $size: { $ifNull: ["$emotes", []] } },
                                0
                            ]
                        }
                    },
                    lastMonthEmotes: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $gte: ["$createdAt", lastMonth] },
                                        { $lt: ["$createdAt", thisMonth] }
                                    ]
                                },
                                { $size: { $ifNull: ["$emotes", []] } },
                                0
                            ]
                        }
                    }
                }
            }
        ])
    ]);

    const totalViews = viewsData[0]?.totalViews || 0;
    const thisMonthViews = viewsData[0]?.thisMonthViews || 0;
    const lastMonthViews = viewsData[0]?.lastMonthViews || 0;
    const totalEmotes = emotesData[0]?.totalEmotes || 0;
    const thisMonthEmotes = emotesData[0]?.thisMonthEmotes || 0;
    const lastMonthEmotes = emotesData[0]?.lastMonthEmotes || 0;

    const viewsGrowth = calculateGrowth(thisMonthViews, lastMonthViews);
    const emotesGrowth = calculateGrowth(thisMonthEmotes, lastMonthEmotes);

    const topPosts = await Post.find({ status: "published" })
        .populate("author", "name")
        .sort({ views: -1 })
        .limit(5)
        .select("title views author");

    const topUsers = await Post.aggregate([
        { $group: { _id: "$author", postCount: { $sum: 1 } } },
        { $sort: { postCount: -1 } },
        { $limit: 5 },
        {
            $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "userInfo"
            }
        },
        { $unwind: "$userInfo" },
        {
            $project: {
                _id: "$userInfo._id",
                name: "$userInfo.name",
                role: "$userInfo.role",
                avatarUrl: "$userInfo.avatarUrl",
                postCount: 1
            }
        }
    ]);

    return {
        overview: {
            totalPosts: { count: totalPosts, thisMonth: thisMonthPosts, lastMonth: lastMonthPosts, growth: postsGrowth },
            totalUsers: { count: totalUsers, thisMonth: thisMonthUsers, lastMonth: lastMonthUsers, growth: usersGrowth },
            totalComments: { count: totalComments, thisMonth: thisMonthComments, lastMonth: lastMonthComments, growth: commentsGrowth },
            totalViews: { count: totalViews, thisMonth: thisMonthViews, lastMonth: lastMonthViews, growth: viewsGrowth },
            totalEmotes: { count: totalEmotes, thisMonth: thisMonthEmotes, lastMonth: lastMonthEmotes, growth: emotesGrowth },
            publishedPosts: { count: publishedPosts, thisMonth: thisMonthPublished, lastMonth: lastMonthPublished, growth: publishedGrowth },
            draftPosts: { count: privatePosts, thisMonth: thisMonthPrivates, lastMonth: lastMonthPrivates, growth: privateGrowth },
            adminUsers: { count: adminUsers, thisMonth: thisMonthAdmins, lastMonth: lastMonthAdmins, growth: adminsGrowth }
        },
        topPosts,
        topUsers
    };
}

/**
 * GET /online-users - Lấy danh sách người dùng đang online
 */
export const getOnlineUsers = async (req, res, next) => {
    try {
        const onlineUsers = await User.find({ isOnline: true })
            .select('name email avatarUrl role lastSeen isOnline cultivationCache displayBadgeType')
            .sort({ lastSeen: -1 });

        res.json({ onlineUsers });
    } catch (e) {
        next(e);
    }
};

/**
 * GET /total-visitors - Lấy tổng số lượt truy cập
 */
export const getTotalVisitors = async (req, res, next) => {
    try {
        const totalUsers = await User.estimatedDocumentCount();

        const usersWithActivity = await User.countDocuments({
            lastSeen: { $exists: true, $ne: null }
        });

        const onlineUsers = await User.countDocuments({ isOnline: true });
        const totalVisitors = usersWithActivity;

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [todayVisitors, weekVisitors, monthVisitors] = await Promise.all([
            User.countDocuments({ lastSeen: { $gte: today } }),
            User.countDocuments({ lastSeen: { $gte: thisWeek } }),
            User.countDocuments({ lastSeen: { $gte: thisMonth } })
        ]);

        res.json({
            totalVisitors,
            totalUsers,
            onlineUsers,
            usersWithActivity,
            timeStats: {
                today: todayVisitors,
                thisWeek: weekVisitors,
                thisMonth: monthVisitors
            }
        });
    } catch (e) {
        next(e);
    }
};

/**
 * POST /update-offline-users - Cập nhật trạng thái offline
 */
export const updateOfflineUsers = async (req, res, next) => {
    try {
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
        const result = await User.updateMany(
            {
                isOnline: true,
                lastSeen: { $lt: twoMinutesAgo }
            },
            {
                isOnline: false
            }
        );

        res.json({
            message: "Updated offline users",
            updatedCount: result.modifiedCount
        });
    } catch (e) {
        next(e);
    }
};

/**
 * GET /stats/daily - Lấy thống kê theo từng ngày
 * Uses Stale-While-Revalidate pattern with 10 minute TTL
 */
export const getDailyStats = async (req, res, next) => {
    try {
        const days = Math.min(365, Math.max(7, parseInt(req.query.days) || 14));
        const cacheKey = `${DAILY_STATS_CACHE_KEY}:${days}`;

        // Use withSWR: returns cached data immediately, revalidates in background
        const result = await withSWR(cacheKey, async () => {
            return await fetchDailyStatsFromDB(days);
        }, 600, 120); // 10 min TTL, 2 min stale time

        res.json(result);
    } catch (e) {
        next(e);
    }
};

/**
 * Internal function to fetch daily stats from database
 */
async function fetchDailyStatsFromDB(days) {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);

    const [dailyPosts, dailyUsers, dailyComments] = await Promise.all([
        Post.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    count: { $sum: 1 },
                    views: { $sum: "$views" },
                    emotes: { $sum: { $size: { $ifNull: ["$emotes", []] } } }
                }
            },
            { $sort: { _id: 1 } }
        ]),
        User.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]),
        Comment.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ])
    ]);

    const postsMap = new Map(dailyPosts.map(d => [d._id, d]));
    const usersMap = new Map(dailyUsers.map(d => [d._id, d.count]));
    const commentsMap = new Map(dailyComments.map(d => [d._id, d.count]));

    const chartData = [];
    for (let i = 0; i < days; i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const dayLabel = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

        const postData = postsMap.get(dateStr) || { count: 0, views: 0, emotes: 0 };

        chartData.push({
            date: dateStr,
            label: dayLabel,
            posts: postData.count || 0,
            views: postData.views || 0,
            emotes: postData.emotes || 0,
            users: usersMap.get(dateStr) || 0,
            comments: commentsMap.get(dateStr) || 0
        });
    }

    const [totalPosts, totalUsers, totalComments, emotesData] = await Promise.all([
        Post.countDocuments({}),
        User.countDocuments({}),
        Comment.countDocuments({}),
        Post.aggregate([
            {
                $group: {
                    _id: null,
                    totalEmotes: { $sum: { $size: { $ifNull: ["$emotes", []] } } }
                }
            }
        ])
    ]);

    const allTimeTotals = {
        posts: totalPosts,
        users: totalUsers,
        comments: totalComments,
        emotes: emotesData[0]?.totalEmotes || 0
    };

    const periodTotals = {
        posts: chartData.reduce((sum, d) => sum + d.posts, 0),
        users: chartData.reduce((sum, d) => sum + d.users, 0),
        comments: chartData.reduce((sum, d) => sum + d.comments, 0),
        emotes: chartData.reduce((sum, d) => sum + d.emotes, 0)
    };

    const baseline = {
        posts: allTimeTotals.posts - periodTotals.posts,
        users: allTimeTotals.users - periodTotals.users,
        comments: allTimeTotals.comments - periodTotals.comments,
        emotes: allTimeTotals.emotes - periodTotals.emotes
    };

    return {
        success: true,
        days,
        chartData,
        allTimeTotals,
        baseline,
        periodTotals
    };
}
