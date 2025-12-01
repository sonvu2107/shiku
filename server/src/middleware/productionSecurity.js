/**
 * Production Security Middleware
 * 
 * Cấu hình bảo mật nâng cao cho môi trường production.
 * Bao gồm: Helmet, Rate Limiting, Security Headers.
 * 
 * @module productionSecurity
 */

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { isProduction } from '../config/env.js';

/**
 * Cấu hình Helmet nâng cao cho môi trường production
 */
export const productionHelmet = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: isProduction() ? [] : undefined,
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: isProduction() ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false
});

/**
 * Giới hạn tần suất (rate limiting) cho môi trường production
 */
export const productionRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction() ? 100 : 1000, // Stricter limits in production
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Bỏ qua rate limiting cho health checks
    return req.path === '/health' || req.path === '/api/health';
  }
});

/**
 * Giới hạn tần suất cho API trong môi trường production
 */
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction() ? 200 : 1000,
  message: {
    error: 'API rate limit exceeded',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Giới hạn tần suất cho xác thực (đăng nhập) 
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction() ? 5 : 20, // Very strict in production
  message: {
    error: 'Too many authentication attempts',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

/**
 * Giới hạn tần suất cho việc upload file
 */
export const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isProduction() ? 50 : 200,
  message: {
    error: 'Upload rate limit exceeded',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Middleware thêm các header bảo mật
 */
export const securityHeaders = (req, res, next) => {
  // Xóa thông tin server
  res.removeHeader('X-Powered-By');
  
  // Thêm các header bảo mật
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Header dành cho production
  if (isProduction()) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  }
  
  next();
};

/**
 * Ghi log request cho môi trường production
 */
export const productionLogging = (req, res, next) => {
  if (isProduction()) {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logData = {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      };
      
      // Chỉ log lỗi và các request chậm trong production
      if (res.statusCode >= 400 || duration > 1000) {
        console.log(JSON.stringify(logData));
      }
    });
  }
  
  next();
};

export default {
  productionHelmet,
  productionRateLimit,
  apiRateLimit,
  authRateLimit,
  uploadRateLimit,
  securityHeaders,
  productionLogging
};
