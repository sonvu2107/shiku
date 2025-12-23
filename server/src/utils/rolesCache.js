/**
 * Global Roles Cache
 * 
 * Preload and cache all roles to eliminate Role.find() from request path.
 * Roles rarely change, so we can cache them globally with long TTL.
 */

import mongoose from 'mongoose';

// Global roles map: roleId (string) -> role object
let rolesCache = new Map();
let lastRefresh = 0;
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Get role by ID from cache
 * @param {string} roleId - Role ObjectId as string
 * @returns {Object|null} Role object or null
 */
export function getCachedRole(roleId) {
    if (!roleId) return null;
    return rolesCache.get(roleId.toString()) || null;
}

/**
 * Get multiple roles from cache
 * @param {Set|Array} roleIds - Set or array of role IDs
 * @returns {Map} Map of roleId -> role object
 */
export function getCachedRoles(roleIds) {
    const result = new Map();
    for (const id of roleIds) {
        const role = getCachedRole(id);
        if (role) result.set(id.toString(), role);
    }
    return result;
}

/**
 * Refresh roles cache from database
 * Should be called on server startup and periodically
 */
export async function refreshRolesCache() {
    try {
        const Role = mongoose.model('Role');
        const roles = await Role.find({})
            .select('name displayName iconUrl permissions color')
            .lean();

        const newCache = new Map();
        roles.forEach(r => newCache.set(r._id.toString(), r));

        rolesCache = newCache;
        lastRefresh = Date.now();

        console.log(`[ROLES_CACHE] Refreshed: ${roles.length} roles cached`);
        return true;
    } catch (error) {
        console.error('[ROLES_CACHE] Refresh failed:', error.message);
        return false;
    }
}

/**
 * Get roles cache, auto-refresh if stale
 * @returns {Map} Current roles cache
 */
export async function getRolesCache() {
    if (Date.now() - lastRefresh > REFRESH_INTERVAL) {
        await refreshRolesCache();
    }
    return rolesCache;
}

/**
 * Check if cache needs refresh
 */
export function isRolesCacheStale() {
    return Date.now() - lastRefresh > REFRESH_INTERVAL;
}

/**
 * Get cache stats
 */
export function getRolesCacheStats() {
    return {
        size: rolesCache.size,
        lastRefresh: new Date(lastRefresh).toISOString(),
        isStale: isRolesCacheStale()
    };
}
