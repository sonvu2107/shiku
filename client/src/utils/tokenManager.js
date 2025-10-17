
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
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      
      if (response.status === 400 || response.status === 401) {
        console.info("[tokenManager] No valid refresh token available:", errorData.code || errorData.error);
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
 * Lấy access token hợp lệ, tự động refresh nếu hết hạn
 */
export async function getValidAccessToken() {
  if (inMemoryAccessToken && !isTokenExpired(inMemoryAccessToken)) {
    return inMemoryAccessToken;
  }
  // Nếu hết hạn thì gọi refresh
  const refreshResult = await refreshAccessToken();
  if (refreshResult?.success && refreshResult.accessToken) {
    inMemoryAccessToken = refreshResult.accessToken;
  } else if (refreshResult && "accessToken" in refreshResult) {
    inMemoryAccessToken = refreshResult.accessToken;
  }
  return inMemoryAccessToken;
}
