import rateLimit from "express-rate-limit";

// General API rate limiter - increased for better UX
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased from 300 to 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau 15 phút"
  },
  // Skip rate limiting for certain IPs if needed
  skip: (req) => {
    // Skip rate limiting for local development
    const allowedIPs = ['127.0.0.1', '::1', 'localhost'];
    return process.env.NODE_ENV === 'development' && allowedIPs.includes(req.ip);
  }
});

// Strict rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Quá nhiều lần đăng nhập thất bại, vui lòng thử lại sau 15 phút"
  },
  skipSuccessfulRequests: true // Don't count successful requests
});

// Upload rate limiter - increased for content creators
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Increased from 20 to 50 upload requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Quá nhiều lần tải file, vui lòng thử lại sau 15 phút"
  }
});

// Message rate limiter to prevent spam - increased for active users
export const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Increased from 30 to 60 messages per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Gửi tin nhắn quá nhanh, vui lòng chậm lại"
  }
});

// Posts-specific rate limiter for infinite scroll
export const postsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 post requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Quá nhiều yêu cầu bài viết, vui lòng thử lại sau 15 phút"
  }
});
