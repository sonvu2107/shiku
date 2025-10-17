/**
 * Production Security Middleware
 * Enhanced security configurations for production environment
 */
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { isProduction } from '../config/env.js';

/**
 * Enhanced Helmet configuration for production
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
 * Production Rate Limiting
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
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  }
});

/**
 * API Rate Limiting for production
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
 * Authentication Rate Limiting
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
 * File Upload Rate Limiting
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
 * Security Headers Middleware
 */
export const securityHeaders = (req, res, next) => {
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Production-specific headers
  if (isProduction()) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  }
  
  next();
};

/**
 * Request Logging for Production
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
      
      // Log only errors and slow requests in production
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
