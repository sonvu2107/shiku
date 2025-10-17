import React, { createContext, useContext, useState } from 'react';

const ChatContext = createContext();

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
    // Kiểm tra xem conversation đã mở chưa
    const isAlreadyOpen = openPopups.some(conv => conv._id === conversation._id);
    
    if (!isAlreadyOpen) {
      setOpenPopups(prev => [...prev, conversation]);
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
