import { initializeCSRFToken } from "./utils/csrfToken.js";
import { getValidAccessToken, refreshAccessToken } from "./utils/tokenManager.js";

const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof process !== "undefined" ? process.env?.VITE_API_URL : undefined) ||
  (import.meta.env.DEV ? "" : "http://localhost:4000");

/**
 * Initialize CSRF token and attempt to hydrate an access token from refresh cookie.
 * Designed to run before the SPA mounts so API calls have the necessary headers.
 */
export async function bootstrapAuth() {
  try {
    const csrfInitialized = await initializeCSRFToken();
    if (!csrfInitialized) {
      return false;
    }

    // Always try refresh - if no cookie exists, server will return 401 gracefully
    const refreshResult = await refreshAccessToken();
    const accessToken = await getValidAccessToken();

    try {
      const headers = {
        Accept: "application/json"
      };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const sessionRes = await fetch(`${API_URL}/api/auth/session`, {
        method: "GET",
        credentials: "include",
        headers
      });

      if (!sessionRes.ok) {
        return false;
      }

      const session = await sessionRes.json();
      return Boolean(session?.authenticated);
    } catch (sessionError) {
      return false;
    }
  } catch (error) {
    return false;
  }
}
