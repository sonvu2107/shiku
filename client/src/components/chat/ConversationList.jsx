import { Users, User } from "lucide-react";

/**
 * ConversationList - Component danh sách cuộc trò chuyện
 * Hiển thị danh sách cuộc trò chuyện với avatar, tên, tin nhắn cuối và thời gian
 * @param {Array} conversations - Danh sách cuộc trò chuyện
 * @param {Object} selectedConversation - Cuộc trò chuyện đang chọn
 * @param {Function} onSelectConversation - Callback khi chọn cuộc trò chuyện
 * @param {boolean} loading - Loading state
 * @param {Object} currentUser - User hiện tại
 */
export default function ConversationList({ 
  conversations, 
  selectedConversation, 
  onSelectConversation, 
  loading, 
  currentUser 
}) {
  const getConversationName = (conversation) => {
    if (conversation.conversationType === 'group') {
      return conversation.groupName || 'Nhóm không tên';
    } else {
      const otherParticipant = conversation.otherParticipants?.[0];
      return otherParticipant?.nickname || otherParticipant?.user?.name || 'Người dùng';
    }
  };

  const getConversationAvatar = (conversation) => {
    if (conversation.conversationType === 'group') {
      return conversation.groupAvatar || null;
    } else {
      const otherParticipant = conversation.otherParticipants?.[0];
      return otherParticipant?.user?.avatarUrl || null;
    }
  };

  const getLastMessagePreview = (message) => {
    if (!message) return "Chưa có tin nhắn";
    
    switch (message.messageType) {
      case 'image':
        return "Đã gửi một hình ảnh";
      case 'emote':
        return message.emote;
      default:
        return message.content;
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('vi-VN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString('vi-VN', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('vi-VN', { 
        day: '2-digit', 
        month: '2-digit' 
      });
    }
  };

  const getOtherUserOnlineStatus = (conversation) => {
    if (conversation.conversationType === 'group') return false;

    const currentUserId = currentUser?.user?._id || currentUser?.user?.id || currentUser?._id || currentUser?.id;
    const otherParticipant = conversation.participants?.find(p => {
      const participantId = p.user?._id || p.user?.id || p._id || p.id;
      return participantId !== currentUserId;
    });

    const user = otherParticipant?.user || otherParticipant;
    return user?.isOnline || false;
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-4xl mb-4">💬</div>
        <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">Chưa có cuộc trò chuyện nào</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Bắt đầu cuộc trò chuyện đầu tiên của bạn!</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 p-2">
      {conversations.map((conversation) => {
        const isSelected = selectedConversation?._id === conversation._id;
        const avatar = getConversationAvatar(conversation);
        const name = getConversationName(conversation);
        
        return (
          <div
            key={conversation._id}
            onClick={() => onSelectConversation(conversation)}
            className={`p-3 rounded-lg cursor-pointer transition-colors ${
              isSelected 
                ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' 
                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center space-x-3">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {avatar ? (
                  <img
                    src={avatar}
                    alt={name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                    {conversation.conversationType === 'group' ? (
                      <Users size={20} className="text-gray-500 dark:text-gray-400" />
                    ) : (
                      <User size={20} className="text-gray-500 dark:text-gray-400" />
                    )}
                  </div>
                )}
                
                {/* Online status indicator for private conversations */}
                {conversation.conversationType === 'private' && getOtherUserOnlineStatus(conversation) && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                )}
                
                {/* Unread badge */}
                {conversation.unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className={`font-medium truncate ${
                    isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-200'
                  }`}>
                    {name}
                  </h3>
                  {conversation.lastMessage && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                      {formatTime(conversation.lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <p className={`text-sm truncate ${
                    conversation.unreadCount > 0 
                      ? 'text-gray-800 dark:text-gray-200 font-medium' 
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {getLastMessagePreview(conversation.lastMessage)}
                  </p>
                  
                  {conversation.conversationType === 'group' && (
                    <div className="flex-shrink-0 ml-2">
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {conversation.participants.filter(p => !p.leftAt).length} người
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
