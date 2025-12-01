/**
 * Token Blacklist Service
 * 
 * Quản lý danh sách đen các access token đã bị thu hồi (logout, security breach).
 * Hỗ trợ cả lưu trữ trong RAM và Redis (tùy chọn).
 * 
 * Cấu hình trong .env:
 * - USE_REDIS_BLACKLIST=true    - Bật Redis cho token blacklist
 * - REDIS_URL=redis://...        - URL kết nối Redis
 * 
 * Lưu ý:
 * - Lưu trữ RAM sẽ mất khi restart server
 * - Để scale nhiều server, nên dùng Redis
 */

import { isRedisConnected, set as redisSet, exists as redisExists, del as redisDel } from './redisClient.js';

// ============================================================
// CẤU HÌNH
// ============================================================

const BLACKLIST_TTL_MS = 24 * 60 * 60 * 1000; // 24 giờ (khớp với thời gian sống của access token)
const BLACKLIST_TTL_SECONDS = Math.ceil(BLACKLIST_TTL_MS / 1000);
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000;   // Dọn dẹp token hết hạn mỗi 30 phút
const REDIS_KEY_PREFIX = 'blacklist:';

const USE_REDIS = process.env.USE_REDIS_BLACKLIST === 'true';

// ============================================================
// LỚP QUẢN LÝ BLACKLIST (In-Memory)
// ============================================================

class InMemoryBlacklist {
  constructor() {
    this.blacklist = new Map(); // token -> { expiresAt: Date, reason: string }
    this.startCleanupInterval();
  }

  /**
   * Thêm token vào blacklist
   * @param {string} token - JWT token cần blacklist
   * @param {string} [reason='logout'] - Lý do blacklist
   * @param {number} [ttlMs=BLACKLIST_TTL_MS] - Thời gian sống (milliseconds)
   */
  async add(token, reason = 'logout', ttlMs = BLACKLIST_TTL_MS) {
    if (!token) return;
    
    // Ưu tiên lưu vào Redis nếu đã bật và kết nối được
    if (USE_REDIS && isRedisConnected()) {
      const ttlSeconds = Math.ceil(ttlMs / 1000);
      const success = await redisSet(
        REDIS_KEY_PREFIX + token, 
        JSON.stringify({ reason, addedAt: new Date().toISOString() }),
        ttlSeconds
      );
      if (success) return;
    }
    
    // Fallback: lưu vào RAM
    const expiresAt = new Date(Date.now() + ttlMs);
    this.blacklist.set(token, {
      expiresAt,
      reason,
      addedAt: new Date()
    });
  }

  /**
   * Kiểm tra token có trong blacklist không
   * @param {string} token - JWT token cần kiểm tra
   * @returns {Promise<boolean>}
   */
  async has(token) {
    if (!token) return false;
    
    // Kiểm tra Redis trước nếu đã bật
    if (USE_REDIS && isRedisConnected()) {
      const exists = await redisExists(REDIS_KEY_PREFIX + token);
      if (exists) return true;
    }
    
    // Kiểm tra trong RAM
    const entry = this.blacklist.get(token);
    if (!entry) return false;
    
    // Tự động xóa token đã hết hạn
    if (entry.expiresAt.getTime() <= Date.now()) {
      this.blacklist.delete(token);
      return false;
    }
    
    return true;
  }

  /**
   * Xóa token khỏi blacklist (dùng cho testing/admin)
   * @param {string} token - JWT token cần xóa
   */
  async remove(token) {
    if (USE_REDIS && isRedisConnected()) {
      await redisDel(REDIS_KEY_PREFIX + token);
    }
    this.blacklist.delete(token);
  }

  /**
   * Lấy thống kê blacklist
   * @returns {Object}
   */
  getStats() {
    const now = Date.now();
    let valid = 0;
    let expired = 0;

    for (const [, entry] of this.blacklist.entries()) {
      if (entry.expiresAt.getTime() <= now) {
        expired++;
      } else {
        valid++;
      }
    }

    return {
      total: this.blacklist.size,
      valid,
      expired,
      memoryKB: Math.round(this.blacklist.size * 0.5),
      storageType: USE_REDIS && isRedisConnected() ? 'redis+memory' : 'memory',
      redisEnabled: USE_REDIS,
      redisConnected: USE_REDIS ? isRedisConnected() : false
    };
  }

  /**
   * Dọn dẹp các token đã hết hạn
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [token, entry] of this.blacklist.entries()) {
      if (entry.expiresAt.getTime() <= now) {
        this.blacklist.delete(token);
        cleaned++;
      }
    }

    if (cleaned > 0 && process.env.NODE_ENV !== 'production') {
      console.log(`[TokenBlacklist] Đã xóa ${cleaned} token hết hạn`);
    }
  }

  /**
   * Bắt đầu tự động dọn dẹp định kỳ
   */
  startCleanupInterval() {
    if (this.cleanupInterval) return;
    
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, CLEANUP_INTERVAL_MS);

    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Dừng tự động dọn dẹp (cho graceful shutdown)
   */
  stopCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Xóa tất cả entries (dùng cho testing)
   */
  async clear() {
    this.blacklist.clear();
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

let blacklistInstance = null;

/**
 * Lấy instance blacklist (singleton pattern)
 * @returns {InMemoryBlacklist}
 */
function getBlacklistInstance() {
  if (!blacklistInstance) {
    blacklistInstance = new InMemoryBlacklist();

    if (USE_REDIS) {
      console.log('[TokenBlacklist] Sử dụng Hybrid storage (Redis + In-Memory fallback)');
      console.log('[TokenBlacklist] Redis sẽ được dùng khi đã kết nối');
    } else {
      console.log('[TokenBlacklist] Sử dụng In-Memory (RAM) storage');
      console.warn('[TokenBlacklist] ⚠️  Dữ liệu sẽ mất khi restart server.');
      console.warn('[TokenBlacklist] Set USE_REDIS_BLACKLIST=true và REDIS_URL để lưu trữ bền vững.');
    }
  }
  return blacklistInstance;
}

// ============================================================
// EXPORTS
// ============================================================

/**
 * Thêm token vào blacklist
 */
export async function addToBlacklist(token, reason, ttlMs) {
  return getBlacklistInstance().add(token, reason, ttlMs);
}

/**
 * Kiểm tra token có trong blacklist không
 */
export async function isBlacklisted(token) {
  return getBlacklistInstance().has(token);
}

/**
 * Xóa token khỏi blacklist
 */
export async function removeFromBlacklist(token) {
  return getBlacklistInstance().remove(token);
}

/**
 * Lấy thống kê blacklist
 */
export function getBlacklistStats() {
  return getBlacklistInstance().getStats();
}

/**
 * Dọn dẹp token hết hạn
 */
export function cleanupBlacklist() {
  return getBlacklistInstance().cleanup();
}

/**
 * Dừng service (cho graceful shutdown)
 */
export function shutdownBlacklist() {
  if (blacklistInstance) {
    blacklistInstance.stopCleanupInterval();
  }
}

/**
 * Xóa tất cả (chỉ dùng cho testing)
 */
export async function clearBlacklist() {
  return getBlacklistInstance().clear();
}

export default {
  add: addToBlacklist,
  has: isBlacklisted,
  remove: removeFromBlacklist,
  getStats: getBlacklistStats,
  cleanup: cleanupBlacklist,
  shutdown: shutdownBlacklist,
  clear: clearBlacklist
};
