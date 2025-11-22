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

    // Kiểm tra nếu là câu hỏi về gợi ý status
    const statusSuggestion = checkStatusSuggestion(message);
    if (statusSuggestion) {
      // Trả về gợi ý status trực tiếp
      const botResponse = {
        success: true,
        text: statusSuggestion,
        timestamp: new Date(),
      };

      // Lưu tin nhắn user và AI vào Message model
      try {
        const aiUser = await getOrCreateAIUser();
        
        const userMessage = new Message({
          content: message,
          sender: userId,
          conversation: conversation._id,
          messageType: 'text'
        });
        await userMessage.save();

        const aiMessage = new Message({
          content: botResponse.text,
          sender: aiUser._id,
          conversation: conversation._id,
          messageType: 'text'
        });
        await aiMessage.save();

        conversation.lastMessage = aiMessage._id;
        conversation.lastActivity = new Date();
        await conversation.save();

        // Backward compatibility
        try {
          const chatHistory = await ChatHistory.findOrCreate(userId);
          await chatHistory.addMessage('user', message);
          await chatHistory.addMessage('assistant', botResponse.text);
        } catch (error) {
          console.error('[ERROR][CHATBOT] Error saving to ChatHistory:', error);
        }
      } catch (error) {
        console.error('[ERROR][CHATBOT] Error saving messages to database:', error);
      }

      return res.json({
        success: true,
        data: {
          message: botResponse.text,
          timestamp: botResponse.timestamp,
        },
      });
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

/**
 * Kiểm tra và tạo gợi ý status dựa trên câu hỏi của người dùng
 * @param {string} message - Câu hỏi của người dùng
 * @returns {string|null} - Gợi ý status hoặc null nếu không phải câu hỏi về status
 */
function checkStatusSuggestion(message) {
  const lowerMessage = message.toLowerCase().trim();
  
  // Kiểm tra các từ khóa về gợi ý status
  const statusKeywords = [
    'gợi ý status',
    'status hay',
    'status về',
    'status cho',
    'câu status',
    'status',
    'caption',
    'nội dung bài viết',
    'nội dung status'
  ];
  
  const hasStatusKeyword = statusKeywords.some(keyword => lowerMessage.includes(keyword));
  if (!hasStatusKeyword) return null;

  // Xác định chủ đề từ câu hỏi
  const topics = {
    'cà phê': [
      'Cà phê không chỉ là đồ uống, nó là cú hích cho những ý tưởng lớn. ☕️✨ #MorningVibes',
      'Một ly cà phê, một ngày mới, vô vàn khả năng đang chờ đợi. ☕️🌅',
      'Cà phê là người bạn đồng hành của mọi ý tưởng sáng tạo. ☕️💡',
      'Trong hương vị đắng của cà phê, tôi tìm thấy vị ngọt của cuộc sống. ☕️❤️',
      'Cà phê sáng - khởi đầu hoàn hảo cho một ngày đầy năng lượng! ☕️⚡️'
    ],
    'công việc': [
      'Mỗi ngày là cơ hội để làm tốt hơn ngày hôm qua. 💼✨',
      'Đam mê + Kiên trì = Thành công. Hãy tiếp tục cố gắng! 💪🔥',
      'Công việc không chỉ là kiếm sống, mà còn là cách ta đóng góp cho thế giới. 🌍💼',
      'Thành công không đến từ may mắn, mà từ sự chuẩn bị gặp cơ hội. 🎯✨',
      'Hôm nay tôi chọn làm việc chăm chỉ, vì tương lai sẽ cảm ơn tôi. 💪🌟'
    ],
    'cuộc sống': [
      'Cuộc sống là một hành trình, không phải đích đến. Hãy tận hưởng từng khoảnh khắc! 🌈✨',
      'Mỗi ngày mới là một trang sách trắng, hãy viết nên câu chuyện của riêng bạn. 📖💫',
      'Hạnh phúc không phải là đích đến, mà là cách ta đi trên con đường. 🛤️❤️',
      'Sống trong hiện tại, mơ về tương lai, học từ quá khứ. ⏰🌟',
      'Cuộc sống đẹp nhất khi ta biết trân trọng những điều nhỏ bé. 🌸💕'
    ],
    'tình yêu': [
      'Tình yêu không phải là tìm người hoàn hảo, mà là yêu một người không hoàn hảo một cách hoàn hảo. ❤️✨',
      'Yêu là khi bạn muốn chia sẻ mọi khoảnh khắc, dù vui hay buồn. 💑💕',
      'Tình yêu đích thực không cần lời nói, nó nằm trong những hành động nhỏ nhất. 💝🌹',
      'Cùng nhau, chúng ta có thể vượt qua mọi thử thách. 💪❤️',
      'Yêu là khi bạn cảm thấy an toàn trong vòng tay của ai đó. 🤗💖'
    ],
    'học tập': [
      'Học tập không bao giờ là quá muộn. Mỗi ngày là cơ hội để học điều mới! 📚✨',
      'Kiến thức là tài sản duy nhất không ai có thể lấy đi khỏi bạn. 🧠💎',
      'Đầu tư vào học tập là đầu tư vào tương lai của chính mình. 📖🚀',
      'Học từ thất bại, thành công từ kinh nghiệm. 💪📚',
      'Mỗi cuốn sách mở ra một thế giới mới. Hãy đọc nhiều hơn! 📖🌍'
    ],
    'du lịch': [
      'Du lịch không chỉ là đi đến nơi mới, mà còn là khám phá bản thân mình. ✈️🌍',
      'Thế giới là một cuốn sách, và những người không đi du lịch chỉ đọc một trang. 📖🌎',
      'Mỗi chuyến đi là một câu chuyện mới đang chờ được viết. 🗺️✍️',
      'Du lịch mở rộng tầm nhìn và làm giàu tâm hồn. 🌅💫',
      'Đi xa để về gần hơn với chính mình. 🧳❤️'
    ],
    'thể thao': [
      'Thể thao không chỉ rèn luyện cơ thể, mà còn rèn luyện tinh thần. 💪🏃',
      'Mỗi giọt mồ hôi hôm nay là bước tiến đến mục tiêu ngày mai. 🏋️🔥',
      'Thể thao dạy ta về sự kiên trì, tinh thần đồng đội và không bao giờ bỏ cuộc. ⚽️💪',
      'Cơ thể khỏe mạnh, tinh thần minh mẫn. Hãy vận động mỗi ngày! 🏃✨',
      'Thất bại trong thể thao chỉ là bước đệm cho thành công tiếp theo. 🏆💫'
    ],
    'âm nhạc': [
      'Âm nhạc là ngôn ngữ của tâm hồn, không cần lời nói. 🎵❤️',
      'Mỗi bài hát kể một câu chuyện, mỗi giai điệu chạm một cảm xúc. 🎶✨',
      'Âm nhạc có thể chữa lành những vết thương mà lời nói không thể. 🎼💕',
      'Khi từ ngữ không đủ, âm nhạc sẽ nói thay. 🎹🎤',
      'Cuộc sống giống như một bản nhạc, hãy chơi nó với cả trái tim. 🎸🌟'
    ]
  };

  // Tìm chủ đề trong câu hỏi
  for (const [topic, suggestions] of Object.entries(topics)) {
    if (lowerMessage.includes(topic)) {
      // Chọn ngẫu nhiên một gợi ý
      const randomIndex = Math.floor(Math.random() * suggestions.length);
      return suggestions[randomIndex];
    }
  }

  // Nếu không tìm thấy chủ đề cụ thể, trả về gợi ý chung
  const generalSuggestions = [
    'Mỗi ngày là một cơ hội mới để trở thành phiên bản tốt nhất của chính mình. ✨💫',
    'Hãy sống như thể hôm nay là ngày cuối cùng, và mơ như thể ngày mai là mãi mãi. 🌟💭',
    'Cuộc sống không phải là chờ đợi cơn bão qua đi, mà là học cách nhảy múa trong mưa. 🌧️💃',
    'Thành công không phải là đích đến, mà là hành trình bạn đi. 🛤️✨',
    'Hãy là chính mình, vì tất cả những người khác đã có người đảm nhận rồi. 💫🌟',
    'Mỗi khoảnh khắc đều là cơ hội để bắt đầu lại. Hãy nắm lấy nó! 🚀💪',
    'Cuộc sống đẹp nhất khi ta biết trân trọng những điều nhỏ bé xung quanh. 🌸💕',
    'Đừng sợ thất bại, hãy sợ việc không dám thử. 💪🔥'
  ];
  
  const randomIndex = Math.floor(Math.random() * generalSuggestions.length);
  return generalSuggestions[randomIndex];
}

export default router;
