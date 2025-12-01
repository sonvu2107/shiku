/**
 * Notification Service
 * 
 * Service xử lý các thao tác liên quan đến thông báo:
 * - Tạo thông báo (comment, reply, reaction, mention, ban, etc.)
 * - Lấy danh sách thông báo của user
 * - Đánh dấu đã đọc
 * - Xóa thông báo
 * - Cleanup thông báo cũ
 * 
 * @module NotificationService
 */

import Notification from "../models/Notification.js";
import User from "../models/User.js";

class NotificationService {
  
  /**
   * Tạo thông báo mới
   * @param {Object} options - Tùy chọn thông báo
   * @param {string} options.recipient - ID người nhận
   * @param {string|null} options.sender - ID người gửi (null cho system)
   * @param {string} options.type - Loại thông báo
   * @param {string} options.title - Tiêu đề
   * @param {string} options.message - Nội dung
   * @param {Object} options.data - Dữ liệu bổ sung
   * @returns {Promise<Object>} Notification đã tạo
   */
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

  /**
   * Tạo thông báo khi có comment mới
   * @param {Object} comment - Comment object
   * @param {Object} post - Post object
   * @param {Object} commenter - User đã comment
   */
  static async createCommentNotification(comment, post, commenter) {
    if (post.author.toString() === commenter._id.toString()) return; // Không thông báo cho chính mình
    
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

  /**
   * Tạo thông báo khi có reply mới
   * @param {Object} reply - Reply comment object
   * @param {Object} parentComment - Comment gốc
   * @param {Object} post - Post object
   * @param {Object} replier - User đã reply
   */
  static async createReplyNotification(reply, parentComment, post, replier) {
    if (parentComment.author.toString() === replier._id.toString()) return; // Không thông báo cho chính mình
    
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

  /**
   * Tạo thông báo khi có reaction mới
   * @param {Object} post - Post object
   * @param {Object} reactor - User đã react
   * @param {string} reactionType - Loại reaction (like, love, haha, wow, sad, angry)
   */
  static async createReactionNotification(post, reactor, reactionType) {
    if (post.author.toString() === reactor._id.toString()) return; // Không thông báo cho chính mình
    
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

  /**
   * Tạo thông báo khi được mention trong post
   * @param {Object} post - Post object
   * @param {Array} mentionedUserIds - Mảng các user IDs được mention
   * @param {Object} mentioner - User đã mention
   */
  static async createPostMentionNotification(post, mentionedUserIds, mentioner) {
    // Không thông báo nếu mention chính mình
    const userIdsToNotify = mentionedUserIds.filter(
      userId => userId.toString() !== mentioner._id.toString()
    );

    if (userIdsToNotify.length === 0) return;

    // Create notifications for all mentioned users
    const notifications = userIdsToNotify.map(userId => ({
      recipient: userId,
      sender: mentioner._id,
      type: "mention",
      title: "Bạn được đề cập",
      message: `${mentioner.name} đã đề cập đến bạn trong bài viết "${post.title}"`,
      data: {
        post: post._id,
        url: `/post/${post.slug}`,
        metadata: { mentionType: "post" }
      }
    }));

    await Notification.insertMany(notifications);
  }

  /**
   * Tạo thông báo khi được mention trong comment
   * @param {Object} comment - Comment object
   * @param {Object} post - Post object
   * @param {Array} mentionedUserIds - Mảng các user IDs được mention
   * @param {Object} mentioner - User đã mention
   */
  static async createCommentMentionNotification(comment, post, mentionedUserIds, mentioner) {
    // Không thông báo nếu mention chính mình
    const userIdsToNotify = mentionedUserIds.filter(
      userId => userId.toString() !== mentioner._id.toString()
    );

    if (userIdsToNotify.length === 0) return;

    // Create notifications for all mentioned users
    const notifications = userIdsToNotify.map(userId => ({
      recipient: userId,
      sender: mentioner._id,
      type: "mention",
      title: "Bạn được đề cập",
      message: `${mentioner.name} đã đề cập đến bạn trong một bình luận`,
      data: {
        post: post._id,
        comment: comment._id,
        url: `/post/${post.slug}#comment-${comment._id}`,
        metadata: { mentionType: "comment" }
      }
    }));

    await Notification.insertMany(notifications);
  }

  /**
   * Tạo thông báo khi user bị ban
   * @param {Object} bannedUser - User bị ban
   * @param {Object} adminUser - Admin đã ban
   * @param {string} reason - Lý do ban
   * @param {Date|null} expiresAt - Thời gian hết hạn ban (null = vĩnh viễn)
   */
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

  /**
   * Tạo thông báo khi user được gỡ ban
   * @param {Object} unbannedUser - User được gỡ ban
   * @param {Object} adminUser - Admin đã gỡ ban
   */
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

  /**
   * Tạo thông báo hệ thống cho tất cả users (hoặc theo role)
   * @param {string} title - Tiêu đề
   * @param {string} message - Nội dung
   * @param {string|null} targetRole - Role cụ thể (null = tất cả users)
   */
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

  /**
   * Tạo thông báo broadcast từ admin cho tất cả users
   * Sử dụng batch processing để tránh quá tải
   * 
   * @param {Object} adminUser - Admin user
   * @param {string} title - Tiêu đề
   * @param {string} message - Nội dung
   */
  static async createAdminBroadcast(adminUser, title, message) {
    const BATCH_SIZE = 500; // Xử lý 500 users mỗi batch
    const cursor = User.find({}).select("_id").cursor();
    
    let batch = [];
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      batch.push({
        recipient: doc._id,
        sender: adminUser._id,
        type: "admin_message",
        title,
        message,
        data: {},
        createdAt: new Date() // Add timestamp manually since insertMany bypasses hooks
      });

      // Khi batch đầy
      if (batch.length >= BATCH_SIZE) {
        await Notification.insertMany(batch);
        batch = []; // Giải phóng memory
        
        // Nghỉ 50ms để tránh block CPU
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    // Insert phần còn lại
    if (batch.length > 0) {
      await Notification.insertMany(batch);
    }
  }

  /**
   * Lấy danh sách thông báo của user
   * @param {string} userId - User ID
   * @param {number} page - Số trang
   * @param {number} limit - Số lượng mỗi trang
   * @param {string|null} filter - Filter (unread, read, null = tất cả)
   * @returns {Promise<Object>} Danh sách thông báo và metadata
   */
  static async getUserNotifications(userId, page = 1, limit = 20, filter = null) {
    const skip = (page - 1) * limit;
    
    let query = { recipient: userId };
    
    // Áp dụng filter
    if (filter === "unread") {
      query.read = false;
    } else if (filter === "read") {
      query.read = true;
    }
    
    // Sử dụng .lean() để tăng hiệu năng
    const notifications = await Notification
      .find(query)
      .populate("sender", "name avatarUrl")
      .populate("data.post", "title slug")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

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

  /**
   * Đánh dấu thông báo là đã đọc
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID
   */
  static async markAsRead(notificationId, userId) {
    await Notification.updateOne(
      { _id: notificationId, recipient: userId },
      { read: true }
    );
  }

  /**
   * Đánh dấu tất cả thông báo là đã đọc
   * @param {string} userId - User ID
   */
  static async markAllAsRead(userId) {
    await Notification.updateMany(
      { recipient: userId, read: false },
      { read: true }
    );
  }

  /**
   * Xóa thông báo
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID
   */
  static async deleteNotification(notificationId, userId) {
    await Notification.deleteOne({
      _id: notificationId,
      recipient: userId
    });
  }

  /**
   * Xóa thông báo cũ (cũ hơn 30 ngày)
   * Nên chạy định kỳ (cron job)
   */
  static async cleanupOldNotifications() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await Notification.deleteMany({ createdAt: { $lt: thirtyDaysAgo } });
  }
}

export default NotificationService;
