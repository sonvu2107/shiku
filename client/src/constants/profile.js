/**
 * Constants cho Profile Page
 */

export const PROFILE_TABS = [
  { id: "posts", label: "Bài viết", icon: "FileText" },
  { id: "info", label: "Thông tin", icon: "Info" },
  { id: "friends", label: "Bạn bè", icon: "Users" },
  { id: "analytics", label: "Phân tích", icon: "BarChart3" },
];

export const GENDER_OPTIONS = [
  { value: "", label: "Chọn" },
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
  { value: "other", label: "Khác" },
];

export const ANALYTICS_PERIODS = [
  { value: "7d", label: "7 ngày qua" },
  { value: "30d", label: "30 ngày qua" },
  { value: "90d", label: "90 ngày qua" },
  { value: "1y", label: "1 năm qua" },
];

export const PROFILE_MESSAGES = {
  NO_POSTS: {
    title: "Chưa có bài viết nào",
    description: "Chia sẻ khoảnh khắc đầu tiên của bạn!",
  },
  NO_FRIENDS: {
    title: "Chưa có bạn bè",
    description: "Kết bạn để kết nối và chia sẻ với mọi người!",
  },
  NO_ANALYTICS: {
    title: "Chưa có dữ liệu phân tích",
    description: "Tạo bài viết để bắt đầu theo dõi thống kê!",
  },
  NO_BIO: "Chưa cập nhật tiểu sử",
  NO_NICKNAME: "Chưa có biệt danh",
};

export const VALIDATION_RULES = {
  PASSWORD: {
    minLength: 8,
    requireLower: true,
    requireUpper: true,
    requireDigit: true,
    requireSpecial: true,
    specialChars: /[@$!%*?&]/,
  },
  PHONE: /^[\+]?[0-9\s\-\(\)]{10,15}$/,
  BIRTHDAY: /^\d{4}-\d{2}-\d{2}$/,
  BIRTHDAY_YEAR_MIN: 1900,
};

