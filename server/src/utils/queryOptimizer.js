/**
 * Query Optimizer Utility
 * 
 * Utility functions để tối ưu hóa database queries:
 * - Batch fetching để giảm N+1 queries
 * - Query caching layer
 * - Connection pooling helpers
 * 
 * @module queryOptimizer
 */

import mongoose from "mongoose";
import User from "../models/User.js";
import Post from "../models/Post.js";

// ============================================================
// BATCH FETCH UTILITIES
// ============================================================

/**
 * Batch fetch users by IDs với projection
 * Thay vì gọi User.findById() nhiều lần, gọi User.find() một lần
 * 
 * @param {Array<string|ObjectId>} userIds - Mảng user IDs
 * @param {string} projection - Fields cần lấy (mặc định: name, avatarUrl)
 * @returns {Promise<Map>} Map của userId -> user object
 */
export async function batchFetchUsers(userIds, projection = "name nickname avatarUrl isOnline lastSeen") {
  if (!userIds || userIds.length === 0) return new Map();
  
  // Loại bỏ duplicates và convert to ObjectId
  const uniqueIds = [...new Set(userIds.filter(id => id && mongoose.Types.ObjectId.isValid(id)))];
  
  if (uniqueIds.length === 0) return new Map();
  
  const users = await User.find({ _id: { $in: uniqueIds } })
    .select(projection)
    .lean();
  
  // Tạo Map để lookup nhanh O(1)
  const userMap = new Map();
  users.forEach(user => {
    userMap.set(user._id.toString(), user);
  });
  
  return userMap;
}

/**
 * Batch fetch blocked users relationships
 * Lấy danh sách blockedUsers của nhiều users cùng lúc
 * 
 * @param {Array<string|ObjectId>} userIds - Mảng user IDs
 * @returns {Promise<Map>} Map của userId -> Set of blocked user IDs
 */
export async function batchFetchBlockedUsers(userIds) {
  if (!userIds || userIds.length === 0) return new Map();
  
  const uniqueIds = [...new Set(userIds.filter(id => id && mongoose.Types.ObjectId.isValid(id)))];
  
  if (uniqueIds.length === 0) return new Map();
  
  const users = await User.find({ _id: { $in: uniqueIds } })
    .select("_id blockedUsers")
    .lean();
  
  const blockedMap = new Map();
  users.forEach(user => {
    const blockedSet = new Set((user.blockedUsers || []).map(id => id.toString()));
    blockedMap.set(user._id.toString(), blockedSet);
  });
  
  return blockedMap;
}

/**
 * Check mutual blocking between two users
 * 
 * @param {string} userId1 - User ID 1
 * @param {string} userId2 - User ID 2
 * @returns {Promise<boolean>} true nếu có blocking (một chiều hoặc hai chiều)
 */
export async function checkMutualBlocking(userId1, userId2) {
  if (!userId1 || !userId2) return false;
  
  // Batch fetch cả hai users
  const users = await User.find({
    _id: { $in: [userId1, userId2] }
  })
    .select("_id blockedUsers")
    .lean();
  
  if (users.length !== 2) return false;
  
  const user1 = users.find(u => u._id.toString() === userId1.toString());
  const user2 = users.find(u => u._id.toString() === userId2.toString());
  
  const user1Blocked = new Set((user1?.blockedUsers || []).map(id => id.toString()));
  const user2Blocked = new Set((user2?.blockedUsers || []).map(id => id.toString()));
  
  return user1Blocked.has(userId2.toString()) || user2Blocked.has(userId1.toString());
}

// ============================================================
// AGGREGATION HELPERS
// ============================================================

/**
 * Common aggregation stages cho posts với author population
 * Sử dụng để tránh duplicate code
 * 
 * @returns {Array} Aggregation pipeline stages
 */
export function getPostAuthorLookupStages() {
  return [
    {
      $lookup: {
        from: "users",
        localField: "author",
        foreignField: "_id",
        as: "author",
        pipeline: [{ $project: { name: 1, nickname: 1, avatarUrl: 1, role: 1 } }]
      }
    },
    { $unwind: { path: "$author", preserveNullAndEmptyArrays: true } }
  ];
}

/**
 * Common projection cho posts
 * 
 * @param {boolean} includeContent - Có include nội dung không
 * @returns {Object} Projection object
 */
export function getPostProjection(includeContent = true) {
  const projection = {
    title: 1, slug: 1, tags: 1, createdAt: 1, author: 1,
    status: 1, views: 1, coverUrl: 1, files: 1,
    commentCount: 1, savedCount: 1, emotes: 1, hasPoll: 1, isEdited: 1
  };
  
  if (includeContent) {
    projection.content = 1;
  }
  
  return projection;
}

// ============================================================
// PAGINATION HELPERS
// ============================================================

/**
 * Validate và sanitize pagination params
 * 
 * @param {Object} params - { page, limit }
 * @param {number} maxLimit - Giới hạn tối đa cho limit
 * @returns {Object} { page, limit, skip }
 */
export function sanitizePagination(params, maxLimit = 50) {
  const page = Math.max(1, parseInt(params.page) || 1);
  const limit = Math.min(Math.max(1, parseInt(params.limit) || 20), maxLimit);
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
}

/**
 * Build pagination response
 * 
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items
 * @returns {Object} Pagination object
 */
export function buildPaginationResponse(page, limit, total) {
  return {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1
  };
}

// ============================================================
// QUERY PERFORMANCE HELPERS
// ============================================================

/**
 * Wrap một query với timeout
 * Nếu query chạy quá lâu sẽ reject
 * 
 * @param {Promise} queryPromise - Promise của query
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise} Query result hoặc timeout error
 */
export async function queryWithTimeout(queryPromise, timeoutMs = 10000) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Query timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  return Promise.race([queryPromise, timeoutPromise]);
}

/**
 * Retry một query nếu fail
 * 
 * @param {Function} queryFn - Function trả về Promise của query
 * @param {number} maxRetries - Số lần retry tối đa
 * @param {number} delayMs - Delay giữa các lần retry
 * @returns {Promise} Query result
 */
export async function queryWithRetry(queryFn, maxRetries = 3, delayMs = 100) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await queryFn();
    } catch (error) {
      lastError = error;
      
      // Chỉ retry nếu là transient error
      if (error.name === 'MongoNetworkError' || 
          error.name === 'MongoTimeoutError' ||
          error.code === 11600) { // InterruptedAtShutdown
        await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
        continue;
      }
      
      throw error; // Non-retryable error
    }
  }
  
  throw lastError;
}

// ============================================================
// INDEX HINTS
// ============================================================

/**
 * Suggest index hint cho common queries
 * 
 * @param {string} collection - Collection name
 * @param {string} queryType - Type of query (e.g., 'feed', 'search', 'profile')
 * @returns {Object|null} Index hint hoặc null
 */
export function suggestIndexHint(collection, queryType) {
  const hints = {
    posts: {
      feed: { status: 1, createdAt: -1 },
      search: { title: "text", content: "text" },
      profile: { author: 1, status: 1, createdAt: -1 },
      group: { group: 1, status: 1, createdAt: -1 }
    },
    users: {
      search: { name: "text", bio: "text" },
      online: { isOnline: 1, lastSeen: -1 },
      admin: { role: 1, isBanned: 1 }
    },
    messages: {
      conversation: { conversation: 1, createdAt: -1 },
      unread: { conversation: 1, "readBy.user": 1 }
    }
  };
  
  return hints[collection]?.[queryType] || null;
}

export default {
  batchFetchUsers,
  batchFetchBlockedUsers,
  checkMutualBlocking,
  getPostAuthorLookupStages,
  getPostProjection,
  sanitizePagination,
  buildPaginationResponse,
  queryWithTimeout,
  queryWithRetry,
  suggestIndexHint
};
