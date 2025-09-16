import { Router } from "express";
const router = Router();
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { sendEmail } from "../utils/sendEmail.js";
import { 
  registerSchema, 
  loginSchema, 
  updateProfileSchema,
  validate,
  sanitizeHtml 
} from "../middleware/validation.js";
import { 
  generateTokenPair, 
  refreshAccessToken, 
  logout,
  refreshTokenLimiter 
} from "../middleware/jwtSecurity.js";
import { 
  authLogger,
  logSecurityEvent,
  SECURITY_EVENTS,
  LOG_LEVELS 
} from "../middleware/securityLogging.js";

/**
 * POST /forgot-password - Quên mật khẩu
 * Gửi email reset password cho user
 * @param {string} req.body.email - Email cần reset password
 * @returns {Object} Thông báo đã gửi email
 */
router.post("/forgot-password", 
  validate(loginSchema, 'body'),
  async (req, res, next) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });
      
      // Luôn trả về success để tránh email enumeration
      if (!user) {
        return res.json({ message: "Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu!" });
      }

      // Tạo mã token reset với thời hạn 30 phút
      const resetToken = crypto.randomBytes(32).toString("hex");
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = Date.now() + 1000 * 60 * 30;
      await user.save();

      // Log security event
      logSecurityEvent(LOG_LEVELS.INFO, SECURITY_EVENTS.PASSWORD_RESET, {
        email: email,
        ip: req.ip
      }, req);

      // Gửi email reset password
      const resetLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${resetToken}`;
      await sendEmail({
        to: email,
        subject: "Đặt lại mật khẩu Shiku",
        html: `<p>Chào bạn,<br/>Bạn vừa yêu cầu đặt lại mật khẩu. Nhấn vào link bên dưới để đặt lại mật khẩu mới:</p>
        <p><a href='${resetLink}'>Đặt lại mật khẩu</a></p>
        <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>`
      });
      
      res.json({ message: "Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu!" });
    } catch (e) { next(e); }
  }
);

/**
 * POST /reset-password - Đặt lại mật khẩu qua token
 * Reset password với token từ email
 * @param {string} req.body.token - Token reset password
 * @param {string} req.body.password - Mật khẩu mới
 * @returns {Object} Thông báo reset thành công
 */
router.post("/reset-password", async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: "Thiếu thông tin" });
    const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ error: "Token không hợp lệ hoặc đã hết hạn" });
    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.json({ message: "Đã đặt lại mật khẩu thành công!" });
  } catch (e) { next(e); }
});
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import FriendRequest from "../models/FriendRequest.js";
import { authRequired } from "../middleware/auth.js";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";

const upload = multer({ dest: "tmp/" });

// Update profile
router.post("/update-profile", authRequired, upload.single("avatar"), async (req, res, next) => {
  try {
    const { name, email, birthday, gender, hobbies, password } = req.body;
    let avatarUrl = req.body.avatarUrl || req.user.avatarUrl;
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, { folder: "avatars" });
      avatarUrl = result.secure_url;
    }
    req.user.name = name || req.user.name;
    req.user.email = email || req.user.email;
    req.user.birthday = birthday || req.user.birthday;
    req.user.gender = gender || req.user.gender;
    req.user.hobbies = hobbies || req.user.hobbies;
    req.user.avatarUrl = avatarUrl;
    if (password) {
      req.user.password = await bcrypt.hash(password, 10);
    }
    await req.user.save();
    res.json({ user: req.user });
  } catch (e) { next(e); }
});

function sign(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "Vui lòng điền đầy đủ thông tin" });
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: "Email này đã được đăng ký" });
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ 
      name, 
      email, 
      password: hash,
      isOnline: true,
      lastSeen: new Date()
    });
    const token = sign(user);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      domain: process.env.NODE_ENV === "production" ? process.env.COOKIE_DOMAIN : undefined,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (e) { next(e); }
});


router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });
    
    // Cập nhật trạng thái online khi login
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();
    
    const token = sign(user);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      domain: process.env.NODE_ENV === "production" ? process.env.COOKIE_DOMAIN : undefined,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (e) { next(e); }
});

router.post("/logout", async (req, res) => {
  // Cập nhật trạng thái offline khi logout
  if (req.user && req.user._id) {
    try {
      await User.findByIdAndUpdate(req.user._id, {
        isOnline: false,
        lastSeen: new Date()
      });
    } catch (e) {
      console.error("Error updating user offline status:", e);
    }
  }
  
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    domain: process.env.NODE_ENV === "production" ? process.env.COOKIE_DOMAIN : undefined
  });
  res.json({ message: "Đăng xuất thành công" });
});

router.get("/me", authRequired, async (req, res) => {
  return res.json({ user: req.user });
});

/**
 * POST /heartbeat - Cập nhật trạng thái online của user
 * Được gọi định kỳ để duy trì trạng thái online
 * @param {boolean} req.body.isOnline - Trạng thái online (optional, default: true)
 * @returns {Object} Thông báo cập nhật thành công
 */
router.post("/heartbeat", authRequired, async (req, res) => {
  try {
    const { isOnline = true } = req.body;
    await User.findByIdAndUpdate(req.user._id, {
      isOnline: isOnline,
      lastSeen: new Date()
    });
    res.json({ message: "Heartbeat updated" });
  } catch (e) {
    res.status(500).json({ error: "Failed to update heartbeat" });
  }
});

// Get user profile by ID (public info only)
router.get("/user/:userId", authRequired, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id.toString();
    
    const user = await User.findById(userId)
      .select('name avatarUrl birthday gender hobbies createdAt friends')
      .populate('friends', 'name avatarUrl');
    
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    // Check friendship status
    const isFriend = user.friends.some(friend => friend._id.toString() === currentUserId);
    
    // Check pending friend requests
    const sentRequest = await FriendRequest.findOne({
      from: currentUserId,
      to: userId,
      status: 'pending'
    });
    
    const receivedRequest = await FriendRequest.findOne({
      from: userId,
      to: currentUserId,
      status: 'pending'
    });

    let friendshipStatus = 'none';
    if (isFriend) {
      friendshipStatus = 'friends';
    } else if (sentRequest) {
      friendshipStatus = 'request_sent';
    } else if (receivedRequest) {
      friendshipStatus = 'request_received';
    }

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        birthday: user.birthday,
        gender: user.gender,
        hobbies: user.hobbies,
        createdAt: user.createdAt,
        friendsCount: user.friends.length
      },
      friendshipStatus,
      requestId: sentRequest?._id || receivedRequest?._id
    });
  } catch (error) {
    next(error);
  }
});

export default router;