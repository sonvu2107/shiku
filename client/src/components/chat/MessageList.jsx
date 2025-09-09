import { useState, useRef, useEffect } from "react";
import { User, Users, ChevronUp } from "lucide-react";

export default function MessageList({ 
  messages, 
  currentUser, 
  loading, 
  hasMore, 
  onLoadMore, 
  conversation
}) {
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesContainerRef = useRef(null);
  const topRef = useRef(null);
  const prevMessagesLength = useRef(messages.length);
  const prevScrollHeight = useRef(0);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100);
      if (scrollTop === 0 && hasMore && !loading) {
        // Lưu scrollHeight trước khi load thêm
        prevScrollHeight.current = container.scrollHeight;
        prevMessagesLength.current = messages.length;
        onLoadMore();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, loading, onLoadMore, messages.length]);

  // Khi load thêm tin nhắn cũ, giữ nguyên vị trí scroll
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    // Nếu số lượng messages tăng lên (load thêm cũ), giữ vị trí scroll
    if (messages.length > prevMessagesLength.current) {
      const addedHeight = container.scrollHeight - prevScrollHeight.current;
      container.scrollTop = addedHeight;
    }
    prevMessagesLength.current = messages.length;
    prevScrollHeight.current = container.scrollHeight;
  }, [messages]);

  // Khi có tin nhắn mới (gửi/nhận), auto-scroll xuống cuối
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !messages.length) return;
    // Nếu tin nhắn mới nhất là của mình hoặc là tin nhắn mới, scroll xuống cuối
    container.scrollTop = container.scrollHeight;
  }, [messages[messages.length - 1]?._id]);

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
          <div className="bg-gray-100 px-3 py-1 rounded-full">
            <p className="text-xs text-gray-600 text-center">
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
                alt={message.sender.name}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-semibold">
                  {message.sender.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* Spacer for alignment */}
        {!isOwn && showAvatar && !showSenderInfo && <div className="w-10"></div>}

        {/* Message content container */}
        <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${isOwn ? 'ml-12' : 'mr-12'}`}>
          {/* Sender name for group chats */}
          {showSenderInfo && !isOwn && conversation.conversationType === 'group' && (
            <div className="text-xs text-gray-500 mb-1 ml-2">
              {getMessageSenderName(message)}
            </div>
          )}
          
          {/* Message bubble */}
          <div
            className={`relative px-4 py-2 rounded-3xl shadow-sm ${
              isOwn
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white ml-auto'
                : 'bg-gray-100 text-gray-800 mr-auto'
            }`}
            style={{
              borderTopRightRadius: isOwn && isLastInGroup ? '8px' : '24px',
              borderTopLeftRadius: !isOwn && isLastInGroup ? '8px' : '24px',
            }}
          >
            {/* Message content */}
            {message.messageType === 'image' ? (
              <div>
                <img
                  src={message.imageUrl}
                  alt="Hình ảnh"
                  className="max-w-full h-auto rounded-xl mb-2"
                  style={{ maxHeight: '300px' }}
                />
                {message.content && message.content !== 'Đã gửi một hình ảnh' && (
                  <p className="text-sm leading-relaxed">{message.content}</p>
                )}
              </div>
            ) : message.messageType === 'emote' ? (
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{message.emote}</span>
                <span className="text-sm leading-relaxed">{message.content}</span>
              </div>
            ) : message.messageType === 'system' ? (
              <p className="text-xs leading-relaxed text-gray-500 italic text-center">
                {message.content}
              </p>
            ) : (
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                {message.content}
              </p>
            )}
          </div>
          
          {/* Message time - shown on hover or for latest message */}
          <div className={`text-xs text-gray-400 mt-1 px-2 ${
            isOwn ? 'text-right' : 'text-left'
          }`}>
            {formatMessageTime(message.createdAt)}
          </div>
        </div>

        {/* Avatar for sent messages (optional, Facebook style) */}
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
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        )}
        
        <div ref={topRef} />
        
        {/* Messages */}
        {messages.length === 0 && !loading ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              Bắt đầu cuộc trò chuyện
            </h3>
            <p className="text-gray-500">
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
          className="absolute bottom-4 right-4 bg-blue-500 text-white p-2 rounded-full shadow-lg hover:bg-blue-600 transition-colors"
        >
          <ChevronUp size={20} className="transform rotate-180" />
        </button>
      )}
    </div>
  );
}
