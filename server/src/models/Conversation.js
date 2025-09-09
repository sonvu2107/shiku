import mongoose from "mongoose";

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
    enum: ['private', 'group'],
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

// Index for faster queries
conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastActivity: -1 });
conversationSchema.index({ conversationType: 1 });

// Virtual for active participants
conversationSchema.virtual('activeParticipants').get(function() {
  return this.participants.filter(p => !p.leftAt);
});

export default mongoose.model('Conversation', conversationSchema);
