import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { useLocation } from "react-router-dom";
import ConversationList from "../components/chat/ConversationList";
import ChatWindow from "../components/chat/ChatWindow";
import NewConversationModal from "../components/chat/NewConversationModal";
import AddMembersModal from "../components/chat/AddMembersModal";
import CallModal from "../components/CallModal";
import CallIncomingModal from "../components/CallIncomingModal";
import { chatAPI } from "../chatAPI";
import { api } from "../api";
import socketService from "../socket";
import callManager from "../utils/callManager";
import { getUserInfo } from "../utils/auth";

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
  
  // Call states
  const [callOpen, setCallOpen] = useState(false); // Modal cuộc gọi đang diễn ra
  const [isVideoCall, setIsVideoCall] = useState(true); // Loại cuộc gọi (video/voice)
  const [incomingCall, setIncomingCall] = useState(null); // Cuộc gọi đến
  const [incomingOffer, setIncomingOffer] = useState(null); // Offer từ người gọi
  const [remoteUser, setRemoteUser] = useState(null); // Thông tin người dùng đối phương (1-1)
  const [groupParticipants, setGroupParticipants] = useState([]); // Danh sách participants trong group call
  const [isGroupCall, setIsGroupCall] = useState(false); // Có phải group call không
  
  // Online status tracking
  const [userOnlineStatus, setUserOnlineStatus] = useState({}); // Map user ID -> online status
  
  // User & Loading
  const [currentUser, setCurrentUser] = useState(null); // User hiện tại
  const [isLoading, setIsLoading] = useState(true); // Loading conversations

  useEffect(() => {
    loadCurrentUser();
    loadConversations();
  }, []);

  // Xử lý incoming calls - setup listener sau khi user và socket đã sẵn sàng
  useEffect(() => {
    // Chỉ setup listener khi đã có currentUser và socket
    if (!currentUser || !socketService.socket) {
      return;
    }
    
    const handleOffer = ({ offer, conversationId, caller, callerSocketId, callerInfo, isVideo }) => {
      // Chỉ xử lý nếu đang trong conversation được gọi
      if (conversationId === selectedConversation?._id) {
        const myId = getUserInfo()?.id;
        const mySocketId = socketService.socket?.id;
        
        // Bỏ qua nếu chính mình là caller (kiểm tra cả user ID và socket ID)
        if (caller === myId || callerSocketId === mySocketId) {
          return;
        }

        // Validate offer
        if (!offer || !offer.type || !offer.sdp) {
          return;
        }

        const incomingCallData = { 
          offer, 
          caller: callerInfo || { name: "Người dùng" }, 
          isVideo: isVideo || false 
        };
        setIncomingCall(incomingCallData);
      }
    };

    // Setup listener
    callManager.addListener(handleOffer);
    
    return () => {
      // Cleanup listener khi component unmount hoặc dependencies thay đổi
      callManager.removeListener(handleOffer);
    };
  }, [currentUser, selectedConversation?._id]);

  // Xử lý conversation change và join room
  useEffect(() => {
    if (!selectedConversation || !socketService.socket) return;
    
    // Listen for conversation-joined confirmation
    const handleConversationJoined = (data) => {
      // Conversation joined confirmation
    };
    
    socketService.socket.on('conversation-joined', handleConversationJoined);
    
    return () => {
      socketService.socket.off('conversation-joined', handleConversationJoined);
    };
  }, [selectedConversation?._id]);

  // Handle messages for current conversation
  useEffect(() => {
    if (!selectedConversation || !socketService.socket) return;
    
    const handleNewMessage = (message) => {
      // Check if message belongs to current conversation
      if (selectedConversation && (message.conversationId === selectedConversation._id || message.conversation === selectedConversation._id)) {
        setMessages(prev => {
          const exists = prev.some(m => m._id === message._id);
          if (exists) {
            return prev;
          }
          return [...prev, message];
        });
      }
    };

    const handleReactionsUpdated = (data) => {
      if (!selectedConversation) return;
      if (data.conversationId !== selectedConversation._id) return;
      setMessages(prev => prev.map(m => m._id === data.messageId ? { ...m, reactions: data.reactions } : m));
    };

    // Set up message listener for this conversation
    socketService.socket.on('new-message', handleNewMessage);
    socketService.socket.on('message-reactions-updated', handleReactionsUpdated);
    
    return () => {
      socketService.socket.off('new-message', handleNewMessage);
      socketService.socket.off('message-reactions-updated', handleReactionsUpdated);
    };
  }, [selectedConversation?._id]);

  // Khôi phục conversation đã chọn sau khi load conversations
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversation) {
      loadCurrentConversation();
    }
  }, [conversations.length, selectedConversation]);

  // Lưu conversation đã chọn vào database
  useEffect(() => {
    if (selectedConversation) {
      saveCurrentConversation(selectedConversation._id);
    }
  }, [selectedConversation]);

  // Lắng nghe real-time updates cho online status
  useEffect(() => {
    if (!socketService.socket) return;

    const handleFriendOnline = (data) => {
      setUserOnlineStatus(prev => ({
        ...prev,
        [data.userId]: {
          isOnline: data.isOnline,
          lastSeen: data.lastSeen
        }
      }));
    };

    const handleFriendOffline = (data) => {
      setUserOnlineStatus(prev => ({
        ...prev,
        [data.userId]: {
          isOnline: data.isOnline,
          lastSeen: data.lastSeen
        }
      }));
    };

    socketService.socket.on('friend-online', handleFriendOnline);
    socketService.socket.on('friend-offline', handleFriendOffline);

    return () => {
      socketService.socket.off('friend-online', handleFriendOnline);
      socketService.socket.off('friend-offline', handleFriendOffline);
    };
  }, [socketService.socket]);

  const loadCurrentConversation = async () => {
    try {
      const { currentConversationId } = await chatAPI.getCurrentConversation();
      if (currentConversationId) {
        const savedConversation = conversations.find(conv => conv._id === currentConversationId);
        if (savedConversation) {
          setSelectedConversation(savedConversation);
        } else {
          // Clear saved conversation if it's no longer in the list
          await chatAPI.setCurrentConversation(null);
        }
      }
    } catch (error) {
      // Handle error silently
    }
  };

  const saveCurrentConversation = async (conversationId) => {
    try {
      await chatAPI.setCurrentConversation(conversationId);
    } catch (error) {
      // Handle error silently
    }
  };

  const loadCurrentUser = async () => {
    try {
      const user = await api("/api/auth/me");
      setCurrentUser(user);
      
      // Connect to Socket.IO when user is loaded
      const socket = socketService.connect(user);
      
      // Setup global message listener for conversation list updates (only once)
      socketService.onNewMessage((message) => {
        // Update conversation list with new last message
        setConversations(prev => 
          prev.map(conv => 
            conv._id === (message.conversationId || message.conversation) 
              ? { ...conv, lastMessage: message, lastActivity: message.createdAt }
              : conv
          ).sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity))
        );
      });

      // Setup reconnect handler to rejoin conversation room
      if (socket) {
        socket.on('reconnect', async () => {
          if (selectedConversation) {
            await socketService.joinConversation(selectedConversation._id);
          }
        });
      }
      
    } catch (error) {
      // Handle error silently
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
    const handleConversationChange = async () => {
      if (selectedConversation) {
        try {
          loadMessages(selectedConversation._id);
          // Join conversation room for real-time updates
          await socketService.joinConversation(selectedConversation._id);
        } catch (error) {
          // Silent handling for conversation change error
        }
      }
    };

    handleConversationChange();
    
    return () => {
      // Leave conversation when component unmounts or conversation changes
      socketService.leaveConversation();
    };
  }, [selectedConversation]);

  // Cleanup: Only leave conversation when unmounting Chat, don't disconnect socket
  useEffect(() => {
    return () => {
      socketService.leaveConversation();
    };
  }, []);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const data = await chatAPI.getConversations();
      setConversations(data.conversations || []);
    } catch (error) {
      // Handle error silently
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
      // Use pagination info if available, otherwise fall back to length check
      const hasMore = data.pagination?.hasMore !== undefined 
        ? data.pagination.hasMore 
        : (page === 1 ? (data.messages || []).length > 0 : (data.messages || []).length === 50);
        
      setHasMoreMessages(hasMore);
      return data.messages || [];
    } catch (error) {
      // Handle error silently
      return [];
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSendMessage = async (content, type = 'text', emote = null, image = null) => {
    if (!selectedConversation) {
      return;
    }

    try {
      // Ensure user is in conversation room before sending message
      await socketService.joinConversation(selectedConversation._id);
      
      let newMessage;
      
      if (image) {
        newMessage = await chatAPI.sendImageMessage(selectedConversation._id, image, content);
      } else {
        newMessage = await chatAPI.sendMessage(selectedConversation._id, content, type, emote);
      }
      
      // Add message to local state immediately for better UX
      if (newMessage) {
        setMessages(prev => {
          // Check if message already exists to avoid duplicates
          const exists = prev.some(m => m._id === newMessage._id);
          if (exists) {
            return prev;
          }
          return [...prev, newMessage];
        });
        
        // Update conversation list with new last message
        setConversations(prev => 
          prev.map(conv => 
            conv._id === selectedConversation._id
              ? { ...conv, lastMessage: newMessage, lastActivity: newMessage.createdAt }
              : conv
          ).sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity))
        );
      }
      
    } catch (error) {
      alert('Có lỗi xảy ra khi gửi tin nhắn');
    }
  };

  const handleCreateConversation = async (conversationData) => {
    try {
      const newConversation = await chatAPI.createConversation(conversationData);
      setConversations(prev => [newConversation, ...prev]);
      setSelectedConversation(newConversation);
    } catch (error) {
      throw error;
    }
  };

  const handleUpdateConversation = async (conversationId, updates) => {
    try {
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
      }
    } catch (error) {
      alert('Có lỗi xảy ra khi cập nhật cuộc trò chuyện');
    }
  };

  const handleLeaveConversation = async (conversationId) => {
    try {
      await chatAPI.leaveConversation(conversationId);
      
      // Clear selected conversation immediately if it's the one being left
      if (selectedConversation?._id === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
        // Clear current conversation in backend too
        await chatAPI.setCurrentConversation(null);
      }
      
      console.log('� Reloading conversations after leaving...');
      // Reload conversations to get updated data
      await loadConversations();
      
    } catch (error) {
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
      alert('Có lỗi xảy ra khi xóa cuộc trò chuyện');
    }
  };

  // Hàm merge online status vào conversation data
  const mergeOnlineStatusToConversation = (conversation) => {
    if (!conversation || conversation.conversationType === 'group') {
      return conversation;
    }

    // Tìm other participant
    const currentUserId = currentUser?.user?._id || currentUser?.user?.id || currentUser?._id || currentUser?.id;
    const otherParticipant = conversation.participants?.find(p => {
      const participantId = p.user?._id || p.user?.id || p._id || p.id;
      return participantId !== currentUserId;
    });

    if (!otherParticipant) return conversation;

    const otherUserId = otherParticipant.user?._id || otherParticipant.user?.id || otherParticipant._id || otherParticipant.id;
    const realtimeOnlineStatus = userOnlineStatus[otherUserId];


    // Ưu tiên real-time status nếu có, nếu không thì dùng dữ liệu từ server
    const onlineStatus = realtimeOnlineStatus || {
      isOnline: otherParticipant.user?.isOnline || false,
      lastSeen: otherParticipant.user?.lastSeen || null
    };

    // Nếu không có real-time data và server data cũng không có, thì không merge
    if (!realtimeOnlineStatus && !otherParticipant.user?.isOnline && !otherParticipant.user?.lastSeen) {
      return conversation;
    }


    // Luôn merge online status, ngay cả khi không có real-time updates

    // Tạo conversation mới với online status được cập nhật
    const updatedConversation = { ...conversation };
    
    // Cập nhật participants
    updatedConversation.participants = conversation.participants.map(p => {
      const participantId = p.user?._id || p.user?.id || p._id || p.id;
      if (participantId === otherUserId) {
        return {
          ...p,
          user: {
            ...p.user,
            isOnline: onlineStatus.isOnline,
            lastSeen: onlineStatus.lastSeen
          },
          isOnline: onlineStatus.isOnline,
          lastSeen: onlineStatus.lastSeen
        };
      }
      return p;
    });

    // Cập nhật otherParticipants nếu có
    if (updatedConversation.otherParticipants) {
      updatedConversation.otherParticipants = conversation.otherParticipants.map(p => {
        const participantId = p.user?._id || p.user?.id || p._id || p.id;
        if (participantId === otherUserId) {
          return {
            ...p,
            user: {
              ...p.user,
              isOnline: onlineStatus.isOnline,
              lastSeen: onlineStatus.lastSeen
            },
            isOnline: onlineStatus.isOnline,
            lastSeen: onlineStatus.lastSeen
          };
        }
        return p;
      });
    }

    return updatedConversation;
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
    if (!selectedConversation || !hasMoreMessages || isLoadingMessages) return;
    
    const nextPage = currentPage + 1;
    await loadMessages(selectedConversation._id, nextPage);
  };

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
  };

  // ==================== CALL HANDLERS ====================
  
  const handleVideoCall = async (conversationId) => {
    if (!selectedConversation) return;
    
    // Join conversation room
    await socketService.joinConversation(conversationId);
    
    const isGroup = selectedConversation.conversationType === 'group';
    const currentUserId = currentUser?.user?._id || currentUser?.user?.id || currentUser?._id || currentUser?.id;
    
    if (isGroup) {
      // Group call
      const participants = selectedConversation.participants
        ?.filter(p => !p.leftAt)
        ?.map(p => ({
          id: p.user?._id || p.user?.id || p._id || p.id,
          name: p.nickname || p.user?.name || p.name || "Người dùng",
          avatar: p.user?.avatarUrl || p.avatarUrl,
          isOnline: true // Assume all are online for now
        })) || [];
      
      setGroupParticipants(participants);
      setIsGroupCall(true);
      setRemoteUser(null); // Clear for group call
    } else {
      // 1-1 call
      const otherParticipant = selectedConversation.participants?.find(p => {
        const participantId = p.user?._id || p.user?.id || p._id || p.id;
        return participantId !== currentUserId;
      });
      
      setRemoteUser(otherParticipant?.user || otherParticipant || { name: "Người dùng" });
      setIsGroupCall(false);
      setGroupParticipants([]); // Clear for 1-1 call
    }
    
    setIsVideoCall(true);
    setCallOpen(true);
    
    // Emit call offer
    await socketService.emitCallOffer(conversationId, true);
  };

  const handleVoiceCall = async (conversationId) => {
    if (!selectedConversation) return;
    
    // Join conversation room
    await socketService.joinConversation(conversationId);
    
    const isGroup = selectedConversation.conversationType === 'group';
    const currentUserId = currentUser?.user?._id || currentUser?.user?.id || currentUser?._id || currentUser?.id;
    
    if (isGroup) {
      // Group call
      const participants = selectedConversation.participants
        ?.filter(p => !p.leftAt)
        ?.map(p => ({
          id: p.user?._id || p.user?.id || p._id || p.id,
          name: p.nickname || p.user?.name || p.name || "Người dùng",
          avatar: p.user?.avatarUrl || p.avatarUrl,
          isOnline: true // Assume all are online for now
        })) || [];
      
      setGroupParticipants(participants);
      setIsGroupCall(true);
      setRemoteUser(null); // Clear for group call
    } else {
      // 1-1 call
      const otherParticipant = selectedConversation.participants?.find(p => {
        const participantId = p.user?._id || p.user?.id || p._id || p.id;
        return participantId !== currentUserId;
      });
      
      setRemoteUser(otherParticipant?.user || otherParticipant || { name: "Người dùng" });
      setIsGroupCall(false);
      setGroupParticipants([]); // Clear for 1-1 call
    }
    
    setIsVideoCall(false);
    setCallOpen(true);
    
    // Emit call offer
    await socketService.emitCallOffer(conversationId, false);
  };

  const handleAcceptCall = () => {
    setCallOpen(true);
    setIsVideoCall(incomingCall?.isVideo ?? true);
    setIncomingOffer(incomingCall?.offer || null);
    setIncomingCall(null);
  };

  const handleRejectCall = async () => {
    await socketService.emitCallEnd(selectedConversation?._id);
    setIncomingCall(null);
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
              conversations={conversations.map(conv => mergeOnlineStatusToConversation(conv))}
              selectedConversation={selectedConversation ? mergeOnlineStatusToConversation(selectedConversation) : null}
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
              conversation={mergeOnlineStatusToConversation(selectedConversation)}
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
              onVideoCall={handleVideoCall}
              onVoiceCall={handleVoiceCall}
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

      {/* Call Modal */}
      {callOpen && (
        <CallModal
          open={callOpen}
          onClose={() => setCallOpen(false)}
          isVideo={isVideoCall}
          remoteUser={remoteUser}
          conversationId={selectedConversation?._id}
          incomingOffer={incomingOffer}
          isGroupCall={isGroupCall}
          groupParticipants={groupParticipants}
        />
      )}

      {/* Incoming Call Modal */}
      {incomingCall && (
        <CallIncomingModal
          open={true}
          caller={incomingCall.caller}
          isVideo={incomingCall.isVideo}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}
    </div>
  );
}
