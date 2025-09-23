// CSRF Token utility
// Cache CSRF token để tránh gọi API nhiều lần

let csrfToken = null;
let csrfTokenExpiry = 0;

/**
 * Lấy CSRF token từ server
 * @param {boolean} forceRefresh - Bắt buộc refresh token
 * @returns {Promise<string|null>} CSRF token hoặc null nếu lỗi
 */
export async function getCSRFToken(forceRefresh = false) {
  const now = Date.now();
  
  // Nếu token còn hợp lệ (trong vòng 1 giờ) và không force refresh, trả về token cached
  if (!forceRefresh && csrfToken && now < csrfTokenExpiry) {
    return csrfToken;
  }
  
  try {
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
    const response = await fetch(`${API_URL}/api/csrf-token`, {
      method: 'GET',
      credentials: 'include',
      mode: 'cors' // Đảm bảo CORS mode
    });
    
    if (response.ok) {
      const data = await response.json();
      csrfToken = data.csrfToken;
      csrfTokenExpiry = now + (60 * 60 * 1000); // 1 giờ
      return csrfToken;
    } else {
      // Nếu response không OK, clear cache
      clearCSRFToken();
    }
  } catch (error) {
    console.warn('Failed to get CSRF token:', error);
    // Clear cache khi có lỗi
    clearCSRFToken();
  }
  
  return null;
}

/**
 * Clear CSRF token cache (dùng khi logout)
 */
export function clearCSRFToken() {
  csrfToken = null;
  csrfTokenExpiry = 0;
}
