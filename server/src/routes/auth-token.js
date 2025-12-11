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

    // Capture variables cho closure
    const userEmail = email;
    const userName = name;
    console.log("[DEBUG][AUTH-TOKEN] Registration successful, scheduling welcome email for:", userEmail);

    // Gửi welcome email bất đồng bộ
    setImmediate(async () => {
      console.log("[DEBUG][AUTH-TOKEN] setImmediate triggered for:", userEmail);
      try {
        const { sendEmail } = await import("../utils/sendEmail.js");
        const sanitizeHtml = (await import("sanitize-html")).default;

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

        console.log("[INFO][AUTH-TOKEN] Sending welcome email to:", userEmail);
        await sendEmail({
          to: userEmail,
          subject: "Chào mừng đến với Shiku!",
          html: welcomeEmailHtml,
          timeout: 25000
        });
        console.log("[INFO][AUTH-TOKEN] Welcome email sent successfully to:", userEmail);
      } catch (emailError) {
        console.error("[ERROR][AUTH-TOKEN] Welcome email sending failed:", emailError.message);
      }
    });
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
