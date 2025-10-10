let csrfToken = null;
let csrfTokenExpiry = 0;

/**
 * Fetch and cache a CSRF token for subsequent requests.
 * @param {boolean} forceRefresh - when true, always request a new token.
 * @returns {Promise<string|null>}
 */
export async function getCSRFToken(forceRefresh = false) {
  const now = Date.now();

  if (!forceRefresh && csrfToken && now < csrfTokenExpiry) {
    return csrfToken;
  }

  try {
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
    
    // ❌ XOÁ: Không xoá cookie trước khi gọi API
    // Server sẽ tự xoá và tạo mới
    
    const response = await fetch(`${API_URL}/api/csrf-token`, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to obtain CSRF token:", response.status, errorText);
      clearCSRFToken();
      return null;
    }

    const data = await response.json();
    if (data?.csrfToken) {
      csrfToken = data.csrfToken;
      csrfTokenExpiry = now + 60 * 60 * 1000; // 1 hour
      return csrfToken;
    }

    console.error("Response missing csrfToken field:", data);
    clearCSRFToken();
  } catch (error) {
    console.error("Error fetching CSRF token:", error);
    clearCSRFToken();
  }

  return null;
}

/**
 * Clear any cached CSRF token.
 */
export function clearCSRFToken() {
  csrfToken = null;
  csrfTokenExpiry = 0;
}

/**
 * Preload a CSRF token during application bootstrap.
 */
export async function initializeCSRFToken() {
  const token = await getCSRFToken(true);
  if (token) {
    return true;
  }
  console.error("Unable to initialize CSRF token");
  return false;
}

/**
 * Check whether the cached CSRF token is still valid.
 */
export function hasValidCSRFToken() {
  const now = Date.now();
  return Boolean(csrfToken && now < csrfTokenExpiry);
}

/**
 * Ensure that a CSRF token is available before issuing a mutating request.
 * @returns {Promise<boolean>}
 */
export async function ensureCSRFToken() {
  if (hasValidCSRFToken()) {
    return true;
  }
  const token = await getCSRFToken(true);
  return Boolean(token);
}
