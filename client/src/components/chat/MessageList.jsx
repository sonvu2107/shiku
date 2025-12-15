import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Users, ChevronUp, ThumbsUp, Heart, Laugh, Angry, Frown, Smile, MoreHorizontal, Trash2, X, Check, CheckCheck } from "lucide-react";
import { api } from "../../api";
import ImageViewer from "../ImageViewer";
import { useToast } from "../../contexts/ToastContext";
import { parseLinks } from "../../utils/linkParser.jsx";
import Avatar from "../Avatar";

/**
 * MessageList - Component for display message list in chat
 * Supports infinite scroll, auto-scroll, and grouped message display
 * @param {Object} props - Component props
 * @param {Array} props.messages - List of messages
 * @param {Object} props.currentUser - Current user information
 * @param {boolean} props.loading - Loading state
 * @param {boolean} props.hasMore - Whether there are more messages to load
 * @param {Function} props.onLoadMore - Callback to load more messages
 * @param {Object} props.conversation - Conversation data
 * @returns {JSX.Element} Component message list
 */
export default function MessageList({
  messages,
  currentUser,
  loading,
  hasMore,
  onLoadMore,
  conversation,
  onEditMessage,
  onDeleteMessage
}) {
  const { showError } = useToast();
  // ==================== STATE MANAGEMENT ====================

  const [showScrollButton, setShowScrollButton] = useState(false); // Show scroll to bottom button
  const [imageViewer, setImageViewer] = useState({ isOpen: false, imageUrl: null, alt: "" }); // Image viewer state
  const [showOptionsMenu, setShowOptionsMenu] = useState(null); // ID of the message showing options menu
  const [selectedMessageId, setSelectedMessageId] = useState(null); // ID of message with open reaction menu (click-based)
  const [deletedMessageIds, setDeletedMessageIds] = useState([]); // Optimistic deleted message IDs
  const [isMobile, setIsMobile] = useState(false); // Detect mobile device

  // ==================== REFS ====================

  const messagesContainerRef = useRef(null); // Ref for messages container
  const topRef = useRef(null); // Ref for top of the container
  const prevMessagesLength = useRef(messages.length); // Previous number of messages
  const prevScrollHeight = useRef(0); // Previous scroll height
  const dropdownRefs = useRef({}); // Refs for dropdown menus by message ID
  const buttonRefs = useRef({}); // Refs for option buttons by message ID

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100);
      if (scrollTop === 0 && hasMore && !loading) {
        // Save scrollHeight before loading more
        prevScrollHeight.current = container.scrollHeight;
        prevMessagesLength.current = messages.length;
        onLoadMore();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, loading, onLoadMore, messages.length]);

  // When loading more old messages, maintain scroll position
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    // If the number of messages increases (loading more old messages), maintain scroll position
    if (messages.length > prevMessagesLength.current) {
      const addedHeight = container.scrollHeight - prevScrollHeight.current;
      container.scrollTop = addedHeight;
    }
    prevMessagesLength.current = messages.length;
    prevScrollHeight.current = container.scrollHeight;
  }, [messages]);

  // When there is a new message (sent/received), auto-scroll to bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !messages.length) return;
    // If the newest message is from the current user or is a new message, scroll to bottom
    container.scrollTop = container.scrollHeight;
  }, [messages[messages.length - 1]?._id]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Check if click is on a message bubble (has class message-bubble)
      if (e.target.closest('.message-bubble')) return;

      // Close selectedMessageId if open
      if (selectedMessageId) {
        setSelectedMessageId(null);
      }

      // Close options menu if open
      if (showOptionsMenu) {
        const menu = dropdownRefs.current[showOptionsMenu];
        const btn = buttonRefs.current[showOptionsMenu];
        if (menu && menu.contains(e.target)) return;
        if (btn && btn.contains(e.target)) return;
        setShowOptionsMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showOptionsMenu, selectedMessageId]);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  const getMessageSenderName = (message) => {
    // Handle nested currentUser structure
    const currentUserId = currentUser?.user?._id || currentUser?.user?.id || currentUser?._id || currentUser?.id;
    if (message.sender._id === currentUserId) return 'Bạn';

    // Check for nickname in conversation
    const participant = conversation.participants.find(p => p.user._id === message.sender._id);
    return participant?.nickname || message.sender.name;
  };

  const reactionConfig = {
    like: { Icon: ThumbsUp, color: 'text-blue-500', bg: 'bg-blue-50', emoji: '👍' },
    love: { Icon: Heart, color: 'text-red-500', bg: 'bg-red-50', emoji: '❤️' },
    laugh: { Icon: Laugh, color: 'text-yellow-500', bg: 'bg-yellow-50', emoji: '😆' },
    angry: { Icon: Angry, color: 'text-orange-500', bg: 'bg-orange-50', emoji: '😡' },
    sad: { Icon: Frown, color: 'text-gray-500', bg: 'bg-gray-50', emoji: '😢' },
  };

  const toggleReaction = async (messageId, type) => {
    try {
      const convId = conversation._id;
      const res = await api(`/api/messages/conversations/${convId}/messages/${messageId}/react`, {
        method: 'POST',
        body: { type }
      });
      // Update reactions locally
      const reactions = res.reactions || [];
      const idx = messages.findIndex(m => m._id === messageId);
      if (idx !== -1) {
        messages[idx].reactions = reactions;
      }
    } catch (_) { }
  };



  const handleDeleteMessage = async (messageId) => {
    if (!confirm('Bạn có chắc muốn thu hồi tin nhắn này?')) return;

    // Optimistic update
    setDeletedMessageIds(prev => [...prev, messageId]);
    setShowOptionsMenu(null);

    try {
      const convId = conversation._id;
      await api(`/api/messages/conversations/${convId}/messages/${messageId}`, {
        method: 'DELETE'
      });

      // Update message locally (for consistency after refresh)
      const idx = messages.findIndex(m => m._id === messageId);
      if (idx !== -1) {
        messages[idx].isDeleted = true;
        messages[idx].content = 'Tin nhắn đã được thu hồi';
      }

      if (onDeleteMessage) {
        onDeleteMessage(messageId);
      }
    } catch (error) {
      showError('Không thể thu hồi tin nhắn');
      // Revert optimistic update on error
      setDeletedMessageIds(prev => prev.filter(id => id !== messageId));
    }
  };

  const formatMessageTime = (dateString) => {
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
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  // Calculate dropdown position to prevent overflow
  const calculateDropdownPosition = (buttonElement, dropdownElement) => {
    if (!buttonElement || !dropdownElement) return {};

    const buttonRect = buttonElement.getBoundingClientRect();
    const dropdownRect = dropdownElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 8; // Spacing between button and dropdown
    const leftOffset = -128; // -left-32 = -128px (32 * 4px)

    const styles = {};

    // Horizontal positioning: default is -left-32 (to the left of button, pushed further left)
    // Check if dropdown would overflow on the left
    const spaceOnLeft = buttonRect.left;
    const spaceOnRight = viewportWidth - buttonRect.right;
    const dropdownWidth = dropdownRect.width || 140; // Fallback to min-width
    const requiredSpace = dropdownWidth + Math.abs(leftOffset) + margin;

    if (spaceOnLeft < requiredSpace && spaceOnRight > dropdownWidth + margin) {
      // Not enough space on left, but enough on right - open to the right
      styles.left = 'auto';
      styles.right = 0;
    } else if (spaceOnLeft >= requiredSpace) {
      // Enough space on left - use default (left side with offset)
      styles.left = leftOffset;
      styles.right = 'auto';
    } else {
      // Not enough space on either side - align to viewport edge
      if (buttonRect.left < viewportWidth / 2) {
        // Button is on left side, align dropdown to left edge
        styles.left = -buttonRect.left + margin;
        styles.right = 'auto';
      } else {
        // Button is on right side, align dropdown to right edge
        styles.left = 'auto';
        styles.right = viewportWidth - buttonRect.right + margin;
      }
    }

    // Vertical positioning: default is top-full mt-1 (below button)
    // Check if dropdown would overflow on the bottom
    const spaceBelow = viewportHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    const dropdownHeight = dropdownRect.height || 80; // Approximate fallback

    if (spaceBelow < dropdownHeight + margin && spaceAbove > dropdownHeight + margin) {
      // Not enough space below, but enough above - open above button
      styles.top = 'auto';
      styles.bottom = '100%';
      styles.marginBottom = '4px';
      styles.marginTop = '0';
    } else if (spaceBelow >= dropdownHeight + margin) {
      // Enough space below - use default (below button)
      styles.top = '100%';
      styles.bottom = 'auto';
      styles.marginTop = '4px';
      styles.marginBottom = '0';
    } else {
      // Not enough space on either side - align to viewport edge
      if (buttonRect.bottom < viewportHeight / 2) {
        // Button is in upper half, align dropdown to top edge
        styles.top = '100%';
        styles.bottom = 'auto';
        styles.marginTop = '4px';
        styles.maxHeight = `${spaceBelow - margin}px`;
        styles.overflowY = 'auto';
      } else {
        // Button is in lower half, align dropdown to bottom edge
        styles.top = 'auto';
        styles.bottom = '100%';
        styles.marginBottom = '4px';
        styles.maxHeight = `${spaceAbove - margin}px`;
        styles.overflowY = 'auto';
      }
    }

    return styles;
  };

  // NOTE: Dynamic dropdown positioning disabled - now using simple CSS absolute positioning
  // This was causing conflicts with the absolute positioning approach
  // useEffect(() => {...}, [showOptionsMenu, isMobile]);

  // Calculate which message is the last one each user has read (Facebook-style)
  // Map: messageId -> array of users who have this as their last read message
  const lastReadByMap = useMemo(() => {
    if (!messages || !currentUser) return {};

    const currentUserId = currentUser?.user?._id || currentUser?.user?.id || currentUser?._id || currentUser?.id;
    const userLastReadMessage = {}; // userId -> messageId

    // Go through messages in order to find the last message each user has read
    messages.forEach((msg) => {
      if (!msg.readBy || msg.sender?._id !== currentUserId) return; // Only check our own messages

      msg.readBy.forEach((reader) => {
        const readerId = reader.user?._id || reader.user;
        if (readerId && readerId !== currentUserId) {
          // Update to this message as the user's last read
          userLastReadMessage[readerId] = {
            messageId: msg._id,
            user: reader.user
          };
        }
      });
    });

    // Invert: group by messageId
    const result = {};
    Object.values(userLastReadMessage).forEach(({ messageId, user }) => {
      if (!result[messageId]) result[messageId] = [];
      result[messageId].push(user);
    });

    return result;
  }, [messages, currentUser]);

  const renderMessage = (message, index) => {
    if (!currentUser || !message) return null;

    const isDeleted = message.isDeleted || deletedMessageIds.includes(message._id);

    // Handle system messages differently
    if (message.messageType === 'system') {
      return (
        <div key={message._id} className="flex justify-center mb-4">
          <div className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
            <p className="text-xs text-gray-600 dark:text-gray-300 text-center">
              {message.content}
            </p>
          </div>
        </div>
      );
    }

    // Regular messages must have sender
    if (!message.sender) return null;

    // Handle nested currentUser structure: {user: {_id: ...}} or direct: {_id: ...}
    const currentUserId = currentUser?.user?._id || currentUser?.user?.id || currentUser?._id || currentUser?.id;
    const isOwn = message.sender._id === currentUserId;

    const showAvatar = !isOwn && conversation.conversationType === 'group';
    const prevMessage = messages[index - 1];
    const nextMessage = messages[index + 1];

    // Check if we should show sender name and avatar
    const showSenderInfo = !isOwn && (
      !prevMessage ||
      !prevMessage.sender ||
      prevMessage.sender._id !== message.sender._id ||
      new Date(message.createdAt) - new Date(prevMessage.createdAt) > 5 * 60 * 1000 // 5 minutes
    );

    const isLastInGroup = !nextMessage ||
      !nextMessage.sender ||
      nextMessage.sender._id !== message.sender._id ||
      new Date(nextMessage.createdAt) - new Date(message.createdAt) > 5 * 60 * 1000;

    return (
      <motion.div
        key={message._id}
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        className={`flex mb-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
      >
        {/* Avatar for received messages */}
        {!isOwn && showAvatar && showSenderInfo && (
          <div className="flex-shrink-0 mr-2">
            <Avatar
              src={message.sender.avatarUrl}
              name={message.sender.nickname || message.sender.name || 'User'}
              size={32}
              className=""
            />
          </div>
        )}

        {/* Spacer for alignment */}
        {!isOwn && showAvatar && !showSenderInfo && <div className="w-10"></div>}

        {/* Message content container */}
        <div
          className={`max-w-xs lg:max-w-md xl:max-lg relative min-w-0 ${isOwn
            ? 'ml-16 md:ml-12'
            : 'mr-6 md:mr-12'
            }`}
        >
          {/* Sender name for group chats */}
          {showSenderInfo && !isOwn && conversation.conversationType === 'group' && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-2">
              {getMessageSenderName(message)}
            </div>
          )}

          {/* Message bubble with click-to-select */}
          <div className={`flex items-center gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} relative`}>
            {/* Message bubble */}
            <motion.div
              title={formatMessageTime(message.createdAt)}
              onClick={() => {
                if (!isDeleted && message.messageType !== 'system') {
                  setSelectedMessageId(selectedMessageId === message._id ? null : message._id);
                  setShowOptionsMenu(null);
                }
              }}
              className={`message-bubble relative px-4 py-2.5 rounded-2xl shadow-sm transition-all duration-200 cursor-pointer ${isOwn
                ? 'bg-blue-600 text-white border border-blue-600'
                : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700'
                } break-words overflow-wrap-anywhere ${selectedMessageId === message._id ? 'ring-2 ring-blue-300 ring-offset-1' : ''}`}
              style={{
                borderBottomRightRadius: isOwn ? '4px' : '16px',
                borderBottomLeftRadius: !isOwn ? '4px' : '16px',
              }}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.15 }}
            >
              {/* Message content */}
              {isDeleted ? (
                // Deleted message
                <p className="text-sm leading-relaxed italic text-gray-600 dark:text-gray-300">
                  {message.isDeleted ? message.content : 'Tin nhắn đã được thu hồi'}
                </p>
              ) : message.messageType === 'image' ? (
                <div>
                  <img
                    src={message.imageUrl}
                    alt="Hình ảnh"
                    className="max-w-full h-auto rounded-xl mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                    style={{ maxHeight: '300px' }}
                    onClick={() => setImageViewer({ isOpen: true, imageUrl: message.imageUrl, alt: "Hình ảnh" })}
                  />
                  {message.content && message.content !== 'Đã gửi một hình ảnh' && (
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  )}
                </div>
              ) : message.messageType === 'emote' ? (
                <div className="flex items-center justify-center">
                  <span className="text-2xl">{message.emote}</span>
                </div>
              ) : message.messageType === 'system' ? (
                <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400 italic text-center break-words overflow-wrap-anywhere">
                  {message.content}
                </p>
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words overflow-wrap-anywhere">
                  {parseLinks(message.content, {
                    linkClassName: isOwn
                      ? "text-blue-200 hover:text-blue-100 underline break-all"
                      : "text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline break-all"
                  })}
                </p>
              )}
            </motion.div>

            {/* Click-to-show reaction popup */}
            {selectedMessageId === message._id && !isDeleted && message.messageType !== 'system' && (
              <div
                className={`absolute bottom-full mb-2 z-20 bg-white dark:bg-gray-800 shadow-xl rounded-full p-1 flex items-center gap-1 border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-200 max-w-[calc(100vw-2rem)] ${isOwn ? 'right-0 origin-bottom-right' : 'left-0 origin-bottom-left'}`}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
              >
                {/* Emoji reactions */}
                <div className="flex gap-0.5">
                  {Object.entries(reactionConfig).map(([type, cfg]) => {
                    const hasReacted = (message.reactions || []).some(
                      r => r.type === type && (r.user === currentUserId || r.user?._id === currentUserId)
                    );
                    return (
                      <button
                        key={type}
                        onClick={() => {
                          toggleReaction(message._id, type);
                          setSelectedMessageId(null);
                        }}
                        className={`w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-sm md:text-lg rounded-full transition transform active:scale-110 hover:scale-110 ${hasReacted ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        title={type}
                      >
                        {cfg.emoji}
                      </button>
                    );
                  })}
                </div>

                {/* Delete for own messages */}
                {isOwn && (
                  <button
                    onClick={() => {
                      handleDeleteMessage(message._id);
                      setSelectedMessageId(null);
                    }}
                    className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition"
                    title="Thu hồi"
                  >
                    <Trash2 size={14} className="text-red-500" />
                  </button>
                )}

                {/* Close button */}
                <button
                  onClick={() => setSelectedMessageId(null)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
                  title="Đóng"
                >
                  <X size={12} className="text-gray-400" />
                </button>
              </div>
            )}

            {/* Single reaction emoji at corner (like reference design) */}
            {!isDeleted && !!message.reactions?.length && (() => {
              const lastReaction = message.reactions[message.reactions.length - 1];
              const reactionType = lastReaction?.type;
              const cfg = reactionConfig[reactionType];
              if (!cfg) return null;

              return (
                <div className={`absolute -bottom-3 z-10 ${isOwn ? 'right-2' : 'left-2'}`}>
                  <span className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs px-1.5 py-0.5 rounded-full shadow-sm text-lg leading-none block">
                    {cfg.emoji}
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Edited indicator */}
          {message.isEdited && !message.isDeleted && (
            <p className={`text-xs text-gray-400 dark:text-gray-500 mt-1 italic px-2 ${isOwn ? 'text-right' : 'text-left'
              }`}>
              Đã chỉnh sửa
            </p>
          )}

          {/* Message status indicator - only for own messages */}
          {isOwn && !message.isDeleted && (() => {
            // Get users whose last-read message is THIS message (Facebook-style)
            const lastReadUsers = lastReadByMap[message._id] || [];
            const hasAnyReader = (message.readBy || []).some(
              r => r.user !== currentUserId && r.user?._id !== currentUserId
            );
            const hasReaction = message.reactions?.length > 0;

            return (
              <div className={`flex justify-end px-2 ${hasReaction ? 'mt-4' : 'mt-1'}`}>
                {lastReadUsers.length > 0 ? (
                  // Show avatars of users whose last-read is this message
                  <div className="flex -space-x-1">
                    {lastReadUsers.slice(0, 3).map((readerUser, idx) => {
                      const avatarUrl = readerUser?.avatarUrl;
                      const name = readerUser?.name || 'User';

                      return (
                        <Avatar
                          key={readerUser?._id || idx}
                          src={avatarUrl}
                          name={name}
                          size={16}
                          className="border border-white dark:border-gray-800"
                        />
                      );
                    })}
                    {lastReadUsers.length > 3 && (
                      <div
                        className="w-4 h-4 rounded-full border border-white dark:border-gray-800 bg-gray-300 dark:bg-gray-600 flex items-center justify-center"
                        title={`+${lastReadUsers.length - 3} người khác đã xem`}
                      >
                        <span className="text-gray-600 dark:text-gray-300 text-[8px] font-bold">
                          +{lastReadUsers.length - 3}
                        </span>
                      </div>
                    )}
                  </div>
                ) : hasAnyReader ? (
                  // This message was read but user has read newer messages - no avatar, just checkmark
                  null
                ) : (
                  // Not read yet - gray checkmark
                  <CheckCheck size={14} className="text-gray-400" title="Đã gửi" />
                )}
              </div>
            );
          })()}
        </div>

        {/* Avatar for sent messages */}
        {isOwn && showSenderInfo && (
          <div className="flex-shrink-0 ml-2">
            <Avatar
              src={currentUser.avatarUrl}
              name={currentUser.name || 'Bạn'}
              size={32}
              className=""
            />
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="relative flex-1 overflow-hidden">
      {/* Messages container */}
      <div
        ref={messagesContainerRef}
      >
        {/* Load more indicator */}
        {loading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 dark:border-blue-400 mx-auto"></div>
          </div>
        )}

        <div ref={topRef} />

        {/* Profile Header for private conversations */}
        {conversation?.conversationType === 'private' && (() => {
          // Get the other participant in private chat
          const currentUserId = currentUser?.user?._id || currentUser?.user?.id || currentUser?._id || currentUser?.id;
          const otherParticipant = conversation.participants?.find(
            p => (p.user?._id || p.user?.id) !== currentUserId
          );
          const otherUser = otherParticipant?.user;

          if (!otherUser) return null;

          return (
            <div className="flex flex-col items-center py-8 mb-4">
              {/* Avatar */}
              <Avatar
                src={otherUser.avatarUrl}
                name={otherUser.name || 'User'}
                size={80}
                className="mb-3"
              />

              {/* Name */}
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {otherParticipant?.nickname || otherUser.name || 'Không tên'}
              </h3>

              {/* Username */}
              <p className="text-sm text-gray-500 dark:text-gray-400">
                @{otherUser.username || otherUser.name?.toLowerCase().replace(/\s+/g, '')}
              </p>

              {/* Join date */}
              {otherUser.createdAt && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Đã tham gia vào tháng {new Date(otherUser.createdAt).getMonth() + 1} năm {new Date(otherUser.createdAt).getFullYear()}
                </p>
              )}

              {/* View Profile button */}
              <a
                href={`/profile/${otherUser.username || otherUser._id}`}
                className="mt-4 px-6 py-2 border border-gray-600 dark:border-gray-400 text-gray-800 dark:text-white rounded-full text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Xem trang cá nhân
              </a>
            </div>
          );
        })()}

        {/* Messages */}
        {messages.length === 0 && !loading ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">
              Bắt đầu cuộc trò chuyện
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Gửi tin nhắn đầu tiên để bắt đầu trò chuyện!
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages
              .filter(message => message && (message.sender || message.messageType === 'system'))
              .map((message, index) => renderMessage(message, index))
            }
          </div>
        )}
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={scrollToBottom}
            className="absolute bottom-4 right-4 bg-blue-500 dark:bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors z-10"
          >
            <ChevronUp size={20} className="transform rotate-180" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Image Viewer */}
      <ImageViewer
        isOpen={imageViewer.isOpen}
        imageUrl={imageViewer.imageUrl}
        alt={imageViewer.alt}
        onClose={() => setImageViewer({ isOpen: false, imageUrl: null, alt: "" })}
      />
    </div>
  );
}
