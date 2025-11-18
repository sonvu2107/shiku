import { getClientAgent } from "../utils/clientAgent.js";

/**
 * Rate Limit Logger Middleware
 * Log thông tin rate limit sau khi rate limiter chạy
 * Sử dụng req.rateLimit để check trạng thái
 */

/**
 * Middleware để log rate limit info
 */
export const rateLimitLogger = (req, res, next) => {
  // Log rate limit info nếu có
  if (req.rateLimit) {
    const { limit, remaining, resetTime, current } = req.rateLimit;
    
    // Log khi gần hết limit
    if (remaining <= 5) {
      console.log(`[WARN][RATE-LIMIT] Rate limit warning for ${req.ip}:`, {
        limit,
        remaining,
        resetTime: new Date(resetTime).toISOString(),
        current,
        url: req.url,
        method: req.method,
        clientAgent: getClientAgent(req)
      });
    }
    
    // Log khi đã hết limit
    if (remaining === 0) {
      console.log(`[ERROR][RATE-LIMIT] Rate limit exceeded for ${req.ip}:`, {
        limit,
        remaining,
        resetTime: new Date(resetTime).toISOString(),
        current,
        url: req.url,
        method: req.method,
        clientAgent: getClientAgent(req)
      });
    }
  }
  
  next();
};

/**
 * Middleware để log rate limit cho specific endpoints
 */
export const createRateLimitLogger = (endpointName) => (req, res, next) => {
  if (req.rateLimit) {
    const { limit, remaining, resetTime, current } = req.rateLimit;
    
    console.log(`[INFO][RATE-LIMIT] ${endpointName} Rate Limit Status:`, {
      endpoint: endpointName,
      ip: req.ip,
      limit,
      remaining,
      resetTime: new Date(resetTime).toISOString(),
      current,
      url: req.url,
      method: req.method
    });
  }
  
  next();
};

/**
 * Middleware để log rate limit cho auth endpoints
 */
export const authRateLimitLogger = createRateLimitLogger('Auth');

/**
 * Middleware để log rate limit cho upload endpoints
 */
export const uploadRateLimitLogger = createRateLimitLogger('Upload');

/**
 * Middleware để log rate limit cho message endpoints
 */
export const messageRateLimitLogger = createRateLimitLogger('Message');

/**
 * Middleware để log rate limit cho posts endpoints
 */
export const postsRateLimitLogger = createRateLimitLogger('Posts');
