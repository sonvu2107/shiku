import Notification from "../models/Notification.js";
import User from "../models/User.js";

class NotificationService {
  
  // Create a new notification
  static async create({
    recipient,
    sender = null,
    type,
    title,
    message,
    data = {}
  }) {
    try {
      const notification = new Notification({
        recipient,
        sender,
        type,
        title,
        message,
        data
      });
      
      await notification.save();
      
      
      return notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  // Create comment notification
  static async createCommentNotification(comment, post, commenter) {
    if (post.author.toString() === commenter._id.toString()) return; // Don't notify self
    
    await this.create({
      recipient: post.author,
      sender: commenter._id,
      type: "comment",
      title: "Bình luận mới",
      message: `${commenter.name} đã bình luận vào bài viết "${post.title}"`,
      data: {
        post: post._id,
        comment: comment._id,
        url: `/post/${post.slug}#comment-${comment._id}`
      }
    });
  }

  // Create reply notification
  static async createReplyNotification(reply, parentComment, post, replier) {
    if (parentComment.author.toString() === replier._id.toString()) return; // Don't notify self
    
    await this.create({
      recipient: parentComment.author,
      sender: replier._id,
      type: "reply",
      title: "Phản hồi mới",
      message: `${replier.name} đã trả lời bình luận của bạn trong bài viết "${post.title}"`,
      data: {
        post: post._id,
        comment: reply._id,
        url: `/post/${post.slug}#comment-${reply._id}`
      }
    });
  }

  // Create reaction notification
  static async createReactionNotification(post, reactor, reactionType) {
    if (post.author.toString() === reactor._id.toString()) return; // Don't notify self
    
    const emojis = {
      like: "👍",
      love: "❤️", 
      haha: "😂",
      wow: "😮",
      sad: "😢",
      angry: "😠"
    };

    await this.create({
      recipient: post.author,
      sender: reactor._id,
      type: "reaction",
      title: "Phản ứng mới",
      message: `${reactor.name} đã thả ${emojis[reactionType]} vào bài viết "${post.title}"`,
      data: {
        post: post._id,
        url: `/post/${post.slug}`,
        metadata: { reactionType }
      }
    });
  }

  // Create ban notification
  static async createBanNotification(bannedUser, adminUser, reason, expiresAt) {
    const isPermament = !expiresAt;
    const message = isPermament 
      ? `Bạn đã bị cấm vĩnh viễn. Lý do: ${reason}`
      : `Bạn đã bị cấm đến ${new Date(expiresAt).toLocaleString("vi-VN")}. Lý do: ${reason}`;

    await this.create({
      recipient: bannedUser._id,
      sender: adminUser._id,
      type: "ban",
      title: "Thông báo cấm tài khoản",
      message,
      data: {
        metadata: { reason, expiresAt, isPermament }
      }
    });
  }

  // Create unban notification
  static async createUnbanNotification(unbannedUser, adminUser) {
    await this.create({
      recipient: unbannedUser._id,
      sender: adminUser._id,
      type: "unban",
      title: "Gỡ cấm tài khoản",
      message: "Tài khoản của bạn đã được gỡ cấm. Bạn có thể sử dụng bình thường.",
      data: {}
    });
  }

  // Create system notification for all users
  static async createSystemNotification(title, message, targetRole = null) {
    const query = targetRole ? { role: targetRole } : {};
    const users = await User.find(query).select("_id");
    
    const notifications = users.map(user => ({
      recipient: user._id,
      sender: null,
      type: "system",
      title,
      message,
      data: {}
    }));

    await Notification.insertMany(notifications);
  }

  // Create admin message notification for all users
  static async createAdminBroadcast(adminUser, title, message) {
    const users = await User.find({}).select("_id");
    
    const notifications = users.map(user => ({
      recipient: user._id,
      sender: adminUser._id,
      type: "admin_message",
      title,
      message,
      data: {}
    }));

    await Notification.insertMany(notifications);
  }

  // Get notifications for a user
  static async getUserNotifications(userId, page = 1, limit = 20, filter = null) {
    const skip = (page - 1) * limit;
    
    let query = { recipient: userId };
    
    // Apply filter
    if (filter === "unread") {
      query.read = false;
    } else if (filter === "read") {
      query.read = true;
    }
    
    const notifications = await Notification
      .find(query)
      .populate("sender", "name avatarUrl")
      .populate("data.post", "title slug")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ 
      recipient: userId, 
      read: false 
    });

    return {
      notifications,
      total,
      unreadCount,
      page,
      pages: Math.ceil(total / limit)
    };
  }

  // Mark notification as read
  static async markAsRead(notificationId, userId) {
    await Notification.updateOne(
      { _id: notificationId, recipient: userId },
      { read: true }
    );
  }

  // Mark all notifications as read
  static async markAllAsRead(userId) {
    await Notification.updateMany(
      { recipient: userId, read: false },
      { read: true }
    );
  }

  // Delete notification
  static async deleteNotification(notificationId, userId) {
    await Notification.deleteOne({
      _id: notificationId,
      recipient: userId
    });
  }

  // Delete old notifications (older than 30 days)
  static async cleanupOldNotifications() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await Notification.deleteMany({ createdAt: { $lt: thirtyDaysAgo } });
  }
}

export default NotificationService;
