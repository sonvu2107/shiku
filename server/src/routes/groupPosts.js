import express from "express";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import Group from "../models/Group.js";
import User from "../models/User.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

// GET /api/groups/:groupId/posts - Lấy bài viết thuộc group
router.get("/:groupId/posts", authRequired, async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const groupId = req.params.groupId;
    
    // Kiểm tra groupId hợp lệ
    if (!groupId || !groupId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "groupId không hợp lệ" });
    }

    // Kiểm tra nhóm có tồn tại không
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: "Không tìm thấy nhóm" });
    }

    // Kiểm tra quyền truy cập nhóm
    const userId = req.user._id;
    const canViewPosts = group.settings.type === 'public' || group.isMember(userId) || group.owner.toString() === userId.toString();
    
    if (!canViewPosts) {
      return res.status(403).json({ error: "Bạn không có quyền xem bài viết trong nhóm này" });
    }

    // Tìm bài viết trong nhóm
    const filter = { group: groupId, status: "published" };
    
    const skip = (Number(page) - 1) * Number(limit);
    const posts = await Post.find(filter)
      .populate("author", "name avatarUrl")
      .populate("group", "name avatar")
      .populate({
        path: "emotes.user",
        select: "name nickname avatarUrl role"
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Thêm số lượng bình luận và saved cho mỗi bài
    // Lưu ý: populate nested paths như emotes.user có thể không hoạt động đúng với .toObject()
    // Nên chúng ta cần populate lại thủ công
    const postIds = posts.map(p => p._id);
    
    // Batch query comment counts
    const commentCounts = await Comment.aggregate([
      { $match: { post: { $in: postIds } } },
      { $group: { _id: "$post", count: { $sum: 1 } } }
    ]);
    const commentCountMap = new Map(
      commentCounts.map(c => [c._id.toString(), c.count])
    );
    
    // Batch query saved counts
    const savedCounts = await User.aggregate([
      { $match: { savedPosts: { $in: postIds } } },
      { $unwind: "$savedPosts" },
      { $match: { savedPosts: { $in: postIds } } },
      { $group: { _id: "$savedPosts", count: { $sum: 1 } } }
    ]);
    const savedCountMap = new Map(
      savedCounts.map(c => [c._id.toString(), c.count])
    );
    
    const itemsWithCommentCount = await Promise.all(posts.map(async post => {
      const postObj = post.toObject();
      const commentCount = commentCountMap.get(post._id.toString()) || 0;
      const savedCount = savedCountMap.get(post._id.toString()) || 0;
      
      // Đảm bảo emotes.user được populate - kiểm tra và populate lại nếu cần
      if (postObj.emotes && Array.isArray(postObj.emotes) && postObj.emotes.length > 0) {
        // Lấy tất cả user IDs từ emotes
        const emoteUserIds = [];
        postObj.emotes.forEach(emote => {
          if (emote && emote.user) {
            let userId = null;
            // Nếu đã được populate (có _id và name), không cần populate lại
            if (typeof emote.user === 'object' && emote.user._id && emote.user.name) {
              // Đã được populate - skip
              return;
            }
            // Nếu chưa được populate, lấy ID
            if (typeof emote.user === 'object' && emote.user._id) {
              userId = emote.user._id.toString();
            } else if (typeof emote.user === 'string') {
              userId = emote.user;
            } else if (emote.user && emote.user.toString) {
              userId = emote.user.toString();
            }
            if (userId) {
              emoteUserIds.push(userId);
            }
          }
        });
        
        // Populate users nếu có
        if (emoteUserIds.length > 0) {
          const uniqueUserIds = [...new Set(emoteUserIds)];
          const users = await User.find({ _id: { $in: uniqueUserIds } })
            .select("name nickname avatarUrl role")
            .lean();
          
          const userMap = new Map();
          users.forEach(u => userMap.set(u._id.toString(), u));
          
          // Populate lại emotes.user
          postObj.emotes = postObj.emotes.map(emote => {
            if (emote && emote.user) {
              // Nếu đã được populate, giữ nguyên
              if (typeof emote.user === 'object' && emote.user._id && emote.user.name) {
                return emote;
              }
              
              // Nếu chưa được populate, populate lại
              let userId = null;
              if (typeof emote.user === 'object' && emote.user._id) {
                userId = emote.user._id.toString();
              } else if (typeof emote.user === 'string') {
                userId = emote.user;
              } else if (emote.user && emote.user.toString) {
                userId = emote.user.toString();
              }
              
              if (userId) {
                const populatedUser = userMap.get(userId);
                if (populatedUser) {
                  return { ...emote, user: populatedUser };
                }
              }
            }
            return emote;
          });
        }
      }
      
      return { ...postObj, commentCount, savedCount };
    }));

    // Đếm tổng số bài viết
    const total = await Post.countDocuments(filter);

    res.json({ 
      items: itemsWithCommentCount, 
      total, 
      page: Number(page),
      pages: Math.ceil(total / Number(limit))
    });
  } catch (e) {
    console.error('Error loading group posts:', e);
    next(e);
  }
});

export default router;
