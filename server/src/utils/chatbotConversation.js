import Conversation from '../models/Conversation.js';
import User from '../models/User.js';

/**
 * Tìm hoặc tạo chatbot conversation cho user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Chatbot conversation
 */
export async function getOrCreateChatbotConversation(userId) {
  try {
    // Tìm conversation chatbot đã tồn tại
    let conversation = await Conversation.findOne({
      conversationType: 'chatbot',
      'participants.user': userId,
      'participants.leftAt': null,
      isActive: true
    })
    .populate('participants.user', 'name avatarUrl isOnline lastSeen');

    if (conversation) {
      return conversation;
    }

    // Tạo conversation chatbot mới
    conversation = new Conversation({
      participants: [
        {
          user: userId,
          role: 'member',
          joinedAt: new Date()
        }
      ],
      conversationType: 'chatbot',
      title: 'Trợ lý AI',
      createdBy: userId,
      isActive: true
    });

    await conversation.save();
    await conversation.populate('participants.user', 'name avatarUrl isOnline lastSeen');

    return conversation;
  } catch (error) {
    console.error('[ERROR][CHATBOT-CONV] Error getting or creating chatbot conversation:', error);
    throw error;
  }
}

/**
 * Format chatbot conversation để trả về client
 * @param {Object} conversation - Conversation object
 * @param {string} userId - Current user ID
 * @returns {Object} Formatted conversation
 */
export function formatChatbotConversation(conversation, userId) {
  const otherParticipants = conversation.participants.filter(
    p => p.user._id.toString() !== userId.toString() && !p.leftAt
  );

  return {
    _id: conversation._id,
    conversationType: conversation.conversationType,
    title: conversation.title || 'Trợ lý AI',
    groupName: conversation.groupName,
    groupAvatar: conversation.groupAvatar,
    participants: conversation.participants,
    otherParticipants,
    lastMessage: conversation.lastMessage,
    lastActivity: conversation.lastActivity,
    unreadCount: 0, // Chatbot messages không có unread count
    createdAt: conversation.createdAt
  };
}

export default {
  getOrCreateChatbotConversation,
  formatChatbotConversation
};

