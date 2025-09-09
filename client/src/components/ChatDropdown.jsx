import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { api } from "../api";

export default function ChatDropdown({ onOpenChat }) {
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadConversations();
    }
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

  return (
    <div className="relative">
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
              conversations.map(conv => (
                <div
                  key={conv._id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b"
                  onClick={() => onOpenChat(conv)}
                >
                  {(() => {
                    const isGroup = conv.conversationType === 'group';
                    const avatar = isGroup
                      ? conv.groupAvatar || '/default-avatar.png'
                      : (conv.otherParticipants?.[0]?.user?.avatarUrl || '/default-avatar.png');
                    const name = isGroup
                      ? conv.groupName || 'Nhóm'
                      : (conv.otherParticipants?.[0]?.user?.name || 'Không tên');
                    return (
                      <>
                        <img src={avatar} alt={name} className="w-10 h-10 rounded-full object-cover" />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{name}</div>
                          <div className="text-xs text-gray-500">{conv.lastMessage?.content || "Chưa có tin nhắn"}</div>
                        </div>
                        <div className="text-xs text-gray-400">{conv.updatedAt ? new Date(conv.updatedAt).toLocaleTimeString() : ""}</div>
                      </>
                    );
                  })()}
                </div>
              ))
            )}
          </div>
          <button
            className="w-full py-3 text-center text-blue-600 font-medium hover:bg-blue-50 border-t"
            onClick={() => { setOpen(false); window.location.href = '/chat'; }}
          >
            Xem tất cả tin nhắn
          </button>
        </div>
      )}
    </div>
  );
}
