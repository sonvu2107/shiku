import express from "express";
import { authRequired } from "../middleware/auth.js";
import ApiStats from "../models/ApiStats.js";

const router = express.Router();

// Middleware to track API calls with database persistence
export const trackAPICall = async (req, res, next) => {
  try {
    const endpoint = req.path;
    const ip = req.ip;
    const hour = new Date().getHours();
    const method = req.method;
    const userAgent = req.get('User-Agent') || 'Unknown';
    
    // Get or create stats document
    const stats = await ApiStats.getOrCreateStats();
    
    // Increment total requests
    stats.totalRequests++;
    
    // Track by endpoint
    stats.incrementEndpoint(endpoint);
    
    // Track by IP
    stats.incrementIP(ip);
    
    // Track by hour
    stats.incrementHour(hour);
    
    // Track rate limit hits
    if (res.statusCode === 429) {
      stats.incrementRateLimitHit(endpoint);
    }
    
    // Add real-time update
    stats.addRealtimeUpdate({
      endpoint,
      method,
      ip,
      statusCode: res.statusCode,
      userAgent: userAgent.substring(0, 100)
    });
    
    // Save to database
    await stats.save();
    
    // Emit real-time update via WebSocket
    const io = req.app.get('io');
    if (io) {
      // Calculate daily requests per minute for realtime update
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);
      const timeSinceMidnight = (now - midnight) / 1000 / 60;
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
          userAgent: userAgent.substring(0, 100),
          totalRequests: stats.totalRequests,
          rateLimitHits: stats.rateLimitHits,
          dailyRequestsPerMinute: parseFloat(dailyRequestsPerMinute),
          requestsByEndpoint: Object.fromEntries(stats.currentPeriod.requestsByEndpoint),
          requestsByIP: stats.currentPeriod.requestsByIP.size,
          hourlyDistribution: Object.fromEntries(stats.currentPeriod.requestsByHour)
        }
      };
      
      // Emit to all admin users
      io.emit('api_monitoring_update', realTimeUpdate);
    }
    
    next();
  } catch (error) {
    console.error('Error tracking API call:', error);
    next(); // Continue even if tracking fails
  }
};

// Reset current period stats every hour with database persistence
setInterval(async () => {
  try {
    const stats = await ApiStats.getOrCreateStats();
    stats.resetCurrentPeriod();
    await stats.save();
    console.log(`API Current Period Stats reset at ${new Date().toISOString()}`);
  } catch (error) {
    console.error('Error resetting API current period stats:', error);
  }
}, 60 * 60 * 1000); // Reset every hour

// Reset hourly stats daily at midnight (00:00)
setInterval(async () => {
  try {
    const stats = await ApiStats.getOrCreateStats();
    stats.resetHourlyStats();
    await stats.save();
    console.log(`API Hourly Stats reset at ${new Date().toISOString()} (Daily reset)`);
  } catch (error) {
    console.error('Error resetting API hourly stats:', error);
  }
}, 24 * 60 * 60 * 1000); // Reset every 24 hours

// Schedule daily reset at midnight
const scheduleDailyReset = () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0); // Set to midnight
  
  const timeUntilMidnight = tomorrow.getTime() - now.getTime();
  
  setTimeout(async () => {
    try {
      const stats = await ApiStats.getOrCreateStats();
      stats.resetHourlyStats();
      await stats.save();
      console.log(`API Hourly Stats reset at ${new Date().toISOString()} (Scheduled midnight reset)`);
      
      // Schedule next reset
      scheduleDailyReset();
    } catch (error) {
      console.error('Error in scheduled hourly stats reset:', error);
      // Schedule next reset even if this one failed
      scheduleDailyReset();
    }
  }, timeUntilMidnight);
  
  console.log(`Next hourly stats reset scheduled for: ${tomorrow.toISOString()}`);
};

// Start the daily reset scheduler
scheduleDailyReset();

// Clean old data every 24 hours
setInterval(async () => {
  try {
    await ApiStats.cleanOldData();
  } catch (error) {
    console.error('Error cleaning old API stats data:', error);
  }
}, 24 * 60 * 60 * 1000); // Clean every 24 hours

/**
 * GET /api-monitoring/stats - Lấy thống kê API từ database
 * @returns {Object} Thống kê chi tiết về API usage
 */
router.get("/stats", authRequired, async (req, res) => {
  try {
    const stats = await ApiStats.getOrCreateStats();
    
    // Calculate top endpoints from daily stats (reset at midnight)
    const topEndpoints = Array.from(stats.dailyTopStats.topEndpoints.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, count }));
    
    // Calculate top IPs from daily stats (reset at midnight)
    const topIPs = Array.from(stats.dailyTopStats.topIPs.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([encodedIP, count]) => ({ 
        ip: encodedIP.replace(/_/g, '.'), // Decode IP address for display
        count 
      }));
    
    // Calculate hourly distribution from current period
    const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      requests: stats.currentPeriod.requestsByHour.get(hour.toString()) || 0
    }));
    
    // Calculate rate limit hit rate
    const rateLimitHitRate = stats.totalRequests > 0 
      ? ((stats.rateLimitHits / stats.totalRequests) * 100).toFixed(2)
      : 0;
    
    // Calculate requests per minute (based on current period)
    const now = new Date();
    const timeSinceReset = (now - stats.lastReset) / 1000 / 60; // minutes
    
    // Calculate current period total requests
    const currentPeriodTotalRequests = Array.from(stats.currentPeriod.requestsByEndpoint.values())
      .reduce((sum, count) => sum + count, 0);
    
    const requestsPerMinute = timeSinceReset > 0 
      ? (currentPeriodTotalRequests / timeSinceReset).toFixed(2)
      : 0;
    
    // Calculate daily requests per minute (since midnight)
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    const timeSinceMidnight = (now - midnight) / 1000 / 60; // minutes since midnight
    
    const dailyRequestsPerMinute = timeSinceMidnight > 0 
      ? (stats.totalRequests / timeSinceMidnight).toFixed(2)
      : 0;
    
    // Convert Maps to objects for JSON response
    const rateLimitHitsByEndpoint = Object.fromEntries(stats.currentPeriod.rateLimitHitsByEndpoint);
    
    res.json({
      success: true,
      data: {
        overview: {
          totalRequests: stats.totalRequests,
          rateLimitHits: stats.rateLimitHits,
          rateLimitHitRate: parseFloat(rateLimitHitRate),
          requestsPerMinute: parseFloat(requestsPerMinute), // Current period (last hour)
          dailyRequestsPerMinute: parseFloat(dailyRequestsPerMinute), // Since midnight
          lastReset: stats.lastReset,
          timeSinceReset: Math.round(timeSinceReset),
          timeSinceMidnight: Math.round(timeSinceMidnight)
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
    const stats = await ApiStats.getOrCreateStats();
    
    // Reset all stats
    stats.totalRequests = 0;
    stats.rateLimitHits = 0;
    stats.currentPeriod.requestsByEndpoint = new Map();
    stats.currentPeriod.requestsByIP = new Map();
    stats.currentPeriod.requestsByHour = new Map();
    stats.currentPeriod.rateLimitHitsByEndpoint = new Map();
    stats.dailyTopStats.topEndpoints = new Map();
    stats.dailyTopStats.topIPs = new Map();
    stats.lastReset = new Date();
    stats.hourlyStats = [];
    stats.realtimeUpdates = [];
    
    await stats.save();
    
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