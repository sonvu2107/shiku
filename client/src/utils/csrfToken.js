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
    console.log("Using cached CSRF token");
    return csrfToken;
  }
  
  try {
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
    console.log(`Fetching new CSRF token from ${API_URL}/api/csrf-token`);
    
    const response = await fetch(`${API_URL}/api/csrf-token`, {
      method: 'GET',
      credentials: 'include',
      mode: 'cors', // Đảm bảo CORS mode
      headers: {
        'Accept': 'application/json' // Explicit header for Safari
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      csrfToken = data.csrfToken;
      csrfTokenExpiry = now + (60 * 60 * 1000); // 1 giờ
      console.log("CSRF token obtained successfully:", csrfToken?.substring(0, 6) + "...");
      return csrfToken;
    } else {
      // Nếu response không OK, clear cache và log error
      const errorText = await response.text();
      console.error("Failed to get CSRF token. Status:", response.status, errorText);
      clearCSRFToken();
    }
  } catch (error) {
    // Log error để giúp gỡ lỗi
    console.error("Error fetching CSRF token:", error.message);
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
