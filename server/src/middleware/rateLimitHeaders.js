import { getClientAgent } from "../utils/clientAgent.js";

/**
 * Rate Limit Headers Middleware
 * Thêm rate limit headers vào response để client biết trạng thái rate limiting
 */

/**
 * Middleware để thêm rate limit headers vào response
 */
export const addRateLimitHeaders = (req, res, next) => {
  // Thêm rate limit headers nếu có thông tin từ rate limiter
  if (req.rateLimit) {
    const { limit, remaining, resetTime, current } = req.rateLimit;
    
    res.set({
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
      'X-RateLimit-Used': current.toString()
    });
    
    // Thêm warning header khi gần hết limit
    if (remaining <= 10) {
      res.set('X-RateLimit-Warning', 'Rate limit nearly exceeded');
    }
    
    // Thêm retry-after header khi hết limit
    if (remaining === 0) {
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      res.set('Retry-After', retryAfter.toString());
    }
  }
  
  next();
};

/**
 * Middleware để log rate limit status cho monitoring
 */
export const logRateLimitStatus = (req, res, next) => {
  if (req.rateLimit) {
    const { limit, remaining, resetTime, current } = req.rateLimit;
    
    // Log warning khi gần hết limit
    if (remaining <= 5) {
      console.log(`[WARN][RATE-LIMIT] Rate limit warning for ${req.ip}:`, {
        endpoint: req.path,
        limit,
        remaining,
        current,
        resetTime: new Date(resetTime).toISOString(),
        clientAgent: getClientAgent(req)
      });
    }
    
    // Log khi hết limit
    if (remaining === 0) {
      console.log(`[ERROR][RATE-LIMIT] Rate limit exceeded for ${req.ip}:`, {
        endpoint: req.path,
        limit,
        remaining,
        current,
        resetTime: new Date(resetTime).toISOString(),
        clientAgent: getClientAgent(req)
      });
    }
  }
  
  next();
};
