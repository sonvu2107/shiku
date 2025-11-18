import mongoose from 'mongoose';

const apiStatsSchema = new mongoose.Schema({
  // Basic stats
  totalRequests: {
    type: Number,
    default: 0
  },
  rateLimitHits: {
    type: Number,
    default: 0
  },
  
  // Time tracking
  lastReset: {
    type: Date,
    default: Date.now
  },
  
  // Hourly stats for historical data
  hourlyStats: [{
    hour: {
      type: Number,
      required: true
    },
    totalRequests: {
      type: Number,
      default: 0
    },
    rateLimitHits: {
      type: Number,
      default: 0
    },
    requestsByEndpoint: {
      type: Map,
      of: Number,
      default: new Map()
    },
    requestsByIP: {
      type: Map,
      of: Number,
      default: new Map()
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Current period stats (reset every hour)
  currentPeriod: {
    requestsByEndpoint: {
      type: Map,
      of: Number,
      default: new Map()
    },
    requestsByIP: {
      type: Map,
      of: Number,
      default: new Map()
    },
    requestsByHour: {
      type: Map,
      of: Number,
      default: new Map()
    },
    rateLimitHitsByEndpoint: {
      type: Map,
      of: Number,
      default: new Map()
    }
  },
  
  // Daily top 10 stats (reset at midnight daily)
  dailyTopStats: {
    topEndpoints: {
      type: Map,
      of: Number,
      default: new Map()
    },
    topIPs: {
      type: Map,
      of: Number,
      default: new Map()
    }
  },
  
  // Daily reset tracking (reset at midnight daily)
  dailyReset: {
    lastDailyReset: {
      type: Date,
      default: Date.now
    },
    dailyTotalRequests: {
      type: Number,
      default: 0
    }
  },
  
  // Real-time updates (last 100 calls)
  realtimeUpdates: [{
    endpoint: {
      type: String,
      required: true
    },
    method: {
      type: String,
      required: true
    },
    ip: {
      type: String,
      required: true
    },
    statusCode: {
      type: Number,
      required: true
    },
    clientAgent: {
      type: String,
      maxlength: 200
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for performance
apiStatsSchema.index({ createdAt: -1 });
apiStatsSchema.index({ 'realtimeUpdates.timestamp': -1 });

// Method to add real-time update
apiStatsSchema.methods.addRealtimeUpdate = function(updateData) {
  // Add to realtime updates array
  this.realtimeUpdates.unshift({
    endpoint: updateData.endpoint,
    method: updateData.method,
    ip: updateData.ip,
    statusCode: updateData.statusCode,
    clientAgent: updateData.clientAgent,
    timestamp: new Date()
  });
  
  // Keep only last 100 updates
  if (this.realtimeUpdates.length > 100) {
    this.realtimeUpdates = this.realtimeUpdates.slice(0, 100);
  }
  
  this.updatedAt = new Date();
};

// Method to increment endpoint count
apiStatsSchema.methods.incrementEndpoint = function(endpoint) {
  // Increment current period stats
  const current = this.currentPeriod.requestsByEndpoint.get(endpoint) || 0;
  this.currentPeriod.requestsByEndpoint.set(endpoint, current + 1);
  
  // Also increment daily top stats
  const dailyCurrent = this.dailyTopStats.topEndpoints.get(endpoint) || 0;
  this.dailyTopStats.topEndpoints.set(endpoint, dailyCurrent + 1);
  
  this.updatedAt = new Date();
};

// Method to increment daily total requests
apiStatsSchema.methods.incrementDailyTotalRequests = function() {
  this.dailyReset.dailyTotalRequests++;
  this.updatedAt = new Date();
};

// Method to increment IP count
apiStatsSchema.methods.incrementIP = function(ip) {
  // Encode IP address to avoid dots in Map keys (Mongoose doesn't allow dots in Map keys)
  const encodedIP = ip.replace(/\./g, '_');
  
  // Increment current period stats
  const current = this.currentPeriod.requestsByIP.get(encodedIP) || 0;
  this.currentPeriod.requestsByIP.set(encodedIP, current + 1);
  
  // Also increment daily top stats
  const dailyCurrent = this.dailyTopStats.topIPs.get(encodedIP) || 0;
  this.dailyTopStats.topIPs.set(encodedIP, dailyCurrent + 1);
  
  this.updatedAt = new Date();
};

// Method to increment hour count
apiStatsSchema.methods.incrementHour = function(hour) {
  // Convert hour to string since Mongoose Map only supports string keys
  const hourKey = hour.toString();
  const current = this.currentPeriod.requestsByHour.get(hourKey) || 0;
  this.currentPeriod.requestsByHour.set(hourKey, current + 1);
  this.updatedAt = new Date();
};

// Method to increment rate limit hit
apiStatsSchema.methods.incrementRateLimitHit = function(endpoint) {
  this.rateLimitHits++;
  const current = this.currentPeriod.rateLimitHitsByEndpoint.get(endpoint) || 0;
  this.currentPeriod.rateLimitHitsByEndpoint.set(endpoint, current + 1);
  this.updatedAt = new Date();
};

// Method to reset current period stats (every hour)
apiStatsSchema.methods.resetCurrentPeriod = function() {
  const now = new Date();
  const currentHour = now.getHours();
  
  // Save current hour's stats to historical data
  this.hourlyStats.push({
    hour: currentHour,
    totalRequests: this.totalRequests,
    rateLimitHits: this.rateLimitHits,
    requestsByEndpoint: new Map(this.currentPeriod.requestsByEndpoint),
    requestsByIP: new Map(this.currentPeriod.requestsByIP), // IPs are already encoded
    timestamp: now
  });
  
  // Keep only last 24 hours
  if (this.hourlyStats.length > 24) {
    this.hourlyStats.shift();
  }
  
  // Reset current period (but keep requestsByHour for daily analysis)
  this.currentPeriod.requestsByEndpoint = new Map();
  this.currentPeriod.requestsByIP = new Map();
  this.currentPeriod.rateLimitHitsByEndpoint = new Map();
  this.lastReset = now;
  this.updatedAt = now;
};

// Method to reset hourly stats (daily at midnight)
apiStatsSchema.methods.resetHourlyStats = function() {
  // Reset hourly distribution for daily analysis
  this.currentPeriod.requestsByHour = new Map();
  
  // Reset daily top 10 stats
  this.dailyTopStats.topEndpoints = new Map();
  this.dailyTopStats.topIPs = new Map();
  
  // Reset daily tracking
  this.dailyReset.lastDailyReset = new Date();
  this.dailyReset.dailyTotalRequests = 0;
  
  this.updatedAt = new Date();
};

// Static method to get or create stats document
apiStatsSchema.statics.getOrCreateStats = async function() {
  let stats = await this.findOne().sort({ createdAt: -1 });
  
  if (!stats) {
    stats = new this({
      totalRequests: 0,
      rateLimitHits: 0,
      lastReset: new Date(),
      hourlyStats: [],
      currentPeriod: {
        requestsByEndpoint: new Map(),
        requestsByIP: new Map(),
        requestsByHour: new Map(),
        rateLimitHitsByEndpoint: new Map()
      },
      dailyTopStats: {
        topEndpoints: new Map(),
        topIPs: new Map()
      },
      dailyReset: {
        lastDailyReset: new Date(),
        dailyTotalRequests: 0
      },
      realtimeUpdates: []
    });
    await stats.save();
  }
  
  return stats;
};

// Static method to clean old data (older than 7 days)
apiStatsSchema.statics.cleanOldData = async function() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  await this.deleteMany({
    createdAt: { $lt: sevenDaysAgo }
  });
  
  console.log('[INFO][API-STATS] Cleaned old API stats data');
};

// Pre-save middleware to update updatedAt
apiStatsSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const ApiStats = mongoose.model('ApiStats', apiStatsSchema);

export default ApiStats;
