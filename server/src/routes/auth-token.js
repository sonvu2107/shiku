/**
 * Temporary Auth Endpoints
 * 
 * Các endpoint tạm thời cho việc phát triển và tương thích ngược.
 * Endpoints này trả về token trong response body (legacy behavior).
 * 
 * @module auth-token
 */

import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { generateTokenPair, resetRateLimit } from "../middleware/jwtSecurity.js";
import { buildCookieOptions } from "../utils/cookieOptions.js";

const tempRouter = express.Router();

const ACCESS_TOKEN_MAX_AGE =
  (Number(process.env.ACCESS_TOKEN_TTL_SECONDS) || 15 * 60) * 1000;
const REFRESH_TOKEN_MAX_AGE =
  (Number(process.env.REFRESH_TOKEN_TTL_SECONDS) || 30 * 24 * 60 * 60) * 1000;

const accessCookieOptions = buildCookieOptions(ACCESS_TOKEN_MAX_AGE);
const refreshCookieOptions = buildCookieOptions(REFRESH_TOKEN_MAX_AGE);

/**
 * POST /login-token - Đăng nhập và trả về token
 * 
 * Endpoint tạm thời cho tương thích ngược.
 * Trả về access token trong response body (legacy behavior).
 * 
 * @param {string} req.body.email - Email đăng nhập
 * @param {string} req.body.password - Mật khẩu
 * @returns {Object} Thông tin user và JWT token
 */
tempRouter.post("/login-token", async (req, res, next) => {
  const startTime = Date.now();
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email và mật khẩu là bắt buộc!" });
    }
    
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: "Email hoặc mật khẩu không đúng!" });
    }
    
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: "Email hoặc mật khẩu không đúng!" });
    }

    res.clearCookie("token", buildCookieOptions(0));

    const tokens = await generateTokenPair(user);

    res.cookie("accessToken", tokens.accessToken, accessCookieOptions);
    res.cookie("refreshToken", tokens.refreshToken, refreshCookieOptions);

    const response = { 
      user: { 
        _id: user._id, 
        id: user._id,
        name: user.name, 
        email: user.email, 
        role: user.role,
        bio: user.bio,
        birthday: user.birthday,
        gender: user.gender,
        hobbies: user.hobbies,
        avatarUrl: user.avatarUrl,
        isOnline: user.isOnline,
        isVerified: user.isVerified,
        lastSeen: user.lastSeen
      },
      token: tokens.accessToken,
      accessToken: tokens.accessToken
    };
    
    const duration = Date.now() - startTime;
    resetRateLimit(req.ip);
    
    res.json(response);
  } catch (e) { 
    const duration = Date.now() - startTime;
    console.error("[ERROR][AUTH-TOKEN] Login error:", e, `(${duration}ms)`);
    next(e); 
  }
});

/**
 * POST /register-token - Đăng ký và trả về token
 * 
 * Endpoint tạm thời cho tương thích ngược.
 * Trả về access token trong response body (legacy behavior).
 * 
 * @param {string} req.body.name - Tên người dùng
 * @param {string} req.body.email - Email đăng ký
 * @param {string} req.body.password - Mật khẩu
 * @param {string} req.body.dateOfBirth - Ngày sinh (tùy chọn)
 * @returns {Object} Thông tin user và JWT token
 */
tempRouter.post("/register-token", async (req, res, next) => {
  const startTime = Date.now();
  try {
    const { name, email, password, dateOfBirth } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Vui lòng điền đầy đủ thông tin!" });
    }
    
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(400).json({ error: "Email này đã được đăng ký!" });
    }
    
    const hash = await bcrypt.hash(password, 10);
    const userData = { 
      name, 
      email: email.toLowerCase(), 
      password: hash,
      isOnline: true,
      lastSeen: new Date()
    };
    
    // Thêm ngày sinh nếu có
    if (dateOfBirth) {
      userData.birthday = dateOfBirth;
    }
    
    const user = await User.create(userData);
    
    res.clearCookie("token", buildCookieOptions(0));

    const tokens = await generateTokenPair(user);

    res.cookie("accessToken", tokens.accessToken, accessCookieOptions);
    res.cookie("refreshToken", tokens.refreshToken, refreshCookieOptions);

    const response = { 
      user: { 
        _id: user._id, 
        id: user._id,
        name: user.name, 
        email: user.email, 
        role: user.role,
        bio: user.bio,
        birthday: user.birthday,
        gender: user.gender,
        hobbies: user.hobbies,
        avatarUrl: user.avatarUrl,
        isOnline: user.isOnline,
        isVerified: user.isVerified,
        lastSeen: user.lastSeen
      },
      token: tokens.accessToken,
      accessToken: tokens.accessToken
    };
    
    const duration = Date.now() - startTime;
    resetRateLimit(req.ip);
    
    res.status(201).json(response);
  } catch (e) { 
    const duration = Date.now() - startTime;
    console.error("[ERROR][AUTH-TOKEN] Registration error:", e, `(${duration}ms)`);
    next(e); 
  }
});

/**
 * GET /me - Lấy thông tin user hiện tại
 * 
 * Endpoint tạm thời, sử dụng token từ cookie hoặc header.
 * 
 * @returns {Object} Thông tin user
 */
tempRouter.get("/me", async (req, res, next) => {
  try {
    let token = req.cookies?.token;
    if (!token) {
      const header = req.headers.authorization || "";
      token = header.startsWith("Bearer ") ? header.slice(7) : null;
    }
    
    if (!token) {
      return res.status(401).json({ error: "Vui lòng đăng nhập" });
    }
    
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select("-password");
    
    if (!user) {
      return res.status(401).json({ error: "Token không hợp lệ" });
    }
    
    res.json({
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        bio: user.bio,
        birthday: user.birthday,
        gender: user.gender,
        hobbies: user.hobbies,
        avatarUrl: user.avatarUrl,
        isOnline: user.isOnline,
        isVerified: user.isVerified,
        lastSeen: user.lastSeen,
        blockedUsers: user.blockedUsers || []
      }
    });
  } catch (error) {
    return res.status(401).json({ error: "Token không hợp lệ" });
  }
});

/**
 * POST /heartbeat - Heartbeat endpoint
 * 
 * Cập nhật trạng thái online và lastSeen của user.
 * 
 * @returns {Object} Trạng thái heartbeat
 */
tempRouter.post("/heartbeat", async (req, res, next) => {
  try {
    let token = req.cookies?.token;
    if (!token) {
      const header = req.headers.authorization || "";
      token = header.startsWith("Bearer ") ? header.slice(7) : null;
    }
    
    if (!token) {
      return res.status(401).json({ error: "Vui lòng đăng nhập" });
    }
    
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    
    if (!user) {
      return res.status(401).json({ error: "Token không hợp lệ" });
    }
    
    user.lastSeen = new Date();
    user.isOnline = true;
    await user.save();
    
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      userId: user._id,
      isOnline: true
    });
  } catch (error) {
    return res.status(401).json({ error: "Token không hợp lệ" });
  }
});

export default tempRouter;
