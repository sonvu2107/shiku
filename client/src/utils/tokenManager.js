/**
 * Token Manager - Keeps access tokens in-memory and refresh tokens in httpOnly cookies.
 * Legacy localStorage fallback is controlled by VITE_ALLOW_LEGACY_LOCALSTORAGE_REFRESH (default: false).
 */

import { getCSRFToken } from "./csrfToken.js";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

const env =
  (typeof import.meta !== "undefined" && import.meta.env) ||
  (typeof process !== "undefined" ? process.env : {}) ||
  {};

const API_URL =
  env.VITE_API_URL ||
  (typeof process !== "undefined" ? process.env?.VITE_API_URL : undefined) ||
  "http://localhost:4000";
const LEGACY_REFRESH_ALLOWED =
  (env.VITE_ALLOW_LEGACY_LOCALSTORAGE_REFRESH ??
    (typeof process !== "undefined"
      ? process.env?.VITE_ALLOW_LEGACY_LOCALSTORAGE_REFRESH
      : undefined)) === "true";

let inMemoryAccessToken = null;

const hasWindow = typeof window !== "undefined" && typeof window.localStorage !== "undefined";
const safeStorage = hasWindow
  ? window.localStorage
  : {
    getItem: () => null,
    setItem: () => { },
    removeItem: () => { }
  };

/**
 * Persist access token in-memory. Optionally stores refresh token for legacy rollout.
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
 * Retrieve the in-memory access token.
 */
export function getAccessToken() {
  return inMemoryAccessToken;
}

/**
 * Retrieve refresh token only when legacy mode is explicitly enabled.
 */
export function getRefreshToken() {
  if (!LEGACY_REFRESH_ALLOWED) {
    return null;
  }
  return safeStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Clear tokens from memory (and legacy storage).
 */
export function clearTokens() {
  inMemoryAccessToken = null;
  safeStorage.removeItem(ACCESS_TOKEN_KEY); // cleanup legacy storage

  if (LEGACY_REFRESH_ALLOWED) {
    safeStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

/**
 * Determine whether a JWT is expired.
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
 * Request a new access token using the httpOnly refresh token cookie.
 * Legacy mode sends the refresh token in the body for older clients.
 */
export async function refreshAccessToken() {
  const legacyRefreshToken = getRefreshToken();

  try {
    // Use cached CSRF token if still valid
    const csrfToken = await getCSRFToken(false);

    if (!csrfToken) {
      console.warn("[tokenManager] Unable to obtain CSRF token before refresh");
    }

    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-CSRF-Token": csrfToken || "" 
      },
      body: JSON.stringify(
        LEGACY_REFRESH_ALLOWED && legacyRefreshToken
          ? { refreshToken: legacyRefreshToken }
          : {}
      )
    });


    if (!response.ok) {
      const errorText = await response.text().catch(() => "<no body>");
      
      // If 400/401 (no refresh token or expired), log as info instead of error
      if (response.status === 400 || response.status === 401) {
        console.info("[tokenManager] No valid refresh token available");
      } else {
        console.error(
          "[tokenManager] Refresh token request failed",
          response.status,
          errorText
        );
      }
      
      clearTokens();
      throw new Error("Refresh token request failed");
    }

    const data = await response.json();

    if (data.accessToken) {
      inMemoryAccessToken = data.accessToken;
    } else {
      console.warn("[tokenManager] Response missing accessToken field");
    }

    return data.accessToken || null;
  } catch (error) {
    console.error("[tokenManager] refreshAccessToken error:", error);
    clearTokens();
    return null;
  }
}

/**
 * Obtain a valid access token, refreshing when necessary.
 */
export async function getValidAccessToken() {
  // ✅ Nếu có access token hợp lệ trong memory, dùng luôn
  if (inMemoryAccessToken && !isTokenExpired(inMemoryAccessToken)) {
    return inMemoryAccessToken;
  }

  // ✅ Nếu không có, kiểm tra xem có refresh token không
  const legacyRefreshToken = getRefreshToken();
  
  // ✅ CHỈ gọi refresh nếu có refresh token (legacy hoặc cookie sẽ được gửi tự động)
  // Nếu không có legacy token, vẫn thử gọi refresh vì có thể có httpOnly cookie
  // Nhưng phải xử lý lỗi 400 gracefully
  try {
    inMemoryAccessToken = await refreshAccessToken();
    return inMemoryAccessToken;
  } catch (error) {
    // ✅ Nếu refresh fail (user chưa login), trả null thay vì throw
    console.log("[tokenManager] No valid token available, user needs to login");
    return null;
  }
}
