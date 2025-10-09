import { api } from "../api";

/**
 * Global Role Cache
 * Cache roles để tránh fetch nhiều lần khi có nhiều VerifiedBadge trên cùng 1 trang
 */

// Cache storage
let rolesCache = null;
let cacheExpiry = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 phút

// Loading state để tránh duplicate requests
let loadingPromise = null;

/**
 * Load roles từ API và cache lại
 * @returns {Promise<Object>} Roles map object
 */
export async function loadRoles() {
  const now = Date.now();

  // Return cached data if still valid
  if (rolesCache && now < cacheExpiry) {
    return rolesCache;
  }

  // If already loading, return the existing promise
  if (loadingPromise) {
    return loadingPromise;
  }

  // Start loading
  loadingPromise = api("/api/admin/roles/public", { method: "GET" })
    .then(response => {
      if (response.success) {
        const rolesMap = {};
        response.roles.forEach(role => {
          rolesMap[role.name] = {
            iconUrl: role.iconUrl,
            displayName: role.displayName,
            description: role.description,
            color: role.color
          };
        });

        // Update cache
        rolesCache = rolesMap;
        cacheExpiry = now + CACHE_DURATION;

        return rolesMap;
      }
      return {};
    })
    .catch(error => {
      console.error("Error loading roles:", error);
      return {};
    })
    .finally(() => {
      loadingPromise = null;
    });

  return loadingPromise;
}

/**
 * Get cached roles without triggering a new request
 * @returns {Object|null} Cached roles or null
 */
export function getCachedRoles() {
  const now = Date.now();
  if (rolesCache && now < cacheExpiry) {
    return rolesCache;
  }
  return null;
}

/**
 * Get a specific role from cache
 * @param {string} roleName - Name of the role
 * @returns {Object|null} Role data or null
 */
export function getCachedRole(roleName) {
  const roles = getCachedRoles();
  return roles ? roles[roleName] : null;
}

/**
 * Invalidate cache (dùng khi có role mới được tạo/update)
 */
export function invalidateRoleCache() {
  rolesCache = null;
  cacheExpiry = 0;
  loadingPromise = null;
}

/**
 * Force refresh roles cache
 * @returns {Promise<Object>} Fresh roles map
 */
export async function refreshRoles() {
  invalidateRoleCache();
  return loadRoles();
}
