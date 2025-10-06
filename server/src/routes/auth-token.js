/**
 * Temporary auth endpoints for IP development
 * Các endpoint tạm thời cho việc phát triển với IP
 */
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { generateAccessToken, generateRefreshToken } from "../middleware/refreshToken.js";

const tempRouter = express.Router();

/**
 * Tạo JWT token cho user
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
function sign(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
}

/**
 * POST /login-token - Đăng nhập và trả về token
 * Endpoint tạm thời cho việc phát triển với IP
 * @param {string} req.body.email - Email đăng nhập
 * @param {string} req.body.password - Mật khẩu
 * @returns {Object} User info và JWT token
 */
tempRouter.post("/login-token", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });
    // Tạo access token và refresh token
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    // Set httpOnly cookies for better security
    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3 * 24 * 60 * 60 * 1000 // 3 days
    });
    
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
    
    res.json({ 
      user: { 
        _id: user._id, 
        id: user._id, // Keep backward compatibility
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
      token: accessToken, // Backward compatibility
      accessToken,
      refreshToken
    });
  } catch (e) { next(e); }
});

/**
 * POST /register-token - Đăng ký và trả về token
 * Endpoint tạm thời cho việc phát triển với IP
 * @param {string} req.body.name - Tên người dùng
 * @param {string} req.body.email - Email đăng ký
 * @param {string} req.body.password - Mật khẩu
 * @returns {Object} User info và JWT token
 */
tempRouter.post("/register-token", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "Vui lòng điền đầy đủ thông tin" });
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: "Email này đã được đăng ký" });
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash });
    // Tạo access token và refresh token
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    // Set httpOnly cookies for better security
    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3 * 24 * 60 * 60 * 1000 // 3 days
    });
    
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
    
    res.json({ 
      user: { 
        _id: user._id, 
        id: user._id, // Keep backward compatibility
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
      token: accessToken, // Backward compatibility
      accessToken,
      refreshToken
    });
  } catch (e) { next(e); }
});

export default tempRouter;
