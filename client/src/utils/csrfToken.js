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
    
    // Safari-specific headers and configuration
    const response = await fetch(`${API_URL}/api/csrf-token`, {
      method: 'GET',
      credentials: 'include',
      mode: 'cors',
      cache: 'no-cache', // Safari cache issue fix
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest' // Safari compatibility
      }
    });
    
    console.log("CSRF token response status:", response.status);
    console.log("CSRF token response headers:", Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log("CSRF token response data:", data);
      
      if (data.csrfToken) {
        csrfToken = data.csrfToken;
        csrfTokenExpiry = now + (60 * 60 * 1000); // 1 giờ
        console.log("CSRF token obtained successfully:", csrfToken?.substring(0, 6) + "...");
        return csrfToken;
      } else {
        console.error("No CSRF token in response:", data);
        clearCSRFToken();
      }
    } else {
      // Nếu response không OK, clear cache và log error
      const errorText = await response.text();
      console.error("Failed to get CSRF token. Status:", response.status, errorText);
      clearCSRFToken();
    }
  } catch (error) {
    // Log error để giúp gỡ lỗi
    console.error("Error fetching CSRF token:", error.message);
    console.error("Error details:", error);
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

/**
 * Initialize CSRF token for Safari compatibility
 * This function should be called when the app loads
 */
export async function initializeCSRFToken() {
  console.log("Initializing CSRF token for Safari compatibility...");
  
  // Force refresh to get a new token
  const token = await getCSRFToken(true);
  
  if (token) {
    console.log("CSRF token initialized successfully");
    return true;
  } else {
    console.error("Failed to initialize CSRF token");
    return false;
  }
}

/**
 * Check if CSRF token is available and valid
 */
export function hasValidCSRFToken() {
  const now = Date.now();
  return csrfToken && now < csrfTokenExpiry;
}

/**
 * Safari-specific CSRF token debugging
 * This function helps debug CSRF token issues in Safari
 */
export async function debugCSRFToken() {
  console.log("=== CSRF Token Debug Info ===");
  console.log("Current token:", csrfToken ? csrfToken.substring(0, 6) + "..." : "None");
  console.log("Token expiry:", new Date(csrfTokenExpiry).toISOString());
  console.log("Is valid:", hasValidCSRFToken());
  
  try {
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
    const response = await fetch(`${API_URL}/api/csrf-status`, {
      credentials: 'include',
      mode: 'cors',
      cache: 'no-cache'
    });
    
    if (response.ok) {
      const status = await response.json();
      console.log("Server CSRF status:", status);
    } else {
      console.error("Failed to get CSRF status:", response.status);
    }
  } catch (error) {
    console.error("Error checking CSRF status:", error);
  }
  
  console.log("=== End CSRF Debug ===");
}

/**
 * Ensure CSRF token is available for Safari compatibility
 * This function should be called before any POST/PUT/DELETE request
 * @returns {Promise<boolean>} True if token is available, false otherwise
 */
export async function ensureCSRFToken() {
  if (hasValidCSRFToken()) {
    return true;
  }
  
  console.log("CSRF token not available, attempting to fetch...");
  const token = await getCSRFToken(true); // Force refresh
  return !!token;
}

/**
 * Safari-specific error handler for CSRF token issues
 * Provides user-friendly error messages and debugging info
 */
export function handleSafariCSRFError(error, action = "thực hiện hành động") {
  console.error("Safari CSRF Error:", error);
  
  if (error.message.includes('CSRF') || error.message.includes('csrf')) {
    console.warn("Safari CSRF token issue detected");
    
    // Show user-friendly message
    const message = `Không thể ${action} do vấn đề bảo mật. Vui lòng thử lại sau vài giây.`;
    
    // Try to refresh CSRF token in background
    setTimeout(async () => {
      try {
        await getCSRFToken(true);
        console.log("CSRF token refreshed in background");
      } catch (e) {
        console.error("Failed to refresh CSRF token:", e);
      }
    }, 1000);
    
    return message;
  }
  
  return error.message;
}
