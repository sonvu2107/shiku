import mongoose from "mongoose";

/**
 * User Schema - Định nghĩa cấu trúc dữ liệu cho users
 * Bao gồm thông tin cá nhân, authentication, social features, và ban system
 */
const UserSchema = new mongoose.Schema({
  // ==================== THÔNG TIN CƠ BẢN ====================
  name: { type: String, required: true, trim: true }, // Tên hiển thị
  email: { type: String, required: true, unique: true, lowercase: true, trim: true }, // Email (unique)
  password: { type: String, required: true }, // Mật khẩu đã hash
  
  // ==================== PHÂN QUYỀN ====================
  role: { 
    type: String, 
    enum: ["user", "admin", "sololeveling", "sybau", "moxumxue", "gay"], // Các role đặc biệt
    default: "user" 
  },
  
  // ==================== THÔNG TIN CÁ NHÂN ====================
  bio: { type: String, default: "" }, // Tiểu sử
  avatarUrl: {
    type: String,
    // Default avatar từ UI Avatars service
    default: function () {
      return `https://ui-avatars.com/api/?name=User&background=3b82f6&color=ffffff`;
    }
  },
  coverUrl: { type: String, default: "" }, // Ảnh bìa profile
  birthday: { type: String, default: "" }, // Ngày sinh
  gender: { type: String, default: "" }, // Giới tính
  hobbies: { type: String, default: "" }, // Sở thích
  location: { type: String, default: "" }, // Địa chỉ
  website: { type: String, default: "" }, // Website cá nhân
  phone: { type: String, default: "" }, // Số điện thoại
  
  // ==================== PROFILE CUSTOMIZATION ====================
  profileTheme: { 
    type: String, 
    enum: ["default", "dark", "blue", "green", "purple", "pink", "orange"], 
    default: "default" 
  }, // Theme màu sắc profile
  profileLayout: { 
    type: String, 
    enum: ["classic", "modern", "minimal", "creative"], 
    default: "classic" 
  }, // Layout style profile
  useCoverImage: { type: Boolean, default: true }, // Hiển thị ảnh bìa thay vì màu theme
  showEmail: { type: Boolean, default: false }, // Hiển thị email công khai
  showPhone: { type: Boolean, default: false }, // Hiển thị số điện thoại
  showBirthday: { type: Boolean, default: true }, // Hiển thị ngày sinh
  showLocation: { type: Boolean, default: true }, // Hiển thị địa chỉ
  showWebsite: { type: Boolean, default: true }, // Hiển thị website
  showHobbies: { type: Boolean, default: true }, // Hiển thị sở thích
  showFriends: { type: Boolean, default: true }, // Hiển thị danh sách bạn bè
  showPosts: { type: Boolean, default: true }, // Hiển thị bài đăng
  showEvents: { type: Boolean, default: true }, // Hiển thị sự kiện tham gia
  
  // ==================== SOCIAL FEATURES ====================
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Danh sách bạn bè
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Users bị block
  currentConversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' }, // Chat hiện tại
  
  // ==================== TRẠNG THÁI ONLINE ====================
  isOnline: { type: Boolean, default: false }, // Có online không
  isVerified: { type: Boolean, default: false }, // Tài khoản đã verify
  lastSeen: { type: Date, default: Date.now }, // Lần cuối online
  
  // ==================== BAN SYSTEM ====================
  isBanned: { type: Boolean, default: false }, // Có bị ban không
  banReason: { type: String, default: "" }, // Lý do ban
  bannedAt: { type: Date }, // Thời điểm bị ban
  banExpiresAt: { type: Date }, // Thời điểm hết ban (null = permanent)
  bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Admin ban
  
  // ==================== RESET PASSWORD ====================
  resetPasswordToken: { type: String }, // Token reset password
  resetPasswordExpires: { type: Date } // Thời hạn token reset
}, { 
  timestamps: true // Tự động thêm createdAt và updatedAt
});

// ==================== DATABASE INDEXES ====================

// Single field indexes
// Note: email index is automatically created by unique: true in schema
UserSchema.index({ name: 1 }); // Name search
UserSchema.index({ role: 1 }); // Role-based queries
UserSchema.index({ isBanned: 1 }); // Ban status queries
UserSchema.index({ isOnline: 1 }); // Online status queries
UserSchema.index({ lastSeen: -1 }); // Recent activity

// Compound indexes for common queries
UserSchema.index({ role: 1, isBanned: 1 }); // Admin queries
UserSchema.index({ isOnline: 1, lastSeen: -1 }); // Online users
UserSchema.index({ name: "text", bio: "text" }); // Text search

// ==================== INSTANCE METHODS ====================

/**
 * Kiểm tra user có đang bị ban không
 * @returns {boolean} true nếu đang bị ban
 */
UserSchema.methods.isCurrentlyBanned = function () {
  if (!this.isBanned) return false; // Không bị đánh dấu ban
  if (!this.banExpiresAt) return true; // Ban vĩnh viễn
  return new Date() < this.banExpiresAt; // Kiểm tra thời hạn ban
};

/**
 * Lấy thời gian ban còn lại tính bằng phút
 * @returns {number} Số phút còn lại, -1 nếu ban vĩnh viễn, 0 nếu không bị ban
 */
UserSchema.methods.getRemainingBanTime = function () {
  if (!this.isCurrentlyBanned()) return 0; // Không bị ban
  if (!this.banExpiresAt) return -1; // Ban vĩnh viễn
  // Tính số phút còn lại
  return Math.max(0, Math.ceil((this.banExpiresAt - new Date()) / (1000 * 60)));
};

export default mongoose.model("User", UserSchema);