/**
 * Guest Access Utilities
 * Helpers for handling login-gated actions
 */

/**
 * Check if user is logged in, redirect to login if not
 * @param {Object|null} user - Current user object
 * @param {Function} navigate - React Router navigate function
 * @param {string} currentPath - Current page path for redirect after login
 * @returns {boolean} - true if user is logged in, false if redirected
 */
export function requireLogin(user, navigate, currentPath = window.location.pathname) {
    if (user) return true;

    // Redirect to login with return path
    navigate(`/login?next=${encodeURIComponent(currentPath)}`);
    return false;
}

/**
 * Check if user is logged in without redirect (for UI state)
 * @param {Object|null} user - Current user object
 * @returns {boolean} - true if user is logged in
 */
export function isLoggedIn(user) {
    return !!user;
}
