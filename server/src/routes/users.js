import express from 'express';
import User from '../models/User.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();

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

// Tìm kiếm user theo tên hoặc email
router.get('/search', authRequired, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length > 100) return res.json({ users: [] });
    // Escape regex
    const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const users = await User.find({
      $or: [
        { name: { $regex: escapedQ, $options: 'i' } },
        { email: { $regex: escapedQ, $options: 'i' } }
      ]
    })
      .select('_id name avatarUrl bio isOnline lastSeen')
      .limit(10);
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
    console.error('Error updating current conversation:', error);
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
    console.error('Error getting current conversation:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Lấy profile user khác (không bao gồm thông tin nhạy cảm)
router.get('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id)
      .select('-password -email') 
      .populate('friends', 'name avatarUrl isOnline lastSeen');

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    // Kiểm tra quan hệ bạn bè với user hiện tại
    const currentUserId = req.user._id.toString();
    const isFriend = user.friends.some(friend => friend._id.toString() === currentUserId);
    
    console.log('Debug friendship check:', {
      currentUserId,
      targetUserId: id,
      userFriends: user.friends.map(f => f._id.toString()),
      isFriend
    });
    
    // Kiểm tra có lời mời kết bạn pending không
    const FriendRequest = (await import('../models/FriendRequest.js')).default;
    const pendingRequest = await FriendRequest.findOne({
      $or: [
        { from: currentUserId, to: id, status: 'pending' },
        { from: id, to: currentUserId, status: 'pending' }
      ]
    });

    console.log('Debug pending request:', pendingRequest);

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
    // Thêm vào danh sách blockedUsers nếu chưa có
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { blockedUsers: targetId },
      $pull: { friends: targetId } // Nếu là bạn thì hủy kết bạn
    });
    // Nếu muốn 2 chiều, có thể thêm targetId cũng chặn lại req.user._id
    res.json({ message: 'Đã chặn người dùng.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Bỏ chặn user
router.post('/unblock/:id', authRequired, async (req, res) => {
  try {
    const targetId = req.params.id;
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { blockedUsers: targetId }
    });
    res.json({ message: 'Đã bỏ chặn người dùng.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
