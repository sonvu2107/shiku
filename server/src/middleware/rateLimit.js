/**
 * Rate Limiting Middleware
 * 
 * Các rate limiter cho các endpoint khác nhau.
 * Sử dụng express-rate-limit với custom key generator để xử lý proxy IPs.
 * 
 * @module rateLimit
 */

import rateLimit from "express-rate-limit";

const logRateLimitInfo = (req, message) => {
  // Có thể tích hợp với hệ thống logging
};

/**
 * Kiểm tra xem có nên skip rate limit không
 * Skip khi:
 * - Development mode VÀ
 * - (IP là localhost/127.0.0.1/::1 HOẶC có User-Agent chứa "Stress-Test" HOẶC có env var DISABLE_RATE_LIMIT)
 */
const shouldSkipRateLimit = (req) => {
  if (process.env.NODE_ENV !== 'development' && !process.env.DISABLE_RATE_LIMIT) {
    return false;
  }
  
  // Check IP
  const allowedIPs = ['127.0.0.1', '::1', 'localhost', '::ffff:127.0.0.1'];
  const clientIP = req.ip || req.connection?.remoteAddress;
  if (allowedIPs.includes(clientIP)) {
    return true;
  }
  
  // Check User-Agent (cho stress test)
  const userAgent = req.get('User-Agent') || '';
  if (userAgent.includes('Stress-Test')) {
    return true;
  }
  
  // Check environment variable
  if (process.env.DISABLE_RATE_LIMIT === 'true' || process.env.DISABLE_RATE_LIMIT === '1') {
    return true;
  }
  
  return false;
};

/**
 * Tạo key generator tùy chỉnh để xử lý IP proxy
 * Ưu tiên X-Forwarded-For, sau đó X-Real-IP, cuối cùng là req.ip
 */
const createKeyGenerator = () => (req) => {
  const forwardedFor = req.get('X-Forwarded-For');
  const realIP = req.get('X-Real-IP');
  const clientIP = req.ip;
  
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return clientIP;
};

/**
 * General API rate limiter
 * 1500 requests / 15 phút
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1500,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logRateLimitInfo(req, 'API Rate limit reached');
    res.status(options.statusCode).json({
      error: "Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau 15 phút",
      retryAfter: Math.round(options.windowMs / 1000)
    });
  },
  skip: shouldSkipRateLimit,
  keyGenerator: createKeyGenerator()
});

/**
 * Strict rate limiter cho các endpoint xác thực
 * 20 requests / 15 phút, chỉ tính các request thất bại
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logRateLimitInfo(req, 'Auth Rate limit reached');
    res.status(options.statusCode).json({
      error: "Quá nhiều lần đăng nhập thất bại, vui lòng thử lại sau 15 phút",
      retryAfter: Math.round(options.windowMs / 1000)
    });
  },
  skipSuccessfulRequests: true,
  skip: shouldSkipRateLimit,
  keyGenerator: createKeyGenerator()
});

/**
 * Loose rate limiter cho các endpoint kiểm tra trạng thái
 * 120 requests / 1 phút
 */
export const authStatusLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logRateLimitInfo(req, 'Auth Status Rate limit reached');
    res.status(options.statusCode).json({
      error: "Quá nhiều yêu cầu kiểm tra trạng thái, vui lòng thử lại sau 1 phút",
      retryAfter: Math.round(options.windowMs / 1000)
    });
  },
  skip: shouldSkipRateLimit,
  keyGenerator: createKeyGenerator()
});

/**
 * Upload rate limiter
 * 50 requests / 15 phút
 */
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logRateLimitInfo(req, 'Upload Rate limit reached');
    res.status(options.statusCode).json({
      error: "Quá nhiều lần tải file, vui lòng thử lại sau 15 phút",
      retryAfter: Math.round(options.windowMs / 1000)
    });
  },
  skip: shouldSkipRateLimit,
  keyGenerator: createKeyGenerator()
});

/**
 * Message rate limiter để tránh spam
 * 100 requests / 1 phút
 */
export const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logRateLimitInfo(req, 'Message Rate limit reached');
    res.status(options.statusCode).json({
      error: "Gửi tin nhắn quá nhanh, vui lòng chậm lại",
      retryAfter: Math.round(options.windowMs / 1000)
    });
  },
  skip: shouldSkipRateLimit,
  keyGenerator: createKeyGenerator()
});

/**
 * Posts rate limiter cho infinite scroll
 * 800 requests / 15 phút
 */
export const postsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 800,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logRateLimitInfo(req, 'Posts Rate limit reached');
    res.status(options.statusCode).json({
      error: "Quá nhiều yêu cầu bài viết, vui lòng thử lại sau 15 phút",
      retryAfter: Math.round(options.windowMs / 1000)
    });
  },
  skip: shouldSkipRateLimit,
  keyGenerator: createKeyGenerator()
});
