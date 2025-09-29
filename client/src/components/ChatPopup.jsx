import { useEffect, useState, useRef } from "react";
import CallModal from "./CallModal";
import CallIncomingModal from "./CallIncomingModal";
import { api } from "../api";
import { getUserInfo } from "../utils/auth";
import socketService from "../socket";
import callManager from "../utils/callManager";
import { X, Phone, Video, ChevronDown, MessageCircle } from "lucide-react";

/**
 * ChatPopup - Popup chat window với khả năng gọi video/voice
 * Hiển thị cuộc trò chuyện trong popup với các tính năng gọi và gửi tin nhắn
 * @param {Object} props - Component props
 * @param {Object} props.conversation - Dữ liệu cuộc trò chuyện
 * @param {Function} props.onClose - Callback đóng popup
 * @param {Function} props.setCallOpen - Callback mở modal gọi
 * @param {Function} props.setIsVideoCall - Callback set loại cuộc gọi
 * @returns {JSX.Element} Component chat popup
 */
export default function ChatPopup({ conversation, onClose, setCallOpen, setIsVideoCall }) {
  // ==================== EFFECTS ====================
  
  // Join conversation khi có conversationId
  useEffect(() => {
    const joinConversation = async () => {
      if (conversation?._id) {
        await socketService.joinConversation(conversation._id);
      }
    };
    joinConversation();
  }, [conversation?._id]);

  // Listen for real-time messages
  useEffect(() => {
    if (!conversation?._id || !socketService.socket) return;
    
    const handleNewMessage = (message) => {
      // Check if message belongs to current conversation
      if (message.conversationId === conversation._id || message.conversation === conversation._id) {
        setMessages(prev => {
          const exists = prev.some(m => m._id === message._id);
          if (exists) {
            return prev;
          }
          return [...prev, message];
        });
      }
    };

    // Set up message listener for this conversation
    socketService.socket.on('new-message', handleNewMessage);
    
    return () => {
      socketService.socket.off('new-message', handleNewMessage);
    };
  }, [conversation?._id]);

  // ==================== STATE MANAGEMENT ====================
  
  // UI states
  const [minimized, setMinimized] = useState(false); // Trạng thái thu nhỏ popup
  const [uploading, setUploading] = useState(false); // Trạng thái upload ảnh
  
  // Message states
  const [messages, setMessages] = useState([]); // Danh sách tin nhắn
  const [input, setInput] = useState(""); // Nội dung tin nhắn đang nhập
  
  // Refs
  const messagesEndRef = useRef(null); // Ref để scroll xuống cuối tin nhắn
  
  // User info
  const me = getUserInfo()?.id || conversation.me; // ID của user hiện tại

  // tải tin nhắn
  useEffect(() => {
    async function fetchMessages() {
      try {
        const res = await api(`/api/messages/conversations/${conversation._id}/messages?limit=50`);
        setMessages(res.messages || []);
      } catch {
        setMessages([]);
      }
    }
    fetchMessages();
  }, [conversation._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const messageContent = input;
    setInput(""); // Clear input immediately for better UX
    
    try {
      const response = await api(`/api/messages/conversations/${conversation._id}/messages`, {
        method: "POST",
        body: { content: messageContent },
      });
      
      // Add the sent message to the list immediately (optimistic update)
      if (response.message) {
        setMessages(prev => [...prev, response.message]);
      }
    } catch (error) {
      // Restore input if sending failed
      setInput(messageContent);
    }
  };

  const isGroup = conversation.conversationType === "group";
  const name = isGroup
    ? conversation.groupName || "Nhóm"
    : conversation.otherParticipants?.[0]?.user?.name || "Không tên";

  const avatar = isGroup
    ? conversation.groupAvatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        name
      )}&length=2&background=cccccc&color=222222`
    : conversation.otherParticipants?.[0]?.user?.avatarUrl ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        name
      )}&length=2&background=cccccc&color=222222`;

  const getOtherUserOnlineStatus = () => {
    if (isGroup) return false;
    
    const otherParticipant = conversation.otherParticipants?.[0];
    const user = otherParticipant?.user || otherParticipant;
    return user?.isOnline || false;
  };

  return (
    <div className="w-72 sm:w-80 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col chat-popup-mobile">
      {/* Header */}
      <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 border-b bg-gray-50 rounded-t-xl">
        <div className="relative flex-shrink-0">
          <img src={avatar} alt={name} className="w-7 h-7 sm:w-9 sm:h-9 rounded-full object-cover" />
          {/* Online status indicator for private conversations */}
          {!isGroup && getOtherUserOnlineStatus() && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          )}
        </div>
        <div className="flex-1 font-semibold text-gray-900 text-sm sm:text-base truncate min-w-0">{name}</div>
        <div className="flex gap-0.5 sm:gap-1">
          <button
            className="p-1.5 sm:p-2 hover:bg-blue-50 rounded-full text-blue-500 transition-all duration-200 hover:scale-110 touch-target"
            onClick={() => {
              setCallOpen && setCallOpen(true);
              setIsVideoCall && setIsVideoCall(false);
            }}
            title="Gọi thoại"
          >
            <Phone size={14} className="sm:w-4 sm:h-4" />
          </button>
          <button
            className="p-1.5 sm:p-2 hover:bg-blue-50 rounded-full text-blue-500 transition-all duration-200 hover:scale-110 touch-target"
            onClick={() => {
              setCallOpen && setCallOpen(true);
              setIsVideoCall && setIsVideoCall(true);
            }}
            title="Gọi video"
          >
            <Video size={14} className="sm:w-4 sm:h-4" />
          </button>
        </div>
        <button
          className="p-1 hover:bg-gray-200 rounded-full touch-target"
          onClick={() => setMinimized(true)}
          title="Thu nhỏ"
        >
          <ChevronDown size={14} className="sm:w-4 sm:h-4" />
        </button>
        <button className="p-1 hover:bg-gray-200 rounded-full touch-target" onClick={onClose}>
          <X size={14} className="sm:w-4 sm:h-4" />
        </button>
      </div>

      {/* Nội dung chat */}
      {!minimized && (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-2" style={{ maxHeight: 320 }}>
            {messages.length === 0 ? (
              <div className="text-gray-400 text-sm">Chưa có tin nhắn</div>
            ) : (
              messages.map((msg, idx) => {
                if (msg.messageType === "system") {
                  return (
                    <div key={msg._id || idx} className="mb-2 flex justify-center">
                      <div className="px-4 py-2 rounded-2xl bg-gray-100 text-gray-700 text-sm text-center max-w-[80%]">
                        {msg.content}
                      </div>
                    </div>
                  );
                }
                if (msg.sender?._id === me) {
                  return (
                    <div key={msg._id || idx} className="mb-2 flex justify-end">
                      <div className="flex flex-col items-end">
                        {msg.messageType === "image" ? (
                          <img src={msg.imageUrl} alt="Ảnh" className="max-w-[60%] rounded-xl" />
                        ) : (
                          <div className="px-3 py-2 rounded-2xl text-sm bg-blue-600 text-white">
                            {msg.content}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          {msg.createdAt
                            ? new Date(msg.createdAt).toLocaleTimeString() +
                              " " +
                              new Date(msg.createdAt).toLocaleDateString()
                            : ""}
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={msg._id || idx} className="mb-2 flex justify-start">
                    <div className="flex items-start gap-2">
                      <img
                        src={
                          msg.sender?.avatarUrl
                            ? msg.sender.avatarUrl
                            : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                msg.sender?.name || "Không tên"
                              )}&length=2&background=cccccc&color=222222`
                        }
                        alt={msg.sender?.name || ""}
                        className="w-7 h-7 rounded-full object-cover mt-1"
                      />
                      <div className="flex flex-col items-start">
                        <div className="text-xs text-gray-700 font-semibold mb-1">
                          {msg.sender?.name || "Không tên"}
                        </div>
                        {msg.messageType === "image" ? (
                          <img src={msg.imageUrl} alt="Ảnh" className="max-w-[60%] rounded-xl" />
                        ) : (
                          <div className="px-3 py-2 rounded-2xl text-sm bg-gray-200 text-gray-900">
                            {msg.content}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          {msg.createdAt
                            ? new Date(msg.createdAt).toLocaleTimeString() +
                              " " +
                              new Date(msg.createdAt).toLocaleDateString()
                            : ""}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Ô nhập */}
          <div className="flex items-center gap-2 px-4 py-2 border-t bg-gray-50 rounded-b-xl">
            <label className="cursor-pointer">
              <svg
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-image text-gray-500"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="2.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  setUploading(true);
                  const reader = new FileReader();
                  reader.onload = async () => {
                    try {
                      const response = await api(`/api/messages/conversations/${conversation._id}/messages/image`, {
                        method: "POST",
                        body: { image: reader.result },
                      });
                      
                      // Add the sent image message to the list immediately (optimistic update)
                      if (response.message) {
                        setMessages(prev => [...prev, response.message]);
                      }
                    } catch (error) {
                      // Handle error silently
                    }
                    setUploading(false);
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>
            <input
              className="flex-1 px-3 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Aa"
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={uploading}
            />
            <button
              className="px-3 py-2 bg-blue-600 text-white rounded-full"
              onClick={handleSend}
              disabled={uploading}
            >
              Gửi
            </button>
          </div>
        </>
      )}

      {minimized && (
        <div
          className="flex items-center gap-2 px-3 py-2 cursor-pointer"
          onClick={() => setMinimized(false)}
          title="Mở lại chat"
        >
          <img src={avatar} alt={name} className="w-8 h-8 rounded-full object-cover" />
          <div className="font-semibold text-gray-900 flex-1 truncate">{name}</div>
          <MessageCircle size={20} className="text-blue-500" />
        </div>
      )}
    </div>
  );
}

// Wrapper để quản lý CallModal + CallIncomingModal
export function ChatPopupWithCallModal(props) {
  const [callOpen, setCallOpen] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(true);
  const [incomingCall, setIncomingCall] = useState(null);
  const [incomingOffer, setIncomingOffer] = useState(null);

  useEffect(() => {
    const handleOffer = ({ offer, conversationId, caller, callerSocketId, callerInfo, isVideo }) => {
      if (conversationId === props.conversation._id) {
        const myId = getUserInfo()?.id;
        const mySocketId = socketService.socket?.id;
        
        // Bỏ qua nếu chính mình là caller (kiểm tra cả user ID và socket ID)
        if (caller === myId || callerSocketId === mySocketId) {
          return;
        }

        // Validate offer
        if (!offer || !offer.type || !offer.sdp) {
          return;
        }

        const incomingCallData = { 
          offer, 
          caller: callerInfo || { name: "Người dùng" }, 
          isVideo: isVideo || false 
        };
        setIncomingCall(incomingCallData);
      }
    };

    // Sử dụng global call manager thay vì socket trực tiếp
    callManager.addListener(handleOffer);
    
    return () => {
      callManager.removeListener(handleOffer);
    };
  }, [props.conversation._id]);

  const handleAcceptCall = () => {
    setCallOpen(true);
    setIsVideoCall(incomingCall?.isVideo ?? true);
    setIncomingOffer(incomingCall?.offer || null);
    setIncomingCall(null);
  };

  const handleRejectCall = async () => {
    await socketService.emitCallEnd(props.conversation._id);
    setIncomingCall(null);
  };

  return (
    <>
      <ChatPopup {...props} setCallOpen={setCallOpen} setIsVideoCall={setIsVideoCall} />
      {callOpen && (
        <CallModal
          open={callOpen}
          onClose={() => setCallOpen(false)}
          isVideo={isVideoCall}
          remoteUser={
            props.conversation.conversationType === "group"
              ? null
              : props.conversation.otherParticipants?.[0]?.user
          }
          socket={socketService.socket}
          conversationId={props.conversation._id}
          incomingOffer={incomingOffer}
        />
      )}
      {incomingCall && (
        <CallIncomingModal
          open={true}
          caller={incomingCall.caller}
          isVideo={incomingCall.isVideo}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}
    </>
  );
}
