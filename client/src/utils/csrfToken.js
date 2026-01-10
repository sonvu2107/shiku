import { API_CONFIG } from "../config/environment.js";

// Biến lưu CSRF token và thời gian hết hạn (cache trong RAM)
let csrfToken = null;
let csrfTokenExpiry = 0;


/**
 * Lấy và cache CSRF token cho các request tiếp theo
 * @param {boolean} forceRefresh - true: luôn gọi API lấy mới, false: dùng cache nếu còn hạn
 * @returns {Promise<string|null>}
 */
export async function getCSRFToken(forceRefresh = false) {
  const now = Date.now();
  // Nếu không bắt buộc làm mới và token còn hạn thì trả về token cache
  if (!forceRefresh && csrfToken && now < csrfTokenExpiry) {
    return csrfToken;
  }
  try {
    const API_URL = API_CONFIG.baseURL;
    // Gọi API lấy CSRF token mới
    const response = await fetch(`${API_URL}/api/csrf-token`, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json"
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      clearCSRFToken();
      return null;
    }
    const data = await response.json();
    if (data?.csrfToken) {
      csrfToken = data.csrfToken;
      csrfTokenExpiry = now + 60 * 60 * 1000; // 1 tiếng
      return csrfToken;
    }
    clearCSRFToken();
  } catch (error) {
    clearCSRFToken();
  }
  return null;
}


/**
 * Xoá CSRF token khỏi cache (reset)
 */
export function clearCSRFToken() {
  csrfToken = null;
  csrfTokenExpiry = 0;
}


/**
 * Lấy sẵn CSRF token khi khởi động app (bootstrap)
 */
export async function initializeCSRFToken() {
  const token = await getCSRFToken(true);
  if (token) {
    return true;
  }
  return false;
}


/**
 * Kiểm tra token CSRF cache còn hạn không
 */
export function hasValidCSRFToken() {
  const now = Date.now();
  return Boolean(csrfToken && now < csrfTokenExpiry);
}


/**
 * Đảm bảo luôn có CSRF token hợp lệ trước khi gửi request thay đổi dữ liệu
 * @returns {Promise<boolean>}
 */
export async function ensureCSRFToken() {
  if (hasValidCSRFToken()) {
    return true;
  }
  const token = await getCSRFToken(true);
  return Boolean(token);
}
