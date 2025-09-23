// CSRF Token utility
// Cache CSRF token để tránh gọi API nhiều lần

let csrfToken = null;
let csrfTokenExpiry = 0;

/**
 * Lấy CSRF token từ server
 * @returns {Promise<string|null>} CSRF token hoặc null nếu lỗi
 */
export async function getCSRFToken() {
  const now = Date.now();
  
  // Nếu token còn hợp lệ (trong vòng 1 giờ), trả về token cached
  if (csrfToken && now < csrfTokenExpiry) {
    return csrfToken;
  }
  
  try {
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
    const response = await fetch(`${API_URL}/api/csrf-token`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      csrfToken = data.csrfToken;
      csrfTokenExpiry = now + (60 * 60 * 1000); // 1 giờ
      return csrfToken;
    }
  } catch (error) {
    console.warn('Failed to get CSRF token:', error);
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
