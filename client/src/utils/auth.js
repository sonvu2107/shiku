/**
 * Authentication utilities - Quản lý JWT tokens trong client
 * Sử dụng localStorage để lưu trữ authentication token
 */

/**
 * Lưu authentication token vào localStorage
 * @param {string} token - JWT token từ server
 */
export function setAuthToken(token) {
  localStorage.setItem("token", token);
}

/**
 * Lấy authentication token từ localStorage
 * @returns {string|null} JWT token hoặc null nếu không có
 */
export function getAuthToken() {
  return localStorage.getItem("token");
}

/**
 * Xóa authentication token khỏi localStorage (logout)
 */
export function removeAuthToken() {
  localStorage.removeItem("token");
}

/**
 * Decode JWT token để lấy thông tin user mà không cần gọi API
 * @returns {Object|null} User payload từ JWT hoặc null nếu invalid
 */
export function getUserInfo() {
  try {
    const token = getAuthToken();
    if (!token) return null;
    
    // Decode phần payload của JWT (base64 encoded)
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch (error) {
    // Silent handling for token decoding error
    return null;
  }
}
