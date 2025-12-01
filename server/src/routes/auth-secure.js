import { Router } from "express";
const router = Router();
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Cultivation from "../models/Cultivation.js";
import { sendEmail } from "../utils/sendEmail.js";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
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
  authLogger,
  logSecurityEvent,
  SECURITY_EVENTS,
  LOG_LEVELS
} from "../middleware/securityLogging.js";
import { buildCookieOptions } from "../utils/cookieOptions.js";
import { requestTimeout } from "../middleware/timeout.js";
import { progressiveAuthRateLimit, checkLockoutStatus } from "../middleware/progressiveRateLimit.js";
import { conditionalCaptchaMiddleware, getCaptchaConfig } from "../services/captchaService.js";

// Apply auth logging middleware
router.use(authLogger);

const ACCESS_TOKEN_MAX_AGE =
  ((Number(process.env.ACCESS_TOKEN_TTL_SECONDS) || 15 * 60) * 1000);
const REFRESH_TOKEN_MAX_AGE =
  ((Number(process.env.REFRESH_TOKEN_TTL_SECONDS) || 30 * 24 * 60 * 60) * 1000);

const accessCookieOptions = buildCookieOptions(ACCESS_TOKEN_MAX_AGE);
const refreshCookieOptions = buildCookieOptions(REFRESH_TOKEN_MAX_AGE);

/**
 * POST /register - Đăng ký tài khoản mới
 */
router.post("/register",
  validate(registerSchema, 'body'),
  async (req, res, next) => {
    try {
      const { name, email, password } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          error: "Email này đã được đăng ký",
          code: "EMAIL_EXISTS"
        });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await User.create({
        name: sanitizeHtml(name),
        email: email.toLowerCase(),
        password: hashedPassword,
        isOnline: true,
        lastSeen: new Date()
      });

      const tokens = await generateTokenPair(user);

      res.cookie("accessToken", tokens.accessToken, accessCookieOptions);
      res.cookie("refreshToken", tokens.refreshToken, refreshCookieOptions);

      logSecurityEvent(LOG_LEVELS.INFO, SECURITY_EVENTS.REGISTER_SUCCESS, {
        email: email,
        ip: req.ip
      }, req);

      // Access token trả về trong body để frontend lưu vào RAM
      // Refresh token KHÔNG trả về trong body (đã set trong httpOnly cookie)
      res.status(201).json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        accessToken: tokens.accessToken
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
 * 
 * Middleware:
 * - progressiveAuthRateLimit: Giới hạn tốc độ với exponential backoff
 * - conditionalCaptchaMiddleware: Yêu cầu CAPTCHA nếu đạt ngưỡng
 */
router.post("/login",
  progressiveAuthRateLimit,
  conditionalCaptchaMiddleware,
  validate(loginSchema, 'body'),
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // OPTIMIZATION: Use lean() to skip Mongoose document instantiation (~20-30ms faster)
      const user = await User.findOne({ email: email.toLowerCase() }).lean();
      if (!user) {
        const failureStatus = req.recordAuthFailure?.();
        
        logSecurityEvent(LOG_LEVELS.WARN, SECURITY_EVENTS.LOGIN_FAILED, {
          email: email,
          ip: req.ip,
          reason: "User not found",
          attempts: failureStatus?.attempts
        }, req);

        const currentStatus = checkLockoutStatus(req.ip);

        const response = {
          error: "Email hoặc mật khẩu không đúng",
          code: "INVALID_CREDENTIALS"
        };

        if (currentStatus.requiresCaptcha || failureStatus?.requiresCaptcha) {
          response.requiresCaptcha = true;
          response.message = "Bạn cần giải CAPTCHA để tiếp tục";
          const captchaConfig = getCaptchaConfig();
          if (captchaConfig.enabled) {
            response.captchaConfig = {
              siteKey: captchaConfig.siteKey,
              provider: captchaConfig.provider
            };
          }
        }

        return res.status(401).json(response);
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        const failureStatus = req.recordAuthFailure?.();
        
        logSecurityEvent(LOG_LEVELS.WARN, SECURITY_EVENTS.LOGIN_FAILED, {
          email: email,
          ip: req.ip,
          reason: "Invalid password",
          attempts: failureStatus?.attempts
        }, req);

        const currentStatus = checkLockoutStatus(req.ip);

        const response = {
          error: "Email hoặc mật khẩu không đúng",
          code: "INVALID_CREDENTIALS"
        };
        
        if (currentStatus.requiresCaptcha || failureStatus?.requiresCaptcha) {
          response.requiresCaptcha = true;
          response.message = "Bạn cần giải CAPTCHA để tiếp tục";
          const captchaConfig = getCaptchaConfig();
          if (captchaConfig.enabled) {
            response.captchaConfig = {
              siteKey: captchaConfig.siteKey,
              provider: captchaConfig.provider
            };
          }
        }

        return res.status(401).json(response);
      }

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

      req.resetAuthFailures?.();

      // OPTIMIZATION: Fire-and-forget updateOne - don't await non-critical update
      // This saves 20-50ms by not waiting for the write acknowledgment
      User.updateOne(
        { _id: user._id },
        { $set: { isOnline: true, lastSeen: new Date() } }
      ).exec().catch(err => console.error('Failed to update user online status:', err));

      const tokens = await generateTokenPair(user);

      res.cookie("accessToken", tokens.accessToken, accessCookieOptions);
      res.cookie("refreshToken", tokens.refreshToken, refreshCookieOptions);

      logSecurityEvent(LOG_LEVELS.INFO, SECURITY_EVENTS.LOGIN_SUCCESS, {
        email: email,
        userId: user._id,
        ip: req.ip
      }, req);

      // Access token trả về trong body để frontend lưu vào RAM
      // Refresh token KHÔNG trả về trong body (đã set trong httpOnly cookie)
      res.json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        accessToken: tokens.accessToken
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /refresh - Làm mới access token
 * 
 * Lấy refresh token từ body hoặc cookie, xác thực và tạo access token mới
 */
router.post("/refresh",
  refreshTokenLimiter,
  async (req, res, next) => {
    try {
      const { refreshToken } = req.body;
      const cookieRefreshToken = req.cookies?.refreshToken;
      const tokenToUse = refreshToken || cookieRefreshToken;

      if (!tokenToUse) {
        return res.status(400).json({
          error: "Refresh token là bắt buộc",
          code: "MISSING_REFRESH_TOKEN"
        });
      }

      try {
        const payload = jwt.verify(
          tokenToUse,
          process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET
        );

        if (payload.type !== 'refresh') {
          throw new Error("Invalid token type");
        }

        const user = await User.findById(payload.id).select("-password");
        if (!user) {
          throw new Error("User not found");
        }

        const newAccessToken = jwt.sign(
          {
            id: user._id,
            type: 'access',
            role: user.role
          },
          process.env.JWT_SECRET,
          { expiresIn: "15m" }
        );

        res.cookie("accessToken", newAccessToken, accessCookieOptions);

        res.json({
          accessToken: newAccessToken,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        });

      } catch (jwtError) {
        throw jwtError;
      }

    } catch (error) {
      const isProduction = process.env.NODE_ENV === "production";
      res.status(401).json({
        error: "Refresh token không hợp lệ",
        code: "INVALID_REFRESH_TOKEN",
        details: isProduction ? undefined : error.message
      });
    }
  }
);

/**
 * GET /session - Kiểm tra session hiện tại
 * @returns {Object} Session status
 */
router.get("/session",
  // Skip CSRF validation for session endpoint
  (req, res, next) => {
    req.csrfToken = () => 'skip-csrf';
    next();
  },
  async (req, res, next) => {
    try {

      // Lấy token từ cookie hoặc header
      let token = req.cookies?.accessToken;
      if (!token) {
        const header = req.headers.authorization || "";
        token = header.startsWith("Bearer ") ? header.slice(7) : null;
      }

      if (!token) {
        return res.json({ authenticated: false });
      }

      // Verify JWT token
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.id).select("-password");

      if (!user) {
        return res.json({ authenticated: false });
      }

      res.json({
        authenticated: true,
        user: {
          id: user._id,
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          bio: user.bio,
          avatarUrl: user.avatarUrl,
          isOnline: user.isOnline,
          isVerified: user.isVerified,
          lastSeen: user.lastSeen
        }
      });
    } catch (error) {
      res.json({ authenticated: false });
    }
  });

/**
 * POST /logout - Đăng xuất
 */
router.post("/logout",
  authRequired,
  async (req, res, next) => {
    try {
      if (req.token) {
        await logout({ accessToken: req.token });
      }

      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");

      if (req.user) {
        await User.findByIdAndUpdate(req.user._id, {
          isOnline: false,
          lastSeen: new Date()
        });
      }

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
  requestTimeout(15000), // 15 seconds timeout cho forgot-password
  validate(forgotPasswordSchema, 'body'),
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

      // Trả về response ngay lập tức để tránh timeout
      res.json({ message: "Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu!" });

      // Gửi email bất đồng bộ (không chờ response)
      setImmediate(async () => {
        try {
          const resetLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${resetToken}`;

          // Template email chuyên nghiệp
          const emailHtml = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Đặt lại mật khẩu Shiku</title>
  <!--[if mso]>
  <style type="text/css">
    table {border-collapse:collapse;border-spacing:0;margin:0;}
    div, td {padding:0;}
    div {margin:0 !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0; background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Shiku</h1>
              <p style="margin: 8px 0 0; color: #ffffff; font-size: 14px; opacity: 0.9;">Mạng xã hội của bạn</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 24px; font-weight: 600; line-height: 1.3;">Đặt lại mật khẩu</h2>
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Chào bạn,
              </p>
              <p style="margin: 0 0 30px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Shiku của bạn. Nhấn vào nút bên dưới để tạo mật khẩu mới:
              </p>
              
              <!-- Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 0 0 30px;">
                    <a href="${resetLink}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                      Đặt lại mật khẩu
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Alternative Link -->
              <p style="margin: 0 0 30px; color: #8a8a8a; font-size: 14px; line-height: 1.6;">
                Hoặc copy và dán link này vào trình duyệt:<br>
                <a href="${resetLink}" style="color: #667eea; text-decoration: none; word-break: break-all;">${resetLink}</a>
              </p>
              
              <!-- Warning -->
              <div style="padding: 20px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; margin: 30px 0;">
                <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;">
                  <strong>⚠️ Lưu ý:</strong> Link này chỉ có hiệu lực trong <strong>30 phút</strong>. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này. Tài khoản của bạn vẫn an toàn.
                </p>
              </div>
              
              <p style="margin: 30px 0 0; color: #8a8a8a; font-size: 14px; line-height: 1.6;">
                Nếu bạn gặp vấn đề, vui lòng liên hệ với chúng tôi qua email <a href="mailto:support@shiku.click" style="color: #667eea; text-decoration: none;">support@shiku.click</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 12px 12px; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 10px; color: #6c757d; font-size: 12px; text-align: center; line-height: 1.5;">
                © ${new Date().getFullYear()} Shiku. Tất cả quyền được bảo lưu.
              </p>
              <p style="margin: 0; color: #6c757d; font-size: 12px; text-align: center; line-height: 1.5;">
                Email này được gửi từ <strong>support@shiku.click</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

          await sendEmail({
            to: email,
            subject: "Đặt lại mật khẩu Shiku",
            html: emailHtml,
            timeout: 25000 // 25 seconds timeout
          });
        } catch (emailError) {
          console.error("[ERROR][AUTH-SECURE] Email sending failed:", emailError.message);
          // Không crash app nếu email fail
        }
      });

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
  validate(resetPasswordSchema, 'body'),
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
 * GET /me - Lấy thông tin user hiện tại
 * @returns {Object} User info
 */
router.get("/me",
  authRequired,
  async (req, res, next) => {
    try {
      // Log security event
      logSecurityEvent(LOG_LEVELS.INFO, SECURITY_EVENTS.ADMIN_ACTION, {
        action: 'get_current_user',
        userId: req.user._id,
        ip: req.ip
      }, req);

      // Lấy thông tin cultivation cơ bản nếu user chọn hiển thị cultivation badge
      let cultivationInfo = null;
      let cultivationCache = req.user.cultivationCache;
      
      // Luôn load cultivation để lấy equipped items
      const cultivation = await Cultivation.getOrCreate(req.user._id);
      if (cultivation) {
        cultivationInfo = {
          exp: cultivation.exp,
          realmLevel: cultivation.realmLevel,
          realmName: cultivation.realmName,
          equipped: cultivation.equipped
        };
        
        // Sync cultivationCache nếu chưa có hoặc khác
        const needsSync = !cultivationCache || 
            cultivationCache.realmLevel !== cultivation.realmLevel ||
            cultivationCache.exp !== cultivation.exp ||
            JSON.stringify(cultivationCache.equipped) !== JSON.stringify(cultivation.equipped);
            
        if (needsSync) {
          cultivationCache = {
            realmLevel: cultivation.realmLevel,
            realmName: cultivation.realmName,
            exp: cultivation.exp,
            equipped: {
              title: cultivation.equipped?.title || null,
              badge: cultivation.equipped?.badge || null,
              avatarFrame: cultivation.equipped?.avatarFrame || null
            }
          };
          // Update user's cultivationCache in background
          User.findByIdAndUpdate(req.user._id, { cultivationCache }).catch(err => 
            console.error('[AUTH] Error syncing cultivationCache:', err)
          );
        }
      }

      res.json({
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          bio: req.user.bio,
          nickname: req.user.nickname,
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
          displayBadgeType: req.user.displayBadgeType || 'role',
          cultivation: cultivationInfo,
          cultivationCache: cultivationCache,
          isOnline: req.user.isOnline,
          isVerified: req.user.isVerified,
          lastSeen: req.user.lastSeen,
          blockedUsers: req.user.blockedUsers || []
        }
      });
    } catch (error) {
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
      // Validate user exists
      if (!req.user) {
        return res.status(401).json({
          error: "User not authenticated",
          code: "USER_NOT_AUTHENTICATED"
        });
      }

      // Update user's last seen timestamp
      req.user.lastSeen = new Date();
      await req.user.save();

      // Log security event (only if logging is enabled)
      try {
        logSecurityEvent(LOG_LEVELS.INFO, SECURITY_EVENTS.ADMIN_ACTION, {
          action: 'heartbeat',
          userId: req.user._id,
          ip: req.ip
        }, req);
      } catch (logError) {
        // Don't fail heartbeat if logging fails
        console.warn("[WARN][AUTH-SECURE] Heartbeat logging failed:", logError.message);
      }

      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        userId: req.user._id,
        isOnline: true
      });
    } catch (error) {
      console.error("[ERROR][AUTH-SECURE] Heartbeat error:", error);
      res.status(500).json({
        error: "Heartbeat failed",
        code: "HEARTBEAT_ERROR",
        message: error.message
      });
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
        name, email, password, bio, nickname, birthday, gender, hobbies, avatarUrl,
        coverUrl, location, website, phone, profileTheme, profileLayout, useCoverImage,
        showEmail, showPhone, showBirthday, showLocation, showWebsite,
        showHobbies, showFriends, showPosts, displayBadgeType
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
      if (nickname !== undefined) req.user.nickname = sanitizeHtml(nickname);
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
      if (displayBadgeType !== undefined) req.user.displayBadgeType = displayBadgeType;

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
          nickname: req.user.nickname,
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
          displayBadgeType: req.user.displayBadgeType || 'role',
          cultivationCache: req.user.cultivationCache
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /captcha-config - Lấy cấu hình CAPTCHA cho frontend
 */
router.get("/captcha-config", (req, res) => {
  try {
    const config = getCaptchaConfig();
    res.json({
      success: true,
      data: {
        enabled: config.enabled,
        provider: config.provider,
        siteKey: config.siteKey
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Không thể lấy cấu hình CAPTCHA"
    });
  }
});

export default router;
