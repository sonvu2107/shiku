import mongoose from "mongoose";

/**
 * Notification Schema
 * Lưu thông báo gửi cho người dùng (recipient)
 * `sender` có thể null cho thông báo hệ thống
 */
const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false // null cho thông báo hệ thống
  },
  type: {
    type: String,
    enum: [
      "comment", // có người bình luận bài viết của bạn
      "reply", // có người trả lời bình luận của bạn
      "reaction", // có người tương tác (reaction) với bài viết
      "mention", // có người mention bạn trong bài viết hoặc bình luận
      "ban", // bạn bị cấm
      "unban", // bạn được gỡ cấm
      "system", // thông báo hệ thống
      "admin_message", // thông báo broadcast từ admin
      "pk_challenge", // bị thách đấu PK
      "pk_result", // kết quả trận đấu PK
      "welcome", // thông báo chào mừng user mới
      "new_member" // thông báo có user mới tham gia
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post"
    },
    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment"
    },
    url: String, // liên kết liên quan
    metadata: mongoose.Schema.Types.Mixed // dữ liệu bổ sung
  },
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes: tối ưu truy vấn timeline và filter theo trạng thái read
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

// Trợ giúp: đếm thông báo chưa đọc (lightweight counter)
notificationSchema.statics.countUnread = function (recipientId) {
  return this.countDocuments({ recipient: recipientId, read: false });
};

export default mongoose.model("Notification", notificationSchema);
