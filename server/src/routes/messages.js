import express from "express";
import mongoose from "mongoose";
import { authRequired } from "../middleware/auth.js";
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import User from "../models/User.js";
import { v2 as cloudinary } from "cloudinary";

const router = express.Router();

console.log("🚀 Messages routes loaded");

// Helper function to check if user has access to conversation
const checkConversationAccess = (userId) => ({
  participants: {
    $elemMatch: {
      user: userId,
      leftAt: null
    }
  }
});

// Get all conversations for user
router.get("/conversations", authRequired, async (req, res) => {
  console.log("🔥 GET /conversations called for user:", req.user._id);
  
  // Disable cache
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  
  try {
    const conversations = await Conversation.find({
      participants: {
        $elemMatch: {
          user: req.user._id,
          leftAt: null
        }
      },
      isActive: true
    })
    .populate('participants.user', 'name avatarUrl')
    .populate('lastMessage')
    .sort({ lastActivity: -1 });

    console.log("🔥 Found conversations:", conversations.length);

    // Format conversations with unread count
    const formattedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversation: conv._id,
          'readBy.user': { $ne: req.user._id },
          sender: { $ne: req.user._id }
        });

        const otherParticipants = conv.participants.filter(
          p => p.user._id.toString() !== req.user._id.toString() && !p.leftAt
        );

        return {
          _id: conv._id,
          conversationType: conv.conversationType,
          groupName: conv.groupName,
          groupAvatar: conv.groupAvatar,
          participants: conv.participants,
          otherParticipants,
          lastMessage: conv.lastMessage,
          lastActivity: conv.lastActivity,
          unreadCount,
          createdAt: conv.createdAt
        };
      })
    );

    console.log("🔥 Formatted conversations:", formattedConversations.length);
    res.json({ conversations: formattedConversations });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Get messages for a conversation with pagination
router.get("/conversations/:conversationId/messages", authRequired, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50, before } = req.query;

    // Check if user is participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: {
        $elemMatch: {
          user: req.user._id,
          leftAt: null
        }
      }
    });

    if (!conversation) {
      return res.status(403).json({ message: "Không có quyền truy cập cuộc trò chuyện này" });
    }

    // Build query
    let query = {
      conversation: conversationId,
      isDeleted: false
    };

    // If before timestamp is provided, get messages before that time
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate('sender', 'name avatarUrl')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Get total count for pagination info
    const totalMessages = await Message.countDocuments({
      conversation: conversationId,
      isDeleted: false
    });

    // Mark messages as read for current user
    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: req.user._id },
        'readBy.user': { $ne: req.user._id }
      },
      {
        $push: {
          readBy: {
            user: req.user._id,
            readAt: new Date()
          }
        }
      }
    );

    res.json({
      messages: messages.reverse(),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalMessages / parseInt(limit)),
        totalMessages,
        hasMore: messages.length === parseInt(limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Send a message
router.post("/conversations/:conversationId/messages", authRequired, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, messageType = 'text', emote } = req.body;

    // Check if user is participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: {
        $elemMatch: {
          user: req.user._id,
          leftAt: null
        }
      }
    }).populate('participants.user', 'blockedUsers');

    if (!conversation) {
      return res.status(403).json({ message: "Không có quyền truy cập cuộc trò chuyện này" });
    }

    // Kiểm tra block giữa các thành viên (chỉ cho phép gửi nếu không ai block nhau)
    const currentUser = await User.findById(req.user._id).select('blockedUsers');
    const otherParticipants = conversation.participants.filter(p => p.user._id.toString() !== req.user._id.toString());
    for (const p of otherParticipants) {
      const iBlockedThem = currentUser.blockedUsers?.map(id => id.toString()).includes(p.user._id.toString());
      const theyBlockedMe = p.user.blockedUsers?.map(id => id.toString()).includes(req.user._id.toString());
      if (iBlockedThem || theyBlockedMe) {
        return res.status(403).json({ message: "Bạn hoặc người này đã chặn nhau, không thể gửi tin nhắn." });
      }
    }

    const messageData = {
      content,
      sender: req.user._id,
      conversation: conversationId,
      messageType,
      readBy: [{
        user: req.user._id,
        readAt: new Date()
      }]
    };

    if (messageType === 'emote' && emote) {
      messageData.emote = emote;
    }

    const message = new Message(messageData);
    await message.save();
    await message.populate('sender', 'name avatarUrl');

    // Update conversation last message and activity
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      lastActivity: new Date()
    });

    // Emit realtime message to conversation room
    const io = req.app.get('io');
    console.log('🔥 Emitting new-message to room:', `conversation-${conversationId}`);
    console.log('🔥 Message data:', message);
    io.to(`conversation-${conversationId}`).emit('new-message', message);

    res.status(201).json(message);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Upload image message
router.post("/conversations/:conversationId/messages/image", authRequired, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { image, content = '' } = req.body;

    // Check if user is participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      ...checkConversationAccess(req.user._id)
    });

    if (!conversation) {
      return res.status(403).json({ message: "Không có quyền truy cập cuộc trò chuyện này" });
    }

    // Upload image to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(image, {
      folder: "chat",
      transformation: [
        { width: 800, height: 600, crop: "limit" },
        { quality: "auto" }
      ]
    });

    const message = new Message({
      content: content || 'Đã gửi một hình ảnh',
      sender: req.user._id,
      conversation: conversationId,
      messageType: 'image',
      imageUrl: uploadResult.secure_url,
      readBy: [{
        user: req.user._id,
        readAt: new Date()
      }]
    });

    await message.save();
    await message.populate('sender', 'name avatarUrl');

    // Update conversation last message and activity
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      lastActivity: new Date()
    });

    // Emit realtime message to conversation room
    const io = req.app.get('io');
    io.to(`conversation-${conversationId}`).emit('new-message', message);

    res.status(201).json(message);
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Create private conversation
router.post("/conversations/private", authRequired, async (req, res) => {
  console.log("🔥 POST /conversations/private called with body:", req.body);
  console.log("🔥 User:", req.user);
  try {
    const { recipientId } = req.body;

    if (recipientId === req.user._id) {
      return res.status(400).json({ message: "Không thể tạo cuộc trò chuyện với chính mình" });
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    // Check if conversation already exists
    const existingConversation = await Conversation.findOne({
      conversationType: 'private',
      'participants.user': { $all: [req.user._id, recipientId] },
      'participants.leftAt': null
    });

    if (existingConversation) {
      return res.json(existingConversation);
    }

    // Create new private conversation
    const conversation = new Conversation({
      participants: [
        { user: req.user._id, role: 'member' },
        { user: recipientId, role: 'member' }
      ],
      conversationType: 'private',
      createdBy: req.user._id
    });

    await conversation.save();
    await conversation.populate('participants.user', 'name avatarUrl');

    // Format response similar to getConversations
    const otherParticipants = conversation.participants.filter(
      p => p.user._id.toString() !== req.user._id.toString() && !p.leftAt
    );

    const formattedConversation = {
      _id: conversation._id,
      conversationType: conversation.conversationType,
      groupName: conversation.groupName,
      groupAvatar: conversation.groupAvatar,
      participants: conversation.participants,
      otherParticipants,
      lastMessage: null,
      lastActivity: conversation.createdAt,
      unreadCount: 0,
      createdAt: conversation.createdAt
    };

    res.status(201).json(formattedConversation);
  } catch (error) {
    console.error("Error creating private conversation:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Create group conversation
router.post("/conversations/group", authRequired, async (req, res) => {
  try {
    const { participantIds, groupName } = req.body;

    if (!participantIds || participantIds.length < 1) {
      return res.status(400).json({ message: "Cần ít nhất 1 người tham gia" });
    }

    if (!groupName || groupName.trim().length === 0) {
      return res.status(400).json({ message: "Tên nhóm không được để trống" });
    }

    // Include creator in participants
    const allParticipantIds = [req.user._id, ...participantIds.filter(id => id !== req.user._id)];

    // Verify all participants exist
    const users = await User.find({ _id: { $in: allParticipantIds } });
    if (users.length !== allParticipantIds.length) {
      return res.status(400).json({ message: "Một số người dùng không tồn tại" });
    }

    const participants = allParticipantIds.map(userId => ({
      user: userId,
      role: userId === req.user._id ? 'admin' : 'member'
    }));

    const conversation = new Conversation({
      participants,
      conversationType: 'group',
      groupName: groupName.trim(),
      createdBy: req.user._id
    });

    await conversation.save();
    await conversation.populate('participants.user', 'name avatarUrl');

    // Format response similar to getConversations
    const otherParticipants = conversation.participants.filter(
      p => p.user._id.toString() !== req.user._id.toString() && !p.leftAt
    );

    const formattedConversation = {
      _id: conversation._id,
      conversationType: conversation.conversationType,
      groupName: conversation.groupName,
      groupAvatar: conversation.groupAvatar,
      participants: conversation.participants,
      otherParticipants,
      lastMessage: null,
      lastActivity: conversation.createdAt,
      unreadCount: 0,
      createdAt: conversation.createdAt
    };

    res.status(201).json(formattedConversation);
  } catch (error) {
    console.error("Error creating group conversation:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Add participants to group
router.post("/conversations/:conversationId/participants", authRequired, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { participantIds } = req.body;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      conversationType: 'group',
      'participants.user': req.user._id,
      'participants.leftAt': null
    });

    if (!conversation) {
      return res.status(403).json({ message: "Bạn không có quyền truy cập nhóm này" });
    }

    // Check if user has permission to add members
    const userParticipant = conversation.participants.find(p => 
      p.user.toString() === req.user._id.toString() && !p.leftAt
    );
    
    if (!userParticipant) {
      return res.status(403).json({ message: "Bạn không có quyền truy cập nhóm này" });
    }
    
    const canAddMembers = userParticipant.role === 'admin' || (conversation.allowMemberManagement === true);
    
    console.log('🔥 Add member check:', {
      userId: req.user._id,
      userRole: userParticipant.role,
      allowMemberManagement: conversation.allowMemberManagement,
      canAddMembers
    });
    
    if (!canAddMembers) {
      return res.status(403).json({ message: "Bạn không có quyền thêm thành viên" });
    }

    // Verify participants exist and aren't already in conversation
    const activeParticipantIds = conversation.participants
      .filter(p => !p.leftAt)
      .map(p => p.user.toString());
    
    console.log('🔥 Active participant IDs:', activeParticipantIds);
    console.log('🔥 Requested participant IDs:', participantIds);
    
    // Check for users who left but can be re-added
    const leftParticipants = conversation.participants.filter(p => p.leftAt);
    const leftParticipantIds = leftParticipants.map(p => p.user.toString());
    
    console.log('🔥 Left participant IDs:', leftParticipantIds);
    
    // Separate new users from users to re-add
    const reAddParticipantIds = participantIds.filter(id => leftParticipantIds.includes(id.toString()));
    const newParticipantIds = participantIds.filter(id => 
      !activeParticipantIds.includes(id.toString()) && 
      !leftParticipantIds.includes(id.toString())
    );
    
    console.log('🔥 New participant IDs to add:', newParticipantIds);
    console.log('🔥 Re-add participant IDs:', reAddParticipantIds);

    if (newParticipantIds.length === 0 && reAddParticipantIds.length === 0) {
      return res.status(400).json({ message: "Tất cả người dùng đã có trong nhóm" });
    }

    // Verify only new users exist (re-add users already exist in conversation)
    if (newParticipantIds.length > 0) {
      const users = await User.find({ _id: { $in: newParticipantIds } });
      console.log('🔥 New user IDs to verify:', newParticipantIds);
      console.log('🔥 Found new users:', users.map(u => u._id.toString()));
      console.log('🔥 Expected count:', newParticipantIds.length, 'Found count:', users.length);
      
      if (users.length !== newParticipantIds.length) {
        return res.status(400).json({ message: "Một số người dùng không tồn tại" });
      }
    }
    
    // For re-add users, just verify they exist (they should since they were in conversation before)
    if (reAddParticipantIds.length > 0) {
      const reAddUsers = await User.find({ _id: { $in: reAddParticipantIds } });
      console.log('🔥 Re-add user IDs to verify:', reAddParticipantIds);
      console.log('🔥 Found re-add users:', reAddUsers.map(u => u._id.toString()));
      
      if (reAddUsers.length !== reAddParticipantIds.length) {
        return res.status(400).json({ message: "Một số người dùng không tồn tại" });
      }
    }

    // Add new participants
    if (newParticipantIds.length > 0) {
      const newParticipants = newParticipantIds.map(userId => ({
        user: userId,
        role: 'member',
        joinedAt: new Date()
      }));

      await Conversation.findByIdAndUpdate(conversationId, {
        $push: { participants: { $each: newParticipants } },
        lastActivity: new Date()
      });
    }

    // Re-add participants who left (remove their leftAt timestamp)
    if (reAddParticipantIds.length > 0) {
      console.log('🔥 Re-adding participants:', reAddParticipantIds);
      
      const result = await Conversation.findByIdAndUpdate(conversationId, {
        $set: {
          'participants.$[elem].leftAt': null,
          'participants.$[elem].joinedAt': new Date(),
          lastActivity: new Date()
        }
      }, {
        arrayFilters: [{ 'elem.user': { $in: reAddParticipantIds.map(id => new mongoose.Types.ObjectId(id)) }, 'elem.leftAt': { $ne: null } }],
        new: true
      });
      
      console.log('🔥 Re-add update result:', result ? 'success' : 'failed');
    }

    // Create system messages for added participants
    const allAddedUserIds = [...newParticipantIds, ...reAddParticipantIds];
    if (allAddedUserIds.length > 0) {
      const addedUsers = await User.find({ _id: { $in: allAddedUserIds } }).select('name');
      const adderUser = await User.findById(req.user._id).select('name');
      
      for (const user of addedUsers) {
        const systemMessage = new Message({
          content: `${adderUser.name} đã thêm ${user.name} vào nhóm`,
          conversation: conversationId,
          messageType: 'system',
          sender: null, // System message
          createdAt: new Date()
        });
        
        await systemMessage.save();
        
        // Populate conversation before emitting
        await systemMessage.populate('conversation');
        
        // Emit system message to conversation room with proper structure
        const io = req.app.get('io');
        const messageData = {
          ...systemMessage.toObject(),
          conversationId: conversationId // Add conversationId field for frontend
        };
        io.to(`conversation-${conversationId}`).emit('new-message', messageData);
      }
      
      // Update conversation last activity
      await Conversation.findByIdAndUpdate(conversationId, {
        lastActivity: new Date()
      });
    }

    res.json({ message: "Đã thêm thành viên thành công" });
  } catch (error) {
    console.error("Error adding participants:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Update group name
router.put("/conversations/:conversationId/name", authRequired, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { groupName } = req.body;

    if (!groupName || groupName.trim().length === 0) {
      return res.status(400).json({ message: "Tên nhóm không được để trống" });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      conversationType: 'group',
      'participants.user': req.user._id,
      'participants.leftAt': null
    });

    if (!conversation) {
      return res.status(403).json({ message: "Bạn không có quyền truy cập nhóm này" });
    }

    // Check if user has permission to change group name
    const userParticipant = conversation.participants.find(p => 
      p.user.toString() === req.user._id.toString() && !p.leftAt
    );
    
    if (!userParticipant) {
      return res.status(403).json({ message: "Bạn không có quyền truy cập nhóm này" });
    }
    
    const canChangeName = userParticipant.role === 'admin' || (conversation.allowMemberManagement === true);
    
    console.log('🔥 Change name check:', {
      userId: req.user._id,
      userRole: userParticipant.role,
      allowMemberManagement: conversation.allowMemberManagement,
      canChangeName
    });
    
    if (!canChangeName) {
      return res.status(403).json({ message: "Bạn không có quyền đổi tên nhóm" });
    }

    const oldName = conversation.groupName;
    
    await Conversation.findByIdAndUpdate(conversationId, {
      groupName: groupName.trim(),
      lastActivity: new Date()
    });

    // Create system message
    const changerUser = await User.findById(req.user._id).select('name');
    
    const systemMessage = new Message({
      content: `${changerUser.name} đã đổi tên nhóm từ "${oldName}" thành "${groupName.trim()}"`,
      conversation: conversationId,
      messageType: 'system',
      sender: null,
      createdAt: new Date()
    });
    
    await systemMessage.save();
    
    // Emit system message
    const io = req.app.get('io');
    io.to(`conversation-${conversationId}`).emit('new-message', systemMessage);

    res.json({ message: "Đã cập nhật tên nhóm thành công" });
  } catch (error) {
    console.error("Error updating group name:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Update nickname in conversation
router.put("/conversations/:conversationId/nickname", authRequired, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId, nickname } = req.body;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.user': req.user._id
    });

    if (!conversation) {
      return res.status(403).json({ message: "Không có quyền truy cập cuộc trò chuyện này" });
    }

    // Update nickname
    await Conversation.findOneAndUpdate(
      {
        _id: conversationId,
        'participants.user': userId
      },
      {
        $set: { 'participants.$.nickname': nickname || null },
        lastActivity: new Date()
      }
    );

    res.json({ message: "Đã cập nhật biệt danh thành công" });
  } catch (error) {
    console.error("Error updating nickname:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Change participant role (admin only)
router.put("/conversations/:conversationId/participants/:userId/role", authRequired, async (req, res) => {
  try {
    const { conversationId, userId } = req.params;
    const { role } = req.body;

    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ message: "Quyền không hợp lệ" });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      conversationType: 'group',
      'participants.user': req.user._id,
      'participants.leftAt': null,
      'participants.role': 'admin'
    });

    if (!conversation) {
      return res.status(403).json({ message: "Chỉ quản trị viên mới có thể thay đổi quyền" });
    }

    // Cannot change own role
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: "Không thể thay đổi quyền của chính mình" });
    }

    // Update participant role
    const updateResult = await Conversation.findOneAndUpdate(
      {
        _id: conversationId,
        'participants.user': userId,
        'participants.leftAt': null
      },
      {
        $set: { 'participants.$.role': role },
        lastActivity: new Date()
      },
      { new: true }
    );

    if (!updateResult) {
      return res.status(404).json({ message: "Không tìm thấy thành viên" });
    }

    // Create system message
    const changedUser = await User.findById(userId).select('name');
    const adminUser = await User.findById(req.user._id).select('name');
    
    const roleText = role === 'admin' ? 'quản trị viên' : 'thành viên';
    const systemMessage = new Message({
      content: `${adminUser.name} đã đặt ${changedUser.name} làm ${roleText}`,
      conversation: conversationId,
      messageType: 'system',
      sender: null,
      createdAt: new Date()
    });
    
    await systemMessage.save();
    
    // Emit system message
    const io = req.app.get('io');
    io.to(`conversation-${conversationId}`).emit('new-message', systemMessage);

    res.json({ message: `Đã thay đổi quyền thành ${roleText}` });
  } catch (error) {
    console.error("Error changing participant role:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Toggle member management permission (admin only)
router.put("/conversations/:conversationId/member-management", authRequired, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { allowMemberManagement } = req.body;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      conversationType: 'group',
      'participants.user': req.user._id,
      'participants.leftAt': null,
      'participants.role': 'admin'
    });

    if (!conversation) {
      return res.status(403).json({ message: "Chỉ quản trị viên mới có thể thay đổi cài đặt này" });
    }

    await Conversation.findByIdAndUpdate(conversationId, {
      allowMemberManagement: allowMemberManagement,
      lastActivity: new Date()
    });

    // Create system message
    const adminUser = await User.findById(req.user._id).select('name');
    const statusText = allowMemberManagement ? 'cho phép' : 'không cho phép';
    
    const systemMessage = new Message({
      content: `${adminUser.name} đã ${statusText} thành viên thêm người vào nhóm`,
      conversation: conversationId,
      messageType: 'system',
      sender: null,
      createdAt: new Date()
    });
    
    await systemMessage.save();
    
    // Emit system message
    const io = req.app.get('io');
    io.to(`conversation-${conversationId}`).emit('new-message', systemMessage);

    res.json({ message: `Đã ${statusText} thành viên quản lý nhóm` });
  } catch (error) {
    console.error("Error updating member management setting:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Leave conversation
router.post("/conversations/:conversationId/leave", authRequired, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.user': req.user._id,
      'participants.leftAt': null
    });

    if (!conversation) {
      return res.status(403).json({ message: "Không có quyền truy cập cuộc trò chuyện này" });
    }

    console.log('🚪 User leaving conversation:', {
      userId: req.user._id,
      conversationId,
      participantsBefore: conversation.participants.map(p => ({
        userId: p.user,
        leftAt: p.leftAt
      }))
    });

    // Update ALL participant records for this user (in case there are duplicates)
    const updateResult = await Conversation.updateMany(
      {
        _id: conversationId,
        'participants.user': req.user._id,
        'participants.leftAt': null
      },
      {
        $set: { 
          'participants.$.leftAt': new Date(),
          lastActivity: new Date()
        }
      }
    );

    console.log('🚪 Leave conversation update result:', updateResult);

    // Create system message for user leaving
    if (updateResult.modifiedCount > 0) {
      const leavingUser = await User.findById(req.user._id).select('name');
      
      const systemMessage = new Message({
        content: `${leavingUser.name} đã rời khỏi nhóm`,
        conversation: conversationId,
        messageType: 'system',
        sender: null, // System message
        createdAt: new Date()
      });
      
      await systemMessage.save();
      
      // Emit system message to conversation room
      const io = req.app.get('io');
      io.to(`conversation-${conversationId}`).emit('new-message', systemMessage);
      
      // Update conversation last activity
      await Conversation.findByIdAndUpdate(conversationId, {
        lastActivity: new Date()
      });
    }

    res.json({ message: "Đã rời khỏi cuộc trò chuyện" });
  } catch (error) {
    console.error("Error leaving conversation:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Search users for creating conversations
router.get("/users/search", authRequired, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: "Từ khóa tìm kiếm quá ngắn" });
    }

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        {
          $or: [
            { name: { $regex: q.trim(), $options: 'i' } },
            { email: { $regex: q.trim(), $options: 'i' } }
          ]
        }
      ]
    })
    .select('name email avatarUrl')
    .limit(20);

    res.json(users);
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Update conversation
// Update group avatar
router.put("/conversations/:conversationId/avatar", authRequired, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { groupAvatar } = req.body;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      conversationType: 'group',
      'participants.user': req.user._id,
      'participants.leftAt': null
    });

    if (!conversation) {
      return res.status(403).json({ message: "Bạn không có quyền truy cập nhóm này" });
    }

    await Conversation.findByIdAndUpdate(conversationId, {
      groupAvatar,
      lastActivity: new Date()
    });

    res.json({ message: "Cập nhật avatar nhóm thành công" });
  } catch (error) {
    console.error("Error updating group avatar:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Get conversation details with member count
router.get("/conversations/:conversationId/details", authRequired, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.user': req.user._id,
      'participants.leftAt': null
    })
    .populate('participants.user', 'name avatarUrl')
    .populate('createdBy', 'name avatarUrl');

    if (!conversation) {
      return res.status(403).json({ message: "Không có quyền truy cập cuộc trò chuyện này" });
    }

    const activeParticipants = conversation.participants.filter(p => !p.leftAt);
    const memberCount = activeParticipants.length;

    res.json({
      _id: conversation._id,
      conversationType: conversation.conversationType,
      groupName: conversation.groupName,
      groupAvatar: conversation.groupAvatar,
      groupDescription: conversation.groupDescription,
      allowMemberManagement: conversation.allowMemberManagement || false,
      participants: activeParticipants,
      memberCount,
      createdBy: conversation.createdBy,
      createdAt: conversation.createdAt,
      lastActivity: conversation.lastActivity
    });
  } catch (error) {
    console.error("Error fetching conversation details:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Remove participant from group
router.delete("/conversations/:conversationId/participants/:userId", authRequired, async (req, res) => {
  try {
    const { conversationId, userId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      conversationType: 'group',
      'participants.user': req.user._id,
      'participants.leftAt': null
    });

    if (!conversation) {
      return res.status(403).json({ message: "Bạn không có quyền truy cập nhóm này" });
    }

    // Check if user has permission to remove members
    const userParticipant = conversation.participants.find(p => 
      p.user.toString() === req.user._id.toString() && !p.leftAt
    );
    
    if (!userParticipant) {
      return res.status(403).json({ message: "Bạn không có quyền truy cập nhóm này" });
    }
    
    const canRemoveMembers = userParticipant.role === 'admin' || (conversation.allowMemberManagement === true);
    
    console.log('🔥 Remove member check:', {
      userId: req.user._id,
      userRole: userParticipant.role,
      allowMemberManagement: conversation.allowMemberManagement,
      canRemoveMembers
    });
    
    if (!canRemoveMembers) {
      return res.status(403).json({ message: "Bạn không có quyền xóa thành viên" });
    }

    // Check if user is trying to remove themselves
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: "Không thể tự xóa bản thân. Hãy sử dụng chức năng rời nhóm" });
    }

    // Update participant leftAt
    const updateResult = await Conversation.findOneAndUpdate(
      {
        _id: conversationId,
        'participants.user': userId
      },
      {
        $set: { 'participants.$.leftAt': new Date() },
        lastActivity: new Date()
      }
    );

    if (!updateResult) {
      return res.status(404).json({ message: "Không tìm thấy thành viên trong nhóm" });
    }

    console.log('🔥 User removed successfully, creating system message...');

    // Create system message for member removal
    try {
      const removedUser = await User.findById(userId).select('name');
      const removerUser = await User.findById(req.user._id).select('name');
      
      console.log('🔥 Users found:', {
        removedUser: removedUser?.name,
        removerUser: removerUser?.name
      });
      
      if (!removedUser || !removerUser) {
        console.error('🔥 User not found:', { removedUser: !!removedUser, removerUser: !!removerUser });
        return res.json({ message: "Đã xóa thành viên khỏi nhóm" });
      }
      
      const systemMessage = new Message({
        content: `${removerUser.name} đã xóa ${removedUser.name} khỏi nhóm`,
        conversation: conversationId,
        messageType: 'system',
        sender: null, // System message
        createdAt: new Date()
      });
      
      await systemMessage.save();
      console.log('🔥 System message saved successfully');
      
      // Populate conversation before emitting
      await systemMessage.populate('conversation');
      
      // Emit system message to conversation room
      const io = req.app.get('io');
      if (io) {
        const messageData = {
          ...systemMessage.toObject(),
          conversationId: conversationId // Add conversationId field for frontend
        };
        io.to(`conversation-${conversationId}`).emit('new-message', messageData);
        console.log('🔥 System message emitted successfully');
      } else {
        console.error('🔥 Socket.io not available');
      }
    } catch (systemError) {
      console.error('🔥 Error creating system message:', systemError);
      // Don't fail the main operation
    }

    res.json({ message: "Đã xóa thành viên khỏi nhóm" });
  } catch (error) {
    console.error("Error removing participant:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

router.put("/conversations/:conversationId", authRequired, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const updates = req.body;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.user': req.user._id,
      'participants.leftAt': null
    });

    if (!conversation) {
      return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện" });
    }

    // Only allow certain fields to be updated
    const allowedUpdates = ['groupName', 'groupDescription'];
    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    // Thêm cập nhật lastActivity khi đổi tên nhóm
    filteredUpdates.lastActivity = new Date();
    const updateResult = await Conversation.findByIdAndUpdate(conversationId, filteredUpdates);
    console.log('🔥 Kết quả cập nhật tên nhóm:', updateResult);

    // Lấy lại conversation đã cập nhật và populate participants
    const updatedConversation = await Conversation.findById(conversationId)
      .populate('participants.user', 'name avatarUrl')
      .populate('lastMessage');

    res.json({
      message: "Cập nhật cuộc trò chuyện thành công",
      conversation: updatedConversation
    });
  } catch (error) {
    console.error("Error updating conversation:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Delete conversation (soft delete)
router.delete("/conversations/:conversationId", authRequired, async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.user': req.user._id,
      'participants.leftAt': null
    });

    if (!conversation) {
      return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện" });
    }

    // For private conversations, mark as inactive
    if (conversation.type === 'private') {
      await Conversation.findByIdAndUpdate(conversationId, { isActive: false });
    } else {
      // For group conversations, remove user from participants
      await Conversation.findByIdAndUpdate(conversationId, {
        $set: {
          'participants.$[elem].leftAt': new Date()
        }
      }, {
        arrayFilters: [{ 'elem.user': req.user._id }]
      });
    }
    
    res.json({ message: "Xóa cuộc trò chuyện thành công" });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

export default router;
