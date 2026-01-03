import { useEffect, useState, useRef, useMemo } from "react";
import CallModal from "./CallModal";
import CallIncomingModal from "./CallIncomingModal";
import ImageViewer from "./ImageViewer";
import Chatbot from "./Chatbot";
import { api } from "../api";
import { getUserInfo } from "../utils/auth";
import socketService from "../socket";
import callManager from "../utils/callManager";
import { X, Phone, Video, ChevronDown, Trash2, Bot, CheckCheck, ArrowDown, Smile } from "lucide-react";
import { getUserAvatarUrl, AVATAR_SIZES } from "../utils/avatarUtils";
import { useToast } from "../contexts/ToastContext";
import { parseLinks } from "../utils/linkParser.jsx";
import Avatar from "./Avatar";

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
 * Format message time - consistent with MessageList
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted time
 */
const formatMessageTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = (now - date) / (1000 * 60 * 60);

  if (diffInHours < 24) {
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } else {
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit'
    }) + ', ' + date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};

/**
 * List of emojis to choose from in chat popup
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
 * Reaction configuration - shared with MessageList
 */
const reactionConfig = {
  like: { emoji: '👍' },
  love: { emoji: '❤️' },
  laugh: { emoji: '😆' },
  angry: { emoji: '😡' },
  sad: { emoji: '😢' },
};

/**
 * ChatPopup - Popup chat window with video/voice call capability
 * Displays the conversation in a popup with call and messaging features
 * @param {Object} props - Component props
 * @param {Object} props.conversation - Conversation data
 * @param {Function} props.onClose - Callback to close the popup
 * @param {Function} props.setCallOpen - Callback to open the call modal
 * @param {Function} props.setIsVideoCall - Callback to set the call type
 * @param {Function} props.onShowInfo - Callback to show information
 * @returns {JSX.Element} Chat popup component
 */
export default function ChatPopup({ conversation, onClose, setCallOpen, setIsVideoCall, index = 0, onShowInfo }) {
  const { showError } = useToast();
  const isChatbot = conversation?.conversationType === "chatbot";
  // ==================== EFFECTS ====================

  // Join conversation when conversationId is available
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
  const [minimized, setMinimized] = useState(false); // Popup minimized state
  const [uploading, setUploading] = useState(false); // Image upload state
  const [imageViewer, setImageViewer] = useState({ isOpen: false, imageUrl: null, alt: "" }); // Image viewer state
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true); // Scroll control
  const [showScrollButton, setShowScrollButton] = useState(false); // Show scroll to bottom button

  // Message states
  const [messages, setMessages] = useState([]); // List of messages
  const [input, setInput] = useState(""); // Message input content
  const [showEmotePicker, setShowEmotePicker] = useState(false); // Show emoji picker

  // Edit/Delete states
  const [showOptionsMenu, setShowOptionsMenu] = useState(null); // ID of the message showing options menu
  const [selectedMessageId, setSelectedMessageId] = useState(null); // ID of message with open reaction menu (click-based)

  // Refs
  const messagesEndRef = useRef(null); // Ref to scroll to the bottom of messages
  const scrollContainerRef = useRef(null); // Ref for scroll container

  // User info
  const me = getUserInfo()?.id || getUserInfo()?._id || conversation.me; // ID of the current user

  // Calculate which message is the last one each user has read (Facebook-style)
  const lastReadByMap = useMemo(() => {
    if (!messages || !me) return {};

    const userLastReadMessage = {}; // userId -> {messageId, user}

    messages.forEach((msg) => {
      const senderId = typeof msg.sender === 'string' ? msg.sender : msg.sender?._id;
      if (!msg.readBy || senderId !== me) return; // Only our own messages

      msg.readBy.forEach((reader) => {
        const readerId = reader.user?._id || reader.user;
        if (readerId && readerId !== me) {
          userLastReadMessage[readerId] = {
            messageId: msg._id,
            user: reader.user
          };
        }
      });
    });

    // Group by messageId
    const result = {};
    Object.values(userLastReadMessage).forEach(({ messageId, user }) => {
      if (!result[messageId]) result[messageId] = [];
      result[messageId].push(user);
    });

    return result;
  }, [messages, me]);

  // Load messages when conversation changes
  useEffect(() => {
    if (isChatbot) return;
    async function fetchMessages() {
      try {
        const res = await api(`/api/messages/conversations/${conversation._id}/messages?limit=50`);
        setMessages(res.messages || []);
        setShouldScrollToBottom(true); // Scroll to bottom when loading messages for the first time
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
      setShowScrollButton(false);
    }
  }, [messages, shouldScrollToBottom]);

  // Handle scroll to show/hide scroll button
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || isChatbot) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isChatbot]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollButton(false);
  };

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
      showError("Không thể gửi emote: " + error.message);
    }
    setShowEmotePicker(false);
  };

  // Toggle reaction on a message
  const toggleReaction = async (messageId, type) => {
    if (isChatbot) return;
    if (import.meta.env.DEV) {
      console.log('[ChatPopup] toggleReaction called:', { messageId, type });
    }
    try {
      const res = await api(`/api/messages/conversations/${conversation._id}/messages/${messageId}/react`, {
        method: 'POST',
        body: { type }
      });
      if (import.meta.env.DEV) {
        console.log('[ChatPopup] toggleReaction response:', res);
      }
      // Update reactions locally from API response
      const reactions = res.reactions || [];
      setMessages(prev => {
        const updated = prev.map(m => m._id === messageId ? { ...m, reactions } : m);
        if (import.meta.env.DEV) {
          console.log('[ChatPopup] Messages updated, new reactions:', reactions);
        }
        return updated;
      });
    } catch (e) {
      if (import.meta.env.DEV) {
        console.error('[ChatPopup] Reaction error:', e);
      }
    }
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
      showError('Không thể thu hồi tin nhắn');
    }
  };

  // Close menus when clicking outside
  useEffect(() => {
    if (isChatbot) return;
    const handleClickOutside = (e) => {
      // Check if click is on a message bubble or inside reaction popup
      if (e.target.closest('.message-bubble')) return;
      if (e.target.closest('.reaction-popup')) return;

      // Close selectedMessageId (reaction popup) if open
      if (selectedMessageId) {
        setSelectedMessageId(null);
      }

      // Close options menu if open
      if (showOptionsMenu && !e.target.closest('.message-options-menu')) {
        setShowOptionsMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showOptionsMenu, selectedMessageId]);

  const isGroup = conversation?.conversationType === "group";
  const name = isChatbot
    ? conversation?.title || "Trợ lý AI"
    : isGroup
      ? conversation.groupName || "Nhóm"
      : conversation?.otherParticipants?.[0]?.nickname || conversation?.otherParticipants?.[0]?.user?.name || "Không tên";

  const avatar = isChatbot
    ? null
    : isGroup
      ? { url: conversation.groupAvatar || null, name: conversation.groupName || 'Group' }
      : { url: conversation?.otherParticipants?.[0]?.user?.avatarUrl || null, name: conversation?.otherParticipants?.[0]?.user?.name || 'User' };

  const getOtherUserOnlineStatus = () => {
    if (isGroup || isChatbot) return isChatbot ? true : false;

    const otherParticipant = conversation.otherParticipants?.[0];
    const user = otherParticipant?.user || otherParticipant;
    return user?.isOnline || false;
  };

  return (
    <div
      className={`bg-white dark:bg-neutral-900 shadow-2xl border border-gray-200 dark:border-neutral-800 flex flex-col chat-popup-mobile transition-all duration-300 ${minimized
        ? `w-12 h-12 rounded-full hover:scale-110 hover:shadow-3xl cursor-pointer minimized relative group`
        : 'relative w-72 sm:w-80 rounded-xl h-[450px]'
        }`}
      onClick={minimized ? () => setMinimized(false) : undefined}
    >
      {/* Close button cho minimized state - chỉ hiển thị khi hover */}
      {minimized && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute -top-1 -right-1 w-6 h-6 bg-gray-700 dark:bg-neutral-700 hover:bg-gray-900 dark:hover:bg-neutral-900 text-white rounded-full flex items-center justify-center z-10 transition-all shadow-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 touch-manipulation"
          title="Đóng"
        >
          <X size={12} />
        </button>
      )}

      {/* Header */}
      <div className={`flex items-center gap-1 sm:gap-2 border-b border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 ${minimized ? 'border-b-0 rounded-full h-full w-full justify-center p-0' : 'px-2 sm:px-4 py-2 rounded-t-xl'
        }`}>
        <div className="relative flex-shrink-0">
          {isChatbot ? (
            <div className={`rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center ${minimized ? 'w-12 h-12' : 'w-7 h-7 sm:w-9 sm:h-9'
              }`}>
              <Bot size={minimized ? 22 : 16} />
            </div>
          ) : (
            <Avatar src={avatar?.url} name={avatar?.name || name} size={minimized ? 48 : 36} className="" />
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
                  className="p-2 sm:p-2 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full text-black dark:text-white transition-all duration-200 hover:scale-110 touch-manipulation"
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
                  className="p-2 sm:p-2 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full text-black dark:text-white transition-all duration-200 hover:scale-110 touch-manipulation"
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
              className="p-1 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full touch-target text-black dark:text-gray-300"
              onClick={() => setMinimized(!minimized)}
              title={minimized ? "Phóng to" : "Thu nhỏ"}
            >
              <ChevronDown size={14} className={`sm:w-4 sm:h-4 transition-transform ${minimized ? 'rotate-180' : ''}`} />
            </button>
            <button className="p-1 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full touch-target text-black dark:text-gray-300" onClick={onClose}>
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

            {/* Show number of unread messages if any */}
            {!isChatbot && conversation.unreadCount > 0 && (
              <div className="absolute -top-1 left-8 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </div>
            )}
          </>
        )}
      </div>

      {/* Chat content */}
      {!minimized && (
        <>
          <div ref={scrollContainerRef} className={`flex-1 ${isChatbot ? 'overflow-hidden px-0 py-0 flex flex-col' : 'overflow-y-auto overflow-x-visible px-4 py-2'} bg-white dark:bg-neutral-950`} style={{ scrollbarGutter: isChatbot ? undefined : 'stable' }}>
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
                      <div className="px-4 py-2 rounded-2xl bg-gray-100 dark:bg-neutral-900 text-gray-700 dark:text-gray-300 text-sm text-center max-w-[80%] break-words">
                        {msg.content}
                      </div>
                    </div>
                  );
                }
                // Normalize sender
                const senderId = typeof msg.sender === 'string' ? msg.sender : (msg.sender?._id || msg.sender?.id);

                // Find participant to get nickname
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
                    >
                      <div className="flex flex-col items-end max-w-[75%] relative">
                        {/* Message container with click-to-select */}
                        <div className="flex items-center gap-2 flex-row-reverse relative">
                          {/* Message bubble - click to show reactions */}
                          <div
                            onClick={() => {
                              if (!msg.isDeleted && msg.messageType !== 'system') {
                                setSelectedMessageId(selectedMessageId === msg._id ? null : msg._id);
                                setShowOptionsMenu(null);
                              }
                            }}
                            className={`message-bubble relative cursor-pointer transition-all duration-200 ${selectedMessageId === msg._id ? 'ring-2 ring-neutral-300 ring-offset-1' : ''}`}
                          >
                            {msg.isDeleted ? (
                              <div
                                className="px-3 py-2 rounded-2xl text-sm bg-gray-200 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 italic break-words whitespace-pre-wrap overflow-wrap-anywhere max-w-full"
                                title={formatMessageTime(msg.createdAt)}
                              >
                                {msg.content}
                              </div>
                            ) : msg.messageType === "image" ? (
                              <img
                                src={msg.imageUrl}
                                alt="Ảnh"
                                className="max-w-full rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                                title={formatMessageTime(msg.createdAt)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setImageViewer({ isOpen: true, imageUrl: msg.imageUrl, alt: "Ảnh" });
                                }}
                              />
                            ) : msg.messageType === "emote" ? (
                              <div
                                className="px-3 py-2 rounded-2xl text-sm chat-bubble-own flex items-center justify-center"
                                title={formatMessageTime(msg.createdAt)}
                              >
                                <span className="text-2xl">{msg.emote}</span>
                              </div>
                            ) : (
                              <div
                                className="px-3 py-2 rounded-2xl text-sm chat-bubble-own break-words whitespace-pre-wrap overflow-wrap-anywhere max-w-full"
                                title={formatMessageTime(msg.createdAt)}
                              >
                                {parseLinks(msg.content, { linkClassName: "text-blue-200 hover:text-blue-100 underline break-all" })}
                              </div>
                            )}
                          </div>

                          {/* Click-to-show reaction popup */}
                          {selectedMessageId === msg._id && !msg.isDeleted && msg.messageType !== 'system' && (
                            <div
                              className="reaction-popup absolute bottom-full mb-2 right-0 z-20 bg-white dark:bg-neutral-900 shadow-xl rounded-full p-1 flex items-center gap-1 border border-gray-100 dark:border-neutral-800 animate-in fade-in zoom-in duration-200 origin-bottom-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Emoji reactions */}
                              <div className="flex gap-0.5">
                                {Object.entries(reactionConfig).map(([type, cfg]) => {
                                  const hasReacted = (msg.reactions || []).some(
                                    r => r.type === type && (r.user === me || r.user?._id === me)
                                  );
                                  return (
                                    <button
                                      key={type}
                                      onClick={async () => {
                                        await toggleReaction(msg._id, type);
                                        setSelectedMessageId(null);
                                      }}
                                      className={`w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-sm md:text-lg rounded-full transition transform active:scale-110 hover:scale-110 ${hasReacted ? 'bg-neutral-200 dark:bg-neutral-700' : 'hover:bg-gray-100 dark:hover:bg-neutral-800'}`}
                                      title={type}
                                    >
                                      {cfg.emoji}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Delete for own messages */}
                              <button
                                onClick={() => {
                                  handleDeleteMessage(msg._id);
                                  setSelectedMessageId(null);
                                }}
                                className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition"
                                title="Thu hồi"
                              >
                                <Trash2 size={14} className="text-red-500" />
                              </button>

                              {/* Close button */}
                              <button
                                onClick={() => setSelectedMessageId(null)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition"
                                title="Đóng"
                              >
                                <X size={12} className="text-gray-400" />
                              </button>
                            </div>
                          )}

                          {/* Single reaction emoji at corner (like MessageList) */}
                          {!msg.isDeleted && !!msg.reactions?.length && (() => {
                            const lastReaction = msg.reactions[msg.reactions.length - 1];
                            const reactionType = lastReaction?.type;
                            const cfg = reactionConfig[reactionType];
                            if (!cfg) return null;

                            return (
                              <div className="absolute -bottom-3 right-2 z-10">
                                <span className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 text-xs px-1.5 py-0.5 rounded-full shadow-sm text-lg leading-none block">
                                  {cfg.emoji}
                                </span>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Edited indicator */}
                        {msg.isEdited && !msg.isDeleted && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic text-right">
                            Đã chỉnh sửa
                          </p>
                        )}

                        {/* Time display */}
                        {!msg.isDeleted && (
                          <div className={`text-[10px] text-gray-400/70 ${msg.reactions?.length ? 'mt-4' : 'mt-1'} text-right`}>
                            {formatMessageTime(msg.createdAt)}
                          </div>
                        )}

                        {/* Message status indicator */}
                        {!msg.isDeleted && (() => {
                          const lastReadUsers = lastReadByMap[msg._id] || [];
                          const hasAnyReader = (msg.readBy || []).some(
                            r => r.user !== me && r.user?._id !== me
                          );
                          const hasReaction = msg.reactions?.length > 0;

                          return (
                            <div className={`flex justify-end ${hasReaction ? 'mt-1' : 'mt-1'}`}>
                              {lastReadUsers.length > 0 ? (
                                <div className="flex -space-x-1">
                                  {lastReadUsers.slice(0, 2).map((readerUser, idx) => {
                                    const avatarUrl = readerUser?.avatarUrl;
                                    const name = readerUser?.name || 'User';

                                    return (
                                      <Avatar
                                        key={readerUser?._id || idx}
                                        src={avatarUrl}
                                        name={name}
                                        size={14}
                                        className="border border-white dark:border-gray-800"
                                      />
                                    );
                                  })}
                                  {lastReadUsers.length > 2 && (
                                    <div
                                      className="w-3.5 h-3.5 rounded-full border border-white dark:border-gray-800 bg-gray-300 dark:bg-neutral-700 flex items-center justify-center"
                                      title={`+${lastReadUsers.length - 2} người khác đã xem`}
                                    >
                                      <span className="text-gray-600 dark:text-gray-300 text-[7px] font-bold">
                                        +{lastReadUsers.length - 2}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ) : hasAnyReader ? null : (
                                <CheckCheck size={14} className="text-gray-400" title="Đã gửi" />
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                }
                return (
                  <div
                    key={msg._id || idx}
                    className="mb-2 flex justify-start"
                  >
                    <div className="flex items-start gap-2 max-w-[75%]">
                      <Avatar
                        src={senderAvatar}
                        name={senderName}
                        size={28}
                        className="mt-1 flex-shrink-0"
                      />
                      <div className="flex flex-col items-start min-w-0 flex-1">
                        <div className="text-xs text-gray-700 dark:text-gray-300 font-semibold mb-1">
                          {senderName}
                        </div>
                        {/* Message container with click-to-select */}
                        <div className="flex items-center gap-2 flex-row relative">
                          {/* Message bubble - click to show reactions */}
                          <div
                            onClick={() => {
                              if (!msg.isDeleted && msg.messageType !== 'system') {
                                setSelectedMessageId(selectedMessageId === msg._id ? null : msg._id);
                                setShowOptionsMenu(null);
                              }
                            }}
                            className={`message-bubble relative cursor-pointer transition-all duration-200 ${selectedMessageId === msg._id ? 'ring-2 ring-neutral-300 ring-offset-1' : ''}`}
                          >
                            {msg.messageType === "image" ? (
                              <img
                                src={msg.imageUrl}
                                alt="Ảnh"
                                className="max-w-full rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                                title={formatMessageTime(msg.createdAt)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setImageViewer({ isOpen: true, imageUrl: msg.imageUrl, alt: "Ảnh" });
                                }}
                              />
                            ) : msg.messageType === "emote" ? (
                              <div
                                className="px-3 py-2 rounded-2xl text-sm bg-gray-200 dark:bg-neutral-800 text-gray-900 dark:text-gray-100 flex items-center justify-center"
                                title={formatMessageTime(msg.createdAt)}
                              >
                                <span className="text-2xl">{msg.emote}</span>
                              </div>
                            ) : (
                              <div
                                className="px-3 py-2 rounded-2xl text-sm bg-gray-200 dark:bg-neutral-800 text-gray-900 dark:text-gray-100 break-words whitespace-pre-wrap overflow-wrap-anywhere max-w-full"
                                title={formatMessageTime(msg.createdAt)}
                              >
                                {parseLinks(msg.content)}
                              </div>
                            )}
                          </div>

                          {/* Click-to-show reaction popup */}
                          {selectedMessageId === msg._id && !msg.isDeleted && msg.messageType !== 'system' && (
                            <div
                              className="reaction-popup absolute bottom-full mb-2 left-0 z-20 bg-white dark:bg-neutral-900 shadow-xl rounded-full p-1 flex items-center gap-1 border border-gray-100 dark:border-neutral-800 animate-in fade-in zoom-in duration-200 origin-bottom-left"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Emoji reactions */}
                              <div className="flex gap-0.5">
                                {Object.entries(reactionConfig).map(([type, cfg]) => {
                                  const hasReacted = (msg.reactions || []).some(
                                    r => r.type === type && (r.user === me || r.user?._id === me)
                                  );
                                  return (
                                    <button
                                      key={type}
                                      onClick={async () => {
                                        await toggleReaction(msg._id, type);
                                        setSelectedMessageId(null);
                                      }}
                                      className={`w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-sm md:text-lg rounded-full transition transform active:scale-110 hover:scale-110 ${hasReacted ? 'bg-neutral-200 dark:bg-neutral-700' : 'hover:bg-gray-100 dark:hover:bg-neutral-800'}`}
                                      title={type}
                                    >
                                      {cfg.emoji}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Close button */}
                              <button
                                onClick={() => setSelectedMessageId(null)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition"
                                title="Đóng"
                              >
                                <X size={12} className="text-gray-400" />
                              </button>
                            </div>
                          )}

                          {/* Single reaction emoji at corner (like MessageList) */}
                          {!msg.isDeleted && !!msg.reactions?.length && (() => {
                            const lastReaction = msg.reactions[msg.reactions.length - 1];
                            const reactionType = lastReaction?.type;
                            const cfg = reactionConfig[reactionType];
                            if (!cfg) return null;

                            return (
                              <div className="absolute -bottom-3 left-2 z-10">
                                <span className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 text-xs px-1.5 py-0.5 rounded-full shadow-sm text-lg leading-none block">
                                  {cfg.emoji}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                        <div className={`text-[10px] text-gray-400/70 ${msg.reactions?.length ? 'mt-4' : 'mt-1'}`}>
                          {formatMessageTime(msg.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Scroll to bottom button - absolute, outside scroll container */}
          {showScrollButton && !isChatbot && (
            <button
              onClick={scrollToBottom}
              className="absolute left-1/2 -translate-x-1/2 bottom-20 bg-gray-800 dark:bg-neutral-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors z-50 border border-gray-600 dark:border-gray-500"
              title="Cuộn xuống"
            >
              <ArrowDown size={16} />
            </button>
          )}

          {/* Ô nhập */}
          {!minimized && !isChatbot && (
            <div className="flex items-center gap-2 px-4 py-2 border-t border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950 rounded-b-xl relative">
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
                className={`p-2 rounded-full transition-colors touch-target ${showEmotePicker
                  ? 'text-black dark:text-white bg-neutral-100 dark:bg-neutral-800'
                  : 'text-black dark:text-white hover:bg-neutral-100 dark:bg-neutral-800 active:bg-neutral-200 dark:bg-neutral-800'
                  }`}
                title="Chọn emote"
              >
                <Smile size={20} />
              </button>

              <input
                className="flex-1 px-3 py-2 rounded-full border border-gray-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Aa"
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                disabled={uploading}
              />
              <button
                className="px-3 py-2 chat-btn-send rounded-full"
                onClick={handleSend}
                disabled={uploading}
              >
                Gửi
              </button>
            </div>
          )}
        </>
      )
      }

      {/* Image Viewer */}
      {
        !isChatbot && (
          <ImageViewer
            isOpen={imageViewer.isOpen}
            imageUrl={imageViewer.imageUrl}
            alt={imageViewer.alt}
            onClose={() => setImageViewer({ isOpen: false, imageUrl: null, alt: "" })}
          />
        )
      }
    </div >
  );
}

// Wrapper to manage CallModal + CallIncomingModal
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

      // Ignore if the caller is myself (check both user ID and socket ID)
      if (caller === myId || callerSocketId === mySocketId) {
        return;
      }

      // Validate offer
      if (!offer || !offer.type || !offer.sdp || !conversationId) {
        return;
      }

      // Only show incoming call if the conversation belongs to this popup
      if (conversationId === props.conversation._id) {
        const incomingCallData = {
          offer,
          conversationId, // Add conversationId for tracking
          caller: callerInfo || { name: "Người dùng" },
          isVideo: isVideo || false
        };
        setIncomingCall(incomingCallData);
      }
    };

    // Use global call manager instead of direct socket
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

    // Send call rejection signal to corresponding conversation
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
