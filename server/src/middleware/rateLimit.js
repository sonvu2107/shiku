import rateLimit from "express-rate-limit";

// Helper function để log rate limit info
const logRateLimitInfo = (req, message) => {
  const clientIP = req.ip;
  const forwardedFor = req.get('X-Forwarded-For');
  const realIP = req.get('X-Real-IP');
  
  console.log(`🚦 Rate Limit: ${message}`, {
    clientIP,
    forwardedFor,
    realIP,
    userAgent: req.get('User-Agent'),
    url: req.url,
    method: req.method
  });
};

// Custom key generator để handle proxy IPs
const createKeyGenerator = () => (req) => {
  const forwardedFor = req.get('X-Forwarded-For');
  const realIP = req.get('X-Real-IP');
  const clientIP = req.ip;
  
  if (forwardedFor) {
    // Lấy IP đầu tiên từ X-Forwarded-For (client IP thật)
    return forwardedFor.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return clientIP;
};

// General API rate limiter - increased for better UX (DISABLED to avoid double limiting)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased from 300 to 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  // Custom handler thay vì onLimitReached
  handler: (req, res, next, options) => {
    logRateLimitInfo(req, 'API Rate limit reached');
    res.status(options.statusCode).json({
      error: "Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau 15 phút",
      retryAfter: Math.round(options.windowMs / 1000)
    });
  },
  // Skip rate limiting for certain IPs if needed
  skip: (req) => {
    // Skip rate limiting for local development
    const allowedIPs = ['127.0.0.1', '::1', 'localhost'];
    return process.env.NODE_ENV === 'development' && allowedIPs.includes(req.ip);
  },
  // Custom key generator để handle proxy IPs
  keyGenerator: createKeyGenerator()
});

// Strict rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  // Custom handler thay vì onLimitReached
  handler: (req, res, next, options) => {
    logRateLimitInfo(req, 'Auth Rate limit reached');
    res.status(options.statusCode).json({
      error: "Quá nhiều lần đăng nhập thất bại, vui lòng thử lại sau 15 phút",
      retryAfter: Math.round(options.windowMs / 1000)
    });
  },
  skipSuccessfulRequests: true, // Don't count successful requests
  // Custom key generator để handle proxy IPs
  keyGenerator: createKeyGenerator()
});

// Upload rate limiter - increased for content creators
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Increased from 20 to 50 upload requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  // Custom handler thay vì message
  handler: (req, res, next, options) => {
    logRateLimitInfo(req, 'Upload Rate limit reached');
    res.status(options.statusCode).json({
      error: "Quá nhiều lần tải file, vui lòng thử lại sau 15 phút",
      retryAfter: Math.round(options.windowMs / 1000)
    });
  },
  // Custom key generator để handle proxy IPs
  keyGenerator: createKeyGenerator()
});

// Message rate limiter to prevent spam - increased for active users
export const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Increased from 60 to 100 messages per minute
  standardHeaders: true,
  legacyHeaders: false,
  // Custom handler thay vì message
  handler: (req, res, next, options) => {
    logRateLimitInfo(req, 'Message Rate limit reached');
    res.status(options.statusCode).json({
      error: "Gửi tin nhắn quá nhanh, vui lòng chậm lại",
      retryAfter: Math.round(options.windowMs / 1000)
    });
  },
  // Custom key generator để handle proxy IPs
  keyGenerator: createKeyGenerator()
});

// Posts-specific rate limiter for infinite scroll
export const postsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased from 200 to 500 post requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  // Custom handler thay vì message
  handler: (req, res, next, options) => {
    logRateLimitInfo(req, 'Posts Rate limit reached');
    res.status(options.statusCode).json({
      error: "Quá nhiều yêu cầu bài viết, vui lòng thử lại sau 15 phút",
      retryAfter: Math.round(options.windowMs / 1000)
    });
  },
  // Custom key generator để handle proxy IPs
  keyGenerator: createKeyGenerator()
});
