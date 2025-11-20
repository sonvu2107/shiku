import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { useLocation } from "react-router-dom";
import ConversationList from "../components/chat/ConversationList";
import ChatWindow from "../components/chat/ChatWindow";
import Chatbot from "../components/Chatbot";
import NewConversationModal from "../components/chat/NewConversationModal";
import AddMembersModal from "../components/chat/AddMembersModal";
import CallModal from "../components/CallModal";
import CallIncomingModal from "../components/CallIncomingModal";
import { chatAPI } from "../chatAPI";
import { api } from "../api";
import socketService from "../socket";
import callManager from "../utils/callManager";
import { getUserInfo } from "../utils/auth";
import { chatbotAPI } from "../services/chatbotAPI";
import { useToast } from "../components/Toast";

/**
 * Chat - Trang chat chính với real-time messaging
 * Bao gồm danh sách cuộc trò chuyện, cửa sổ chat và các modals
 * @returns {JSX.Element} Component chat page
 */
export default function Chat() {
  // ==================== ROUTER & LOCATION ====================
  
  const location = useLocation(); // Để handle state từ MessageButton
  const { showInfo } = useToast();
  
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
  
  // Mobile view state
  const [showChatWindow, setShowChatWindow] = useState(false); // Hiển thị chat window trên mobile

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
      const myId = getUserInfo()?.id;
      const mySocketId = socketService.socket?.id;

      // Bỏ qua nếu chính mình là caller (kiểm tra cả user ID và socket ID)
      if (caller === myId || callerSocketId === mySocketId) {
        return;
      }

      // Validate offer
      if (!offer || !offer.type || !offer.sdp || !conversationId) {
        return;
      }

      // Nhận cuộc gọi từ bất kỳ conversation nào, không chỉ conversation đang chọn
      const incomingCallData = {
        offer,
        conversationId, // Thêm conversationId để biết cuộc gọi từ conversation nào
        caller: callerInfo || { name: "Người dùng" },
        isVideo: isVideo || false
      };

      setIncomingCall(incomingCallData);
    };

    // Setup listener
    callManager.addListener(handleOffer);

    return () => {
      // Cleanup listener khi component unmount hoặc dependencies thay đổi
      callManager.removeListener(handleOffer);
    };
  }, [currentUser]);

  // Xử lý conversation change và join room
  useEffect(() => {
    let active = true;
    let socketRef = null;
    let handleConversationJoined = null;

    const setup = async () => {
      if (!selectedConversation) return;
      const connected = await socketService.ensureConnection();
      if (!connected || !active) return;

      socketRef = socketService.socket;
      if (!socketRef) return;

      handleConversationJoined = () => {};
      socketRef.on("conversation-joined", handleConversationJoined);
    };

    setup();

    return () => {
      active = false;
      if (socketRef && handleConversationJoined) {
        socketRef.off("conversation-joined", handleConversationJoined);
      }
    };
  }, [selectedConversation?._id]);

  // Handle messages for current conversation
  useEffect(() => {
    let active = true;
    let socketRef = null;
    let handleNewMessage = null;
    let handleReactionsUpdated = null;

    const setup = async () => {
      if (!selectedConversation) return;
      const connected = await socketService.ensureConnection();
      if (!connected || !active) return;

      socketRef = socketService.socket;
      if (!socketRef) return;

      handleNewMessage = (message) => {
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

      handleReactionsUpdated = (data) => {
        if (!selectedConversation) return;
        if (data.conversationId !== selectedConversation._id) return;
        setMessages(prev => prev.map(m => m._id === data.messageId ? { ...m, reactions: data.reactions } : m));
      };

      socketRef.on("new-message", handleNewMessage);
      socketRef.on("message-reactions-updated", handleReactionsUpdated);
    };

    setup();

    return () => {
      active = false;
      if (socketRef && handleNewMessage) {
        socketRef.off("new-message", handleNewMessage);
      }
      if (socketRef && handleReactionsUpdated) {
        socketRef.off("message-reactions-updated", handleReactionsUpdated);
      }
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
    let active = true;
    let socketRef = null;
    let handleFriendOnline = null;
    let handleFriendOffline = null;

    const setup = async () => {
      const connected = await socketService.ensureConnection();
      if (!connected || !active) return;

      socketRef = socketService.socket;
      if (!socketRef) return;

      handleFriendOnline = (data) => {
        setUserOnlineStatus(prev => ({
          ...prev,
          [data.userId]: {
            isOnline: data.isOnline,
            lastSeen: data.lastSeen
          }
        }));
      };

      handleFriendOffline = (data) => {
        setUserOnlineStatus(prev => ({
          ...prev,
          [data.userId]: {
            isOnline: data.isOnline,
            lastSeen: data.lastSeen
          }
        }));
      };

      socketRef.on("friend-online", handleFriendOnline);
      socketRef.on("friend-offline", handleFriendOffline);
    };

    setup();

    return () => {
      active = false;
      if (socketRef && handleFriendOnline) {
        socketRef.off("friend-online", handleFriendOnline);
      }
      if (socketRef && handleFriendOffline) {
        socketRef.off("friend-offline", handleFriendOffline);
      }
    };
  }, []);

  const loadCurrentConversation = async () => {
    try {
      const { currentConversationId } = await chatAPI.getCurrentConversation();
      if (currentConversationId) {
        const savedConversation = conversations.find(conv => conv._id === currentConversationId);
        if (savedConversation) {
          console.log('Restoring saved conversation:', savedConversation._id);
          setSelectedConversation(savedConversation);
          return savedConversation;
        } else {
          // Clear saved conversation if it's no longer in the list
          await chatAPI.setCurrentConversation(null);
        }
      }
      return null;
    } catch (error) {
      console.error('Error loading current conversation:', error);
      return null;
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
          console.log('Loading conversation:', selectedConversation._id, selectedConversation.conversationType);
          
          // Với chatbot conversation, Chatbot component tự quản lý messages
          // Không cần load messages ở đây vì Chatbot component sẽ tự load từ chatbotAPI.getHistory()
          if (selectedConversation.conversationType === 'chatbot') {
            // Chatbot component tự quản lý messages, không cần load ở đây
            console.log('Chatbot conversation selected - Chatbot component will handle messages');
          } else {
            // Với conversation bình thường, load messages và join socket room
            await loadMessages(selectedConversation._id);
            if (selectedConversation._id) {
              await socketService.joinConversation(selectedConversation._id);
            }
          }
        } catch (error) {
          console.error('Error in handleConversationChange:', error);
        }
      } else {
        // Clear messages khi không có conversation được chọn
        setMessages([]);
        setHasMoreMessages(false);
      }
    };

    handleConversationChange();
    
    return () => {
      // Leave conversation khi conversation thay đổi (trừ chatbot)
      if (selectedConversation && selectedConversation.conversationType !== 'chatbot') {
        socketService.leaveConversation();
      }
    };
  }, [selectedConversation?._id]); // Chỉ trigger khi conversation ID thay đổi

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
      // Loại bỏ chatbot conversation khỏi danh sách vì nó được hiển thị riêng
      let conversationsList = (data.conversations || []).filter(
        conv => conv.conversationType !== 'chatbot'
      );

      setConversations(conversationsList);

      // Join vào TẤT CẢ conversation rooms để nhận incoming calls
      // Điều này đảm bảo user nhận được cuộc gọi từ bất kỳ conversation nào
      if (conversationsList.length > 0 && socketService.socket?.connected) {
        // Join tất cả conversations (trừ chatbot vì không cần socket)
        conversationsList.forEach(conversation => {
          if (conversation._id && conversation.conversationType !== 'chatbot') {
            socketService.joinConversation(conversation._id);
          }
        });
      }
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (conversationId, page = 1) => {
    if (!conversationId) {
      console.error('loadMessages: conversationId is required');
      setMessages([]);
      setIsLoadingMessages(false);
      return [];
    }
    
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
      console.error('Error loading messages:', error);
      setMessages([]);
      return [];
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSendMessage = async (content, type = 'text', emote = null, image = null) => {
    if (!selectedConversation) {
      return;
    }

    // Với chatbot conversation, sử dụng chatbot API
    if (selectedConversation.conversationType === 'chatbot') {
      try {
        const response = await chatbotAPI.sendMessage(content);
        if (response && response.message) {
          // Messages đã được lưu trong database, reload messages
          await loadMessages(selectedConversation._id);
          // Reload conversations để cập nhật lastMessage
          await loadConversations();
        }
      } catch (error) {
        alert('Có lỗi xảy ra khi gửi tin nhắn đến chatbot');
      }
      return;
    }

    // Với conversation bình thường
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
      let newConversation;
      
      // Nếu có existingConversation, sử dụng nó thay vì tạo mới
      if (conversationData.existingConversation) {
        newConversation = conversationData.existingConversation;
        
        // Kiểm tra xem conversation đã có trong danh sách chưa
        const existingInList = conversations.find(conv => conv._id === newConversation._id);
        if (!existingInList) {
          // Thêm vào đầu danh sách nếu chưa có
          setConversations(prev => [newConversation, ...prev]);
        }
      } else {
        // Tạo conversation mới như bình thường
        newConversation = await chatAPI.createConversation(conversationData);
        setConversations(prev => [newConversation, ...prev]);
      }
      
      setSelectedConversation(newConversation);
      
      // Lưu conversation hiện tại
      await saveCurrentConversation(newConversation._id);
      
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
    if (!conversation) {
      console.error('handleSelectConversation: conversation is null or undefined');
      return;
    }
    if (!conversation._id) {
      console.error('handleSelectConversation: conversation._id is missing', conversation);
      return;
    }
    console.log('Selecting conversation:', conversation._id, conversation.conversationType);
    setSelectedConversation(conversation);
    setShowChatWindow(true); // Hiển thị chat window trên mobile
    // Save current conversation
    saveCurrentConversation(conversation._id);
  };
 
  const handleBackToList = () => {
    setShowChatWindow(false); // Quay lại danh sách trên mobile
    setSelectedConversation(null);
  };

  const handleOpenChatbotPanel = async () => {
    try {
      console.log('Opening chatbot panel...');
      // Load chatbot conversation từ API
      const response = await chatbotAPI.getConversation();
      if (response.success && response.data) {
        const chatbotConv = response.data;
        console.log('Chatbot conversation loaded:', chatbotConv._id);
        // Chọn chatbot conversation (không thêm vào danh sách vì đã có nút riêng)
        setSelectedConversation(chatbotConv);
        setShowChatWindow(true);
        // Save current conversation
        saveCurrentConversation(chatbotConv._id);
      } else {
        console.error('Failed to load chatbot conversation:', response);
      }
    } catch (error) {
      console.error('Error loading chatbot conversation:', error);
    }
  };

  // ==================== CALL HANDLERS ====================
  
  const handleVideoCall = async (conversationId) => {
    if (!selectedConversation) return;
    
    const isGroup = selectedConversation.conversationType === 'group';
    
    // Kiểm tra nếu là group chat - hiển thị thông báo và không thực hiện call
    if (isGroup) {
      showInfo("Tính năng chưa khả dụng, sẽ cập nhật trong tương lai");
      return;
    }
    
    // Join conversation room
    await socketService.joinConversation(conversationId);
    
    const currentUserId = currentUser?.user?._id || currentUser?.user?.id || currentUser?._id || currentUser?.id;
    
    // 1-1 call
    const otherParticipant = selectedConversation.participants?.find(p => {
      const participantId = p.user?._id || p.user?.id || p._id || p.id;
      return participantId !== currentUserId;
    });
    
    setRemoteUser(otherParticipant?.user || otherParticipant || { name: "Người dùng" });
    setIsGroupCall(false);
    setGroupParticipants([]); // Clear for 1-1 call
    
    setIsVideoCall(true);
    setCallOpen(true);

    // NOTE: Không emit call offer ở đây
    // Offer sẽ được tạo và emit bên trong CallModal sau khi getUserMedia thành công
  };

  const handleVoiceCall = async (conversationId) => {
    if (!selectedConversation) return;
    
    const isGroup = selectedConversation.conversationType === 'group';
    
    // Kiểm tra nếu là group chat - hiển thị thông báo và không thực hiện call
    if (isGroup) {
      showInfo("Tính năng chưa khả dụng, sẽ cập nhật trong tương lai");
      return;
    }
    
    // Join conversation room
    await socketService.joinConversation(conversationId);
    
    const currentUserId = currentUser?.user?._id || currentUser?.user?.id || currentUser?._id || currentUser?.id;
    
    // 1-1 call
    const otherParticipant = selectedConversation.participants?.find(p => {
      const participantId = p.user?._id || p.user?.id || p._id || p.id;
      return participantId !== currentUserId;
    });
    
    setRemoteUser(otherParticipant?.user || otherParticipant || { name: "Người dùng" });
    setIsGroupCall(false);
    setGroupParticipants([]); // Clear for 1-1 call
    
    setIsVideoCall(false);
    setCallOpen(true);

    // NOTE: Không emit call offer ở đây
    // Offer sẽ được tạo và emit bên trong CallModal sau khi getUserMedia thành công
  };

  const handleAcceptCall = () => {
    if (!incomingCall) return;

    // Tìm conversation của cuộc gọi
    const targetConversation = conversations.find(c => c._id === incomingCall.conversationId);

    // Chuyển đến conversation của cuộc gọi nếu chưa mở
    if (incomingCall.conversationId && incomingCall.conversationId !== selectedConversation?._id) {
      if (targetConversation) {
        setSelectedConversation(targetConversation);
      }
    }

    // Set remote user info từ conversation hoặc từ incomingCall
    const currentUserId = currentUser?.user?._id || currentUser?.user?.id || currentUser?._id || currentUser?.id;

    if (targetConversation) {
      const isGroup = targetConversation.conversationType === 'group';

      if (isGroup) {
        // Group call
        const participants = targetConversation.participants
          ?.filter(p => !p.leftAt)
          ?.map(p => ({
            id: p.user?._id || p.user?.id || p._id || p.id,
            name: p.nickname || p.user?.name || p.name || "Người dùng",
            avatar: p.user?.avatarUrl || p.user?.avatar || p.avatarUrl || p.avatar
          }))
          ?.filter(p => p.id !== currentUserId) || [];

        setGroupParticipants(participants);
        setIsGroupCall(true);
        setRemoteUser(null);
      } else {
        // 1-1 call - lấy thông tin user đối phương từ conversation
        const otherParticipant = targetConversation.participants?.find(p => {
          const participantId = p.user?._id || p.user?.id || p._id || p.id;
          return participantId !== currentUserId;
        });

        setRemoteUser(otherParticipant?.user || otherParticipant || incomingCall.caller);
        setIsGroupCall(false);
        setGroupParticipants([]);
      }
    } else {
      // Fallback: dùng caller info từ incomingCall
      setRemoteUser(incomingCall.caller);
      setIsGroupCall(false);
      setGroupParticipants([]);
    }

    setCallOpen(true);
    setIsVideoCall(incomingCall?.isVideo ?? true);
    setIncomingOffer(incomingCall?.offer || null);
    setIncomingCall(null);
  };

  const handleRejectCall = async () => {
    if (!incomingCall) return;

    // Gửi signal từ chối cuộc gọi về conversation tương ứng
    const conversationId = incomingCall.conversationId || selectedConversation?._id;
    if (conversationId) {
      await socketService.emitCallEnd(conversationId);
    }
    setIncomingCall(null);
  };

  return (
  <div className="h-full bg-white dark:bg-gray-900 pt-16 sm:pt-20">
      <div className="h-full flex flex-col sm:flex-row chat-mobile">
        {/* Sidebar - Ẩn khi showChatWindow = true trên mobile */}
        <div className={`w-full sm:w-72 border-b sm:border-b-0 sm:border-r border-gray-100 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800 chat-sidebar-mobile ${showChatWindow ? 'hidden sm:flex' : 'flex'}`}>
          {/* Header */}
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Chat</h1>
              <button
                onClick={() => setShowNewConversationModal(true)}
                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 active:bg-blue-100 dark:active:bg-blue-900/30 rounded-full transition-colors touch-target"
                title="Tạo cuộc trò chuyện mới"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            <ConversationList
              conversations={conversations.map(conv => mergeOnlineStatusToConversation(conv))}
              selectedConversation={selectedConversation ? mergeOnlineStatusToConversation(selectedConversation) : null}
              onSelectConversation={handleSelectConversation}
              loading={isLoading}
              currentUser={currentUser}
            onOpenChatbot={handleOpenChatbotPanel}
            isChatbotActive={selectedConversation?.conversationType === 'chatbot'}
            />
          </div>
        </div>
        {/* Chat Window - Hiển thị khi showChatWindow = true trên mobile hoặc luôn luôn trên desktop khi có selectedConversation */}
        <div className={`flex-1 bg-gray-50 dark:bg-gray-900 flex flex-col chat-window-mobile min-h-0 ${selectedConversation ? (showChatWindow ? 'flex' : 'hidden sm:flex') : 'hidden sm:flex'}`}>
        {selectedConversation && selectedConversation.conversationType === 'chatbot' ? (
          <div className="flex-1 flex flex-col min-h-0 h-full w-full">
            <Chatbot 
              key={`chatbot-${selectedConversation._id}`}
              variant="embedded" 
              onClose={handleBackToList}
              showHeader={true}
            />
          </div>
        ) : selectedConversation ? (
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
              onBack={handleBackToList}
            />
          ) : (
            <div className="h-full flex items-center justify-center p-4">
              <div className="text-center">
                <div className="text-4xl sm:text-6xl mb-4">💬</div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-600 dark:text-gray-300 mb-2">
                  Chọn một cuộc trò chuyện
                </h3>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
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
