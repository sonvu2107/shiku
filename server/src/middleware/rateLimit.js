import rateLimit from "express-rate-limit";

// Hàm trợ giúp để ghi lại thông tin giới hạn tốc độ
const logRateLimitInfo = (req, message) => {
  // Việc ghi nhật ký giới hạn tốc độ có thể được thực hiện bằng hệ thống ghi nhật ký phù hợp
};

// Trình tạo khóa tùy chỉnh để xử lý IP proxy
const createKeyGenerator = () => (req) => {
  const forwardedFor = req.get('X-Forwarded-For');
  const realIP = req.get('X-Real-IP');
  const clientIP = req.ip;
  
  if (forwardedFor) {
    // Lấy IP đầu tiên từ X-Forwarded-For (IP thật của client)
    return forwardedFor.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return clientIP;
};

// General API rate limiter - tăng lên cho UX tốt hơn (ĐÃ TẮT để tránh double limiting)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1500,
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
  // Skip rate limiting cho các IP cụ thể nếu cần
  skip: (req) => {
    // Skip rate limiting cho local development
    const allowedIPs = ['127.0.0.1', '::1', 'localhost'];
    return process.env.NODE_ENV === 'development' && allowedIPs.includes(req.ip);
  },
  // Custom key generator để xử lý IP proxy
  keyGenerator: createKeyGenerator()
});

// Strict rate limiter cho các endpoint xác thực (login, register, etc.)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
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
  skipSuccessfulRequests: true, // Không tính các yêu cầu thành công
  // Custom key generator để xử lý IP proxy
  keyGenerator: createKeyGenerator()
});

// Loose rate limiter cho các endpoint kiểm tra trạng thái (me, heartbeat, etc.)
export const authStatusLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,

  // Custom handler
  handler: (req, res, next, options) => {
    logRateLimitInfo(req, 'Auth Status Rate limit reached');
    res.status(options.statusCode).json({
      error: "Quá nhiều yêu cầu kiểm tra trạng thái, vui lòng thử lại sau 1 phút",
      retryAfter: Math.round(options.windowMs / 1000)
    });
  },
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

// Message rate limiter để tránh spam - tăng lên cho users active
export const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
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
  max: 800,
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
