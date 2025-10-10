// Load environment variables early for secrets used below
import 'dotenv/config';
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import User from "../models/User.js";
import {
  persistRefreshToken,
  getRefreshToken,
  markLegacySecret,
  revokeRefreshToken
} from "../services/refreshTokenStore.js";

/**
 * JWT security helpers implementing rotation, revocation, and CSRF-aligned cookie flow.
 * Aligns with OWASP ASVS section 2.5.3 (session management) and 2.5.4 (token revocation).
 */

const tokenBlacklist = new Set();

const JWT_ALGORITHM = process.env.JWT_ALGORITHM || "HS256";
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;
const REFRESH_SECRET_OLD = process.env.REFRESH_SECRET_OLD;

// 15 minutes access token lifetime (short-lived to reduce replay window)
const ACCESS_TOKEN_TTL_SECONDS = Number(process.env.ACCESS_TOKEN_TTL_SECONDS) || 15 * 60;
// 30 days refresh token lifetime keeps parity with the previous implementation
const REFRESH_TOKEN_TTL_SECONDS = Number(process.env.REFRESH_TOKEN_TTL_SECONDS) || 30 * 24 * 60 * 60;

if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
  console.warn(
    "[SECURITY][JWT] Missing ACCESS_TOKEN_SECRET/REFRESH_TOKEN_SECRET env vars; falling back to JWT_SECRET. " +
      "Please update configuration to dedicated secrets."
  );
}

const signToken = (payload, secret, expiresInSeconds) =>
  jwt.sign(payload, secret, {
    expiresIn: expiresInSeconds,
    algorithm: JWT_ALGORITHM
  });

/**
 * Issue an access token (always embeds type=access).
 * @param {Object} payload
 * @returns {string}
 */
export const generateAccessToken = (payload = {}) => {
  const tokenPayload = {
    ...payload,
    type: "access"
  };

  return signToken(tokenPayload, ACCESS_TOKEN_SECRET, ACCESS_TOKEN_TTL_SECONDS);
};

/**
 * Issue a refresh token with jti tracking for revocation.
 * @param {Object} payload
 * @param {Object} [options]
 * @param {boolean} [options.legacy=false]
 * @returns {Promise<{token: string, jti: string, issuedAt: Date, expiresAt: Date}>}
 */
export const generateRefreshToken = async (payload = {}, { legacy = false } = {}) => {
  const jti = uuidv4();
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1000);

  const tokenPayload = {
    ...payload,
    type: "refresh",
    jti
  };

  const token = signToken(tokenPayload, REFRESH_TOKEN_SECRET, REFRESH_TOKEN_TTL_SECONDS);

  await persistRefreshToken({
    jti,
    userId: payload.id,
    issuedAt,
    expiresAt,
    legacy
  });

  return { token, jti, issuedAt, expiresAt };
};

const isTokenBlacklisted = (token) => tokenBlacklist.has(token);

/**
 * Verify access token and enforce token type.
 * @param {string} token
 * @returns {Object}
 */
export const verifyAccessToken = (token) => {
  if (!token) {
    throw new Error("Access token missing");
  }

  if (isTokenBlacklisted(token)) {
    throw new Error("Access token revoked");
  }

  const payload = jwt.verify(token, ACCESS_TOKEN_SECRET, {
    algorithms: [JWT_ALGORITHM]
  });

  if (payload.type !== "access") {
    throw new Error("Invalid token type");
  }

  return payload;
};

const decodeRefreshTokenWithFallback = (token) => {
  try {
    const payload = jwt.verify(token, REFRESH_TOKEN_SECRET, {
      algorithms: [JWT_ALGORITHM]
    });
    return { payload, usedSecret: "primary" };
  } catch (primaryError) {
    if (!REFRESH_SECRET_OLD) {
      throw primaryError;
    }

    const payload = jwt.verify(token, REFRESH_SECRET_OLD, {
      algorithms: [JWT_ALGORITHM]
    });
    return { payload, usedSecret: "legacy" };
  }
};

/**
 * Verify refresh token (with dual-secret migration support).
 * @param {string} token
 * @returns {Promise<{payload: Object, legacy: boolean, needsRotation: boolean}>}
 */
export const verifyRefreshToken = async (token) => {
  if (!token) {
    throw new Error("Refresh token missing");
  }

  const { payload, usedSecret } = decodeRefreshTokenWithFallback(token);

  if (payload.type !== "refresh") {
    throw new Error("Invalid refresh token type");
  }

  const result = {
    payload,
    legacy: usedSecret === "legacy",
    needsRotation: usedSecret === "legacy" || !payload.jti
  };

  if (!payload.jti) {
    console.warn("[SECURITY][JWT] Refresh token missing jti; forcing rotation for user", payload.id);
    return result;
  }

  let metadata = await getRefreshToken(payload.jti);
  if (!metadata) {
    const issuedAt = payload.iat ? new Date(payload.iat * 1000) : new Date();
    const expiresAt = payload.exp
      ? new Date(payload.exp * 1000)
      : new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

    await persistRefreshToken({
      jti: payload.jti,
      userId: payload.id,
      issuedAt,
      expiresAt,
      legacy: usedSecret === "legacy"
    });
    metadata = await getRefreshToken(payload.jti);
  }

  if (metadata?.revoked) {
    throw new Error("Refresh token revoked");
  }

  if (metadata?.expiresAt && metadata.expiresAt.getTime() <= Date.now()) {
    await revokeRefreshToken(payload.jti, "expired");
    throw new Error("Refresh token expired");
  }

  if (usedSecret === "legacy") {
    await markLegacySecret(payload.jti);
  }

  return result;
};

/**
 * Create access + refresh token pair and persist metadata.
 * @param {Object} user
 * @returns {Promise<{accessToken: string, refreshToken: string, refreshTokenJti: string, refreshTokenExpiresAt: Date}>}
 */
export const generateTokenPair = async (user) => {
  const basePayload = {
    id: user._id?.toString() || user.id,
    role: user.role
  };

  const accessToken = generateAccessToken(basePayload);
  const refreshTokenInfo = await generateRefreshToken(basePayload);

  return {
    accessToken,
    refreshToken: refreshTokenInfo.token,
    refreshTokenJti: refreshTokenInfo.jti,
    refreshTokenExpiresAt: refreshTokenInfo.expiresAt
  };
};

/**
 * Strict auth middleware – requires valid access token (cookie or bearer header).
 */
export const authRequired = async (req, res, next) => {
  try {
    let token = req.cookies?.accessToken;
    if (!token) {
      const header = req.headers.authorization || "";
      token = header.startsWith("Bearer ") ? header.slice(7) : null;
    }

    if (!token) {
      return res.status(401).json({ error: "Vui lòng đăng nhập", code: "NO_TOKEN" });
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.id).select("-password");
    if (!user) {
      return res.status(401).json({ error: "Token không hợp lệ", code: "INVALID_TOKEN" });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: "Tài khoản đã bị cấm", code: "USER_BANNED" });
    }

    req.user = user;
    req.token = token;
    req.authContext = { accessTokenPayload: payload };
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ error: error.message || "Token không hợp lệ", code: "TOKEN_ERROR" });
  }
};

/**
 * Optional auth middleware – attaches user when present.
 */
export const authOptional = async (req, res, next) => {
  try {
    let token = req.cookies?.accessToken;
    if (!token) {
      const header = req.headers.authorization || "";
      token = header.startsWith("Bearer ") ? header.slice(7) : null;
    }

    if (token) {
      try {
        const payload = verifyAccessToken(token);
        const user = await User.findById(payload.id).select("-password");
        if (user && !user.isBanned) {
          req.user = user;
          req.token = token;
          req.authContext = { accessTokenPayload: payload };
        }
      } catch (error) {
        // Ignore optional auth errors, consumer can fall back to anonymous state.
      }
    }

    next();
  } catch (error) {
    next();
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user?.role === "admin") {
    return next();
  }
  return res.status(403).json({
    error: "Chỉ admin mới có quyền truy cập",
    code: "ADMIN_REQUIRED"
  });
};

/**
 * Refresh token flow with rotation + revocation.
 * @param {string} refreshToken
 * @returns {Promise<Object>}
 */
export const refreshAccessToken = async (refreshToken) => {
  const verification = await verifyRefreshToken(refreshToken);
  const { payload } = verification;

  const user = await User.findById(payload.id).select("-password");
  if (!user || user.isBanned) {
    throw new Error("User không tồn tại hoặc đã bị cấm");
  }

  if (payload.jti) {
    try {
      await revokeRefreshToken(payload.jti, verification.legacy ? "legacy-rotation" : "rotated");
    } catch (error) {
      console.warn("[SECURITY][JWT] Failed to revoke refresh token", payload.jti, error.message);
    }
  }

  const tokens = await generateTokenPair(user);

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    refreshTokenJti: tokens.refreshTokenJti,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    rotation: {
      rotatedFrom: payload.jti || null,
      legacy: verification.legacy,
      needsRotation: verification.needsRotation
    }
  };
};

/**
 * Logout helper – blacklist access token & revoke refresh token.
 * @param {Object} params
 * @param {string} [params.accessToken]
 * @param {string} [params.refreshToken]
 */
export const logout = async ({ accessToken, refreshToken } = {}) => {
  if (accessToken) {
    tokenBlacklist.add(accessToken);
    setTimeout(() => tokenBlacklist.delete(accessToken), 24 * 60 * 60 * 1000);
  }

  if (refreshToken) {
    try {
      const verification = await verifyRefreshToken(refreshToken);
      if (verification.payload.jti) {
        await revokeRefreshToken(verification.payload.jti, "logout");
      }
    } catch (error) {
      console.warn(
        "[SECURITY][JWT] Failed to revoke refresh token on logout",
        error.message
      );
    }

    // Try to revoke/delete from a persistent RefreshToken model if it exists.
    // This is optional — projects using a DB-backed refresh token store should
    // implement `models/RefreshToken.js` exporting a Mongoose model.
    try {
      // Decode token to find jti when possible
      const decoded = jwt.decode(refreshToken) || {};
      const jti = decoded.jti;

      try {
        const mod = await import("../models/RefreshToken.js").catch(() => null);
        const RefreshTokenModel = mod ? (mod.default || mod.RefreshToken || mod.RefreshTokenModel) : null;
        if (RefreshTokenModel) {
          if (jti) {
            // Prefer marking revoked by jti
            await RefreshTokenModel.findOneAndUpdate({ jti }, { revoked: true }).exec();
          } else {
            // Fallback: remove by token string (if stored)
            await RefreshTokenModel.deleteOne({ token: refreshToken }).exec();
          }
        }
      } catch (err) {
        // Model not present or DB error — don't fail logout
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[SECURITY][JWT] No RefreshToken model or failed DB revoke:', err.message);
        }
      }
    } catch (err) {
      // ignore decode errors
    }
  }
};

/**
 * Refresh token rate limiter (in-memory fallback).
 */
export const refreshTokenLimiter = (req, res, next) => {
  const key = `refresh:${req.ip}`;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 5;

  if (!global.refreshAttempts) {
    global.refreshAttempts = new Map();
  }

  const attempts = global.refreshAttempts.get(key) || [];
  const validAttempts = attempts.filter((time) => now - time < windowMs);

  if (validAttempts.length >= maxAttempts) {
    return res.status(429).json({
      error: "Quá nhiều lần refresh token, vui lòng thử lại sau 15 phút",
      code: "REFRESH_RATE_LIMIT"
    });
  }

  validAttempts.push(now);
  global.refreshAttempts.set(key, validAttempts);

  next();
};
