import express from "express";
import Story from "../models/Story.js";
import User from "../models/User.js";
import { authRequired } from "../middleware/auth.js";
import { checkBanStatus } from "../middleware/banCheck.js";
import NotificationService from "../services/NotificationService.js";

const router = express.Router();

/**
 * GET /api/stories/feed - Lấy stories feed (của bạn bè)
 * Trả về danh sách users có stories và stories của họ
 */
router.get("/feed", authRequired, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('friends');
    if (!user) {
      return res.status(404).json({ error: "User không tồn tại" });
    }

    console.log(`[INFO][STORIES] Loading stories feed for user: ${user.name} (${req.user._id})`);
    console.log(`[INFO][STORIES] User friends: ${user.friends?.length || 0} friends`);
    
    // Lấy stories feed
    const storiesFeed = await Story.getStoriesFeed(req.user._id, user.friends);
    
    console.log(`[INFO][STORIES] Found ${storiesFeed.length} story groups`);
    storiesFeed.forEach(group => {
      console.log(`[INFO][STORIES] - ${group._id?.name}: ${group.storyCount} stories`);
    });
    
    res.json({ 
      success: true,
      storiesGroups: storiesFeed 
    });
  } catch (error) {
    console.error('[ERROR][STORIES] Error loading stories feed:', error);
    next(error);
  }
});

/**
 * GET /api/stories/user/:userId - Lấy tất cả active stories của một user
 */
router.get("/user/:userId", authRequired, async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Lấy thông tin user và friends để check permission
    const currentUser = await User.findById(req.user._id).select('friends');
    
    const stories = await Story.getActiveStoriesForUser(userId);
    
    // Filter stories user có quyền xem
    const viewableStories = stories.filter(story => 
      story.canView(req.user._id, currentUser.friends)
    );
    
    res.json({ 
      success: true,
      stories: viewableStories 
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/stories/:storyId - Lấy chi tiết một story
 */
router.get("/:storyId", authRequired, async (req, res, next) => {
  try {
    const story = await Story.findById(req.params.storyId)
      .populate('author', 'name avatarUrl isVerified')
      .populate('views.user', 'name avatarUrl')
      .populate('reactions.user', 'name avatarUrl');
    
    if (!story) {
      return res.status(404).json({ error: "Story không tồn tại" });
    }
    
    // Kiểm tra quyền xem
    const user = await User.findById(req.user._id).select('friends');
    if (!story.canView(req.user._id, user.friends)) {
      return res.status(403).json({ error: "Bạn không có quyền xem story này" });
    }
    
    // Tự động thêm view nếu chưa xem
    if (!story.hasViewed(req.user._id)) {
      await story.addView(req.user._id);
    }
    
    res.json({ 
      success: true,
      story 
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/stories - Tạo story mới
 */
router.post("/", authRequired, checkBanStatus, async (req, res, next) => {
  try {
    const { 
      mediaUrl, 
      mediaType, 
      thumbnailUrl,
      caption, 
      backgroundColor,
      textColor,
      visibility, 
      hiddenFrom,
      duration,
      music
    } = req.body;
    
    // Validation
    if (!mediaUrl || !mediaType) {
      return res.status(400).json({ error: "Thiếu mediaUrl hoặc mediaType" });
    }
    
    if (!["image", "video"].includes(mediaType)) {
      return res.status(400).json({ error: "mediaType không hợp lệ" });
    }
    
    if (visibility && !["public", "friends", "custom"].includes(visibility)) {
      return res.status(400).json({ error: "visibility không hợp lệ" });
    }
    
    // Tạo story
    const story = new Story({
      author: req.user._id,
      mediaUrl,
      mediaType,
      thumbnailUrl,
      caption: caption || "",
      backgroundColor: backgroundColor || "#000000",
      textColor: textColor || "#FFFFFF",
      visibility: visibility || "friends",
      hiddenFrom: hiddenFrom || [],
      duration: duration || (mediaType === "image" ? 5 : undefined),
      music: music || undefined
    });
    
    await story.save();
    
    // Populate author info
    await story.populate('author', 'name avatarUrl isVerified');
    
    res.status(201).json({ 
      success: true,
      story 
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/stories/:storyId/view - Đánh dấu đã xem story
 */
router.post("/:storyId/view", authRequired, async (req, res, next) => {
  try {
    const story = await Story.findById(req.params.storyId);
    
    if (!story) {
      return res.status(404).json({ error: "Story không tồn tại" });
    }
    
    // Kiểm tra quyền xem
    const user = await User.findById(req.user._id).select('friends');
    if (!story.canView(req.user._id, user.friends)) {
      return res.status(403).json({ error: "Bạn không có quyền xem story này" });
    }
    
    // Thêm view
    await story.addView(req.user._id);
    
    res.json({ 
      success: true,
      viewCount: story.viewCount 
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/stories/:storyId/react - React vào story
 */
router.post("/:storyId/react", authRequired, async (req, res, next) => {
  try {
    const { type } = req.body;
    
    // Validation
    const validTypes = ["like", "love", "laugh", "wow", "sad", "angry"];
    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({ error: "Loại reaction không hợp lệ" });
    }
    
    const story = await Story.findById(req.params.storyId);
    
    if (!story) {
      return res.status(404).json({ error: "Story không tồn tại" });
    }
    
    // Kiểm tra quyền xem
    const user = await User.findById(req.user._id).select('friends');
    if (!story.canView(req.user._id, user.friends)) {
      return res.status(403).json({ error: "Bạn không có quyền react story này" });
    }
    
    // Toggle reaction
    await story.toggleReaction(req.user._id, type);
    
    // Gửi notification cho author (nếu không phải chính mình)
    if (story.author.toString() !== req.user._id.toString()) {
      try {
        // Lấy thông tin reaction type để hiển thị emoji
        const reactionEmojis = {
          like: '👍',
          love: '❤️',
          laugh: '😂',
          sad: '😢',
          angry: '😠'
        };
        
        const emoji = reactionEmojis[type] || '😊';
        
        await NotificationService.create({
          recipient: story.author,
          sender: req.user._id,
          type: "reaction",
          title: "Phản ứng story mới",
          message: `${req.user.name} đã thả cảm xúc ${emoji} với story của bạn`,
          data: {
            url: `/stories/${story._id}`,
            metadata: { 
              reactionType: type,
              storyId: story._id,
              emoji: emoji
            }
          }
        });
      } catch (notifError) {
        // Silent fail cho notification
        console.error('[ERROR][STORIES] Notification error:', notifError);
      }
    }
    
    // Populate reactions
    await story.populate('reactions.user', 'name avatarUrl');
    
    res.json({ 
      success: true,
      reactions: story.reactions,
      reactionCount: story.reactionCount
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/stories/:storyId - Xóa story
 */
router.delete("/:storyId", authRequired, async (req, res, next) => {
  try {
    const story = await Story.findById(req.params.storyId);
    
    if (!story) {
      return res.status(404).json({ error: "Story không tồn tại" });
    }
    
    // Chỉ author hoặc admin mới được xóa
    if (story.author.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ error: "Bạn không có quyền xóa story này" });
    }
    
    await story.deleteOne();
    
    res.json({ 
      success: true,
      message: "Đã xóa story" 
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/stories/:storyId/views - Lấy danh sách người xem (chỉ author)
 */
router.get("/:storyId/views", authRequired, async (req, res, next) => {
  try {
    const story = await Story.findById(req.params.storyId)
      .populate('views.user', 'name avatarUrl isVerified isOnline');
    
    if (!story) {
      return res.status(404).json({ error: "Story không tồn tại" });
    }
    
    // Chỉ author mới xem được danh sách viewers
    if (story.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Bạn không có quyền xem danh sách này" });
    }
    
    res.json({ 
      success: true,
      views: story.views,
      viewCount: story.viewCount
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/stories/:storyId/reactions - Lấy danh sách reactions (chỉ author)
 */
router.get("/:storyId/reactions", authRequired, async (req, res, next) => {
  try {
    const story = await Story.findById(req.params.storyId)
      .populate('reactions.user', 'name avatarUrl isVerified isOnline');
    
    if (!story) {
      return res.status(404).json({ error: "Story không tồn tại" });
    }
    
    // Chỉ author mới xem được danh sách reactions
    if (story.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Bạn không có quyền xem danh sách này" });
    }
    
    res.json({ 
      success: true,
      reactions: story.reactions,
      reactionCount: story.reactionCount
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/stories/:storyId/analytics - Lấy thống kê chi tiết (chỉ author)
 * Tối ưu: Chỉ populate cần thiết, giới hạn số lượng
 */
router.get("/:storyId/analytics", authRequired, async (req, res, next) => {
  try {
    const { limit = 20, offset = 0, quick = false } = req.query;
    
    // Kiểm tra story tồn tại và quyền truy cập trước
    const story = await Story.findById(req.params.storyId).select('author createdAt expiresAt');
    
    if (!story) {
      return res.status(404).json({ error: "Story không tồn tại" });
    }
    
    // Chỉ author mới xem được analytics
    if (story.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Bạn không có quyền xem thống kê này" });
    }
    
    // Quick mode - chỉ lấy số liệu cơ bản
    if (quick === 'true') {
      const basicStats = await Story.findById(req.params.storyId)
        .populate('views.user', 'name avatarUrl isVerified isOnline')
        .populate('reactions.user', 'name avatarUrl isVerified isOnline')
        .select('views reactions createdAt expiresAt');
      
      const totalViews = basicStats.views?.length || 0;
      const totalReactions = basicStats.reactions?.length || 0;
      const uniqueViewers = new Set(basicStats.views?.map(v => v.user._id.toString())).size;
      const engagementRate = uniqueViewers > 0 ? Math.round((totalReactions / uniqueViewers) * 100) : 0;
      
      // Reaction summary
      const reactionSummary = {};
      basicStats.reactions?.forEach(reaction => {
        reactionSummary[reaction.type] = (reactionSummary[reaction.type] || 0) + 1;
      });
      
      const reactionSummaryArray = Object.entries(reactionSummary).map(([type, count]) => ({
        type,
        count
      }));
      
      const timeSinceCreated = Math.floor((new Date() - new Date(story.createdAt)) / (1000 * 60 * 60));
      
      return res.json({
        success: true,
        analytics: {
          totalViews,
          totalReactions,
          uniqueViewers,
          engagementRate,
          timeSinceCreated: timeSinceCreated < 1 ? 'Vừa tạo' : `${timeSinceCreated}h trước`,
          views: basicStats.views || [],
          reactions: basicStats.reactions || [],
          reactionSummary: reactionSummaryArray,
          createdAt: story.createdAt,
          expiresAt: story.expiresAt,
          quick: true
        }
      });
    }
    
    // Full mode - lấy dữ liệu chi tiết
    const [viewsData, reactionsData] = await Promise.all([
      // Views với giới hạn
      Story.findById(req.params.storyId)
        .populate({
          path: 'views.user',
          select: 'name avatarUrl isVerified isOnline',
          options: { limit: parseInt(limit), skip: parseInt(offset) }
        })
        .select('views createdAt'),
      
      // Reactions với giới hạn
      Story.findById(req.params.storyId)
        .populate({
          path: 'reactions.user',
          select: 'name avatarUrl isVerified isOnline',
          options: { limit: parseInt(limit), skip: parseInt(offset) }
        })
        .select('reactions')
    ]);
    
    // Tính toán analytics nhanh
    const totalViews = viewsData.views?.length || 0;
    const totalReactions = reactionsData.reactions?.length || 0;
    
    // Tính unique viewers từ views hiện tại (có thể không chính xác 100% nếu có pagination)
    const uniqueViewers = new Set(viewsData.views?.map(v => v.user._id.toString())).size;
    
    // Tính engagement rate
    const engagementRate = uniqueViewers > 0 ? Math.round((totalReactions / uniqueViewers) * 100) : 0;
    
    // Reaction summary
    const reactionSummary = {};
    reactionsData.reactions?.forEach(reaction => {
      reactionSummary[reaction.type] = (reactionSummary[reaction.type] || 0) + 1;
    });
    
    const reactionSummaryArray = Object.entries(reactionSummary).map(([type, count]) => ({
      type,
      count
    }));
    
    // Thời gian từ khi tạo
    const timeSinceCreated = Math.floor((new Date() - new Date(story.createdAt)) / (1000 * 60 * 60)); // hours
    
    const analytics = {
      totalViews,
      totalReactions,
      uniqueViewers,
      engagementRate,
      timeSinceCreated: timeSinceCreated < 1 ? 'Vừa tạo' : `${timeSinceCreated}h trước`,
      views: viewsData.views || [],
      reactions: reactionsData.reactions || [],
      reactionSummary: reactionSummaryArray,
      createdAt: story.createdAt,
      expiresAt: story.expiresAt,
      // Thêm thông tin pagination
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (viewsData.views?.length || 0) >= parseInt(limit) || (reactionsData.reactions?.length || 0) >= parseInt(limit)
      }
    };
    
    res.json({ 
      success: true,
      analytics
    });
  } catch (error) {
    console.error('[ERROR][STORIES] Analytics error:', error);
    next(error);
  }
});

/**
 * GET /api/stories/my - Lấy stories của chính mình
 */
router.get("/my/all", authRequired, async (req, res, next) => {
  try {
    const stories = await Story.getActiveStoriesForUser(req.user._id);
    
    res.json({ 
      success: true,
      stories 
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/stories/cleanup - Cleanup expired stories (admin only hoặc cron job)
 */
router.post("/cleanup", authRequired, async (req, res, next) => {
  try {
    // Chỉ admin được cleanup manually
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Chỉ admin mới có quyền cleanup stories" });
    }
    
    const deletedCount = await Story.cleanExpiredStories();
    
    res.json({ 
      success: true,
      message: `Đã xóa ${deletedCount} stories hết hạn` 
    });
  } catch (error) {
    next(error);
  }
});

export default router;
