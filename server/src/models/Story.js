import mongoose from "mongoose";

/**
 * Story Schema - Định nghĩa cấu trúc cho Stories (tự động xóa sau 24h)
 * Tương tự Instagram/Facebook Stories
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
  
  // ==================== INTERACTIONS ====================
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
  
  // ==================== PRIVACY & STATUS ====================
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
  
  // ==================== EXPIRY ====================
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

// ==================== DATABASE INDEXES ====================
StorySchema.index({ author: 1, createdAt: -1 });
StorySchema.index({ expiresAt: 1, isActive: 1 }); // Để tự động xóa expired stories
StorySchema.index({ "views.user": 1 });

// ==================== VIRTUAL PROPERTIES ====================

/**
 * Đếm số lượt xem
 */
StorySchema.virtual('viewCount').get(function() {
  return this.views ? this.views.length : 0;
});

/**
 * Đếm số reactions
 */
StorySchema.virtual('reactionCount').get(function() {
  return this.reactions ? this.reactions.length : 0;
});

/**
 * Kiểm tra story đã hết hạn chưa
 */
StorySchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

/**
 * Thời gian còn lại (milliseconds)
 */
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

/**
 * Xóa tất cả stories đã hết hạn
 */
StorySchema.statics.cleanExpiredStories = async function() {
  const result = await this.deleteMany({ 
    expiresAt: { $lt: new Date() } 
  });
  return result.deletedCount;
};

/**
 * Lấy active stories của một user
 */
StorySchema.statics.getActiveStoriesForUser = async function(userId) {
  return this.find({
    author: userId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  })
  .sort({ createdAt: -1 })
  .populate('author', 'name avatarUrl isVerified');
};

/**
 * Lấy stories feed cho user (stories của bạn bè + stories công khai)
 */
StorySchema.statics.getStoriesFeed = async function(userId, friendIds) {
  try {
    console.log(`[INFO][STORY] getStoriesFeed called for user: ${userId}`);
    console.log(`[INFO][STORY] Friend IDs: ${JSON.stringify(friendIds)}`);
    
    // Group stories theo author
    const stories = await this.aggregate([
      {
        $match: {
          isActive: true,
          expiresAt: { $gt: new Date() },
          $or: [
            // Stories của chính mình
            { author: new mongoose.Types.ObjectId(userId) },
            // Stories của bạn bè (tất cả visibility)
            { 
              author: { $in: (friendIds || []).map(id => new mongoose.Types.ObjectId(id)) }
            },
            // Stories công khai của tất cả mọi người (kể cả không phải bạn bè)
            { visibility: 'public' }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$author',
          stories: { $push: '$$ROOT' },
          latestStory: { $first: '$$ROOT' },
          storyCount: { $sum: 1 }
        }
      },
      {
        $sort: { 'latestStory.createdAt': -1 }
      }
    ]);
    
    console.log(`[INFO][STORY] Found ${stories.length} story groups from aggregate`);
    
    // Populate author info - Fix: populate _id field with User model
    await mongoose.model("User").populate(stories, {
      path: '_id',
      select: 'name avatarUrl isVerified'
    });
    
    console.log(`[INFO][STORY] After populate: ${stories.length} story groups`);
    
    // Filter stories based on visibility
    const filteredStories = [];
    for (const storyGroup of stories) {
      try {
        const authorId = storyGroup._id._id || storyGroup._id;
        const userFriends = friendIds || [];
        
        console.log(`[INFO][STORY] Processing story group for author: ${authorId}`);
        console.log(`[INFO][STORY] Stories in group: ${storyGroup.storyCount}`);
        
        // Filter stories within this group based on visibility
        const visibleStories = storyGroup.stories.filter(story => {
          // Own stories - always visible
          if (story.author.toString() === userId.toString()) {
            return true;
          }
          
          // Check if story is hidden from this user
          if (story.hiddenFrom && story.hiddenFrom.some(id => id.toString() === userId.toString())) {
            return false;
          }
          
          // Public stories - always visible to everyone
          if (story.visibility === 'public') {
            return true;
          }
          
          // Friends stories - only visible to friends
          if (story.visibility === 'friends' && userFriends.some(fid => fid.toString() === story.author.toString())) {
            return true;
          }
          
          return false;
        });
        
        console.log(`[INFO][STORY] Visible stories: ${visibleStories.length}/${storyGroup.storyCount}`);
        
        if (visibleStories.length > 0) {
          filteredStories.push({
            ...storyGroup,
            stories: visibleStories,
            storyCount: visibleStories.length,
            latestStory: visibleStories[0] // Most recent visible story
          });
        }
      } catch (groupError) {
        console.error(`[ERROR][STORY] Error processing story group:`, groupError);
        // Continue with other groups
      }
    }
    
    console.log(`[INFO][STORY] Final filtered stories: ${filteredStories.length} groups`);
    return filteredStories;
    
  } catch (error) {
    console.error(`[ERROR][STORY] Error in getStoriesFeed:`, error);
    throw error;
  }
};

// Enable virtuals in JSON
StorySchema.set('toJSON', { virtuals: true });
StorySchema.set('toObject', { virtuals: true });

export default mongoose.model("Story", StorySchema);
