/**
 * Simple in-memory cache utility
 * Sử dụng cho caching kết quả queries thường xuyên
 */

class SimpleCache {
  constructor(ttl = 5 * 60 * 1000) { // 5 minutes default TTL
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key, value, customTtl = null) {
    const ttl = customTtl || this.ttl;
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  // Get cache stats
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

// Create cache instances for different data types
export const userCache = new SimpleCache(10 * 60 * 1000); // 10 minutes
export const postCache = new SimpleCache(5 * 60 * 1000);  // 5 minutes
export const statsCache = new SimpleCache(2 * 60 * 1000); // 2 minutes

/**
 * Cache wrapper function
 * @param {SimpleCache} cache - Cache instance
 * @param {string} key - Cache key
 * @param {Function} fn - Function to execute if cache miss
 * @param {number} ttl - Custom TTL in milliseconds
 * @returns {Promise<any>} Cached or fresh result
 */
export async function withCache(cache, key, fn, ttl = null) {
  // Try to get from cache first
  const cached = cache.get(key);
  if (cached !== null) {
    return cached;
  }

  // Execute function and cache result
  const result = await fn();
  cache.set(key, result, ttl);
  return result;
}

/**
 * Invalidate cache by pattern
 * @param {SimpleCache} cache - Cache instance
 * @param {string} pattern - Pattern to match keys
 */
export function invalidateCache(cache, pattern) {
  const regex = new RegExp(pattern);
  for (const key of cache.cache.keys()) {
    if (regex.test(key)) {
      cache.delete(key);
    }
  }
}
