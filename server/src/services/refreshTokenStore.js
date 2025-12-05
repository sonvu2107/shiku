/**
 * Refresh Token Store
 * 
 * Quản lý metadata của refresh tokens trong bộ nhớ.
 * Hỗ trợ:
 * - Token family tracking (theo dõi chuỗi rotation)
 * - Token reuse detection (phát hiện token bị đánh cắp)
 * - Thống kê và monitoring
 * 
 * Lưu ý: Trong production, nên thay bằng Redis hoặc database-backed storage
 */

const refreshTokenIndex = new Map();
const tokenFamilies = new Map(); // familyId -> Set<jti>

const MILLISECONDS_IN_SECOND = 1000;
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

// Cleanup interval reference
let cleanupInterval = null;

/**
 * Start periodic cleanup of expired tokens
 */
function startCleanupInterval() {
  if (cleanupInterval) return;
  
  cleanupInterval = setInterval(() => {
    cleanupExpiredTokens();
  }, CLEANUP_INTERVAL_MS);
  
  // Allow process to exit
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }
}

/**
 * Cleanup expired tokens to prevent memory leak
 */
function cleanupExpiredTokens() {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [jti, token] of refreshTokenIndex.entries()) {
    // Remove if expired AND (revoked OR expired for more than 1 hour)
    const isExpired = token.expiresAt && token.expiresAt.getTime() <= now;
    const isStale = isExpired && (token.revoked || (now - token.expiresAt.getTime() > 60 * 60 * 1000));
    
    if (isStale) {
      refreshTokenIndex.delete(jti);
      
      // Also clean up from family
      if (token.familyId && tokenFamilies.has(token.familyId)) {
        const family = tokenFamilies.get(token.familyId);
        family.delete(jti);
        if (family.size === 0) {
          tokenFamilies.delete(token.familyId);
        }
      }
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`[REFRESH-TOKEN-STORE] Cleaned ${cleaned} expired tokens, ${refreshTokenIndex.size} remaining`);
  }
}

// Start cleanup when module loads
startCleanupInterval();

/**
 * Lưu metadata của refresh token
 * @param {Object} params
 * @param {string} params.jti - Token ID
 * @param {string} params.userId - User ID
 * @param {Date} params.issuedAt - Thời điểm phát hành
 * @param {Date} params.expiresAt - Thời điểm hết hạn
 * @param {boolean} [params.legacy=false] - Token cũ (dùng secret cũ)
 * @param {string} [params.familyId] - ID của token family (cho rotation tracking)
 * @param {string} [params.parentJti] - JTI của token cha (cho rotation chain)
 */
export async function persistRefreshToken({
  jti,
  userId,
  issuedAt,
  expiresAt,
  legacy = false,
  familyId = null,
  parentJti = null
}) {
  if (!jti) {
    throw new Error("Refresh token cần có jti");
  }

  const actualFamilyId = familyId || jti;

  refreshTokenIndex.set(jti, {
    jti,
    userId,
    issuedAt,
    expiresAt,
    revoked: false,
    revokedAt: null,
    legacy,
    familyId: actualFamilyId,
    parentJti,
    rotationCount: parentJti ? getRotationCount(parentJti) + 1 : 0
  });

  if (!tokenFamilies.has(actualFamilyId)) {
    tokenFamilies.set(actualFamilyId, new Set());
  }
  tokenFamilies.get(actualFamilyId).add(jti);
}

/**
 * Lấy số lần rotation từ token cha
 */
function getRotationCount(parentJti) {
  const parent = refreshTokenIndex.get(parentJti);
  return parent?.rotationCount || 0;
}

/**
 * Lấy metadata của refresh token
 */
export async function getRefreshToken(jti) {
  if (!jti) return null;
  return refreshTokenIndex.get(jti) || null;
}

/**
 * Đánh dấu refresh token đã bị thu hồi
 */
export async function revokeRefreshToken(jti, reason = "revoked") {
  const token = refreshTokenIndex.get(jti);
  if (token) {
    token.revoked = true;
    token.revokedAt = new Date();
    token.revocationReason = reason;
    refreshTokenIndex.set(jti, token);
  }
}

/**
 * Thu hồi tất cả tokens trong một family (khi phát hiện token reuse attack)
 * @param {string} familyId - ID của token family
 * @param {string} reason - Lý do thu hồi
 * @returns {number} Số lượng tokens đã thu hồi
 */
export async function revokeTokenFamily(familyId, reason = "security_breach") {
  const family = tokenFamilies.get(familyId);
  if (!family) return 0;

  let revokedCount = 0;
  for (const jti of family) {
    const token = refreshTokenIndex.get(jti);
    if (token && !token.revoked) {
      token.revoked = true;
      token.revokedAt = new Date();
      token.revocationReason = reason;
      refreshTokenIndex.set(jti, token);
      revokedCount++;
    }
  }

  console.warn(`[SECURITY][RefreshToken] Đã thu hồi ${revokedCount} tokens trong family ${familyId}: ${reason}`);
  return revokedCount;
}

/**
 * Phát hiện token reuse attack
 * Nếu một token đã bị revoke nhưng vẫn được sử dụng, đây là dấu hiệu token bị đánh cắp
 * Tự động thu hồi toàn bộ tokens trong family để bảo mật
 */
export async function detectTokenReuse(jti) {
  const token = refreshTokenIndex.get(jti);
  
  if (!token) {
    return { isReuseAttack: false };
  }

  if (token.revoked) {
    console.error(`[SECURITY][RefreshToken] Phát hiện token reuse attack! JTI: ${jti}, User: ${token.userId}`);
    
    if (token.familyId) {
      await revokeTokenFamily(token.familyId, "token_reuse_attack");
    }

    return {
      isReuseAttack: true,
      familyId: token.familyId,
      userId: token.userId
    };
  }

  return { isReuseAttack: false };
}

/**
 * Đánh dấu token được phát hành với secret cũ (cho monitoring)
 */
export async function markLegacySecret(jti) {
  const token = refreshTokenIndex.get(jti);
  if (token) {
    token.legacy = true;
    refreshTokenIndex.set(jti, token);
  }
}

/**
 * Kiểm tra refresh token có bị thu hồi không
 */
export async function isRefreshTokenRevoked(jti) {
  const token = await getRefreshToken(jti);
  return token ? !!token.revoked : true;
}

/**
 * Xóa các token đã hết hạn khỏi bộ nhớ
 */
export async function pruneExpiredTokens(now = new Date()) {
  const nowTime = now.getTime();
  
  for (const [jti, token] of refreshTokenIndex.entries()) {
    if (token.expiresAt && token.expiresAt.getTime() <= nowTime) {
      refreshTokenIndex.delete(jti);
      
      if (token.familyId) {
        const family = tokenFamilies.get(token.familyId);
        if (family) {
          family.delete(jti);
          if (family.size === 0) {
            tokenFamilies.delete(token.familyId);
          }
        }
      }
    }
  }
}

/**
 * Lấy thống kê cho monitoring
 */
export function getRefreshTokenStats() {
  const now = Date.now();
  let active = 0;
  let revoked = 0;
  let expired = 0;
  let totalRotations = 0;

  for (const [, token] of refreshTokenIndex.entries()) {
    if (token.expiresAt && token.expiresAt.getTime() <= now) {
      expired++;
    } else if (token.revoked) {
      revoked++;
    } else {
      active++;
    }
    totalRotations += token.rotationCount || 0;
  }

  return {
    totalTokens: refreshTokenIndex.size,
    activeTokens: active,
    revokedTokens: revoked,
    expiredTokens: expired,
    tokenFamilies: tokenFamilies.size,
    totalRotations,
    avgRotationsPerFamily: tokenFamilies.size > 0 
      ? (totalRotations / tokenFamilies.size).toFixed(2) 
      : 0
  };
}

/**
 * Reset store (chỉ dùng cho testing)
 */
export function __unsafeResetStore() {
  refreshTokenIndex.clear();
  tokenFamilies.clear();
}

/**
 * Tính thời điểm hết hạn từ số giây
 */
export function calculateExpiry(seconds) {
  return new Date(Date.now() + seconds * MILLISECONDS_IN_SECOND);
}
