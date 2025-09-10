import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Bắt buộc đăng nhập
export async function authRequired(req, res, next) {
  let token = req.cookies?.token;
  if (!token) {
    const header = req.headers.authorization || "";
    token = header.startsWith("Bearer ") ? header.slice(7) : null;
  }
  if (!token) return res.status(401).json({ error: "Vui lòng đăng nhập" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select("-password");
    if (!user) return res.status(401).json({ error: "Token không hợp lệ" });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Token không hợp lệ" });
  }
}

// Không bắt buộc đăng nhập (nếu có token thì parse, không thì để req.user = null)
export async function authOptional(req, res, next) {
  let token = req.cookies?.token;
  if (!token) {
    const header = req.headers.authorization || "";
    token = header.startsWith("Bearer ") ? header.slice(7) : null;
  }
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.id).select("-password");
      if (user) req.user = user;
    } catch (e) {
      // ignore lỗi token, coi như chưa đăng nhập
    }
  }
  next();
}

export function adminOnly(req, res, next) {
  if (req.user?.role === "admin") return next();
  return res.status(403).json({ error: "Chỉ admin mới có quyền truy cập" });
}
