import mongoose from "mongoose";

/**
 * Conversation Schema
 * Lưu thông tin cuộc trò chuyện giữa người dùng
 * Bao gồm: participants, loại cuộc trò chuyện (private/group/chatbot), trạng thái và metadata
 */
const conversationSchema = new mongoose.Schema({
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    nickname: {
      type: String,
      default: null
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    leftAt: {
      type: Date,
      default: null
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member'
    }
  }],
  conversationType: {
    type: String,
    enum: ['private', 'group', 'chatbot'],
    required: true
  },
  groupName: {
    type: String,
    default: null
  },
  groupAvatar: {
    type: String,
    default: null
  },
  title: {
    type: String,
    default: null // Cho chatbot conversation title
  },
  allowMemberManagement: {
    type: Boolean,
    default: false // Only admins can add/remove by default
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes để tăng tốc truy vấn - OPTIMIZED
conversationSchema.index({ 'participants.user': 1, isActive: 1 }); // User's active conversations
conversationSchema.index({ 'participants.user': 1, 'participants.leftAt': 1, isActive: 1 }); // User's active conversations with leftAt check
conversationSchema.index({ lastActivity: -1, isActive: 1 }); // Recent active conversations
conversationSchema.index({ conversationType: 1, isActive: 1 }); // By type
conversationSchema.index({ createdBy: 1, createdAt: -1 }); // Created by user
conversationSchema.index({ 'participants.user': 1, conversationType: 1, isActive: 1 }); // User's conversations by type

// Virtual: danh sách participants đang còn active (chưa rời)
conversationSchema.virtual('activeParticipants').get(function () {
  return this.participants.filter(p => !p.leftAt);
});

export default mongoose.model('Conversation', conversationSchema);
