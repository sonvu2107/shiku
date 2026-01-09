/**
 * Quản lý token: lưu access token trong RAM, refresh token trong httpOnly cookie.
 * Có thể bật chế độ cũ (legacy) lưu refresh token vào localStorage qua biến môi trường.
 */


// Import hàm lấy CSRF token
import { getCSRFToken } from "./csrfToken.js";
import { debug } from "./debug.js";


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
// Track refresh attempts to prevent infinite loops
let refreshAttempts = 0;
let lastRefreshAttempt = 0;
const MAX_REFRESH_ATTEMPTS = 3;
const REFRESH_COOLDOWN = 5000; // 5 seconds cooldown between retries

// Track initialization to prevent multiple calls
let isInitializing = false;
let initializePromise = null;

// Global flag to prevent requests when session is definitely invalid
let sessionInvalid = false;


const REFRESH_ERROR_TYPES = {
  FATAL: "fatal",
  TRANSIENT: "transient"
};

let lastRefreshErrorType = null;

export function getLastRefreshErrorType() {
  return lastRefreshErrorType;
}



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
    sessionInvalid = false; // Reset flag when getting new tokens
    lastRefreshErrorType = null;
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
  // Reset counters
  refreshAttempts = 0;
  lastRefreshAttempt = 0;
  isRefreshing = false;
  refreshPromise = null;
  isInitializing = false;
  initializePromise = null;
  sessionInvalid = true; // Mark session as invalid
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
  const now = Date.now();
  lastRefreshErrorType = null;

  // Check cooldown period
  if (now - lastRefreshAttempt < REFRESH_COOLDOWN) {
    console.warn("[tokenManager] Refresh cooldown active, skipping refresh");
    lastRefreshErrorType = REFRESH_ERROR_TYPES.TRANSIENT;
    return null;
  }

  // Check max attempts (reset after cooldown)
  if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
    if (now - lastRefreshAttempt >= REFRESH_COOLDOWN) {
      refreshAttempts = 0;
    } else {
      console.error("[tokenManager] Max refresh attempts reached, skipping refresh");
      lastRefreshErrorType = REFRESH_ERROR_TYPES.TRANSIENT;
      return null;
    }
  }

  // If already refreshing, return the existing promise
  if (isRefreshing && refreshPromise) {
    debug('tokenManager', 'Refresh already in progress, waiting...');
    return refreshPromise;
  }

  isRefreshing = true;
  lastRefreshAttempt = now;
  refreshAttempts++;

  const maxTransientRetries = 1;
  const baseBackoffMs = 500;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  refreshPromise = (async () => {
    try {
      const legacyRefreshToken = getRefreshToken();

      // In production, refresh token is in httpOnly cookies, so we can always try refresh
      // Only check legacy refresh token if in legacy mode
      if (LEGACY_REFRESH_ALLOWED && !legacyRefreshToken) {
        console.info("[tokenManager] No legacy refresh token available - user needs to login");
        lastRefreshErrorType = REFRESH_ERROR_TYPES.FATAL;
        clearTokens();
        return null;
      }

      const attemptRefresh = async (attempt) => {
        debug('tokenManager', 'Attempting to refresh access token... (attempt', refreshAttempts, 'of', MAX_REFRESH_ATTEMPTS, ')');

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

          const status = response.status;
          const isFatal = status === 400 || status === 401 || status === 403;
          const isTransient = status === 429 || status >= 500;

          if (isFatal) {
            console.info("[tokenManager] No valid refresh token available:", errorData.code || errorData.error);
            lastRefreshErrorType = REFRESH_ERROR_TYPES.FATAL;
            clearTokens();
            return null;
          }

          if (isTransient) {
            console.warn("[tokenManager] Refresh token request transient failure", status, errorData.error || errorData);
            lastRefreshErrorType = REFRESH_ERROR_TYPES.TRANSIENT;
            if (attempt < maxTransientRetries) {
              await sleep(baseBackoffMs * (attempt + 1));
              return attemptRefresh(attempt + 1);
            }
            return null;
          }

          console.error(
            "[tokenManager] Refresh token request failed",
            status,
            errorData
          );
          lastRefreshErrorType = REFRESH_ERROR_TYPES.FATAL;
          clearTokens();
          return null;
        }

        const data = await response.json();

        if (data.accessToken) {
          inMemoryAccessToken = data.accessToken;
          refreshAttempts = 0; // Reset on success
          lastRefreshErrorType = null;
          debug('tokenManager', 'Successfully refreshed access token');
          return data.accessToken;
        }

        console.warn("[tokenManager] Response missing accessToken field");
        lastRefreshErrorType = REFRESH_ERROR_TYPES.TRANSIENT;
        return null;
      };

      return await attemptRefresh(0);
    } catch (error) {
      console.error("[tokenManager] refreshAccessToken error:", error);
      lastRefreshErrorType = REFRESH_ERROR_TYPES.TRANSIENT;
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}


/**
 * Check if we have cookies available (for debugging)
 */
export async function checkCookies() {
  try {
    const response = await fetch(`${API_URL}/api/auth-status`, {
      method: "GET",
      credentials: "include"
    });

    if (response.ok) {
      const data = await response.json();
      debug('tokenManager', 'Auth status:', data);
      return data;
    }
    return null;
  } catch (error) {
    console.error("[tokenManager] Failed to check auth status:", error);
    return null;
  }
}

/**
 * Initialize access token from cookies on app startup
 * This helps restore session after page refresh
 */
export async function initializeAccessToken() {
  // Prevent multiple simultaneous initialization calls
  if (isInitializing && initializePromise) {
    debug('tokenManager', 'Initialization already in progress, waiting...');
    return initializePromise;
  }

  isInitializing = true;

  initializePromise = (async () => {
    try {
      debug('tokenManager', 'Initializing access token...');

      // First check authentication status
      const authStatus = await checkCookies();
      if (authStatus) {
        debug('tokenManager', 'Auth status:', authStatus.authenticated ? 'authenticated' : 'not authenticated');
      }

      // Try to get a valid access token (will attempt refresh if needed)
      const token = await getValidAccessToken();
      if (token) {
        debug('tokenManager', 'Successfully initialized access token from cookies');
        return token;
      }
      debug('tokenManager', 'No valid access token found in cookies');
      return null;
    } catch (error) {
      console.error("[tokenManager] Failed to initialize access token:", error);
      return null;
    } finally {
      isInitializing = false;
      // Keep the promise for a short time to allow pending calls to resolve
      setTimeout(() => {
        initializePromise = null;
      }, 1000);
    }
  })();

  return initializePromise;
}

/**
 * Lấy access token hợp lệ, tự động refresh nếu hết hạn
 * Sẽ cố gắng restore từ cookies nếu không có trong RAM
 */
export async function getValidAccessToken() {
  // If session is marked as invalid, don't try to refresh
  if (sessionInvalid) {
    debug('tokenManager', 'Session marked as invalid, user needs to login');
    return null;
  }

  // First check if we have a valid token in memory
  if (inMemoryAccessToken && !isTokenExpired(inMemoryAccessToken)) {
    return inMemoryAccessToken;
  }

  // If no token in memory or expired, try to refresh
  debug('tokenManager', 'No valid token in memory, attempting refresh...');

  // In production, refresh token is in httpOnly cookies
  // Only check legacy refresh token if in legacy mode
  if (LEGACY_REFRESH_ALLOWED) {
    const legacyRefreshToken = getRefreshToken();
    if (!legacyRefreshToken) {
      debug('tokenManager', 'No legacy refresh token available, user needs to login');
      sessionInvalid = true;
      return null;
    }
  }

  // Attempt to refresh the access token
  const refreshResult = await refreshAccessToken();
  if (refreshResult) {
    // refreshAccessToken returns the new access token directly
    inMemoryAccessToken = refreshResult;
    debug('tokenManager', 'Successfully refreshed access token');
    return refreshResult;
  }

  debug('tokenManager', 'Failed to refresh access token');
  if (lastRefreshErrorType === REFRESH_ERROR_TYPES.TRANSIENT) {
    return null;
  }
  sessionInvalid = true; // Mark as invalid after failed refresh
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
