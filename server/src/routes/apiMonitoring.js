import express from "express";
import { authRequired } from "../middleware/auth.js";
import ApiStats from "../models/ApiStats.js";
import { getClientAgent } from "../utils/clientAgent.js";

// TEMP: Cleanup invalid env keys - SIMPLIFIED
(async () => {
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
})();

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

// Middleware to track API calls with database persistence
export const trackAPICall = async (req, res, next) => {
  if (!monitoringEnabled) {
    return next();
  }
  try {
    // Normalize endpoint to safe MongoDB Map key
    let endpoint = req.path.replace(/\./g, '_').replace(/\//g, '_').replace(/:/g, '_');
    
    // Additional safety: ensure endpoint is not empty and doesn't contain problematic characters
    if (!endpoint || endpoint.length === 0) {
      endpoint = 'unknown_endpoint';
    }
    
    // Remove any remaining problematic characters
    endpoint = endpoint.replace(/[^a-zA-Z0-9_]/g, '_');
    
    // Debug logging
    console.log(`[INFO][API-MONITORING] Endpoint: ${req.path} -> ${endpoint}`);
    
    const ip = req.ip;
    // Get hour in Vietnam timezone (GMT+7)
    const vietnamTime = getVietnamTime();
    const hour = vietnamTime.getHours();
    const method = req.method;
    const clientAgent = getClientAgent(req) || "Unknown";

    // Use atomic operations to avoid version conflicts
    const encodedIP = ip.replace(/\./g, '_').replace(/:/g, '_');
    const updateOps = {
      $inc: {
        totalRequests: 1,
        'dailyReset.dailyTotalRequests': 1,
        [`currentPeriod.requestsByEndpoint.${endpoint}`]: 1,
        [`currentPeriod.requestsByIP.${encodedIP}`]: 1,
        [`currentPeriod.requestsByHour.${hour}`]: 1,
        [`dailyTopStats.topEndpoints.${endpoint}`]: 1,
        [`dailyTopStats.topIPs.${encodedIP}`]: 1
      },
      $push: {
        realtimeUpdates: {
          $each: [{
            endpoint,
            method,
            ip,
            statusCode: res.statusCode,
            clientAgent: clientAgent.substring(0, 100),
            timestamp: new Date()
          }],
          $position: 0,
          $slice: 100
        }
      },
      $set: {
        updatedAt: new Date()
      }
    };

    // Add rate limit hit if applicable
    if (res.statusCode === 429) {
      updateOps.$inc.rateLimitHits = 1;
      updateOps.$inc[`currentPeriod.rateLimitHitsByEndpoint.${endpoint}`] = 1;
    }

    // Perform atomic update
    await ApiStats.findOneAndUpdate(
      {},
      updateOps,
      { upsert: true, new: true }
    );

    // Get updated stats for websocket emission
    const stats = await ApiStats.findOne({});

    // Emit real-time update via WebSocket (non-blocking)
    const io = req.app.get('io');
    if (io && stats) {
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
          requestsByEndpoint: stats.currentPeriod?.requestsByEndpoint ? Object.fromEntries(stats.currentPeriod.requestsByEndpoint) : {},
          requestsByIP: stats.currentPeriod?.requestsByIP?.size || 0,
          hourlyDistribution: stats.currentPeriod?.requestsByHour ? Object.fromEntries(stats.currentPeriod.requestsByHour) : {}
        }
      };

      // Emit to all admin users
      io.to('api-monitoring').emit('api_monitoring_update', realTimeUpdate);
    }

    next();
  } catch (error) {
    console.error('[ERROR][API-MONITORING] Error tracking API call:', error);
    next(); // Continue even if tracking fails
  }
};

if (monitoringEnabled) {
  // Reset current period stats every hour with database persistence
  setInterval(async () => {
    try {
      const stats = await ApiStats.getOrCreateStats();
      stats.resetCurrentPeriod();
      await stats.save();
      console.log(`[INFO][API-MONITORING] API Current Period Stats reset at ${new Date().toISOString()}`);
    } catch (error) {
      console.error('[ERROR][API-MONITORING] Error resetting API current period stats:', error);
    }
  }, 60 * 60 * 1000); // Reset every hour

  // Reset hourly stats daily at midnight (00:00)
  setInterval(async () => {
    try {
      const stats = await ApiStats.getOrCreateStats();
      stats.resetHourlyStats();
      await stats.save();
      console.log(`[INFO][API-MONITORING] API Hourly Stats reset at ${new Date().toISOString()} (Daily reset)`);
    } catch (error) {
      console.error('[ERROR][API-MONITORING] Error resetting API hourly stats:', error);
    }
  }, 24 * 60 * 60 * 1000); // Reset every 24 hours

  // Schedule daily reset at midnight (Vietnam timezone)
  const scheduleDailyReset = () => {
    const vietnamNow = getVietnamTime();
    const tomorrow = new Date(vietnamNow);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0); // Set to midnight Vietnam time
    
    // Calculate time until Vietnam midnight
    const timeUntilMidnight = tomorrow.getTime() - vietnamNow.getTime();
    
    setTimeout(async () => {
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
    }, timeUntilMidnight);
    
    console.log(`[INFO][API-MONITORING] Next hourly stats reset scheduled for Vietnam time: ${tomorrow.toISOString()}`);
  };

  // Start the daily reset scheduler
  scheduleDailyReset();

  // Clean old data every 24 hours
  setInterval(async () => {
    try {
      await ApiStats.cleanOldData();
    } catch (error) {
      console.error('[ERROR][API-MONITORING] Error cleaning old API stats data:', error);
    }
  }, 24 * 60 * 60 * 1000); // Clean every 24 hours
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
