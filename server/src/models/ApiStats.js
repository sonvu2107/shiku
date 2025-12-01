import mongoose from 'mongoose';

const apiStatsSchema = new mongoose.Schema({
  // Thông số cơ bản
  totalRequests: {
    type: Number,
    default: 0
  },
  rateLimitHits: {
    type: Number,
    default: 0
  },
  
  // Theo dõi thời gian reset
  lastReset: {
    type: Date,
    default: Date.now
  },
  
  // Thống kê hàng giờ cho dữ liệu lịch sử
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
  
  // Thống kê cho khoảng thời gian hiện tại (reset mỗi giờ)
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
  
  // Thống kê top 10 hàng ngày (reset vào nửa đêm hàng ngày)
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
  
  // Theo dõi reset hàng ngày (reset vào nửa đêm hàng ngày)
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
  
  // Cập nhật thời gian thực (100 cuộc gọi gần nhất)
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

// Index cho hiệu năng
apiStatsSchema.index({ createdAt: -1 });
apiStatsSchema.index({ 'realtimeUpdates.timestamp': -1 });

// Phương thức thêm cập nhật thời gian thực
apiStatsSchema.methods.addRealtimeUpdate = function(updateData) {
  // Thêm vào mảng cập nhật thời gian thực
  this.realtimeUpdates.unshift({
    endpoint: updateData.endpoint,
    method: updateData.method,
    ip: updateData.ip,
    statusCode: updateData.statusCode,
    clientAgent: updateData.clientAgent,
    timestamp: new Date()
  });
  
  // Giữ lại chỉ 100 cập nhật gần nhất
  if (this.realtimeUpdates.length > 100) {
    this.realtimeUpdates = this.realtimeUpdates.slice(0, 100);
  }
  
  this.updatedAt = new Date();
};

// Phương thức tăng số lượng endpoint
apiStatsSchema.methods.incrementEndpoint = function(endpoint) {
  // Tăng thống kê cho khoảng thời gian hiện tại
  const current = this.currentPeriod.requestsByEndpoint.get(endpoint) || 0;
  this.currentPeriod.requestsByEndpoint.set(endpoint, current + 1);
  
  // Cũng tăng thống kê top hàng ngày
  const dailyCurrent = this.dailyTopStats.topEndpoints.get(endpoint) || 0;
  this.dailyTopStats.topEndpoints.set(endpoint, dailyCurrent + 1);
  
  this.updatedAt = new Date();
};

// Phương thức tăng tổng số yêu cầu hàng ngày
apiStatsSchema.methods.incrementDailyTotalRequests = function() {
  this.dailyReset.dailyTotalRequests++;
  this.updatedAt = new Date();
};

// Phương thức tăng số lượng IP
apiStatsSchema.methods.incrementIP = function(ip) {
  //Mã hóa địa chỉ IP để tránh dấu chấm trong Khóa bản đồ (Mongoose không cho phép dấu chấm trong Khóa bản đồ)
  const encodedIP = ip.replace(/\./g, '_');
  
  // Tăng thống kê cho khoảng thời gian hiện tại
  const current = this.currentPeriod.requestsByIP.get(encodedIP) || 0;
  this.currentPeriod.requestsByIP.set(encodedIP, current + 1);
  
  // Cũng tăng thống kê top hàng ngày
  const dailyCurrent = this.dailyTopStats.topIPs.get(encodedIP) || 0;
  this.dailyTopStats.topIPs.set(encodedIP, dailyCurrent + 1);
  
  this.updatedAt = new Date();
};

// Phương thức tăng số giờ
apiStatsSchema.methods.incrementHour = function(hour) {
  // Chuyển giờ thành chuỗi vì Mongoose Map chỉ hỗ trợ khóa chuỗi
  const hourKey = hour.toString();
  const current = this.currentPeriod.requestsByHour.get(hourKey) || 0;
  this.currentPeriod.requestsByHour.set(hourKey, current + 1);
  this.updatedAt = new Date();
};

// Phương thức tăng số lần giới hạn tốc độ
apiStatsSchema.methods.incrementRateLimitHit = function(endpoint) {
  this.rateLimitHits++;
  const current = this.currentPeriod.rateLimitHitsByEndpoint.get(endpoint) || 0;
  this.currentPeriod.rateLimitHitsByEndpoint.set(endpoint, current + 1);
  this.updatedAt = new Date();
};

// Phương thức đặt lại thống kê khoảng thời gian hiện tại (mỗi giờ)
apiStatsSchema.methods.resetCurrentPeriod = function() {
  const now = new Date();
  const currentHour = now.getHours();
  
  // Lưu thống kê giờ hiện tại vào dữ liệu lịch sử
  this.hourlyStats.push({
    hour: currentHour,
    totalRequests: this.totalRequests,
    rateLimitHits: this.rateLimitHits,
    requestsByEndpoint: new Map(this.currentPeriod.requestsByEndpoint),
    requestsByIP: new Map(this.currentPeriod.requestsByIP),
    timestamp: now
  });
  
  // Giữ lại chỉ 24 giờ gần nhất
  if (this.hourlyStats.length > 24) {
    this.hourlyStats.shift();
  }
  
  // Reset chu kỳ hiện tại (nhưng giữ requestsByHour cho phân tích hàng ngày)
  this.currentPeriod.requestsByEndpoint = new Map();
  this.currentPeriod.requestsByIP = new Map();
  this.currentPeriod.rateLimitHitsByEndpoint = new Map();
  this.lastReset = now;
  this.updatedAt = now;
};

// Phương thức đặt lại thống kê hàng giờ (hàng ngày vào nửa đêm)  
apiStatsSchema.methods.resetHourlyStats = function() {
  // Reset phân phối hàng giờ cho phân tích hàng ngày
  this.currentPeriod.requestsByHour = new Map();
  
  // Reset top 10 thông số hàng ngày
  this.dailyTopStats.topEndpoints = new Map();
  this.dailyTopStats.topIPs = new Map();
  
  // Reset theo dõi hàng ngày
  this.dailyReset.lastDailyReset = new Date();
  this.dailyReset.dailyTotalRequests = 0;
  
  this.updatedAt = new Date();
};

// Phương pháp tĩnh để lấy hoặc tạo tài liệu thống kê
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

  // Phương pháp tĩnh để làm sạch dữ liệu cũ (cũ hơn 7 ngày)
apiStatsSchema.statics.cleanOldData = async function() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  await this.deleteMany({
    createdAt: { $lt: sevenDaysAgo }
  });
  
  console.log('[INFO][API-STATS] Cleaned old API stats data');
};

// Lưu trước phần mềm trung gian để cập nhật updatedAt
apiStatsSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const ApiStats = mongoose.model('ApiStats', apiStatsSchema);

export default ApiStats;
