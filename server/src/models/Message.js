import mongoose from "mongoose";

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

// ==================== DATABASE INDEXES ====================

// Compound indexes for common queries
messageSchema.index({ conversation: 1, createdAt: -1 }); // Messages by conversation
messageSchema.index({ conversation: 1, isDeleted: 1, createdAt: -1 }); // Active messages by conversation
messageSchema.index({ sender: 1, createdAt: -1 }); // Messages by sender
messageSchema.index({ conversation: 1, 'readBy.user': 1 }); // Unread messages query
messageSchema.index({ messageType: 1, createdAt: -1 }); // Messages by type
messageSchema.index({ isDeleted: 1, createdAt: -1 }); // Active messages only
messageSchema.index({ conversation: 1, 'reactions.user': 1 }); // Reactions query

export default mongoose.model('Message', messageSchema);
