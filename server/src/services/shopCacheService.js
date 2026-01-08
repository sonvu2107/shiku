/**
 * Shop Cache Invalidation Helper
 * Centralized utility for clearing shop cache when equipment data changes
 */

import { getClient, isRedisConnected } from './redisClient.js';

// Shop cache key
const SHOP_CACHE_KEY = 'shop:equipment:v1';

/**
 * Invalidate shop cache (call when admin modifies equipment)
 * Safe to call even if Redis is not connected
 */
export async function invalidateShopCache() {
    const redis = getClient();
    if (redis && isRedisConnected()) {
        try {
            await redis.del(SHOP_CACHE_KEY);
            console.log('[SHOP CACHE] Invalidated successfully');
            return true;
        } catch (error) {
            console.error('[SHOP CACHE] Failed to invalid ate:', error.message);
            return false;
        }
    }
    return false;
}

/**
 * Get shop cache key (for consistency)
 */
export function getShopCacheKey() {
    return SHOP_CACHE_KEY;
}
