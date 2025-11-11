import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

const chatHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  messages: {
    type: [chatMessageSchema],
    default: [],
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Index để tìm kiếm nhanh
chatHistorySchema.index({ userId: 1, lastUpdated: -1 });

// Method để thêm message
chatHistorySchema.methods.addMessage = function(role, content) {
  this.messages.push({
    role,
    content,
    timestamp: new Date(),
  });
  this.lastUpdated = new Date();
  return this.save();
};

// Method để xóa toàn bộ messages (reset chat)
chatHistorySchema.methods.clearMessages = function() {
  this.messages = [];
  this.lastUpdated = new Date();
  return this.save();
};

// Static method để tìm hoặc tạo chat history
chatHistorySchema.statics.findOrCreate = async function(userId) {
  let chatHistory = await this.findOne({ userId });
  if (!chatHistory) {
    chatHistory = await this.create({ userId, messages: [] });
  }
  return chatHistory;
};

const ChatHistory = mongoose.model('ChatHistory', chatHistorySchema);

export default ChatHistory;

