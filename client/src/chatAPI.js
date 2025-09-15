import { api } from "./api";

/**
 * API client cho các chức năng chat và messaging
 * Bao gồm quản lý conversations, messages, groups và friends
 */
export const chatAPI = {
  // ==================== CONVERSATIONS ====================
  
  /**
   * Lấy danh sách tất cả conversations của user
   * @returns {Promise<Array>} Danh sách conversations
   */
  getConversations: () => api("/api/messages/conversations"),
  
  /**
   * Tạo conversation mới (private hoặc group)
   * @param {Object} conversationData - Dữ liệu conversation
   * @param {string} conversationData.type - Loại conversation ('private' hoặc 'group')
   * @param {Array} conversationData.participants - Danh sách participant IDs
   * @param {string} conversationData.name - Tên group (nếu là group)
   * @returns {Promise<Object>} Conversation mới được tạo
   */
  createConversation: (conversationData) => {
    if (conversationData.type === 'private') {
      return chatAPI.createPrivateConversation(conversationData.participants[0]);
    } else if (conversationData.type === 'group') {
      return chatAPI.createGroupConversation(conversationData.participants, conversationData.name);
    }
    throw new Error('Invalid conversation type');
  },
  
  /**
   * Tạo conversation private với 1 user khác
   * @param {string} recipientId - ID của người nhận
   * @returns {Promise<Object>} Private conversation
   */
  createPrivateConversation: (recipientId) => 
    api("/api/messages/conversations/private", {
      method: "POST",
      body: { recipientId }
    }),
  
  /**
   * Tạo group conversation với nhiều users
   * @param {Array} participantIds - Danh sách IDs của các thành viên
   * @param {string} groupName - Tên của group
   * @returns {Promise<Object>} Group conversation
   */
  createGroupConversation: (participantIds, groupName) => 
    api("/api/messages/conversations/group", {
      method: "POST",
      body: { participantIds, groupName }
    }),

  // ==================== MESSAGES ====================
  
  /**
   * Lấy danh sách messages trong conversation với pagination
   * @param {string} conversationId - ID của conversation
   * @param {number} page - Số trang (default: 1)
   * @param {number} limit - Số lượng messages per page (default: 50)
   * @param {string} before - Timestamp để lấy messages trước đó (cho infinite scroll)
   * @returns {Promise<Object>} Danh sách messages với pagination info
   */
  getMessages: (conversationId, page = 1, limit = 50, before = null) => {
    let url = `/api/messages/conversations/${conversationId}/messages?page=${page}&limit=${limit}`;
    if (before) {
      url += `&before=${encodeURIComponent(before)}`;
    }
    return api(url);
  },
  
  /**
   * Gửi text message hoặc emote
   * @param {string} conversationId - ID của conversation
   * @param {string} content - Nội dung message
   * @param {string} messageType - Loại message ('text', 'emote')
   * @param {string} emote - Loại emote nếu là emote message
   * @returns {Promise<Object>} Message đã được gửi
   */
  sendMessage: (conversationId, content, messageType = 'text', emote = null) => 
    api(`/api/messages/conversations/${conversationId}/messages`, {
      method: "POST",
      body: { content, messageType, emote }
    }),
  
  /**
   * Gửi image message
   * @param {string} conversationId - ID của conversation
   * @param {string} image - URL hoặc base64 của hình ảnh
   * @param {string} content - Caption cho hình ảnh (optional)
   * @returns {Promise<Object>} Image message đã được gửi
   */
  sendImageMessage: (conversationId, image, content = '') => 
    api(`/api/messages/conversations/${conversationId}/messages/image`, {
      method: "POST",
      body: { image, content }
    }),

  // ==================== GROUP MANAGEMENT ====================
  
  /**
   * Thêm thành viên mới vào group
   * @param {string} conversationId - ID của group conversation
   * @param {Array} participantIds - Danh sách IDs của users cần thêm
   * @returns {Promise<Object>} Kết quả thêm thành viên
   */
  addParticipants: (conversationId, participantIds) => 
    api(`/api/messages/conversations/${conversationId}/participants`, {
      method: "POST",
      body: { participantIds }
    }),
  
  /**
   * Xóa thành viên khỏi group
   * @param {string} conversationId - ID của group conversation
   * @param {string} userId - ID của user cần xóa
   * @returns {Promise<Object>} Kết quả xóa thành viên
   */
  removeParticipant: (conversationId, userId) => 
    api(`/api/messages/conversations/${conversationId}/participants/${userId}`, {
      method: "DELETE"
    }),
  
  /**
   * Cập nhật tên group
   * @param {string} conversationId - ID của group conversation
   * @param {string} groupName - Tên mới của group
   * @returns {Promise<Object>} Group với tên đã cập nhật
   */
  updateGroupName: (conversationId, groupName) => 
    api(`/api/messages/conversations/${conversationId}`, {
      method: "PUT",
      body: { groupName }
    }),
  
  /**
   * Cập nhật avatar group
   * @param {string} conversationId - ID của group conversation
   * @param {string} groupAvatar - URL của avatar mới
   * @returns {Promise<Object>} Group với avatar đã cập nhật
   */
  updateGroupAvatar: (conversationId, groupAvatar) => 
    api(`/api/messages/conversations/${conversationId}/avatar`, {
      method: "PUT",
      body: { groupAvatar }
    }),
  
  /**
   * Lấy chi tiết đầy đủ của conversation
   * @param {string} conversationId - ID của conversation
   * @returns {Promise<Object>} Chi tiết conversation bao gồm participants, settings
   */
  getConversationDetails: (conversationId) => 
    api(`/api/messages/conversations/${conversationId}/details`),
  
  /**
   * Cập nhật nickname của user trong conversation
   * @param {string} conversationId - ID của conversation
   * @param {string} userId - ID của user
   * @param {string} nickname - Nickname mới
   * @returns {Promise<Object>} Kết quả cập nhật nickname
   */
  updateNickname: (conversationId, userId, nickname) => 
    api(`/api/messages/conversations/${conversationId}/nickname`, {
      method: "PUT",
      body: { userId, nickname }
    }),
  
  /**
   * Rời khỏi conversation/group
   * @param {string} conversationId - ID của conversation
   * @returns {Promise<Object>} Kết quả rời conversation
   */
  leaveConversation: (conversationId) => 
    api(`/api/messages/conversations/${conversationId}/leave`, {
      method: "POST"
    }),

  /**
   * Cập nhật thông tin conversation
   * @param {string} conversationId - ID của conversation
   * @param {Object} updates - Các thông tin cần cập nhật
   * @returns {Promise<Object>} Conversation đã cập nhật
   */
  updateConversation: (conversationId, updates) => 
    api(`/api/messages/conversations/${conversationId}`, {
      method: "PUT",
      body: updates
    }),

  /**
   * Xóa conversation
   * @param {string} conversationId - ID của conversation
   * @returns {Promise<Object>} Kết quả xóa conversation
   */
  deleteConversation: (conversationId) => 
    api(`/api/messages/conversations/${conversationId}`, {
      method: "DELETE"
    }),

  // ==================== SEARCH ====================
  
  /**
   * Tìm kiếm users để thêm vào conversation
   * @param {string} query - Từ khóa tìm kiếm
   * @returns {Promise<Array>} Danh sách users phù hợp
   */
  searchUsers: (query) => 
    api(`/api/messages/users/search?q=${encodeURIComponent(query)}`),

  // ==================== PERMISSION MANAGEMENT ====================
  
  /**
   * Thay đổi role của participant trong group
   * @param {string} conversationId - ID của conversation
   * @param {string} userId - ID của user
   * @param {string} role - Role mới ('admin', 'member')
   * @returns {Promise<Object>} Kết quả thay đổi role
   */
  changeParticipantRole: (conversationId, userId, role) =>
    api(`/api/messages/conversations/${conversationId}/participants/${userId}/role`, {
      method: "PUT",
      body: { role }
    }),

  /**
   * Bật/tắt tính năng member có thể quản lý thành viên
   * @param {string} conversationId - ID của conversation
   * @param {boolean} allowMemberManagement - Cho phép member quản lý hay không
   * @returns {Promise<Object>} Kết quả cập nhật setting
   */
  toggleMemberManagement: (conversationId, allowMemberManagement) =>
    api(`/api/messages/conversations/${conversationId}/member-management`, {
      method: "PUT", 
      body: { allowMemberManagement }
    }),

  // ==================== FRIENDS ====================
  
  /**
   * Lấy danh sách bạn bè
   * @returns {Promise<Array>} Danh sách friends
   */
  getFriends: () => 
    api("/api/friends/list"),

  /**
   * Tìm kiếm trong danh sách bạn bè
   * @param {string} query - Từ khóa tìm kiếm
   * @returns {Promise<Array>} Danh sách friends phù hợp
   */
  searchFriends: (query) => 
    api(`/api/friends/search-friends?q=${encodeURIComponent(query)}`),

  // ==================== CURRENT CONVERSATION ====================
  
  /**
   * Set conversation hiện tại của user (để track trạng thái)
   * @param {string} conversationId - ID của conversation
   * @returns {Promise<Object>} Kết quả set current conversation
   */
  setCurrentConversation: (conversationId) =>
    api("/api/users/current-conversation", {
      method: "PUT",
      body: { conversationId }
    }),

  /**
   * Lấy conversation hiện tại của user
   * @returns {Promise<Object>} Current conversation info
   */
  getCurrentConversation: () =>
    api("/api/users/current-conversation")
};
