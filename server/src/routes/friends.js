import express from 'express';
import FriendRequest from '../models/FriendRequest.js';
import User from '../models/User.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();

// Gửi lời mời kết bạn
router.post('/send-request', authRequired, async (req, res) => {
  try {
    const { to } = req.body; // Đổi từ toUserId thành to
    const fromUserId = req.user._id.toString();

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

    // Kiểm tra đã có lời mời chưa
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { from: fromUserId, to: to },
        { from: to, to: fromUserId }
      ]
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'Lời mời kết bạn đã tồn tại' });
    }

    // Tạo lời mời mới
    const friendRequest = new FriendRequest({
      from: fromUserId,
      to: to
    });

    await friendRequest.save();
    
    const populatedRequest = await FriendRequest.findById(friendRequest._id)
      .populate('from', 'name email avatarUrl')
      .populate('to', 'name email avatarUrl');

    res.json({ 
      message: 'Đã gửi lời mời kết bạn',
      friendRequest: populatedRequest
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Chấp nhận lời mời kết bạn
router.post('/accept-request/:requestId', authRequired, async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id.toString(); // Convert to string

    console.log('Accept request debug:', {
      requestId,
      userId,
      userIdType: typeof userId
    });

    const friendRequest = await FriendRequest.findById(requestId);
    if (!friendRequest) {
      return res.status(404).json({ message: 'Không tìm thấy lời mời' });
    }

    console.log('Friend request found:', {
      from: friendRequest.from.toString(),
      to: friendRequest.to.toString(),
      status: friendRequest.status
    });

    // Chỉ người nhận mới có thể chấp nhận
    if (friendRequest.to.toString() !== userId) {
      console.log('Permission denied:', {
        friendRequestTo: friendRequest.to.toString(),
        currentUserId: userId,
        areEqual: friendRequest.to.toString() === userId
      });
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
      .populate('from', 'name email avatarUrl')
      .populate('to', 'name email avatarUrl');

    res.json({ 
      message: 'Đã chấp nhận lời mời kết bạn',
      friendRequest: populatedRequest
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Từ chối lời mời kết bạn
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

// Lấy danh sách lời mời kết bạn
router.get('/requests', authRequired, async (req, res) => {
  try {
    const userId = req.user._id.toString(); // Convert to string

    const requests = await FriendRequest.find({
      to: userId,
      status: 'pending'
    }).populate('from', 'name email avatarUrl isOnline lastSeen')
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Lấy danh sách bạn bè
router.get('/list', authRequired, async (req, res) => {
  try {
    const userId = req.user._id.toString(); // Convert to string
    
    const user = await User.findById(userId)
      .populate('friends', 'name email avatarUrl isOnline lastSeen')
      .lean();

    // Ensure all friends have default values for isOnline and lastSeen
    const friends = (user.friends || []).map(friend => ({
      ...friend,
      isOnline: friend.isOnline || false,
      lastSeen: friend.lastSeen || new Date()
    }));

    res.json({ friends });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Gợi ý kết bạn
router.get('/suggestions', authRequired, async (req, res) => {
  try {
    const userId = req.user._id.toString(); // Convert to string
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

    const suggestions = await User.find({
      _id: { 
        $nin: [...user.friends, userId, ...pendingUserIds] 
      }
    }).select('name email avatarUrl isOnline lastSeen')
      .limit(10)
      .lean();

    // Ensure all suggestions have default values for isOnline and lastSeen
    const suggestionsWithDefaults = suggestions.map(suggestion => ({
      ...suggestion,
      isOnline: suggestion.isOnline || false,
      lastSeen: suggestion.lastSeen || new Date()
    }));

    res.json({ suggestions: suggestionsWithDefaults });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Bỏ kết bạn
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
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Tìm kiếm người dùng (toàn hệ thống)
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
    }).select('name email avatarUrl isOnline lastSeen')
      .limit(20);

    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Tìm kiếm trong danh sách bạn bè
router.get('/search-friends', authRequired, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: "Từ khóa tìm kiếm quá ngắn" });
    }

    const userId = req.user._id.toString();
    const user = await User.findById(userId)
      .populate('friends', 'name email avatarUrl isOnline lastSeen')
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
    console.error("Error searching friends:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
