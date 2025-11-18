import express from 'express';
import { authRequired } from '../middleware/auth.js';
import geminiService from '../services/geminiService.js';
import ChatHistory from '../models/ChatHistory.js';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import { getOrCreateChatbotConversation, formatChatbotConversation } from '../utils/chatbotConversation.js';
import { getOrCreateAIUser } from '../utils/aiUser.js';

const router = express.Router();

/**
 * @route   POST /api/chatbot/message
 * @desc    Gửi tin nhắn cho AI chatbot và nhận phản hồi
 * @access  Private (yêu cầu đăng nhập)
 */
router.post('/message', authRequired, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user._id || req.user.id;

    // Validate input
    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
      });
    }

    // Giới hạn độ dài tin nhắn
    if (message.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Message is too long (max 2000 characters)',
      });
    }

    // Tìm hoặc tạo chatbot conversation
    const conversation = await getOrCreateChatbotConversation(userId);

    // Load messages từ conversation để restore context vào Gemini session
    try {
      // Lấy messages từ conversation (giới hạn 50 messages gần nhất)
      const messages = await Message.find({
        conversation: conversation._id,
        isDeleted: false
      })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

      // Lấy AI user để phân biệt messages từ AI
      const aiUser = await getOrCreateAIUser();
      const aiUserId = aiUser._id.toString();

      // Chuyển đổi messages sang format cho Gemini (theo thứ tự từ cũ đến mới)
      const dbHistory = messages.reverse().map(msg => {
        const msgSenderId = msg.sender?.toString() || msg.sender?._id?.toString();
        return {
          role: msgSenderId === userId.toString() ? 'user' : 'assistant',
          content: msg.content || '',
          timestamp: msg.createdAt
        };
      });

      // Luôn tạo/restore session với history từ conversation
      if (geminiService.chatSessions && geminiService.chatSessions.has(userId)) {
        // Xóa session cũ nếu có để tạo lại với history mới nhất
        geminiService.clearChatSession(userId);
      }
      
      // Tạo session mới với history từ conversation
      geminiService.getChatSession(userId, dbHistory);
    } catch (error) {
      console.error('[ERROR][CHATBOT] Error loading chat history from conversation:', error);
      // Tiếp tục với initial history nếu có lỗi
    }

    // Gửi tin nhắn đến Gemini
    const response = await geminiService.sendMessage(userId, message);

    // Lưu tin nhắn user và AI vào Message model
    try {
      // Lấy AI user
      const aiUser = await getOrCreateAIUser();
      
      // Lưu tin nhắn user
      const userMessage = new Message({
        content: message,
        sender: userId,
        conversation: conversation._id,
        messageType: 'text'
      });
      await userMessage.save();

      // Lưu tin nhắn AI với AI user làm sender
      const aiMessage = new Message({
        content: response.text,
        sender: aiUser._id,
        conversation: conversation._id,
        messageType: 'text'
      });
      await aiMessage.save();

      // Cập nhật lastMessage và lastActivity của conversation
      conversation.lastMessage = aiMessage._id;
      conversation.lastActivity = new Date();
      await conversation.save();

      // Giữ backward compatibility: Lưu vào ChatHistory nữa (có thể xóa sau)
      try {
        const chatHistory = await ChatHistory.findOrCreate(userId);
        await chatHistory.addMessage('user', message);
        await chatHistory.addMessage('assistant', response.text);
      } catch (error) {
        console.error('[ERROR][CHATBOT] Error saving to ChatHistory (backward compatibility):', error);
      }

    } catch (error) {
      console.error('[ERROR][CHATBOT] Error saving messages to database:', error);
      // Không throw error để không ảnh hưởng đến response
    }

    res.json({
      success: true,
      data: {
        message: response.text,
        timestamp: response.timestamp,
      },
    });
  } catch (error) {
    console.error('[ERROR][CHATBOT] Chatbot message error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process chatbot message',
    });
  }
});

/**
 * @route   POST /api/chatbot/reset
 * @desc    Reset chat session (xóa lịch sử chat)
 * @access  Private
 */
router.post('/reset', authRequired, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    
    // Xóa chat session trong memory
    const cleared = geminiService.clearChatSession(userId);
    
    // Tìm chatbot conversation
    const conversation = await getOrCreateChatbotConversation(userId);
    
    // Xóa tất cả messages trong conversation (đánh dấu là deleted thay vì xóa thật)
    try {
      await Message.updateMany(
        { conversation: conversation._id },
        { 
          isDeleted: true,
          deletedAt: new Date()
        }
      );
      
      // Reset lastMessage và lastActivity
      conversation.lastMessage = null;
      conversation.lastActivity = new Date();
      await conversation.save();
    } catch (error) {
      console.error('[ERROR][CHATBOT] Error clearing conversation messages:', error);
    }
    
    // Giữ backward compatibility: Xóa ChatHistory
    try {
      const chatHistory = await ChatHistory.findOrCreate(userId);
      await chatHistory.clearMessages();
    } catch (error) {
      console.error('[ERROR][CHATBOT] Error clearing chat history:', error);
    }
    
    res.json({
      success: true,
      message: 'Chat session cleared successfully',
    });
  } catch (error) {
    console.error('[ERROR][CHATBOT] Chatbot reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset chat session',
    });
  }
});

/**
 * @route   POST /api/chatbot/generate
 * @desc    Tạo nội dung với prompt cụ thể (không lưu lịch sử)
 * @access  Private
 */
router.post('/generate', authRequired, async (req, res) => {
  try {
    const { prompt, context } = req.body;

    if (!prompt || prompt.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Prompt is required',
      });
    }

    const response = await geminiService.generateContent(prompt, context);

    res.json({
      success: true,
      data: {
        content: response.text,
        timestamp: response.timestamp,
      },
    });
  } catch (error) {
    console.error('[ERROR][CHATBOT] Chatbot generate error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate content',
    });
  }
});

/**
 * @route   GET /api/chatbot/history
 * @desc    Lấy lịch sử chat với AI từ conversation
 * @access  Private
 */
router.get('/history', authRequired, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    
    // Tìm hoặc tạo chatbot conversation
    const conversation = await getOrCreateChatbotConversation(userId);
    
    // Lấy messages từ conversation
    const messages = await Message.find({
      conversation: conversation._id,
      isDeleted: false
    })
    .sort({ createdAt: 1 }) // Sắp xếp từ cũ đến mới
    .lean();

    // Lấy AI user để phân biệt messages từ AI
    const aiUser = await getOrCreateAIUser();
    const aiUserId = aiUser._id.toString();

    // Format messages để trả về client
    const formattedMessages = messages.map(msg => {
      const msgSenderId = msg.sender?.toString() || msg.sender?._id?.toString();
      return {
        role: msgSenderId === userId.toString() ? 'user' : 'assistant',
        content: msg.content || '',
        timestamp: msg.createdAt
      };
    });
    
    res.json({
      success: true,
      data: {
        messages: formattedMessages,
        lastUpdated: conversation.lastActivity,
        conversationId: conversation._id,
      },
    });
  } catch (error) {
    console.error('[ERROR][CHATBOT] Chatbot history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chat history',
    });
  }
});

/**
 * @route   GET /api/chatbot/conversation
 * @desc    Lấy chatbot conversation
 * @access  Private
 */
router.get('/conversation', authRequired, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    
    // Tìm hoặc tạo chatbot conversation
    const conversation = await getOrCreateChatbotConversation(userId);
    
    // Format conversation
    const formattedConversation = formatChatbotConversation(conversation, userId);
    
    res.json({
      success: true,
      data: formattedConversation,
    });
  } catch (error) {
    console.error('[ERROR][CHATBOT] Chatbot conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chatbot conversation',
    });
  }
});

/**
 * @route   GET /api/chatbot/status
 * @desc    Kiểm tra trạng thái chatbot service
 * @access  Private
 */
router.get('/status', authRequired, async (req, res) => {
  try {
    const activeSessions = geminiService.getActiveSessions();
    const isConfigured = !!process.env.GEMINI_API_KEY;

    res.json({
      success: true,
      data: {
        configured: isConfigured,
        activeSessions: activeSessions,
        status: isConfigured ? 'active' : 'not configured',
      },
    });
  } catch (error) {
    console.error('[ERROR][CHATBOT] Chatbot status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chatbot status',
    });
  }
});

export default router;
