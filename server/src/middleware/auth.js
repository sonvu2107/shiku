import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Middleware bắt buộc user phải đăng nhập
 * Kiểm tra JWT token từ cookie hoặc Authorization header
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export async function authRequired(req, res, next) {
  // Debug logging
  console.log("🔐 Auth middleware - Path:", req.path);
  console.log("🔐 Auth middleware - Cookies:", req.cookies);
  console.log("🔐 Auth middleware - Authorization header:", req.headers.authorization);
  
  // Lấy token từ cookie trước
  let token = req.cookies?.token;
  
  // Nếu không có trong cookie, kiểm tra Authorization header
  if (!token) {
    const header = req.headers.authorization || "";
    token = header.startsWith("Bearer ") ? header.slice(7) : null;
  }
  
  console.log("🔐 Auth middleware - Final token:", token ? "exists" : "not found");
  
  // Nếu không có token, trả về lỗi 401
  if (!token) return res.status(401).json({ error: "Vui lòng đăng nhập" });
  
  try {
    // Verify JWT token
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Lấy user từ database (không bao gồm password)
    const user = await User.findById(payload.id).select("-password");
    if (!user) return res.status(401).json({ error: "Token không hợp lệ" });
    
    // Gán user vào request object để các middleware/route handler khác sử dụng
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Token không hợp lệ" });
  }
}

/**
 * Middleware authentication tùy chọn
 * Nếu có token hợp lệ thì parse user, không thì để req.user = null
 * Không trả về lỗi nếu token không hợp lệ
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export async function authOptional(req, res, next) {
  // Lấy token từ cookie hoặc header
  let token = req.cookies?.token;
  if (!token) {
    const header = req.headers.authorization || "";
    token = header.startsWith("Bearer ") ? header.slice(7) : null;
  }
  
  // Nếu có token, cố gắng parse user
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.id).select("-password");
      if (user) {
        req.user = user;
      }
    } catch (e) {
      // Ignore lỗi token, coi như chưa đăng nhập
      // req.user sẽ là undefined
    }
  }
  
  next();
}

/**
 * Middleware kiểm tra quyền admin
 * Chỉ cho phép users có role "admin" truy cập
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export function adminOnly(req, res, next) {
  if (req.user?.role === "admin") return next();
  return res.status(403).json({ error: "Chỉ admin mới có quyền truy cập" });
}
