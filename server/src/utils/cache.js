/**
 * Simple In-Memory Cache Utility
 * 
 * Utility đơn giản để cache kết quả queries thường xuyên trong RAM
 * Hỗ trợ TTL (Time To Live) tự động xóa cache hết hạn
 * 
 * @module cache
 */

class SimpleCache {
  /**
   * Khởi tạo cache với TTL mặc định
   * @param {number} ttl - Thời gian sống của cache (milliseconds), mặc định 5 phút
   */
  constructor(ttl = 5 * 60 * 1000) {
    this.cache = new Map();
    this.ttl = ttl;
  }

  /**
   * Lưu giá trị vào cache
   * @param {string} key - Khóa cache
   * @param {any} value - Giá trị cần cache
   * @param {number|null} customTtl - TTL tùy chỉnh (milliseconds), null = dùng TTL mặc định
   */
  set(key, value, customTtl = null) {
    const ttl = customTtl || this.ttl;
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl
    });
  }

  /**
   * Lấy giá trị từ cache
   * @param {string} key - Khóa cache
   * @returns {any|null} Giá trị cache hoặc null nếu không tồn tại/hết hạn
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Xóa một key khỏi cache
   * @param {string} key - Khóa cần xóa
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Xóa toàn bộ cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Lấy thống kê cache (tổng số, số hợp lệ, số hết hạn)
   * @returns {Object} Thống kê cache
   */
  getStats() {
    const now = Date.now();
    let valid = 0;
    let expired = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        expired++;
      } else {
        valid++;
      }
    }

    return {
      total: this.cache.size,
      valid,
      expired
    };
  }
}

// Tạo các instance cache cho các loại dữ liệu khác nhau
export const userCache = new SimpleCache(10 * 60 * 1000); // 10 phút
export const postCache = new SimpleCache(5 * 60 * 1000);  // 5 phút
export const statsCache = new SimpleCache(2 * 60 * 1000); // 2 phút
export const queryCache = new SimpleCache(1 * 60 * 1000); // 1 phút - cho queries ngắn hạn

/**
 * Hash a filter object to create a short, stable cache key
 * Using djb2 hash algorithm for speed
 * @param {Object} filter - MongoDB filter object
 * @returns {string} Short hash string
 */
export function hashFilter(filter) {
  const str = JSON.stringify(filter, Object.keys(filter).sort());
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return (hash >>> 0).toString(36); // Convert to base36 for shorter string
}

// Cache statistics tracking
let cacheHits = 0;
let cacheMisses = 0;

/**
 * Wrapper function để cache kết quả của async function
 * Tự động lấy từ cache nếu có, nếu không thì thực thi function và cache kết quả
 * 
 * @param {SimpleCache} cache - Instance cache
 * @param {string} key - Khóa cache
 * @param {Function} fn - Function async cần thực thi nếu cache miss
 * @param {number|null} ttl - TTL tùy chỉnh (milliseconds), null = dùng TTL mặc định
 * @returns {Promise<any>} Kết quả từ cache hoặc từ function
 */
export async function withCache(cache, key, fn, ttl = null) {
  // Thử lấy từ cache trước
  const cached = cache.get(key);
  if (cached !== null) {
    cacheHits++;
    return cached;
  }

  cacheMisses++;
  // Thực thi function và cache kết quả
  const result = await fn();
  cache.set(key, result, ttl);
  return result;
}

/**
 * Wrapper với stale-while-revalidate pattern
 * Trả về cache cũ ngay lập tức và update cache trong background
 * 
 * @param {SimpleCache} cache - Instance cache
 * @param {string} key - Khóa cache
 * @param {Function} fn - Function async cần thực thi
 * @param {number} ttl - TTL (milliseconds)
 * @param {number} staleTime - Thời gian cache được coi là stale (milliseconds)
 * @returns {Promise<any>} Kết quả từ cache hoặc từ function
 */
export async function withSWR(cache, key, fn, ttl = 5 * 60 * 1000, staleTime = 60 * 1000) {
  const cached = cache.get(key);

  if (cached !== null) {
    // Check if stale - cần revalidate
    const item = cache.cache.get(key);
    const isStale = item && (Date.now() > item.expires - (ttl - staleTime));

    if (isStale) {
      // Background revalidate
      setImmediate(async () => {
        try {
          const fresh = await fn();
          cache.set(key, fresh, ttl);
        } catch (err) {
          // Silent fail - keep stale data
        }
      });
    }

    cacheHits++;
    return cached;
  }

  cacheMisses++;
  const result = await fn();
  cache.set(key, result, ttl);
  return result;
}

/**
 * Xóa cache theo pattern (regex)
 * @param {SimpleCache} cache - Instance cache
 * @param {string} pattern - Pattern regex để match keys
 */
export function invalidateCache(cache, pattern) {
  const regex = new RegExp(pattern);
  for (const key of cache.cache.keys()) {
    if (regex.test(key)) {
      cache.delete(key);
    }
  }
}

/**
 * Xóa cache theo prefix
 * Hiệu quả hơn regex cho trường hợp đơn giản
 * 
 * @param {SimpleCache} cache - Instance cache
 * @param {string} prefix - Prefix của key cần xóa
 */
export function invalidateCacheByPrefix(cache, prefix) {
  for (const key of cache.cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/**
 * Lấy thống kê cache hit/miss
 * @returns {Object} Stats object
 */
export function getCacheStats() {
  const total = cacheHits + cacheMisses;
  return {
    hits: cacheHits,
    misses: cacheMisses,
    total,
    hitRate: total > 0 ? (cacheHits / total * 100).toFixed(2) + '%' : '0%',
    caches: {
      user: userCache.getStats(),
      post: postCache.getStats(),
      stats: statsCache.getStats(),
      query: queryCache.getStats()
    }
  };
}

/**
 * Reset cache statistics
 */
export function resetCacheStats() {
  cacheHits = 0;
  cacheMisses = 0;
}

/**
 * Cleanup tất cả expired entries trong tất cả caches
 * Nên gọi định kỳ để giải phóng memory
 */
export function cleanupAllCaches() {
  const caches = [userCache, postCache, statsCache, queryCache];
  let cleaned = 0;

  caches.forEach(cache => {
    const now = Date.now();
    for (const [key, item] of cache.cache.entries()) {
      if (now > item.expires) {
        cache.cache.delete(key);
        cleaned++;
      }
    }
  });

  return cleaned;
}

// Auto cleanup mỗi 5 phút
const cacheCleanupInterval = setInterval(cleanupAllCaches, 5 * 60 * 1000);
if (cacheCleanupInterval.unref) {
  cacheCleanupInterval.unref();
}
