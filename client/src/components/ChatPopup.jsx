import { useEffect, useState, useRef } from "react";
import CallModal from "./CallModal";
import CallIncomingModal from "./CallIncomingModal";
import ImageViewer from "./ImageViewer";
import Chatbot from "./Chatbot";
import { api } from "../api";
import { getUserInfo } from "../utils/auth";
import socketService from "../socket";
import callManager from "../utils/callManager";
import { X, Phone, Video, ChevronDown, ThumbsUp, Heart, Laugh, Angry, Frown, Smile, MoreHorizontal, Edit2, Trash2, Bot } from "lucide-react";
import { getUserAvatarUrl, AVATAR_SIZES } from "../utils/avatarUtils";

// Custom CSS for enhanced shadows
const customStyles = `
  .hover\\:shadow-3xl:hover {
    box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.25);
  }
`;

// Inject custom styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = customStyles;
  document.head.appendChild(styleSheet);
}

/**
 * Danh sách emoji để chọn trong chat
 */
const EMOTES = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
  '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
  '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
  '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
  '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
  '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯',
  '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
  '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈',
  '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
  '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏',
  '🙌', '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '💔',
  '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
  '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐',
  '⚛️', '🆔', '⚕️', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸'
];

/**
 * ChatPopup - Popup chat window với khả năng gọi video/voice
 * Hiển thị cuộc trò chuyện trong popup với các tính năng gọi và gửi tin nhắn
 * @param {Object} props - Component props
 * @param {Object} props.conversation - Dữ liệu cuộc trò chuyện
 * @param {Function} props.onClose - Callback đóng popup
 * @param {Function} props.setCallOpen - Callback mở modal gọi
 * @param {Function} props.setIsVideoCall - Callback set loại cuộc gọi
 * @param {Function} props.onShowInfo - Callback hiển thị thông báo
 * @returns {JSX.Element} Component chat popup
 */
export default function ChatPopup({ conversation, onClose, setCallOpen, setIsVideoCall, index = 0, onShowInfo }) {
  const isChatbot = conversation?.conversationType === "chatbot";
  // ==================== EFFECTS ====================
  
  // Join conversation khi có conversationId
  useEffect(() => {
    const joinConversation = async () => {
      if (conversation?._id && !isChatbot) {
        await socketService.joinConversation(conversation._id);
      }
    };
    joinConversation();
  }, [conversation?._id, isChatbot]);

  // Listen for real-time messages
  useEffect(() => {
    if (!conversation?._id || !socketService.socket || isChatbot) return;
    
    const handleNewMessage = (message) => {
      // Check if message belongs to current conversation
      if (message.conversationId === conversation._id || message.conversation === conversation._id) {
        setMessages(prev => {
          const exists = prev.some(m => m._id === message._id);
          if (exists) {
            return prev;
          }
          return [...prev, message];
        });
      }
    };

    // Set up message listener for this conversation
    socketService.socket.on('new-message', handleNewMessage);
    const handleReactionsUpdated = (data) => {
      if (data.conversationId !== conversation._id) return;
      setMessages(prev => prev.map(m => m._id === data.messageId ? { ...m, reactions: data.reactions } : m));
    };
    socketService.socket.on('message-reactions-updated', handleReactionsUpdated);
    
    return () => {
      socketService.socket.off('new-message', handleNewMessage);
      socketService.socket.off('message-reactions-updated', handleReactionsUpdated);
    };
  }, [conversation?._id]);

  // ==================== STATE MANAGEMENT ====================
  
  // UI states
  const [minimized, setMinimized] = useState(false); // Trạng thái thu nhỏ popup
  const [uploading, setUploading] = useState(false); // Trạng thái upload ảnh
  const [imageViewer, setImageViewer] = useState({ isOpen: false, imageUrl: null, alt: "" }); // Image viewer state
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true); // Kiểm soát scroll
  
  // Message states
  const [messages, setMessages] = useState([]); // Danh sách tin nhắn
  const [input, setInput] = useState(""); // Nội dung tin nhắn đang nhập
  const [showEmotePicker, setShowEmotePicker] = useState(false); // Hiện emoji picker
  
  // Edit/Delete states
  const [editingMessageId, setEditingMessageId] = useState(null); // ID của tin nhắn đang edit
  const [editContent, setEditContent] = useState(""); // Nội dung edit
  const [showOptionsMenu, setShowOptionsMenu] = useState(null); // ID của tin nhắn đang hiển thị menu
  const [hoveredMessageId, setHoveredMessageId] = useState(null); // ID của tin nhắn đang hover
  
  // Refs
  const messagesEndRef = useRef(null); // Ref để scroll xuống cuối tin nhắn
  
  // User info
  const me = getUserInfo()?.id || getUserInfo()?._id || conversation.me; // ID của user hiện tại

  // tải tin nhắn
  useEffect(() => {
    if (isChatbot) return;
    async function fetchMessages() {
      try {
        const res = await api(`/api/messages/conversations/${conversation._id}/messages?limit=50`);
        setMessages(res.messages || []);
        setShouldScrollToBottom(true); // Scroll to bottom khi load messages lần đầu
      } catch {
        setMessages([]);
      }
    }
    fetchMessages();
  }, [conversation._id, isChatbot]);

  // Scroll to bottom when minimized state changes from true to false
  useEffect(() => {
    if (!minimized && shouldScrollToBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [minimized, shouldScrollToBottom]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (shouldScrollToBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, shouldScrollToBottom]);

  const handleSend = async () => {
    if (isChatbot || !input.trim()) return;
    
    const messageContent = input;
    setInput(""); // Clear input immediately for better UX
    setShouldScrollToBottom(true); // Scroll to bottom khi gửi tin nhắn
    
    try {
      const response = await api(`/api/messages/conversations/${conversation._id}/messages`, {
        method: "POST",
        body: { content: messageContent },
      });
      
      // Add the sent message to the list immediately (optimistic update)
      if (response.message) {
        setMessages(prev => [...prev, response.message]);
      }
    } catch (error) {
      // Restore input if sending failed
      setInput(messageContent);
    }
  };

  const handleEmoteSelect = async (emote) => {
    if (isChatbot) return;
    try {
      const response = await api(`/api/messages/conversations/${conversation._id}/messages`, {
        method: "POST",
        body: { content: "", messageType: "emote", emote: emote },
      });
      if (response.message) {
        setMessages(prev => [...prev, response.message]);
      }
    } catch (error) {
      alert("Không thể gửi emote: " + error.message);
    }
    setShowEmotePicker(false);
  };

  const handleEditMessage = (message) => {
    if (isChatbot) return;
    setEditingMessageId(message._id);
    setEditContent(message.content);
    setShowOptionsMenu(null);
  };

  const handleSaveEdit = async (messageId) => {
    if (isChatbot || !editContent.trim()) return;
    
    try {
      await api(`/api/messages/conversations/${conversation._id}/messages/${messageId}`, {
        method: 'PUT',
        body: { content: editContent }
      });
      
      // Update message locally
      setMessages(prev => prev.map(m => 
        m._id === messageId 
          ? { ...m, content: editContent, isEdited: true }
          : m
      ));
      
      setEditingMessageId(null);
      setEditContent("");
    } catch (error) {
      alert('Không thể sửa tin nhắn');
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent("");
  };

  const handleDeleteMessage = async (messageId) => {
    if (isChatbot) return;
    if (!confirm('Bạn có chắc muốn thu hồi tin nhắn này?')) return;
    
    try {
      await api(`/api/messages/conversations/${conversation._id}/messages/${messageId}`, {
        method: 'DELETE'
      });
      
      // Update message locally
      setMessages(prev => prev.map(m => 
        m._id === messageId 
          ? { ...m, isDeleted: true, content: 'Tin nhắn đã được thu hồi' }
          : m
      ));
      
      setShowOptionsMenu(null);
    } catch (error) {
      alert('Không thể thu hồi tin nhắn');
    }
  };

  // Close options menu when clicking outside
  useEffect(() => {
    if (isChatbot) return;
    const handleClickOutside = (e) => {
      if (showOptionsMenu && !e.target.closest('.message-options-menu')) {
        setShowOptionsMenu(null);
        setHoveredMessageId(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showOptionsMenu]);

  const isGroup = conversation?.conversationType === "group";
  const name = isChatbot
    ? conversation?.title || "Trợ lý AI"
    : isGroup
      ? conversation.groupName || "Nhóm"
      : conversation?.otherParticipants?.[0]?.nickname || conversation?.otherParticipants?.[0]?.user?.name || "Không tên";

  const avatar = isChatbot
    ? null
    : isGroup
      ? conversation.groupAvatar || getUserAvatarUrl({ name: conversation.groupName || 'Group' }, AVATAR_SIZES.MEDIUM)
      : getUserAvatarUrl(conversation?.otherParticipants?.[0]?.user, AVATAR_SIZES.MEDIUM);

  const getOtherUserOnlineStatus = () => {
    if (isGroup || isChatbot) return isChatbot ? true : false;
    
    const otherParticipant = conversation.otherParticipants?.[0];
    const user = otherParticipant?.user || otherParticipant;
    return user?.isOnline || false;
  };

  return (
    <div 
      className={`bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col chat-popup-mobile transition-all duration-300 ${
        minimized 
          ? `w-12 h-12 rounded-full hover:scale-110 hover:shadow-3xl cursor-pointer minimized relative group` 
          : 'w-72 sm:w-80 rounded-xl h-[450px]'
      }`} 
      onClick={minimized ? () => setMinimized(false) : undefined}
    >
      {/* Close button cho minimized state - chỉ hiển thị khi hover */}
      {minimized && (
        <button
          onClick={(e) => {
            e.stopPropagation(); // Ngăn không mở popup
            onClose();
          }}
          className="absolute -top-1 -right-1 w-5 h-5 bg-gray-700 dark:bg-gray-600 hover:bg-gray-900 dark:hover:bg-gray-800 text-white rounded-full flex items-center justify-center z-10 transition-all shadow-md opacity-0 group-hover:opacity-100"
          title="Đóng"
        >
          <X size={12} />
        </button>
      )}
      
      {/* Header */}
      <div className={`flex items-center gap-1 sm:gap-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 ${
        minimized ? 'border-b-0 rounded-full h-full w-full justify-center p-0' : 'px-2 sm:px-4 py-2 rounded-t-xl'
      }`}>
        <div className="relative flex-shrink-0">
          {isChatbot ? (
            <div className={`rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center ${
              minimized ? 'w-12 h-12' : 'w-7 h-7 sm:w-9 sm:h-9'
            }`}>
              <Bot size={minimized ? 22 : 16} />
            </div>
          ) : (
            <img src={avatar} alt={name} className={`rounded-full object-cover ${
              minimized ? 'w-12 h-12' : 'w-7 h-7 sm:w-9 sm:h-9'
            }`} />
          )}
          {/* Online status indicator for private conversations */}
          {!isGroup && !isChatbot && getOtherUserOnlineStatus() && !minimized && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          )}
        </div>
        {!minimized && (
          <>
            <div className="flex-1 font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base truncate min-w-0">{name}</div>
            {!isChatbot && (
              <div className="flex gap-0.5 sm:gap-1">
                <button
                  className="p-1.5 sm:p-2 hover:bg-blue-50 rounded-full text-blue-500 transition-all duration-200 hover:scale-110 touch-target"
                  onClick={() => {
                    if (isGroup) {
                      onShowInfo?.("Tính năng chưa khả dụng, sẽ cập nhật trong tương lai");
                      return;
                    }
                    setCallOpen && setCallOpen(true);
                    setIsVideoCall && setIsVideoCall(false);
                  }}
                  title={isGroup ? "Gọi thoại nhóm (chưa khả dụng)" : "Gọi thoại"}
                >
                  <Phone size={14} className="sm:w-4 sm:h-4" />
                </button>
                <button
                  className="p-1.5 sm:p-2 hover:bg-blue-50 rounded-full text-blue-500 transition-all duration-200 hover:scale-110 touch-target"
                  onClick={() => {
                    if (isGroup) {
                      onShowInfo?.("Tính năng chưa khả dụng, sẽ cập nhật trong tương lai");
                      return;
                    }
                    setCallOpen && setCallOpen(true);
                    setIsVideoCall && setIsVideoCall(true);
                  }}
                  title={isGroup ? "Gọi video nhóm (chưa khả dụng)" : "Gọi video"}
                >
                  <Video size={14} className="sm:w-4 sm:h-4" />
                </button>
              </div>
            )}
            <button
              className="p-1 hover:bg-gray-200 rounded-full touch-target"
              onClick={() => setMinimized(!minimized)}
              title={minimized ? "Phóng to" : "Thu nhỏ"}
            >
              <ChevronDown size={14} className={`sm:w-4 sm:h-4 transition-transform ${minimized ? 'rotate-180' : ''}`} />
            </button>
            <button className="p-1 hover:bg-gray-200 rounded-full touch-target" onClick={onClose}>
              <X size={14} className="sm:w-4 sm:h-4" />
            </button>
          </>
        )}
        {minimized && (
          <>
            {/* Online status indicator cho private conversations */}
            {!isGroup && !isChatbot && getOtherUserOnlineStatus() && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
            )}
            
            {/* Hiển thị số tin nhắn chưa đọc nếu có */}
            {!isChatbot && conversation.unreadCount > 0 && (
              <div className="absolute -top-1 left-8 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </div>
            )}
          </>
        )}
      </div>

      {/* Nội dung chat */}
      {!minimized && (
        <>
          <div className={`flex-1 ${isChatbot ? 'overflow-hidden px-0 py-0 flex flex-col' : 'overflow-y-auto px-4 py-2'} bg-white dark:bg-gray-900`}>
            {isChatbot ? (
              <div className="flex-1 flex flex-col min-h-0 h-full">
                <Chatbot
                  key="chatbot-popup"
                  variant="popup"
                  onClose={onClose}
                  allowMinimize={false}
                  showHeader={false}
                />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-gray-400 dark:text-gray-500 text-sm">Chưa có tin nhắn</div>
            ) : (
              messages.map((msg, idx) => {
                if (msg.messageType === "system") {
                  return (
                    <div key={msg._id || idx} className="mb-2 flex justify-center">
                      <div className="px-4 py-2 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm text-center max-w-[80%] break-words">
                        {msg.content}
                      </div>
                    </div>
                  );
                }
                // Chuẩn hóa sender
                const senderId = typeof msg.sender === 'string' ? msg.sender : (msg.sender?._id || msg.sender?.id);
                
                // Tìm participant để lấy nickname
                const senderParticipant = conversation.participants?.find(p => 
                  (p.user?._id || p.user?.id) === senderId
                );
                
                const senderName = typeof msg.sender === 'object' 
                  ? (senderParticipant?.nickname || msg.sender?.name || "Không tên")
                  : (senderParticipant?.nickname || conversation.otherParticipants?.[0]?.user?.name || "Không tên");
                
                const senderAvatar = getUserAvatarUrl(
                  typeof msg.sender === 'object' ? msg.sender : conversation.otherParticipants?.[0]?.user,
                  AVATAR_SIZES.SMALL
                );

                if (senderId === me) {
                  return (
                    <div 
                      key={msg._id || idx} 
                      className="mb-2 flex justify-end"
                      onMouseEnter={() => setHoveredMessageId(msg._id)}
                      onMouseLeave={() => {
                        if (showOptionsMenu !== msg._id) {
                          setHoveredMessageId(null);
                        }
                      }}
                    >
                      <div className="flex flex-col items-end max-w-[75%] relative">
                        {/* Message options menu */}
                        {!msg.isDeleted && msg.messageType !== 'system' && (hoveredMessageId === msg._id || showOptionsMenu === msg._id) && (
                          <div className="absolute top-1 -left-8 z-10 message-options-menu">
                            <div className="relative">
                              <button
                                onClick={() => setShowOptionsMenu(showOptionsMenu === msg._id ? null : msg._id)}
                                onMouseEnter={() => setHoveredMessageId(msg._id)}
                                className="p-1.5 rounded-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 shadow-sm"
                                title="Tùy chọn"
                              >
                                <MoreHorizontal size={14} className="text-gray-600 dark:text-gray-300" />
                              </button>
                              
                              {/* Dropdown menu */}
                              {showOptionsMenu === msg._id && (
                                <div 
                                  className="absolute left-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-1 min-w-[140px] z-50 message-options-menu"
                                  onMouseEnter={() => setHoveredMessageId(msg._id)}
                                >
                                  {msg.messageType !== 'image' && msg.messageType !== 'emote' && (
                                    <button
                                      onClick={() => handleEditMessage(msg)}
                                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-200"
                                    >
                                      <Edit2 size={12} />
                                      Sửa tin nhắn
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteMessage(msg._id)}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600 dark:text-red-400"
                                  >
                                    <Trash2 size={12} />
                                    Thu hồi
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {editingMessageId === msg._id ? (
                          // Edit mode
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-2 min-w-[200px] mb-1">
                            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center justify-between">
                              <span>Chỉnh sửa tin nhắn</span>
                              <button
                                onClick={handleCancelEdit}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                              >
                                <X size={12} />
                              </button>
                            </div>
                            <div className="flex items-end gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-2">
                              <input
                                type="text"
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 focus:outline-none"
                                placeholder="Nhập tin nhắn..."
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSaveEdit(msg._id);
                                  } else if (e.key === 'Escape') {
                                    handleCancelEdit();
                                  }
                                }}
                              />
                              <button
                                onClick={() => handleSaveEdit(msg._id)}
                                disabled={!editContent.trim()}
                                className="text-blue-500 hover:text-blue-600 disabled:text-gray-400 disabled:cursor-not-allowed p-1"
                                title="Gửi"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ) : msg.isDeleted ? (
                          <div className="px-3 py-2 rounded-2xl text-sm bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 italic break-words whitespace-pre-wrap overflow-wrap-anywhere max-w-full">
                            {msg.content}
                          </div>
                        ) : msg.messageType === "image" ? (
                          <img 
                            src={msg.imageUrl} 
                            alt="Ảnh" 
                            className="max-w-full rounded-xl cursor-pointer hover:opacity-90 transition-opacity" 
                            onClick={() => setImageViewer({ isOpen: true, imageUrl: msg.imageUrl, alt: "Ảnh" })}
                          />
                        ) : msg.messageType === "emote" ? (
                          <div className="px-3 py-2 rounded-2xl text-sm bg-blue-600 text-white flex items-center justify-center">
                            <span className="text-2xl">{msg.emote}</span>
                          </div>
                        ) : (
                          <div className="px-3 py-2 rounded-2xl text-sm bg-blue-600 text-white break-words whitespace-pre-wrap overflow-wrap-anywhere max-w-full">
                            {msg.content}
                          </div>
                        )}
                        
                        {/* Edited indicator */}
                        {msg.isEdited && !msg.isDeleted && editingMessageId !== msg._id && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic text-right">
                            Đã chỉnh sửa
                          </p>
                        )}
                        
                        {/* Reactions row */}
                        {!msg.isDeleted && editingMessageId !== msg._id && (
                          <div className="mt-1 flex items-center gap-1">
                            <div className="relative group">
                              <button className="text-gray-400 hover:text-gray-600 p-1.5 rounded-md hover:bg-gray-100" title="Thả cảm xúc" tabIndex={0}>
                                <Smile size={16} />
                              </button>
                              <div className="absolute hidden group-hover:flex group-focus-within:flex top-0 -translate-y-full right-0 bg-white border border-gray-200 rounded-full shadow px-2 py-1 gap-1 z-50">
                                {[
                                  { type: 'like', Icon: ThumbsUp, color: 'text-blue-500' },
                                  { type: 'love', Icon: Heart, color: 'text-red-500' },
                                  { type: 'laugh', Icon: Laugh, color: 'text-yellow-500' },
                                  { type: 'angry', Icon: Angry, color: 'text-orange-500' },
                                  { type: 'sad', Icon: Frown, color: 'text-gray-500' }
                                ].map(({ type, Icon, color }) => (
                                  <button key={type} onClick={async () => {
                                    try {
                                      await api(`/api/messages/conversations/${conversation._id}/messages/${msg._id}/react`, {
        method: "POST",
        body: { type }
      });
                                    } catch (e) {}
                                  }} className={`p-1 ${color}`} title={type}>
                                    <Icon size={16} />
                                  </button>
                                ))}
                              </div>
                            </div>
                            {!!msg.reactions?.length && (
                              <div className="flex flex-wrap gap-1">
                                {['like','love','laugh','angry','sad'].map((type) => {
                                  const map = { like: ThumbsUp, love: Heart, laugh: Laugh, angry: Angry, sad: Frown };
                                  const color = { like: 'text-blue-500', love: 'text-red-500', laugh: 'text-yellow-500', angry: 'text-orange-500', sad: 'text-gray-500' };
                                  const count = (msg.reactions || []).filter(r => r.type === type).length;
                                  if (!count) return null;
                                  const Ico = map[type];
                                  return <span key={type} className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full ${color[type]}`}><Ico size={12} /> {count}</span>;
                                })}
                              </div>
                            )}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          {msg.createdAt
                            ? new Date(msg.createdAt).toLocaleTimeString() +
                              " " +
                              new Date(msg.createdAt).toLocaleDateString()
                            : ""}
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={msg._id || idx} className="mb-2 flex justify-start">
                    <div className="flex items-start gap-2 max-w-[75%]">
                      <img
                        src={senderAvatar}
                        alt={senderName}
                        className="w-7 h-7 rounded-full object-cover mt-1 flex-shrink-0"
                      />
                      <div className="flex flex-col items-start min-w-0 flex-1">
                        <div className="text-xs text-gray-700 dark:text-gray-300 font-semibold mb-1">
                          {senderName}
                        </div>
                        {msg.messageType === "image" ? (
                          <img 
                            src={msg.imageUrl} 
                            alt="Ảnh" 
                            className="max-w-full rounded-xl cursor-pointer hover:opacity-90 transition-opacity" 
                            onClick={() => setImageViewer({ isOpen: true, imageUrl: msg.imageUrl, alt: "Ảnh" })}
                          />
                        ) : msg.messageType === "emote" ? (
                          <div className="px-3 py-2 rounded-2xl text-sm bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 flex items-center justify-center">
                            <span className="text-2xl">{msg.emote}</span>
                          </div>
                        ) : (
                          <div className="px-3 py-2 rounded-2xl text-sm bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 break-words whitespace-pre-wrap overflow-wrap-anywhere max-w-full">
                            {msg.content}
                          </div>
                        )}
                        {/* Reactions row */}
                        <div className="mt-1 flex items-center gap-1">
                          <div className="relative group">
                            <button className="text-gray-400 hover:text-gray-600 p-1.5 rounded-md hover:bg-gray-100" title="Thả cảm xúc" tabIndex={0}>
                              <Smile size={16} />
                            </button>
                            <div className="absolute hidden group-hover:flex group-focus-within:flex top-0 -translate-y-full left-0 bg-white border border-gray-200 rounded-full shadow px-2 py-1 gap-1 z-50">
                              {[
                                { type: 'like', Icon: ThumbsUp, color: 'text-blue-500' },
                                { type: 'love', Icon: Heart, color: 'text-red-500' },
                                { type: 'laugh', Icon: Laugh, color: 'text-yellow-500' },
                                { type: 'angry', Icon: Angry, color: 'text-orange-500' },
                                { type: 'sad', Icon: Frown, color: 'text-gray-500' }
                              ].map(({ type, Icon, color }) => (
                                <button key={type} onClick={async () => {
                                  try {
                                    await api(`/api/messages/conversations/${conversation._id}/messages/${msg._id}/react`, {
      method: "POST",
      body: { type }
    });
                                  } catch (e) {}
                                }} className={`p-1 ${color}`} title={type}>
                                  <Icon size={16} />
                                </button>
                              ))}
                            </div>
                          </div>
                          {!!msg.reactions?.length && (
                            <div className="flex flex-wrap gap-1">
                              {['like','love','laugh','angry','sad'].map((type) => {
                                const map = { like: ThumbsUp, love: Heart, laugh: Laugh, angry: Angry, sad: Frown };
                                const color = { like: 'text-blue-500', love: 'text-red-500', laugh: 'text-yellow-500', angry: 'text-orange-500', sad: 'text-gray-500' };
                                const count = (msg.reactions || []).filter(r => r.type === type).length;
                                if (!count) return null;
                                const Ico = map[type];
                                return <span key={type} className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full ${color[type]}`}><Ico size={12} /> {count}</span>;
                              })}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {msg.createdAt
                            ? new Date(msg.createdAt).toLocaleTimeString() +
                              " " +
                              new Date(msg.createdAt).toLocaleDateString()
                            : ""}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Ô nhập */}
          {!minimized && !isChatbot && (
            <div className="flex items-center gap-2 px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-xl relative">
              <label className="cursor-pointer">
                <svg
                  width="24"
                  height="24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-image text-gray-500"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="2.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    setUploading(true);
                    const reader = new FileReader();
                    reader.onload = async () => {
                      try {
                        const response = await api(`/api/messages/conversations/${conversation._id}/messages/image`, {
                          method: "POST",
                          body: { image: reader.result },
                        });
                        
                        // Add the sent image message to the list immediately (optimistic update)
                        if (response.message) {
                          setMessages(prev => [...prev, response.message]);
                        }
                      } catch (error) {
                        // Handle error silently
                      }
                      setUploading(false);
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
              
              {/* Emote picker */}
              {showEmotePicker && (
                <div className="absolute bottom-full left-2 right-2 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg p-4 max-h-48 overflow-y-auto z-10">
                  <div className="grid grid-cols-6 gap-2">
                    {EMOTES.map((emote, index) => (
                      <button
                        key={index}
                        onClick={() => handleEmoteSelect(emote)}
                        className="p-2 text-xl hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-target"
                      >
                        {emote}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <button
                type="button"
                onClick={() => setShowEmotePicker(!showEmotePicker)}
                className={`p-2 rounded-full transition-colors touch-target ${
                  showEmotePicker 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-blue-500 hover:bg-blue-50 active:bg-blue-100'
                }`}
                title="Chọn emote"
              >
                <Smile size={20} />
              </button>
              
              <input
                className="flex-1 px-3 py-2 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Aa"
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                disabled={uploading}
              />
              <button
                className="px-3 py-2 bg-blue-600 text-white rounded-full"
                onClick={handleSend}
                disabled={uploading}
              >
                Gửi
              </button>
            </div>
          )}
        </>
      )}

      {/* Image Viewer */}
      {!isChatbot && (
        <ImageViewer
          isOpen={imageViewer.isOpen}
          imageUrl={imageViewer.imageUrl}
          alt={imageViewer.alt}
          onClose={() => setImageViewer({ isOpen: false, imageUrl: null, alt: "" })}
        />
      )}
    </div>
  );
}

// Wrapper để quản lý CallModal + CallIncomingModal
export function ChatPopupWithCallModal(props) {
  const isChatbot = props.conversation?.conversationType === "chatbot";
  if (isChatbot) {
    return <ChatPopup {...props} />;
  }

  const [callOpen, setCallOpen] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(true);
  const [incomingCall, setIncomingCall] = useState(null);
  const [incomingOffer, setIncomingOffer] = useState(null);

  useEffect(() => {
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

      // Chỉ hiển thị incoming call nếu là conversation của popup này
      if (conversationId === props.conversation._id) {
        const incomingCallData = {
          offer,
          conversationId, // Thêm conversationId để tracking
          caller: callerInfo || { name: "Người dùng" },
          isVideo: isVideo || false
        };
        setIncomingCall(incomingCallData);
      }
    };

    // Sử dụng global call manager thay vì socket trực tiếp
    callManager.addListener(handleOffer);

    return () => {
      callManager.removeListener(handleOffer);
    };
  }, [props.conversation._id]);

  const handleAcceptCall = () => {
    if (!incomingCall) return;

    setCallOpen(true);
    setIsVideoCall(incomingCall?.isVideo ?? true);
    setIncomingOffer(incomingCall?.offer || null);
    setIncomingCall(null);
  };

  const handleRejectCall = async () => {
    if (!incomingCall) return;

    // Gửi signal từ chối cuộc gọi về conversation tương ứng
    const conversationId = incomingCall.conversationId || props.conversation._id;
    if (conversationId) {
      await socketService.emitCallEnd(conversationId);
    }
    setIncomingCall(null);
  };

  return (
    <>
      <ChatPopup {...props} setCallOpen={setCallOpen} setIsVideoCall={setIsVideoCall} />
      {callOpen && (
        <CallModal
          open={callOpen}
          onClose={() => setCallOpen(false)}
          isVideo={isVideoCall}
          remoteUser={
            props.conversation.conversationType === "group"
              ? null
              : props.conversation.otherParticipants?.[0]?.user
          }
          socket={socketService.socket}
          conversationId={props.conversation._id}
          incomingOffer={incomingOffer}
        />
      )}
      {incomingCall && (
        <CallIncomingModal
          open={true}
          caller={incomingCall.caller}
          isVideo={incomingCall.isVideo}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}
    </>
  );
}
