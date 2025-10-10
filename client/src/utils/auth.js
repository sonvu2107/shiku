import { saveTokens, getAccessToken, clearTokens } from "./tokenManager.js";

/**
 * Backwards-compatible auth helpers that now use the in-memory token manager.
 */

export function setAuthToken(token) {
  if (token) {
    saveTokens(token);
  }
}

export function getAuthToken() {
  return getAccessToken();
}

export function removeAuthToken() {
  clearTokens();
}

export function getUserInfo() {
  try {
    const token = getAccessToken();
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload;
  } catch (error) {
    return null;
  }
}
