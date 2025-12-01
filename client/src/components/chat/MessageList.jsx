import { useState, useRef, useEffect } from "react";
import { User, Users, ChevronUp, ThumbsUp, Heart, Laugh, Angry, Frown, Smile, MoreHorizontal, Edit2, Trash2, X } from "lucide-react";
import { api } from "../../api";
import ImageViewer from "../ImageViewer";

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
  // ==================== STATE MANAGEMENT ====================
  
  const [showScrollButton, setShowScrollButton] = useState(false); // Show scroll to bottom button
  const [imageViewer, setImageViewer] = useState({ isOpen: false, imageUrl: null, alt: "" }); // Image viewer state
  const [editingMessageId, setEditingMessageId] = useState(null); // ID of the message being edited
  const [editContent, setEditContent] = useState(""); // Edit content
  const [showOptionsMenu, setShowOptionsMenu] = useState(null); // ID of the message showing options menu
  const [hoveredMessageId, setHoveredMessageId] = useState(null); // ID of the message being hovered
  
  // ==================== REFS ====================
  
  const messagesContainerRef = useRef(null); // Ref for messages container
  const topRef = useRef(null); // Ref for top of the container
  const prevMessagesLength = useRef(messages.length); // Previous number of messages
  const prevScrollHeight = useRef(0); // Previous scroll height

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

  // Close options menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showOptionsMenu && !e.target.closest('.message-options-menu')) {
        setShowOptionsMenu(null);
        setHoveredMessageId(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showOptionsMenu]);

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
    like: { Icon: ThumbsUp, color: 'text-blue-500', bg: 'bg-blue-50' },
    love: { Icon: Heart, color: 'text-red-500', bg: 'bg-red-50' },
    laugh: { Icon: Laugh, color: 'text-yellow-500', bg: 'bg-yellow-50' },
    angry: { Icon: Angry, color: 'text-orange-500', bg: 'bg-orange-50' },
    sad: { Icon: Frown, color: 'text-gray-500', bg: 'bg-gray-50' },
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
    } catch (_) {}
  };

  const handleEditMessage = (message) => {
    setEditingMessageId(message._id);
    setEditContent(message.content);
    setShowOptionsMenu(null);
  };

  const handleSaveEdit = async (messageId) => {
    if (!editContent.trim()) return;
    
    try {
      const convId = conversation._id;
      await api(`/api/messages/conversations/${convId}/messages/${messageId}`, {
        method: 'PUT',
        body: { content: editContent }
      });
      
      // Update message locally
      const idx = messages.findIndex(m => m._id === messageId);
      if (idx !== -1) {
        messages[idx].content = editContent;
        messages[idx].isEdited = true;
      }
      
      setEditingMessageId(null);
      setEditContent("");
      
      if (onEditMessage) {
        onEditMessage(messageId, editContent);
      }
    } catch (error) {
      alert('Không thể sửa tin nhắn');
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent("");
  };

  const handleDeleteMessage = async (messageId) => {
    if (!confirm('Bạn có chắc muốn thu hồi tin nhắn này?')) return;
    
    try {
      const convId = conversation._id;
      await api(`/api/messages/conversations/${convId}/messages/${messageId}`, {
        method: 'DELETE'
      });
      
      // Update message locally
      const idx = messages.findIndex(m => m._id === messageId);
      if (idx !== -1) {
        messages[idx].isDeleted = true;
        messages[idx].content = 'Tin nhắn đã được thu hồi';
      }
      
      setShowOptionsMenu(null);
      
      if (onDeleteMessage) {
        onDeleteMessage(messageId);
      }
    } catch (error) {
      alert('Không thể thu hồi tin nhắn');
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

  const renderMessage = (message, index) => {
    if (!currentUser || !message) return null;
    
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
      <div key={message._id} className={`flex mb-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
        {/* Avatar for received messages */}
        {!isOwn && showAvatar && showSenderInfo && (
          <div className="flex-shrink-0 mr-2">
            {message.sender.avatarUrl ? (
              <img
                src={message.sender.avatarUrl}
                alt={message.sender.nickname || message.sender.name}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-semibold">
                  {(message.sender.nickname || message.sender.name || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* Spacer for alignment */}
        {!isOwn && showAvatar && !showSenderInfo && <div className="w-10"></div>}

        {/* Message content container */}
        <div 
          className={`max-w-xs lg:max-w-md xl:max-lg relative ${isOwn ? 'ml-12' : 'mr-12'} min-w-0`}
          onMouseEnter={() => setHoveredMessageId(message._id)}
          onMouseLeave={() => {
            // Hide if menu is not open
            if (showOptionsMenu !== message._id) {
              setHoveredMessageId(null);
            }
          }}
        >
          {/* Sender name for group chats */}
          {showSenderInfo && !isOwn && conversation.conversationType === 'group' && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-2">
              {getMessageSenderName(message)}
            </div>
          )}
          
          {/* Message options menu - only show when hovered and it's own message */}
          {isOwn && !message.isDeleted && message.messageType !== 'system' && (hoveredMessageId === message._id || showOptionsMenu === message._id) && (
            <div className="absolute top-1 -left-8 z-10 message-options-menu">
              <div className="relative">
                <button
                  onClick={() => setShowOptionsMenu(showOptionsMenu === message._id ? null : message._id)}
                  onMouseEnter={() => setHoveredMessageId(message._id)}
                  className="p-1.5 rounded-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 shadow-sm"
                  title="Tùy chọn"
                >
                  <MoreHorizontal size={16} className="text-gray-600 dark:text-gray-300" />
                </button>
                
                {/* Dropdown menu */}
                {showOptionsMenu === message._id && (
                  <div 
                    className="absolute left-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-1 min-w-[140px] z-50 message-options-menu"
                    onMouseEnter={() => setHoveredMessageId(message._id)}
                  >
                    {message.messageType !== 'image' && (
                      <button
                        onClick={() => handleEditMessage(message)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-200"
                      >
                        <Edit2 size={14} />
                        Sửa tin nhắn
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteMessage(message._id)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600 dark:text-red-400"
                    >
                      <Trash2 size={14} />
                      Thu hồi
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Message bubble */}
          <div
            className={`relative px-4 py-2 rounded-3xl shadow-sm ${
              isOwn
                ? 'bg-blue-500 dark:bg-blue-600 text-white ml-auto'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 mr-auto'
            } break-words overflow-wrap-anywhere`}
            style={{
              borderTopRightRadius: isOwn && isLastInGroup ? '8px' : '24px',
              borderTopLeftRadius: !isOwn && isLastInGroup ? '8px' : '24px',
            }}
          >
            {/* Message content */}
            {editingMessageId === message._id ? (
              // Edit mode
              <div className="bg-white dark:bg-gray-800 rounded-lg p-2 min-w-[250px]">
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center justify-between">
                  <span>Chỉnh sửa tin nhắn</span>
                  <button
                    onClick={handleCancelEdit}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X size={14} />
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
                        handleSaveEdit(message._id);
                      } else if (e.key === 'Escape') {
                        handleCancelEdit();
                      }
                    }}
                  />
                  <button
                    onClick={handleCancelEdit}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                    title="Hủy"
                  >
                    <Smile size={18} />
                  </button>
                  <button
                    onClick={() => handleSaveEdit(message._id)}
                    disabled={!editContent.trim()}
                    className="text-blue-500 hover:text-blue-600 disabled:text-gray-400 disabled:cursor-not-allowed p-1"
                    title="Gửi"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : message.isDeleted ? (
              // Deleted message
              <p className="text-sm leading-relaxed italic text-gray-600 dark:text-gray-300">
                {message.content}
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
                {message.content}
              </p>
            )}
          </div>
          
          {/* Edited indicator */}
          {message.isEdited && !message.isDeleted && editingMessageId !== message._id && (
            <p className={`text-xs text-gray-400 dark:text-gray-500 mt-1 italic px-2 ${
              isOwn ? 'text-right' : 'text-left'
            }`}>
              Đã chỉnh sửa
            </p>
          )}
          
          {/* Reactions */}
          {!message.isDeleted && !editingMessageId && (
            <div className="mt-1 px-2 flex items-center gap-1">
              {/* Reaction picker */}
              <div className="relative group">
                <button className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600" title="Thả cảm xúc" tabIndex={0}>
                  <Smile size={16} />
                </button>
                <div className={`absolute hidden group-hover:flex group-focus-within:flex top-0 -translate-y-full ${isOwn ? 'right-0' : 'left-0'} bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full shadow px-2 py-1 gap-1 z-50` }>
                  {Object.entries(reactionConfig).map(([type, cfg]) => (
                    <button key={type} onClick={() => toggleReaction(message._id, type)} className={`p-1 ${cfg.color}`} title={type}>
                      <cfg.Icon size={16} />
                    </button>
                  ))}
                </div>
              </div>
              {/* Reaction counters */}
              {!!message.reactions?.length && (
                <div className="flex flex-wrap gap-1">
                  {Object.entries(reactionConfig).map(([type, cfg]) => {
                    const count = (message.reactions || []).filter(r => r.type === type).length;
                    if (!count) return null;
                    const ActiveIcon = cfg.Icon;
                    return (
                      <span key={type} className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                        <ActiveIcon size={12} /> {count}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Message time - shown on hover or for latest message */}
          <div className={`text-xs text-gray-400 dark:text-gray-500 mt-1 px-2 ${
            isOwn ? 'text-right' : 'text-left'
          }`}>
            {formatMessageTime(message.createdAt)}
          </div>
        </div>

        {/* Avatar for sent messages */}
        {isOwn && showSenderInfo && (
          <div className="flex-shrink-0 ml-2">
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt="Bạn"
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-semibold">
                  {currentUser.name?.charAt(0).toUpperCase() || 'B'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
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
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 bg-blue-500 dark:bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
        >
          <ChevronUp size={20} className="transform rotate-180" />
        </button>
      )}

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
