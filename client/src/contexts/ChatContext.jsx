import React, { createContext, useContext, useState } from 'react';

// Đảm bảo createContext được import đúng cách
// Kiểm tra nếu createContext không có sẵn (shouldn't happen but safety check)
if (typeof createContext !== 'function') {
  console.error('[ChatContext] createContext is not available. React version:', React.version);
  throw new Error('React createContext is not available. Please check your React installation.');
}

const ChatContext = createContext(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const [openPopups, setOpenPopups] = useState([]);

  const addChatPopup = (conversation) => {
    if (!conversation) return;
    const conversationId = conversation._id || conversation.id || conversation.conversationKey || `conversation-${Date.now()}`;
    const normalizedConversation = {
      ...conversation,
      _id: conversationId,
      conversationType: conversation.conversationType || (conversation.otherParticipants?.length > 1 ? 'group' : 'private')
    };
    // Kiểm tra xem conversation đã mở chưa
    const isAlreadyOpen = openPopups.some(conv => conv._id === normalizedConversation._id);

    if (isAlreadyOpen) {
      setOpenPopups(prev => prev.map(conv => conv._id === normalizedConversation._id ? { ...conv, ...normalizedConversation } : conv));
    } else {
      setOpenPopups(prev => [...prev, normalizedConversation]);
    }
  };

  const removeChatPopup = (conversationId) => {
    setOpenPopups(prev => prev.filter(conv => conv._id !== conversationId));
  };

  const closeChatPopup = (conversationId) => {
    removeChatPopup(conversationId);
  };

  const value = {
    openPopups,
    addChatPopup,
    removeChatPopup,
    closeChatPopup,
    setOpenPopups
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
