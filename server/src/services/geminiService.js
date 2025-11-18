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
  }

  /**
   * Khởi tạo model Gemini với system instruction về Shiku
   */
  initializeModel(modelName = 'gemini-2.0-flash') {
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
   */
  async sendMessage(userId, message) {
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
      console.error('[ERROR][GEMINI] Error sending message to Gemini:', error);
      throw new Error('Failed to get response from AI: ' + error.message);
    }
  }

  /**
   * Xóa chat session của user (để reset cuộc trò chuyện)
   */
  clearChatSession(userId) {
    if (this.chatSessions.has(userId)) {
      this.chatSessions.delete(userId);
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
