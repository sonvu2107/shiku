import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

/**
 * Admin Rate Limiting - Bảo vệ admin endpoints khỏi abuse
 */

// General admin rate limit - 100 requests per 15 minutes
export const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: "Quá nhiều requests từ IP này, vui lòng thử lại sau 15 phút",
    code: "ADMIN_RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for localhost in development
    return process.env.NODE_ENV === 'development' && req.ip === '127.0.0.1';
  }
});

// Strict rate limit for sensitive admin actions (ban, unban, delete)
export const strictAdminRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit each IP to 10 requests per 5 minutes
  message: {
    error: "Quá nhiều hành động admin nhạy cảm, vui lòng thử lại sau 5 phút",
    code: "STRICT_ADMIN_RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return process.env.NODE_ENV === 'development' && req.ip === '127.0.0.1';
  }
});

// Slow down for notification sending - increasingly delay responses
export const notificationSlowDown = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 5, // Allow 5 requests per windowMs without delay
  delayMs: () => 500, // Fixed 500ms delay per request after delayAfter
  maxDelayMs: 10000, // Maximum delay of 10 seconds
  validate: { delayMs: false }, // Disable warning
  skip: (req) => {
    return process.env.NODE_ENV === 'development' && req.ip === '127.0.0.1';
  }
});

/**
 * Cache Headers - Cải thiện performance với caching strategies
 */

// Stale-while-revalidate cache for stats data (cache 5 minutes, stale for 10 minutes)
export function statsCache(req, res, next) {
  if (req.method === 'GET') {
    res.set({
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      'Vary': 'Authorization'
    });
  }
  next();
}

// Short cache for user data (cache 2 minutes, stale for 5 minutes)
export function userCache(req, res, next) {
  if (req.method === 'GET') {
    res.set({
      'Cache-Control': 'public, max-age=120, stale-while-revalidate=300',
      'Vary': 'Authorization'
    });
  }
  next();
}

// No cache for real-time data (online users, notifications)
export function noCache(req, res, next) {
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  next();
}

// Long cache for role data (cache 30 minutes, stale for 1 hour)
export function roleCache(req, res, next) {
  if (req.method === 'GET') {
    res.set({
      'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600',
      'Vary': 'Authorization'
    });
  }
  next();
}