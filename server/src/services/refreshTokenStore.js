/**
 * Refresh Token Store
 * A lightweight in-memory implementation that mimics a persistent store.
 * Replace with Redis or database-backed storage in production.
 */

const refreshTokenIndex = new Map();

const MILLISECONDS_IN_SECOND = 1000;

/**
 * Persist refresh token metadata.
 * @param {Object} params
 * @param {string} params.jti
 * @param {string} params.userId
 * @param {Date} params.issuedAt
 * @param {Date} params.expiresAt
 * @param {boolean} [params.legacy=false]
 */
export async function persistRefreshToken({
  jti,
  userId,
  issuedAt,
  expiresAt,
  legacy = false
}) {
  if (!jti) {
    throw new Error("Refresh token requires jti");
  }

  refreshTokenIndex.set(jti, {
    jti,
    userId,
    issuedAt,
    expiresAt,
    revoked: false,
    revokedAt: null,
    legacy
  });
}

/**
 * Retrieve refresh token metadata.
 * @param {string} jti
 * @returns {Promise<Object|null>}
 */
export async function getRefreshToken(jti) {
  if (!jti) return null;
  return refreshTokenIndex.get(jti) || null;
}

/**
 * Mark refresh token as revoked.
 * @param {string} jti
 * @param {string} [reason]
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
 * Flag a token that was issued with the legacy secret for monitoring.
 * @param {string} jti
 */
export async function markLegacySecret(jti) {
  const token = refreshTokenIndex.get(jti);
  if (token) {
    token.legacy = true;
    refreshTokenIndex.set(jti, token);
  }
}

/**
 * Determine whether a refresh token has been revoked.
 * @param {string} jti
 * @returns {Promise<boolean>}
 */
export async function isRefreshTokenRevoked(jti) {
  const token = await getRefreshToken(jti);
  return token ? !!token.revoked : true;
}

/**
 * Remove expired tokens from memory.
 * In production replace with TTL or scheduled job.
 */
export async function pruneExpiredTokens(now = new Date()) {
  for (const [jti, token] of refreshTokenIndex.entries()) {
    if (token.expiresAt && token.expiresAt.getTime() <= now.getTime()) {
      refreshTokenIndex.delete(jti);
    }
  }
}

/**
 * Utility for tests to reset store.
 */
export function __unsafeResetStore() {
  refreshTokenIndex.clear();
}

/**
 * Utility to compute expiry date from seconds.
 * @param {number} seconds
 */
export function calculateExpiry(seconds) {
  return new Date(Date.now() + seconds * MILLISECONDS_IN_SECOND);
}
