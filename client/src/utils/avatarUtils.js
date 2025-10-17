/**
 * Avatar Utilities - Tạo avatar URL nhất quán cho toàn bộ hệ thống
 */

/**
 * Tạo avatar URL từ tên người dùng
 * @param {string} name - Tên người dùng
 * @param {number} size - Kích thước avatar (mặc định 64)
 * @returns {string} Avatar URL
 */
export function generateAvatarUrl(name, size = 64) {
  if (!name || typeof name !== 'string') {
    name = 'User';
  }
  
  const encoded = encodeURIComponent(name.trim());
  return `https://ui-avatars.com/api/?name=${encoded}&length=2&background=3b82f6&color=ffffff&size=${size}&bold=true`;
}

/**
 * Lấy avatar URL cho user, ưu tiên avatarUrl có sẵn, fallback về generated avatar
 * @param {Object} user - User object
 * @param {number} size - Kích thước avatar (mặc định 64)
 * @returns {string} Avatar URL
 */
export function getUserAvatarUrl(user, size = 64) {
  if (user?.avatarUrl && user.avatarUrl.trim() !== '') {
    return user.avatarUrl;
  }
  
  const name = user?.name || 'User';
  return generateAvatarUrl(name, size);
}

/**
 * Avatar sizes constants
 */
export const AVATAR_SIZES = {
  SMALL: 32,
  MEDIUM: 40,
  LARGE: 64,
  XLARGE: 128
};
