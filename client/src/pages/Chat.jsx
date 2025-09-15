import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { useLocation } from "react-router-dom";
import ConversationList from "../components/chat/ConversationList";
import ChatWindow from "../components/chat/ChatWindow";
import NewConversationModal from "../components/chat/NewConversationModal";
import AddMembersModal from "../components/chat/AddMembersModal";
import { chatAPI } from "../chatAPI";
import { api } from "../api";
import socketService from "../socket";

/**
 * Chat - Trang chat chính với real-time messaging
 * Bao gồm danh sách cuộc trò chuyện, cửa sổ chat và các modals
 * @returns {JSX.Element} Component chat page
 */
export default function Chat() {
  // ==================== ROUTER & LOCATION ====================
  
  const location = useLocation(); // Để handle state từ MessageButton
  
  // ==================== STATE MANAGEMENT ====================
  
  // Conversations
  const [conversations, setConversations] = useState([]); // Danh sách cuộc trò chuyện
  const [selectedConversation, setSelectedConversation] = useState(null); // Cuộc trò chuyện đang chọn
  
  // Messages
  const [messages, setMessages] = useState([]); // Tin nhắn trong cuộc trò chuyện hiện tại
  const [isLoadingMessages, setIsLoadingMessages] = useState(false); // Loading tin nhắn
  const [hasMoreMessages, setHasMoreMessages] = useState(false); // Có thêm tin nhắn để load
  const [currentPage, setCurrentPage] = useState(1); // Trang hiện tại cho pagination
  
  // Modals
  const [showNewConversationModal, setShowNewConversationModal] = useState(false); // Modal tạo cuộc trò chuyện mới
  const [showAddMembersModal, setShowAddMembersModal] = useState(false); // Modal thêm thành viên
  
  // User & Loading
  const [currentUser, setCurrentUser] = useState(null); // User hiện tại
  const [isLoading, setIsLoading] = useState(true); // Loading conversations

  useEffect(() => {
    loadCurrentUser();
    loadConversations();
  }, []);

  // Khôi phục conversation đã chọn sau khi load conversations
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversation) {
      loadCurrentConversation();
    }
  }, [conversations, selectedConversation]);

  // Lưu conversation đã chọn vào database
  useEffect(() => {
    if (selectedConversation) {
      saveCurrentConversation(selectedConversation._id);
    }
  }, [selectedConversation]);

  const loadCurrentConversation = async () => {
    try {
      const { currentConversationId } = await chatAPI.getCurrentConversation();
      if (currentConversationId) {
        const savedConversation = conversations.find(conv => conv._id === currentConversationId);
        if (savedConversation) {
          console.log('📍 Restoring saved conversation:', currentConversationId);
          setSelectedConversation(savedConversation);
        } else {
          console.log('📍 Saved conversation not found in list, clearing:', currentConversationId);
          // Clear saved conversation if it's no longer in the list
          await chatAPI.setCurrentConversation(null);
        }
      }
    } catch (error) {
      console.error('Lỗi tải cuộc trò chuyện hiện tại:', error);
    }
  };

  const saveCurrentConversation = async (conversationId) => {
    try {
      await chatAPI.setCurrentConversation(conversationId);
    } catch (error) {
      console.error('Lỗi lưu cuộc trò chuyện hiện tại:', error);
    }
  };

  const loadCurrentUser = async () => {
    try {
      const user = await api("/api/auth/me");
      setCurrentUser(user);
      
      // Connect to Socket.IO when user is loaded
      const socket = socketService.connect(user);
      
      // Setup message listener immediately (even before connect)
      socketService.onNewMessage((message) => {
        console.log('📨 Received new message:', message);
        
        // Add message to current conversation if it matches
        setMessages(prev => {
          // Check if message already exists to avoid duplicates
          const exists = prev.some(m => m._id === message._id);
          if (exists) return prev;
          const newMessages = [...prev, message];
          
          
          return newMessages;
        });
        
        // Update conversation list with new last message
        setConversations(prev => 
          prev.map(conv => 
            conv._id === (message.conversationId || message.conversation) 
              ? { ...conv, lastMessage: message, lastActivity: message.createdAt }
              : conv
          ).sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity))
        );
      });
      
    } catch (error) {
      console.error('Lỗi tải thông tin người dùng:', error);
    }
  };

  // Handle opening conversation from MessageButton
  useEffect(() => {
    if (location.state?.openConversation && conversations.length > 0) {
      const conversationId = location.state.openConversation;
      const conversationData = location.state.conversationData;
      
      // Tìm conversation trong danh sách hiện có
      let conversation = conversations.find(conv => conv._id === conversationId);
      
      // Nếu không tìm thấy, thêm conversation mới vào danh sách
      if (!conversation && conversationData) {
        conversation = conversationData;
        setConversations(prev => [conversation, ...prev]);
      }
      
      if (conversation) {
        setSelectedConversation(conversation);
      }
      
      // Clear state để tránh re-trigger
      window.history.replaceState({}, document.title);
    }
  }, [location.state, conversations]);

  useEffect(() => {
    if (selectedConversation) {
      console.log('🔥 Chat: Loading messages and joining conversation:', selectedConversation._id);
      loadMessages(selectedConversation._id);
      // Join conversation room for real-time updates
      socketService.joinConversation(selectedConversation._id);
    }
    
    return () => {
      // Leave conversation when component unmounts or conversation changes
      socketService.leaveConversation();
    };
  }, [selectedConversation]);

  // Cleanup socket connection on unmount
  useEffect(() => {
    return () => {
      socketService.disconnect();
    };
  }, []);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const data = await chatAPI.getConversations();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Lỗi tải danh sách cuộc trò chuyện:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (conversationId, page = 1) => {
    try {
      setIsLoadingMessages(true);
      const data = await chatAPI.getMessages(conversationId, page);
      if (page === 1) {
        setMessages(data.messages || []);
        setCurrentPage(1);
      } else {
        setMessages(prev => [...(data.messages || []), ...prev]);
        setCurrentPage(page);
      }
      console.log('🔄 API response:', data);
      console.log('🔄 Pagination info:', data.pagination);
      
      // Use pagination info if available, otherwise fall back to length check
      const hasMore = data.pagination?.hasMore !== undefined 
        ? data.pagination.hasMore 
        : (page === 1 ? (data.messages || []).length > 0 : (data.messages || []).length === 50);
        
      setHasMoreMessages(hasMore);
      console.log('🔄 loadMessages result:', {
        page,
        messagesLoaded: (data.messages || []).length,
        hasMore,
        paginationHasMore: data.pagination?.hasMore,
        totalMessages: page === 1 ? (data.messages || []).length : messages.length + (data.messages || []).length
      });
      return data.messages || [];
    } catch (error) {
      console.error('Lỗi tải tin nhắn:', error);
      return [];
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSendMessage = async (content, type = 'text', emote = null, image = null) => {
    if (!selectedConversation) return;

    try {
      let newMessage;
      
      if (image) {
        newMessage = await chatAPI.sendImageMessage(selectedConversation._id, image, content);
      } else {
        newMessage = await chatAPI.sendMessage(selectedConversation._id, content, type, emote);
      }
      
      // Message will be added via Socket.IO event, no need to add here
      // Real-time update will handle both local and remote messages
      
    } catch (error) {
      console.error('Lỗi gửi tin nhắn:', error);
      alert('Có lỗi xảy ra khi gửi tin nhắn');
    }
  };

  const handleCreateConversation = async (conversationData) => {
    try {
      const newConversation = await chatAPI.createConversation(conversationData);
      setConversations(prev => [newConversation, ...prev]);
      setSelectedConversation(newConversation);
    } catch (error) {
      console.error('Lỗi tạo cuộc trò chuyện:', error);
      throw error;
    }
  };

  const handleUpdateConversation = async (conversationId, updates) => {
    try {
      console.log('[Chat.jsx] handleUpdateConversation', { conversationId, updates });
      // Nếu updates không có, chỉ reload lại từ server (trường hợp đổi tên nhóm qua modal)
      if (updates) {
        await chatAPI.updateConversation(conversationId, updates);
      }
      // Luôn reload lại danh sách và selectedConversation
      const updatedConversations = await chatAPI.getConversations();
      setConversations(updatedConversations.conversations || []);
      const updatedConv = updatedConversations.conversations?.find(c => c._id === conversationId);
      if (updatedConv) {
        setSelectedConversation(updatedConv);
        console.log('[Chat.jsx] Updated selectedConversation:', updatedConv);
      }
    } catch (error) {
      console.error('Error updating conversation:', error);
      alert('Có lỗi xảy ra khi cập nhật cuộc trò chuyện');
    }
  };

  const handleLeaveConversation = async (conversationId) => {
    try {
      console.log('🚪 Leaving conversation:', conversationId);
      await chatAPI.leaveConversation(conversationId);
      
      // Clear selected conversation immediately if it's the one being left
      if (selectedConversation?._id === conversationId) {
        console.log('🗑️ Clearing selected conversation');
        setSelectedConversation(null);
        setMessages([]);
        // Clear current conversation in backend too
        await chatAPI.setCurrentConversation(null);
      }
      
      console.log('� Reloading conversations after leaving...');
      // Reload conversations to get updated data
      await loadConversations();
      
    } catch (error) {
      console.error('Error leaving conversation:', error);
      alert('Có lỗi xảy ra khi rời cuộc trò chuyện');
    }
  };

  const handleDeleteConversation = async (conversationId) => {
    try {
      await chatAPI.deleteConversation(conversationId);
      
      // Remove conversation from list
      setConversations(prev => prev.filter(conv => conv._id !== conversationId));
      
      // Clear selected conversation if it's the one being deleted
      if (selectedConversation?._id === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      alert('Có lỗi xảy ra khi xóa cuộc trò chuyện');
    }
  };

  const handleAddMembers = () => {
    setShowAddMembersModal(true);
  };

  const handleRefreshConversation = async () => {
    // Reload conversations list
    await loadConversations();
    
    // Reload selected conversation details if any
    if (selectedConversation) {
      const updatedConversations = await chatAPI.getConversations();
      const updatedConv = updatedConversations.conversations?.find(c => c._id === selectedConversation._id);
      if (updatedConv) {
        setSelectedConversation(updatedConv);
      }
    }
  };

  const handleLoadMoreMessages = async () => {
    console.log('🔄 handleLoadMoreMessages called:', { 
      selectedConversation: !!selectedConversation, 
      hasMoreMessages,
      isLoadingMessages,
      currentPage,
      messagesLength: messages.length
    });
    
    if (!selectedConversation || !hasMoreMessages || isLoadingMessages) return;
    
    const nextPage = currentPage + 1;
    console.log('🔄 Loading page:', nextPage);
    await loadMessages(selectedConversation._id, nextPage);
  };

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
  };

  return (
  <div className="h-full bg-white pt-16 sm:pt-20">
      <div className="h-full flex flex-col sm:flex-row chat-mobile">
        {/* Sidebar */}
        <div className="w-full sm:w-72 border-b sm:border-b-0 sm:border-r border-gray-100 flex flex-col bg-white chat-sidebar-mobile">
          {/* Header */}
          <div className="px-3 py-2 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold text-gray-900">Chat</h1>
              <button
                onClick={() => setShowNewConversationModal(true)}
                className="p-2 text-blue-600 hover:bg-blue-50 active:bg-blue-100 rounded-full transition-colors touch-target"
                title="Tạo cuộc trò chuyện mới"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto max-h-48 sm:max-h-none">
            <ConversationList
              conversations={conversations}
              selectedConversation={selectedConversation}
              onSelectConversation={handleSelectConversation}
              loading={isLoading}
              currentUser={currentUser}
            />
          </div>
        </div>
        {/* Chat Window */}
        <div className="flex-1 bg-gray-50 flex flex-col chat-window-mobile min-h-0">
          {selectedConversation ? (
            <ChatWindow
              conversation={selectedConversation}
              currentUser={currentUser}
              messages={messages}
              isLoadingMessages={isLoadingMessages}
              hasMoreMessages={hasMoreMessages}
              onSendMessage={handleSendMessage}
              onLoadMoreMessages={handleLoadMoreMessages}
              onUpdateConversation={handleUpdateConversation}
              onLeaveConversation={handleLeaveConversation}
              onDeleteConversation={handleDeleteConversation}
              onAddMembers={handleAddMembers}
            />
          ) : (
            <div className="h-full flex items-center justify-center p-4">
              <div className="text-center">
                <div className="text-4xl sm:text-6xl mb-4">💬</div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-600 mb-2">
                  Chọn một cuộc trò chuyện
                </h3>
                <p className="text-sm sm:text-base text-gray-500">
                  Chọn cuộc trò chuyện từ danh sách bên trên để bắt đầu
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Conversation Modal */}
      {showNewConversationModal && (
        <NewConversationModal
          isOpen={showNewConversationModal}
          onClose={() => setShowNewConversationModal(false)}
          onCreateConversation={handleCreateConversation}
          currentUser={currentUser}
        />
      )}

      {/* Add Members Modal */}
      {showAddMembersModal && selectedConversation && (
        <AddMembersModal
          conversation={selectedConversation}
          isOpen={showAddMembersModal}
          onClose={() => setShowAddMembersModal(false)}
          onUpdateConversation={handleRefreshConversation}
        />
      )}
    </div>
  );
}
