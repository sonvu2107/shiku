import { useState, useEffect, useRef } from "react";
import { chatAPI } from "../../chatAPI";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import ChatHeader from "./ChatHeader";

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
  onAddMembers
}) {
  const messagesEndRef = useRef(null);

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
    <div className="flex flex-col h-full">
      {conversation ? (
        <>
          {/* Header */}
          <ChatHeader 
            conversation={conversation} 
            currentUser={currentUser}
            onUpdateConversation={onUpdateConversation}
            onLeaveConversation={onLeaveConversation}
            onDeleteConversation={onDeleteConversation}
            onAddMembers={onAddMembers}
          />

          {/* Messages scrollable */}
          <div className="flex-1 overflow-y-auto">
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
          <div className="flex-shrink-0">
            <MessageInput onSendMessage={handleSendMessage} />
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              Chọn một cuộc trò chuyện
            </h3>
            <p className="text-gray-500">
              Chọn từ danh sách bên trái hoặc tạo cuộc trò chuyện mới
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
