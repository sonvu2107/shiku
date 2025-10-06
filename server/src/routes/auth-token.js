/**
 * Temporary auth endpoints for development
 * Cac endpoint tam thoi cho viec phat trien
 */
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { generateAccessToken, generateRefreshToken } from "../middleware/refreshToken.js";

const tempRouter = express.Router();

/**
 * Tao JWT token cho user
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
function sign(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
}

/**
 * POST /login-token - Dang nhap va tra ve token
 * Endpoint tam thoi cho viec phat trien
 * @param {string} req.body.email - Email dang nhap
 * @param {string} req.body.password - Mat khau
 * @returns {Object} User info va JWT token
 */
tempRouter.post("/login-token", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Email hoac mat khau khong dung" });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Email hoac mat khau khong dung" });
    
    // Tao access token va refresh token
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    // Set httpOnly cookies for better security
    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
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
      token: accessToken,
      accessToken,
      refreshToken
    });
  } catch (e) { 
    next(e); 
  }
});

/**
 * POST /register-token - Dang ky va tra ve token
 * Endpoint tam thoi cho viec phat trien
 * @param {string} req.body.name - Ten nguoi dung
 * @param {string} req.body.email - Email dang ky
 * @param {string} req.body.password - Mat khau
 * @returns {Object} User info va JWT token
 */
tempRouter.post("/register-token", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Vui long dien day du thong tin" });
    }
    
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ error: "Email nay da duoc dang ky" });
    }
    
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash });
    
    // Tao access token va refresh token
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    // Set httpOnly cookies for better security
    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
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
      token: accessToken,
      accessToken,
      refreshToken
    });
  } catch (e) { 
    next(e); 
  }
});

export default tempRouter;