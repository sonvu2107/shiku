import { useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import { api } from "../api";

/**
 * ChatDropdown - Dropdown hiển thị danh sách cuộc trò chuyện
 * Hiển thị danh sách conversations với avatar, tên và tin nhắn cuối
 * @param {Object} props - Component props
 * @param {Function} props.onOpenChat - Callback khi click vào conversation
 * @returns {JSX.Element} Component chat dropdown
 */
export default function ChatDropdown({ onOpenChat }) {
  // ==================== STATE MANAGEMENT ====================
  
  // UI states
  const [open, setOpen] = useState(false); // Trạng thái mở/đóng dropdown
  const [loading, setLoading] = useState(false); // Loading state
  
  // Data states
  const [conversations, setConversations] = useState([]); // Danh sách conversations
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
      setConversations(res.conversations || []);
    } catch (err) {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }

  const getAvatar = (conv) => {
    const isGroup = conv.conversationType === "group";

    if (isGroup) {
      return conv.groupAvatar || "/default-avatar.png";
    }

    const otherUser = conv.otherParticipants?.[0]?.user;
    const name = otherUser?.name || "Không tên";

    if (otherUser?.avatarUrl && otherUser.avatarUrl.trim() !== "") {
      return otherUser.avatarUrl;
    }

    // fallback ui-avatars
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&length=2&background=cccccc&color=222222`;
  };

  const getName = (conv) => {
    if (conv.conversationType === "group") {
      return conv.groupName || "Nhóm";
    }
    return conv.otherParticipants?.[0]?.user?.name || "Không tên";
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        onClick={() => setOpen(!open)}
        title="Tin nhắn"
      >
        <MessageCircle size={22} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded-xl shadow-xl z-50">
          <div className="p-4 border-b font-semibold text-lg">Tin nhắn</div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-gray-500">Đang tải...</div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-gray-500">Không có hội thoại nào</div>
            ) : (
              conversations.map((conv) => {
                const avatar = getAvatar(conv);
                const name = getName(conv);

                return (
                  <div
                    key={conv._id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b"
                    onClick={() => onOpenChat(conv)}
                  >
                    <img
                      src={avatar}
                      alt={name}
                      className="w-10 h-10 rounded-full object-cover"
                      onError={(e) => {
                        e.target.src = "/default-avatar.png";
                      }}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{name}</div>
                      <div className="text-xs text-gray-500">
                        {conv.lastMessage?.content || "Chưa có tin nhắn"}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {conv.updatedAt
                        ? new Date(conv.updatedAt).toLocaleTimeString()
                        : ""}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <button
            className="w-full py-3 text-center text-blue-600 font-medium hover:bg-blue-50 border-t"
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
