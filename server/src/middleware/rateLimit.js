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

/**
 * Breakthrough rate limiter (độ kiếp)
 * 10 attempts / 15 phút (on top of cooldown timer)
 */
export const breakthroughLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logRateLimitInfo(req, 'Breakthrough Rate limit reached');
    res.status(options.statusCode).json({
      error: "Đạo hữu đã thử độ kiếp quá nhiều lần, hãy bình tâm tu luyện thêm",
      retryAfter: Math.round(options.windowMs / 1000)
    });
  },
  skip: shouldSkipRateLimit,
  keyGenerator: createKeyGenerator()
});

/**
 * Cultivation rate limiter (tu tiên general)
 * 500 requests / 1 phút (cho các endpoint như add-exp, click yin-yang)
 */
export const cultivationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logRateLimitInfo(req, 'Cultivation Rate limit reached');
    res.status(options.statusCode).json({
      error: "Tu luyện quá nhanh! Hãy chậm lại để hấp thụ linh khí",
      retryAfter: Math.round(options.windowMs / 1000)
    });
  },
  skip: shouldSkipRateLimit,
  keyGenerator: createKeyGenerator()
});

/**
 * Post creation rate limiter - chống spam đăng bài
 * 10 posts / 15 phút (tính theo user ID, không phải IP)
 */
export const postCreationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 10, // Tối đa 10 bài viết trong 15 phút
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logRateLimitInfo(req, 'Post Creation Rate limit reached');
    res.status(options.statusCode).json({
      error: "Bạn đã đăng quá nhiều bài viết. Vui lòng đợi một chút trước khi đăng tiếp.",
      retryAfter: Math.round(options.windowMs / 1000)
    });
  },
  skip: shouldSkipRateLimit,
  // Sử dụng user ID thay vì IP để tránh ảnh hưởng đến nhiều user cùng IP
  keyGenerator: (req) => {
    if (req.user && req.user._id) {
      return `post-creation:${req.user._id.toString()}`;
    }
    // Fallback về IP nếu chưa có user (không nên xảy ra vì có authRequired)
    return createKeyGenerator()(req);
  }
});

/**
 * Comment creation rate limiter - chống spam bình luận
 * 30 comments / 5 phút (tính theo user ID)
 */
export const commentCreationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 phút
  max: 30, // Tối đa 30 bình luận trong 5 phút
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logRateLimitInfo(req, 'Comment Creation Rate limit reached');
    res.status(options.statusCode).json({
      error: "Bạn đã bình luận quá nhiều. Vui lòng đợi một chút trước khi bình luận tiếp.",
      retryAfter: Math.round(options.windowMs / 1000)
    });
  },
  skip: shouldSkipRateLimit,
  // Sử dụng user ID thay vì IP
  keyGenerator: (req) => {
    if (req.user && req.user._id) {
      return `comment-creation:${req.user._id.toString()}`;
    }
    return createKeyGenerator()(req);
  }
});

/**
 * Group creation rate limiter - chống spam tạo nhóm
 * 3 groups / 1 giờ (tính theo user ID)
 */
export const groupCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 3, // Tối đa 3 nhóm trong 1 giờ
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logRateLimitInfo(req, 'Group Creation Rate limit reached');
    res.status(options.statusCode).json({
      error: "Bạn đã tạo quá nhiều nhóm. Vui lòng đợi một chút trước khi tạo nhóm mới.",
      retryAfter: Math.round(options.windowMs / 1000)
    });
  },
  skip: shouldSkipRateLimit,
  keyGenerator: (req) => {
    if (req.user && req.user._id) {
      return `group-creation:${req.user._id.toString()}`;
    }
    return createKeyGenerator()(req);
  }
});

/**
 * Event creation rate limiter - chống spam tạo sự kiện
 * 5 events / 1 giờ (tính theo user ID)
 */
export const eventCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 5, // Tối đa 5 sự kiện trong 1 giờ
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logRateLimitInfo(req, 'Event Creation Rate limit reached');
    res.status(options.statusCode).json({
      error: "Bạn đã tạo quá nhiều sự kiện. Vui lòng đợi một chút trước khi tạo sự kiện mới.",
      retryAfter: Math.round(options.windowMs / 1000)
    });
  },
  skip: shouldSkipRateLimit,
  keyGenerator: (req) => {
    if (req.user && req.user._id) {
      return `event-creation:${req.user._id.toString()}`;
    }
    return createKeyGenerator()(req);
  }
});

/**
 * Friend request rate limiter - chống spam gửi lời mời
 * 20 requests / 15 phút (tính theo user ID)
 */
export const friendRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 20, // Tối đa 20 lời mời trong 15 phút
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logRateLimitInfo(req, 'Friend Request Rate limit reached');
    res.status(options.statusCode).json({
      error: "Bạn đã gửi quá nhiều lời mời kết bạn. Vui lòng đợi một chút trước khi gửi tiếp.",
      retryAfter: Math.round(options.windowMs / 1000)
    });
  },
  skip: shouldSkipRateLimit,
  keyGenerator: (req) => {
    if (req.user && req.user._id) {
      return `friend-request:${req.user._id.toString()}`;
    }
    return createKeyGenerator()(req);
  }
});

/**
 * Poll creation rate limiter - chống spam tạo poll
 * 10 polls / 15 phút (tính theo user ID)
 */
export const pollCreationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 10, // Tối đa 10 poll trong 15 phút
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logRateLimitInfo(req, 'Poll Creation Rate limit reached');
    res.status(options.statusCode).json({
      error: "Bạn đã tạo quá nhiều poll. Vui lòng đợi một chút trước khi tạo poll mới.",
      retryAfter: Math.round(options.windowMs / 1000)
    });
  },
  skip: shouldSkipRateLimit,
  keyGenerator: (req) => {
    if (req.user && req.user._id) {
      return `poll-creation:${req.user._id.toString()}`;
    }
    return createKeyGenerator()(req);
  }
});

/**
 * Post interaction rate limiter - chống spam upvote/save/interest
 * 100 interactions / 1 phút (tính theo user ID)
 */
export const postInteractionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 phút
  max: 100, // Tối đa 100 tương tác trong 1 phút
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logRateLimitInfo(req, 'Post Interaction Rate limit reached');
    res.status(options.statusCode).json({
      error: "Bạn đã tương tác quá nhiều. Vui lòng chậm lại.",
      retryAfter: Math.round(options.windowMs / 1000)
    });
  },
  skip: shouldSkipRateLimit,
  keyGenerator: (req) => {
    if (req.user && req.user._id) {
      return `post-interaction:${req.user._id.toString()}`;
    }
    return createKeyGenerator()(req);
  }
});
