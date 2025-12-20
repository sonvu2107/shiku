import { useState, useEffect, useRef } from "react";
import { chatAPI } from "../../chatAPI";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import ChatHeader from "./ChatHeader";
import ComponentErrorBoundary from "../ComponentErrorBoundary";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * ChatWindow - Component for main chat window
 * Includes header, message list, and input for sending messages
 * @param {Object} conversation - Current conversation
 * @param {Object} currentUser - Current user
 * @param {Array} messages - List of messages
 * @param {boolean} isLoadingMessages - Loading state for messages
 * @param {boolean} hasMoreMessages - Whether there are more messages to load
 * @param {Function} onSendMessage - Callback to send a message
 * @param {Function} onLoadMoreMessages - Callback to load more messages
 * @param {Function} onUpdateConversation - Callback to update conversation
 * @param {Function} onLeaveConversation - Callback to leave conversation
 * @param {Function} onDeleteConversation - Callback to delete conversation
 * @param {Function} onAddMembers - Callback to add members
 * @param {Function} onVideoCall - Callback to start video call
 * @param {Function} onVoiceCall - Callback to start voice call
 * @param {Function} onBack - Callback to go back to the list (mobile)
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
  onVoiceCall,
  onBack
}) {
  // ==================== REFS ====================
  const messagesEndRef = useRef(null); // Ref to scroll to the bottom of the messages
  const scrollContainerRef = useRef(null); // Ref for scroll container
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true); // Control scroll
  const [showScrollButton, setShowScrollButton] = useState(false); // Show scroll to bottom button

  // Scroll to bottom when conversation changes (first load)
  useEffect(() => {
    if (conversation) {
      setShouldScrollToBottom(true);
    }
  }, [conversation?._id]);

  // Scroll to bottom when messages change and shouldScrollToBottom is true
  useEffect(() => {
    if (shouldScrollToBottom) {
      scrollToBottom();
    }
  }, [messages, shouldScrollToBottom]);

  // Handle scroll to show/hide scroll button
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Show button when user scrolls up more than 150px from bottom
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 150);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollButton(false);
  };

  const handleSendMessage = async (content, messageType = 'text', emote = null, image = null) => {
    setShouldScrollToBottom(true); // Scroll to bottom when sending a message
    if (onSendMessage) {
      await onSendMessage(content, messageType, emote, image);
    }
  };

  return (
    <ComponentErrorBoundary>
      <div className="relative flex flex-col h-full min-h-0">
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
                onBack={onBack}
              />
            </div>

            {/* Messages scrollable */}
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto min-h-0 bg-white dark:bg-neutral-950"
              style={{ scrollbarGutter: 'stable' }}
            >
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

            {/* Scroll to bottom button - absolute, outside scroll container */}
            <AnimatePresence>
              {showScrollButton && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 20 }}
                  className="absolute inset-x-0 bottom-20 flex justify-center z-50 pointer-events-none"
                >
                  <button
                    onClick={scrollToBottom}
                    className="pointer-events-auto mr-2.5 bg-gray-800 dark:bg-neutral-800 text-white p-3 rounded-full shadow-xl hover:bg-gray-700 dark:hover:bg-gray-600 hover:scale-110 active:scale-90 transition-all border border-gray-600 dark:border-gray-500"
                    title="Cuộn xuống tin nhắn mới nhất"
                  >
                    <ChevronDown size={22} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input */}
            <div className="flex-shrink-0 border-t border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <MessageInput onSendMessage={handleSendMessage} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-neutral-950 p-4">
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
    </ComponentErrorBoundary>
  );
}
