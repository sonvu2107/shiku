/**
 * Quản lý token: lưu access token trong RAM, refresh token trong httpOnly cookie.
 * Có thể bật chế độ cũ (legacy) lưu refresh token vào localStorage qua biến môi trường.
 */


// Import hàm lấy CSRF token
import { getCSRFToken } from "./csrfToken.js";


// Key dùng cho localStorage (chế độ legacy)
const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";


// Đọc biến môi trường (tương thích cả Vite và Node)
const env =
  (typeof import.meta !== "undefined" && import.meta.env) ||
  (typeof process !== "undefined" ? process.env : {}) ||
  {};

// URL API backend - sử dụng proxy trong dev, absolute URL trong production
const API_URL =
  env.VITE_API_URL ||
  (typeof process !== "undefined" ? process.env?.VITE_API_URL : undefined) ||
  (import.meta.env.DEV ? "" : "http://localhost:4000");
// Có cho phép dùng refresh token localStorage không (chế độ cũ)
const LEGACY_REFRESH_ALLOWED =
  (env.VITE_ALLOW_LEGACY_LOCALSTORAGE_REFRESH ??
    (typeof process !== "undefined"
      ? process.env?.VITE_ALLOW_LEGACY_LOCALSTORAGE_REFRESH
      : undefined)) === "true";


// Biến lưu access token trong RAM
let inMemoryAccessToken = null;
// Đánh dấu đang refresh token (chống gọi trùng)
let isRefreshing = false;
// Lưu promise refresh đang chạy
let refreshPromise = null;


// Đảm bảo code chạy được cả môi trường browser và server
const hasWindow = typeof window !== "undefined" && typeof window.localStorage !== "undefined";
const safeStorage = hasWindow
  ? window.localStorage
  : {
    getItem: () => null,
    setItem: () => { },
    removeItem: () => { }
  };


/**
 * Lưu access token vào RAM, refresh token vào localStorage nếu bật legacy
 */
export function saveTokens(accessToken, refreshToken) {
  if (accessToken) {
    inMemoryAccessToken = accessToken;
  }
  if (LEGACY_REFRESH_ALLOWED && refreshToken) {
    safeStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}


/**
 * Lấy access token đang lưu trong RAM
 */
export function getAccessToken() {
  return inMemoryAccessToken;
}


/**
 * Lấy refresh token từ localStorage (chỉ khi bật legacy)
 */
export function getRefreshToken() {
  if (!LEGACY_REFRESH_ALLOWED) {
    return null;
  }
  return safeStorage.getItem(REFRESH_TOKEN_KEY);
}


/**
 * Xoá access token khỏi RAM và refresh token khỏi localStorage (nếu có)
 */
export function clearTokens() {
  inMemoryAccessToken = null;
  safeStorage.removeItem(ACCESS_TOKEN_KEY); // dọn dẹp storage cũ
  if (LEGACY_REFRESH_ALLOWED) {
    safeStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}


/**
 * Kiểm tra JWT đã hết hạn chưa
 */
export function isTokenExpired(token) {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch (error) {
    return true;
  }
}


/**
 * Gọi API lấy access token mới bằng refresh token (cookie hoặc body nếu legacy)
 * Chặn gọi trùng bằng promise
 */
export async function refreshAccessToken() {
  const legacyRefreshToken = getRefreshToken();

  // In production, refresh token is in httpOnly cookies, so we can always try refresh
  // Only check legacy refresh token if in legacy mode
  if (LEGACY_REFRESH_ALLOWED && !legacyRefreshToken) {
    console.info("[tokenManager] No legacy refresh token available - user needs to login");
    clearTokens();
    return null;
  }

  try {
    console.log("[tokenManager] Attempting to refresh access token...");
    
    // No CSRF token needed for refresh endpoint - it's excluded from CSRF protection
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include", // This will send httpOnly cookies
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
        // Note: No CSRF token for refresh endpoint - it's excluded from CSRF protection
      },
      body: JSON.stringify(
        LEGACY_REFRESH_ALLOWED && legacyRefreshToken
          ? { refreshToken: legacyRefreshToken }
          : {} // Empty body for cookie-based refresh
      )
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "<no body>");
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      
      if (response.status === 400 || response.status === 401) {
        console.info("[tokenManager] No valid refresh token available:", errorData.code || errorData.error);
      } else if (response.status === 429) {
        console.warn("[tokenManager] Rate limited:", errorData.error);
        // Don't clear tokens on rate limit, just return null
        return null;
      } else {
        console.error(
          "[tokenManager] Refresh token request failed",
          response.status,
          errorData
        );
      }
      clearTokens();
      throw new Error("Refresh token request failed");
    }

    const data = await response.json();

    if (data.accessToken) {
      inMemoryAccessToken = data.accessToken;
      console.log("[tokenManager] Successfully refreshed access token");
      return data.accessToken;
    } else {
      console.warn("[tokenManager] Response missing accessToken field");
      return null;
    }
  } catch (error) {
    console.error("[tokenManager] refreshAccessToken error:", error);
    clearTokens();
    return null;
  }
}


/**
 * Check if we have cookies available (for debugging)
 */
export async function checkCookies() {
  try {
    const response = await fetch(`${API_URL}/api/test-session-persistence`, {
      method: "GET",
      credentials: "include"
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log("[tokenManager] Cookie check:", data);
      return data;
    }
    return null;
  } catch (error) {
    console.error("[tokenManager] Failed to check cookies:", error);
    return null;
  }
}

/**
 * Initialize access token from cookies on app startup
 * This helps restore session after page refresh
 */
export async function initializeAccessToken() {
  try {
    console.log("[tokenManager] Initializing access token...");
    
    // First check what cookies we have
    const cookieInfo = await checkCookies();
    if (cookieInfo) {
      console.log("[tokenManager] Cookie status:", cookieInfo.cookies);
    }
    
    // Try to get a valid access token (will attempt refresh if needed)
    const token = await getValidAccessToken();
    if (token) {
      console.log("[tokenManager] Successfully initialized access token from cookies");
      return token;
    }
    console.log("[tokenManager] No valid access token found in cookies");
    return null;
  } catch (error) {
    console.error("[tokenManager] Failed to initialize access token:", error);
    return null;
  }
}

/**
 * Lấy access token hợp lệ, tự động refresh nếu hết hạn
 * Sẽ cố gắng restore từ cookies nếu không có trong RAM
 */
export async function getValidAccessToken() {
  // First check if we have a valid token in memory
  if (inMemoryAccessToken && !isTokenExpired(inMemoryAccessToken)) {
    return inMemoryAccessToken;
  }
  
  // If no token in memory or expired, try to refresh
  console.log("[tokenManager] No valid token in memory, attempting refresh...");
  
  // In production, refresh token is in httpOnly cookies
  // Only check legacy refresh token if in legacy mode
  if (LEGACY_REFRESH_ALLOWED) {
    const legacyRefreshToken = getRefreshToken();
    if (!legacyRefreshToken) {
      console.log("[tokenManager] No legacy refresh token available, user needs to login");
      return null;
    }
  }
  
  // Attempt to refresh the access token
  const refreshResult = await refreshAccessToken();
  if (refreshResult) {
    // refreshAccessToken returns the new access token directly
    inMemoryAccessToken = refreshResult;
    console.log("[tokenManager] Successfully refreshed access token");
    return refreshResult;
  }
  
  console.log("[tokenManager] Failed to refresh access token");
  return null;
}

/**
 * Lấy thông tin user từ access token hiện tại
 */
export function getUser() {
  if (!inMemoryAccessToken) return null;
  try {
    const payload = JSON.parse(atob(inMemoryAccessToken.split(".")[1]));
    return payload;
  } catch (error) {
    return null;
  }
}
