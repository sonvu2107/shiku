import { useState, useEffect } from "react";
import ChatPopup from "./ChatPopup";
import CallModal from "./CallModal";
import CallIncomingModal from "./CallIncomingModal";
import { getUserInfo } from "../utils/auth";
import socketService from "../socket";
import callManager from "../utils/callManager";

// CSS for column bubble layout
const chatBubbleStyles = `
  .chat-popup-container {
    position: fixed !important;
    right: 20px !important;
    bottom: 20px !important;
    z-index: 10000 !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 16px !important;
    pointer-events: none !important;
    align-items: flex-end !important;
  }
  
  .chat-popup-container > * {
    pointer-events: auto !important;
    position: relative !important;
  }
  
  /* The open chat popup will appear in the same position (down below) */
  .chat-popup-container .chat-popup-mobile:not(.minimized) {
    position: fixed !important;
    bottom: 20px !important;
    right: 20px !important;
    z-index: 10000 !important;
  }
  
  /* The minimized bubble will follow the column layout */
  .chat-popup-container .chat-popup-mobile.minimized {
    position: relative !important;
    margin-bottom: 0 !important;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = chatBubbleStyles;
  document.head.appendChild(styleSheet);
}

/**
 * ChatPopupManager - Manage multiple chat popups and arrange them in a column 
 * @param {Object} props - Component props
 * @param {Array} props.conversations - List of open conversations
 * @param {Function} props.onCloseConversation - Callback to close a conversation
 * @param {Function} props.onShowInfo - Callback to show information
 * @returns {JSX.Element} Chat popup manager component
 */
export default function ChatPopupManager({ conversations = [], onCloseConversation, onShowInfo }) {
  // ==================== STATE MANAGEMENT ====================

  const [callOpen, setCallOpen] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(true);
  const [incomingCall, setIncomingCall] = useState(null);
  const [incomingOffer, setIncomingOffer] = useState(null);
  const [activeConversationId, setActiveConversationId] = useState(null);

  // ==================== EFFECTS ====================

  // Listen for incoming calls
  useEffect(() => {
    const handleOffer = ({ offer, conversationId, caller, callerSocketId, callerInfo, isVideo }) => {
      const myId = getUserInfo()?.id;
      const mySocketId = socketService.socket?.id;

      // Ignore if the caller is myself
      if (caller === myId || callerSocketId === mySocketId) {
        return;
      }

      // Validate offer
      if (!offer || !offer.type || !offer.sdp || !conversationId) {
        return;
      }

      // Only show incoming call if the conversation is open
      const isConversationOpen = conversations.some(conv => conv._id === conversationId);
      if (isConversationOpen) {
        const incomingCallData = {
          offer,
          conversationId,
          caller: callerInfo || { name: "Người dùng" },
          isVideo: isVideo || false
        };
        setIncomingCall(incomingCallData);
        setActiveConversationId(conversationId);
      }
    };

    callManager.addListener(handleOffer);

    return () => {
      callManager.removeListener(handleOffer);
    };
  }, [conversations]);

  // ==================== FUNCTIONS ====================

  const handleAcceptCall = () => {
    if (!incomingCall) return;

    setCallOpen(true);
    setIsVideoCall(incomingCall?.isVideo ?? true);
    setIncomingOffer(incomingCall?.offer || null);
    setIncomingCall(null);
  };

  const handleRejectCall = async () => {
    if (!incomingCall) return;

    const conversationId = incomingCall.conversationId || activeConversationId;
    if (conversationId) {
      await socketService.emitCallEnd(conversationId);
    }
    setIncomingCall(null);
    setActiveConversationId(null);
  };

  const handleCallOpen = (conversationId) => {
    setActiveConversationId(conversationId);
    setCallOpen(true);
  };

  const handleCallClose = () => {
    setCallOpen(false);
    setActiveConversationId(null);
  };

  // ==================== RENDER ====================

  // Don't render chat popups on mobile - mobile users use /chat page
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  if (isMobile || conversations.length === 0) {
    return null;
  }

  return (
    <>
      {/* Render chat popups */}
      <div className="chat-popup-container">
        {conversations.map((conversation, index) => (
          <ChatPopup
            key={conversation._id}
            conversation={conversation}
            onClose={() => onCloseConversation(conversation._id)}
            setCallOpen={(isOpen) => {
              if (isOpen) {
                handleCallOpen(conversation._id);
              } else {
                handleCallClose();
              }
            }}
            setIsVideoCall={setIsVideoCall}
            index={index}
            onShowInfo={onShowInfo}
          />
        ))}
      </div>

      {/* Call Modal */}
      {callOpen && activeConversationId && (
        <CallModal
          open={callOpen}
          onClose={handleCallClose}
          isVideo={isVideoCall}
          remoteUser={
            conversations.find(c => c._id === activeConversationId)?.conversationType === "group"
              ? null
              : conversations.find(c => c._id === activeConversationId)?.otherParticipants?.[0]?.user
          }
          socket={socketService.socket}
          conversationId={activeConversationId}
          incomingOffer={incomingOffer}
        />
      )}

      {/* Incoming Call Modal */}
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
