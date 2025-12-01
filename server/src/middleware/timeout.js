/**
 * Timeout Middleware
 * 
 * Middleware timeout cho request để tránh các yêu cầu bị treo.
 * Tự động log các request chậm và timeout.
 * 
 * @module timeout
 */

/**
 * Request timeout middleware
 * 
 * @param {number} timeout - Thời gian timeout (ms), mặc định 30000ms
 * @returns {Function} Express middleware
 */
export const requestTimeout = (timeout = 30000) => {
  return (req, res, next) => {
    const startTime = Date.now();
    
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        const duration = Date.now() - startTime;
        console.error(`[ERROR][TIMEOUT] Request timeout for ${req.method} ${req.path} after ${duration}ms`);
        console.error(`[ERROR][TIMEOUT] Request details:`, {
          method: req.method,
          path: req.path,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          duration: duration
        });
        res.status(408).json({ 
          error: "Yêu cầu mất quá nhiều thời gian, vui lòng thử lại",
          code: "REQUEST_TIMEOUT",
          timeout: timeout
        });
      }
    }, timeout);

    res.on('finish', () => {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      if (duration > 10000) {
        console.warn(`[WARN][TIMEOUT] Slow request: ${req.method} ${req.path} took ${duration}ms`);
      }
    });

    res.on('close', () => {
      clearTimeout(timeoutId);
    });

    next();
  };
};

/**
 * Async handler wrapper
 * 
 * Bắt lỗi tự động trong các async route handlers.
 * 
 * @param {Function} fn - Async route handler
 * @returns {Function} Wrapped handler
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
