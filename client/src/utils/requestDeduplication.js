/**
 * Request Deduplication Utility
 * Prevents duplicate API calls when user clicks rapidly
 */

class RequestDeduplication {
  constructor() {
    this.pendingRequests = new Map();
  }

  /**
   * Execute request with deduplication
   * @param {string} key - Unique key for the request
   * @param {Function} requestFn - Function that returns a Promise
   * @returns {Promise} The request result
   */
  async execute(key, requestFn) {
    // If request is already pending, return the existing promise
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    // Create new request
    const requestPromise = requestFn()
      .finally(() => {
        // Clean up after request completes
        this.pendingRequests.delete(key);
      });

    // Store the promise
    this.pendingRequests.set(key, requestPromise);

    return requestPromise;
  }

  /**
   * Cancel a pending request
   * @param {string} key - Request key to cancel
   */
  cancel(key) {
    if (this.pendingRequests.has(key)) {
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Cancel all pending requests
   */
  cancelAll() {
    this.pendingRequests.clear();
  }

  /**
   * Get pending request count
   * @returns {number} Number of pending requests
   */
  getPendingCount() {
    return this.pendingRequests.size;
  }
}

// Create singleton instance
const requestDeduplication = new RequestDeduplication();

/**
 * Create a deduplicated API call
 * @param {string} path - API path
 * @param {Object} options - Request options
 * @returns {Promise} API response
 */
export function deduplicatedApi(path, options = {}) {
  const key = `${options.method || 'GET'}:${path}:${JSON.stringify(options.body || {})}`;
  
  return requestDeduplication.execute(key, async () => {
    const { api } = await import('../api.js');
    return api(path, options);
  });
}

/**
 * Create a deduplicated function call
 * @param {string} key - Unique key
 * @param {Function} fn - Function to execute
 * @returns {Promise} Function result
 */
export function deduplicatedCall(key, fn) {
  return requestDeduplication.execute(key, fn);
}

export default requestDeduplication;
