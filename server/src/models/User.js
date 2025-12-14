import mongoose from "mongoose";

/**
 * User Schema
 * Lưu thông tin người dùng: profile, xác thực, quyền, social features và ban system
 */
const UserSchema = new mongoose.Schema({
  // ==================== THÔNG TIN CƠ BẢN ====================
  name: { type: String, required: true, trim: true }, // Tên hiển thị
  email: { type: String, required: true, unique: true, lowercase: true, trim: true }, // Email (unique)
  password: { type: String, required: true }, // Mật khẩu đã hash

  // ==================== PHÂN QUYỀN ====================
  role: {
    type: String,
    default: "user",
    trim: true,
    lowercase: true,
    validate: {
      validator: async function (value) {
        const Role = mongoose.model('Role');
        // Cho phép nếu tồn tại trong collection Role hoặc là 2 role mặc định
        const exists = await Role.exists({ name: value });
        return !!exists || value === 'user' || value === 'admin';
      },
      message: props => `Role "${props.value}" không tồn tại trong hệ thống`
    }
  },

  // ==================== THÔNG TIN CÁ NHÂN ====================
  bio: { type: String, default: "" }, // Tiểu sử
  nickname: { type: String, default: "", trim: true, maxlength: [30, 'Biệt danh không được quá 30 ký tự'] }, // Biệt danh
  avatarUrl: {
    type: String,
    // Default avatar từ UI Avatars service
    default: function () {
      const name = (this.name || "User").trim();
      const encoded = encodeURIComponent(name);
      return `https://ui-avatars.com/api/?name=${encoded}&length=2&background=3b82f6&color=ffffff&size=64&bold=true`;
    }
  },
  coverUrl: { type: String, default: "" }, // Ảnh bìa profile
  birthday: { type: String, default: "" }, // Ngày sinh
  gender: { type: String, default: "" }, // Giới tính
  hobbies: { type: String, default: "" }, // Sở thích
  location: { type: String, default: "" }, // Địa chỉ
  website: { type: String, default: "" }, // Website cá nhân
  phone: { type: String, default: "" }, // Số điện thoại

  // ==================== TÙY CHỈNH HỒ SƠ (PROFILE) ====================
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
  displayBadgeType: {
    type: String,
    enum: ["realm", "title", "both", "none", "role", "cultivation"],
    default: "none"
  }, // Hiển thị badge tu tiên: realm (cảnh giới), title (danh hiệu), both (cả hai), none (không hiển thị - chỉ tick xanh)

  // ==================== PROFILE PERSONALIZATION ====================


  profileSongUrl: {
    type: String,
    default: "",
    validate: {
      validator: function (v) {
        return !v || v.startsWith('https://open.spotify.com/');
      },
      message: 'URL phải là link Spotify hợp lệ'
    }
  }, // Nhạc nền profile (Spotify embed URL)

  featuredPosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }], // Danh sách bài viết ghim (tối đa 5)

  statusUpdate: {
    text: { type: String, default: "", maxlength: 100 },
    emoji: { type: String, default: "" },
    updatedAt: { type: Date, default: Date.now }
  }, // Trạng thái hiện tại của user

  // ==================== TÍNH NĂNG MẠNG XÃ HỘI ====================
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Danh sách bạn bè
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Users bị block
  currentConversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' }, // Chat hiện tại

  // ==================== BÀI VIẾT ĐÃ LƯU ====================
  savedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }], // Bài viết đã lưu

  // ==================== TÙY CHỌN THÍCH BÀI VIẾT ====================
  interestedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }], // Bài viết user quan tâm (sẽ thấy nhiều hơn)
  notInterestedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }], // Bài viết user không quan tâm (sẽ thấy ít hơn)

  // ==================== TRẠNG THÁI ONLINE ====================
  isOnline: { type: Boolean, default: false }, // Có online không
  isVerified: { type: Boolean, default: false }, // Tài khoản đã verify
  lastSeen: { type: Date, default: Date.now }, // Lần cuối online

  // ==================== HỆ THỐNG BAN (CẤM) ====================
  isBanned: { type: Boolean, default: false }, // Có bị ban không
  banReason: { type: String, default: "" }, // Lý do ban
  bannedAt: { type: Date }, // Thời điểm bị ban
  banExpiresAt: { type: Date }, // Thời điểm hết ban (null = permanent)
  bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Admin ban

  // ==================== RESET PASSWORD ====================
  resetPasswordToken: { type: String }, // Token reset password
  resetPasswordExpires: { type: Date }, // Thời hạn token reset

  // ==================== HỆ THỐNG TU TIÊN ====================
  cultivation: { type: mongoose.Schema.Types.ObjectId, ref: 'Cultivation' }, // Tham chiếu đến thông tin tu tiên
  cultivationCache: {
    realmLevel: { type: Number, default: 1 },
    realmName: { type: String, default: "Phàm Nhân" },
    exp: { type: Number, default: 0 },
    equipped: {
      title: { type: String, default: null },
      badge: { type: String, default: null },
      avatarFrame: { type: String, default: null },
      profileEffect: { type: String, default: null }
    }
  }, // Cache cultivation info để hiển thị badge và trang bị nhanh

  // ==================== ONBOARDING (USER MỚI) ====================
  firstLoginAt: { type: Date }, // Thời điểm đăng nhập lần đầu (set khi register)
  firstPostAt: { type: Date }, // Thời điểm đăng bài đầu tiên
  welcomeShown: { type: Boolean, default: false }, // Đã hiện welcome modal chưa
  onboardingCompletedAt: { type: Date } // Thời điểm hoàn thành onboarding
}, {
  timestamps: true, // Tự động thêm createdAt và updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ==================== INDEX CƠ SỞ DỮ LIỆU ====================
// Các index đơn/ghép phục vụ tìm kiếm theo tên, role, trạng thái ban và hoạt động
UserSchema.index({ name: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ isBanned: 1 });
UserSchema.index({ isOnline: 1 });
UserSchema.index({ lastSeen: -1 });

UserSchema.index({ role: 1, isBanned: 1 });
UserSchema.index({ isOnline: 1, lastSeen: -1 });
UserSchema.index({ name: "text", bio: "text" });

// ==================== INSTANCE METHODS ====================

/**
 * Kiểm tra user có đang bị ban hay không
 * @returns {boolean}
 */
UserSchema.methods.isCurrentlyBanned = function () {
  if (!this.isBanned) return false;
  if (!this.banExpiresAt) return true; // Ban vĩnh viễn
  return new Date() < this.banExpiresAt;
};

/**
 * Trả về thời gian ban còn lại (phút)
 * -1 = vĩnh viễn, 0 = không bị ban
 */
UserSchema.methods.getRemainingBanTime = function () {
  if (!this.isCurrentlyBanned()) return 0;
  if (!this.banExpiresAt) return -1;
  return Math.max(0, Math.ceil((this.banExpiresAt - new Date()) / (1000 * 60)));
};

// ==================== VIRTUAL: isNewUser ====================
/**
 * User mới = trong vòng 7 ngày kể từ firstLoginAt hoặc createdAt
 */
UserSchema.virtual('isNewUser').get(function () {
  const referenceDate = this.firstLoginAt || this.createdAt;
  if (!referenceDate) return false;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return referenceDate > sevenDaysAgo;
});

export default mongoose.model("User", UserSchema);