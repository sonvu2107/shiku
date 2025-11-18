import User from '../models/User.js';

/**
 * Tìm hoặc tạo AI user để sử dụng cho chatbot messages
 * @returns {Promise<Object>} AI user
 */
export async function getOrCreateAIUser() {
  try {
    // Tìm AI user với email đặc biệt
    let aiUser = await User.findOne({ email: 'ai@shiku.internal' });
    
    if (aiUser) {
      return aiUser;
    }

    // Tạo AI user mới
    aiUser = new User({
      name: 'Trợ lý AI',
      email: 'ai@shiku.internal',
      password: 'ai_user_password_never_used', // Password không bao giờ được dùng
      avatarUrl: null,
      isEmailVerified: true,
      role: 'user',
      // Đánh dấu đây là AI user (có thể thêm field isAI: true nếu cần)
    });

    await aiUser.save();
    return aiUser;
  } catch (error) {
    console.error('[ERROR][AI-USER] Error getting or creating AI user:', error);
    throw error;
  }
}

export default getOrCreateAIUser;

