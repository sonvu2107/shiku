import { Router } from "express";
const router = Router();
import cryp      // Set cookies
      res.cookie("accessToken", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 3 * 24 * 60 * 60 * 1000 // 3 ngày
      }); "crypto";
import bcrypt from "bcryptjs";
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
  refreshTokenLimiter,
  authRequired
} from "../middleware/jwtSecurity.js";
import { 
  generateRefreshToken, 
  generateAccessToken,
  refreshAccessToken as refreshTokenHandler 
} from "../middleware/refreshToken.js";
import { 
  authLogger,
  logSecurityEvent,
  SECURITY_EVENTS,
  LOG_LEVELS 
} from "../middleware/securityLogging.js";

// Apply auth logging middleware
router.use(authLogger);

/**
 * POST /register - Đăng ký tài khoản mới
 * @param {string} req.body.name - Tên người dùng
 * @param {string} req.body.email - Email đăng ký
 * @param {string} req.body.password - Mật khẩu
 * @returns {Object} User info và tokens
 */
router.post("/register", 
  validate(registerSchema, 'body'),
  async (req, res, next) => {
    try {
      const { name, email, password } = req.body;
      
      // Kiểm tra email đã tồn tại
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ 
          error: "Email này đã được đăng ký",
          code: "EMAIL_EXISTS"
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);
      
      // Tạo user mới
      const user = await User.create({ 
        name: sanitizeHtml(name),
        email: email.toLowerCase(),
        password: hashedPassword,
        isOnline: true,
        lastSeen: new Date()
      });

      // Tạo token pair
      const tokens = generateTokenPair(user);

      // Set cookies
      res.cookie("accessToken", tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 3 * 24 * 60 * 60 * 1000 // 3 ngày
      });

      res.cookie("refreshToken", tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 ngày
      });

      // Log security event
      logSecurityEvent(LOG_LEVELS.INFO, SECURITY_EVENTS.REGISTER_SUCCESS, {
        email: email,
        ip: req.ip
      }, req);

      res.status(201).json({ 
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
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      });
    } catch (error) {
      // Log register failed
      logSecurityEvent(LOG_LEVELS.WARN, SECURITY_EVENTS.REGISTER_FAILED, {
        email: req.body?.email,
        ip: req.ip,
        error: error.message
      }, req);
      
      next(error);
    }
  }
);

/**
 * POST /login - Đăng nhập
 * @param {string} req.body.email - Email đăng nhập
 * @param {string} req.body.password - Mật khẩu
 * @returns {Object} User info và tokens
 */
router.post("/login", 
  validate(loginSchema, 'body'),
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      
      // Tìm user
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        // Log failed login attempt
        logSecurityEvent(LOG_LEVELS.WARN, SECURITY_EVENTS.LOGIN_FAILED, {
          email: email,
          ip: req.ip,
          reason: "User not found"
        }, req);
        
        return res.status(401).json({ 
          error: "Email hoặc mật khẩu không đúng",
          code: "INVALID_CREDENTIALS"
        });
      }

      // Kiểm tra password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        // Log failed login attempt
        logSecurityEvent(LOG_LEVELS.WARN, SECURITY_EVENTS.LOGIN_FAILED, {
          email: email,
          ip: req.ip,
          reason: "Invalid password"
        }, req);
        
        return res.status(401).json({ 
          error: "Email hoặc mật khẩu không đúng",
          code: "INVALID_CREDENTIALS"
        });
      }

      // Kiểm tra user có bị ban không
      if (user.isBanned) {
        logSecurityEvent(LOG_LEVELS.WARN, SECURITY_EVENTS.LOGIN_FAILED, {
          email: email,
          ip: req.ip,
          reason: "User banned"
        }, req);
        
        return res.status(403).json({ 
          error: "Tài khoản đã bị cấm",
          code: "USER_BANNED"
        });
      }

      // Cập nhật trạng thái online
      user.isOnline = true;
      user.lastSeen = new Date();
      await user.save();

      // Tạo token pair
      const tokens = generateTokenPair(user);

      // Set cookies
      res.cookie("accessToken", tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 3 * 24 * 60 * 60 * 1000 // 3 ngày
      });

      res.cookie("refreshToken", tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 ngày
      });

      // Log successful login
      logSecurityEvent(LOG_LEVELS.INFO, SECURITY_EVENTS.LOGIN_SUCCESS, {
        email: email,
        userId: user._id,
        ip: req.ip
      }, req);

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
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /refresh - Refresh access token
 * @param {string} req.body.refreshToken - Refresh token
 * @returns {Object} New access token
 */
router.post("/refresh", 
  refreshTokenLimiter,
  async (req, res, next) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ 
          error: "Refresh token là bắt buộc",
          code: "MISSING_REFRESH_TOKEN"
        });
      }

      // Refresh access token
      const result = await refreshAccessToken(refreshToken);

      // Set new access token cookie
      res.cookie("accessToken", result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 3 * 24 * 60 * 60 * 1000 // 3 ngày
      });

      // Log refresh event
      logSecurityEvent(LOG_LEVELS.INFO, SECURITY_EVENTS.TOKEN_REFRESH, {
        userId: result.user.id,
        ip: req.ip
      }, req);

      res.json({ 
        accessToken: result.accessToken,
        user: result.user
      });
    } catch (error) {
      logSecurityEvent(LOG_LEVELS.WARN, SECURITY_EVENTS.TOKEN_REFRESH, {
        error: error.message,
        ip: req.ip
      }, req);
      
      res.status(401).json({ 
        error: "Refresh token không hợp lệ",
        code: "INVALID_REFRESH_TOKEN"
      });
    }
  }
);

/**
 * POST /logout - Đăng xuất
 * @returns {Object} Thông báo logout thành công
 */
router.post("/logout", 
  authRequired,
  async (req, res, next) => {
    try {
      // Blacklist current token
      if (req.token) {
        logout(req.token);
      }

      // Clear cookies
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");

      // Cập nhật trạng thái offline
      if (req.user) {
        await User.findByIdAndUpdate(req.user._id, {
          isOnline: false,
          lastSeen: new Date()
        });
      }

      // Log logout event
      logSecurityEvent(LOG_LEVELS.INFO, SECURITY_EVENTS.LOGOUT, {
        userId: req.user?.id,
        ip: req.ip
      }, req);

      res.json({ message: "Đăng xuất thành công" });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /forgot-password - Quên mật khẩu
 * @param {string} req.body.email - Email cần reset password
 * @returns {Object} Thông báo đã gửi email
 */
router.post("/forgot-password", 
  validate(loginSchema, 'body'),
  async (req, res, next) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email: email.toLowerCase() });
      
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
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /reset-password - Đặt lại mật khẩu qua token
 * @param {string} req.body.token - Token reset password
 * @param {string} req.body.password - Mật khẩu mới
 * @returns {Object} Thông báo reset thành công
 */
router.post("/reset-password", 
  validate(registerSchema, 'body'),
  async (req, res, next) => {
    try {
      const { token, password } = req.body;
      
      const user = await User.findOne({ 
        resetPasswordToken: token, 
        resetPasswordExpires: { $gt: Date.now() } 
      });
      
      if (!user) {
        return res.status(400).json({ 
          error: "Token không hợp lệ hoặc đã hết hạn",
          code: "INVALID_TOKEN"
        });
      }

      // Hash password mới
      const hashedPassword = await bcrypt.hash(password, 12);
      
      // Cập nhật password và xóa token
      user.password = hashedPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      // Log security event
      logSecurityEvent(LOG_LEVELS.INFO, SECURITY_EVENTS.PASSWORD_RESET, {
        userId: user._id,
        ip: req.ip,
        action: "password_reset_completed"
      }, req);

      res.json({ message: "Đã đặt lại mật khẩu thành công!" });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /update-profile - Cập nhật thông tin cá nhân
 * @param {Object} req.body - Thông tin cần cập nhật
 * @returns {Object} User info đã cập nhật
 */
router.put("/update-profile", 
  authRequired,
  validate(updateProfileSchema, 'body'),
  async (req, res, next) => {
    try {
      const { 
        name, email, password, bio, birthday, gender, hobbies, avatarUrl,
        coverUrl, location, website, phone, profileTheme, profileLayout, useCoverImage,
        showEmail, showPhone, showBirthday, showLocation, showWebsite, 
        showHobbies, showFriends, showPosts
      } = req.body;
      
      // Kiểm tra email có bị trùng không
      if (email && email !== req.user.email) {
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
          return res.status(400).json({ 
            error: "Email này đã được sử dụng",
            code: "EMAIL_EXISTS"
          });
        }
      }

      // Cập nhật thông tin user
      if (name) req.user.name = sanitizeHtml(name);
      if (email) req.user.email = email.toLowerCase();
      if (bio) req.user.bio = sanitizeHtml(bio);
      if (birthday) req.user.birthday = birthday;
      if (gender) req.user.gender = gender;
      if (hobbies) req.user.hobbies = sanitizeHtml(hobbies);
      if (avatarUrl) req.user.avatarUrl = avatarUrl;
      if (coverUrl !== undefined) req.user.coverUrl = coverUrl;
      if (location) req.user.location = sanitizeHtml(location);
      if (website) req.user.website = website;
      if (phone) req.user.phone = phone;
      if (profileTheme) req.user.profileTheme = profileTheme;
      if (profileLayout) req.user.profileLayout = profileLayout;
      if (useCoverImage !== undefined) {
        req.user.useCoverImage = useCoverImage;
      }
      if (showEmail !== undefined) req.user.showEmail = showEmail;
      if (showPhone !== undefined) req.user.showPhone = showPhone;
      if (showBirthday !== undefined) req.user.showBirthday = showBirthday;
      if (showLocation !== undefined) req.user.showLocation = showLocation;
      if (showWebsite !== undefined) req.user.showWebsite = showWebsite;
      if (showHobbies !== undefined) req.user.showHobbies = showHobbies;
      if (showFriends !== undefined) req.user.showFriends = showFriends;
      if (showPosts !== undefined) req.user.showPosts = showPosts;
      
      if (password) {
        req.user.password = await bcrypt.hash(password, 12);
      }

      await req.user.save();

      // Log security event
      logSecurityEvent(LOG_LEVELS.INFO, SECURITY_EVENTS.ADMIN_ACTION, {
        action: "profile_updated",
        userId: req.user._id,
        ip: req.ip
      }, req);

      res.json({ 
        user: { 
          id: req.user._id, 
          name: req.user.name, 
          email: req.user.email, 
          role: req.user.role,
          bio: req.user.bio,
          birthday: req.user.birthday,
          gender: req.user.gender,
          hobbies: req.user.hobbies,
          avatarUrl: req.user.avatarUrl,
          coverUrl: req.user.coverUrl,
          location: req.user.location,
          website: req.user.website,
          phone: req.user.phone,
          profileTheme: req.user.profileTheme,
          profileLayout: req.user.profileLayout,
          showEmail: req.user.showEmail,
          showPhone: req.user.showPhone,
          showBirthday: req.user.showBirthday,
          showLocation: req.user.showLocation,
          showWebsite: req.user.showWebsite,
          showHobbies: req.user.showHobbies,
          showFriends: req.user.showFriends,
          showPosts: req.user.showPosts,
          showEvents: req.user.showEvents
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /me - Lấy thông tin user hiện tại
 * @returns {Object} User info
 */
router.get("/me", 
  authRequired,
  async (req, res, next) => {
    try {
      res.json({ 
        user: { 
          _id: req.user._id, 
          name: req.user.name, 
          email: req.user.email, 
          role: req.user.role,
          bio: req.user.bio,
          birthday: req.user.birthday,
          gender: req.user.gender,
          hobbies: req.user.hobbies,
          avatarUrl: req.user.avatarUrl,
          coverUrl: req.user.coverUrl,
          location: req.user.location,
          website: req.user.website,
          phone: req.user.phone,
          profileTheme: req.user.profileTheme,
          profileLayout: req.user.profileLayout,
          useCoverImage: req.user.useCoverImage,
          showEmail: req.user.showEmail,
          showPhone: req.user.showPhone,
          showBirthday: req.user.showBirthday,
          showLocation: req.user.showLocation,
          showWebsite: req.user.showWebsite,
          showHobbies: req.user.showHobbies,
          showFriends: req.user.showFriends,
          showPosts: req.user.showPosts,
          showEvents: req.user.showEvents,
          isOnline: req.user.isOnline,
          isVerified: req.user.isVerified,
          lastSeen: req.user.lastSeen,
          blockedUsers: req.user.blockedUsers,
          friends: req.user.friends
        }
      });
    } catch (error) {``
      next(error);
    }
  }
);

/**
 * POST /heartbeat - Heartbeat endpoint for frontend monitoring
 * @returns {Object} Heartbeat status
 */
router.post("/heartbeat", 
  authRequired,
  async (req, res, next) => {
    try {
      // Update user's last seen timestamp
      req.user.lastSeen = new Date();
      await req.user.save();

      res.json({ 
        status: "ok",
        timestamp: new Date().toISOString(),
        userId: req.user._id,
        isOnline: true
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /refresh-token - Refresh access token using refresh token
 * @returns {Object} New access token và user info
 */
router.post("/refresh-token", 
  refreshTokenLimiter,
  refreshTokenHandler
);

export default router;