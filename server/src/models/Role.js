import mongoose from "mongoose";

/**
 * Role Schema - Định nghĩa cấu trúc dữ liệu cho roles
 * Cho phép admin tạo và quản lý các role tùy chỉnh
 */
const RoleSchema = new mongoose.Schema({
  // ==================== THÔNG TIN CƠ BẢN ====================
  name: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true,
    lowercase: true,
    match: /^[a-z0-9_-]+$/ // Chỉ cho phép chữ thường, số, gạch ngang và gạch dưới
  }, // Tên role (không dấu, không khoảng trắng)
  
  displayName: { 
    type: String, 
    required: true, 
    trim: true 
  }, // Tên hiển thị cho role
  
  description: { 
    type: String, 
    default: "",
    trim: true 
  }, // Mô tả role
  
  // ==================== GIAO DIỆN ====================
  iconUrl: { 
    type: String, 
    default: "" 
  }, // URL ảnh icon/badge cho role
  
  color: { 
    type: String, 
    default: "#3B82F6",
    match: /^#[0-9A-Fa-f]{6}$/ // Mã màu hex hợp lệ
  }, // Màu sắc đại diện cho role
  
  // ==================== PHÂN QUYỀN ====================
  isDefault: { 
    type: Boolean, 
    default: false 
  }, // Role mặc định không thể xóa
  
  permissions: {
    canCreatePosts: { type: Boolean, default: true },
    canCreateGroups: { type: Boolean, default: true },
    canCreateEvents: { type: Boolean, default: true },
    canModerateContent: { type: Boolean, default: false },
    canBanUsers: { type: Boolean, default: false },
    canManageRoles: { type: Boolean, default: false },
    canAccessAdmin: { type: Boolean, default: false }
  }, // Quyền hạn của role
  
  // ==================== THỐNG KÊ ====================
  userCount: { 
    type: Number, 
    default: 0 
  }, // Số lượng user có role này
  
  // ==================== METADATA ====================
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }, // Admin tạo role
  
  isActive: { 
    type: Boolean, 
    default: true 
  }, // Role có đang hoạt động không
  
  sortOrder: { 
    type: Number, 
    default: 0 
  } // Thứ tự sắp xếp
}, {
  timestamps: true // Tự động thêm createdAt và updatedAt
});

// Index để tối ưu query
RoleSchema.index({ name: 1 });
RoleSchema.index({ isActive: 1 });
RoleSchema.index({ sortOrder: 1 });

// Middleware để cập nhật userCount khi role được sử dụng
RoleSchema.pre('save', function(next) {
  // Cập nhật sortOrder nếu chưa có
  if (this.isNew && this.sortOrder === 0) {
    this.sortOrder = Date.now();
  }
  next();
});

// Static method để lấy role theo tên
RoleSchema.statics.findByName = function(name) {
  return this.findOne({ name: name.toLowerCase(), isActive: true });
};

// Static method để lấy tất cả role active
RoleSchema.statics.getActiveRoles = function() {
  return this.find({ isActive: true }).sort({ sortOrder: 1, createdAt: 1 });
};

// Instance method để kiểm tra quyền
RoleSchema.methods.hasPermission = function(permission) {
  return this.permissions[permission] === true;
};

// Instance method để cập nhật user count
RoleSchema.methods.updateUserCount = async function() {
  const User = mongoose.model('User');
  const count = await User.countDocuments({ role: this.name });
  this.userCount = count;
  await this.save();
  return count;
};

export default mongoose.model('Role', RoleSchema);
