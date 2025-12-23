/**
 * Friends Routes
 * 
 * Routes xử lý các thao tác liên quan đến bạn bè (friends):
 * - Gửi, chấp nhận, từ chối lời mời kết bạn
 * - Lấy danh sách bạn bè
 * - Hủy kết bạn
 * - Kiểm tra trạng thái bạn bè
 * 
 * @module friends
 */

import express from 'express';
import mongoose from 'mongoose';
import FriendRequest from '../models/FriendRequest.js';
import User from '../models/User.js';
import { authRequired } from '../middleware/auth.js';
import { withCache, userCache, invalidateCacheByPrefix } from '../utils/cache.js';
import { apiLimiter, friendRequestLimiter } from '../middleware/rateLimit.js';
import { responseCache, invalidateByPattern } from '../middleware/responseCache.js';

const router = express.Router();

// Apply rate limiting to all friend routes
router.use(apiLimiter);

/**
 * POST /send-request - Gửi lời mời kết bạn
 * Tạo friend request mới giữa 2 users
 * @param {string} req.body.to - ID của user nhận lời mời
 * @returns {Object} Friend request đã tạo
 */
router.post('/send-request', authRequired, friendRequestLimiter, async (req, res) => {
  try {
    const { to } = req.body; // Đổi từ toUserId thành to
    const fromUserId = req.user._id.toString();

    // Validate required fields
    if (!to) {
      return res.status(400).json({ message: 'Thiếu thông tin người nhận lời mời' });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(to)) {
      return res.status(400).json({ message: 'ID người dùng không hợp lệ' });
    }

    // Không thể gửi lời mời cho chính mình
    if (fromUserId === to) {
      return res.status(400).json({ message: 'Không thể gửi lời mời kết bạn cho chính mình' });
    }

    // Kiểm tra user tồn tại
    const toUser = await User.findById(to);
    if (!toUser) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    // Kiểm tra đã là bạn bè chưa
    const fromUser = await User.findById(fromUserId);
    if (fromUser.friends.includes(to)) {
      return res.status(400).json({ message: 'Đã là bạn bè' });
    }

    // Kiểm tra trạng thái chặn nhau
    const iBlockedTarget = (fromUser.blockedUsers || []).map(id => id.toString()).includes(to);
    const targetBlockedMe = (toUser.blockedUsers || []).map(id => id.toString()).includes(fromUserId);
    if (iBlockedTarget || targetBlockedMe) {
      return res.status(400).json({ message: 'Không thể gửi lời mời do đang chặn nhau' });
    }

    // Kiểm tra đã có lời mời pending chưa (hai chiều)
    const existingPending = await FriendRequest.findOne({
      status: 'pending',
      $or: [
        { from: fromUserId, to: to },
        { from: to, to: fromUserId }
      ]
    });

    if (existingPending) {
      return res.status(400).json({ message: 'Lời mời kết bạn đã tồn tại' });
    }

    // Upsert: nếu đã có record cũ (rejected/accepted) cùng chiều thì đặt lại về pending
    const friendRequest = await FriendRequest.findOneAndUpdate(
      { from: fromUserId, to: to },
      { $set: { status: 'pending', createdAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const populatedRequest = await FriendRequest.findById(friendRequest._id)
      .populate('from', 'name nickname email avatarUrl')
      .populate('to', 'name nickname email avatarUrl');

    res.json({
      message: 'Đã gửi lời mời kết bạn',
      friendRequest: populatedRequest
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /accept-request/:requestId - Chấp nhận lời mời kết bạn
 * Chỉ người nhận mới có thể chấp nhận lời mời
 * @param {string} req.params.requestId - ID của friend request
 * @returns {Object} Friend request đã được chấp nhận
 */
router.post('/accept-request/:requestId', authRequired, async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id.toString(); // Convert to string


    const friendRequest = await FriendRequest.findById(requestId);
    if (!friendRequest) {
      return res.status(404).json({ message: 'Không tìm thấy lời mời' });
    }


    // Chỉ người nhận mới có thể chấp nhận
    if (friendRequest.to.toString() !== userId) {
      return res.status(403).json({ message: 'Không có quyền chấp nhận lời mời này' });
    }

    if (friendRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Lời mời đã được xử lý' });
    }

    // Cập nhật status
    friendRequest.status = 'accepted';
    await friendRequest.save();

    // Thêm vào danh sách bạn bè của cả hai
    await User.findByIdAndUpdate(friendRequest.from, {
      $addToSet: { friends: friendRequest.to }
    });
    await User.findByIdAndUpdate(friendRequest.to, {
      $addToSet: { friends: friendRequest.from }
    });

    const populatedRequest = await FriendRequest.findById(requestId)
      .populate('from', 'name nickname email avatarUrl')
      .populate('to', 'name nickname email avatarUrl');

    res.json({
      message: 'Đã chấp nhận lời mời kết bạn',
      friendRequest: populatedRequest
    });

    // Invalidate friend suggestions cache for both users
    invalidateByPattern('friendsug:*').catch(() => { });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /reject-request/:requestId - Từ chối lời mời kết bạn
 * Chỉ người nhận mới có thể từ chối lời mời
 * @param {string} req.params.requestId - ID của friend request
 * @returns {Object} Thông báo từ chối thành công
 */
router.post('/reject-request/:requestId', authRequired, async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id.toString(); // Convert to string

    const friendRequest = await FriendRequest.findById(requestId);
    if (!friendRequest) {
      return res.status(404).json({ message: 'Không tìm thấy lời mời' });
    }

    // Chỉ người nhận mới có thể từ chối
    if (friendRequest.to.toString() !== userId) {
      return res.status(403).json({ message: 'Không có quyền từ chối lời mời này' });
    }

    friendRequest.status = 'rejected';
    await friendRequest.save();

    res.json({ message: 'Đã từ chối lời mời kết bạn' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /requests - Lấy danh sách lời mời kết bạn
 * Lấy tất cả friend requests pending của user hiện tại
 * @returns {Array} Danh sách friend requests
 */
router.get('/requests', authRequired, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {
      to: userId,
      status: 'pending'
    };

    const [requests, total] = await Promise.all([
      FriendRequest.find(query)
        .populate('from', 'name nickname email avatarUrl isOnline lastSeen')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      FriendRequest.countDocuments(query)
    ]);

    res.json({
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /sent-requests - Lấy danh sách lời mời đã gửi
 * Lấy tất cả friend requests pending mà user hiện tại đã gửi
 * @returns {Array} Danh sách friend requests đã gửi
 */
router.get('/sent-requests', authRequired, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {
      from: userId,
      status: 'pending'
    };

    const [sentRequests, total] = await Promise.all([
      FriendRequest.find(query)
        .populate('to', 'name nickname email avatarUrl isOnline lastSeen')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      FriendRequest.countDocuments(query)
    ]);

    res.json({
      requests: sentRequests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /list - Lấy danh sách bạn bè
 * Lấy tất cả friends của user hiện tại với thông tin online status
 * OPTIMIZED: Removed $facet/$unwind, use simple pagination on IDs + $in lookup
 * @returns {Array} Danh sách bạn bè
 */
router.get('/list', authRequired, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const cacheKey = `friends:list:${userId}:${page}:${limit}`;

    // Cache for 30 seconds
    const data = await withCache(userCache, cacheKey, async () => {
      // Step 1: Get user's friends array (fast, indexed)
      const user = await User.findById(userId).select('friends').lean();
      const friendIds = user?.friends || [];
      const total = friendIds.length;

      if (total === 0) {
        return {
          friends: [],
          pagination: { page, limit, total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false }
        };
      }

      // Step 2: Paginate the IDs in memory
      const start = (page - 1) * limit;
      const paginatedIds = friendIds.slice(start, start + limit);

      if (paginatedIds.length === 0) {
        return {
          friends: [],
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: false, hasPrevPage: page > 1 }
        };
      }

      // Step 3: Query only the needed friends with $in (fast, uses _id index)
      const friends = await User.find({ _id: { $in: paginatedIds } })
        .select('name nickname email avatarUrl isOnline lastSeen')
        .lean();

      // Ensure default values
      const processedFriends = friends.map(friend => ({
        ...friend,
        isOnline: friend.isOnline || false,
        lastSeen: friend.lastSeen || new Date()
      }));

      return {
        friends: processedFriends,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1
        }
      };
    }, 30 * 1000);

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /user/:userId - Lấy danh sách bạn bè của user khác (có pagination)
 * @param {string} req.params.userId - ID của user cần lấy danh sách bạn bè
 * @returns {Array} Danh sách bạn bè
 */
router.get('/user/:userId', authRequired, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id.toString();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    // Check blockage
    const currentUser = await User.findById(currentUserId).select('blockedUsers');
    const targetUser = await User.findById(userId).select('friends blockedUsers privacySettings');

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const iBlockedThem = (currentUser.blockedUsers || []).map(id => id.toString()).includes(userId);
    const theyBlockedMe = (targetUser.blockedUsers || []).map(id => id.toString()).includes(currentUserId);

    if (theyBlockedMe) {
      return res.status(403).json({ message: 'Không thể xem danh sách bạn bè' });
    }

    const cacheKey = `friends:list:${userId}:${page}:${limit}`;

    const data = await withCache(userCache, cacheKey, async () => {
      const result = await User.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(userId) } },
        { $project: { friends: 1 } },
        { $unwind: { path: '$friends', preserveNullAndEmptyArrays: true } },
        { $match: { friends: { $exists: true, $ne: null } } },
        {
          $facet: {
            data: [
              { $skip: (page - 1) * limit },
              { $limit: limit },
              {
                $lookup: {
                  from: 'users',
                  localField: 'friends',
                  foreignField: '_id',
                  as: 'friendData',
                  pipeline: [
                    { $project: { name: 1, nickname: 1, email: 1, avatarUrl: 1, isOnline: 1, lastSeen: 1 } }
                  ]
                }
              },
              { $unwind: '$friendData' },
              { $replaceRoot: { newRoot: '$friendData' } }
            ],
            totalCount: [
              { $count: 'count' }
            ]
          }
        }
      ]);

      const friendsList = result[0]?.data || [];
      const total = result[0]?.totalCount[0]?.count || 0;

      const processedFriends = friendsList.map(friend => ({
        ...friend,
        isOnline: friend.isOnline || false,
        lastSeen: friend.lastSeen || new Date()
      }));

      return {
        friends: processedFriends,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1
        }
      };
    }, 30 * 1000);

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /suggestions - Gợi ý kết bạn
 * Tìm users chưa là bạn bè và chưa có lời mời pending
 * @returns {Array} Danh sách gợi ý kết bạn
 */
router.get('/suggestions', authRequired, responseCache({ ttlSeconds: 60, prefix: 'friendsug', varyByUser: true }), async (req, res) => {
  try {
    const userId = req.user._id.toString(); // Convert to string
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const user = await User.findById(userId);

    // Tìm người dùng không phải bạn bè và không có lời mời pending
    const pendingRequests = await FriendRequest.find({
      $or: [
        { from: userId, status: 'pending' },
        { to: userId, status: 'pending' }
      ]
    });

    const pendingUserIds = pendingRequests.map(req =>
      req.from.toString() === userId ? req.to.toString() : req.from.toString()
    );

    const query = {
      _id: {
        $nin: [...user.friends, userId, ...pendingUserIds]
      }
    };

    const [suggestions, total] = await Promise.all([
      User.find(query)
        .select('name nickname email avatarUrl isOnline lastSeen cultivationCache displayBadgeType')
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(query)
    ]);

    // Ensure all suggestions have default values for isOnline and lastSeen
    const suggestionsWithDefaults = suggestions.map(suggestion => ({
      ...suggestion,
      isOnline: suggestion.isOnline || false,
      lastSeen: suggestion.lastSeen || new Date()
    }));

    res.json({
      suggestions: suggestionsWithDefaults,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * DELETE /cancel-request/:userId - Hủy lời mời kết bạn
 * Xóa friend request đã gửi cho user khác
 * @param {string} req.params.userId - ID của user đã gửi lời mời
 * @returns {Object} Thông báo hủy lời mời thành công
 */
router.delete('/cancel-request/:userId', authRequired, async (req, res) => {
  try {
    const { userId } = req.params;
    const fromUserId = req.user._id.toString();

    // Tìm và xóa friend request đã gửi
    const friendRequest = await FriendRequest.findOneAndDelete({
      from: fromUserId,
      to: userId,
      status: 'pending'
    });

    if (!friendRequest) {
      return res.status(404).json({ message: 'Không tìm thấy lời mời kết bạn' });
    }

    res.json({ message: 'Đã hủy lời mời kết bạn' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * DELETE /remove/:friendId - Bỏ kết bạn
 * Xóa khỏi danh sách bạn bè của cả hai bên
 * @param {string} req.params.friendId - ID của friend cần bỏ
 * @returns {Object} Thông báo bỏ kết bạn thành công
 */
router.delete('/remove/:friendId', authRequired, async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.user._id.toString(); // Convert to string

    // Xóa khỏi danh sách bạn bè của cả hai
    await User.findByIdAndUpdate(userId, {
      $pull: { friends: friendId }
    });
    await User.findByIdAndUpdate(friendId, {
      $pull: { friends: userId }
    });

    // Xóa friend requests liên quan
    await FriendRequest.deleteMany({
      $or: [
        { from: userId, to: friendId },
        { from: friendId, to: userId }
      ]
    });

    res.json({ message: 'Đã bỏ kết bạn' });

    // Invalidate friend suggestions cache for both users
    invalidateByPattern('friendsug:*').catch(() => { });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /search - Tìm kiếm người dùng (toàn hệ thống)
 * Tìm kiếm users theo tên hoặc email
 * @param {string} req.query.q - Từ khóa tìm kiếm
 * @returns {Array} Danh sách users tìm được
 */
router.get('/search', authRequired, async (req, res) => {
  try {
    const { q = '' } = req.query;
    const userId = req.user._id.toString(); // Convert to string

    if (!q.trim()) {
      return res.json({ users: [] });
    }

    // Escape regex special characters
    const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const users = await User.find({
      _id: { $ne: userId },
      $or: [
        { name: { $regex: escapedQuery, $options: 'i' } },
        { email: { $regex: escapedQuery, $options: 'i' } }
      ]
    }).select('name nickname email avatarUrl isOnline lastSeen cultivationCache displayBadgeType')
      .limit(20);

    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /search-friends - Tìm kiếm trong danh sách bạn bè
 * Tìm kiếm trong danh sách friends của user hiện tại
 * @param {string} req.query.q - Từ khóa tìm kiếm
 * @returns {Array} Danh sách friends tìm được
 */
router.get('/search-friends', authRequired, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: "Từ khóa tìm kiếm quá ngắn" });
    }

    const userId = req.user._id.toString();
    const user = await User.findById(userId)
      .populate('friends', 'name nickname email avatarUrl isOnline lastSeen')
      .lean();

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    // Ensure all friends have default values for isOnline and lastSeen
    const friends = (user.friends || []).map(friend => ({
      ...friend,
      isOnline: friend.isOnline || false,
      lastSeen: friend.lastSeen || new Date()
    }));

    // Filter friends by search query
    const filteredFriends = friends.filter(friend =>
      friend.name.toLowerCase().includes(q.toLowerCase()) ||
      friend.email.toLowerCase().includes(q.toLowerCase())
    );

    res.json(filteredFriends);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
