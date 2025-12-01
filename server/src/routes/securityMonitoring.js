/**
 * Security Monitoring Routes
 * 
 * Các endpoint để giám sát các metrics bảo mật của hệ thống.
 * Chỉ admin mới có quyền truy cập.
 */

import express from "express";
import { authRequired, adminOnly, getTokenBlacklistStats } from "../middleware/jwtSecurity.js";
import { getProgressiveRateLimitStats } from "../middleware/progressiveRateLimit.js";
import { getRefreshTokenStats } from "../services/refreshTokenStore.js";
import { getBlacklistStats } from "../services/tokenBlacklist.js";

const router = express.Router();

/**
 * GET /security/stats - Lấy tất cả thống kê bảo mật
 * Chỉ admin mới có quyền truy cập
 */
router.get("/stats", authRequired, adminOnly, async (req, res) => {
  try {
    const tokenBlacklist = getBlacklistStats();
    const progressiveRateLimit = getProgressiveRateLimitStats();
    const refreshTokens = getRefreshTokenStats();

    const systemInfo = {
      uptime: process.uptime(),
      nodeVersion: process.version,
      memoryUsage: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
      },
      environment: process.env.NODE_ENV || 'development'
    };

    const securityConfig = {
      accessTokenTTL: Number(process.env.ACCESS_TOKEN_TTL_SECONDS) || 900,
      refreshTokenTTL: Number(process.env.REFRESH_TOKEN_TTL_SECONDS) || 2592000,
      useRedisBlacklist: process.env.USE_REDIS_BLACKLIST === 'true',
      captchaEnabled: process.env.CAPTCHA_ENABLED === 'true',
      captchaProvider: process.env.CAPTCHA_PROVIDER || 'none'
    };

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        tokenBlacklist: {
          ...tokenBlacklist,
          description: "Access tokens đã bị thu hồi (logout, security breach)"
        },
        refreshTokens: {
          ...refreshTokens,
          description: "Refresh tokens trong hệ thống"
        },
        progressiveRateLimit: {
          ...progressiveRateLimit,
          description: "Progressive rate limiting với exponential backoff"
        },
        system: systemInfo,
        config: securityConfig
      }
    });
  } catch (error) {
    console.error('[ERROR][SECURITY-MONITORING] Lỗi lấy stats:', error);
    res.status(500).json({
      success: false,
      error: "Không thể lấy thống kê bảo mật",
      message: error.message
    });
  }
});

/**
 * GET /security/token-blacklist - Chi tiết token blacklist
 */
router.get("/token-blacklist", authRequired, adminOnly, (req, res) => {
  try {
    const stats = getBlacklistStats();
    res.json({
      success: true,
      data: {
        ...stats,
        storageType: process.env.USE_REDIS_BLACKLIST === 'true' ? 'Redis' : 'In-Memory',
        ttlHours: 24
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Không thể lấy thống kê token blacklist",
      message: error.message
    });
  }
});

/**
 * GET /security/refresh-tokens - Chi tiết refresh token store
 */
router.get("/refresh-tokens", authRequired, adminOnly, (req, res) => {
  try {
    const stats = getRefreshTokenStats();
    res.json({
      success: true,
      data: {
        ...stats,
        rotationEnabled: true,
        tokenReuseDetection: true,
        familyTracking: true
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Không thể lấy thống kê refresh tokens",
      message: error.message
    });
  }
});

/**
 * GET /security/rate-limits - Chi tiết progressive rate limiting
 */
router.get("/rate-limits", authRequired, adminOnly, (req, res) => {
  try {
    const stats = getProgressiveRateLimitStats();
    res.json({
      success: true,
      data: {
        ...stats,
        exponentialBackoff: true,
        initialLockoutSeconds: 1,
        maxLockoutMinutes: 30,
        failureWindowMinutes: 60
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Không thể lấy thống kê rate limits",
      message: error.message
    });
  }
});

/**
 * GET /security/health - Kiểm tra sức khỏe hệ thống bảo mật
 */
router.get("/health", (req, res) => {
  try {
    const blacklistStats = getBlacklistStats();
    const refreshStats = getRefreshTokenStats();
    const rateLimitStats = getProgressiveRateLimitStats();

    const components = {
      tokenBlacklist: {
        status: 'healthy',
        type: process.env.USE_REDIS_BLACKLIST === 'true' ? 'redis' : 'memory'
      },
      refreshTokenStore: {
        status: 'healthy',
        activeTokens: refreshStats.activeTokens
      },
      progressiveRateLimit: {
        status: 'healthy',
        lockedOutIPs: rateLimitStats.currentlyLockedOut
      },
      captcha: {
        status: process.env.CAPTCHA_ENABLED === 'true' ? 'enabled' : 'disabled',
        provider: process.env.CAPTCHA_PROVIDER || 'none'
      }
    };

    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      components
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

export default router;
