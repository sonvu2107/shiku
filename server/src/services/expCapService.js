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
// REBALANCED: Nerf click từ Kim Đan trở lên để dungeon/tower là main progression
// Early game (1-3): giữ nguyên
// Mid game (4-5): giảm 40%
// Late game (6-10): giảm 70-75%
// End game (11-14): cap cứng 33-42k/5phút
export const CAP_BY_REALM = {
    1: 1000,   // 12k/h - Phàm Nhân (giữ nguyên)
    2: 3000,   // 36k/h - Luyện Khí (giữ nguyên)
    3: 10000,  // 120k/h - Trúc Cơ (giữ nguyên)
    4: 15000,  // 180k/h - Kim Đan (giảm từ 300k)
    5: 21000,  // 252k/h - Nguyên Anh (giảm từ 600k)
    6: 25000,  // 300k/h - Hóa Thần
    7: 28000,  // 336k/h - Luyện Hư
    8: 30000,  // 360k/h - Hợp Thể
    9: 32000,  // 384k/h - Đại Thừa
    10: 35000, // 420k/h - Chân Tiên
    11: 37000, // 444k/h - Kim Tiên
    12: 40000, // 480k/h - Tiên Vương
    13: 42000, // 504k/h - Tiên Đế
    14: 42000  // 504k/h - Thiên Đạo (cap cứng)
};

// Passive EXP per minute theo cảnh giới (dùng cho semi-auto)
export const PASSIVE_EXP_PER_MIN = {
    1: 2, 2: 4, 3: 8, 4: 15, 5: 25,
    6: 40, 7: 60, 8: 100, 9: 150, 10: 250,
    11: 400, 12: 600, 13: 900, 14: 1500
};

// ============================================================
// SOFT DIMINISHING RETURN - Linh khí vẩn đục theo thời gian
// ============================================================

// Thời gian click tích lũy trong ngày (ms)
const DIMINISH_THRESHOLDS = [
    { time: 2 * 60 * 60 * 1000, multiplier: 1.0, lore: null },                                    // 0-2h: 100%
    { time: 4 * 60 * 60 * 1000, multiplier: 0.7, lore: 'Linh khí dần trở nên loãng...' },        // 2-4h: 70%
    { time: Infinity, multiplier: 0.4, lore: 'Linh khí trong ngày đã vẩn đục.' }       // 4h+: 40%
];

// Lore messages khi chuyển tầng diminish
export const DIMINISH_LORE = {
    FRESH: null,
    MODERATE: 'Linh khí dần trở nên loãng...',
    DEPLETED: 'Linh khí trong ngày đã vẩn đục.'
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

/**
 * Lấy dayKey theo timezone Asia/Bangkok (VN/SEA)
 * Reset vào 00:00 giờ Việt Nam, không phải UTC
 * @returns {string} 'YYYY-MM-DD' format
 */
export function getDayKeyInBangkok() {
    // en-CA format gives YYYY-MM-DD
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
}

/**
 * Lấy key cho daily click time tracking (reset mỗi ngày theo giờ VN)
 */
function getDailyClickKey(userId) {
    const today = getDayKeyInBangkok();
    return `dailyClick:${userId}:${today}`;
}

/**
 * Tính diminishing multiplier và lore dựa trên thời gian click tích lũy
 */
function calculateDiminish(accumulatedMs) {
    for (const tier of DIMINISH_THRESHOLDS) {
        if (accumulatedMs < tier.time) {
            return { multiplier: tier.multiplier, lore: tier.lore };
        }
    }
    // Fallback
    return { multiplier: 0.4, lore: DIMINISH_LORE.DEPLETED };
}

/**
 * PEEK daily click time (không thay đổi giá trị)
 * Dùng để tính multiplier trước khi consume cap
 */
export async function peekDailyClickMs(userId) {
    const redis = getClient();

    if (!redis || !isRedisConnected()) {
        return 0;
    }

    const key = redisConfig.keyPrefix + getDailyClickKey(userId);

    try {
        const v = await redis.get(key);
        return Number(v || 0);
    } catch (error) {
        console.error('[ExpCapService] Peek daily click error:', error.message);
        return 0;
    }
}

/**
 * Track thời gian click trong ngày (chỉ gọi sau khi confirm allowed > 0)
 * @param {string} userId
 * @param {number} addMs - thời gian thêm vào (mặc định 5s)
 * @returns {Promise<{accumulatedMs: number}>}
 */
export async function trackDailyClickTime(userId, addMs = 5000) {
    const redis = getClient();

    if (!redis || !isRedisConnected()) {
        return { accumulatedMs: 0 };
    }

    const key = redisConfig.keyPrefix + getDailyClickKey(userId);

    try {
        // INCRBY atomic, TTL 26 giờ để cover timezone edge cases
        const newTotal = await redis.incrby(key, addMs);
        await redis.expire(key, 93600); // 26 hours
        return { accumulatedMs: newTotal };
    } catch (error) {
        console.error('[ExpCapService] Track daily click error:', error.message);
        return { accumulatedMs: 0 };
    }
}

/**
 * Lấy trạng thái diminish hiện tại (display-only)
 */
export async function getDiminishStatus(userId) {
    const redis = getClient();

    if (!redis || !isRedisConnected()) {
        return { accumulatedMs: 0, multiplier: 1.0, lore: null, hoursActive: 0 };
    }

    const key = redisConfig.keyPrefix + getDailyClickKey(userId);

    try {
        const accumulatedMs = Number(await redis.get(key) || 0);
        const { multiplier, lore } = calculateDiminish(accumulatedMs);
        const hoursActive = Math.floor(accumulatedMs / 3600000 * 10) / 10; // 1 decimal

        return { accumulatedMs, multiplier, lore, hoursActive };
    } catch (error) {
        console.error('[ExpCapService] Get diminish status error:', error.message);
        return { accumulatedMs: 0, multiplier: 1.0, lore: null, hoursActive: 0 };
    }
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
 * FLOW ĐÚNG: peek diminish → tính effective amount → consume cap → track time chỉ khi allowed > 0
 * 
 * @param {string} userId - User ID
 * @param {number} requestedExp - EXP muốn tiêu thụ (chưa tính diminish)
 * @param {number} capLimit - Cap tối đa cho realm này
 * @returns {Promise<{allowedExp: number, capRemaining: number, diminishMultiplier: number, diminishLore: string|null}>}
 */
export async function consumeExpCap(userId, requestedExp, capLimit) {
    // Validate inputs
    const safeRequested = Math.max(0, Math.floor(requestedExp || 0));
    // Default to realm 1 cap, not 100 (avoid silent nerf bug)
    const safeCap = Number.isFinite(capLimit) ? Math.max(0, Math.floor(capLimit)) : CAP_BY_REALM[1];

    const redis = getClient();

    // Fallback khi không có Redis
    if (!redis || !isRedisConnected()) {
        if (isProduction) {
            console.error('[ExpCapService] Redis unavailable in production');
            throw new Error('Hệ thống đang bảo trì, vui lòng thử lại sau');
        }
        // Dev: cho phép nhưng vẫn giới hạn theo cap
        const allowed = Math.min(safeRequested, safeCap);
        return {
            allowedExp: allowed,
            capRemaining: Math.max(0, safeCap - allowed),
            diminishMultiplier: 1.0,
            diminishLore: null
        };
    }

    // STEP 1: PEEK daily click time (không tăng)
    const accumulatedMs = await peekDailyClickMs(userId);
    const { multiplier, lore } = calculateDiminish(accumulatedMs);

    // STEP 2: Tính effective requested EXP sau diminish
    // Clamp tối thiểu 1 khi safeRequested > 0 để tránh "click rỗng" do làm tròn
    const effectiveRequested = safeRequested > 0
        ? Math.max(1, Math.floor(safeRequested * multiplier))
        : 0;

    // STEP 3: Consume cap với effective amount
    const { key, windowEnd } = getWindowInfo(userId);
    const fullKey = redisConfig.keyPrefix + key;

    ensureCommandDefined(redis);

    try {
        let result;
        if (redis.consumeExpCap) {
            result = await redis.consumeExpCap(fullKey, effectiveRequested, safeCap, windowEnd);
        } else {
            result = await redis.eval(
                LUA_CONSUME_CAP,
                1,
                fullKey,
                effectiveRequested,
                safeCap,
                windowEnd
            );
        }

        const allowedExp = Number(result[0] || 0);
        const capRemaining = Number(result[1] || 0);

        // STEP 4: Track time CHỈ KHI allowed > 0 (Option A - UX friendly)
        // Không phạt user spam khi đã hết cap
        if (allowedExp > 0) {
            await trackDailyClickTime(userId, 5000); // 5s per successful click
        }

        return {
            allowedExp,
            capRemaining,
            diminishMultiplier: multiplier,
            diminishLore: lore
        };
    } catch (error) {
        console.error('[ExpCapService] Consume error:', error.message);
        if (isProduction) {
            throw new Error('Lỗi hệ thống, vui lòng thử lại');
        }
        return { allowedExp: 0, capRemaining: safeCap, diminishMultiplier: 1.0, diminishLore: null };
    }
}

/**
 * Lấy cap còn lại (DISPLAY-ONLY) - bao gồm cả effective remaining sau diminish
 * 
 * @param {string} userId - User ID
 * @param {number} capLimit - Cap tối đa cho realm này
 * @returns {Promise<{capRemaining: number, effectiveRemaining: number, diminishMultiplier: number, diminishLore: string|null}>}
 */
export async function getExpCapRemaining(userId, capLimit) {
    // Đồng bộ với consumeExpCap: default realm 1 cap, không phải 100
    const safeCap = Number.isFinite(capLimit) ? Math.max(0, Math.floor(capLimit)) : CAP_BY_REALM[1];

    const redis = getClient();
    if (!redis || !isRedisConnected()) {
        return {
            capRemaining: safeCap,
            effectiveRemaining: safeCap,
            diminishMultiplier: 1.0,
            diminishLore: null
        };
    }

    const { key } = getWindowInfo(userId);
    const fullKey = redisConfig.keyPrefix + key;

    try {
        const used = Number(await redis.get(fullKey) || 0);
        const capRemaining = Math.max(0, safeCap - used);

        // Get diminish status
        const accumulatedMs = await peekDailyClickMs(userId);
        const { multiplier, lore } = calculateDiminish(accumulatedMs);

        // NOTE: capRemaining đã là đơn vị effective EXP (vì consume cap bằng effectiveRequested)
        // Không nhân thêm multiplier nữa để tránh double-diminish
        return {
            capRemaining,
            effectiveRemaining: capRemaining, // same as capRemaining, kept for API compat
            diminishMultiplier: multiplier,
            diminishLore: lore
        };
    } catch (error) {
        console.error('[ExpCapService] GetRemaining error:', error.message);
        return {
            capRemaining: safeCap,
            effectiveRemaining: safeCap,
            diminishMultiplier: 1.0,
            diminishLore: null
        };
    }
}

/**
 * Kiểm tra cooldown click (throttle) - ATOMIC với SET NX PX
 * Không có race window - 1 lệnh duy nhất
 * 
 * @param {string} userId - User ID
 * @param {number} cooldownMs - Cooldown time in ms
 * @returns {Promise<{allowed: boolean, waitMs: number}>}
 */
export async function checkClickCooldown(userId, cooldownMs = 200) {
    const redis = getClient();

    if (!redis || !isRedisConnected()) {
        // Không có Redis thì cho qua (chỉ dev)
        return { allowed: true, waitMs: 0 };
    }

    const key = redisConfig.keyPrefix + `clickLock:${userId}`;

    try {
        // SET NX PX: atomic lock, chỉ set nếu key không tồn tại
        // Trả về 'OK' nếu set thành công, null nếu key đã tồn tại
        const ok = await redis.set(key, '1', 'PX', cooldownMs, 'NX');

        if (ok !== 'OK') {
            // Key đã tồn tại = đang trong cooldown
            const ttl = await redis.pttl(key);
            return { allowed: false, waitMs: Math.max(0, ttl) };
        }

        return { allowed: true, waitMs: 0 };
    } catch (error) {
        console.error('[ExpCapService] Cooldown check error:', error.message);
        // Fail open trong dev, fail closed trong prod với backoff hợp lý
        return { allowed: !isProduction, waitMs: isProduction ? cooldownMs : 0 };
    }
}

export default {
    consumeExpCap,
    getExpCapRemaining,
    checkClickCooldown,
    getCapByRealm,
    getPassiveExpPerMin,
    getWindowInfo,
    getDiminishStatus,
    trackDailyClickTime,
    peekDailyClickMs,
    CAP_BY_REALM,
    PASSIVE_EXP_PER_MIN,
    DIMINISH_LORE
};
