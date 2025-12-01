/**
 * API Monitoring Routes
 * 
 * Routes xử lý giám sát và thống kê API:
 * - Theo dõi số lượng request theo endpoint
 * - Thống kê hiệu năng API
 * - Top endpoints, top users
 * - Cleanup và maintenance
 * 
 * @module apiMonitoring
 */

import express from "express";
import { authRequired } from "../middleware/auth.js";
import ApiStats from "../models/ApiStats.js";
import { getClientAgent } from "../utils/clientAgent.js";
import mongoose from "mongoose";

// Cleanup function to be called after DB connection
export const cleanupInvalidEnvKeys = async () => {
  try {
    console.log('[INFO][API-MONITORING] Starting cleanup...');
    
    // Remove invalid 'env' keys (simplified - no $* syntax)
    const result = await ApiStats.updateMany({}, {
      $unset: {
        "currentPeriod.requestsByEndpoint.env": "",
        "dailyTopStats.topEndpoints.env": ""
      }
    });
    
    if (result.modifiedCount) {
      console.log(`[INFO][API-MONITORING] Removed invalid 'env' keys: ${result.modifiedCount} docs updated`);
    }
    
    // Check if any problematic docs still exist
    const problematicDocs = await ApiStats.find({
      $or: [
        { "currentPeriod.requestsByEndpoint.env": { $exists: true } },
        { "dailyTopStats.topEndpoints.env": { $exists: true } }
      ]
    });
    
    if (problematicDocs.length > 0) {
      console.log(`[INFO][API-MONITORING] Found ${problematicDocs.length} problematic docs, deleting all...`);
      await ApiStats.deleteMany({});
      console.log('[INFO][API-MONITORING] All ApiStats documents deleted - will recreate on first API call');
    } else {
      console.log('[INFO][API-MONITORING] No problematic documents found');
    }
    
  } catch (err) {
    console.error("[ERROR][API-MONITORING] Cleanup failed:", err.message);
    // If cleanup fails, delete everything as last resort
    try {
      await ApiStats.deleteMany({});
      console.log('[INFO][API-MONITORING] Emergency: Deleted all ApiStats documents');
    } catch (deleteErr) {
      console.error('[ERROR][API-MONITORING] Emergency delete failed:', deleteErr.message);
    }
  }
};

const router = express.Router();
const monitoringEnabled = (process.env.DISABLE_API_MONITORING ?? "false") !== "true";

// Helper function to get Vietnam time
const getVietnamTime = () => {
  const now = new Date();
  // Use a more reliable method with proper timezone handling
  try {
    // Create a new date in Vietnam timezone
    const vietnamTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Ho_Chi_Minh"}));
    
    // If the conversion failed, fallback to simple UTC+7
    if (isNaN(vietnamTime.getTime())) {
      console.log('[INFO][API-MONITORING] Vietnam time conversion failed, using UTC+7 fallback');
      return new Date(now.getTime() + (7 * 60 * 60 * 1000));
    }
    
    console.log('[INFO][API-MONITORING] Vietnam time conversion successful:', vietnamTime.toISOString());
    return vietnamTime;
  } catch (error) {
    console.error('[ERROR][API-MONITORING] Error getting Vietnam time:', error);
    // Fallback to simple UTC+7
    return new Date(now.getTime() + (7 * 60 * 60 * 1000));
  }
};

// OPTIMIZATION: Batch write system for API monitoring
// Collect stats in memory and write to DB in batches
const statsBuffer = {
  totalRequests: 0,
  rateLimitHits: 0,
  endpointCounts: new Map(),
  ipCounts: new Map(),
  hourCounts: new Map(),
  dailyEndpointCounts: new Map(),
  dailyIPCounts: new Map(),
  rateLimitByEndpoint: new Map(),
  realtimeUpdates: []
};

let batchWriteInterval = null;
let isFlushingBuffer = false;
const BATCH_WRITE_INTERVAL = 10000; // 10 seconds
const MAX_REALTIME_UPDATES = 100;

// Track consecutive errors to reduce log spam
let consecutiveErrors = 0;
const MAX_SILENT_ERRORS = 10; // Only log every 10th error after first error

// Function to check if MongoDB is connected
const isMongoConnected = () => {
  // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  return mongoose.connection.readyState === 1;
};

// Function to flush stats buffer to database
const flushStatsBuffer = async () => {
  if (statsBuffer.totalRequests === 0) return; // Nothing to flush
  if (isFlushingBuffer) return; // Prevent overlapping flushes
  isFlushingBuffer = true;
  
  // Check if MongoDB is connected before attempting to flush
  if (!isMongoConnected()) {
    consecutiveErrors++;
    // Only log occasionally to reduce spam
    if (consecutiveErrors === 1 || consecutiveErrors % 50 === 0) {
      console.warn(`[WARN][API-MONITORING] MongoDB not connected, skipping stats flush (error count: ${consecutiveErrors})`);
    }
    return; // Skip flushing when MongoDB is unavailable
  }
  
  try {
    const updateOps = {
      $inc: {
        totalRequests: statsBuffer.totalRequests,
        'dailyReset.dailyTotalRequests': statsBuffer.totalRequests
      },
      $set: {
        updatedAt: new Date()
      }
    };

    // Add endpoint counts
    for (const [endpoint, count] of statsBuffer.endpointCounts.entries()) {
      updateOps.$inc[`currentPeriod.requestsByEndpoint.${endpoint}`] = count;
      updateOps.$inc[`dailyTopStats.topEndpoints.${endpoint}`] = count;
    }

    // Add IP counts
    for (const [ip, count] of statsBuffer.ipCounts.entries()) {
      updateOps.$inc[`currentPeriod.requestsByIP.${ip}`] = count;
      updateOps.$inc[`dailyTopStats.topIPs.${ip}`] = count;
    }

    // Add hour counts
    for (const [hour, count] of statsBuffer.hourCounts.entries()) {
      updateOps.$inc[`currentPeriod.requestsByHour.${hour}`] = count;
    }

    // Add rate limit hits
    if (statsBuffer.rateLimitHits > 0) {
      updateOps.$inc.rateLimitHits = statsBuffer.rateLimitHits;
      for (const [endpoint, count] of statsBuffer.rateLimitByEndpoint.entries()) {
        updateOps.$inc[`currentPeriod.rateLimitHitsByEndpoint.${endpoint}`] = count;
      }
    }

    // Add realtime updates (only if we have some)
    if (statsBuffer.realtimeUpdates.length > 0) {
      updateOps.$push = {
        realtimeUpdates: {
          $each: statsBuffer.realtimeUpdates.slice(0, MAX_REALTIME_UPDATES),
          $position: 0,
          $slice: MAX_REALTIME_UPDATES
        }
      };
    }

    // Perform atomic update
    await ApiStats.findOneAndUpdate({}, updateOps, { upsert: true });

    // Reset buffer on success
    statsBuffer.totalRequests = 0;
    statsBuffer.rateLimitHits = 0;
    statsBuffer.endpointCounts.clear();
    statsBuffer.ipCounts.clear();
    statsBuffer.hourCounts.clear();
    statsBuffer.dailyEndpointCounts.clear();
    statsBuffer.dailyIPCounts.clear();
    statsBuffer.rateLimitByEndpoint.clear();
    statsBuffer.realtimeUpdates = [];
    
    // Reset error counter on successful flush
    if (consecutiveErrors > 0) {
      console.log(`[INFO][API-MONITORING] Stats buffer flushed successfully after ${consecutiveErrors} failed attempts`);
      consecutiveErrors = 0;
    }
  } catch (error) {
    consecutiveErrors++;
    // Only log errors occasionally to reduce spam
    if (consecutiveErrors === 1 || consecutiveErrors % MAX_SILENT_ERRORS === 0) {
      const errorMessage = error.message || error.toString();
      // Check if it's a connection error
      if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('MongoServerSelectionError') || errorMessage.includes('getaddrinfo')) {
        console.warn(`[WARN][API-MONITORING] MongoDB connection error (attempt ${consecutiveErrors}): ${errorMessage.substring(0, 100)}`);
      } else {
        console.error(`[ERROR][API-MONITORING] Error flushing stats buffer (attempt ${consecutiveErrors}):`, errorMessage.substring(0, 200));
      }
    }
  }
  isFlushingBuffer = false;
};

// Track all intervals for cleanup
const monitoringIntervals = [];

// Cleanup function for graceful shutdown
export const cleanupAPIMonitoring = async () => {
  try {
    await flushStatsBuffer();
    monitoringIntervals.forEach(interval => {
      if (interval) clearInterval(interval);
    });
    monitoringIntervals.length = 0; // Clear array
    console.log('[INFO][API-MONITORING] Cleanup completed');
  } catch (error) {
    console.error('[ERROR][API-MONITORING] Cleanup failed:', error.message);
  }
};

// Start batch write interval if monitoring is enabled
if (monitoringEnabled && !batchWriteInterval) {
  batchWriteInterval = setInterval(() => setImmediate(flushStatsBuffer), BATCH_WRITE_INTERVAL);
  monitoringIntervals.push(batchWriteInterval);
  console.log(`[INFO][API-MONITORING] Batch write system started (interval: ${BATCH_WRITE_INTERVAL}ms)`);
}

// Middleware to track API calls with batched database persistence
export const trackAPICall = async (req, res, next) => {
  if (!monitoringEnabled) {
    return next();
  }
  
  // Call next() immediately to not block request
  next();

  // Track response after it finishes (non-blocking)
  res.on('finish', () => {
    try {
      // Normalize endpoint to safe MongoDB Map key
      let endpoint = req.path.replace(/\./g, '_').replace(/\//g, '_').replace(/:/g, '_');
      
      if (!endpoint || endpoint.length === 0) {
        endpoint = 'unknown_endpoint';
      }
      
      endpoint = endpoint.replace(/[^a-zA-Z0-9_]/g, '_');
      
      const ip = req.ip;
      const vietnamTime = getVietnamTime();
      const hour = vietnamTime.getHours();
      const method = req.method;
      const clientAgent = getClientAgent(req) || "Unknown";
      const encodedIP = ip.replace(/\./g, '_').replace(/:/g, '_');

      // Add to buffer (non-blocking)
      statsBuffer.totalRequests++;
      
      // Increment counters in buffer
      statsBuffer.endpointCounts.set(
        endpoint,
        (statsBuffer.endpointCounts.get(endpoint) || 0) + 1
      );
      statsBuffer.ipCounts.set(
        encodedIP,
        (statsBuffer.ipCounts.get(encodedIP) || 0) + 1
      );
      statsBuffer.hourCounts.set(
        hour.toString(),
        (statsBuffer.hourCounts.get(hour.toString()) || 0) + 1
      );

      // Add to realtime updates (keep last 100)
      statsBuffer.realtimeUpdates.unshift({
        endpoint,
        method,
        ip,
        statusCode: res.statusCode,
        clientAgent: clientAgent.substring(0, 100),
        timestamp: new Date()
      });
      if (statsBuffer.realtimeUpdates.length > MAX_REALTIME_UPDATES) {
        statsBuffer.realtimeUpdates = statsBuffer.realtimeUpdates.slice(0, MAX_REALTIME_UPDATES);
      }

      // Track rate limit hits
      if (res.statusCode === 429) {
        statsBuffer.rateLimitHits++;
        statsBuffer.rateLimitByEndpoint.set(
          endpoint,
          (statsBuffer.rateLimitByEndpoint.get(endpoint) || 0) + 1
        );
      }

      // Get stats for websocket emission (non-blocking, async)
      ApiStats.findOne({}).lean().then(stats => {
        if (!stats) return;

        // Emit real-time update via WebSocket (non-blocking)
        const io = req.app.get('io');
        if (!io) return;

        // Calculate daily requests per minute for realtime update (Vietnam timezone)
        const vietnamNow = getVietnamTime();
        let timeSinceMidnight = 0;

        if (isNaN(vietnamNow.getTime())) {
          // Fallback to current time
          const fallbackTime = new Date();
          const vietnamMidnight = new Date(fallbackTime);
          vietnamMidnight.setHours(0, 0, 0, 0);
          timeSinceMidnight = (fallbackTime - vietnamMidnight) / 1000 / 60;
        } else {
          const vietnamMidnight = new Date(vietnamNow);
          vietnamMidnight.setHours(0, 0, 0, 0);
          timeSinceMidnight = (vietnamNow - vietnamMidnight) / 1000 / 60;
        }

        const requestsPerMinute = timeSinceMidnight > 0
          ? ((stats.dailyReset?.dailyTotalRequests || 0) / timeSinceMidnight).toFixed(2)
          : 0;
        const dailyRequestsPerMinute = timeSinceMidnight > 0
          ? (stats.totalRequests / timeSinceMidnight).toFixed(2)
          : 0;

        // Helper function to convert Map or object to plain object
        const mapToObject = (mapOrObj) => {
          if (!mapOrObj) return {};
          if (mapOrObj instanceof Map) {
            return Object.fromEntries(mapOrObj);
          }
          if (typeof mapOrObj === 'object' && mapOrObj !== null) {
            // Already an object (from .lean())
            return mapOrObj;
          }
          return {};
        };

        const realTimeUpdate = {
          type: 'api_call',
          data: {
            endpoint,
            method,
            ip,
            statusCode: res.statusCode,
            timestamp: new Date().toISOString(),
            clientAgent: clientAgent.substring(0, 100),
            totalRequests: stats.totalRequests,
            rateLimitHits: stats.rateLimitHits,
            requestsPerMinute: parseFloat(requestsPerMinute),
            dailyRequestsPerMinute: parseFloat(dailyRequestsPerMinute),
            requestsByEndpoint: mapToObject(stats.currentPeriod?.requestsByEndpoint),
            requestsByIP: stats.currentPeriod?.requestsByIP 
              ? (stats.currentPeriod.requestsByIP instanceof Map 
                  ? stats.currentPeriod.requestsByIP.size 
                  : Object.keys(stats.currentPeriod.requestsByIP).length)
              : 0,
            hourlyDistribution: mapToObject(stats.currentPeriod?.requestsByHour)
          }
        };

        // Emit to all admin users
        io.to('api-monitoring').emit('api_monitoring_update', realTimeUpdate);
      }).catch(err => {
        // Silent error handling for websocket emission
        console.error('[ERROR][API-MONITORING] Error emitting websocket update:', err);
      });
    } catch (error) {
      console.error('[ERROR][API-MONITORING] Error tracking API call:', error);
      // Continue even if tracking fails
    }
  });
};

if (monitoringEnabled) {
  let hourlyResetRunning = false;
  // Reset current period stats every hour with database persistence
  const hourlyInterval = setInterval(() => setImmediate(async () => {
    if (hourlyResetRunning) return;
    hourlyResetRunning = true;
    try {
      const stats = await ApiStats.getOrCreateStats();
      stats.resetCurrentPeriod();
      await stats.save();
      console.log(`[INFO][API-MONITORING] API Current Period Stats reset at ${new Date().toISOString()}`);
    } catch (error) {
      console.error('[ERROR][API-MONITORING] Error resetting API current period stats:', error);
    } finally {
      hourlyResetRunning = false;
    }
  }), 60 * 60 * 1000); // Reset every hour
  monitoringIntervals.push(hourlyInterval);

  let dailyResetRunning = false;
  // Reset hourly stats daily at midnight (00:00)
  const dailyInterval = setInterval(() => setImmediate(async () => {
    if (dailyResetRunning) return;
    dailyResetRunning = true;
    try {
      const stats = await ApiStats.getOrCreateStats();
      stats.resetHourlyStats();
      await stats.save();
      console.log(`[INFO][API-MONITORING] API Hourly Stats reset at ${new Date().toISOString()} (Daily reset)`);
    } catch (error) {
      console.error('[ERROR][API-MONITORING] Error resetting API hourly stats:', error);
    } finally {
      dailyResetRunning = false;
    }
  }), 24 * 60 * 60 * 1000); // Reset every 24 hours
  monitoringIntervals.push(dailyInterval);

  // Schedule daily reset at midnight (Vietnam timezone)
  const scheduleDailyReset = () => {
    const vietnamNow = getVietnamTime();
    const tomorrow = new Date(vietnamNow);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0); // Set to midnight Vietnam time
    
    // Calculate time until Vietnam midnight
    const timeUntilMidnight = tomorrow.getTime() - vietnamNow.getTime();
    
    const midnightTimeout = setTimeout(() => setImmediate(async () => {
      try {
        const stats = await ApiStats.getOrCreateStats();
        stats.resetHourlyStats();
        await stats.save();
        console.log(`[INFO][API-MONITORING] API Hourly Stats reset at ${new Date().toISOString()} (Scheduled midnight reset)`);
        
        // Schedule next reset
        scheduleDailyReset();
      } catch (error) {
        console.error('[ERROR][API-MONITORING] Error in scheduled hourly stats reset:', error);
        // Schedule next reset even if this one failed
        scheduleDailyReset();
      }
    }), timeUntilMidnight);
    
    // Store timeout for cleanup
    monitoringIntervals.push(midnightTimeout);
    
    console.log(`[INFO][API-MONITORING] Next hourly stats reset scheduled for Vietnam time: ${tomorrow.toISOString()}`);
  };

  // Start the daily reset scheduler
  scheduleDailyReset();

  // Clean old data every 24 hours
  let cleanupRunning = false;
  const cleanupInterval = setInterval(() => setImmediate(async () => {
    if (cleanupRunning) return;
    cleanupRunning = true;
    try {
      await ApiStats.cleanOldData();
    } catch (error) {
      console.error('[ERROR][API-MONITORING] Error cleaning old API stats data:', error);
    } finally {
      cleanupRunning = false;
    }
  }), 24 * 60 * 60 * 1000); // Clean every 24 hours
  monitoringIntervals.push(cleanupInterval);
} else {
  console.log("[INFO][API-MONITORING] Disabled via DISABLE_API_MONITORING flag");
}

/**
 * GET /api-monitoring/stats - Lấy thống kê API từ database
 * @returns {Object} Thống kê chi tiết về API usage
 */
router.get("/stats", authRequired, async (req, res) => {
  try {
    const stats = await ApiStats.getOrCreateStats();
    
    // Ensure dailyReset field exists (migration for old documents)
    if (!stats.dailyReset) {
      stats.dailyReset = {
        lastDailyReset: new Date(),
        dailyTotalRequests: 0
      };
      await stats.save();
    }
    
    // Calculate top endpoints from daily stats (reset at midnight)
    const topEndpointsMap = stats?.dailyTopStats?.topEndpoints;
    const topEndpoints = Array.from((topEndpointsMap && typeof topEndpointsMap.entries === 'function') ? topEndpointsMap.entries() : [])
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([endpoint, count]) => ({ 
        endpoint: endpoint.replace(/_/g, '/'), // Decode endpoint for display
        count 
      }));
    
    // Calculate top IPs from daily stats (reset at midnight)
    const topIPsMap = stats?.dailyTopStats?.topIPs;
    const topIPs = Array.from((topIPsMap && typeof topIPsMap.entries === 'function') ? topIPsMap.entries() : [])
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([encodedIP, count]) => ({ 
        ip: encodedIP.replace(/_/g, '.'), // Decode IP address for display
        count 
      }));
    
    // Calculate hourly distribution from current period
    const requestsByHour = stats?.currentPeriod?.requestsByHour;
    const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      requests: (requestsByHour && typeof requestsByHour.get === 'function') ? (requestsByHour.get(hour.toString()) || 0) : 0
    }));
    
    // Calculate rate limit hit rate
    const rateLimitHitRate = stats.totalRequests > 0 
      ? ((stats.rateLimitHits / stats.totalRequests) * 100).toFixed(2)
      : 0;
    
    // Calculate requests per minute (based on daily reset - since midnight Vietnam time)
    const vietnamNow = getVietnamTime();
    let timeSinceMidnight = 0;
    let requestsPerMinute = 0;
    
    // Validate Date object
    if (isNaN(vietnamNow.getTime())) {
      console.error('Invalid Vietnam time:', vietnamNow);
      // Fallback to current time
      const fallbackTime = new Date();
      const vietnamMidnight = new Date(fallbackTime);
      vietnamMidnight.setHours(0, 0, 0, 0);
      timeSinceMidnight = (fallbackTime - vietnamMidnight) / 1000 / 60;
    } else {
      const vietnamMidnight = new Date(vietnamNow);
      vietnamMidnight.setHours(0, 0, 0, 0);
      timeSinceMidnight = (vietnamNow - vietnamMidnight) / 1000 / 60; // minutes since midnight
      
      // Debug logging
      console.log('Vietnam time debug:', {
        vietnamNow: vietnamNow.toISOString(),
        vietnamMidnight: vietnamMidnight.toISOString(),
        timeSinceMidnight,
        dailyTotalRequests: stats.dailyReset?.dailyTotalRequests || 0
      });
    }
    
    requestsPerMinute = timeSinceMidnight > 0 
      ? ((stats.dailyReset?.dailyTotalRequests || 0) / timeSinceMidnight).toFixed(2)
      : 0;
    
    // Calculate daily requests per minute (total since midnight)
    const dailyRequestsPerMinute = timeSinceMidnight > 0 
      ? (stats.totalRequests / timeSinceMidnight).toFixed(2)
      : 0;
    
    // Convert Maps to objects for JSON response
    const rlhbe = stats?.currentPeriod?.rateLimitHitsByEndpoint;
    const rateLimitHitsByEndpoint = rlhbe && typeof rlhbe.entries === 'function'
      ? Object.fromEntries(rlhbe)
      : {};
    
    res.json({
      success: true,
      data: {
        overview: {
          totalRequests: stats.totalRequests,
          rateLimitHits: stats.rateLimitHits,
          rateLimitHitRate: parseFloat(rateLimitHitRate),
          requestsPerMinute: parseFloat(requestsPerMinute), // Daily requests per minute (since midnight)
          dailyRequestsPerMinute: parseFloat(dailyRequestsPerMinute), // Total requests per minute (since midnight)
          lastReset: stats.dailyReset.lastDailyReset, // Frontend expects 'lastReset'
          timeSinceReset: Math.round(timeSinceMidnight) // Frontend expects 'timeSinceReset'
        },
        topEndpoints,
        topIPs,
        hourlyDistribution,
        rateLimitHitsByEndpoint,
        hourlyStats: stats.hourlyStats.slice(-24), // Last 24 hours
        realtimeUpdates: stats.realtimeUpdates.slice(0, 50) // Last 50 real-time updates
      }
    });
  } catch (error) {
    console.error('Error getting API stats:', error);
    res.status(500).json({
      success: false,
      error: "Failed to get API stats",
      message: error.message
    });
  }
});

/**
 * GET /api-monitoring/rate-limits - Lấy thông tin rate limits
 * @returns {Object} Thông tin rate limits hiện tại
 */
router.get("/rate-limits", authRequired, (req, res) => {
  try {
    const rateLimits = {
      general: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1500,
        description: "General API requests"
      },
      posts: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 800,
        description: "Posts and infinite scroll"
      },
      auth: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 20,
        description: "Authentication requests"
      },
      authStatus: {
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 120,
        description: "Auth status checks"
      },
      upload: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 50,
        description: "File uploads"
      },
      message: {
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 100,
        description: "Messages and chat"
      }
    };
    
    res.json({
      success: true,
      data: rateLimits
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to get rate limits",
      message: error.message
    });
  }
});

/**
 * POST /api-monitoring/reset - Reset API stats trong database
 * @returns {Object} Confirmation message
 */
router.post("/reset", authRequired, async (req, res) => {
  try {
    // Hard reset: delete all documents and recreate fresh
    await ApiStats.deleteMany({});
    await ApiStats.getOrCreateStats();
    
    res.json({
      success: true,
      message: "API stats reset successfully"
    });
  } catch (error) {
    console.error('Error resetting API stats:', error);
    res.status(500).json({
      success: false,
      error: "Failed to reset API stats",
      message: error.message
    });
  }
});

/**
 * GET /api-monitoring/health - Health check for API monitoring
 * @returns {Object} Health status
 */
router.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

export default router;
