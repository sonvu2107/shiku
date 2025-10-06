import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Refresh Token Middleware
 * Xử lý refresh token để tạo access token mới
 */

/**
 * Tạo refresh token (dài hạn, 30 ngày)
 * @param {Object} user - User object
 * @returns {string} Refresh token
 */
export function generateRefreshToken(user) {
  return jwt.sign(
    { 
      id: user._id, 
      type: 'refresh',
      role: user.role 
    }, 
    process.env.JWT_SECRET, 
    { expiresIn: "30d" }
  );
}

/**
 * Tạo access token (ngắn hạn, 15 phút)
 * @param {Object} user - User object
 * @returns {string} Access token
 */
export function generateAccessToken(user) {
  return jwt.sign(
    { 
      id: user._id, 
      type: 'access',
      role: user.role 
    }, 
    process.env.JWT_SECRET, 
    { expiresIn: "3d" }
  );
}

/**
 * Verify refresh token
 * @param {string} token - Refresh token
 * @returns {Object|null} Decoded payload hoặc null nếu invalid
 */
export function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'refresh') {
      return null;
    }
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Verify access token
 * @param {string} token - Access token
 * @returns {Object|null} Decoded payload hoặc null nếu invalid
 */
export function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'access') {
      return null;
    }
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Middleware để refresh access token
 */
export async function refreshAccessToken(req, res, next) {
  try {
    const refreshToken = req.cookies?.refreshToken || req.headers['x-refresh-token'] || req.headers['X-Refresh-Token'];
    
    if (!refreshToken) {
      return res.status(401).json({ error: "Refresh token không tìm thấy" });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({ error: "Refresh token không hợp lệ" });
    }

    // Lấy user từ database
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ error: "User không tồn tại" });
    }

    // Kiểm tra user có bị ban không
    if (user.isCurrentlyBanned && user.isCurrentlyBanned()) {
      return res.status(403).json({ 
        error: "Tài khoản đã bị cấm",
        isBanned: true,
        banReason: user.banReason
      });
    }

    // Tạo access token mới
    const newAccessToken = generateAccessToken(user);
    
    // Set cookie cho access token
    res.cookie('token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3 * 24 * 60 * 60 * 1000 // 3 days
    });

    // Trả về access token mới
    res.json({
      accessToken: newAccessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(500).json({ error: "Lỗi server" });
  }
}
