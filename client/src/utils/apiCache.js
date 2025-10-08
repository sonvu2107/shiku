import { api } from "../api";

/**
 * Generic API Cache Utility
 * Provides stale-while-revalidate caching for any API endpoint
 */

class APICache {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
  }

  /**
   * Generate cache key from request params
   */
  getCacheKey(path, options = {}) {
    return `${options.method || 'GET'}:${path}:${JSON.stringify(options.body || {})}`;
  }

  /**
   * Get cached data
   */
  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const { data, timestamp, ttl } = cached;
    const now = Date.now();

    // Check if cache is still valid
    if (now - timestamp < ttl) {
      return { data, isStale: false };
    }

    // Cache is stale but can still be used
    if (now - timestamp < ttl * 2) {
      return { data, isStale: true };
    }

    // Cache is too old, remove it
    this.cache.delete(key);
    return null;
  }

  /**
   * Set cached data
   */
  set(key, data, ttl = 60000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Cached API call with stale-while-revalidate
   * @param {string} path - API path
   * @param {Object} options - Request options
   * @param {number} ttl - Time to live in milliseconds (default 60s)
   * @returns {Promise} API response
   */
  async cachedApi(path, options = {}, ttl = 60000) {
    const key = this.getCacheKey(path, options);

    // Check cache
    const cached = this.get(key);

    if (cached) {
      // Return stale data immediately
      if (cached.isStale) {
        // Revalidate in background
        this.revalidate(key, path, options, ttl);
      }
      return cached.data;
    }

    // If already fetching, return the pending promise
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    // Fetch fresh data
    const promise = api(path, options)
      .then(data => {
        this.set(key, data, ttl);
        return data;
      })
      .finally(() => {
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Revalidate cache in background
   */
  async revalidate(key, path, options, ttl) {
    try {
      const data = await api(path, options);
      this.set(key, data, ttl);
    } catch (error) {
      // Keep stale data on error
      console.error('Revalidation failed:', error);
    }
  }

  /**
   * Invalidate specific cache key
   */
  invalidate(path, options = {}) {
    const key = this.getCacheKey(path, options);
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache matching pattern
   */
  invalidatePattern(pattern) {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.pendingRequests.clear();
  }
}

// Create singleton instance
const apiCache = new APICache();

/**
 * Cached API wrapper with stale-while-revalidate
 * @param {string} path - API path
 * @param {Object} options - Request options
 * @param {number} ttl - Cache TTL in ms (default 60s)
 */
export function cachedApi(path, options = {}, ttl = 60000) {
  return apiCache.cachedApi(path, options, ttl);
}

/**
 * Invalidate cache for specific endpoint
 */
export function invalidateCache(path, options = {}) {
  apiCache.invalidate(path, options);
}

/**
 * Invalidate cache matching pattern
 */
export function invalidateCachePattern(pattern) {
  apiCache.invalidatePattern(pattern);
}

export default apiCache;
