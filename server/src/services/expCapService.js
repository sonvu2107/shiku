/**
 * Exp Cap Service - Quản lý rate limit EXP theo cửa sổ 5 phút
 * Sử dụng Redis Lua script cho atomic operations, tránh race condition
 */

import { getClient, isRedisConnected, redisConfig } from './redisClient.js';

// ============================================================
// CONSTANTS
// ============================================================

const WINDOW_SIZE_MS = 300000; // 5 phút
const isProduction = process.env.NODE_ENV === 'production';

// EXP cap theo cảnh giới (5 phút)
export const CAP_BY_REALM = {
    1: 100, 2: 300, 3: 1000, 4: 2500, 5: 5000,
    6: 10000, 7: 10000, 8: 10000, 9: 10000, 10: 10000,
    11: 10000, 12: 10000, 13: 10000, 14: 10000
};

// Passive EXP per minute theo cảnh giới (dùng cho semi-auto)
export const PASSIVE_EXP_PER_MIN = {
    1: 2, 2: 4, 3: 8, 4: 15, 5: 25,
    6: 40, 7: 60, 8: 100, 9: 150, 10: 250,
    11: 400, 12: 600, 13: 900, 14: 1500
};

// ============================================================
// LUA SCRIPT - ATOMIC CAP CONSUME
// ============================================================

/**
 * Lua script trả về [allowedExp, capRemaining]
 * 
 * KEYS[1] = expCap:{userId}:{windowStart}
 * ARGV[1] = requestedExp
 * ARGV[2] = capLimit
 * ARGV[3] = windowEndMs (windowStart + 300000)
 */
const LUA_CONSUME_CAP = `
local current = tonumber(redis.call('GET', KEYS[1]) or '0')
local requested = tonumber(ARGV[1])
local cap = tonumber(ARGV[2])
local windowEnd = tonumber(ARGV[3])

local remaining = cap - current
if remaining <= 0 then
  return {0, 0}
end

local allowed = math.min(requested, remaining)
local newTotal = current + allowed

-- Tính TTL: (windowEnd - now) + 60s buffer, min 60s
local t = redis.call('TIME')
local now = tonumber(t[1]) * 1000 + math.floor(tonumber(t[2]) / 1000)
local ttl = math.max(60, math.floor((windowEnd - now) / 1000) + 60)

-- SET với EX atomic
redis.call('SET', KEYS[1], newTotal, 'EX', ttl)

return {allowed, remaining - allowed}
`;

// Flag để track nếu đã define command
let commandDefined = false;

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Lấy window key và thời điểm kết thúc window
 */
export function getWindowInfo(userId) {
    const now = Date.now();
    const windowStart = Math.floor(now / WINDOW_SIZE_MS) * WINDOW_SIZE_MS;
    const windowEnd = windowStart + WINDOW_SIZE_MS;
    const key = `expCap:${userId}:${windowStart}`;
    return { key, windowStart, windowEnd, now };
}

/**
 * Lấy cap limit theo realm, có fallback
 */
export function getCapByRealm(realm) {
    const clampedRealm = Math.max(1, Math.min(14, realm || 1));
    return CAP_BY_REALM[clampedRealm] ?? CAP_BY_REALM[14];
}

/**
 * Lấy passive EXP per minute theo realm, có fallback
 */
export function getPassiveExpPerMin(realm) {
    const clampedRealm = Math.max(1, Math.min(14, realm || 1));
    return PASSIVE_EXP_PER_MIN[clampedRealm] ?? PASSIVE_EXP_PER_MIN[14];
}

// ============================================================
// MAIN SERVICE FUNCTIONS
// ============================================================

/**
 * Define custom command cho Redis (chỉ gọi 1 lần)
 */
function ensureCommandDefined(redis) {
    if (!commandDefined && redis.defineCommand) {
        try {
            redis.defineCommand('consumeExpCap', {
                numberOfKeys: 1,
                lua: LUA_CONSUME_CAP,
            });
            commandDefined = true;
        } catch (e) {
            // Command có thể đã được define ở instance khác
            commandDefined = true;
        }
    }
}

/**
 * Tiêu thụ EXP từ cap atomically
 * 
 * @param {string} userId - User ID
 * @param {number} requestedExp - EXP muốn tiêu thụ (đã tính multiplier)
 * @param {number} capLimit - Cap tối đa cho realm này
 * @returns {Promise<{allowedExp: number, capRemaining: number}>}
 */
export async function consumeExpCap(userId, requestedExp, capLimit) {
    // Validate và clamp inputs
    const safeRequested = Math.max(0, Math.floor(requestedExp || 0));
    const safeCap = Math.max(0, Math.floor(capLimit || 100));

    const redis = getClient();

    // Fallback khi không có Redis
    if (!redis || !isRedisConnected()) {
        if (isProduction) {
            // Production: fail safe - không cho consume
            console.error('[ExpCapService] Redis unavailable in production');
            throw new Error('Hệ thống đang bảo trì, vui lòng thử lại sau');
        }
        // Dev: cho phép nhưng vẫn giới hạn theo cap
        const allowed = Math.min(safeRequested, safeCap);
        return {
            allowedExp: allowed,
            capRemaining: Math.max(0, safeCap - allowed)
        };
    }

    const { key, windowEnd } = getWindowInfo(userId);
    const fullKey = redisConfig.keyPrefix + key;

    // Ensure command defined
    ensureCommandDefined(redis);

    try {
        let result;
        if (redis.consumeExpCap) {
            // Dùng defined command (EVALSHA - cached)
            result = await redis.consumeExpCap(fullKey, safeRequested, safeCap, windowEnd);
        } else {
            // Fallback eval trực tiếp
            result = await redis.eval(
                LUA_CONSUME_CAP,
                1,
                fullKey,
                safeRequested,
                safeCap,
                windowEnd
            );
        }

        return {
            allowedExp: Number(result[0] || 0),
            capRemaining: Number(result[1] || 0)
        };
    } catch (error) {
        console.error('[ExpCapService] Consume error:', error.message);
        if (isProduction) {
            throw new Error('Lỗi hệ thống, vui lòng thử lại');
        }
        // Dev fallback
        return { allowedExp: 0, capRemaining: safeCap };
    }
}

/**
 * Lấy cap còn lại (DISPLAY-ONLY, không dùng cho quyết định)
 * 
 * @param {string} userId - User ID
 * @param {number} capLimit - Cap tối đa cho realm này
 * @returns {Promise<number>} - Cap còn lại
 */
export async function getExpCapRemaining(userId, capLimit) {
    const safeCap = Math.max(0, Math.floor(capLimit || 100));

    const redis = getClient();
    if (!redis || !isRedisConnected()) {
        return safeCap; // Không có Redis thì coi như full cap
    }

    const { key } = getWindowInfo(userId);
    const fullKey = redisConfig.keyPrefix + key;

    try {
        const used = Number(await redis.get(fullKey) || 0);
        return Math.max(0, safeCap - used);
    } catch (error) {
        console.error('[ExpCapService] GetRemaining error:', error.message);
        return safeCap;
    }
}

/**
 * Kiểm tra cooldown click (throttle)
 * 
 * @param {string} userId - User ID
 * @param {number} cooldownMs - Cooldown time in ms
 * @returns {Promise<{allowed: boolean, waitMs: number}>}
 */
export async function checkClickCooldown(userId, cooldownMs = 200) {
    const redis = getClient();
    const now = Date.now();

    if (!redis || !isRedisConnected()) {
        // Không có Redis thì cho qua (chỉ dev)
        return { allowed: true, waitMs: 0 };
    }

    const key = redisConfig.keyPrefix + `lastClick:${userId}`;

    try {
        const lastClick = Number(await redis.get(key) || 0);
        const elapsed = now - lastClick;

        if (elapsed < cooldownMs) {
            return {
                allowed: false,
                waitMs: cooldownMs - elapsed
            };
        }

        // Set new timestamp với TTL 10s
        await redis.set(key, now.toString(), 'EX', 10);
        return { allowed: true, waitMs: 0 };
    } catch (error) {
        console.error('[ExpCapService] Cooldown check error:', error.message);
        return { allowed: true, waitMs: 0 };
    }
}

export default {
    consumeExpCap,
    getExpCapRemaining,
    checkClickCooldown,
    getCapByRealm,
    getPassiveExpPerMin,
    getWindowInfo,
    CAP_BY_REALM,
    PASSIVE_EXP_PER_MIN
};
