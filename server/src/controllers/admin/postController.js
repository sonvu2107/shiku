/**
 * Admin Post Controller
 * Quản lý bài viết cho admin: list, delete, bulk delete
 */
import mongoose from "mongoose";
import AuditLog from "../../models/AuditLog.js";
import { getClientAgent } from "../../utils/clientAgent.js";

const Post = mongoose.model('Post');
const Comment = mongoose.model('Comment');

/**
 * GET /api/admin/posts - Lấy danh sách bài viết với pagination, search, filter
 */
export const getPosts = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = "",
            status = "",
            sortBy = "createdAt",
            sortOrder = "desc"
        } = req.query;

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        // Build filter
        const filter = {};

        if (status && ['published', 'private'].includes(status)) {
            filter.status = status;
        }

        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } }
            ];
        }

        // Determine sort
        const sortField = ['createdAt', 'views', 'title'].includes(sortBy) ? sortBy : 'createdAt';
        const sort = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

        const [posts, total] = await Promise.all([
            Post.find(filter)
                .populate('author', 'name nickname avatarUrl email')
                .select('title slug author status views upvoteCount isPinned pinnedAt createdAt')
                .sort(sort)
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Post.countDocuments(filter)
        ]);

        // Add upvote count for response
        const postsWithCount = posts.map(post => ({
            ...post,
            upvoteCount: post.upvoteCount || 0
        }));

        res.json({
            success: true,
            posts: postsWithCount,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('[ADMIN] Get posts error:', error);
        next(error);
    }
};

/**
 * DELETE /api/admin/posts/:id - Xóa một bài viết
 */
export const deletePost = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "ID bài viết không hợp lệ" });
        }

        const post = await Post.findById(id).populate('author', 'name email');
        if (!post) {
            return res.status(404).json({ error: "Không tìm thấy bài viết" });
        }

        // Delete comments
        await Comment.deleteMany({ post: id });

        // Delete post
        await post.deleteOne();

        // Audit log
        await AuditLog.logAction(req.user._id, 'admin_delete_post', {
            targetId: id,
            targetType: 'post',
            result: 'success',
            ipAddress: req.ip,
            clientAgent: getClientAgent(req),
            details: {
                postTitle: post.title,
                authorId: post.author?._id,
                authorName: post.author?.name
            }
        });

        res.json({
            success: true,
            message: "Đã xóa bài viết thành công"
        });
    } catch (error) {
        console.error('[ADMIN] Delete post error:', error);
        next(error);
    }
};

/**
 * POST /api/admin/posts/bulk-delete - Xóa nhiều bài viết
 */
export const bulkDeletePosts = async (req, res, next) => {
    try {
        const { postIds } = req.body;

        if (!Array.isArray(postIds) || postIds.length === 0) {
            return res.status(400).json({ error: "Danh sách bài viết không hợp lệ" });
        }

        // Validate all IDs
        const validIds = postIds.filter(id => mongoose.Types.ObjectId.isValid(id));
        if (validIds.length === 0) {
            return res.status(400).json({ error: "Không có ID hợp lệ" });
        }

        // Limit bulk delete to 100 at a time
        if (validIds.length > 100) {
            return res.status(400).json({ error: "Chỉ có thể xóa tối đa 100 bài viết một lần" });
        }

        // Get posts for audit log
        const posts = await Post.find({ _id: { $in: validIds } })
            .populate('author', 'name')
            .select('title author')
            .lean();

        // Delete comments for all posts
        await Comment.deleteMany({ post: { $in: validIds } });

        // Delete posts
        const deleteResult = await Post.deleteMany({ _id: { $in: validIds } });

        // Audit log
        await AuditLog.logAction(req.user._id, 'admin_bulk_delete_posts', {
            result: 'success',
            ipAddress: req.ip,
            clientAgent: getClientAgent(req),
            details: {
                count: deleteResult.deletedCount,
                postTitles: posts.map(p => p.title).slice(0, 10) // Log first 10 titles
            }
        });

        res.json({
            success: true,
            message: `Đã xóa ${deleteResult.deletedCount} bài viết`,
            deletedCount: deleteResult.deletedCount
        });
    } catch (error) {
        console.error('[ADMIN] Bulk delete posts error:', error);
        next(error);
    }
};

/**
 * GET /api/admin/posts/authors - Lấy danh sách tác giả có bài viết
 */
export const getAuthors = async (req, res, next) => {
    try {
        const authors = await Post.aggregate([
            {
                $group: {
                    _id: "$author",
                    postCount: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "user"
                }
            },
            { $unwind: "$user" },
            {
                $project: {
                    _id: "$user._id",
                    name: "$user.name",
                    nickname: "$user.nickname",
                    avatarUrl: "$user.avatarUrl",
                    email: "$user.email",
                    postCount: 1
                }
            },
            { $sort: { postCount: -1 } },
            { $limit: 100 }
        ]);

        res.json({ success: true, authors });
    } catch (error) {
        console.error('[ADMIN] Get authors error:', error);
        next(error);
    }
};

/**
 * POST /api/admin/posts/delete-by-user - Xóa tất cả bài viết của 1 user
 */
export const deletePostsByUser = async (req, res, next) => {
    try {
        const { userId, count } = req.body;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: "User ID không hợp lệ" });
        }

        // Get user info for audit log
        const User = mongoose.model('User');
        const user = await User.findById(userId).select('name email').lean();
        if (!user) {
            return res.status(404).json({ error: "Không tìm thấy người dùng" });
        }

        // Find posts to delete
        let postsQuery = Post.find({ author: userId }).select('_id');

        // If count specified, limit number of posts to delete
        if (count && count > 0) {
            postsQuery = postsQuery.sort({ createdAt: -1 }).limit(parseInt(count));
        }

        const posts = await postsQuery.lean();
        const postIds = posts.map(p => p._id);

        if (postIds.length === 0) {
            return res.json({
                success: true,
                message: "Người dùng không có bài viết nào",
                deletedCount: 0
            });
        }

        // Delete comments
        await Comment.deleteMany({ post: { $in: postIds } });

        // Delete posts
        const deleteResult = await Post.deleteMany({ _id: { $in: postIds } });

        // Audit log
        await AuditLog.logAction(req.user._id, 'admin_delete_posts_by_user', {
            targetId: userId,
            targetType: 'user',
            result: 'success',
            ipAddress: req.ip,
            clientAgent: getClientAgent(req),
            details: {
                userName: user.name,
                userEmail: user.email,
                deletedCount: deleteResult.deletedCount,
                requestedCount: count || 'all'
            }
        });

        res.json({
            success: true,
            message: `Đã xóa ${deleteResult.deletedCount} bài viết của ${user.name}`,
            deletedCount: deleteResult.deletedCount
        });
    } catch (error) {
        console.error('[ADMIN] Delete posts by user error:', error);
        next(error);
    }
};

/**
 * POST /api/admin/posts/:id/pin - Ghim bài viết lên đầu feed
 */
export const pinPost = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "ID bài viết không hợp lệ" });
        }

        const post = await Post.findById(id).populate('author', 'name email');
        if (!post) {
            return res.status(404).json({ error: "Không tìm thấy bài viết" });
        }

        if (post.isPinned) {
            return res.status(400).json({ error: "Bài viết đã được ghim rồi" });
        }

        // Update post to pinned
        post.isPinned = true;
        post.pinnedAt = new Date();
        post.pinnedBy = req.user._id;
        await post.save();

        // Audit log
        await AuditLog.logAction(req.user._id, 'admin_pin_post', {
            targetId: id,
            targetType: 'post',
            result: 'success',
            ipAddress: req.ip,
            clientAgent: getClientAgent(req),
            details: {
                postTitle: post.title,
                authorId: post.author?._id,
                authorName: post.author?.name
            }
        });

        res.json({
            success: true,
            message: "Đã ghim bài viết thành công",
            post: {
                _id: post._id,
                title: post.title,
                isPinned: post.isPinned,
                pinnedAt: post.pinnedAt
            }
        });
    } catch (error) {
        console.error('[ADMIN] Pin post error:', error);
        next(error);
    }
};

/**
 * POST /api/admin/posts/:id/unpin - Bỏ ghim bài viết
 */
export const unpinPost = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "ID bài viết không hợp lệ" });
        }

        const post = await Post.findById(id).populate('author', 'name email');
        if (!post) {
            return res.status(404).json({ error: "Không tìm thấy bài viết" });
        }

        if (!post.isPinned) {
            return res.status(400).json({ error: "Bài viết chưa được ghim" });
        }

        // Update post to unpinned
        post.isPinned = false;
        post.pinnedAt = null;
        post.pinnedBy = null;
        await post.save();

        // Audit log
        await AuditLog.logAction(req.user._id, 'admin_unpin_post', {
            targetId: id,
            targetType: 'post',
            result: 'success',
            ipAddress: req.ip,
            clientAgent: getClientAgent(req),
            details: {
                postTitle: post.title,
                authorId: post.author?._id,
                authorName: post.author?.name
            }
        });

        res.json({
            success: true,
            message: "Đã bỏ ghim bài viết thành công",
            post: {
                _id: post._id,
                title: post.title,
                isPinned: post.isPinned
            }
        });
    } catch (error) {
        console.error('[ADMIN] Unpin post error:', error);
        next(error);
    }
};
