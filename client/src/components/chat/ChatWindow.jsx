import { useState, useEffect, useRef } from "react";
import { chatAPI } from "../../chatAPI";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import ChatHeader from "./ChatHeader";

/**
 * ChatWindow - Component cửa sổ chat chính
 * Bao gồm header, danh sách tin nhắn và input để gửi tin nhắn
 * @param {Object} conversation - Cuộc trò chuyện hiện tại
 * @param {Object} currentUserd - User hiện tại
 * @param {Array} messages - Danh sách tin nhắn
 * @param {boolean} isLoadingMessages - Loading state cho tin nhắn
 * @param {boolean} hasMoreMessages - Có thêm tin nhắn để load
 * @param {Function} onSendMessage - Callback gửi tin nhắn
 * @param {Function} onLoadMoreMessages - Callback load thêm tin nhắn
 * @param {Function} onUpdateConversation - Callback cập nhật cuộc trò chuyện
 * @param {Function} onLeaveConversation - Callback rời cuộc trò chuyện
 * @param {Function} onDeleteConversation - Callback xóa cuộc trò chuyện
 * @param {Function} onAddMembers - Callback thêm thành viên
 * @param {Function} onVideoCall - Callback gọi video
 * @param {Function} onVoiceCall - Callback gọi thoại
 */
export default function ChatWindow({ 
  conversation, 
  currentUser, 
  messages,
  isLoadingMessages,
  hasMoreMessages,
  onSendMessage,
  onLoadMoreMessages,
  onUpdateConversation,
  onLeaveConversation, 
  onDeleteConversation,
  onAddMembers,
  onVideoCall,
  onVoiceCall
}) {
  // ==================== REFS ====================
  
  const messagesEndRef = useRef(null); // Ref để scroll xuống cuối tin nhắn

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (content, messageType = 'text', emote = null, image = null) => {
    if (onSendMessage) {
      await onSendMessage(content, messageType, emote, image);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {conversation ? (
        <>
          {/* Header */}
          <div className="flex-shrink-0">
            <ChatHeader 
              conversation={conversation} 
              currentUser={currentUser}
              onUpdateConversation={onUpdateConversation}
              onLeaveConversation={onLeaveConversation}
              onDeleteConversation={onDeleteConversation}
              onAddMembers={onAddMembers}
              onVideoCall={onVideoCall}
              onVoiceCall={onVoiceCall}
            />
          </div>

          {/* Messages scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <MessageList
              messages={messages}
              currentUser={currentUser}
              loading={isLoadingMessages}
              hasMore={hasMoreMessages}
              onLoadMore={onLoadMoreMessages}
              conversation={conversation}
            />
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 border-t border-gray-200 bg-white">
            <MessageInput onSendMessage={handleSendMessage} />
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50 p-4">
          <div className="text-center">
            <div className="text-4xl sm:text-6xl mb-4">💬</div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-600 mb-2">
              Chọn một cuộc trò chuyện
            </h3>
            <p className="text-sm sm:text-base text-gray-500">
              Chọn từ danh sách bên trên hoặc tạo cuộc trò chuyện mới
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
