import rateLimit from "express-rate-limit";

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per windowMs
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

// Upload rate limiter
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 upload requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Quá nhiều lần tải file, vui lòng thử lại sau 15 phút"
  }
});

// Message rate limiter to prevent spam
export const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 messages per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Gửi tin nhắn quá nhanh, vui lòng chậm lại"
  }
});
