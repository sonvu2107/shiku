/**
 * Smart Feed Utility
 * 
 * Utility tính toán và tạo smart feed dựa trên engagement score:
 * - Tính engagement score cho post (dựa trên emotes, comments, views, time decay)
 * - Lấy posts từ bạn bè với scoring
 * - Lấy trending posts (24h gần nhất)
 * - Lấy popular posts (tất cả thời gian)
 * - Hỗ trợ interested/not interested posts
 * 
 * @module smartFeed
 */

import Post from "../models/Post.js";
import User from "../models/User.js";
import Comment from "../models/Comment.js";
import mongoose from "mongoose";

/**
 * Tính engagement score cho một post
 * Score cao hơn = nội dung hấp dẫn hơn
 * 
 * NEW FORMULA (Upvote-based):
 * score = (U * 3) + log(C + 1) * 2 - (T / 24)
 * - U = upvotes (trọng số cao nhất)
 * - C = comments (logarithmic để chống spam)
 * - T = thời gian (time decay)
 * 
 * @param {Object} post - Post object
 * @param {number} commentsCount - Số lượng comments
 * @param {Set|null} interestedPostIds - Set các post IDs user quan tâm (optional)
 * @returns {number} Engagement score
 */
export function calculateEngagementScore(post, commentsCount = 0, interestedPostIds = null) {
  // NEW: Ưu tiên upvoteCount, fallback sang emotes.length cho legacy
  const upvoteCount = post.upvoteCount ?? post.emotes?.length ?? 0;
  const views = post.views || 0;
  const comments = commentsCount || post.commentCount || 0;

  // Time decay: bài viết cũ hơn có score thấp hơn
  const createdAt = new Date(post.createdAt);
  const hoursSincePost = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);

  // Kiểm tra an toàn: nếu post ở tương lai hoặc invalid, coi như rất mới (0.1 giờ)
  const safeHours = Math.max(hoursSincePost, 0.1);

  // NEW FORMULA: Upvote-centric scoring
  // Upvotes = 3 điểm mỗi upvote (tín hiệu mạnh nhất)
  // Comments = logarithmic (chống spam, vẫn có giá trị)
  // Views = minimal impact
  // Time decay = linear (post cũ tự tụt)
  let engagementScore = (
    upvoteCount * 3 +                    // Upvotes = trọng số cao nhất
    Math.log(comments + 1) * 2 +         // Comments = logarithmic multiplier
    views * 0.005 -                      // Views có tác động tối thiểu
    (safeHours / 24)                     // Time decay: -1 điểm mỗi 24h
  );

  // Đảm bảo score không âm
  engagementScore = Math.max(engagementScore, 0);

  // Tăng score nếu user quan tâm post này (nhân 2.5)
  if (interestedPostIds && post._id) {
    const postIdStr = post._id.toString();
    if (interestedPostIds.has(postIdStr)) {
      engagementScore *= 2.5; // Tăng đáng kể cho posts user quan tâm
    }
  }

  // ==================== NEW USER BOOST ====================
  // Boost bài viết của user mới (trong 7 ngày đầu)
  if (post.author) {
    const authorDate = post.author.firstLoginAt || post.author.createdAt;
    if (authorDate) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const isNewAuthor = new Date(authorDate) > sevenDaysAgo;
      if (isNewAuthor) {
        engagementScore += 12; // Boost cố định cho user mới
      }
    }
  }

  // ==================== COMMENT FRESHNESS BOOST ====================
  // Boost bài có comment mới trong 24h để tạo retention loop
  // Giúp bài "đang hot tranh luận" nổi lên feed
  if (post.latestCommentAt) {
    const commentAge = (Date.now() - new Date(post.latestCommentAt).getTime()) / (1000 * 60 * 60);
    if (commentAge < 24) {
      // Max +20 điểm cho comment rất mới, giảm dần theo thời gian
      const freshBonus = Math.max(0, 20 * (1 - commentAge / 24));
      engagementScore += freshBonus;
    }
  }

  // ==================== RANDOM FACTOR ====================
  // Thêm random factor ±15% để feed có sự đa dạng khi refresh
  // Tạo trải nghiệm tươi mới mỗi lần load
  const randomFactor = 0.85 + Math.random() * 0.3; // Random từ 0.85 đến 1.15 (±15%)
  engagementScore *= randomFactor;

  return engagementScore;
}

/**
 * Tính ranking score cho HOT feed (cached in DB)
 * Công thức: score = (U * 3) + log(C + 1) * 2 - (T / 24)
 * 
 * @param {Object} post - Post object với upvoteCount, commentCount
 * @returns {number} Ranking score
 */
export function calculateRankingScore(post) {
  const U = post.upvoteCount ?? post.emotes?.length ?? 0;
  const C = post.commentCount ?? 0;
  const createdAt = new Date(post.createdAt);
  const T = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60); // hours

  // Formula: (U * 3) + log(C + 1) * 2 - (T / 24)
  const score = (U * 3) + Math.log(C + 1) * 2 - (T / 24);
  return Math.max(score, 0); // Không cho điểm âm
}

/**
 * Lấy posts từ bạn bè với engagement scoring - OPTIMIZED với aggregation
 * 
 * @param {string} userId - User ID hiện tại
 * @param {number} limit - Số lượng posts trả về
 * @param {Set|null} notInterestedPostIds - Set các post IDs user không quan tâm (optional)
 * @param {Set|null} interestedPostIds - Set các post IDs user quan tâm (optional)
 * @param {Array} blockedUserIds - Danh sách user IDs bị block (optional)
 * @param {number} skip - Số lượng posts bỏ qua (cho pagination)
 * @returns {Promise<Array>} Mảng posts đã được sắp xếp theo score
 */
export async function getFriendsPosts(userId, limit = 10, notInterestedPostIds = null, interestedPostIds = null, blockedUserIds = [], skip = 0) {
  if (!userId) return [];

  // Validate userId is valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    console.warn('[WARN][SMART-FEED] Invalid userId for friends posts:', userId);
    return [];
  }

  try {
    // OPTIMIZATION: Lấy danh sách bạn bè của user với projection nhỏ
    const user = await User.findById(userId).select('friends').lean();
    if (!user || !user.friends || user.friends.length === 0) return [];

    // OPTIMIZATION: Convert to ObjectId một lần thay vì nhiều lần
    const friendObjectIds = user.friends.map(f => new mongoose.Types.ObjectId(f.toString()));
    const blockedObjectIds = blockedUserIds.map(id => new mongoose.Types.ObjectId(id));

    // OPTIMIZATION: Xây dựng match stage cho aggregation
    // NOTE: group field is normalized to null (no more $exists: false)
    const matchStage = {
      author: { $in: friendObjectIds },
      status: "published",
      group: null  // Simplified: data normalized to always have group: null or ObjectId
    };

    // Loại trừ blocked users
    if (blockedObjectIds.length > 0) {
      matchStage.author = { $in: friendObjectIds, $nin: blockedObjectIds };
    }

    // Loại trừ posts user không quan tâm
    if (notInterestedPostIds && notInterestedPostIds.size > 0) {
      matchStage._id = { $nin: Array.from(notInterestedPostIds).map(id => new mongoose.Types.ObjectId(id)) };
    }

    // OPTIMIZATION: Sử dụng aggregation pipeline thay vì find + populate
    const posts = await Post.aggregate([
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit * 3 }, // Lấy nhiều hơn để score và filter
      // Lookup author với projection tối thiểu
      {
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          as: "author",
          pipeline: [{ $project: { name: 1, nickname: 1, avatarUrl: 1, role: 1, displayBadgeType: 1, cultivationCache: 1, createdAt: 1, firstLoginAt: 1 } }]
        }
      },
      { $unwind: { path: "$author", preserveNullAndEmptyArrays: true } },
      // Project chỉ các fields cần thiết để giảm memory (NEW: include upvotes)
      {
        $project: {
          title: 1, content: 1, slug: 1, tags: 1, createdAt: 1, author: 1,
          status: 1, views: 1, coverUrl: 1, files: 1,
          commentCount: 1, savedCount: 1,
          upvotes: 1, upvoteCount: 1, // NEW: upvote fields
          emotes: 1, // Legacy
          hasPoll: 1, isEdited: 1, youtubeUrl: 1
        }
      }
    ]);

    // Sử dụng denormalized commentCount cho scoring
    const scoredPosts = posts.map(post => ({
      ...post,
      _score: calculateEngagementScore(post, post.commentCount || 0, interestedPostIds)
    }));

    // Sắp xếp: posts quan tâm trước, sau đó theo score
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
 * Lấy trending posts từ 24 giờ gần nhất - OPTIMIZED với aggregation
 * 
 * @param {number} limit - Số lượng posts trả về
 * @param {Set|null} notInterestedPostIds - Set các post IDs user không quan tâm (optional)
 * @param {Set|null} interestedPostIds - Set các post IDs user quan tâm (optional)
 * @param {Array} blockedUserIds - Danh sách user IDs bị block (optional)
 * @param {number} skip - Số lượng posts bỏ qua (cho pagination)
 * @returns {Promise<Array>} Mảng trending posts đã được sắp xếp theo score
 */
export async function getTrendingPosts(limit = 10, notInterestedPostIds = null, interestedPostIds = null, blockedUserIds = [], skip = 0) {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // OPTIMIZATION: Build match stage for aggregation
    // NOTE: group field is normalized to null
    const matchStage = {
      status: "published",
      createdAt: { $gte: oneDayAgo },
      group: null
    };

    // Loại trừ blocked users
    if (blockedUserIds.length > 0) {
      matchStage.author = { $nin: blockedUserIds.map(id => new mongoose.Types.ObjectId(id)) };
    }

    // Loại trừ posts user không quan tâm
    if (notInterestedPostIds && notInterestedPostIds.size > 0) {
      matchStage._id = { $nin: Array.from(notInterestedPostIds).map(id => new mongoose.Types.ObjectId(id)) };
    }

    // OPTIMIZATION: Sử dụng aggregation pipeline
    const posts = await Post.aggregate([
      { $match: matchStage },
      // OPTIMIZATION: Tính engagement score trong aggregation (NEW: upvote-based)
      {
        $addFields: {
          // Fallback: upvoteCount hoặc emotes.length (legacy)
          upvoteScore: {
            $ifNull: ["$upvoteCount", { $size: { $ifNull: ["$emotes", []] } }]
          },
          // NEW FORMULA: (U * 3) + log(C + 1) * 2
          engagementBase: {
            $add: [
              {
                $multiply: [
                  { $ifNull: ["$upvoteCount", { $size: { $ifNull: ["$emotes", []] } }] },
                  3
                ]
              },
              {
                $multiply: [
                  { $ln: { $add: [{ $ifNull: ["$commentCount", 0] }, 1] } },
                  2
                ]
              },
              { $multiply: [{ $ifNull: ["$views", 0] }, 0.005] }
            ]
          }
        }
      },
      { $sort: { engagementBase: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit * 2 }, // Lấy nhiều hơn để filter sau
      // Lookup author
      {
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          as: "author",
          pipeline: [{ $project: { name: 1, nickname: 1, avatarUrl: 1, role: 1, displayBadgeType: 1, cultivationCache: 1, createdAt: 1, firstLoginAt: 1 } }]
        }
      },
      { $unwind: { path: "$author", preserveNullAndEmptyArrays: true } },
      // Project chỉ fields cần thiết (NEW: include upvotes)
      {
        $project: {
          title: 1, content: 1, slug: 1, tags: 1, createdAt: 1, author: 1,
          status: 1, views: 1, coverUrl: 1, files: 1,
          commentCount: 1, savedCount: 1,
          upvotes: 1, upvoteCount: 1, // NEW: upvote fields
          emotes: 1, // Legacy
          hasPoll: 1, isEdited: 1, youtubeUrl: 1
        }
      }
    ]);

    // Tính final score và sort
    const scoredPosts = posts.map(post => ({
      ...post,
      _score: calculateEngagementScore(post, post.commentCount || 0, interestedPostIds)
    }));

    // Sắp xếp: posts quan tâm trước, sau đó theo score
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
 * Lấy posts cá nhân hóa dựa trên sở thích của user
 * Sử dụng tags từ posts user đã tương tác và posts quan tâm
 * 
 * @param {string} userId - User ID hiện tại
 * @param {number} limit - Số lượng posts trả về
 * @param {Set|null} notInterestedPostIds - Set các post IDs user không quan tâm (optional)
 * @param {Set|null} interestedPostIds - Set các post IDs user quan tâm (optional)
 * @param {Array} blockedUserIds - Danh sách user IDs bị block (optional)
 * @param {number} skip - Số lượng posts bỏ qua (cho pagination)
 * @returns {Promise<Array>} Mảng posts cá nhân hóa đã được sắp xếp theo score
 */
export async function getPersonalizedPosts(userId, limit = 10, notInterestedPostIds = null, interestedPostIds = null, blockedUserIds = [], skip = 0) {
  if (!userId) return [];

  // Validate userId is valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    console.warn('[WARN][SMART-FEED] Invalid userId for personalized posts:', userId);
    return [];
  }

  try {
    // Lấy posts user quan tâm để học từ preferences
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

    // Tìm posts user đã emote hoặc comment
    const userInteractedPosts = await Post.find({
      $or: [
        { "emotes.user": userId },
      ]
    })
      .select("tags")
      .limit(20) // 20 tương tác gần nhất
      .lean();

    // Cũng kiểm tra comments
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

    // Kết hợp tất cả tags (ưu tiên tags từ posts quan tâm với trọng số cao hơn)
    const allTags = [
      ...interestedPostsTags, // Thêm 2 lần để tăng trọng số
      ...interestedPostsTags,
      ...userInteractedPosts.flatMap(p => p.tags || []),
      ...commentedPosts.flatMap(p => p.tags || [])
    ];

    // Lấy unique tags và tần suất của chúng (không mutate external state)
    const tagFrequency = allTags.reduce((freq, tag) => {
      freq[tag] = (freq[tag] || 0) + 1;
      return freq;
    }, {});

    // Lấy top 5 tags xuất hiện nhiều nhất
    const topTags = Object.entries(tagFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);

    if (topTags.length === 0) return [];

    // Xây dựng query cho posts cá nhân hóa
    // NOTE: group field is normalized to null
    const personalizedQuery = {
      tags: { $in: topTags },
      status: "published",
      author: { $nin: [userId, ...blockedUserIds] }, // Không phải của user hiện tại và không phải của users bị block
      "emotes.user": { $ne: userId }, // User chưa emote
      _id: { $nin: commentedPostIds }, // User chưa comment
      group: null
    };

    // Loại trừ posts user không quan tâm
    if (notInterestedPostIds && notInterestedPostIds.size > 0) {
      const notInterestedArray = Array.from(notInterestedPostIds).map(id => new mongoose.Types.ObjectId(id));
      personalizedQuery._id = {
        $nin: [...notInterestedArray, ...commentedPostIds.map(id => new mongoose.Types.ObjectId(id))]
      };
    }

    // Tìm posts với các tags này mà user chưa tương tác
    const personalizedPosts = await Post.find(personalizedQuery)
      .populate("author", "name nickname avatarUrl role displayBadgeType cultivationCache createdAt firstLoginAt")
      // NOTE: emotes.user populate removed (legacy system)
      .sort({ createdAt: -1 })
      .skip(skip) // Bỏ qua posts cho pagination
      .limit(limit * 2)
      .lean();

    // Sử dụng denormalized commentCount cho scoring
    const scoredPosts = personalizedPosts.map(post => ({
      ...post,
      _score: calculateEngagementScore(post, post.commentCount || 0, interestedPostIds)
    }));

    // Sắp xếp: posts quan tâm trước, sau đó theo score
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
 * Lấy nội dung mới (đăng trong 2 giờ gần nhất)
 * 
 * @param {number} limit - Số lượng posts trả về
 * @param {Set|null} notInterestedPostIds - Set các post IDs user không quan tâm (optional)
 * @param {Array} blockedUserIds - Danh sách user IDs bị block (optional)
 * @param {number} skip - Số lượng posts bỏ qua (cho pagination)
 * @returns {Promise<Array>} Mảng fresh posts
 */
export async function getFreshPosts(limit = 5, notInterestedPostIds = null, blockedUserIds = [], skip = 0) {
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    // NOTE: group field is normalized to null
    const query = {
      status: "published",
      createdAt: { $gte: twoHoursAgo },
      ...(blockedUserIds.length > 0 && { author: { $nin: blockedUserIds } }),
      group: null
    };

    // Loại trừ posts user không quan tâm
    if (notInterestedPostIds && notInterestedPostIds.size > 0) {
      query._id = { $nin: Array.from(notInterestedPostIds).map(id => new mongoose.Types.ObjectId(id)) };
    }

    const posts = await Post.find(query)
      .populate("author", "name nickname avatarUrl role displayBadgeType cultivationCache createdAt firstLoginAt")
      // NOTE: emotes.user populate removed (legacy system)
      .sort({ createdAt: -1 })
      .skip(skip) // Bỏ qua posts cho pagination
      .limit(limit)
      .lean();

    return posts;

  } catch (error) {
    console.error("[ERROR][SMART-FEED] Error getting fresh posts:", error);
    return [];
  }
}

/**
 * Trộn và loại bỏ trùng lặp posts từ các nguồn khác nhau
 * Duy trì tính đa dạng bằng cách interleave các nguồn
 * 
 * @param {Array} friendsPosts - Posts từ bạn bè
 * @param {Array} trendingPosts - Trending posts
 * @param {Array} personalizedPosts - Posts cá nhân hóa
 * @param {Array} freshPosts - Fresh posts
 * @returns {Array} Mảng posts đã được trộn và loại bỏ trùng lặp
 */
export function mixAndDeduplicatePosts(friendsPosts, trendingPosts, personalizedPosts, freshPosts) {
  const seenIds = new Set();
  const mixedPosts = [];

  // Helper để thêm posts unique
  const addUnique = (posts) => {
    posts.forEach(post => {
      const postId = post._id.toString();
      if (!seenIds.has(postId)) {
        seenIds.add(postId);
        mixedPosts.push(post);
      }
    });
  };

  // Chiến lược: Interleave các nguồn khác nhau để đa dạng
  // Pattern: Friend -> Trending -> Friend -> Personalized -> Fresh -> ...

  const maxLength = Math.max(
    friendsPosts.length,
    trendingPosts.length,
    personalizedPosts.length,
    freshPosts.length
  );

  for (let i = 0; i < maxLength; i++) {
    // Thêm friend post (ưu tiên)
    if (i < friendsPosts.length) {
      addUnique([friendsPosts[i]]);
    }

    // Thêm trending post
    if (i < trendingPosts.length) {
      addUnique([trendingPosts[i]]);
    }

    // Thêm personalized post
    if (i < personalizedPosts.length) {
      addUnique([personalizedPosts[i]]);
    }

    // Thêm fresh post
    if (i < freshPosts.length) {
      addUnique([freshPosts[i]]);
    }
  }

  // ==================== PARTIAL SHUFFLE ====================
  // Shuffle 30% đầu tiên của feed để tạo sự đa dạng khi refresh
  // Giữ chất lượng tổng thể nhưng vẫn có sự khác biệt
  const shuffleCount = Math.max(Math.floor(mixedPosts.length * 0.3), 3);
  const topPosts = mixedPosts.slice(0, shuffleCount);
  const restPosts = mixedPosts.slice(shuffleCount);

  // Fisher-Yates shuffle cho phần đầu
  for (let i = topPosts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [topPosts[i], topPosts[j]] = [topPosts[j], topPosts[i]];
  }

  return [...topPosts, ...restPosts];
}

/**
 * Tạo smart feed cho user
 * Function chính điều phối tất cả các nguồn feed
 * 
 * @param {string} userId - User ID hiện tại
 * @param {number} totalLimit - Tổng số posts trả về
 * @param {number} page - Số trang (cho pagination)
 * @returns {Promise<Array>} Mảng posts đã được sắp xếp và trộn
 */
export async function generateSmartFeed(userId, totalLimit = 20, page = 1) {
  try {
    // Validate và sanitize totalLimit và page
    const sanitizedLimit = Math.min(Math.max(parseInt(totalLimit) || 20, 1), 100);
    const sanitizedPage = Math.max(parseInt(page) || 1, 1);

    // Tính tổng skip (tổng posts bỏ qua trên tất cả các nguồn)
    const totalSkip = (sanitizedPage - 1) * sanitizedLimit;

    // Lấy preferences quan tâm của user
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

    // ==================== PINNED POSTS (PAGE 1 ONLY) ====================
    // Lấy các bài viết được ghim (chỉ trên trang 1)
    let pinnedPosts = [];
    const isFirstPage = sanitizedPage === 1;

    if (isFirstPage) {
      // NOTE: group field is normalized to null
      pinnedPosts = await Post.find({
        isPinned: true,
        status: "published",
        group: null
      })
        .populate("author", "name nickname avatarUrl role displayBadgeType cultivationCache createdAt firstLoginAt")
        .sort({ pinnedAt: -1 }) // Bài ghim mới nhất lên đầu
        .lean();
    }

    // ==================== OVER-FETCHING STRATEGY (PAGE 1) ====================
    // Nếu là Page 1, ta lấy số lượng bài nhiều hơn (x2.5) để tạo pool random lớn hơn
    // Các page sau giữ nguyên để đảm bảo pagination ổn định
    const fetchMultiplier = isFirstPage ? 2.5 : 1;

    // Tính limits cho mỗi nguồn (theo phần trăm) với multiplier
    const friendsLimit = Math.ceil(sanitizedLimit * 0.4 * fetchMultiplier);  // 40%
    const trendingLimit = Math.ceil(sanitizedLimit * 0.3 * fetchMultiplier); // 30%
    const personalizedLimit = Math.ceil(sanitizedLimit * 0.2 * fetchMultiplier); // 20%
    const freshLimit = Math.ceil(sanitizedLimit * 0.1 * fetchMultiplier);    // 10%

    // Tính skip cho mỗi nguồn (tỷ lệ với limits GỐC)
    // Lưu ý: Skip vẫn phải tính theo limit gốc để Page 2 match tiếp vào Page 1 (dù Page 1 random)
    // Chấp nhận rủi ro nhỏ về duplicate/gap giữa Page 1 và 2 để đổi lấy trải nghiệm F5 tốt
    const friendsSkip = Math.floor(totalSkip * 0.4);
    const trendingSkip = Math.floor(totalSkip * 0.3);
    const personalizedSkip = Math.floor(totalSkip * 0.2);
    const freshSkip = Math.floor(totalSkip * 0.1);

    // Fetch tất cả nguồn song song để tăng hiệu năng
    const [friendsPosts, trendingPosts, personalizedPosts, freshPosts] = await Promise.all([
      getFriendsPosts(userId, friendsLimit, notInterestedPostIds, interestedPostIds, blockedUserIds, friendsSkip),
      getTrendingPosts(trendingLimit, notInterestedPostIds, interestedPostIds, blockedUserIds, trendingSkip),
      getPersonalizedPosts(userId, personalizedLimit, notInterestedPostIds, interestedPostIds, blockedUserIds, personalizedSkip),
      getFreshPosts(freshLimit, notInterestedPostIds, blockedUserIds, freshSkip)
    ]);

    // Trộn và loại bỏ trùng lặp
    const mixedFeed = mixAndDeduplicatePosts(
      friendsPosts,
      trendingPosts,
      personalizedPosts,
      freshPosts
    );

    // Nếu không đủ posts, điền bằng posts gần đây
    if (mixedFeed.length < sanitizedLimit) {
      const seenIds = new Set(mixedFeed.map(p => p._id.toString()));

      // Xây dựng danh sách loại trừ: posts đã thấy + posts không quan tâm
      const excludedIds = Array.from(seenIds).map(id => new mongoose.Types.ObjectId(id));
      if (notInterestedPostIds && notInterestedPostIds.size > 0) {
        excludedIds.push(...Array.from(notInterestedPostIds).map(id => new mongoose.Types.ObjectId(id)));
      }

      // Tính skip cho filler posts (skip phần còn lại sau mixed feed)
      const fillerSkip = Math.max(totalSkip - mixedFeed.length, 0);

      // NOTE: group field is normalized to null
      const fillerPosts = await Post.find({
        status: "published",
        _id: { $nin: excludedIds },
        ...(blockedUserIds.length > 0 && { author: { $nin: blockedUserIds } }),
        group: null
      })
        .populate("author", "name nickname avatarUrl role displayBadgeType cultivationCache")
        .populate({
          path: "emotes.user",
          select: "name nickname avatarUrl role displayBadgeType cultivationCache"
        })
        .sort({ createdAt: -1 })
        .skip(fillerSkip) // Bỏ qua filler posts cho pagination
        .limit((sanitizedLimit * fetchMultiplier) - mixedFeed.length) // Fetch thêm cho đủ pool
        .lean();

      mixedFeed.push(...fillerPosts);
    }

    // ==================== FINAL SHUFFLE & SLICE ====================
    // Loại bỏ pinned posts khỏi regular feed để tránh duplicate
    const pinnedIds = new Set(pinnedPosts.map(p => p._id.toString()));
    const regularFeed = mixedFeed.filter(p => !pinnedIds.has(p._id.toString()));

    // Shuffle toàn bộ pool nếu là Page 1 để tạo diversity tối đa
    if (isFirstPage) {
      for (let i = regularFeed.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [regularFeed[i], regularFeed[j]] = [regularFeed[j], regularFeed[i]];
      }
      // Prepend pinned posts lên đầu feed
      const finalRegular = regularFeed.slice(0, sanitizedLimit - pinnedPosts.length);
      return [...pinnedPosts, ...finalRegular];
    } else {
      // Các page sau: giữ ổn định, chỉ shuffle nhẹ phần đầu
      const finalFeed = regularFeed.slice(0, sanitizedLimit);
      const shuffleCount = Math.max(Math.floor(finalFeed.length * 0.7), 5);
      const topPart = finalFeed.slice(0, shuffleCount);
      const restPart = finalFeed.slice(shuffleCount);

      for (let i = topPart.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [topPart[i], topPart[j]] = [topPart[j], topPart[i]];
      }
      return [...topPart, ...restPart];
    }

  } catch (error) {
    console.error("[ERROR][SMART-FEED] Error generating smart feed:", error);
    throw error;
  }
}
