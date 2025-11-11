import { api } from '../api';

/**
 * Chatbot API Service
 * Xử lý các request liên quan đến AI chatbot
 */
export const chatbotAPI = {
  /**
   * Gửi tin nhắn đến AI chatbot
   * @param {string} message - Tin nhắn từ người dùng
   * @returns {Promise<Object>} Response từ AI
   */
  async sendMessage(message) {
    try {
      const response = await api('/api/chatbot/message', {
        method: 'POST',
        body: { message }
      });
      return response.data;
    } catch (error) {
      console.error('Error sending message to chatbot:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Reset chat session (xóa lịch sử chat)
   * @returns {Promise<Object>} Kết quả reset
   */
  async resetChat() {
    try {
      const response = await api('/api/chatbot/reset', {
        method: 'POST'
      });
      return response;
    } catch (error) {
      console.error('Error resetting chat:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Tạo nội dung với prompt cụ thể
   * @param {string} prompt - Prompt yêu cầu
   * @param {string} context - Context bổ sung (optional)
   * @returns {Promise<Object>} Nội dung được tạo
   */
  async generateContent(prompt, context = '') {
    try {
      const response = await api('/api/chatbot/generate', {
        method: 'POST',
        body: { prompt, context }
      });
      return response.data;
    } catch (error) {
      console.error('Error generating content:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Kiểm tra trạng thái chatbot service
   * @returns {Promise<Object>} Thông tin trạng thái
   */
  async getStatus() {
    try {
      const response = await api('/api/chatbot/status', {
        method: 'GET'
      });
      return response.data;
    } catch (error) {
      console.error('Error getting chatbot status:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Lấy lịch sử chat với AI
   * @returns {Promise<Object>} Lịch sử chat
   */
  async getHistory() {
    try {
      const response = await api('/api/chatbot/history', {
        method: 'GET'
      });
      return response.data;
    } catch (error) {
      console.error('Error getting chat history:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Lấy chatbot conversation
   * @returns {Promise<Object>} Chatbot conversation response với structure {success: true, data: {...}}
   */
  async getConversation() {
    try {
      const response = await api('/api/chatbot/conversation', {
        method: 'GET'
      });
      // API trả về {success: true, data: {...}}, nên trả về toàn bộ response
      return response;
    } catch (error) {
      console.error('Error getting chatbot conversation:', error);
      throw error.response?.data || error;
    }
  },
};

export default chatbotAPI;
