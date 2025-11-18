import mongoose from "mongoose";

/**
 * AuditLog Schema - Lưu trữ nhật ký audit cho các hành động admin
 * Tracking tất cả admin actions để security và compliance
 */
const auditLogSchema = new mongoose.Schema({
  // Admin thực hiện hành động
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  
  // Loại hành động (ban_user, unban_user, delete_user, send_notification, etc.)
  action: {
    type: String,
    required: true,
    enum: [
      'ban_user',
      'unban_user', 
      'delete_user',
      'send_notification',
      'update_user_role',
      'create_role',
      'update_role',
      'delete_role',
      'view_admin_stats',
      'view_user_list',
      'login_admin',
      'logout_admin',
      'admin_auto_like',
      'admin_auto_view'
    ],
    index: true
  },
  
  // Đối tượng bị tác động (user ID, role ID, etc.)
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false // Một số actions không có target cụ thể
  },
  
  // Loại đối tượng (user, role, notification, etc.)
  targetType: {
    type: String,
    enum: ['user', 'role', 'notification', 'system'],
    required: false
  },
  
  // Chi tiết hành động (JSON object)
  details: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },
  
  // Kết quả hành động
  result: {
    type: String,
    enum: ['success', 'failed', 'partial', 'started', 'completed'],
    required: true,
    default: 'success'
  },
  
  // Thông tin request
  ipAddress: {
    type: String,
    required: true
  },
  
  clientAgent: {
    type: String,
    required: false
  },
  
  // Thời gian thực hiện
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Lý do (cho các hành động như ban, delete)
  reason: {
    type: String,
    required: false
  },
  
  // Dữ liệu trước và sau thay đổi (cho tracking changes)
  beforeData: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },
  
  afterData: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  }
}, {
  timestamps: true, // Tự động thêm createdAt và updatedAt
  collection: 'auditlogs'
});

// Indexes để optimize queries
auditLogSchema.index({ adminId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ targetId: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 }); // For recent logs

// TTL index - Tự động xóa logs cũ hơn 1 năm để tiết kiệm storage
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

/**
 * Static methods for common audit operations
 */

// Log admin action
auditLogSchema.statics.logAction = async function(adminId, action, options = {}) {
  try {
    const logEntry = new this({
      adminId,
      action,
      targetId: options.targetId,
      targetType: options.targetType,
      details: options.details,
      result: options.result || 'success',
      ipAddress: options.ipAddress || 'unknown',
      clientAgent: options.clientAgent,
      reason: options.reason,
      beforeData: options.beforeData,
      afterData: options.afterData
    });
    
    await logEntry.save();
    return logEntry;
  } catch (error) {
    console.error('[ERROR][AUDIT-LOG] Failed to log audit action:', error);
    // Không throw error để không ảnh hưởng đến main operation
    return null;
  }
};

// Get recent admin activities
auditLogSchema.statics.getRecentActivities = async function(limit = 50) {
  return this.find()
    .populate('adminId', 'name email role')
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

// Get activities by admin
auditLogSchema.statics.getActivitiesByAdmin = async function(adminId, limit = 100) {
  return this.find({ adminId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

// Get activities by action type
auditLogSchema.statics.getActivitiesByAction = async function(action, limit = 100) {
  return this.find({ action })
    .populate('adminId', 'name email')
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

// Get suspicious activities (multiple failed actions)
auditLogSchema.statics.getSuspiciousActivities = async function(timeframe = 24) {
  const since = new Date(Date.now() - timeframe * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: since },
        result: 'failed'
      }
    },
    {
      $group: {
        _id: {
          adminId: '$adminId',
          ipAddress: '$ipAddress'
        },
        failedAttempts: { $sum: 1 },
        actions: { $push: '$action' },
        lastFailure: { $max: '$timestamp' }
      }
    },
    {
      $match: {
        failedAttempts: { $gte: 3 } // 3 or more failed attempts
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id.adminId',
        foreignField: '_id',
        as: 'admin'
      }
    },
    {
      $sort: { failedAttempts: -1 }
    }
  ]);
};

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;