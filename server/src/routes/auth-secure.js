import { Router } from "express";
const router = Router();
import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Cultivation from "../models/Cultivation.js";
import WelcomeService from "../services/WelcomeService.js";
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

      // Capture variables cho closure
      const userEmail = email;
      const userName = name;
      console.log("[DEBUG][AUTH-SECURE] Registration successful, scheduling welcome email for:", userEmail);

      // Gửi welcome email bất đồng bộ (không chờ response)
      setImmediate(async () => {
        console.log("[DEBUG][AUTH-SECURE] setImmediate triggered for:", userEmail);
        try {
          const logoUrl = "https://shiku.click/assets/shiku-logo.svg";
          const loginLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/login`;
          const profileLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/settings`;

          const welcomeEmailHtml = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chào mừng đến với Shiku</title>
    <style>
        body { margin: 0; padding: 0; min-width: 100%; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; background-color: #f9f9f9; }
        table { border-spacing: 0; border-collapse: collapse; }
        td { padding: 0; }
        img { border: 0; }
        
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; }
            .content-padding { padding: 20px !important; }
            .button { width: 100% !important; display: block !important; text-align: center !important; }
            .col-split { display: block !important; width: 100% !important; padding-bottom: 20px; }
        }
    </style>
</head>
<body style="background-color: #f9f9f9; margin: 0; padding: 0;">

    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; padding: 40px 0;">
        <tr>
            <td align="center">
                
                <table class="container" width="600" border="0" cellpadding="0" cellspacing="0" style="background-color: #ffffff; max-width: 600px; width: 100%; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    
                    <!-- HEADER: Logo -->
                    <tr>
                        <td align="center" style="padding: 40px 0 20px 0;">
                            <img src="${logoUrl}" alt="Shiku" width="120" style="display: block; color: #000000; font-weight: bold;">
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding: 0 40px;">
                            <div style="height: 1px; width: 100%; background-color: #eeeeee;"></div>
                        </td>
                    </tr>

                    <!-- BODY -->
                    <tr>
                        <td class="content-padding" style="padding: 40px 40px 30px 40px; text-align: left; color: #1a1a1a;">
                            
                            <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; color: #000000;">
                                Chào mừng bạn đến với Shiku!
                            </h1>

                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #444444;">
                                Xin chào <strong>${sanitizeHtml(userName)}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #444444;">
                                Rất vui vì bạn đã trở thành một phần của cộng đồng Shiku. Tài khoản của bạn đã được kích hoạt và sẵn sàng để sử dụng.
                            </p>
                            
                            <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #444444;">
                                Tại Shiku, chúng tôi tin vào sự kết nối và chia sẻ. Hãy bắt đầu khám phá ngay!
                            </p>

                            <!-- CTA BUTTON -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 30px;">
                                <tr>
                                    <td align="left">
                                        <a href="${loginLink}" class="button" target="_blank" style="background-color: #000000; color: #ffffff; text-decoration: none; padding: 16px 32px; font-size: 16px; font-weight: bold; display: inline-block; border-radius: 2px;">
                                            Truy cập tài khoản ngay &rarr;
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- 3 CỘT TÍNH NĂNG -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid #eeeeee; padding-top: 30px;">
                                <tr>
                                    <td style="padding-top: 30px;">
                                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td class="col-split" valign="top" width="33%" style="padding-right: 10px;">
                                                    <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold;">01. Kết nối</h3>
                                                    <p style="margin: 0; font-size: 13px; color: #666666; line-height: 1.5;">Tìm kiếm và kết nối với bạn bè mới.</p>
                                                </td>
                                                <td class="col-split" valign="top" width="33%" style="padding-right: 10px;">
                                                    <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold;">02. Chia sẻ</h3>
                                                    <p style="margin: 0; font-size: 13px; color: #666666; line-height: 1.5;">Đăng bài, chia sẻ khoảnh khắc đáng nhớ.</p>
                                                </td>
                                                <td class="col-split" valign="top" width="33%">
                                                    <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold;">03. Tu luyện</h3>
                                                    <p style="margin: 0; font-size: 13px; color: #666666; line-height: 1.5;">Tham gia hệ thống tu luyện độc đáo.</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                        </td>
                    </tr>

                    <!-- FOOTER -->
                    <tr>
                        <td style="background-color: #fafafa; padding: 30px 40px; text-align: left; border-top: 1px solid #eeeeee;">
                            <p style="margin: 0 0 10px 0; font-size: 12px; color: #999999; line-height: 1.5;">
                                Hãy cập nhật thông tin cá nhân để trải nghiệm tốt hơn.
                            </p>
                            <p style="margin: 0 0 20px 0; font-size: 12px; line-height: 1.5;">
                                <a href="${profileLink}" style="color: #000000; text-decoration: underline; margin-right: 10px;">Cập nhật hồ sơ</a>
                                <a href="mailto:support@shiku.click" style="color: #000000; text-decoration: underline;">Liên hệ hỗ trợ</a>
                            </p>
                            
                            <div style="height: 1px; width: 100%; background-color: #e0e0e0; margin-bottom: 20px;"></div>

                            <p style="margin: 0; font-size: 12px; color: #bbbbbb; text-align: center;">
                                © ${new Date().getFullYear()} Shiku. Mạng xã hội của bạn.<br>
                                Bạn nhận được email này vì đã đăng ký tài khoản tại Shiku.
                            </p>
                        </td>
                    </tr>

                </table>

            </td>
        </tr>
    </table>

</body>
</html>`;

          console.log("[INFO][AUTH-SECURE] Sending welcome email to:", userEmail);
          await sendEmail({
            to: userEmail,
            subject: "Chào mừng đến với Shiku!",
            html: welcomeEmailHtml,
            timeout: 25000
          });
          console.log("[INFO][AUTH-SECURE] Welcome email sent successfully to:", userEmail);
        } catch (emailError) {
          console.error("[ERROR][AUTH-SECURE] Welcome email sending failed:", emailError.message, emailError);
        }

        // ==================== WELCOME SERVICE ====================
        try {
          // Đánh dấu firstLoginAt
          await WelcomeService.ensureFirstLogin(user._id);

          // Tạo welcome notification
          await WelcomeService.createWelcomeNotification(user._id);

          // Broadcast new member (throttled 5 phút)
          await WelcomeService.broadcastNewMember({
            io: req.app.get("io"),
            newUser: user
          });

          console.log("[INFO][AUTH-SECURE] Welcome service completed for:", userEmail);
        } catch (welcomeError) {
          console.error("[ERROR][AUTH-SECURE] Welcome service error:", welcomeError.message);
        }
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

      // Get role data with permissions for admin dashboard access
      let roleData = null;
      if (user.role && user.role !== 'user') {
        const Role = (await import("../models/Role.js")).default;
        const roleDoc = await Role.findOne({ name: user.role, isActive: true });
        if (roleDoc) {
          roleData = {
            name: roleDoc.name,
            displayName: roleDoc.displayName,
            color: roleDoc.color,
            iconUrl: roleDoc.iconUrl,
            permissions: roleDoc.permissions || {}
          };
        }
      }

      res.json({
        authenticated: true,
        user: {
          id: user._id,
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          roleData: roleData,
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
 * Không yêu cầu auth hợp lệ - luôn clear cookies
 */
router.post("/logout",
  async (req, res, next) => {
    try {
      // Cố gắng lấy token từ request (không bắt buộc phải valid)
      const token = req.cookies?.accessToken ||
        req.headers.authorization?.replace('Bearer ', '');

      // Nếu có token, cố gắng logout trên server (invalidate token)
      if (token) {
        try {
          await logout({ accessToken: token });
        } catch (logoutErr) {
          // Silent - token có thể đã invalid
        }
      }

      // Luôn clear cookies với đúng options (quan trọng cho production)
      const clearOptions = buildCookieOptions(0);
      res.clearCookie("accessToken", clearOptions);
      res.clearCookie("refreshToken", clearOptions);

      // Cố gắng update user status nếu có thể decode token
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
          if (decoded?.id) {
            await User.findByIdAndUpdate(decoded.id, {
              isOnline: false,
              lastSeen: new Date()
            });
          }
        } catch (decodeErr) {
          // Silent - token có thể hoàn toàn invalid
        }
      }

      logSecurityEvent(LOG_LEVELS.INFO, SECURITY_EVENTS.LOGOUT, {
        userId: req.user?.id || 'unknown',
        ip: req.ip
      }, req);

      res.json({ message: "Đăng xuất thành công" });
    } catch (error) {
      // Even on error, try to clear cookies
      try {
        const clearOptions = buildCookieOptions(0);
        res.clearCookie("accessToken", clearOptions);
        res.clearCookie("refreshToken", clearOptions);
      } catch (e) { }

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

          // Template email chuyên nghiệp - Light theme với logo
          const logoUrl = "https://shiku.click/assets/shiku-logo.svg";
          const emailHtml = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Đặt lại mật khẩu - Shiku</title>
    <style>
        body { margin: 0; padding: 0; min-width: 100%; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; background-color: #f9f9f9; }
        table { border-spacing: 0; border-collapse: collapse; }
        td { padding: 0; }
        img { border: 0; }
        
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; }
            .content-padding { padding: 20px !important; }
            .button { width: 100% !important; display: block !important; text-align: center !important; }
        }
    </style>
</head>
<body style="background-color: #f9f9f9; margin: 0; padding: 0;">

    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; padding: 40px 0;">
        <tr>
            <td align="center">
                
                <table class="container" width="600" border="0" cellpadding="0" cellspacing="0" style="background-color: #ffffff; max-width: 600px; width: 100%; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    
                    <!-- HEADER: Logo -->
                    <tr>
                        <td align="center" style="padding: 40px 0 20px 0;">
                            <img src="${logoUrl}" alt="Shiku" width="120" style="display: block; color: #000000; font-weight: bold;">
                        </td>
                    </tr>

                    <!-- DIVIDER -->
                    <tr>
                        <td align="center" style="padding: 0 40px;">
                            <div style="height: 1px; width: 100%; background-color: #eeeeee;"></div>
                        </td>
                    </tr>

                    <!-- BODY -->
                    <tr>
                        <td class="content-padding" style="padding: 40px 40px 30px 40px; text-align: left; color: #1a1a1a;">
                            
                            <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; color: #000000;">
                                Đặt lại mật khẩu của bạn
                            </h1>

                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #444444;">
                                Xin chào,
                            </p>
                            
                            <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #444444;">
                                Chúng tôi nhận được yêu cầu khôi phục mật khẩu cho tài khoản Shiku của bạn. Đừng lo lắng, chuyện này xảy ra thường xuyên mà. Bạn chỉ cần bấm vào nút bên dưới để tạo mật khẩu mới.
                            </p>

                            <!-- BUTTON -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="left">
                                        <a href="${resetLink}" class="button" target="_blank" style="background-color: #000000; color: #ffffff; text-decoration: none; padding: 16px 32px; font-size: 16px; font-weight: bold; display: inline-block; border-radius: 2px;">
                                            Tạo mật khẩu mới &rarr;
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 30px 0 0 0; font-size: 14px; line-height: 1.5; color: #888888;">
                                <em>Liên kết này sẽ hết hạn sau <strong>30 phút</strong>. Nếu bạn không yêu cầu thay đổi, cứ bỏ qua email này nhé, tài khoản của bạn vẫn an toàn.</em>
                            </p>
                        </td>
                    </tr>

                    <!-- FOOTER -->
                    <tr>
                        <td style="background-color: #fafafa; padding: 30px 40px; text-align: left; border-top: 1px solid #eeeeee;">
                            <p style="margin: 0 0 10px 0; font-size: 12px; color: #999999; line-height: 1.5;">
                                Nếu nút bên trên không hoạt động, hãy copy đường dẫn này dán vào trình duyệt:
                            </p>
                            <p style="margin: 0 0 20px 0; font-size: 12px; line-height: 1.5; word-break: break-all;">
                                <a href="${resetLink}" style="color: #000000; text-decoration: underline;">${resetLink}</a>
                            </p>
                            
                            <div style="height: 1px; width: 100%; background-color: #e0e0e0; margin-bottom: 20px;"></div>

                            <p style="margin: 0; font-size: 12px; color: #bbbbbb; text-align: center;">
                                © ${new Date().getFullYear()} Shiku. Mạng xã hội của bạn.<br>
                                Email này được gửi tự động, vui lòng không trả lời.
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
              avatarFrame: cultivation.equipped?.avatarFrame || null,
              profileEffect: cultivation.equipped?.profileEffect || null
            }
          };
          // Update user's cultivationCache in background
          User.findByIdAndUpdate(req.user._id, { cultivationCache }).catch(err =>
            console.error('[AUTH] Error syncing cultivationCache:', err)
          );
        }
      }

      // Get role data with permissions for admin dashboard access
      let roleData = null;
      if (req.user.role && req.user.role !== 'user') {
        const Role = (await import("../models/Role.js")).default;
        const roleDoc = await Role.findOne({ name: req.user.role, isActive: true });
        if (roleDoc) {
          roleData = {
            name: roleDoc.name,
            displayName: roleDoc.displayName,
            color: roleDoc.color,
            iconUrl: roleDoc.iconUrl,
            permissions: roleDoc.permissions || {}
          };
        }
      }

      res.json({
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          roleData: roleData,
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
          displayBadgeType: req.user.displayBadgeType || 'none',
          cultivation: cultivationInfo,
          cultivationCache: cultivationCache,
          isOnline: req.user.isOnline,
          isVerified: req.user.isVerified,
          lastSeen: req.user.lastSeen,
          blockedUsers: req.user.blockedUsers || [],
          // Profile Personalization
          profileAccentColor: req.user.profileAccentColor,
          profileSongUrl: req.user.profileSongUrl,
          featuredPosts: req.user.featuredPosts,
          statusUpdate: req.user.statusUpdate
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
        showHobbies, showFriends, showPosts, displayBadgeType,
        // Profile Personalization fields
        profileSongUrl, statusUpdate
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

      // Cập nhật thông tin user - cho phép xóa bằng cách gửi chuỗi rỗng
      if (name) req.user.name = sanitizeHtml(name);
      if (email) req.user.email = email.toLowerCase();

      // Các field có thể xóa (chấp nhận chuỗi rỗng)
      if (bio !== undefined) req.user.bio = bio ? sanitizeHtml(bio) : "";
      if (nickname !== undefined) req.user.nickname = nickname ? sanitizeHtml(nickname) : "";
      if (birthday !== undefined) req.user.birthday = birthday || null;
      if (gender !== undefined) req.user.gender = gender || "";
      if (hobbies !== undefined) req.user.hobbies = hobbies ? sanitizeHtml(hobbies) : "";
      if (location !== undefined) req.user.location = location ? sanitizeHtml(location) : "";
      if (website !== undefined) req.user.website = website || "";
      if (phone !== undefined) req.user.phone = phone || "";

      // Các field không thể xóa (chỉ update nếu có giá trị)
      if (avatarUrl) req.user.avatarUrl = avatarUrl;
      if (coverUrl !== undefined) req.user.coverUrl = coverUrl;
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

      // Profile Personalization fields
      // Profile Personalization fields
      if (profileSongUrl !== undefined) {
        // Allow empty string to clear, or validate Spotify URL
        if (profileSongUrl === '' || profileSongUrl.startsWith('https://open.spotify.com/')) {
          req.user.profileSongUrl = profileSongUrl;
        }
      }
      if (statusUpdate !== undefined) {
        req.user.statusUpdate = {
          text: statusUpdate.text || '',
          emoji: statusUpdate.emoji || '',
          updatedAt: new Date()
        };
      }

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
          displayBadgeType: req.user.displayBadgeType || 'none',
          cultivationCache: req.user.cultivationCache,
          // Profile Personalization
          profileAccentColor: req.user.profileAccentColor,
          profileSongUrl: req.user.profileSongUrl,
          featuredPosts: req.user.featuredPosts,
          statusUpdate: req.user.statusUpdate
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
