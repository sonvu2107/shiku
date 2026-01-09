/**
 * Messages Routes
 * 
 * Routes xử lý các thao tác liên quan đến tin nhắn (messages):
 * - Quản lý conversations (1-1, group, chatbot)
 * - Gửi, nhận, đọc tin nhắn
 * - Upload file/ảnh trong tin nhắn
 * - Unread count tracking
 * 
 * @module messages
 */

import express from "express";
import mongoose from "mongoose";
import { authRequired } from "../middleware/jwtSecurity.js";
import { escapeRegex } from "../utils/mongoSecurity.js";
import { validateObjectId } from "../middleware/validateObjectId.js";
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import User from "../models/User.js";
import { v2 as cloudinary } from "cloudinary";
import { encrypt, decrypt } from "../services/encryptionService.js";
import { messageLimiter } from "../middleware/rateLimit.js";

const router = express.Router();

// Messages routes loaded successfully

// Apply ObjectId validation to all routes with :conversationId
router.param('conversationId', (req, res, next, value) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return res.status(400).json({ message: "ID cuộc trò chuyện không hợp lệ" });
  }
  next();
});

// Apply ObjectId validation to routes with :messageId
router.param('messageId', (req, res, next, value) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return res.status(400).json({ message: "ID tin nhắn không hợp lệ" });
  }
  next();
});

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

  // Disable cache
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  try {
    // OPTIMIZATION: Use lean() for better performance
    const conversations = await Conversation.find({
      participants: {
        $elemMatch: {
          user: req.user._id,
          leftAt: null
        }
      },
      isActive: true
    })
      .populate('participants.user', 'name avatarUrl isOnline lastSeen')
      .populate('lastMessage')
      .sort({ lastActivity: -1 })
      .lean();


    // Optimize unread count calculation with batch query
    // Only count messages from OTHERS (not from current user)
    const conversationIds = conversations.map(conv => conv._id);
    const unreadCounts = await Message.aggregate([
      {
        $match: {
          conversation: { $in: conversationIds },
          sender: { $ne: req.user._id }, // Chỉ đếm tin nhắn từ người khác
          'readBy.user': { $ne: req.user._id } // Chỉ đếm tin nhắn chưa đọc
        }
      },
      {
        $group: {
          _id: "$conversation",
          count: { $sum: 1 }
        }
      }
    ]);

    // Create a map for quick lookup
    const unreadCountMap = new Map();
    unreadCounts.forEach(item => {
      unreadCountMap.set(item._id.toString(), item.count);
    });

    // Format conversations with unread count
    const formattedConversations = conversations.map((conv) => {
      // Decrypt lastMessage content if exists
      let decryptedLastMessage = conv.lastMessage;
      if (conv.lastMessage && conv.lastMessage.content) {
        decryptedLastMessage = {
          ...conv.lastMessage,
          content: conv.lastMessage.isDeleted
            ? conv.lastMessage.content
            : decrypt(conv.lastMessage.content)
        };
      }

      // Với chatbot conversation, không có otherParticipants
      if (conv.conversationType === 'chatbot') {
        return {
          _id: conv._id,
          conversationType: conv.conversationType,
          title: conv.title || 'Trợ lý AI',
          groupName: conv.groupName,
          groupAvatar: conv.groupAvatar,
          participants: conv.participants,
          otherParticipants: [], // Chatbot không có other participants
          lastMessage: decryptedLastMessage,
          lastActivity: conv.lastActivity,
          unreadCount: 0, // Chatbot messages không có unread count
          createdAt: conv.createdAt
        };
      }

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
        lastMessage: decryptedLastMessage,
        lastActivity: conv.lastActivity,
        unreadCount: unreadCountMap.get(conv._id.toString()) || 0,
        createdAt: conv.createdAt
      };
    });

    res.json({ conversations: formattedConversations });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Get messages for a conversation with pagination
router.get("/conversations/:conversationId/messages", authRequired, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50, before } = req.query;

    // Check if user is participant
    // OPTIMIZATION: Use lean() for better performance
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: {
        $elemMatch: {
          user: req.user._id,
          leftAt: null
        }
      }
    }).lean();

    if (!conversation) {
      return res.status(403).json({ message: "Không có quyền truy cập cuộc trò chuyện này" });
    }

    // Với chatbot conversation, không cần check block
    // Với các conversation khác, check block như bình thường
    if (conversation.conversationType === 'chatbot') {
      // Skip block check for chatbot
    }

    // Build query - mongoose will auto-convert string to ObjectId
    let query = {
      conversation: conversationId
    };

    // If before timestamp is provided, get messages before that time
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    // OPTIMIZATION: Use find with lean() for better performance
    // This ensures all message fields are preserved correctly
    const messages = await Message.find(query)
      .populate('sender', 'name avatarUrl')
      .populate('readBy.user', 'name avatarUrl')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    // Decrypt message content for client
    messages.forEach(msg => {
      if (msg.content) {
        msg.content = msg.isDeleted ? msg.content : decrypt(msg.content);
      }
    });

    // Get total count for pagination
    const totalMessages = await Message.countDocuments(query);

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
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Send a message
router.post("/conversations/:conversationId/messages", authRequired, messageLimiter, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, messageType = 'text', emote } = req.body;

    // Validate message length to prevent DoS
    const MAX_MESSAGE_LENGTH = 10000;
    if (content && content.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ message: `Tin nhắn không được vượt quá ${MAX_MESSAGE_LENGTH} ký tự` });
    }

    // Validate conversationId format
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: "ID cuộc trò chuyện không hợp lệ" });
    }

    // Check if user is participant
    // OPTIMIZATION: Use lean() and batch fetch blockedUsers separately
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: {
        $elemMatch: {
          user: req.user._id,
          leftAt: null
        }
      }
    })
      .populate('participants.user', 'name avatarUrl')
      .lean();

    if (!conversation) {
      return res.status(403).json({ message: "Không có quyền truy cập cuộc trò chuyện này" });
    }

    // Kiểm tra block giữa các thành viên (chỉ cho phép gửi nếu không ai block nhau)
    // OPTIMIZATION: Batch fetch blockedUsers
    const currentUser = await User.findById(req.user._id).select('blockedUsers').lean();
    const otherParticipants = conversation.participants.filter(p => p.user._id.toString() !== req.user._id.toString());

    if (otherParticipants.length > 0) {
      const otherUserIds = otherParticipants.map(p => p.user._id);
      const otherUsers = await User.find({ _id: { $in: otherUserIds } })
        .select('_id blockedUsers')
        .lean();

      const currentUserId = req.user._id.toString();
      const currentUserBlockedSet = new Set(
        (currentUser?.blockedUsers || []).map(id => id.toString())
      );

      const otherUsersBlockedMap = new Map();
      otherUsers.forEach(user => {
        otherUsersBlockedMap.set(
          user._id.toString(),
          new Set((user.blockedUsers || []).map(id => id.toString()))
        );
      });

      for (const p of otherParticipants) {
        const otherUserId = p.user._id.toString();
        const iBlockedThem = currentUserBlockedSet.has(otherUserId);
        const theyBlockedMe = otherUsersBlockedMap.get(otherUserId)?.has(currentUserId);

        if (iBlockedThem || theyBlockedMe) {
          return res.status(403).json({ message: "Bạn hoặc người này đã chặn nhau, không thể gửi tin nhắn." });
        }
      }
    }

    // Encrypt message content before saving
    const encryptedContent = content ? encrypt(content) : content;

    const messageData = {
      content: encryptedContent,
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

    // Ensure message has conversationId field for client
    // Decrypt content for socket emission
    const messageObj = message.toObject();
    if (messageObj.content) {
      messageObj.content = decrypt(messageObj.content);
    }
    const socketMessageData = {
      ...messageObj,
      conversationId: conversationId
    };

    io.to(`conversation-${conversationId}`).emit('new-message', socketMessageData);

    res.status(201).json(messageObj);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
});

// React to a message (like/love/laugh/angry/sad)
router.post("/conversations/:conversationId/messages/:messageId/react", authRequired, async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const { type } = req.body;

    if (!['like', 'love', 'laugh', 'angry', 'sad'].includes(type)) {
      return res.status(400).json({ message: 'Loại cảm xúc không hợp lệ' });
    }

    // Ensure access
    const conversation = await Conversation.findOne({
      _id: conversationId,
      ...checkConversationAccess(req.user._id)
    }).select('_id');
    if (!conversation) {
      return res.status(403).json({ message: 'Không có quyền truy cập cuộc trò chuyện này' });
    }

    const message = await Message.findOne({ _id: messageId, conversation: conversationId, isDeleted: false });
    if (!message) return res.status(404).json({ message: 'Không tìm thấy tin nhắn' });

    // Toggle same reaction; ensure one reaction per user
    const existing = message.reactions?.find(r => r.user.toString() === req.user._id.toString());
    if (existing && existing.type === type) {
      // remove reaction
      await Message.updateOne({ _id: messageId }, { $pull: { reactions: { user: req.user._id } } });
    } else if (existing) {
      // change reaction
      await Message.updateOne({ _id: messageId, 'reactions.user': req.user._id }, { $set: { 'reactions.$.type': type } });
    } else {
      // add
      await Message.updateOne({ _id: messageId }, { $push: { reactions: { user: req.user._id, type } } });
    }

    const updated = await Message.findById(messageId).select('reactions');

    // Emit realtime update
    const io = req.app.get('io');
    io.to(`conversation-${conversationId}`).emit('message-reactions-updated', {
      messageId,
      conversationId,
      reactions: updated.reactions
    });

    res.json({ reactions: updated.reactions });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Edit message
router.put("/conversations/:conversationId/messages/:messageId", authRequired, async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Nội dung tin nhắn không được để trống' });
    }

    // Check access to conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      ...checkConversationAccess(req.user._id)
    }).select('_id');

    if (!conversation) {
      return res.status(403).json({ message: 'Không có quyền truy cập cuộc trò chuyện này' });
    }

    // Find message and check ownership
    const message = await Message.findOne({
      _id: messageId,
      conversation: conversationId,
      sender: req.user._id,
      isDeleted: false
    });

    if (!message) {
      return res.status(404).json({ message: 'Không tìm thấy tin nhắn hoặc bạn không có quyền sửa' });
    }

    // Update message - encrypt new content
    message.content = encrypt(content.trim());
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    // Emit realtime update - send decrypted content to client
    const io = req.app.get('io');
    io.to(`conversation-${conversationId}`).emit('message-edited', {
      messageId,
      conversationId,
      content: content.trim(), // Send plaintext to client
      isEdited: true,
      editedAt: message.editedAt
    });

    res.json({
      message: 'Đã sửa tin nhắn',
      data: {
        _id: message._id,
        content: content.trim(), // Return plaintext to client
        isEdited: message.isEdited,
        editedAt: message.editedAt
      }
    });
  } catch (error) {
    console.error('[ERROR][MESSAGES] Error editing message:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Delete message (recall)
router.delete("/conversations/:conversationId/messages/:messageId", authRequired, async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;

    // Check access to conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      ...checkConversationAccess(req.user._id)
    }).select('_id');

    if (!conversation) {
      return res.status(403).json({ message: 'Không có quyền truy cập cuộc trò chuyện này' });
    }

    // Find message and check ownership
    const message = await Message.findOne({
      _id: messageId,
      conversation: conversationId,
      sender: req.user._id,
      isDeleted: false
    });

    if (!message) {
      return res.status(404).json({ message: 'Không tìm thấy tin nhắn hoặc bạn không có quyền thu hồi' });
    }

    // Soft delete - mark as deleted
    message.isDeleted = true;
    message.content = 'Tin nhắn đã được thu hồi';
    message.deletedAt = new Date();
    await message.save();

    // Emit realtime update
    const io = req.app.get('io');
    io.to(`conversation-${conversationId}`).emit('message-deleted', {
      messageId,
      conversationId,
      isDeleted: true,
      content: message.content
    });

    res.json({
      message: 'Đã thu hồi tin nhắn',
      data: {
        _id: message._id,
        isDeleted: message.isDeleted,
        content: message.content
      }
    });
  } catch (error) {
    console.error('[ERROR][MESSAGES] Error deleting message:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Upload image message
router.post("/conversations/:conversationId/messages/image", authRequired, messageLimiter, async (req, res) => {
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

    // Encrypt content for image message
    const encryptedContent = encrypt(content || 'Đã gửi một hình ảnh');

    const message = new Message({
      content: encryptedContent,
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
    // Decrypt content for socket emission
    const io = req.app.get('io');
    const messageObj = message.toObject();
    messageObj.content = decrypt(messageObj.content);
    io.to(`conversation-${conversationId}`).emit('new-message', messageObj);

    // Return with decrypted content
    const responseObj = message.toObject();
    responseObj.content = decrypt(responseObj.content);
    res.status(201).json(responseObj);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Check if private conversation exists between two users
router.get("/conversations/private/check/:recipientId", authRequired, async (req, res) => {
  try {
    const { recipientId } = req.params;

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
    })
      .populate('participants.user', 'name avatarUrl isOnline lastSeen')
      .populate('lastMessage');

    if (existingConversation) {
      // Format response similar to getConversations
      const otherParticipants = existingConversation.participants.filter(
        p => p.user._id.toString() !== req.user._id.toString() && !p.leftAt
      );

      const formattedConversation = {
        _id: existingConversation._id,
        conversationType: existingConversation.conversationType,
        groupName: existingConversation.groupName,
        groupAvatar: existingConversation.groupAvatar,
        participants: existingConversation.participants,
        otherParticipants,
        lastMessage: existingConversation.lastMessage,
        lastActivity: existingConversation.lastActivity,
        unreadCount: 0,
        createdAt: existingConversation.createdAt,
        exists: true
      };

      return res.json(formattedConversation);
    }

    res.json({ exists: false });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Create private conversation
router.post("/conversations/private", authRequired, async (req, res) => {
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
    await conversation.populate('participants.user', 'name avatarUrl isOnline lastSeen');

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
    await conversation.populate('participants.user', 'name avatarUrl isOnline lastSeen');

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

    if (!canAddMembers) {
      return res.status(403).json({ message: "Bạn không có quyền thêm thành viên" });
    }

    // Verify participants exist and aren't already in conversation
    const activeParticipantIds = conversation.participants
      .filter(p => !p.leftAt)
      .map(p => p.user.toString());


    // Check for users who left but can be re-added
    const leftParticipants = conversation.participants.filter(p => p.leftAt);
    const leftParticipantIds = leftParticipants.map(p => p.user.toString());


    // Separate new users from users to re-add
    const reAddParticipantIds = participantIds.filter(id => leftParticipantIds.includes(id.toString()));
    const newParticipantIds = participantIds.filter(id =>
      !activeParticipantIds.includes(id.toString()) &&
      !leftParticipantIds.includes(id.toString())
    );


    if (newParticipantIds.length === 0 && reAddParticipantIds.length === 0) {
      return res.status(400).json({ message: "Tất cả người dùng đã có trong nhóm" });
    }

    // Verify only new users exist (re-add users already exist in conversation)
    if (newParticipantIds.length > 0) {
      const users = await User.find({ _id: { $in: newParticipantIds } });

      if (users.length !== newParticipantIds.length) {
        return res.status(400).json({ message: "Một số người dùng không tồn tại" });
      }
    }

    // For re-add users, just verify they exist (they should since they were in conversation before)
    if (reAddParticipantIds.length > 0) {
      const reAddUsers = await User.find({ _id: { $in: reAddParticipantIds } });

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

    // Debug: Group name change permission check

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

    const systemMessageForNameChange = new Message({
      content: `${changerUser.name} đã đổi tên nhóm từ "${oldName}" thành "${groupName.trim()}"`,
      conversation: conversationId,
      messageType: 'system',
      sender: null,
      createdAt: new Date()
    });

    await systemMessageForNameChange.save();

    // Emit system message
    const ioForNameChange = req.app.get('io');
    ioForNameChange.to(`conversation-${conversationId}`).emit('new-message', systemMessageForNameChange);

    res.json({ message: "Đã cập nhật tên nhóm thành công" });
  } catch (error) {
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

    const systemMessageForManagement = new Message({
      content: `${adminUser.name} đã ${statusText} thành viên thêm người vào nhóm`,
      conversation: conversationId,
      messageType: 'system',
      sender: null,
      createdAt: new Date()
    });

    await systemMessageForManagement.save();

    // Emit system message
    const ioForManagement = req.app.get('io');
    ioForManagement.to(`conversation-${conversationId}`).emit('new-message', systemMessageForManagement);

    res.json({ message: `Đã ${statusText} thành viên quản lý nhóm` });
  } catch (error) {
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

    // Debug: User leaving conversation

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

    // Escape regex to prevent NoSQL injection
    const safeQuery = escapeRegex(q.trim());
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        {
          $or: [
            { name: { $regex: safeQuery, $options: 'i' } },
            { email: { $regex: safeQuery, $options: 'i' } }
          ]
        }
      ]
    })
      .select('name email avatarUrl cultivationCache displayBadgeType')
      .limit(20);

    res.json(users);
  } catch (error) {
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
      .populate('participants.user', 'name avatarUrl isOnline lastSeen')
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

    // Debug: Member removal permission check

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


    // Create system message for member removal
    try {
      const removedUser = await User.findById(userId).select('name');
      const removerUser = await User.findById(req.user._id).select('name');

      // Debug: User removal debug

      if (!removedUser || !removerUser) {
        return res.json({ message: "Đã xóa thành viên khỏi nhóm" });
      }

      const systemMessageForRemoval = new Message({
        content: `${removerUser.name} đã xóa ${removedUser.name} khỏi nhóm`,
        conversation: conversationId,
        messageType: 'system',
        sender: null, // System message
        createdAt: new Date()
      });

      await systemMessageForRemoval.save();

      // Populate conversation before emitting
      await systemMessageForRemoval.populate('conversation');

      // Emit system message to conversation room
      const ioForRemoval = req.app.get('io');
      if (ioForRemoval) {
        const messageData = {
          ...systemMessageForRemoval.toObject(),
          conversationId: conversationId // Add conversationId field for frontend
        };
        ioForRemoval.to(`conversation-${conversationId}`).emit('new-message', messageData);
      } else {
        // Socket.io not available
      }
    } catch (systemError) {
      // Error creating system message
      // Don't fail the main operation
    }

    res.json({ message: "Đã xóa thành viên khỏi nhóm" });
  } catch (error) {
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

    // Lấy lại conversation đã cập nhật và populate participants
    const updatedConversation = await Conversation.findById(conversationId)
      .populate('participants.user', 'name avatarUrl isOnline lastSeen')
      .populate('lastMessage');

    res.json({
      message: "Cập nhật cuộc trò chuyện thành công",
      conversation: updatedConversation
    });
  } catch (error) {
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
    res.status(500).json({ message: "Lỗi server" });
  }
});

// ==================== NICKNAME MANAGEMENT ====================

// Set nickname for a participant in conversation
router.post("/conversations/:conversationId/nickname", authRequired, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { targetUserId, nickname } = req.body;

    // Validate input
    if (!targetUserId) {
      return res.status(400).json({ message: "Thiếu ID người dùng" });
    }

    if (!nickname || nickname.trim().length === 0) {
      return res.status(400).json({ message: "Biệt danh không được để trống" });
    }

    if (nickname.trim().length > 30) {
      return res.status(400).json({ message: "Biệt danh không được quá 30 ký tự" });
    }

    // Check if user has access to conversation
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

    // Check if target user is in conversation
    const targetParticipant = conversation.participants.find(p =>
      p.user.toString() === targetUserId && !p.leftAt
    );

    if (!targetParticipant) {
      return res.status(404).json({ message: "Người dùng không có trong cuộc trò chuyện này" });
    }

    // Update nickname for the target user
    await Conversation.findByIdAndUpdate(conversationId, {
      $set: {
        'participants.$[elem].nickname': nickname.trim()
      }
    }, {
      arrayFilters: [{ 'elem.user': targetUserId }]
    });

    // Get updated conversation
    const updatedConversation = await Conversation.findById(conversationId)
      .populate('participants.user', 'name avatarUrl isOnline lastSeen');

    res.json({
      message: "Đặt biệt danh thành công",
      conversation: updatedConversation
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Remove nickname for a participant in conversation
router.delete("/conversations/:conversationId/nickname", authRequired, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { targetUserId } = req.body;

    // Validate input
    if (!targetUserId) {
      return res.status(400).json({ message: "Thiếu ID người dùng" });
    }

    // Check if user has access to conversation
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

    // Check if target user is in conversation
    const targetParticipant = conversation.participants.find(p =>
      p.user.toString() === targetUserId && !p.leftAt
    );

    if (!targetParticipant) {
      return res.status(404).json({ message: "Người dùng không có trong cuộc trò chuyện này" });
    }

    // Remove nickname for the target user
    await Conversation.findByIdAndUpdate(conversationId, {
      $unset: {
        'participants.$[elem].nickname': ""
      }
    }, {
      arrayFilters: [{ 'elem.user': targetUserId }]
    });

    // Get updated conversation
    const updatedConversation = await Conversation.findById(conversationId)
      .populate('participants.user', 'name avatarUrl isOnline lastSeen');

    res.json({
      message: "Xóa biệt danh thành công",
      conversation: updatedConversation
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Get nickname for a participant in conversation
router.get("/conversations/:conversationId/nickname/:targetUserId", authRequired, async (req, res) => {
  try {
    const { conversationId, targetUserId } = req.params;

    // Check if user has access to conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: {
        $elemMatch: {
          user: req.user._id,
          leftAt: null
        }
      }
    }).populate('participants.user', 'name avatarUrl');

    if (!conversation) {
      return res.status(403).json({ message: "Không có quyền truy cập cuộc trò chuyện này" });
    }

    // Find target participant
    const targetParticipant = conversation.participants.find(p =>
      p.user._id.toString() === targetUserId && !p.leftAt
    );

    if (!targetParticipant) {
      return res.status(404).json({ message: "Người dùng không có trong cuộc trò chuyện này" });
    }

    res.json({
      nickname: targetParticipant.nickname || null,
      userName: targetParticipant.user.name,
      userId: targetParticipant.user._id
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
});

export default router;
