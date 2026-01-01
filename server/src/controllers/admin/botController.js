import User from "../../models/User.js";
import Post from "../../models/Post.js";
import Comment from "../../models/Comment.js";
import AuditLog from "../../models/AuditLog.js";
import { getClientAgent } from "../../utils/clientAgent.js";
import geminiService from "../../services/geminiService.js";

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
 * POST /auto-upvote-posts - Auto upvote posts using test accounts (NEW upvote system)
 */
export const autoUpvotePosts = async (req, res, next) => {
    try {
        const {
            maxPostsPerUser = 10,
            selectedUsers = [],
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
            .select('_id title upvotes upvoteCount')
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        if (posts.length === 0) {
            return res.status(404).json({ error: "Không có bài viết nào để upvote" });
        }

        let totalUpvotes = 0;
        const results = [];

        for (const testUser of testUsers) {
            let userUpvotes = 0;
            let postsProcessed = 0;
            let skippedPosts = 0;

            const shuffledPosts = [...posts].sort(() => Math.random() - 0.5);
            const postsToProcess = shuffledPosts.slice(0, maxPostsPerUser);

            for (const post of postsToProcess) {
                postsProcessed++;

                // Check if user already upvoted
                const alreadyUpvoted = post.upvotes?.some(
                    uid => uid?.toString() === testUser._id.toString()
                );

                if (alreadyUpvoted && !forceOverride) {
                    skippedPosts++;
                    continue;
                }

                try {
                    if (!alreadyUpvoted) {
                        // Add upvote
                        await Post.updateOne(
                            { _id: post._id },
                            {
                                $addToSet: { upvotes: testUser._id },
                                $inc: { upvoteCount: 1 }
                            }
                        );
                        userUpvotes++;
                        totalUpvotes++;
                    }
                } catch (err) {
                    console.error(`[ADMIN] Error upvoting post ${post._id} for ${testUser.email}:`, err);
                }
            }

            results.push({
                user: testUser.email,
                upvotesGiven: userUpvotes,
                postsProcessed,
                skippedPosts
            });
        }

        await AuditLog.logAction(req.user._id, 'admin_auto_upvote', {
            result: 'success',
            ipAddress: req.ip,
            clientAgent: getClientAgent(req),
            details: {
                action: 'auto_upvote_posts',
                totalUpvotes,
                usersProcessed: results.length,
                forceOverride
            }
        });

        res.json({
            success: true,
            message: `Đã thêm ${totalUpvotes} upvotes từ ${testUsers.length} tài khoản`,
            totalUpvotes,
            usersProcessed: testUsers.length,
            postsAvailable: posts.length,
            results
        });

    } catch (error) {
        console.error('[ADMIN] Auto-upvote error:', error);
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

/**
 * POST /auto-comment-posts - Auto comment posts using test accounts and Gemini AI
 * Comments are generated based on post title for natural conversation
 */
export const autoCommentPosts = async (req, res, next) => {
    try {
        const {
            maxCommentsPerUser = 5,
            selectedUsers = [],
            commentStyle = 'friendly' // friendly, curious, supportive, humorous
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

        // Get recent posts that haven't been commented by test users too much
        const posts = await Post.find({
            status: 'published',
            $or: [
                { group: null },
                { group: { $exists: false } }
            ]
        })
            .select('_id title content author')
            .populate('author', 'name')
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        if (posts.length === 0) {
            return res.status(404).json({ error: "Không có bài viết nào để comment" });
        }

        // Style prompts for different comment styles
        const stylePrompts = {
            friendly: 'Viết như một người bạn thân thiện, sử dụng ngôn ngữ tự nhiên, có thể dùng emoji nhẹ nhàng.',
            curious: 'Viết như một người tò mò, đặt câu hỏi hoặc muốn tìm hiểu thêm về nội dung.',
            supportive: 'Viết như một người ủng hộ, khích lệ, động viên tác giả.',
            humorous: 'Viết hài hước nhẹ nhàng, có thể dùng wordplay, nhưng không châm chọc.'
        };

        const styleInstruction = stylePrompts[commentStyle] || stylePrompts.friendly;

        // Rate limiting: Gemini free tier allows 5 requests/minute
        // So we need at least 12-15 seconds between requests
        const DELAY_BETWEEN_REQUESTS = 15000; // 15 seconds
        const MAX_TOTAL_COMMENTS = 4; // Max comments per run to avoid timeout

        let totalComments = 0;
        let totalErrors = 0;
        const results = [];
        const generatedComments = [];

        for (const testUser of testUsers) {
            // Stop if we've reached max comments
            if (totalComments >= MAX_TOTAL_COMMENTS) {
                results.push({
                    user: testUser.email,
                    commentsGiven: 0,
                    postsProcessed: 0,
                    skippedPosts: 0,
                    errors: 0,
                    note: 'Đã đạt giới hạn comment'
                });
                continue;
            }

            let userComments = 0;
            let postsProcessed = 0;
            let skippedPosts = 0;
            let errors = 0;

            // Shuffle and pick posts
            const shuffledPosts = [...posts].sort(() => Math.random() - 0.5);
            const postsToProcess = shuffledPosts.slice(0, maxCommentsPerUser);

            for (const post of postsToProcess) {
                // Stop if we've reached max comments
                if (totalComments >= MAX_TOTAL_COMMENTS) {
                    break;
                }

                postsProcessed++;

                // Skip if commenting on own post
                if (post.author?._id?.toString() === testUser._id.toString()) {
                    skippedPosts++;
                    continue;
                }

                // Check if this user already commented on this post
                const existingComment = await Comment.findOne({
                    post: post._id,
                    author: testUser._id
                }).lean();

                if (existingComment) {
                    skippedPosts++;
                    continue;
                }

                try {
                    // Generate comment using Gemini AI
                    const prompt = `Dựa trên tiêu đề bài viết: "${post.title}"

${styleInstruction}

Yêu cầu:
- Viết MỘT bình luận ngắn gọn (15-40 từ) bằng tiếng Việt
- Không nhắc lại tiêu đề
- Không dùng "Bài viết", "Tiêu đề"
- Tự nhiên như người thật viết
- Có thể dùng 1-2 emoji phù hợp
- Không cần lời chào, đi thẳng vào nội dung

Chỉ trả về nội dung bình luận, không giải thích gì thêm.`;

                    console.log(`[ADMIN] Generating AI comment for post: ${post.title.slice(0, 30)}...`);
                    const response = await geminiService.sendSimpleMessage(prompt);

                    if (!response?.success || !response.text) {
                        errors++;
                        totalErrors++;
                        continue;
                    }

                    // Clean up the comment
                    let commentContent = response.text.trim();
                    // Remove markdown quotes if present
                    commentContent = commentContent.replace(/^["'`]|["'`]$/g, '');
                    // Remove "Bình luận:" prefix if AI added it
                    commentContent = commentContent.replace(/^(Bình luận|Comment):\s*/i, '');

                    // Skip if comment is too short or too long
                    if (commentContent.length < 10 || commentContent.length > 500) {
                        errors++;
                        totalErrors++;
                        continue;
                    }

                    // Create the comment
                    await Comment.create({
                        post: post._id,
                        author: testUser._id,
                        content: commentContent
                    });

                    // Update post comment count
                    await Post.updateOne(
                        { _id: post._id },
                        {
                            $inc: { commentCount: 1 },
                            latestCommentAt: new Date()
                        }
                    );

                    userComments++;
                    totalComments++;
                    generatedComments.push({
                        postTitle: post.title.slice(0, 50),
                        comment: commentContent.slice(0, 100),
                        user: testUser.name || testUser.email
                    });

                    console.log(`[ADMIN] Created comment #${totalComments}: "${commentContent.slice(0, 50)}..."`);

                    // Rate limit delay: 15 seconds to stay within 5 requests/minute
                    if (totalComments < MAX_TOTAL_COMMENTS) {
                        console.log(`[ADMIN] Waiting ${DELAY_BETWEEN_REQUESTS / 1000}s for rate limit...`);
                        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
                    }

                } catch (err) {
                    console.error(`[ADMIN] Error commenting on post ${post._id}:`, err.message);
                    errors++;
                    totalErrors++;

                    // If rate limited, wait longer before next attempt
                    if (err.message?.includes('429') || err.message?.includes('quota')) {
                        console.log(`[ADMIN] Rate limited! Waiting 60s...`);
                        await new Promise(resolve => setTimeout(resolve, 60000));
                    }
                }
            }

            results.push({
                user: testUser.email,
                commentsGiven: userComments,
                postsProcessed,
                skippedPosts,
                errors
            });
        }

        await AuditLog.logAction(req.user._id, 'admin_auto_comment', {
            result: 'success',
            ipAddress: req.ip,
            clientAgent: getClientAgent(req),
            details: {
                action: 'auto_comment_posts',
                totalComments,
                usersProcessed: results.length,
                commentStyle
            }
        });

        res.json({
            success: true,
            message: `Đã thêm ${totalComments} bình luận AI từ ${testUsers.length} tài khoản`,
            totalComments,
            usersProcessed: testUsers.length,
            postsAvailable: posts.length,
            commentStyle,
            results,
            sampleComments: generatedComments.slice(0, 5) // Show first 5 samples
        });

    } catch (error) {
        console.error('[ADMIN] Auto-comment error:', error);
        next(error);
    }
};
