import User from "../../models/User.js";
import Post from "../../models/Post.js";
import Comment from "../../models/Comment.js";

/**
 * GET /stats - Lấy thống kê tổng quan với phần trăm tăng trưởng
 */
export const getStats = async (req, res, next) => {
    try {
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
                    postCount: 1
                }
            }
        ]);

        const stats = {
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

        res.json({ stats });
    } catch (e) {
        next(e);
    }
};

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
