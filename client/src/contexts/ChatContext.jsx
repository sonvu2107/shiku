// Use React.createContext instead of structuring to avoid encapsulation errors
import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';
import socketService from '../socket';
import { getUser } from '../utils/tokenManager';

// Make sure React is loaded properly
if (!React || typeof createContext !== 'function') {
  console.error('[ChatContext] React is not available or createContext is missing. React:', React);
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
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      // Check if user is logged in before making API call
      const currentUser = getUser();
      if (!currentUser) {
        console.log('[ChatContext] No user logged in, skipping unread count fetch');
        setUnreadCount(0);
        return;
      }

      const response = await api('/api/messages/conversations');
      if (response.conversations && Array.isArray(response.conversations)) {
        const count = response.conversations.reduce((acc, conv) => acc + (conv.unreadCount || 0), 0);
        setUnreadCount(count);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
      // Don't throw error, just set count to 0
      setUnreadCount(0);
    }
  };

  const addChatPopup = (conversation) => {
    if (!conversation) return;
    const conversationId = conversation._id || conversation.id || conversation.conversationKey || `conversation-${Date.now()}`;
    const normalizedConversation = {
      ...conversation,
      _id: conversationId,
      conversationType: conversation.conversationType || (conversation.otherParticipants?.length > 1 ? 'group' : 'private')
    };
    
    setOpenPopups(prev => {
      // Check if conversation is already open in the latest state
      const isAlreadyOpen = prev.some(conv => conv._id === normalizedConversation._id);

      if (isAlreadyOpen) {
        // If already open, update but retain important info if new data is missing
        return prev.map(conv => {
          if (conv._id === normalizedConversation._id) {
            const merged = { ...conv, ...normalizedConversation };
            // Retain otherParticipants if new data is missing or incomplete (because socket message only has sender)
            if (conv.otherParticipants && (!normalizedConversation.otherParticipants || !normalizedConversation.otherParticipants[0]?.user)) {
              merged.otherParticipants = conv.otherParticipants;
            }
            return merged;
          }
          return conv;
        });
      } else {
        return [...prev, normalizedConversation];
      }
    });
  };

  useEffect(() => {
    // Check if user is logged in before fetching
    const currentUser = getUser();
    if (!currentUser) {
      console.log('[ChatContext] No user logged in, skipping initial fetch');
      return;
    }

    fetchUnreadCount();

    const handleNewMessage = (message) => {
      const currentUser = getUser();
      const currentUserId = currentUser?.id || currentUser?._id;
      const senderId = message.sender?._id || message.sender;

      // If message is from me, don't increment unread count
      if (currentUserId && senderId && senderId.toString() === currentUserId.toString()) {
        return;
      }

      setUnreadCount(prev => prev + 1);

      // Open chat popup if not already open
      let conversation = message.conversation;
      
      if (typeof conversation === 'string') {
          conversation = {
              _id: conversation,
              isGroup: false, 
              otherParticipants: [{ user: message.sender }], // Fix structure: wrap sender in user object
          };
      }
      
      if (conversation && conversation._id) {
          addChatPopup(conversation);
      }
    };

    socketService.onNewMessage(handleNewMessage);

    return () => {
      socketService.offNewMessage(handleNewMessage);
    };
  }, []);

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
    setOpenPopups,
    unreadCount,
    refreshUnreadCount: fetchUnreadCount
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
