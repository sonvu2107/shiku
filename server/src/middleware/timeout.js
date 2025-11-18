/**
 * Request timeout middleware to prevent hanging requests
 */
export const requestTimeout = (timeout = 30000) => {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // Set timeout for the request
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

    // Clear timeout when response is finished
    res.on('finish', () => {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      if (duration > 10000) { // Log slow requests (>10s)
        console.warn(`[WARN][TIMEOUT] Slow request: ${req.method} ${req.path} took ${duration}ms`);
      }
    });

    // Clear timeout when response is closed
    res.on('close', () => {
      clearTimeout(timeoutId);
    });

    next();
  };
};

/**
 * Async wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
