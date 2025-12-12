import User from "../../models/User.js";
import Post from "../../models/Post.js";
import AuditLog from "../../models/AuditLog.js";
import { getClientAgent } from "../../utils/clientAgent.js";

/**
 * POST /auto-like-posts - Auto like posts using test accounts
 */
export const autoLikePosts = async (req, res, next) => {
    try {
        const {
            maxPostsPerUser = 10,
            likeProbability = 1,
            selectedUsers = [],
            emoteTypes = ['👍', '❤️', '😂', '😮', '😢', '😡'],
            forceOverride = false
        } = req.body;

        if (!selectedUsers || selectedUsers.length === 0) {
            return res.status(400).json({ error: "Vui lòng chọn ít nhất một tài khoản test" });
        }

        const testUsers = await User.find({
            email: { $in: selectedUsers }
        }).select('_id email name').lean();

        if (testUsers.length === 0) {
            return res.status(404).json({ error: "Không tìm thấy tài khoản test nào" });
        }

        const posts = await Post.find({
            status: 'published',
            $or: [
                { group: null },
                { group: { $exists: false } }
            ]
        })
            .select('_id title emotes')
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        if (posts.length === 0) {
            return res.status(404).json({ error: "Không có bài viết nào để like" });
        }

        let totalLikes = 0;
        const results = [];

        for (const testUser of testUsers) {
            let userLikes = 0;
            let postsProcessed = 0;
            let skippedPosts = 0;

            const shuffledPosts = [...posts].sort(() => Math.random() - 0.5);
            const postsToProcess = shuffledPosts.slice(0, maxPostsPerUser);

            for (const post of postsToProcess) {
                postsProcessed++;

                if (Math.random() > likeProbability) continue;

                const existingEmote = post.emotes?.find(
                    e => e.user?.toString() === testUser._id.toString()
                );

                if (existingEmote && !forceOverride) {
                    skippedPosts++;
                    continue;
                }

                const emoteType = emoteTypes[Math.floor(Math.random() * emoteTypes.length)];

                try {
                    if (forceOverride || !existingEmote) {
                        await Post.updateOne(
                            { _id: post._id },
                            { $pull: { emotes: { user: testUser._id } } }
                        );

                        await Post.updateOne(
                            { _id: post._id },
                            { $push: { emotes: { user: testUser._id, type: emoteType } } }
                        );

                        userLikes++;
                        totalLikes++;
                    }
                } catch (err) {
                    console.error(`[ADMIN] Error liking post ${post._id} for ${testUser.email}:`, err);
                }
            }

            results.push({
                user: testUser.email,
                likesGiven: userLikes,
                postsProcessed,
                skippedPosts,
                viewsGiven: 0
            });
        }

        await AuditLog.logAction(req.user._id, 'admin_auto_like', {
            result: 'success',
            ipAddress: req.ip,
            clientAgent: getClientAgent(req),
            details: {
                action: 'auto_like_posts',
                totalLikes,
                usersProcessed: results.length,
                forceOverride
            }
        });

        res.json({
            success: true,
            message: `Đã thêm ${totalLikes} lượt thích từ ${testUsers.length} tài khoản`,
            totalLikes,
            totalViews: 0,
            usersProcessed: testUsers.length,
            postsAvailable: posts.length,
            results
        });

    } catch (error) {
        console.error('[ADMIN] Auto-like error:', error);
        next(error);
    }
};

/**
 * POST /auto-view-posts - Auto view posts using test accounts
 */
export const autoViewPosts = async (req, res, next) => {
    try {
        const {
            maxViewsPerUser = 10,
            selectedUsers = [],
            loopCount = 1
        } = req.body;

        const actualLoopCount = Math.min(Math.max(1, parseInt(loopCount) || 1), 10);

        if (!selectedUsers || selectedUsers.length === 0) {
            return res.status(400).json({ error: "Vui lòng chọn ít nhất một tài khoản test" });
        }

        const testUsers = await User.find({
            email: { $in: selectedUsers }
        }).select('_id email name').lean();

        if (testUsers.length === 0) {
            return res.status(404).json({ error: "Không tìm thấy tài khoản test nào" });
        }

        const posts = await Post.find({
            status: 'published',
            $or: [
                { group: null },
                { group: { $exists: false } }
            ]
        })
            .select('_id title views')
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        if (posts.length === 0) {
            return res.status(404).json({ error: "Không có bài viết nào để xem" });
        }

        let totalViews = 0;
        const results = [];
        const userViewsMap = new Map();

        for (const testUser of testUsers) {
            userViewsMap.set(testUser.email, { viewsGiven: 0, postsProcessed: 0 });
        }

        for (let loop = 0; loop < actualLoopCount; loop++) {
            for (const testUser of testUsers) {
                const shuffledPosts = [...posts].sort(() => Math.random() - 0.5);
                const postsToProcess = shuffledPosts.slice(0, maxViewsPerUser);

                for (const post of postsToProcess) {
                    try {
                        await Post.updateOne(
                            { _id: post._id },
                            { $inc: { views: 1 } }
                        );

                        const userData = userViewsMap.get(testUser.email);
                        userData.viewsGiven++;
                        userData.postsProcessed++;
                        totalViews++;
                    } catch (err) {
                        console.error(`[ADMIN] Error viewing post ${post._id} for ${testUser.email}:`, err);
                    }
                }
            }
        }

        for (const testUser of testUsers) {
            const userData = userViewsMap.get(testUser.email);
            results.push({
                user: testUser.email,
                likesGiven: 0,
                viewsGiven: userData.viewsGiven,
                postsProcessed: userData.postsProcessed,
                availablePosts: posts.length
            });
        }

        await AuditLog.logAction(req.user._id, 'admin_auto_view', {
            result: 'success',
            ipAddress: req.ip,
            clientAgent: getClientAgent(req),
            details: {
                action: 'auto_view_posts',
                totalViews,
                usersProcessed: results.length,
                loopCount: actualLoopCount
            }
        });

        res.json({
            success: true,
            message: `Đã thêm ${totalViews} lượt xem từ ${testUsers.length} tài khoản (${actualLoopCount} vòng lặp)`,
            totalLikes: 0,
            totalViews,
            usersProcessed: testUsers.length,
            postsAvailable: posts.length,
            loopCount: actualLoopCount,
            results
        });

    } catch (error) {
        console.error('[ADMIN] Auto-view error:', error);
        next(error);
    }
};

/**
 * POST /clear-test-reactions - Xóa tất cả reactions của test users
 */
export const clearTestReactions = async (req, res, next) => {
    try {
        const testUsers = await User.find({
            email: { $regex: /^test\d+@example\.com$/ }
        }).select('_id email').lean();

        if (testUsers.length === 0) {
            return res.status(404).json({ error: "Không tìm thấy tài khoản test nào" });
        }

        const testUserIds = testUsers.map(u => u._id);

        const result = await Post.updateMany(
            {},
            {
                $pull: {
                    emotes: {
                        user: { $in: testUserIds }
                    }
                }
            }
        );

        await AuditLog.logAction(req.user._id, 'admin_auto_like', {
            result: 'success',
            ipAddress: req.ip,
            clientAgent: getClientAgent(req),
            details: {
                action: 'clear_test_reactions',
                testUsersCount: testUsers.length,
                postsModified: result.modifiedCount
            }
        });

        res.json({
            success: true,
            message: `Đã xóa tất cả reactions của ${testUsers.length} tài khoản test khỏi ${result.modifiedCount} posts`,
            testUsersCount: testUsers.length,
            postsModified: result.modifiedCount
        });

    } catch (error) {
        next(error);
    }
};
