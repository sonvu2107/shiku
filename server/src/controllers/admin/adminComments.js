/**
 * Admin Comments Controller
 * Các functions quản lý comments cho admin
 */

import mongoose from "mongoose";
import Comment from "../../models/Comment.js";
import Post from "../../models/Post.js";
import AuditLog from "../../models/AuditLog.js";
import { getClientAgent } from "../../utils/clientAgent.js";

/**
 * GET /api/admin/comments
 * Lấy danh sách comments với pagination, search, filters
 */
export async function getComments(req, res, next) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const skip = (page - 1) * limit;
        const { search, authorId, postId, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

        // Build query
        const query = {};

        if (authorId) {
            query.author = new mongoose.Types.ObjectId(authorId);
        }

        if (postId) {
            query.post = new mongoose.Types.ObjectId(postId);
        }

        // Search in content
        if (search) {
            query.$or = [
                { content: { $regex: search, $options: 'i' } }
            ];
        }

        // Sort
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Execute query
        const [comments, total] = await Promise.all([
            Comment.find(query)
                .populate('author', 'name email avatarUrl role')
                .populate('post', 'title slug')
                .sort(sortOptions)
                .skip(skip)
                .limit(limit)
                .lean(),
            Comment.countDocuments(query)
        ]);

        const totalPages = Math.ceil(total / limit);

        res.json({
            success: true,
            comments,
            pagination: {
                page,
                limit,
                total,
                pages: totalPages,
                hasPrevPage: page > 1,
                hasNextPage: page < totalPages
            }
        });
    } catch (error) {
        console.error('[ERROR][ADMIN] Get comments error:', error);
        next(error);
    }
}

/**
 * GET /api/admin/comments/authors
 * Lấy danh sách authors có comments
 */
export async function getCommentAuthors(req, res, next) {
    try {
        const authors = await Comment.aggregate([
            {
                $group: {
                    _id: '$author',
                    commentCount: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'authorInfo'
                }
            },
            { $unwind: '$authorInfo' },
            {
                $project: {
                    _id: 1,
                    name: '$authorInfo.name',
                    email: '$authorInfo.email',
                    avatarUrl: '$authorInfo.avatarUrl',
                    commentCount: 1
                }
            },
            { $sort: { commentCount: -1 } },
            { $limit: 50 }
        ]);

        res.json({ success: true, authors });
    } catch (error) {
        console.error('[ERROR][ADMIN] Get comment authors error:', error);
        next(error);
    }
}

/**
 * DELETE /api/admin/comments/:id
 * Xóa một comment
 */
export async function deleteComment(req, res, next) {
    try {
        const { id } = req.params;

        const comment = await Comment.findById(id).populate('post', 'title').populate('author', 'name');
        if (!comment) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy comment' });
        }

        // Update post commentCount
        if (comment.post) {
            await Post.findByIdAndUpdate(comment.post._id, { $inc: { commentCount: -1 } });
        }

        // Delete comment and its replies
        const deletedCount = await Comment.deleteMany({
            $or: [
                { _id: id },
                { parent: id }
            ]
        });

        // Audit log
        await AuditLog.logAction(req.user._id, 'admin_delete_comment', {
            result: 'success',
            ipAddress: req.ip,
            clientAgent: getClientAgent(req),
            details: {
                commentId: id,
                postTitle: comment.post?.title,
                authorName: comment.author?.name,
                deletedCount: deletedCount.deletedCount
            }
        });

        res.json({
            success: true,
            message: `Đã xóa comment và ${deletedCount.deletedCount - 1} reply liên quan`
        });
    } catch (error) {
        console.error('[ERROR][ADMIN] Delete comment error:', error);
        next(error);
    }
}

/**
 * POST /api/admin/comments/bulk-delete
 * Xóa nhiều comments
 */
export async function bulkDeleteComments(req, res, next) {
    try {
        const { commentIds } = req.body;

        if (!commentIds || !Array.isArray(commentIds) || commentIds.length === 0) {
            return res.status(400).json({ success: false, error: 'Thiếu danh sách comment IDs' });
        }

        // Get comments info for audit
        const comments = await Comment.find({ _id: { $in: commentIds } })
            .populate('post', '_id')
            .lean();

        // Get unique post IDs to update commentCount
        const postIds = [...new Set(comments.map(c => c.post?._id?.toString()).filter(Boolean))];

        // Delete comments and their replies
        const result = await Comment.deleteMany({
            $or: [
                { _id: { $in: commentIds } },
                { parent: { $in: commentIds } }
            ]
        });

        // Update commentCount for affected posts
        for (const postId of postIds) {
            const actualCount = await Comment.countDocuments({ post: postId });
            await Post.findByIdAndUpdate(postId, { commentCount: actualCount });
        }

        // Audit log
        await AuditLog.logAction(req.user._id, 'admin_bulk_delete_comments', {
            result: 'success',
            ipAddress: req.ip,
            clientAgent: getClientAgent(req),
            details: {
                requestedCount: commentIds.length,
                deletedCount: result.deletedCount,
                affectedPosts: postIds.length
            }
        });

        res.json({
            success: true,
            message: `Đã xóa ${result.deletedCount} comments`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('[ERROR][ADMIN] Bulk delete comments error:', error);
        next(error);
    }
}

/**
 * POST /api/admin/comments/delete-by-user
 * Xóa tất cả comments của một user
 */
export async function deleteCommentsByUser(req, res, next) {
    try {
        const { userId, count } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, error: 'Thiếu userId' });
        }

        // Get comments to delete
        let commentsQuery = Comment.find({ author: userId }).select('_id post');
        if (count && count > 0) {
            commentsQuery = commentsQuery.sort({ createdAt: -1 }).limit(count);
        }
        const comments = await commentsQuery.lean();

        if (comments.length === 0) {
            return res.json({ success: true, message: 'Không có comment nào để xóa', deletedCount: 0 });
        }

        const commentIds = comments.map(c => c._id);
        const postIds = [...new Set(comments.map(c => c.post?.toString()).filter(Boolean))];

        // Delete comments and their replies
        const result = await Comment.deleteMany({
            $or: [
                { _id: { $in: commentIds } },
                { parent: { $in: commentIds } }
            ]
        });

        // Update commentCount for affected posts
        for (const postId of postIds) {
            const actualCount = await Comment.countDocuments({ post: postId });
            await Post.findByIdAndUpdate(postId, { commentCount: actualCount });
        }

        // Audit log
        await AuditLog.logAction(req.user._id, 'admin_delete_comments_by_user', {
            result: 'success',
            ipAddress: req.ip,
            clientAgent: getClientAgent(req),
            details: {
                targetUserId: userId,
                deletedCount: result.deletedCount,
                affectedPosts: postIds.length
            }
        });

        res.json({
            success: true,
            message: `Đã xóa ${result.deletedCount} comments của user`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('[ERROR][ADMIN] Delete comments by user error:', error);
        next(error);
    }
}
