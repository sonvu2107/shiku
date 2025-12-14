import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { getSystemInstruction, getInitialChatHistory } from '../config/shikuKnowledgeBase.js';

dotenv.config();

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    if (!this.apiKey) {
      console.warn('[WARN][GEMINI] GEMINI_API_KEY is not set in environment variables');
    }
    this.genAI = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
    this.model = null;
    this.chatSessions = new Map(); // Lưu trữ chat sessions cho từng user
    this.sessionLastActivity = new Map(); // Track last activity
    this.SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    this.MAX_SESSIONS = 1000; // Maximum concurrent sessions

    // Cleanup interval for expired sessions
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000); // Run every 5 minutes

    // Allow process to exit even if interval is running
    this.cleanupInterval.unref();
  }

  /**
   * Cleanup expired sessions to prevent memory leak
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [userId, lastActivity] of this.sessionLastActivity.entries()) {
      if (now - lastActivity > this.SESSION_TIMEOUT) {
        this.chatSessions.delete(userId);
        this.sessionLastActivity.delete(userId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[INFO][GEMINI] Cleaned up ${cleanedCount} expired sessions`);
    }
  }

  /**
   * Khởi tạo model Gemini với system instruction về Shiku
   */
  initializeModel(modelName = 'gemini-2.5-flash') {
    if (!this.genAI) {
      throw new Error('Gemini API key is not configured');
    }

    // Lấy system instruction về Shiku
    const systemInstruction = getSystemInstruction();

    this.model = this.genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemInstruction,
    });
  }

  /**
   * Tạo hoặc lấy chat session cho user với initial history về Shiku
   * @param {string} userId - User ID
   * @param {Array} dbHistory - Chat history từ database (optional)
   */
  getChatSession(userId, dbHistory = null) {
    // Update last activity
    this.sessionLastActivity.set(userId, Date.now());

    // Enforce max sessions limit
    if (this.chatSessions.size >= this.MAX_SESSIONS && !this.chatSessions.has(userId)) {
      // Remove oldest session
      const oldestSession = [...this.sessionLastActivity.entries()]
        .sort((a, b) => a[1] - b[1])[0];
      if (oldestSession) {
        this.chatSessions.delete(oldestSession[0]);
        this.sessionLastActivity.delete(oldestSession[0]);
      }
    }

    // Nếu đã có session, không cần tạo lại
    if (this.chatSessions.has(userId)) {
      return this.chatSessions.get(userId);
    }

    if (!this.model) {
      this.initializeModel();
    }

    // Sử dụng chat history từ database nếu có, nếu không thì dùng initial history
    let history = getInitialChatHistory();

    if (dbHistory && dbHistory.length > 0) {
      // Chuyển đổi database history sang format của Gemini
      // Bỏ qua message chào mừng đầu tiên nếu đã có history từ database
      history = dbHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));
    }

    const chat = this.model.startChat({
      history: history,
    });

    this.chatSessions.set(userId, chat);
    return chat;
  }

  /**
   * Gửi tin nhắn và nhận phản hồi
   * Có retry logic cho lỗi 429 (rate limit)
   */
  async sendMessage(userId, message, retryCount = 0) {
    const MAX_RETRIES = 1;
    const RETRY_DELAY = 1000; // 1 second

    try {
      if (!this.model) {
        this.initializeModel();
      }

      const chat = this.getChatSession(userId);
      const result = await chat.sendMessage(message);
      const response = await result.response;
      const text = response.text();

      return {
        success: true,
        text: text,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage = error.message || '';
      console.error('[ERROR][GEMINI] Error sending message to Gemini:', errorMessage);

      // Retry once on 429 (rate limit) errors
      if (errorMessage.includes('429') && retryCount < MAX_RETRIES) {
        console.log(`[INFO][GEMINI] Rate limited, retrying in ${RETRY_DELAY}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return this.sendMessage(userId, message, retryCount + 1);
      }

      // Friendly error messages based on error type
      if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('limit')) {
        throw new Error('Mình đang hơi bận, bạn thử hỏi lại sau vài giây nhé! 😊');
      }
      if (errorMessage.includes('API key') || errorMessage.includes('401') || errorMessage.includes('403')) {
        throw new Error('Có vấn đề với cấu hình AI. Vui lòng thử lại sau.');
      }
      if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        throw new Error('Mình đang được cập nhật, thử lại sau một chút nhé! 🔧');
      }

      // Generic friendly fallback
      throw new Error('Mình gặp chút trục trặc, bạn thử hỏi lại sau vài giây nhé 😊');
    }
  }


  /**
   * Xóa chat session của user (để reset cuộc trò chuyện)
   */
  clearChatSession(userId) {
    if (this.chatSessions.has(userId)) {
      this.chatSessions.delete(userId);
      this.sessionLastActivity.delete(userId);
      return true;
    }
    return false;
  }

  /**
   * Lấy tất cả active sessions (để monitoring)
   */
  getActiveSessions() {
    return this.chatSessions.size;
  }

  /**
   * Gửi tin nhắn đơn giản không lưu lịch sử
   */
  async sendSimpleMessage(message) {
    try {
      if (!this.model) {
        this.initializeModel();
      }

      const result = await this.model.generateContent(message);
      const response = await result.response;
      const text = response.text();

      return {
        success: true,
        text: text,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('[ERROR][GEMINI] Error sending simple message to Gemini:', error);
      throw new Error('Failed to get response from AI: ' + error.message);
    }
  }

  /**
   * Tạo nội dung với context cụ thể về Shiku
   */
  async generateContent(prompt, context = '') {
    try {
      if (!this.model) {
        this.initializeModel();
      }

      // Thêm context về Shiku vào prompt
      const shikuContext = context
        ? `Context về Shiku: ${context}\n\n`
        : '';

      const fullPrompt = `${shikuContext}Prompt: ${prompt}\n\nLưu ý: Hãy trả lời dựa trên kiến thức về Shiku - mạng xã hội kết nối bạn bè.`;

      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();

      return {
        success: true,
        text: text,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('[ERROR][GEMINI] Error generating content with Gemini:', error);
      throw new Error('Failed to generate content: ' + error.message);
    }
  }
}

// Export singleton instance
const geminiService = new GeminiService();
export default geminiService;
