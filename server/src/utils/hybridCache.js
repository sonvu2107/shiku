/**
 * Hybrid Cache Utility
 * 
 * Cache layer thông minh kết hợp Redis (production) và In-Memory (fallback)
 * - Tự động fallback sang in-memory khi Redis không available
 * - Hỗ trợ stale-while-revalidate pattern
 * - Request coalescing để tránh duplicate queries
 * - Cache statistics và monitoring
 * 
 * @module hybridCache
 */

import { isRedisConnected, get as redisGet, set as redisSet, del as redisDel } from '../services/redisClient.js';

// ============================================================
// IN-MEMORY FALLBACK CACHE
// ============================================================

class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) {
      this.stats.misses++;
      return null;
    }
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    return item.value;
  }

  set(key, value, ttlMs) {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttlMs,
      createdAt: Date.now()
    });
    this.stats.sets++;
  }

  del(key) {
    this.cache.delete(key);
    this.stats.deletes++;
  }

  clear() {
    this.cache.clear();
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) + '%' : '0%',
      size: this.cache.size
    };
  }

  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    return cleaned;
  }
}

// Singleton memory cache
const memoryCache = new MemoryCache();

// ============================================================
// REQUEST COALESCING
// ============================================================

// Map của pending requests để tránh duplicate
const pendingRequests = new Map();

/**
 * Request coalescing - combine duplicate concurrent requests
 * Nếu có request đang chạy với cùng key, đợi kết quả thay vì query lại
 * 
 * @param {string} key - Unique key cho request
 * @param {Function} fetchFn - Async function để fetch data
 * @returns {Promise<any>} Result
 */
async function coalesce(key, fetchFn) {
  // Nếu đã có request đang pending, đợi nó
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  // Tạo promise mới và lưu vào pending
  const promise = (async () => {
    try {
      const result = await fetchFn();
      return result;
    } finally {
      // Xóa khỏi pending sau khi complete
      pendingRequests.delete(key);
    }
  })();

  pendingRequests.set(key, promise);
  return promise;
}

// ============================================================
// HYBRID CACHE LAYER
// ============================================================

/**
 * Get value từ cache (Redis first, fallback memory)
 * 
 * @param {string} key - Cache key
 * @returns {Promise<any>} Cached value hoặc null
 */
async function cacheGet(key) {
  // Try Redis first
  if (isRedisConnected()) {
    try {
      const value = await redisGet(key);
      if (value !== null) {
        return JSON.parse(value);
      }
    } catch (err) {
      console.warn('[HybridCache] Redis GET error, falling back to memory:', err.message);
    }
  }

  // Fallback to memory
  return memoryCache.get(key);
}

/**
 * Set value vào cache (Redis + memory)
 * 
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttlSeconds - TTL in seconds
 */
async function cacheSet(key, value, ttlSeconds = 300) {
  const ttlMs = ttlSeconds * 1000;

  // Set memory cache first (always available)
  memoryCache.set(key, value, ttlMs);

  // Set Redis if connected
  if (isRedisConnected()) {
    try {
      await redisSet(key, JSON.stringify(value), ttlSeconds);
    } catch (err) {
      console.warn('[HybridCache] Redis SET error:', err.message);
    }
  }
}

/**
 * Delete value from cache
 * 
 * @param {string} key - Cache key
 */
async function cacheDel(key) {
  memoryCache.del(key);

  if (isRedisConnected()) {
    try {
      await redisDel(key);
    } catch (err) {
      console.warn('[HybridCache] Redis DEL error:', err.message);
    }
  }
}

/**
 * Delete cache by prefix pattern
 * 
 * @param {string} prefix - Key prefix to delete
 */
async function cacheDelByPrefix(prefix) {
  // Clear from memory
  for (const key of memoryCache.cache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.del(key);
    }
  }

  // Redis scan and delete (if connected)
  if (isRedisConnected()) {
    try {
      const client = (await import('../services/redisClient.js')).getClient();
      if (client) {
        let cursor = '0';
        const pattern = `shiku:${prefix}*`;
        
        do {
          const [newCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
          cursor = newCursor;
          
          if (keys.length > 0) {
            await client.del(...keys);
          }
        } while (cursor !== '0');
      }
    } catch (err) {
      console.warn('[HybridCache] Redis pattern delete error:', err.message);
    }
  }
}

// ============================================================
// HIGH-LEVEL CACHE FUNCTIONS
// ============================================================

/**
 * Cache-aside pattern với automatic fetching
 * 
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Async function to fetch data if cache miss
 * @param {number} ttlSeconds - TTL in seconds (default 5 minutes)
 * @returns {Promise<any>} Cached or fetched data
 */
async function withCache(key, fetchFn, ttlSeconds = 300) {
  // Try cache first
  const cached = await cacheGet(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch with coalescing
  const data = await coalesce(`fetch:${key}`, fetchFn);
  
  // Cache result
  await cacheSet(key, data, ttlSeconds);
  
  return data;
}

/**
 * Stale-While-Revalidate pattern
 * Trả về cached data ngay lập tức và refresh trong background
 * 
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Async function to fetch data
 * @param {number} ttlSeconds - TTL in seconds
 * @param {number} staleSeconds - Time before data is considered stale
 * @returns {Promise<any>} Cached or fetched data
 */
async function withSWR(key, fetchFn, ttlSeconds = 300, staleSeconds = 60) {
  const cacheItem = memoryCache.cache.get(key);
  
  if (cacheItem) {
    const age = Date.now() - cacheItem.createdAt;
    const isStale = age > staleSeconds * 1000;
    
    if (isStale && !pendingRequests.has(`swr:${key}`)) {
      // Background revalidate
      const revalidatePromise = (async () => {
        try {
          const fresh = await fetchFn();
          await cacheSet(key, fresh, ttlSeconds);
        } catch (err) {
          console.warn('[HybridCache] SWR revalidate error:', err.message);
        } finally {
          pendingRequests.delete(`swr:${key}`);
        }
      })();
      
      pendingRequests.set(`swr:${key}`, revalidatePromise);
    }
    
    return cacheItem.value;
  }

  // No cache, must fetch
  return withCache(key, fetchFn, ttlSeconds);
}

// ============================================================
// CACHE KEYS HELPERS
// ============================================================

/**
 * Generate cache key cho posts feed
 */
function feedCacheKey(type, userId = null, page = 1, limit = 20) {
  const base = `feed:${type}`;
  return userId 
    ? `${base}:user:${userId}:${page}:${limit}`
    : `${base}:public:${page}:${limit}`;
}

/**
 * Generate cache key cho user data
 */
function userCacheKey(userId, type = 'profile') {
  return `user:${userId}:${type}`;
}

/**
 * Generate cache key cho post data
 */
function postCacheKey(postId, type = 'detail') {
  return `post:${postId}:${type}`;
}

// ============================================================
// STATISTICS & MONITORING
// ============================================================

/**
 * Get cache statistics
 */
function getCacheStats() {
  return {
    memory: memoryCache.getStats(),
    redis: isRedisConnected() ? 'connected' : 'disconnected',
    pendingRequests: pendingRequests.size
  };
}

/**
 * Cleanup expired cache entries
 */
function cleanup() {
  const cleaned = memoryCache.cleanup();
  console.log(`[HybridCache] Cleaned ${cleaned} expired entries`);
  return cleaned;
}

// Auto cleanup every 5 minutes
const hybridCacheCleanupInterval = setInterval(cleanup, 5 * 60 * 1000);
if (hybridCacheCleanupInterval.unref) {
  hybridCacheCleanupInterval.unref();
}

// ============================================================
// EXPORTS
// ============================================================

export {
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelByPrefix,
  withCache,
  withSWR,
  coalesce,
  feedCacheKey,
  userCacheKey,
  postCacheKey,
  getCacheStats,
  cleanup,
  memoryCache
};

export default {
  get: cacheGet,
  set: cacheSet,
  del: cacheDel,
  delByPrefix: cacheDelByPrefix,
  withCache,
  withSWR,
  coalesce,
  keys: {
    feed: feedCacheKey,
    user: userCacheKey,
    post: postCacheKey
  },
  stats: getCacheStats,
  cleanup
};
