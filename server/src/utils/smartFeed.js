import Post from "../models/Post.js";
import User from "../models/User.js";
import Comment from "../models/Comment.js";
import mongoose from "mongoose";

/**
 * Calculate engagement score for a post
 * Higher score = more engaging content
 * @param {Object} post - Post object
 * @param {number} commentsCount - Number of comments
 * @param {Set} interestedPostIds - Set of post IDs user is interested in (optional)
 */
export function calculateEngagementScore(post, commentsCount = 0, interestedPostIds = null) {
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
  let engagementScore = (
    emotesCount * 1 +      // Each emote = 1 point
    commentsCount * 3 +    // Each comment = 3 points (more valuable)
    views * 0.01           // Views have minimal impact (0.01 point each)
  );
  
  // Boost score if user is interested in this post (multiply by 2.5)
  if (interestedPostIds && post._id) {
    const postIdStr = post._id.toString();
    if (interestedPostIds.has(postIdStr)) {
      engagementScore *= 2.5; // Significant boost for interested posts
    }
  }
  
  // Final score with time decay
  // Prevent division by zero or very small numbers
  return engagementScore / Math.max(timeDecay, 0.1);
}

/**
 * Get posts from user's friends with engagement scoring
 * @param {string} userId - Current user ID
 * @param {number} limit - Number of posts to return
 * @param {Set} notInterestedPostIds - Set of post IDs user is not interested in (optional)
 * @param {Set} interestedPostIds - Set of post IDs user is interested in (optional)
 * @param {Array} blockedUserIds - List of blocked user IDs (optional)
 * @param {number} skip - Number of posts to skip (for pagination)
 */
export async function getFriendsPosts(userId, limit = 10, notInterestedPostIds = null, interestedPostIds = null, blockedUserIds = [], skip = 0) {
  if (!userId) return [];
  
  // Validate userId is valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    console.warn('[WARN][SMART-FEED] Invalid userId for friends posts:', userId);
    return [];
  }
  
  try {
    // Get user's friends list
    const user = await User.findById(userId).select('friends').lean();
    if (!user || !user.friends || user.friends.length === 0) return [];
    
    const friendIds = user.friends.map(f => f.toString());
    
    // Build query to exclude not interested posts
    const query = {
      author: { $in: friendIds },
      status: "published",
      ...(blockedUserIds.length > 0 && { author: { $in: friendIds, $nin: blockedUserIds } }),
      $or: [
        { group: { $exists: false } },
        { group: null }
      ]
    };
    
    // Exclude posts user is not interested in
    if (notInterestedPostIds && notInterestedPostIds.size > 0) {
      query._id = { $nin: Array.from(notInterestedPostIds).map(id => new mongoose.Types.ObjectId(id)) };
    }
    
    // Get posts from friends
    const posts = await Post.find(query)
      .populate("author", "name nickname avatarUrl role")
      .populate({
        path: "emotes.user",
        select: "name nickname avatarUrl role"
      })
      .sort({ createdAt: -1 })
      .skip(skip) // Skip posts for pagination
      .limit(limit * 3) // Get more to score and filter
      .lean();
    
    // Use denormalized commentCount for scoring
    const scoredPosts = posts.map(post => ({
      ...post,
      _score: calculateEngagementScore(post, post.commentCount || 0, interestedPostIds)
    }));
    
    // Sort: interested posts first, then by score
    const sortedPosts = scoredPosts.sort((a, b) => {
      const aId = a._id.toString();
      const bId = b._id.toString();
      const aInterested = interestedPostIds && interestedPostIds.has(aId);
      const bInterested = interestedPostIds && interestedPostIds.has(bId);
      
      if (aInterested && !bInterested) return -1;
      if (!aInterested && bInterested) return 1;
      return b._score - a._score;
    });
    
    return sortedPosts.slice(0, limit);
      
  } catch (error) {
    console.error("[ERROR][SMART-FEED] Error getting friends posts:", error);
    return [];
  }
}

/**
 * Get trending posts from last 24 hours
 * @param {number} limit - Number of posts to return
 * @param {Set} notInterestedPostIds - Set of post IDs user is not interested in (optional)
 * @param {Set} interestedPostIds - Set of post IDs user is interested in (optional)
 * @param {Array} blockedUserIds - List of blocked user IDs (optional)
 * @param {number} skip - Number of posts to skip (for pagination)
 */
export async function getTrendingPosts(limit = 10, notInterestedPostIds = null, interestedPostIds = null, blockedUserIds = [], skip = 0) {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const query = {
      status: "published",
      createdAt: { $gte: oneDayAgo },
      ...(blockedUserIds.length > 0 && { author: { $nin: blockedUserIds } }),
      $or: [
        { group: { $exists: false } },
        { group: null }
      ]
    };
    
    // Exclude posts user is not interested in
    if (notInterestedPostIds && notInterestedPostIds.size > 0) {
      query._id = { $nin: Array.from(notInterestedPostIds).map(id => new mongoose.Types.ObjectId(id)) };
    }
    
    const posts = await Post.find(query)
      .populate("author", "name nickname avatarUrl role")
      .populate({
        path: "emotes.user",
        select: "name nickname avatarUrl role"
      })
      .sort({ createdAt: -1 })
      .skip(skip) // Skip posts for pagination
      .lean();
    
    // Use denormalized commentCount for scoring
    const scoredPosts = posts.map(post => ({
      ...post,
      _score: calculateEngagementScore(post, post.commentCount || 0, interestedPostIds)
    }));
    
    // Sort: interested posts first, then by score
    const sortedPosts = scoredPosts.sort((a, b) => {
      const aId = a._id.toString();
      const bId = b._id.toString();
      const aInterested = interestedPostIds && interestedPostIds.has(aId);
      const bInterested = interestedPostIds && interestedPostIds.has(bId);
      
      if (aInterested && !bInterested) return -1;
      if (!aInterested && bInterested) return 1;
      return b._score - a._score;
    });
    
    return sortedPosts.slice(0, limit);
      
  } catch (error) {
    console.error("[ERROR][SMART-FEED] Error getting trending posts:", error);
    return [];
  }
}

/**
 * Get personalized posts based on user's interests
 * Uses tags from posts user has interacted with and interested posts
 * @param {string} userId - Current user ID
 * @param {number} limit - Number of posts to return
 * @param {Set} notInterestedPostIds - Set of post IDs user is not interested in (optional)
 * @param {Set} interestedPostIds - Set of post IDs user is interested in (optional)
 * @param {Array} blockedUserIds - List of blocked user IDs (optional)
 * @param {number} skip - Number of posts to skip (for pagination)
 */
export async function getPersonalizedPosts(userId, limit = 10, notInterestedPostIds = null, interestedPostIds = null, blockedUserIds = [], skip = 0) {
  if (!userId) return [];
  
  // Validate userId is valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    console.warn('[WARN][SMART-FEED] Invalid userId for personalized posts:', userId);
    return [];
  }
  
  try {
    // Get user's interested posts to learn from their preferences
    let interestedPostsTags = [];
    if (interestedPostIds && interestedPostIds.size > 0) {
      const interestedPosts = await Post.find({
        _id: { $in: Array.from(interestedPostIds).map(id => new mongoose.Types.ObjectId(id)) }
      })
        .select("tags")
        .limit(50)
        .lean();
      interestedPostsTags = interestedPosts.flatMap(p => p.tags || []);
    }
    
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
    
    // Combine all tags (prioritize interested posts tags with higher weight)
    const allTags = [
      ...interestedPostsTags, // Add twice for higher weight
      ...interestedPostsTags,
      ...userInteractedPosts.flatMap(p => p.tags || []),
      ...commentedPosts.flatMap(p => p.tags || [])
    ];
    
    // Get unique tags and their frequency without mutating external state
    const tagFrequency = allTags.reduce((freq, tag) => {
      freq[tag] = (freq[tag] || 0) + 1;
      return freq;
    }, {});
    
    // Get top 5 most frequent tags
    const topTags = Object.entries(tagFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);
    
    if (topTags.length === 0) return [];
    
    // Build query for personalized posts
    const personalizedQuery = {
      tags: { $in: topTags },
      status: "published",
      author: { $nin: [userId, ...blockedUserIds] }, // Not by current user and not by blocked users
      "emotes.user": { $ne: userId }, // User hasn't emoted
      _id: { $nin: commentedPostIds }, // User hasn't commented
      $or: [
        { group: { $exists: false } },
        { group: null }
      ]
    };
    
    // Exclude posts user is not interested in
    if (notInterestedPostIds && notInterestedPostIds.size > 0) {
      const notInterestedArray = Array.from(notInterestedPostIds).map(id => new mongoose.Types.ObjectId(id));
      personalizedQuery._id = { 
        $nin: [...notInterestedArray, ...commentedPostIds.map(id => new mongoose.Types.ObjectId(id))]
      };
    }
    
    // Find posts with these tags that user hasn't interacted with
    const personalizedPosts = await Post.find(personalizedQuery)
      .populate("author", "name nickname avatarUrl role")
      .populate({
        path: "emotes.user",
        select: "name nickname avatarUrl role"
      })
      .sort({ createdAt: -1 })
      .skip(skip) // Skip posts for pagination
      .limit(limit * 2)
      .lean();
    
    // Use denormalized commentCount for scoring
    const scoredPosts = personalizedPosts.map(post => ({
      ...post,
      _score: calculateEngagementScore(post, post.commentCount || 0, interestedPostIds)
    }));
    
    // Sort: interested posts first, then by score
    const sortedPosts = scoredPosts.sort((a, b) => {
      const aId = a._id.toString();
      const bId = b._id.toString();
      const aInterested = interestedPostIds && interestedPostIds.has(aId);
      const bInterested = interestedPostIds && interestedPostIds.has(bId);
      
      if (aInterested && !bInterested) return -1;
      if (!aInterested && bInterested) return 1;
      return b._score - a._score;
    });
    
    return sortedPosts.slice(0, limit);
      
  } catch (error) {
    console.error("[ERROR][SMART-FEED] Error getting personalized posts:", error);
    return [];
  }
}

/**
 * Get fresh/new content (posted in last 2 hours)
 * @param {number} limit - Number of posts to return
 * @param {Set} notInterestedPostIds - Set of post IDs user is not interested in (optional)
 * @param {Array} blockedUserIds - List of blocked user IDs (optional)
 * @param {number} skip - Number of posts to skip (for pagination)
 */
export async function getFreshPosts(limit = 5, notInterestedPostIds = null, blockedUserIds = [], skip = 0) {
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    const query = {
      status: "published",
      createdAt: { $gte: twoHoursAgo },
      ...(blockedUserIds.length > 0 && { author: { $nin: blockedUserIds } }),
      $or: [
        { group: { $exists: false } },
        { group: null }
      ]
    };
    
    // Exclude posts user is not interested in
    if (notInterestedPostIds && notInterestedPostIds.size > 0) {
      query._id = { $nin: Array.from(notInterestedPostIds).map(id => new mongoose.Types.ObjectId(id)) };
    }
    
    const posts = await Post.find(query)
      .populate("author", "name nickname avatarUrl role")
      .populate({
        path: "emotes.user",
        select: "name nickname avatarUrl role"
      })
      .sort({ createdAt: -1 })
      .skip(skip) // Skip posts for pagination
      .limit(limit)
      .lean();
    
    return posts;
    
  } catch (error) {
    console.error("[ERROR][SMART-FEED] Error getting fresh posts:", error);
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
 * @param {number} page - Page number (for pagination)
 */
export async function generateSmartFeed(userId, totalLimit = 20, page = 1) {
  try {
    // Validate and sanitize totalLimit and page
    const sanitizedLimit = Math.min(Math.max(parseInt(totalLimit) || 20, 1), 100);
    const sanitizedPage = Math.max(parseInt(page) || 1, 1);
    
    // Calculate total skip (total posts to skip across all sources)
    const totalSkip = (sanitizedPage - 1) * sanitizedLimit;
    
    // Get user's interest preferences
    let notInterestedPostIds = new Set();
    let interestedPostIds = new Set();
    let blockedUserIds = [];

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      const user = await User.findById(userId).select('interestedPosts notInterestedPosts blockedUsers').lean();
      if (user) {
        if (user.notInterestedPosts && Array.isArray(user.notInterestedPosts)) {
          notInterestedPostIds = new Set(user.notInterestedPosts.map(id => id.toString()));
        }
        if (user.interestedPosts && Array.isArray(user.interestedPosts)) {
          interestedPostIds = new Set(user.interestedPosts.map(id => id.toString()));
        }
        if (user.blockedUsers && Array.isArray(user.blockedUsers)) {
          blockedUserIds = user.blockedUsers.map(id => id.toString());
        }
      }
    }
    
    // Calculate limits for each source (percentages)
    const friendsLimit = Math.ceil(sanitizedLimit * 0.4);  // 40%
    const trendingLimit = Math.ceil(sanitizedLimit * 0.3); // 30%
    const personalizedLimit = Math.ceil(sanitizedLimit * 0.2); // 20%
    const freshLimit = Math.ceil(sanitizedLimit * 0.1);    // 10%
    
    // Calculate skip for each source (proportional to their limits)
    // This ensures each source skips proportionally based on its contribution
    const friendsSkip = Math.floor(totalSkip * 0.4);
    const trendingSkip = Math.floor(totalSkip * 0.3);
    const personalizedSkip = Math.floor(totalSkip * 0.2);
    const freshSkip = Math.floor(totalSkip * 0.1);
    
    // Fetch all sources in parallel for better performance
    const [friendsPosts, trendingPosts, personalizedPosts, freshPosts] = await Promise.all([
      getFriendsPosts(userId, friendsLimit, notInterestedPostIds, interestedPostIds, blockedUserIds, friendsSkip),
      getTrendingPosts(trendingLimit, notInterestedPostIds, interestedPostIds, blockedUserIds, trendingSkip),
      getPersonalizedPosts(userId, personalizedLimit, notInterestedPostIds, interestedPostIds, blockedUserIds, personalizedSkip),
      getFreshPosts(freshLimit, notInterestedPostIds, blockedUserIds, freshSkip)
    ]);
    
    // Mix and deduplicate
    const mixedFeed = mixAndDeduplicatePosts(
      friendsPosts,
      trendingPosts,
      personalizedPosts,
      freshPosts
    );
    
    // If we don't have enough posts, fill with recent posts
    if (mixedFeed.length < sanitizedLimit) {
      const seenIds = new Set(mixedFeed.map(p => p._id.toString()));
      
      // Build exclusion list: seen posts + not interested posts
      const excludedIds = Array.from(seenIds).map(id => new mongoose.Types.ObjectId(id));
      if (notInterestedPostIds && notInterestedPostIds.size > 0) {
        excludedIds.push(...Array.from(notInterestedPostIds).map(id => new mongoose.Types.ObjectId(id)));
      }
      
      // Calculate skip for filler posts (skip remaining amount after mixed feed)
      const fillerSkip = Math.max(totalSkip - mixedFeed.length, 0);
      
      const fillerPosts = await Post.find({
        status: "published",
        _id: { $nin: excludedIds },
        ...(blockedUserIds.length > 0 && { author: { $nin: blockedUserIds } }),
        $or: [
          { group: { $exists: false } },
          { group: null }
        ]
      })
        .populate("author", "name nickname avatarUrl role")
        .populate({
          path: "emotes.user",
          select: "name nickname avatarUrl role"
        })
        .sort({ createdAt: -1 })
        .skip(fillerSkip) // Skip filler posts for pagination
        .limit(sanitizedLimit - mixedFeed.length)
        .lean();
      
      mixedFeed.push(...fillerPosts);
    }
    
    // Limit to requested amount
    return mixedFeed.slice(0, sanitizedLimit);
    
  } catch (error) {
    console.error("[ERROR][SMART-FEED] Error generating smart feed:", error);
    throw error;
  }
}
