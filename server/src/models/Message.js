import mongoose from "mongoose";

/**
 * Message Schema
 * Lưu tin nhắn trong conversation
 * Hỗ trợ nhiều loại: text, image, emote, system
 */
const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: function() {
      return this.messageType !== 'emote';
    },
    trim: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.messageType !== 'system';
    }
  },
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'emote', 'system'],
    default: 'text'
  },
  imageUrl: {
    type: String,
    default: null
  },
  emote: {
    type: String,
    default: null
  },
  reactions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['like','love','laugh','angry','sad'], required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes cơ sở dữ liệu cho các truy vấn thường gặp
messageSchema.index({ conversation: 1, createdAt: -1 }); // Tin nhắn theo conversation (mới nhất trước)
messageSchema.index({ conversation: 1, isDeleted: 1, createdAt: -1 }); // Tin nhắn còn hoạt động theo conversation
messageSchema.index({ sender: 1, createdAt: -1 }); // Tin nhắn theo sender
messageSchema.index({ conversation: 1, 'readBy.user': 1 }); // Truy vấn tin nhắn chưa đọc
messageSchema.index({ messageType: 1, createdAt: -1 }); // Tin nhắn theo loại
messageSchema.index({ isDeleted: 1, createdAt: -1 }); // Chỉ tin nhắn chưa bị xóa
messageSchema.index({ conversation: 1, 'reactions.user': 1 }); // Truy vấn reactions

export default mongoose.model('Message', messageSchema);
