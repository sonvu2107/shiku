// URL của API server - lấy từ environment variable hoặc default localhost
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

import { getValidAccessToken, clearTokens, getRefreshToken, refreshAccessToken } from "./utils/tokenManager.js";
import { getCSRFToken } from "./utils/csrfToken.js";
import { 
  parseRateLimitHeaders, 
  showRateLimitWarning, 
  showRateLimitError,
  storeRateLimitInfo,
  getStoredRateLimitInfo 
} from "./utils/rateLimitHandler.js";

// Deprecated: getToken() function đã được thay thế bởi getValidAccessToken() trong tokenManager.js

/**
 * Hàm chính để gọi API với authentication và error handling
 * @param {string} path - Đường dẫn API endpoint
 * @param {Object} options - Các tùy chọn request
 * @param {string} options.method - HTTP method (GET, POST, PUT, DELETE)
 * @param {Object} options.body - Request body data
 * @param {Object} options.headers - Additional headers
 * @returns {Promise<Object>} Response data từ API
 * @throws {Error} Lỗi với thông tin ban nếu user bị cấm
 */
export async function api(path, { method = "GET", body, headers = {} } = {}) {
  // Lấy valid access token (tự động refresh nếu cần)
  const token = await getValidAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  // Lấy CSRF token cho các request không phải GET
  if (method !== 'GET') {
    const csrf = await getCSRFToken();
    if (csrf) {
      headers['X-CSRF-Token'] = csrf;
    }
  }
  
  // Thực hiện request
  const isFormData = body instanceof FormData;
  const requestOptions = {
    method,
    headers: {
      ...headers,
    },
    credentials: "include", // Bao gồm cookies trong request
    mode: "cors", // Đảm bảo CORS mode
    body: body ? (isFormData ? body : (typeof body === 'string' ? body : JSON.stringify(body))) : undefined,
  };

  // Chỉ set Content-Type cho JSON, không set cho FormData
  if (!isFormData) {
    requestOptions.headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_URL}${path}`, requestOptions);

  // Parse và xử lý rate limit headers
  const rateLimitInfo = parseRateLimitHeaders(res);
  if (rateLimitInfo.limit) {
    storeRateLimitInfo(path, rateLimitInfo);
    
    // Show warning if nearly exceeded
    if (rateLimitInfo.warning || (rateLimitInfo.remaining && rateLimitInfo.remaining <= 10)) {
      showRateLimitWarning(rateLimitInfo);
    }
  }

  // Xử lý lỗi response
  if (!res.ok) {
    // Nếu là lỗi 401 và có refresh token, thử refresh
    if (res.status === 401 && getRefreshToken()) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        // Retry request với token mới
        headers.Authorization = `Bearer ${newToken}`;
        const retryRes = await fetch(`${API_URL}${path}`, {
          ...requestOptions,
          headers: { ...requestOptions.headers, ...headers },
          mode: "cors"
        });
        
        if (retryRes.ok) {
          return await retryRes.json();
        }
      } else {
        // Refresh thất bại, clear tokens và redirect to login
        clearTokens();
        window.location.href = '/login';
        return;
      }
    }
    
    // Nếu là lỗi 403 (CSRF token invalid), thử refresh CSRF token
    if (res.status === 403 && method !== 'GET') {
      const newCSRFToken = await getCSRFToken(true); // Force refresh
      if (newCSRFToken) {
        headers['X-CSRF-Token'] = newCSRFToken;
        const retryRes = await fetch(`${API_URL}${path}`, {
          ...requestOptions,
          headers: { ...requestOptions.headers, ...headers },
          mode: "cors"
        });
        
        if (retryRes.ok) {
          return await retryRes.json();
        }
      }
    }

    const data = await res.json().catch(() => ({}));
    const error = new Error(data.message || data.error || `Request failed (${res.status})`);
    
    // Xử lý rate limit error
    if (res.status === 429) {
      showRateLimitError(rateLimitInfo);
      error.rateLimitInfo = rateLimitInfo;
    }
    
    // Thêm thông tin ban vào error nếu user bị cấm
    if (data.isBanned) {
      error.banInfo = {
        isBanned: data.isBanned,
        remainingMinutes: data.remainingMinutes,
        banReason: data.banReason
      };
    }
    
    throw error;
  }
  return res.json();
}


/**
 * Upload hình ảnh lên server
 * @param {File} file - File hình ảnh cần upload
 * @returns {Promise<Object>} Response chứa URL của hình ảnh đã upload
 * @throws {Error} Lỗi nếu upload thất bại
 */
export async function uploadImage(file) {
  // Tạo FormData để upload file
  const form = new FormData();
  form.append("file", file);
  
  // Sử dụng api() function để tự động handle authentication
  return await api("/api/uploads/", {
    method: "POST",
    body: form
  });
}
