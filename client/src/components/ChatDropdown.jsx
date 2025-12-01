import { useEffect, useRef, useState } from "react";
import { MessageCircle, Bot } from "lucide-react";
import { api } from "../api";
import { getUserAvatarUrl, AVATAR_SIZES } from "../utils/avatarUtils";
import { chatbotAPI } from "../services/chatbotAPI";
import { useChat } from "../contexts/ChatContext";

/**
 * ChatDropdown - Dropdown shows list of conversations
 * Displays list of conversations with avatar, name, and last message
 * @param {Object} props - Component props
 * @param {Function} props.onOpenChat - Callback when clicking on a conversation
 * @returns {JSX.Element} Chat dropdown component
 */
export default function ChatDropdown({ onOpenChat }) {
  // ==================== STATE MANAGEMENT ====================
  const { unreadCount, refreshUnreadCount } = useChat();
  
  // UI states
  const [open, setOpen] = useState(false); // Dropdown open/close state
  const [loading, setLoading] = useState(false); // Loading state
  
  // Data states
  const [conversations, setConversations] = useState([]); // List of conversations
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (open) {
      loadConversations();
    }
  }, [open]);

  // Close on outside click & on Escape
  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  async function loadConversations() {
    setLoading(true);
    try {
      const res = await api("/api/messages/conversations");
      // Filter out chatbot conversations as they are displayed separately
      const filteredConversations = (res.conversations || []).filter(
        conv => conv.conversationType !== 'chatbot'
      );
      setConversations(filteredConversations);
      
      // Update unread message count
      refreshUnreadCount();
    } catch (err) {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenChatbot = async () => {
    try {
      setOpen(false);
      // Load chatbot conversation từ API
      const response = await chatbotAPI.getConversation();
      if (response.success && response.data) {
        onOpenChat?.(response.data);
      } else {
        // Fallback: use temporary conversation
        const chatbotConversation = {
          _id: "__chatbot__",
          conversationType: "chatbot",
          title: "Trợ lý AI",
          updatedAt: new Date().toISOString(),
          lastMessage: {
            content: "Hỏi tôi bất cứ điều gì để được hỗ trợ tức thì"
          }
        };
        onOpenChat?.(chatbotConversation);
      }
    } catch (error) {
      console.error('Error loading chatbot conversation:', error);
      // Fallback: Use temporary conversation
      const chatbotConversation = {
        _id: "__chatbot__",
        conversationType: "chatbot",
        title: "Trợ lý AI",
        updatedAt: new Date().toISOString(),
        lastMessage: {
          content: "Hỏi tôi bất cứ điều gì để được hỗ trợ tức thì"
        }
      };
      setOpen(false);
      onOpenChat?.(chatbotConversation);
    }
  };

  const getAvatar = (conv) => {
    const isGroup = conv.conversationType === "group";

    if (isGroup) {
      return conv.groupAvatar || getUserAvatarUrl({ name: conv.groupName || 'Group' }, AVATAR_SIZES.MEDIUM);
    }

    const otherUser = conv.otherParticipants?.[0]?.user;
    return getUserAvatarUrl(otherUser, AVATAR_SIZES.MEDIUM);
  };

  const getName = (conv) => {
    if (conv.conversationType === "group") {
      return conv.groupName || "Nhóm";
    }
    // Prioritize displaying nicknames before real names
    const otherParticipant = conv.otherParticipants?.[0];
    return otherParticipant?.nickname || otherParticipant?.user?.name || "Không tên";
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200 relative"
        onClick={() => setOpen(!open)}
        title="Tin nhắn"
      >
        <MessageCircle size={22} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 font-semibold text-lg text-gray-900 dark:text-white">
            Tin nhắn
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-gray-500 dark:text-gray-400">Đang tải...</div>
            ) : (
              <>
                <div
                  className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer border-b border-blue-100 dark:border-blue-900/30 transition-colors"
                  onClick={handleOpenChatbot}
                >
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
                    <Bot size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-blue-600 dark:text-blue-300 truncate">Trợ lý AI</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      Hỏi tôi bất cứ điều gì để được hỗ trợ tức thì
                    </div>
                  </div>
                  <span className="text-xs font-medium text-green-500">● Online</span>
                </div>

                {conversations.length === 0 ? (
                  <div className="p-4 text-gray-500 dark:text-gray-400">Không có hội thoại nào</div>
                ) : (
                  conversations
                    .filter(conv => conv.conversationType !== 'chatbot') // Ensure chatbot conversations are excluded
                    .map((conv) => {
                    const avatar = getAvatar(conv);
                    const name = getName(conv);
                    const isUnread = conv.unreadCount > 0;

                    return (
                      <div
                        key={conv._id}
                        className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 transition-colors relative ${isUnread ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                        onClick={() => {
                          setOpen(false);
                          onOpenChat(conv);
                        }}
                      >
                        <div className="relative">
                          <img
                            src={avatar}
                            alt={name}
                            className="w-12 h-12 rounded-full object-cover"
                            onError={(e) => {
                              e.target.src = getUserAvatarUrl({ name: name }, AVATAR_SIZES.MEDIUM);
                            }}
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm truncate ${isUnread ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-900 dark:text-white'}`}>
                            {name}
                          </div>
                          <div className={`text-xs truncate ${isUnread ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                            {conv.lastMessage?.messageType === "emote" ? (
                              <span className="text-lg">{conv.lastMessage.emote}</span>
                            ) : conv.lastMessage?.messageType === "image" ? (
                              "Đã gửi một hình ảnh"
                            ) : (
                              conv.lastMessage?.content || "Chưa có tin nhắn"
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-1">
                          <div className={`text-[10px] ${isUnread ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
                            {conv.lastActivity
                              ? new Date(conv.lastActivity).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                              : conv.updatedAt
                              ? new Date(conv.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                              : ""}
                          </div>
                          {isUnread && (
                            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>
          <button
            className="w-full py-3 text-center text-blue-600 dark:text-blue-400 font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 border-t border-gray-200 dark:border-gray-700 transition-colors"
            onClick={() => {
              setOpen(false);
              window.location.href = "/chat";
            }}
          >
            Xem tất cả tin nhắn
          </button>
        </div>
      )}
    </div>
  );
}
