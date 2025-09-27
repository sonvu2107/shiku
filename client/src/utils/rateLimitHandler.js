/**
 * Rate Limit Handler Utility
 * Xử lý rate limiting trên client side
 */

/**
 * Parse rate limit headers từ response
 * @param {Response} response - Fetch response object
 * @returns {Object} Rate limit information
 */
export function parseRateLimitHeaders(response) {
  const limit = response.headers.get('X-RateLimit-Limit');
  const remaining = response.headers.get('X-RateLimit-Remaining');
  const reset = response.headers.get('X-RateLimit-Reset');
  const used = response.headers.get('X-RateLimit-Used');
  const warning = response.headers.get('X-RateLimit-Warning');
  const retryAfter = response.headers.get('Retry-After');
  
  return {
    limit: limit ? parseInt(limit) : null,
    remaining: remaining ? parseInt(remaining) : null,
    reset: reset ? new Date(parseInt(reset) * 1000) : null,
    used: used ? parseInt(used) : null,
    warning: warning === 'Rate limit nearly exceeded',
    retryAfter: retryAfter ? parseInt(retryAfter) : null
  };
}

/**
 * Check if rate limit is nearly exceeded
 * @param {Object} rateLimitInfo - Rate limit information
 * @returns {boolean} True if nearly exceeded
 */
export function isRateLimitNearlyExceeded(rateLimitInfo) {
  if (!rateLimitInfo.remaining || !rateLimitInfo.limit) return false;
  
  const usagePercentage = (rateLimitInfo.used / rateLimitInfo.limit) * 100;
  return usagePercentage >= 80; // 80% usage threshold
}

/**
 * Calculate time until rate limit resets
 * @param {Object} rateLimitInfo - Rate limit information
 * @returns {number} Milliseconds until reset
 */
export function getTimeUntilReset(rateLimitInfo) {
  if (!rateLimitInfo.reset) return null;
  
  const now = new Date();
  const resetTime = rateLimitInfo.reset;
  return Math.max(0, resetTime.getTime() - now.getTime());
}

/**
 * Format time until reset for display
 * @param {Object} rateLimitInfo - Rate limit information
 * @returns {string} Formatted time string
 */
export function formatTimeUntilReset(rateLimitInfo) {
  const timeUntilReset = getTimeUntilReset(rateLimitInfo);
  if (!timeUntilReset) return null;
  
  const minutes = Math.ceil(timeUntilReset / 60000);
  const seconds = Math.ceil((timeUntilReset % 60000) / 1000);
  
  if (minutes > 0) {
    return `${minutes} phút ${seconds} giây`;
  } else {
    return `${seconds} giây`;
  }
}

/**
 * Show rate limit warning to user
 * @param {Object} rateLimitInfo - Rate limit information
 */
export function showRateLimitWarning(rateLimitInfo) {
  if (!rateLimitInfo.warning && !isRateLimitNearlyExceeded(rateLimitInfo)) return;
  
  const timeUntilReset = formatTimeUntilReset(rateLimitInfo);
  const message = `⚠️ Bạn đã sử dụng ${rateLimitInfo.used}/${rateLimitInfo.limit} requests. ` +
    `Còn lại ${rateLimitInfo.remaining} requests. ` +
    (timeUntilReset ? `Reset sau ${timeUntilReset}.` : '');
  
  // Show warning (có thể integrate với toast system)
  // Rate limit warning logged (integrated with toast system)
  
  // Có thể show toast notification ở đây
  if (window.showToast) {
    window.showToast(message, 'warning');
  }
}

/**
 * Show rate limit exceeded error
 * @param {Object} rateLimitInfo - Rate limit information
 */
export function showRateLimitError(rateLimitInfo) {
  const timeUntilReset = formatTimeUntilReset(rateLimitInfo);
  const message = `🚫 Bạn đã vượt quá giới hạn requests (${rateLimitInfo.limit}/15 phút). ` +
    (timeUntilReset ? `Vui lòng thử lại sau ${timeUntilReset}.` : 'Vui lòng thử lại sau.');
  
  // Show error (có thể integrate với toast system)
  // Rate limit error logged (integrated with toast system)
  
  // Có thể show toast notification ở đây
  if (window.showToast) {
    window.showToast(message, 'error');
  }
}

/**
 * Implement exponential backoff for retries
 * @param {number} attempt - Current attempt number (0-based)
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {number} Delay in milliseconds
 */
export function getExponentialBackoffDelay(attempt, baseDelay = 1000) {
  return Math.min(baseDelay * Math.pow(2, attempt), 30000); // Max 30 seconds
}

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxAttempts - Maximum number of attempts
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise} Result of function execution
 */
export async function retryWithBackoff(fn, maxAttempts = 3, baseDelay = 1000) {
  let lastError;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on rate limit errors
      if (error.status === 429) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === maxAttempts - 1) {
        throw error;
      }
      
      // Wait before retry
      const delay = getExponentialBackoffDelay(attempt, baseDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Rate limit aware fetch wrapper
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
export async function rateLimitAwareFetch(url, options = {}) {
  const response = await fetch(url, options);
  
  // Parse rate limit headers
  const rateLimitInfo = parseRateLimitHeaders(response);
  
  // Show warning if nearly exceeded
  if (rateLimitInfo.warning || isRateLimitNearlyExceeded(rateLimitInfo)) {
    showRateLimitWarning(rateLimitInfo);
  }
  
  // Handle rate limit exceeded
  if (response.status === 429) {
    showRateLimitError(rateLimitInfo);
  }
  
  return response;
}

/**
 * Store rate limit info in localStorage for persistence
 * @param {string} endpoint - API endpoint
 * @param {Object} rateLimitInfo - Rate limit information
 */
export function storeRateLimitInfo(endpoint, rateLimitInfo) {
  const key = `rateLimit_${endpoint}`;
  const data = {
    ...rateLimitInfo,
    timestamp: Date.now()
  };
  
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    // Silent handling for rate limit storage error
  }
}

/**
 * Get stored rate limit info from localStorage
 * @param {string} endpoint - API endpoint
 * @returns {Object|null} Rate limit information or null
 */
export function getStoredRateLimitInfo(endpoint) {
  const key = `rateLimit_${endpoint}`;
  
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    const data = JSON.parse(stored);
    
    // Check if data is still valid (not expired)
    const now = Date.now();
    const maxAge = 15 * 60 * 1000; // 15 minutes
    
    if (now - data.timestamp > maxAge) {
      localStorage.removeItem(key);
      return null;
    }
    
    return data;
  } catch (error) {
    // Silent handling for rate limit retrieval error
    return null;
  }
}
