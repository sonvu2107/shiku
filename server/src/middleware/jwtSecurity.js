/**
 * JWT Security Middleware
 * 
 * Các hàm hỗ trợ bảo mật JWT: tạo token, xác thực, xoay vòng, thu hồi.
 * Đáp ứng tiêu chuẩn OWASP ASVS mục 2.5.3 (quản lý phiên) và 2.5.4 (thu hồi token).
 */

import 'dotenv/config';
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import User from "../models/User.js";
import {
  persistRefreshToken,
  getRefreshToken,
  markLegacySecret,
  revokeRefreshToken,
  detectTokenReuse,
  getRefreshTokenStats
} from "../services/refreshTokenStore.js";
import {
  addToBlacklist,
  isBlacklisted,
  shutdownBlacklist,
  getBlacklistStats
} from "../services/tokenBlacklist.js";

// ============================================================
// CẤU HÌNH
// ============================================================

const JWT_ALGORITHM = process.env.JWT_ALGORITHM || "HS256";
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;
const REFRESH_SECRET_OLD = process.env.REFRESH_SECRET_OLD;

const ACCESS_TOKEN_TTL_SECONDS = Number(process.env.ACCESS_TOKEN_TTL_SECONDS) || 15 * 60; // 15 phút
const REFRESH_TOKEN_TTL_SECONDS = Number(process.env.REFRESH_TOKEN_TTL_SECONDS) || 30 * 24 * 60 * 60; // 30 ngày

if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
  console.warn(
    "[SECURITY][JWT] Thiếu ACCESS_TOKEN_SECRET/REFRESH_TOKEN_SECRET, đang dùng JWT_SECRET chung. Nên cấu hình secret riêng biệt."
  );
}

// ============================================================
// HÀM TẠO TOKEN
// ============================================================

/**
 * Ký JWT token
 */
const signToken = (payload, secret, expiresInSeconds) =>
  jwt.sign(payload, secret, {
    expiresIn: expiresInSeconds,
    algorithm: JWT_ALGORITHM
  });

/**
 * Tạo access token
 * @param {Object} payload - Payload chứa id, role
 * @returns {string} JWT access token
 */
export const generateAccessToken = (payload = {}) => {
  const tokenPayload = {
    ...payload,
    type: "access"
  };
  return signToken(tokenPayload, ACCESS_TOKEN_SECRET, ACCESS_TOKEN_TTL_SECONDS);
};

/**
 * Tạo refresh token với jti để quản lý thu hồi
 * @param {Object} payload - Payload chứa id, role
 * @param {Object} [options] - Tùy chọn
 * @param {boolean} [options.legacy=false] - Token cũ (dùng secret cũ)
 * @param {string} [options.familyId] - ID của token family (cho rotation tracking)
 * @param {string} [options.parentJti] - JTI của token cha (cho rotation chain)
 * @returns {Promise<{token: string, jti: string, issuedAt: Date, expiresAt: Date, familyId: string}>}
 */
export const generateRefreshToken = async (payload = {}, { legacy = false, familyId = null, parentJti = null } = {}) => {
  const jti = uuidv4();
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1000);

  const actualFamilyId = familyId || jti;

  const tokenPayload = {
    ...payload,
    type: "refresh",
    jti,
    fid: actualFamilyId
  };

  const token = signToken(tokenPayload, REFRESH_TOKEN_SECRET, REFRESH_TOKEN_TTL_SECONDS);

  // OPTIMIZATION: Fire-and-forget persist - don't block response
  // Token is already signed and valid, persistence is for revocation tracking only
  persistRefreshToken({
    jti,
    userId: payload.id,
    issuedAt,
    expiresAt,
    legacy,
    familyId: actualFamilyId,
    parentJti
  }).catch(err => console.error('[JWT] Failed to persist refresh token:', err));

  return { token, jti, issuedAt, expiresAt, familyId: actualFamilyId };
};

// ============================================================
// HÀM XÁC THỰC TOKEN
// ============================================================

/**
 * Xác thực access token, kiểm tra blacklist và loại token
 * @param {string} token - Access token
 * @returns {Promise<Object>} Payload của token
 */
export const verifyAccessToken = async (token) => {
  if (!token) {
    throw new Error("Thiếu access token");
  }
  
  const blacklisted = await isBlacklisted(token);
  if (blacklisted) {
    throw new Error("Access token đã bị thu hồi");
  }
  
  const payload = jwt.verify(token, ACCESS_TOKEN_SECRET, {
    algorithms: [JWT_ALGORITHM]
  });
  if (payload.type !== "access") {
    throw new Error("Invalid token type");
  }
  return payload;
};

/**
 * Giải mã refresh token, hỗ trợ cả secret cũ (nếu có)
 */
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
 * Xác thực refresh token (hỗ trợ chuyển đổi secret cũ)
 * @param {string} token - Refresh token
 * @returns {Promise<{payload: Object, legacy: boolean, needsRotation: boolean}>}
 */
export const verifyRefreshToken = async (token) => {
  if (!token) {
    throw new Error("Thiếu refresh token");
  }
  const { payload, usedSecret } = decodeRefreshTokenWithFallback(token);
  if (payload.type !== "refresh") {
    throw new Error("Sai loại refresh token");
  }
  const result = {
    payload,
    legacy: usedSecret === "legacy",
    needsRotation: usedSecret === "legacy" || !payload.jti
  };
  
  if (!payload.jti) {
    console.warn("[SECURITY][JWT] Refresh token thiếu jti, buộc phải xoay vòng lại cho user", payload.id);
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
    throw new Error("Refresh token đã bị thu hồi");
  }
  if (metadata?.expiresAt && metadata.expiresAt.getTime() <= Date.now()) {
    await revokeRefreshToken(payload.jti, "expired");
    throw new Error("Refresh token đã hết hạn");
  }
  if (usedSecret === "legacy") {
    await markLegacySecret(payload.jti);
  }
  return result;
};

// ============================================================
// HÀM TẠO TOKEN PAIR
// ============================================================

/**
 * Tạo cặp access token + refresh token cho user
 * @param {Object} user - User object
 * @param {Object} [options] - Tùy chọn
 * @param {string} [options.familyId] - Token family ID (cho rotation tracking)
 * @param {string} [options.parentJti] - Parent token JTI (cho rotation chain)
 * @returns {Promise<{accessToken: string, refreshToken: string, refreshTokenJti: string, refreshTokenExpiresAt: Date, familyId: string}>}
 */
export const generateTokenPair = async (user, { familyId = null, parentJti = null } = {}) => {
  const basePayload = {
    id: user._id?.toString() || user.id,
    role: user.role
  };
  const accessToken = generateAccessToken(basePayload);
  const refreshTokenInfo = await generateRefreshToken(basePayload, { familyId, parentJti });
  return {
    accessToken,
    refreshToken: refreshTokenInfo.token,
    refreshTokenJti: refreshTokenInfo.jti,
    refreshTokenExpiresAt: refreshTokenInfo.expiresAt,
    familyId: refreshTokenInfo.familyId
  };
};

// ============================================================
// MIDDLEWARE XÁC THỰC
// ============================================================

/**
 * Middleware bắt buộc xác thực
 * Yêu cầu access token hợp lệ (từ cookie hoặc header)
 * Nếu hợp lệ, gán user vào req.user
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
    const payload = await verifyAccessToken(token);
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
 * Middleware xác thực tùy chọn
 * Nếu có access token hợp lệ thì gán user vào req.user, không thì bỏ qua
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
        const payload = await verifyAccessToken(token);
        const user = await User.findById(payload.id).select("-password");
        if (user && !user.isBanned) {
          req.user = user;
          req.token = token;
          req.authContext = { accessTokenPayload: payload };
        }
      } catch (error) {
        // Bỏ qua lỗi xác thực, cho phép truy cập ẩn danh
      }
    }
    next();
  } catch (error) {
    next();
  }
};

/**
 * Middleware chỉ cho phép admin truy cập
 */
export const adminOnly = (req, res, next) => {
  if (req.user?.role === "admin") {
    return next();
  }
  return res.status(403).json({
    error: "Chỉ admin mới có quyền truy cập",
    code: "ADMIN_REQUIRED"
  });
};

// ============================================================
// REFRESH TOKEN HANDLING
// ============================================================

/**
 * Xử lý refresh token: xác thực, thu hồi token cũ, tạo token mới
 * Bao gồm token reuse detection để phát hiện token bị đánh cắp
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} Access token mới và thông tin user
 */
export const refreshAccessToken = async (refreshToken) => {
  const verification = await verifyRefreshToken(refreshToken);
  const { payload } = verification;

  // Kiểm tra token reuse attack
  if (payload.jti) {
    const reuseCheck = await detectTokenReuse(payload.jti);
    if (reuseCheck.isReuseAttack) {
      console.error(`[SECURITY][JWT] Phát hiện token reuse attack cho user ${reuseCheck.userId}!`);
      throw new Error("Phát hiện token bị tái sử dụng. Tất cả sessions đã bị thu hồi vì lý do bảo mật.");
    }
  }

  const user = await User.findById(payload.id).select("-password");
  if (!user || user.isBanned) {
    throw new Error("Người dùng không tồn tại hoặc đã bị cấm");
  }

  // Thu hồi token cũ trước khi tạo token mới
  if (payload.jti) {
    try {
      await revokeRefreshToken(payload.jti, verification.legacy ? "legacy-rotation" : "rotated");
    } catch (error) {
      console.warn("[SECURITY][JWT] Không thể thu hồi refresh token", payload.jti, error.message);
    }
  }

  // Tạo token mới, giữ nguyên familyId để tracking rotation chain
  const familyId = payload.fid || payload.jti;
  const tokens = await generateTokenPair(user, { familyId, parentJti: payload.jti });

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
      familyId,
      legacy: verification.legacy,
      needsRotation: verification.needsRotation
    }
  };
};

// ============================================================
// LOGOUT
// ============================================================

/**
 * Đăng xuất: đưa access token vào blacklist và thu hồi refresh token
 * @param {Object} params
 * @param {string} [params.accessToken] - Access token cần blacklist
 * @param {string} [params.refreshToken] - Refresh token cần thu hồi
 */
export const logout = async ({ accessToken, refreshToken } = {}) => {
  if (accessToken) {
    await addToBlacklist(accessToken, 'logout');
  }
  if (refreshToken) {
    try {
      const verification = await verifyRefreshToken(refreshToken);
      if (verification.payload.jti) {
        await revokeRefreshToken(verification.payload.jti, "logout");
      }
    } catch (error) {
      console.warn(
        "[SECURITY][JWT] Không thể thu hồi refresh token khi đăng xuất",
        error.message
      );
    }
    // Thử thu hồi trong DB nếu có model RefreshToken
    try {
      const decoded = jwt.decode(refreshToken) || {};
      const jti = decoded.jti;
      try {
        const mod = await import("../models/RefreshToken.js").catch(() => null);
        const RefreshTokenModel = mod ? (mod.default || mod.RefreshToken || mod.RefreshTokenModel) : null;
        if (RefreshTokenModel) {
          if (jti) {
            await RefreshTokenModel.findOneAndUpdate({ jti }, { revoked: true }).exec();
          } else {
            await RefreshTokenModel.deleteOne({ token: refreshToken }).exec();
          }
        }
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[SECURITY][JWT] Không có model RefreshToken hoặc lỗi DB:', err.message);
        }
      }
    } catch (err) {
      // Bỏ qua lỗi decode
    }
  }
};

// ============================================================
// RATE LIMITING CHO REFRESH TOKEN
// ============================================================

/**
 * Reset rate limit cho IP khi login thành công
 */
export const resetRateLimit = (ip) => {
  if (!global.refreshAttempts) {
    global.refreshAttempts = new Map();
  }
  
  const key = `refresh:${ip}`;
  global.refreshAttempts.delete(key);
  console.log(`[RATE LIMIT] Reset rate limit cho IP: ${ip}`);
};

/**
 * Middleware giới hạn số lần refresh token
 * Giúp chống brute-force hoặc abuse refresh token
 */
export const refreshTokenLimiter = (req, res, next) => {
  const key = `refresh:${req.ip}`;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 phút
  const maxAttempts = process.env.NODE_ENV === 'production' ? 30 : 100;
  
  if (!global.refreshAttempts) {
    global.refreshAttempts = new Map();
  }
  
  const attempts = global.refreshAttempts.get(key) || [];
  const validAttempts = attempts.filter((time) => now - time < windowMs);
  
  if (validAttempts.length >= maxAttempts) {
    console.warn(`[RATE LIMIT] IP ${req.ip} vượt quá giới hạn refresh token: ${validAttempts.length}/${maxAttempts}`);
    return res.status(429).json({
      error: "Quá nhiều lần refresh token, vui lòng thử lại sau 15 phút",
      code: "REFRESH_RATE_LIMIT",
      retryAfter: Math.ceil(windowMs / 1000)
    });
  }
  
  validAttempts.push(now);
  global.refreshAttempts.set(key, validAttempts);
  
  res.setHeader('X-RateLimit-Limit', maxAttempts);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, maxAttempts - validAttempts.length));
  res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());
  
  next();
};

// Dọn dẹp các lần refresh cũ mỗi 5 phút để tránh rò rỉ bộ nhớ
if (typeof global.refreshAttemptsCleanup === 'undefined') {
  global.refreshAttemptsCleanup = setInterval(() => {
    if (global.refreshAttempts) {
      const now = Date.now();
      const windowMs = 15 * 60 * 1000;
      for (const [key, attempts] of global.refreshAttempts.entries()) {
        const validAttempts = attempts.filter((time) => now - time < windowMs);
        if (validAttempts.length === 0) {
          global.refreshAttempts.delete(key);
        } else {
          global.refreshAttempts.set(key, validAttempts);
        }
      }
    }
  }, 5 * 60 * 1000);
  
  // Allow process to exit
  if (global.refreshAttemptsCleanup.unref) {
    global.refreshAttemptsCleanup.unref();
  }
}

// ============================================================
// CLEANUP & UTILITIES
// ============================================================

/**
 * Cleanup function cho graceful shutdown (được gọi bởi main server)
 */
export const cleanupJWTSecurity = () => {
  try {
    if (global.refreshAttemptsCleanup) {
      clearInterval(global.refreshAttemptsCleanup);
      global.refreshAttemptsCleanup = undefined;
    }
    shutdownBlacklist();
    console.log('[INFO][JWT] Cleanup hoàn tất');
  } catch (error) {
    console.error('[ERROR][JWT] Cleanup thất bại:', error.message);
  }
};

/**
 * Lấy thống kê token blacklist (cho monitoring)
 */
export const getTokenBlacklistStats = () => {
  return getBlacklistStats();
};
