import mongoose from 'mongoose';

/**
 * FriendRequest Schema
 * Lưu các yêu cầu kết bạn giữa người dùng
 * Các trạng thái: 'pending' (chờ), 'accepted' (đã chấp nhận), 'rejected' (từ chối)
 */
const friendRequestSchema = new mongoose.Schema({
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ngăn chặn duplicate requests từ cùng `from` tới cùng `to`
friendRequestSchema.index({ from: 1, to: 1 }, { unique: true });

export default mongoose.model('FriendRequest', friendRequestSchema);
