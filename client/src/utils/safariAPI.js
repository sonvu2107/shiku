// Safari-specific API wrapper
// This utility ensures all API calls work properly on Safari by handling CSRF token issues

import { api } from '../api.js';
import { handleSafariCSRFError, ensureCSRFToken } from './csrfToken.js';

/**
 * Safari-compatible API wrapper
 * Automatically handles CSRF token issues for Safari users
 * @param {string} path - API endpoint path
 * @param {Object} options - API options
 * @param {string} action - Human-readable action description for error messages
 * @returns {Promise} API response
 */
export async function safariAPI(path, options = {}, action = "thực hiện hành động") {
  try {
    // Ensure CSRF token is available for non-GET requests
    if (options.method && options.method !== 'GET') {
      const hasToken = await ensureCSRFToken();
      if (!hasToken) {
        throw new Error('CSRF token not available. Please refresh the page and try again.');
      }
    }
    
    return await api(path, options);
  } catch (error) {
    // Handle Safari-specific CSRF errors
    const errorMessage = handleSafariCSRFError(error, action);
    throw new Error(errorMessage);
  }
}

/**
 * Safari-compatible API wrapper for POST requests
 */
export async function safariPOST(path, body, action = "thực hiện hành động") {
  return safariAPI(path, { method: 'POST', body }, action);
}

/**
 * Safari-compatible API wrapper for PUT requests
 */
export async function safariPUT(path, body, action = "cập nhật") {
  return safariAPI(path, { method: 'PUT', body }, action);
}

/**
 * Safari-compatible API wrapper for DELETE requests
 */
export async function safariDELETE(path, action = "xóa") {
  return safariAPI(path, { method: 'DELETE' }, action);
}

/**
 * Safari-compatible API wrapper for FormData uploads
 */
export async function safariUpload(path, formData, action = "tải lên") {
  return safariAPI(path, { method: 'POST', body: formData }, action);
}
