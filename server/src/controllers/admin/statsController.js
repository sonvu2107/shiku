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

    const [viewsData, upvotesData] = await Promise.all([
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
                    totalUpvotes: { $sum: { $ifNull: ["$upvoteCount", 0] } },
                    thisMonthUpvotes: {
                        $sum: {
                            $cond: [
                                { $gte: ["$createdAt", thisMonth] },
                                { $ifNull: ["$upvoteCount", 0] },
                                0
                            ]
                        }
                    },
                    lastMonthUpvotes: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $gte: ["$createdAt", lastMonth] },
                                        { $lt: ["$createdAt", thisMonth] }
                                    ]
                                },
                                { $ifNull: ["$upvoteCount", 0] },
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
    const totalUpvotes = upvotesData[0]?.totalUpvotes || 0;
    const thisMonthUpvotes = upvotesData[0]?.thisMonthUpvotes || 0;
    const lastMonthUpvotes = upvotesData[0]?.lastMonthUpvotes || 0;

    const viewsGrowth = calculateGrowth(thisMonthViews, lastMonthViews);
    const upvotesGrowth = calculateGrowth(thisMonthUpvotes, lastMonthUpvotes);

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
            totalUpvotes: { count: totalUpvotes, thisMonth: thisMonthUpvotes, lastMonth: lastMonthUpvotes, growth: upvotesGrowth },
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
    // Use Vietnam timezone (UTC+7) for consistent date calculations
    const vietnamTimezone = "Asia/Ho_Chi_Minh";
    const vietnamOffset = 7 * 60 * 60 * 1000; // 7 hours in milliseconds

    // Calculate current time in Vietnam
    const now = new Date();
    const nowInVietnam = new Date(now.getTime() + vietnamOffset);

    // Calculate start date (days ago from today in Vietnam timezone)
    const startDateInVietnam = new Date(nowInVietnam);
    startDateInVietnam.setUTCHours(0, 0, 0, 0);
    startDateInVietnam.setUTCDate(startDateInVietnam.getUTCDate() - days + 1);

    // Convert back to UTC for MongoDB query
    const startDateUTC = new Date(startDateInVietnam.getTime() - vietnamOffset);

    const [dailyPosts, dailyUsers, dailyComments, dailyActiveUsers] = await Promise.all([
        Post.aggregate([
            { $match: { createdAt: { $gte: startDateUTC } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: vietnamTimezone }
                    },
                    count: { $sum: 1 },
                    views: { $sum: "$views" },
                    upvotes: { $sum: { $ifNull: ["$upvoteCount", 0] } }
                }
            },
            { $sort: { _id: 1 } }
        ]),
        User.aggregate([
            { $match: { createdAt: { $gte: startDateUTC } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: vietnamTimezone }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]),
        Comment.aggregate([
            { $match: { createdAt: { $gte: startDateUTC } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: vietnamTimezone }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]),
        // Daily active users based on lastSeen
        User.aggregate([
            { $match: { lastSeen: { $gte: startDateUTC } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$lastSeen", timezone: vietnamTimezone }
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
    const activeUsersMap = new Map(dailyActiveUsers.map(d => [d._id, d.count]));

    const chartData = [];
    for (let i = 0; i < days; i++) {
        // Generate each date in Vietnam timezone
        const date = new Date(startDateInVietnam.getTime() + i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        // Format label as dd-mm in Vietnam style
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const dayLabel = `${day}-${month}`;

        const postData = postsMap.get(dateStr) || { count: 0, views: 0, upvotes: 0 };

        chartData.push({
            date: dateStr,
            label: dayLabel,
            posts: postData.count || 0,
            views: postData.views || 0,
            upvotes: postData.upvotes || 0,
            users: usersMap.get(dateStr) || 0,
            comments: commentsMap.get(dateStr) || 0,
            activeUsers: activeUsersMap.get(dateStr) || 0
        });
    }

    const [totalPosts, totalUsers, totalComments, upvotesData] = await Promise.all([
        Post.countDocuments({}),
        User.countDocuments({}),
        Comment.countDocuments({}),
        Post.aggregate([
            {
                $group: {
                    _id: null,
                    totalUpvotes: { $sum: { $ifNull: ["$upvoteCount", 0] } }
                }
            }
        ])
    ]);

    const allTimeTotals = {
        posts: totalPosts,
        users: totalUsers,
        comments: totalComments,
        upvotes: upvotesData[0]?.totalUpvotes || 0
    };

    const periodTotals = {
        posts: chartData.reduce((sum, d) => sum + d.posts, 0),
        users: chartData.reduce((sum, d) => sum + d.users, 0),
        comments: chartData.reduce((sum, d) => sum + d.comments, 0),
        upvotes: chartData.reduce((sum, d) => sum + d.upvotes, 0)
    };

    const baseline = {
        posts: allTimeTotals.posts - periodTotals.posts,
        users: allTimeTotals.users - periodTotals.users,
        comments: allTimeTotals.comments - periodTotals.comments,
        upvotes: allTimeTotals.upvotes - periodTotals.upvotes
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

/**
 * GET /stats/insights - Lấy chỉ số hành vi cốt lõi
 * Core metrics để theo dõi sức khỏe sản phẩm
 */
export const getInsights = async (req, res, next) => {
    try {
        const insights = await withCache('admin:insights', async () => {
            return await fetchInsightsFromDB();
        }, 300); // Cache 5 minutes

        res.json({ success: true, insights });
    } catch (e) {
        next(e);
    }
};

/**
 * Internal function to fetch insights data
 * Metrics based on 30-day engagement window
 */
async function fetchInsightsFromDB() {
    // ==================== 1) TIME WINDOWS ====================
    const now = new Date();
    const from30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Helper: calculate percentile from histogram
    function percentileFromHistogram(hist, p) {
        const total = hist.reduce((s, x) => s + x.n, 0);
        if (!total) return 0;
        const target = Math.ceil(total * p);
        let cum = 0;
        for (const { _id, n } of hist) {
            cum += n;
            if (cum >= target) return _id;
        }
        return hist[hist.length - 1]?._id ?? 0;
    }

    // ==================== 2) PARALLEL QUERIES ====================
    const [
        // Basic counts
        totalUsers,
        usersWithPosts,
        totalPosts,
        postsWithComments,
        totalComments,
        totalUpvotesAgg,

        // Active users (30d) - proxy via lastSeen
        activeUsersCount,

        // Commenters in 30d
        commentersArray,

        // Upvoters in 30d (proxy: posts updated in 30d with upvotes)
        upvoterAgg,

        // Creators in 30d
        creatorsArray,

        // Users who posted within 24h of registration
        usersFirst24h,

        // Comment histogram for median/p75
        commentHistogram,

        // Posts with ≥2 comments
        postsWith2PlusComments,

        // Dead posts (no upvotes, no comments)
        deadPostsCount,

        // Last 30 days posts data
        newPosts30d,
        newPostsWithComments30d,
        newComments30d
    ] = await Promise.all([
        // Total counts
        User.countDocuments({}),
        User.countDocuments({ postCount: { $gt: 0 } }),
        Post.countDocuments({ status: "published" }),
        Post.countDocuments({ status: "published", commentCount: { $gt: 0 } }),
        Comment.countDocuments({}),
        Post.aggregate([
            { $group: { _id: null, total: { $sum: { $ifNull: ["$upvoteCount", 0] } } } }
        ]),

        // Active users (30d) based on lastSeen
        User.countDocuments({ lastSeen: { $gte: from30d } }),

        // Distinct commenters in 30d
        Comment.distinct("author", { createdAt: { $gte: from30d } }),

        // Upvoters from posts updated in 30d (proxy since upvotes don't have timestamps)
        Post.aggregate([
            { $match: { status: "published", updatedAt: { $gte: from30d }, upvotes: { $exists: true, $ne: [] } } },
            { $project: { upvotes: 1 } },
            { $unwind: "$upvotes" },
            { $group: { _id: "$upvotes" } }
        ]),

        // Creators in 30d
        Post.distinct("author", { status: "published", createdAt: { $gte: from30d } }),

        // Users who posted within 24h of registration
        User.aggregate([
            {
                $lookup: {
                    from: "posts",
                    let: { userId: "$_id", userCreatedAt: "$createdAt" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$author", "$$userId"] },
                                        { $lte: [{ $subtract: ["$createdAt", "$$userCreatedAt"] }, 24 * 60 * 60 * 1000] }
                                    ]
                                }
                            }
                        },
                        { $limit: 1 }
                    ],
                    as: "firstPost"
                }
            },
            { $match: { firstPost: { $not: { $size: 0 } } } },
            { $count: "total" }
        ]),

        // Comment histogram for percentile calculation
        Post.aggregate([
            { $match: { status: "published" } },
            { $project: { c: { $ifNull: ["$commentCount", 0] } } },
            { $group: { _id: "$c", n: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]),

        // Posts with ≥2 comments
        Post.countDocuments({ status: "published", commentCount: { $gte: 2 } }),

        // Dead posts (no upvotes, no comments)
        Post.countDocuments({
            status: "published",
            $and: [
                { $or: [{ commentCount: { $lte: 0 } }, { commentCount: { $exists: false } }] },
                { $or: [{ upvoteCount: { $lte: 0 } }, { upvoteCount: { $exists: false } }] }
            ]
        }),

        // 30d comparison data
        Post.countDocuments({ status: "published", createdAt: { $gte: from30d } }),
        Post.countDocuments({ status: "published", createdAt: { $gte: from30d }, commentCount: { $gt: 0 } }),
        Comment.countDocuments({ createdAt: { $gte: from30d } })
    ]);

    const totalUpvotes = totalUpvotesAgg[0]?.total || 0;

    // ==================== 3) ENGAGED USERS CALCULATION ====================
    // Engaged = union(commenters ∪ upvoters) in 30d
    const commenterSet = new Set(commentersArray.map(String));
    const upvoterSet = new Set(upvoterAgg.map(x => String(x._id)));
    const engagedSet = new Set([...commenterSet, ...upvoterSet]);
    const engagedUsersCount = engagedSet.size;

    // ==================== 4) LURKERS (30d) ====================
    // Lurkers = active users who didn't engage
    const lurkersCount = Math.max(activeUsersCount - engagedUsersCount, 0);

    // ==================== 5) CREATORS (30d) ====================
    const creatorsCount = creatorsArray.length;

    // ==================== 6) FUNNEL CONVERSIONS ====================
    const engagedFromActive = activeUsersCount
        ? +(engagedUsersCount / activeUsersCount * 100).toFixed(1)
        : 0;

    const creatorsFromActive = activeUsersCount
        ? +(creatorsCount / activeUsersCount * 100).toFixed(1)
        : 0;

    // Creator among engaged (intersection)
    const engagedCreatorCount = creatorsArray.reduce(
        (acc, id) => acc + (engagedSet.has(String(id)) ? 1 : 0),
        0
    );
    const creatorsAmongEngaged = engagedUsersCount
        ? +(engagedCreatorCount / engagedUsersCount * 100).toFixed(1)
        : 0;

    // ==================== 7) VOTE-ONLY / COMMENT-ONLY / BOTH ====================
    const voteOnlyCount = [...upvoterSet].filter(id => !commenterSet.has(id)).length;
    const commentOnlyCount = [...commenterSet].filter(id => !upvoterSet.has(id)).length;
    const bothCount = [...upvoterSet].filter(id => commenterSet.has(id)).length;

    // ==================== 8) MEDIAN & P75 COMMENTS/POST ====================
    const medianCommentsPerPost = percentileFromHistogram(commentHistogram, 0.5);
    const p75CommentsPerPost = percentileFromHistogram(commentHistogram, 0.75);

    // ==================== 9) CORE METRICS ====================
    const userPostRate = totalUsers > 0 ? Math.round((usersWithPosts / totalUsers) * 100) : 0;
    const postCommentRate = totalPosts > 0 ? Math.round((postsWithComments / totalPosts) * 100) : 0;
    const avgCommentsPerPost = totalPosts > 0 ? Number((totalComments / totalPosts).toFixed(2)) : 0;
    const upvoteCommentRatio = totalComments > 0 ? Number((totalUpvotes / totalComments).toFixed(2)) : 0;
    const firstPostIn24hRate = totalUsers > 0 ? Math.round((usersFirst24h[0]?.total || 0) / totalUsers * 100) : 0;

    // Post quality rates
    const postsWith2PlusRate = totalPosts ? +(postsWith2PlusComments / totalPosts * 100).toFixed(1) : 0;
    const deadPostRate = totalPosts ? +(deadPostsCount / totalPosts * 100).toFixed(1) : 0;

    // 30d metrics
    const userPostRate30d = activeUsersCount > 0 ? Math.round((creatorsCount / activeUsersCount) * 100) : 0;
    const postCommentRate30d = newPosts30d > 0 ? Math.round((newPostsWithComments30d / newPosts30d) * 100) : 0;
    const avgCommentsPerPost30d = newPosts30d > 0 ? Number((newComments30d / newPosts30d).toFixed(2)) : 0;

    return {
        core: {
            userPostRate: {
                value: userPostRate30d,
                label: "% Creator/Active (30d)",
                description: "Tỉ lệ active users đã đăng bài trong 30 ngày",
                threshold: 20,
                status: userPostRate30d >= 20 ? "healthy" : userPostRate30d >= 10 ? "warning" : "critical"
            },
            postCommentRate: {
                value: postCommentRate,
                label: "% Bài có comment",
                description: "Tỉ lệ bài có ít nhất 1 bình luận",
                threshold: 30,
                status: postCommentRate >= 30 ? "healthy" : postCommentRate >= 15 ? "warning" : "critical"
            },
            avgCommentsPerPost: {
                value: avgCommentsPerPost,
                label: "Avg comments/bài",
                description: "Số bình luận trung bình mỗi bài",
                threshold: 1.5,
                status: avgCommentsPerPost >= 1.5 ? "healthy" : avgCommentsPerPost >= 0.5 ? "warning" : "critical"
            }
        },
        secondary: {
            // Độ sâu bình luận (quan trọng nhất)
            medianCommentsPerPost: {
                value: medianCommentsPerPost,
                label: "Số bình luận trung vị",
                description: "Hơn 50% bài viết có số bình luận bằng hoặc ít hơn con số này"
            },
            p75CommentsPerPost: {
                value: p75CommentsPerPost,
                label: "Bình luận phân vị 75",
                description: "25% bài viết có nhiều bình luận nhất đạt ít nhất con số này"
            },
            postsWith2PlusRate: {
                value: postsWith2PlusRate,
                label: "% Bài có ≥2 bình luận",
                description: "Bài có hội thoại thực sự (từ 2 bình luận trở lên)"
            },
            // Chất lượng tương tác
            upvoteCommentRatio: {
                value: upvoteCommentRatio,
                label: "Tỉ lệ upvote/bình luận",
                description: "Chuẩn: 2-4. Cao hơn = tương tác nông"
            },
            // Chỉ số khác
            deadPostRate: {
                value: deadPostRate,
                label: "% Bài không tương tác",
                description: "Bài không có upvote và bình luận nào"
            },
            firstPostIn24hRate: {
                value: firstPostIn24hRate,
                label: "% Đăng bài trong 24h đầu",
                description: "Người dùng đăng bài trong 24h sau khi đăng ký"
            }
        },
        funnel: {
            activeUsers: {
                value: activeUsersCount,
                label: "Active Users (30d)",
                description: "Users có hoạt động trong 30 ngày (lastSeen)"
            },
            engagedUsers: {
                value: engagedUsersCount,
                label: "Engaged Users (30d)",
                description: "Users đã vote hoặc comment trong 30 ngày",
                note: "Upvote window là proxy (dựa vào updatedAt của post)"
            },
            creators: {
                value: creatorsCount,
                label: "Creators (30d)",
                description: "Users đã đăng bài trong 30 ngày"
            },
            lurkers: {
                value: lurkersCount,
                label: "Lurkers (30d)",
                description: "Active nhưng không engage (activeUsers - engagedUsers)"
            },
            engagedFromActive: {
                value: engagedFromActive,
                label: "% Engaged/Active",
                description: "Tỉ lệ chuyển đổi Active → Engaged"
            },
            creatorsFromActive: {
                value: creatorsFromActive,
                label: "% Creator/Active",
                description: "Tỉ lệ chuyển đổi Active → Creator"
            },
            creatorsAmongEngaged: {
                value: creatorsAmongEngaged,
                label: "Creators cũng engage",
                description: "Creators vừa đăng bài vừa vote/comment (Creator không bắt buộc phải engage)"
            }
        },
        engagementBreakdown: {
            voteOnly: {
                value: voteOnlyCount,
                label: "Vote-only",
                description: "Users chỉ upvote, không comment (30d)"
            },
            commentOnly: {
                value: commentOnlyCount,
                label: "Comment-only",
                description: "Users chỉ comment, không upvote (30d)"
            },
            both: {
                value: bothCount,
                label: "Vote & Comment",
                description: "Users vừa upvote vừa comment (30d)"
            }
        },
        comparison: {
            allTime: {
                users: totalUsers,
                usersWithPosts,
                posts: totalPosts,
                postsWithComments,
                comments: totalComments,
                upvotes: totalUpvotes
            },
            last30Days: {
                activeUsers: activeUsersCount,
                engagedUsers: engagedUsersCount,
                creators: creatorsCount,
                newPosts: newPosts30d,
                newPostsWithComments: newPostsWithComments30d,
                newComments: newComments30d,
                userPostRate: userPostRate30d,
                postCommentRate: postCommentRate30d,
                avgCommentsPerPost: avgCommentsPerPost30d
            }
        },
        // Nhận định quan trọng
        highlights: [
            voteOnlyCount > bothCount && {
                type: "warning",
                text: `${Math.round(voteOnlyCount / engagedUsersCount * 100)}% người tương tác chỉ vote, không bình luận`,
                action: "Gợi ý bình luận sau khi vote để tăng độ sâu hội thoại"
            },
            medianCommentsPerPost === 0 && {
                type: "critical",
                text: ">50% bài viết không có bình luận nào",
                action: "Tập trung tăng tỉ lệ bình luận đầu tiên"
            },
            postsWith2PlusRate < 30 && {
                type: "warning",
                text: `Chỉ ${postsWith2PlusRate}% bài có hội thoại (≥2 bình luận)`,
                action: "Khuyến khích trả lời, không chỉ bình luận đầu"
            },
            upvoteCommentRatio > 5 && {
                type: "info",
                text: `Tỉ lệ Vote/Bình luận = ${upvoteCommentRatio} (cao = tương tác nông)`,
                action: "Cải thiện trải nghiệm sau khi vote"
            },
            lurkersCount / activeUsersCount < 0.6 && {
                type: "healthy",
                text: `${Math.round((1 - lurkersCount / activeUsersCount) * 100)}% người hoạt động đã tương tác - rất tốt!`,
                action: null
            },
            userPostRate30d >= 20 && {
                type: "healthy",
                text: `${userPostRate30d}% người hoạt động đã đăng bài - khỏe mạnh`,
                action: null
            }
        ].filter(Boolean)
    };
}

