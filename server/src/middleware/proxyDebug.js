/**
 * Proxy Debug Middleware
 * Log thông tin proxy để debug rate limiting
 */

/**
 * Middleware để log thông tin proxy
 */
export const proxyDebugMiddleware = (req, res, next) => {
  // Chỉ log trong development
  if (process.env.NODE_ENV === 'development') {
    const proxyInfo = {
      ip: req.ip,
      ips: req.ips,
      forwardedFor: req.get('X-Forwarded-For'),
      realIP: req.get('X-Real-IP'),
      host: req.get('Host'),
      userAgent: req.get('User-Agent'),
      method: req.method,
      url: req.url,
      secure: req.secure,
      protocol: req.protocol
    };
    
    console.log('🔍 Proxy Debug Info:', proxyInfo);
  }
  
  next();
};

/**
 * Middleware để test rate limiting
 */
export const rateLimitTestMiddleware = (req, res, next) => {
  // Log rate limit info cho mỗi request
  const rateLimitInfo = {
    ip: req.ip,
    forwardedFor: req.get('X-Forwarded-For'),
    realIP: req.get('X-Real-IP'),
    userAgent: req.get('User-Agent'),
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  };
  
  console.log('🚦 Rate Limit Info:', rateLimitInfo);
  
  next();
};

/**
 * Helper function để extract real IP
 */
export const getRealIP = (req) => {
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

/**
 * Helper function để check if request is from proxy
 */
export const isFromProxy = (req) => {
  return !!(req.get('X-Forwarded-For') || req.get('X-Real-IP'));
};

/**
 * Helper function để get proxy chain info
 */
export const getProxyChain = (req) => {
  const forwardedFor = req.get('X-Forwarded-For');
  
  if (forwardedFor) {
    return forwardedFor.split(',').map(ip => ip.trim());
  }
  
  return [req.ip];
};
