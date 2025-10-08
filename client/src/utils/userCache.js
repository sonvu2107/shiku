import { api } from "../api";

/**
 * Global User Cache
 * Cache user info để tránh gọi /api/auth/me nhiều lần
 */

// Cache storage
let userCache = null;
let cacheExpiry = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 phút

// Loading state để tránh duplicate requests
let loadingPromise = null;

/**
 * Load user info từ API và cache lại
 * @returns {Promise<Object|null>} User object hoặc null nếu chưa đăng nhập
 */
export async function loadUser() {
  const now = Date.now();

  // Return cached data if still valid
  if (userCache && now < cacheExpiry) {
    return userCache;
  }

  // If already loading, return the existing promise
  if (loadingPromise) {
    return loadingPromise;
  }

  // Start loading
  loadingPromise = api("/api/auth/me")
    .then(response => {
      if (response && response.user) {
        // Update cache
        userCache = response.user;
        cacheExpiry = now + CACHE_DURATION;
        return response.user;
      }
      return null;
    })
    .catch(error => {
      console.error("Error loading user:", error);
      return null;
    })
    .finally(() => {
      loadingPromise = null;
    });

  return loadingPromise;
}

/**
 * Get cached user without triggering a new request
 * @returns {Object|null} Cached user or null
 */
export function getCachedUser() {
  const now = Date.now();
  if (userCache && now < cacheExpiry) {
    return userCache;
  }
  return null;
}

/**
 * Update user cache (dùng khi user update profile)
 * @param {Object} user - Updated user object
 */
export function updateUserCache(user) {
  if (user) {
    userCache = user;
    cacheExpiry = Date.now() + CACHE_DURATION;
  }
}

/**
 * Invalidate cache (dùng khi logout)
 */
export function invalidateUserCache() {
  userCache = null;
  cacheExpiry = 0;
  loadingPromise = null;
}

/**
 * Force refresh user cache
 * @returns {Promise<Object|null>} Fresh user object
 */
export async function refreshUser() {
  invalidateUserCache();
  return loadUser();
}
