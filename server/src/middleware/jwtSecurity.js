import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * JWT Security Middleware với Refresh Token và Blacklist
 * Cải thiện bảo mật JWT với cơ chế refresh token và token blacklist
 */

// Token blacklist (trong production nên dùng Redis)
const tokenBlacklist = new Set();

// Cấu hình JWT
const JWT_CONFIG = {
  accessTokenExpiry: '3d', // 3 ngày 
  refreshTokenExpiry: '30d', // 30 ngày
  algorithm: 'HS256'
};

/**
 * Tạo access token
 * @param {Object} payload - Payload cho token
 * @returns {string} - Access token
 */
export const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: JWT_CONFIG.accessTokenExpiry,
    algorithm: JWT_CONFIG.algorithm
  });
};

/**
 * Tạo refresh token
 * @param {Object} payload - Payload cho token
 * @returns {string} - Refresh token
 */
export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: JWT_CONFIG.refreshTokenExpiry,
    algorithm: JWT_CONFIG.algorithm
  });
};

/**
 * Verify access token
 * @param {string} token - Access token
 * @returns {Object} - Decoded payload
 */
export const verifyAccessToken = (token) => {
  try {
    // Kiểm tra token có trong blacklist không
    if (tokenBlacklist.has(token)) {
      throw new Error('Token đã bị thu hồi');
    }

    return jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: [JWT_CONFIG.algorithm]
    });
  } catch (error) {
    throw new Error('Token không hợp lệ hoặc đã hết hạn');
  }
};

/**
 * Verify refresh token
 * @param {string} token - Refresh token
 * @returns {Object} - Decoded payload
 */
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
      algorithms: [JWT_CONFIG.algorithm]
    });
  } catch (error) {
    throw new Error('Refresh token không hợp lệ hoặc đã hết hạn');
  }
};

/**
 * Thêm token vào blacklist
 * @param {string} token - Token cần blacklist
 */
export const blacklistToken = (token) => {
  tokenBlacklist.add(token);
  
  // Cleanup blacklist sau 24 giờ (trong production nên dùng Redis TTL)
  setTimeout(() => {
    tokenBlacklist.delete(token);
  }, 24 * 60 * 60 * 1000);
};

/**
 * Kiểm tra token có trong blacklist không
 * @param {string} token - Token cần kiểm tra
 * @returns {boolean} - True nếu token bị blacklist
 */
export const isTokenBlacklisted = (token) => {
  return tokenBlacklist.has(token);
};

/**
 * Tạo cặp access và refresh token
 * @param {Object} user - User object
 * @returns {Object} - Cặp tokens
 */
export const generateTokenPair = (user) => {
  const payload = {
    id: user._id,
    role: user.role,
    type: 'access'
  };

  const refreshPayload = {
    id: user._id,
    type: 'refresh'
  };

  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(refreshPayload)
  };
};

/**
 * Middleware xác thực access token
 */
export const authRequired = async (req, res, next) => {
  try {
    // Lấy token từ cookie hoặc header
    let token = req.cookies?.accessToken;
    
    if (!token) {
      const header = req.headers.authorization || "";
      token = header.startsWith("Bearer ") ? header.slice(7) : null;
    }

    if (!token) {
      return res.status(401).json({ 
        error: "Vui lòng đăng nhập",
        code: "NO_TOKEN"
      });
    }

    // Verify token
    const payload = verifyAccessToken(token);
    
    // Lấy user từ database
    const user = await User.findById(payload.id).select("-password");
    if (!user) {
      return res.status(401).json({ 
        error: "Token không hợp lệ",
        code: "INVALID_TOKEN"
      });
    }

    // Kiểm tra user có bị ban không
    if (user.isBanned) {
      return res.status(403).json({ 
        error: "Tài khoản đã bị cấm",
        code: "USER_BANNED"
      });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    return res.status(401).json({ 
      error: error.message,
      code: "TOKEN_ERROR"
    });
  }
};

/**
 * Middleware xác thực tùy chọn
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
        }
      } catch (error) {
        // Ignore token errors trong authOptional
      }
    }

    next();
  } catch (error) {
    next();
  }
};

/**
 * Middleware kiểm tra quyền admin
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

/**
 * Refresh access token
 * @param {string} refreshToken - Refresh token
 * @returns {Object} - New access token
 */
export const refreshAccessToken = async (refreshToken) => {
  try {
    const payload = verifyRefreshToken(refreshToken);
    
    // Lấy user từ database
    const user = await User.findById(payload.id).select("-password");
    if (!user || user.isBanned) {
      throw new Error('User không tồn tại hoặc đã bị cấm');
    }

    // Tạo access token mới
    const newPayload = {
      id: user._id,
      role: user.role,
      type: 'access'
    };

    return {
      accessToken: generateAccessToken(newPayload),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    };
  } catch (error) {
    throw new Error('Refresh token không hợp lệ');
  }
};

/**
 * Logout - thêm token vào blacklist
 * @param {string} token - Token cần logout
 */
export const logout = (token) => {
  if (token) {
    blacklistToken(token);
  }
};

/**
 * Middleware kiểm tra rate limit cho refresh token
 */
export const refreshTokenLimiter = (req, res, next) => {
  // Giới hạn 5 lần refresh mỗi 15 phút
  const key = `refresh:${req.ip}`;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 phút
  const maxAttempts = 5;

  // Trong production nên dùng Redis
  if (!global.refreshAttempts) {
    global.refreshAttempts = new Map();
  }

  const attempts = global.refreshAttempts.get(key) || [];
  const validAttempts = attempts.filter(time => now - time < windowMs);

  if (validAttempts.length >= maxAttempts) {
    return res.status(429).json({
      error: 'Quá nhiều lần refresh token, vui lòng thử lại sau 15 phút',
      code: 'REFRESH_RATE_LIMIT'
    });
  }

  validAttempts.push(now);
  global.refreshAttempts.set(key, validAttempts);

  next();
};
