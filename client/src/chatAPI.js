import { api } from "./api";

export const chatAPI = {
  // Conversations
  getConversations: () => api("/api/messages/conversations"),
  
  createConversation: (conversationData) => {
    if (conversationData.type === 'private') {
      return chatAPI.createPrivateConversation(conversationData.participants[0]);
    } else if (conversationData.type === 'group') {
      return chatAPI.createGroupConversation(conversationData.participants, conversationData.name);
    }
    throw new Error('Invalid conversation type');
  },
  
  createPrivateConversation: (recipientId) => 
    api("/api/messages/conversations/private", {
      method: "POST",
      body: { recipientId }
    }),
  
  createGroupConversation: (participantIds, groupName) => 
    api("/api/messages/conversations/group", {
      method: "POST",
      body: { participantIds, groupName }
    }),

  // Messages
  getMessages: (conversationId, page = 1, limit = 50, before = null) => {
    let url = `/api/messages/conversations/${conversationId}/messages?page=${page}&limit=${limit}`;
    if (before) {
      url += `&before=${encodeURIComponent(before)}`;
    }
    return api(url);
  },
  
  sendMessage: (conversationId, content, messageType = 'text', emote = null) => 
    api(`/api/messages/conversations/${conversationId}/messages`, {
      method: "POST",
      body: { content, messageType, emote }
    }),
  
  sendImageMessage: (conversationId, image, content = '') => 
    api(`/api/messages/conversations/${conversationId}/messages/image`, {
      method: "POST",
      body: { image, content }
    }),

  // Group management
  addParticipants: (conversationId, participantIds) => 
    api(`/api/messages/conversations/${conversationId}/participants`, {
      method: "POST",
      body: { participantIds }
    }),
  
  removeParticipant: (conversationId, userId) => 
    api(`/api/messages/conversations/${conversationId}/participants/${userId}`, {
      method: "DELETE"
    }),
  
  updateGroupName: (conversationId, groupName) => 
    api(`/api/messages/conversations/${conversationId}`, {
      method: "PUT",
      body: { groupName }
    }),
  
  updateGroupAvatar: (conversationId, groupAvatar) => 
    api(`/api/messages/conversations/${conversationId}/avatar`, {
      method: "PUT",
      body: { groupAvatar }
    }),
  
  getConversationDetails: (conversationId) => 
    api(`/api/messages/conversations/${conversationId}/details`),
  
  updateNickname: (conversationId, userId, nickname) => 
    api(`/api/messages/conversations/${conversationId}/nickname`, {
      method: "PUT",
      body: { userId, nickname }
    }),
  
  leaveConversation: (conversationId) => 
    api(`/api/messages/conversations/${conversationId}/leave`, {
      method: "POST"
    }),

  updateConversation: (conversationId, updates) => 
    api(`/api/messages/conversations/${conversationId}`, {
      method: "PUT",
      body: updates
    }),

  deleteConversation: (conversationId) => 
    api(`/api/messages/conversations/${conversationId}`, {
      method: "DELETE"
    }),

  // Search
  searchUsers: (query) => 
    api(`/api/messages/users/search?q=${encodeURIComponent(query)}`),

  // Permission management
  changeParticipantRole: (conversationId, userId, role) =>
    api(`/api/messages/conversations/${conversationId}/participants/${userId}/role`, {
      method: "PUT",
      body: { role }
    }),

  toggleMemberManagement: (conversationId, allowMemberManagement) =>
    api(`/api/messages/conversations/${conversationId}/member-management`, {
      method: "PUT", 
      body: { allowMemberManagement }
    }),

  // Friends
  getFriends: () => 
    api("/api/friends/list"),

  searchFriends: (query) => 
    api(`/api/friends/search-friends?q=${encodeURIComponent(query)}`),

  // Current conversation
  setCurrentConversation: (conversationId) =>
    api("/api/users/current-conversation", {
      method: "PUT",
      body: { conversationId }
    }),

  getCurrentConversation: () =>
    api("/api/users/current-conversation")
};
