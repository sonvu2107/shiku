import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false // null for system notifications
  },
  type: {
    type: String,
    enum: [
      "comment", // someone commented on your post
      "reply", // someone replied to your comment  
      "reaction", // someone reacted to your post
      "mention", // someone mentioned you in a post or comment
      "ban", // you were banned
      "unban", // you were unbanned
      "system", // system notifications (server updates, etc)
      "admin_message" // admin broadcast message
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
    url: String, // link to relevant page
    metadata: mongoose.Schema.Types.Mixed // additional data
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

// ✅ FIX MISSING INDEXES: Compound indexes for efficient queries
notificationSchema.index({ recipient: 1, createdAt: -1 }); // Timeline
notificationSchema.index({ recipient: 1, read: 1 }); // Filter by read status
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 }); // Unread notifications sorted

// PHASE 4: Lightweight unread counter
notificationSchema.statics.countUnread = function(recipientId) {
  return this.countDocuments({ recipient: recipientId, read: false });
};

export default mongoose.model("Notification", notificationSchema);
