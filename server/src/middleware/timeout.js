/**
 * Request timeout middleware to prevent hanging requests
 */
export const requestTimeout = (timeout = 30000) => {
  return (req, res, next) => {
    // Set timeout for the request
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        console.error(`⏰ Request timeout for ${req.method} ${req.path}`);
        res.status(408).json({ 
          error: "Yêu cầu mất quá nhiều thời gian, vui lòng thử lại" 
        });
      }
    }, timeout);

    // Clear timeout when response is finished
    res.on('finish', () => {
      clearTimeout(timeoutId);
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
