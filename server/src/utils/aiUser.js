import User from '../models/User.js';
import crypto from 'crypto';

/**
 * AI User Utility
 * 
 * Tạo và quản lý AI user cho chatbot functionality.
 * AI user là một system user đặc biệt dùng cho chatbot messages.
 * 
 * @module aiUser
 */

/**
 * Tìm hoặc tạo AI user để sử dụng cho chatbot messages.
 * AI user sử dụng email internal đặc biệt và không thể login.
 * 
 * @returns {Promise<Object>} AI user document
 * @throws {Error} Nếu không thể tạo AI user
 */
export async function getOrCreateAIUser() {
  try {
    // Tìm AI user với email đặc biệt (internal domain)
    let aiUser = await User.findOne({ email: 'ai@shiku.internal' });
    
    if (aiUser) {
      return aiUser;
    }

    // Tạo AI user mới với password random (không thể đoán được)
    // Password này không bao giờ được sử dụng vì AI user không có login flow
    const randomPassword = crypto.randomBytes(32).toString('hex');
    
    aiUser = new User({
      name: 'Trợ lý AI',
      email: 'ai@shiku.internal',
      password: randomPassword,
      avatarUrl: null,
      isEmailVerified: true,
      role: 'user',
    });

    await aiUser.save();
    return aiUser;
  } catch (error) {
    console.error('[ERROR][AI-USER] Error getting or creating AI user:', error);
    throw error;
  }
}

export default getOrCreateAIUser;

