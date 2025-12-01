import mongoose from "mongoose";

/**
 * Story Schema
 * Lưu Stories (tự động hết hạn sau 24 giờ) — tương tự Instagram/Facebook
 */
const StorySchema = new mongoose.Schema({
  // ==================== THÔNG TIN CƠ BẢN ====================
  author: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true,
    index: true 
  },
  
  // ==================== MEDIA ====================
  mediaUrl: { 
    type: String, 
    required: true 
  }, // URL của ảnh/video
  
  mediaType: { 
    type: String, 
    enum: ["image", "video"], 
    required: true 
  }, // Loại media
  
  thumbnailUrl: { 
    type: String 
  }, // Thumbnail cho video (optional)
  
  // ==================== NỘI DUNG ====================
  caption: { 
    type: String, 
    maxlength: 500,
    default: "" 
  }, // Text overlay (optional)
  
  backgroundColor: { 
    type: String, 
    default: "#000000" 
  }, // Màu nền nếu text-only
  
  textColor: { 
    type: String, 
    default: "#FFFFFF" 
  }, // Màu chữ
  
  // ==================== TƯƠNG TÁC ====================
  views: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    viewedAt: { type: Date, default: Date.now }
  }], // Danh sách người xem
  
  reactions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { 
      type: String, 
      enum: ["like", "love", "laugh", "wow", "sad", "angry"],
      required: true 
    },
    reactedAt: { type: Date, default: Date.now }
  }], // Reactions như messages
  
  // ==================== QUYỀN RIÊNG TƯ & TRẠNG THÁI ====================
  visibility: {
    type: String,
    enum: ["public", "friends", "custom"],
    default: "friends"
  },
  
  hiddenFrom: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }], // Users bị ẩn story
  
  isActive: { 
    type: Boolean, 
    default: true 
  }, // Story còn active hay không
  
  // ==================== HẾT HẠN (EXPIRY) ====================
  expiresAt: { 
    type: Date, 
    required: true,
    index: true,
    default: function() {
      return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    }
  },
  
  // ==================== METADATA ====================
  duration: { 
    type: Number, 
    default: 5 
  }, // Thời gian hiển thị (giây) cho ảnh, auto-detect cho video
  
  music: {
    title: String,
    artist: String,
    url: String
  } // Background music (optional)
  
}, { 
  timestamps: true 
});

// Indexes: tối ưu truy vấn theo tác giả, trạng thái hoạt động và thời điểm hết hạn
StorySchema.index({ author: 1, createdAt: -1 });
StorySchema.index({ expiresAt: 1, isActive: 1 }); // Dùng khi xóa stories đã hết hạn
StorySchema.index({ "views.user": 1 });

// Virtuals tiện ích
// Số lượt xem
StorySchema.virtual('viewCount').get(function() {
  return this.views ? this.views.length : 0;
});

// Số reactions
StorySchema.virtual('reactionCount').get(function() {
  return this.reactions ? this.reactions.length : 0;
});

// Kiểm tra story đã hết hạn hay chưa
StorySchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

// Thời gian còn lại (ms)
StorySchema.virtual('timeRemaining').get(function() {
  return Math.max(0, this.expiresAt - new Date());
});

// ==================== INSTANCE METHODS ====================

/**
 * Kiểm tra user đã xem story chưa
 */
StorySchema.methods.hasViewed = function(userId) {
  return this.views.some(v => v.user.toString() === userId.toString());
};

/**
 * Thêm view cho story
 */
StorySchema.methods.addView = function(userId) {
  if (!this.hasViewed(userId)) {
    this.views.push({ user: userId, viewedAt: new Date() });
    return this.save();
  }
  return Promise.resolve(this);
};

/**
 * Kiểm tra user đã react chưa
 */
StorySchema.methods.hasReacted = function(userId) {
  return this.reactions.some(r => r.user.toString() === userId.toString());
};

/**
 * Thêm/update reaction
 */
StorySchema.methods.toggleReaction = async function(userId, type) {
  const existingIdx = this.reactions.findIndex(r => r.user.toString() === userId.toString());
  
  if (existingIdx > -1) {
    // Nếu cùng type thì xóa, khác type thì update
    if (this.reactions[existingIdx].type === type) {
      this.reactions.splice(existingIdx, 1);
    } else {
      this.reactions[existingIdx].type = type;
      this.reactions[existingIdx].reactedAt = new Date();
    }
  } else {
    // Thêm reaction mới
    this.reactions.push({ user: userId, type, reactedAt: new Date() });
  }
  
  return this.save();
};

/**
 * Kiểm tra user có quyền xem story không
 */
StorySchema.methods.canView = function(userId, userFriends = []) {
  // Author luôn xem được
  if (this.author.toString() === userId.toString()) {
    return true;
  }
  
  // Kiểm tra bị ẩn
  if (this.hiddenFrom.some(id => id.toString() === userId.toString())) {
    return false;
  }
  
  // Kiểm tra visibility
  if (this.visibility === "public") {
    return true;
  }
  
  if (this.visibility === "friends") {
    return userFriends.some(fid => fid.toString() === this.author.toString());
  }
  
  // Custom visibility (có thể mở rộng sau)
  return false;
};

// ==================== STATIC METHODS ====================

// Xóa tất cả stories đã hết hạn
StorySchema.statics.cleanExpiredStories = async function() {
  const result = await this.deleteMany({ expiresAt: { $lt: new Date() } });
  return result.deletedCount;
};

// Lấy stories đang active của 1 user (chưa hết hạn)
StorySchema.statics.getActiveStoriesForUser = async function(userId) {
  return this.find({
    author: userId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  })
  .sort({ createdAt: -1 })
  .populate('author', 'name avatarUrl isVerified');
};

// Lấy stories feed cho user: stories của chính user, bạn bè và stories public
StorySchema.statics.getStoriesFeed = async function(userId, friendIds) {
  try {
    // Group stories theo author và lọc theo visibility sau khi aggregate
    const stories = await this.aggregate([
      {
        $match: {
          isActive: true,
          expiresAt: { $gt: new Date() },
          $or: [
            { author: new mongoose.Types.ObjectId(userId) },
            { author: { $in: (friendIds || []).map(id => new mongoose.Types.ObjectId(id)) } },
            { visibility: 'public' }
          ]
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$author',
          stories: { $push: '$$ROOT' },
          latestStory: { $first: '$$ROOT' },
          storyCount: { $sum: 1 }
        }
      },
      { $sort: { 'latestStory.createdAt': -1 } }
    ]);

    // Populate author info
    await mongoose.model("User").populate(stories, { path: '_id', select: 'name avatarUrl isVerified' });

    // Lọc stories trong mỗi nhóm theo visibility (own, public, friends)
    const filteredStories = [];
    for (const storyGroup of stories) {
      try {
        const userFriends = friendIds || [];
        const visibleStories = storyGroup.stories.filter(story => {
          if (story.author.toString() === userId.toString()) return true; // own
          if (story.hiddenFrom && story.hiddenFrom.some(id => id.toString() === userId.toString())) return false;
          if (story.visibility === 'public') return true;
          if (story.visibility === 'friends' && userFriends.some(fid => fid.toString() === story.author.toString())) return true;
          return false;
        });

        if (visibleStories.length > 0) {
          filteredStories.push({
            ...storyGroup,
            stories: visibleStories,
            storyCount: visibleStories.length,
            latestStory: visibleStories[0]
          });
        }
      } catch (groupError) {
        // Continue with other groups on error
      }
    }

    return filteredStories;
  } catch (error) {
    throw error;
  }
};

// Enable virtuals in JSON
StorySchema.set('toJSON', { virtuals: true });
StorySchema.set('toObject', { virtuals: true });

export default mongoose.model("Story", StorySchema);
