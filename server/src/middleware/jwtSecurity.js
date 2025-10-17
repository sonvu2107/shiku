
// Nạp biến môi trường sớm để sử dụng các secret bên dưới
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
 * Các hàm hỗ trợ bảo mật JWT: xoay vòng, thu hồi token, và flow cookie chống CSRF.
 * Đáp ứng tiêu chuẩn OWASP ASVS mục 2.5.3 (quản lý phiên) và 2.5.4 (thu hồi token).
 */

// Danh sách đen lưu các access token đã bị thu hồi (chỉ lưu trong RAM)
const tokenBlacklist = new Set();


// Thuật toán ký JWT, secret cho access/refresh token, và secret cũ (nếu có)
const JWT_ALGORITHM = process.env.JWT_ALGORITHM || "HS256";
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;
const REFRESH_SECRET_OLD = process.env.REFRESH_SECRET_OLD;

// Thời gian sống của access token: 15 phút (giảm nguy cơ bị lộ)
const ACCESS_TOKEN_TTL_SECONDS = Number(process.env.ACCESS_TOKEN_TTL_SECONDS) || 15 * 60;
// Thời gian sống của refresh token: 30 ngày
const REFRESH_TOKEN_TTL_SECONDS = Number(process.env.REFRESH_TOKEN_TTL_SECONDS) || 30 * 24 * 60 * 60;


// Cảnh báo nếu thiếu secret riêng cho access/refresh token
if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
  console.warn(
    "[SECURITY][JWT] Thiếu ACCESS_TOKEN_SECRET/REFRESH_TOKEN_SECRET, đang dùng JWT_SECRET chung. Nên cấu hình secret riêng biệt."
  );
}


// Hàm ký JWT với payload, secret và thời hạn
const signToken = (payload, secret, expiresInSeconds) =>
  jwt.sign(payload, secret, {
    expiresIn: expiresInSeconds,
    algorithm: JWT_ALGORITHM
  });


/**
 * Tạo access token (thêm type=access vào payload)
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
 * Tạo refresh token (thêm jti để quản lý thu hồi)
 * @param {Object} payload
 * @param {Object} [options]
 * @param {boolean} [options.legacy=false] - Có phải token cũ không
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

  // Lưu metadata của refresh token vào kho lưu trữ (DB hoặc RAM)
  await persistRefreshToken({
    jti,
    userId: payload.id,
    issuedAt,
    expiresAt,
    legacy
  });

  return { token, jti, issuedAt, expiresAt };
};


// Kiểm tra access token có nằm trong blacklist không
const isTokenBlacklisted = (token) => tokenBlacklist.has(token);


/**
 * Xác thực access token, kiểm tra loại token và blacklist
 * @param {string} token
 * @returns {Object}
 */
export const verifyAccessToken = (token) => {
  if (!token) {
    throw new Error("Thiếu access token");
  }
  if (isTokenBlacklisted(token)) {
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


// Giải mã refresh token, hỗ trợ cả secret cũ (nếu có)
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
 * @param {string} token
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
  // Nếu token không có jti, buộc phải xoay vòng lại
  if (!payload.jti) {
    console.warn("[SECURITY][JWT] Refresh token thiếu jti, buộc phải xoay vòng lại cho user", payload.id);
    return result;
  }
  // Kiểm tra metadata của refresh token trong kho lưu trữ
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


/**
 * Tạo cặp access token + refresh token cho user
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
 * Middleware bắt buộc xác thực: yêu cầu access token hợp lệ (qua cookie hoặc header)
 * Nếu hợp lệ, gán user vào req.user, nếu không trả về lỗi 401/403
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
 * Middleware xác thực tùy chọn: nếu có access token hợp lệ thì gán user vào req.user, không thì bỏ qua
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
        // Bỏ qua lỗi xác thực, cho phép truy cập ẩn danh
      }
    }
    next();
  } catch (error) {
    next();
  }
};


// Middleware chỉ cho phép admin truy cập
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
 * Xử lý refresh token: xác thực, thu hồi token cũ, tạo token mới
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
      console.warn("[SECURITY][JWT] Không thể thu hồi refresh token", payload.jti, error.message);
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
 * Đăng xuất: đưa access token vào blacklist và thu hồi refresh token
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
        "[SECURITY][JWT] Không thể thu hồi refresh token khi đăng xuất",
        error.message
      );
    }
    // Nếu có model RefreshToken (DB), thử thu hồi trong DB luôn
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


/**
 * Middleware giới hạn số lần refresh token (rate limit, lưu trong RAM)
 * Giúp chống brute-force hoặc abuse refresh token
 */
export const refreshTokenLimiter = (req, res, next) => {
  const key = `refresh:${req.ip}`;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 phút
  // Cho phép nhiều hơn khi dev, nghiêm ngặt khi production
  const maxAttempts = process.env.NODE_ENV === 'production' ? 10 : 50;
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
  // Thêm header rate limit chuẩn
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
  }, 5 * 60 * 1000); // Mỗi 5 phút
}
