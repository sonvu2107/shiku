/**
 * Token Manager - Quản lý access token và refresh token
 * Tự động refresh token khi cần thiết
 */

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

/**
 * Lưu tokens vào localStorage
 * @param {string} accessToken - Access token
 * @param {string} refreshToken - Refresh token
 */
export function saveTokens(accessToken, refreshToken) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

/**
 * Lấy access token từ localStorage
 * @returns {string|null} Access token hoặc null
 */
export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Lấy refresh token từ localStorage
 * @returns {string|null} Refresh token hoặc null
 */
export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Xóa tất cả tokens
 */
export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * Kiểm tra token có hết hạn không
 * @param {string} token - JWT token
 * @returns {boolean} true nếu token hết hạn
 */
export function isTokenExpired(token) {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch (error) {
    return true;
  }
}

/**
 * Refresh access token sử dụng refresh token
 * @returns {Promise<string|null>} New access token hoặc null nếu thất bại
 */
export async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Refresh-Token': refreshToken,
        'Accept': 'application/json' // Explicit header for Safari
        // Removed Cache-Control header to prevent CORS issues
      },
      credentials: 'include',
      mode: 'cors' // Explicit CORS mode for Safari
    });

    if (!response.ok) {
      throw new Error('Refresh token failed');
    }

    const data = await response.json();
    
    // Lưu access token mới
    if (data.accessToken) {
      localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
      return data.accessToken;
    }

    return null;
  } catch (error) {
    // Silent handling for refresh token error
    clearTokens(); // Clear tokens nếu refresh thất bại
    return null;
  }
}

/**
 * Lấy access token hợp lệ (tự động refresh nếu cần)
 * @returns {Promise<string|null>} Valid access token hoặc null
 */
export async function getValidAccessToken() {
  let accessToken = getAccessToken();
  
  // Nếu không có access token hoặc đã hết hạn
  if (!accessToken || isTokenExpired(accessToken)) {
    accessToken = await refreshAccessToken();
  }
  
  return accessToken;
}
