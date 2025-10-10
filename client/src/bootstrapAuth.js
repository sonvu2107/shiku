import { initializeCSRFToken } from "./utils/csrfToken.js";
import { getValidAccessToken, refreshAccessToken, getRefreshToken } from "./utils/tokenManager.js";

/**
 * Initialize CSRF token and attempt to hydrate an access token from refresh cookie.
 * Designed to run before the SPA mounts so API calls have the necessary headers.
 */
export async function bootstrapAuth() {
  try {
    const csrfInitialized = await initializeCSRFToken();

    // Attempt to get valid access token (will auto-refresh if needed)
    const accessToken = await getValidAccessToken();
    return Boolean(accessToken);
  } catch (error) {
    console.error("[bootstrapAuth] initialization warning:", error?.message || error);
    return false;
  }
}