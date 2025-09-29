import express from 'express';
import User from '../models/User.js';
import { authRequired } from '../middleware/auth.js';
import { withCache, userCache } from '../utils/cache.js';

const router = express.Router();

// Lấy thông tin nhiều users theo IDs (cho blocked users)
router.post('/batch', authRequired, async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'Danh sách user IDs không hợp lệ' });
    }

    // Giới hạn số lượng để tránh abuse
    if (userIds.length > 50) {
      return res.status(400).json({ message: 'Không thể lấy quá 50 users cùng lúc' });
    }

    const users = await User.find({ _id: { $in: userIds } })
      .select('_id name email avatarUrl bio role isOnline lastSeen isBanned createdAt')
      .lean();

    res.json({ users });
  } catch (error) {
    console.error('Error fetching batch users:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Lấy danh sách tất cả users (chỉ admin)
router.get('/', authRequired, async (req, res) => {
  try {
    // Chỉ admin mới có thể xem danh sách tất cả users
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Chỉ admin mới có quyền xem danh sách users' });
    }

    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query = {
        $or: [
          { name: { $regex: escapedSearch, $options: 'i' } },
          { email: { $regex: escapedSearch, $options: 'i' } }
        ]
      };
    }

    const users = await User.find(query)
      .select('_id name email avatarUrl bio role isOnline lastSeen isBanned createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Tìm kiếm user theo tên hoặc email (with caching)
router.get('/search', authRequired, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length > 100) return res.json({ users: [] });
    
    const cacheKey = `search:${q}`;
    const users = await withCache(userCache, cacheKey, async () => {
      // Escape regex
      const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return await User.find({
        $or: [
          { name: { $regex: escapedQ, $options: 'i' } },
          { email: { $regex: escapedQ, $options: 'i' } }
        ]
      })
        .select('_id name avatarUrl bio isOnline lastSeen')
        .limit(10);
    }, 2 * 60 * 1000); // 2 minutes cache
    
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Lưu conversation hiện tại của user (đặt trước /:id)
router.put('/current-conversation', authRequired, async (req, res) => {
  try {
    const { conversationId } = req.body;
    
    await User.findByIdAndUpdate(req.user._id, {
      currentConversation: conversationId || null
    });

    res.json({ message: 'Đã cập nhật cuộc trò chuyện hiện tại' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Lấy conversation hiện tại của user (đặt trước /:id)
router.get('/current-conversation', authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('currentConversation')
      .populate('currentConversation');

    res.json({ 
      currentConversationId: user.currentConversation?._id || null 
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Lấy profile user khác (không bao gồm thông tin nhạy cảm)
router.get('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id)
      .select('-password -email') 
      .populate('friends', 'name avatarUrl isOnline lastSeen role');

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    // Kiểm tra quan hệ bạn bè với user hiện tại
    const currentUserId = req.user._id.toString();
    const isFriend = user.friends.some(friend => friend._id.toString() === currentUserId);
    
    // Kiểm tra có lời mời kết bạn pending không
    const FriendRequest = (await import('../models/FriendRequest.js')).default;
    const pendingRequest = await FriendRequest.findOne({
      $or: [
        { from: currentUserId, to: id, status: 'pending' },
        { from: id, to: currentUserId, status: 'pending' }
      ]
    });

    // Kiểm tra trạng thái block hai chiều
    const currentUser = await User.findById(currentUserId).select('blockedUsers');
    const iBlockedThem = currentUser.blockedUsers?.map(id => id.toString()).includes(user._id.toString());
    const theyBlockedMe = user.blockedUsers?.map(id => id.toString()).includes(currentUserId);
    res.json({
      user: {
        ...user.toObject(),
        isFriend,
        hasPendingRequest: !!pendingRequest,
        pendingRequestDirection: pendingRequest ? 
          (pendingRequest.from.toString() === currentUserId ? 'sent' : 'received') : null,
        iBlockedThem,
        theyBlockedMe
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Chặn user
router.post('/block/:id', authRequired, async (req, res) => {
  try {
    const targetId = req.params.id;
    if (targetId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Không thể tự chặn bản thân.' });
    }
    
    // Thêm vào danh sách blockedUsers nếu chưa có và xóa khỏi friends của cả hai bên
    const result = await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { blockedUsers: targetId },
      $pull: { friends: targetId } // Nếu là bạn thì hủy kết bạn
    }, { new: true });
    
    // Cũng xóa khỏi danh sách friends của user bị block
    await User.findByIdAndUpdate(targetId, {
      $pull: { friends: req.user._id }
    });
    
    // Xóa mọi friend request giữa hai bên để tránh kẹt trạng thái
    const FriendRequest = (await import('../models/FriendRequest.js')).default;
    await FriendRequest.deleteMany({
      $or: [
        { from: req.user._id, to: targetId },
        { from: targetId, to: req.user._id }
      ]
    });
    
    console.log('Block user result:', {
      userId: req.user._id,
      targetId,
      blockedUsers: result.blockedUsers,
      friends: result.friends
    });
    
    res.json({ message: 'Đã chặn người dùng.' });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({ message: error.message });
  }
});

// Bỏ chặn user
router.post('/unblock/:id', authRequired, async (req, res) => {
  try {
    const targetId = req.params.id;
    
    const result = await User.findByIdAndUpdate(req.user._id, {
      $pull: { blockedUsers: targetId }
    }, { new: true });
    
    console.log('Unblock user result:', {
      userId: req.user._id,
      targetId,
      blockedUsers: result.blockedUsers,
      friends: result.friends
    });
    
    res.json({ message: 'Đã bỏ chặn người dùng.' });
  } catch (error) {
    console.error('Error unblocking user:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
