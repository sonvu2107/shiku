/**
 * Health Check Routes
 * 
 * Endpoint kiểm tra tình trạng sức khỏe của server.
 * Sử dụng cho monitoring services (Render, Railway, etc.)
 * 
 * @module health
 */

import express from 'express';
import mongoose from 'mongoose';
import os from 'os';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();

/**
 * Helper to check if user has admin access (full admin OR granular admin.* permissions)
 */
const hasAdminAccess = async (user) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (!user.role || user.role === 'user') return false;

  try {
    const Role = mongoose.model('Role');
    const roleDoc = await Role.findOne({ name: user.role, isActive: true }).lean();
    if (roleDoc && roleDoc.permissions) {
      return Object.keys(roleDoc.permissions).some(
        key => key.startsWith('admin.') && roleDoc.permissions[key] === true
      );
    }
  } catch (error) {
    console.error('[ERROR][HEALTH] Error checking role permissions:', error);
  }
  return false;
};

/**
 * GET /api/health - Health check endpoint
 * 
 * @route GET /api/health
 * @returns {Object} Thông tin trạng thái server
 */
router.get('/', (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';

  // Minimal response in production
  if (isProduction) {
    return res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString()
    });
  }

  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    }
  });
});

/**
 * GET /api/health/detailed - Detailed health check (admin only)
 * 
 * @route GET /api/health/detailed
 * @returns {Object} Chi tiết trạng thái toàn hệ thống
 */
router.get('/detailed', authRequired, async (req, res) => {
  // Only admin can access detailed health
  const isAdmin = await hasAdminAccess(req.user);
  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    // Database health
    let dbHealth = { status: 'unknown' };
    try {
      const { getHealth } = await import('../utils/dbMonitor.js');
      dbHealth = getHealth();
    } catch (e) {
      dbHealth = {
        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        error: e.message
      };
    }

    // Cache health
    let cacheHealth = { status: 'unknown' };
    try {
      const { getCacheStats } = await import('../utils/hybridCache.js');
      cacheHealth = getCacheStats();
    } catch (e) {
      cacheHealth = { error: e.message };
    }

    // Redis health
    let redisHealth = { status: 'disabled' };
    try {
      const { getConnectionStatus } = await import('../services/redisClient.js');
      redisHealth = getConnectionStatus();
    } catch (e) {
      redisHealth = { error: e.message };
    }

    // Memory usage
    const memoryUsage = process.memoryUsage();

    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: process.uptime(),
        formatted: formatUptime(process.uptime())
      },
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      node: process.version,
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
        external: Math.round(memoryUsage.external / 1024 / 1024) + ' MB'
      },
      database: dbHealth,
      cache: cacheHealth,
      redis: redisHealth,
      platform: {
        os: process.platform,
        arch: process.arch,
        cpuCount: os.cpus().length
      }
    });

  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message
    });
  }
});

/**
 * GET /api/health/db - Database health check
 */
router.get('/db', async (req, res) => {
  try {
    const state = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    if (state !== 1) {
      return res.status(503).json({
        status: 'ERROR',
        database: states[state] || 'unknown'
      });
    }

    // Quick ping test
    await mongoose.connection.db.admin().ping();

    res.json({
      status: 'OK',
      database: 'connected',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      error: error.message
    });
  }
});

/**
 * GET /api/health/cache - Cache statistics
 */
router.get('/cache', authRequired, async (req, res) => {
  const isAdmin = await hasAdminAccess(req.user);
  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { getCacheStats } = await import('../utils/hybridCache.js');
    res.json({
      status: 'OK',
      cache: getCacheStats(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // Fallback to simple cache stats
    try {
      const { getCacheStats } = await import('../utils/cache.js');
      res.json({
        status: 'OK',
        cache: getCacheStats(),
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      res.status(500).json({
        status: 'ERROR',
        error: error.message
      });
    }
  }
});

/**
 * Format uptime to human readable
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(' ');
}

export default router;
