import Post from "../models/Post.js";
import User from "../models/User.js";
import Comment from "../models/Comment.js";
import mongoose from "mongoose";

/**
 * Calculate engagement score for a post
 * Higher score = more engaging content
 */
export function calculateEngagementScore(post, commentsCount = 0) {
  const emotesCount = post.emotes?.length || 0;
  const views = post.views || 0;
  
  // Time decay: older posts get lower scores
  const createdAt = new Date(post.createdAt);
  const hoursSincePost = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  
  // Safety check: if post is in future or invalid, treat as very recent (0.1 hours)
  const safeHours = Math.max(hoursSincePost, 0.1);
  const timeDecay = Math.pow(safeHours + 2, 1.5); // Gravity factor 1.5
  
  // Weighted engagement score
  // Comments are worth more than emotes, views have minimal weight
  const engagementScore = (
    emotesCount * 1 +      // Each emote = 1 point
    commentsCount * 3 +    // Each comment = 3 points (more valuable)
    views * 0.01           // Views have minimal impact (0.01 point each)
  );
  
  // Final score with time decay
  // Prevent division by zero or very small numbers
  return engagementScore / Math.max(timeDecay, 0.1);
}

/**
 * Get posts from user's friends with engagement scoring
 * @param {string} userId - Current user ID
 * @param {number} limit - Number of posts to return
 */
export async function getFriendsPosts(userId, limit = 10) {
  if (!userId) return [];
  
  // Validate userId is valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    console.warn('Invalid userId for friends posts:', userId);
    return [];
  }
  
  try {
    // Get user's friends list
    const user = await User.findById(userId).select('friends').lean();
    if (!user || !user.friends || user.friends.length === 0) return [];
    
    const friendIds = user.friends.map(f => f.toString());
    
    // Get posts from friends
    const posts = await Post.find({
      author: { $in: friendIds },
      status: "published",
      $or: [
        { group: { $exists: false } },
        { group: null }
      ]
    })
      .populate("author", "name nickname avatarUrl role")
      .sort({ createdAt: -1 })
      .limit(limit * 3) // Get more to score and filter
      .lean();
    
    // Get comment counts for scoring
    const postIds = posts.map(p => p._id);
    let commentCounts = [];
    
    if (postIds.length > 0) {
      commentCounts = await Comment.aggregate([
        { $match: { post: { $in: postIds } } },
        { $group: { _id: "$post", count: { $sum: 1 } } }
      ]);
    }
    
    const commentCountMap = new Map(
      commentCounts.map(c => [c._id.toString(), c.count])
    );
    
    // Calculate scores and sort
    const scoredPosts = posts.map(post => ({
      ...post,
      _score: calculateEngagementScore(post, commentCountMap.get(post._id.toString()) || 0)
    }));
    
    return scoredPosts
      .sort((a, b) => b._score - a._score)
      .slice(0, limit);
      
  } catch (error) {
    console.error("Error getting friends posts:", error);
    return [];
  }
}

/**
 * Get trending posts from last 24 hours
 * @param {number} limit - Number of posts to return
 */
export async function getTrendingPosts(limit = 10) {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const posts = await Post.find({
      status: "published",
      createdAt: { $gte: oneDayAgo },
      $or: [
        { group: { $exists: false } },
        { group: null }
      ]
    })
      .populate("author", "name nickname avatarUrl role")
      .lean();
    
    // Get comment counts
    const postIds = posts.map(p => p._id);
    let commentCounts = [];
    
    if (postIds.length > 0) {
      commentCounts = await Comment.aggregate([
        { $match: { post: { $in: postIds } } },
        { $group: { _id: "$post", count: { $sum: 1 } } }
      ]);
    }
    
    const commentCountMap = new Map(
      commentCounts.map(c => [c._id.toString(), c.count])
    );
    
    // Calculate scores
    const scoredPosts = posts.map(post => ({
      ...post,
      _score: calculateEngagementScore(post, commentCountMap.get(post._id.toString()) || 0)
    }));
    
    return scoredPosts
      .sort((a, b) => b._score - a._score)
      .slice(0, limit);
      
  } catch (error) {
    console.error("Error getting trending posts:", error);
    return [];
  }
}

/**
 * Get personalized posts based on user's interests
 * Uses tags from posts user has interacted with
 * @param {string} userId - Current user ID
 * @param {number} limit - Number of posts to return
 */
export async function getPersonalizedPosts(userId, limit = 10) {
  if (!userId) return [];
  
  // Validate userId is valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    console.warn('Invalid userId for personalized posts:', userId);
    return [];
  }
  
  try {
    // Find posts user has emoted or commented on
    const userInteractedPosts = await Post.find({
      $or: [
        { "emotes.user": userId },
      ]
    })
      .select("tags")
      .limit(20) // Last 20 interactions
      .lean();
    
    // Also check comments
    const userComments = await Comment.find({ author: userId })
      .select("post")
      .limit(20)
      .lean();
    
    const commentedPostIds = userComments.map(c => c.post);
    const commentedPosts = await Post.find({
      _id: { $in: commentedPostIds }
    })
      .select("tags")
      .lean();
    
    // Combine all tags
    const allTags = [
      ...userInteractedPosts.flatMap(p => p.tags || []),
      ...commentedPosts.flatMap(p => p.tags || [])
    ];
    
    // Get unique tags and their frequency
    const tagFrequency = {};
    allTags.forEach(tag => {
      tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
    });
    
    // Get top 5 most frequent tags
    const topTags = Object.entries(tagFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);
    
    if (topTags.length === 0) return [];
    
    // Find posts with these tags that user hasn't interacted with
    const personalizedPosts = await Post.find({
      tags: { $in: topTags },
      status: "published",
      author: { $ne: userId }, // Not by current user
      "emotes.user": { $ne: userId }, // User hasn't emoted
      _id: { $nin: commentedPostIds }, // User hasn't commented
      $or: [
        { group: { $exists: false } },
        { group: null }
      ]
    })
      .populate("author", "name nickname avatarUrl role")
      .sort({ createdAt: -1 })
      .limit(limit * 2)
      .lean();
    
    // Get comment counts
    const postIds = personalizedPosts.map(p => p._id);
    let commentCounts = [];
    
    if (postIds.length > 0) {
      commentCounts = await Comment.aggregate([
        { $match: { post: { $in: postIds } } },
        { $group: { _id: "$post", count: { $sum: 1 } } }
      ]);
    }
    
    const commentCountMap = new Map(
      commentCounts.map(c => [c._id.toString(), c.count])
    );
    
    // Calculate scores
    const scoredPosts = personalizedPosts.map(post => ({
      ...post,
      _score: calculateEngagementScore(post, commentCountMap.get(post._id.toString()) || 0)
    }));
    
    return scoredPosts
      .sort((a, b) => b._score - a._score)
      .slice(0, limit);
      
  } catch (error) {
    console.error("Error getting personalized posts:", error);
    return [];
  }
}

/**
 * Get fresh/new content (posted in last 2 hours)
 * @param {number} limit - Number of posts to return
 */
export async function getFreshPosts(limit = 5) {
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    const posts = await Post.find({
      status: "published",
      createdAt: { $gte: twoHoursAgo },
      $or: [
        { group: { $exists: false } },
        { group: null }
      ]
    })
      .populate("author", "name nickname avatarUrl role")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    
    return posts;
    
  } catch (error) {
    console.error("Error getting fresh posts:", error);
    return [];
  }
}

/**
 * Mix and deduplicate posts from different sources
 * Maintains diversity by interleaving sources
 * @param {Array} friendsPosts - Posts from friends
 * @param {Array} trendingPosts - Trending posts
 * @param {Array} personalizedPosts - Personalized posts
 * @param {Array} freshPosts - Fresh posts
 */
export function mixAndDeduplicatePosts(friendsPosts, trendingPosts, personalizedPosts, freshPosts) {
  const seenIds = new Set();
  const mixedPosts = [];
  
  // Helper to add unique posts
  const addUnique = (posts) => {
    posts.forEach(post => {
      const postId = post._id.toString();
      if (!seenIds.has(postId)) {
        seenIds.add(postId);
        mixedPosts.push(post);
      }
    });
  };
  
  // Strategy: Interleave different sources for diversity
  // Pattern: Friend -> Trending -> Friend -> Personalized -> Fresh -> ...
  
  const maxLength = Math.max(
    friendsPosts.length,
    trendingPosts.length,
    personalizedPosts.length,
    freshPosts.length
  );
  
  for (let i = 0; i < maxLength; i++) {
    // Add friend post (priority)
    if (i < friendsPosts.length) {
      addUnique([friendsPosts[i]]);
    }
    
    // Add trending post
    if (i < trendingPosts.length) {
      addUnique([trendingPosts[i]]);
    }
    
    // Add personalized post
    if (i < personalizedPosts.length) {
      addUnique([personalizedPosts[i]]);
    }
    
    // Add fresh post
    if (i < freshPosts.length) {
      addUnique([freshPosts[i]]);
    }
  }
  
  return mixedPosts;
}

/**
 * Generate smart feed for a user
 * Main function that orchestrates all feed sources
 * @param {string} userId - Current user ID
 * @param {number} totalLimit - Total number of posts to return
 */
export async function generateSmartFeed(userId, totalLimit = 20) {
  try {
    // Validate and sanitize totalLimit
    const sanitizedLimit = Math.min(Math.max(parseInt(totalLimit) || 20, 1), 100);
    
    // Calculate limits for each source (percentages)
    const friendsLimit = Math.ceil(sanitizedLimit * 0.4);  // 40%
    const trendingLimit = Math.ceil(sanitizedLimit * 0.3); // 30%
    const personalizedLimit = Math.ceil(sanitizedLimit * 0.2); // 20%
    const freshLimit = Math.ceil(sanitizedLimit * 0.1);    // 10%
    
    // Fetch all sources in parallel for better performance
    const [friendsPosts, trendingPosts, personalizedPosts, freshPosts] = await Promise.all([
      getFriendsPosts(userId, friendsLimit),
      getTrendingPosts(trendingLimit),
      getPersonalizedPosts(userId, personalizedLimit),
      getFreshPosts(freshLimit)
    ]);
    
    // Mix and deduplicate
    const mixedFeed = mixAndDeduplicatePosts(
      friendsPosts,
      trendingPosts,
      personalizedPosts,
      freshPosts
    );
    
    // If we don't have enough posts, fill with recent posts
    if (mixedFeed.length < totalLimit) {
      const seenIds = new Set(mixedFeed.map(p => p._id.toString()));
      
      const fillerPosts = await Post.find({
        status: "published",
        _id: { $nin: Array.from(seenIds).map(id => new mongoose.Types.ObjectId(id)) },
        $or: [
          { group: { $exists: false } },
          { group: null }
        ]
      })
        .populate("author", "name nickname avatarUrl role")
        .sort({ createdAt: -1 })
        .limit(sanitizedLimit - mixedFeed.length)
        .lean();
      
      mixedFeed.push(...fillerPosts);
    }
    
    // Limit to requested amount
    return mixedFeed.slice(0, sanitizedLimit);
    
  } catch (error) {
    console.error("Error generating smart feed:", error);
    throw error;
  }
}
