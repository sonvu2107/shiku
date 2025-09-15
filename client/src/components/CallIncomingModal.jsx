import React from "react";

/**
 * CallIncomingModal - Modal hiển thị khi có cuộc gọi đến
 * Giao diện giống Messenger với fullscreen background và circular buttons
 * @param {Object} props - Component props
 * @param {boolean} props.open - Trạng thái mở/đóng modal
 * @param {Object} props.caller - Thông tin người gọi
 * @param {boolean} props.isVideo - Loại cuộc gọi (video/voice)
 * @param {Function} props.onAccept - Callback khi chấp nhận cuộc gọi
 * @param {Function} props.onReject - Callback khi từ chối cuộc gọi
 */
const CallIncomingModal = ({ open, caller, isVideo, onAccept, onReject }) => {
  // Không render nếu modal không mở
  if (!open) {
    return null;
  }
  
  return (
    <div className="fixed inset-0 bg-black z-[9999] flex items-center justify-center">
      <div className="w-full h-full bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-green-500/30 to-blue-500/30"></div>
        </div>
        
        {/* Avatar và thông tin cuộc gọi */}
        <div className="mb-12 text-center relative z-10">
          <div className="relative mb-8">
            {/* Avatar */}
            <div className="w-48 h-48 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-6xl mx-auto shadow-2xl border-4 border-white/20">
              {caller?.name ? caller.name.charAt(0).toUpperCase() : '👤'}
            </div>
            
            {/* Ringing Animation */}
            <div className="absolute inset-0 rounded-full border-4 border-white/60 animate-ping opacity-30"></div>
            <div className="absolute inset-4 rounded-full border-4 border-white/40 animate-ping opacity-40" style={{animationDelay: '0.5s'}}></div>
            <div className="absolute inset-8 rounded-full border-4 border-white/20 animate-ping opacity-50" style={{animationDelay: '1s'}}></div>
          </div>
          
          <div className="font-bold text-3xl text-white mb-3">
            {caller?.name || "Unknown"}
          </div>
          <div className="text-white/80 text-xl mb-2">
            {isVideo ? "Incoming Video Call" : "Incoming Voice Call"}
          </div>
          <div className="text-white/60 text-lg">
            {isVideo ? "Video" : "Voice"}
          </div>
        </div>
        
        {/* Các nút hành động */}
        <div className="flex gap-8 justify-center items-center relative z-10">
          {/* Reject Button */}
          <button 
            className="w-20 h-20 bg-red-500/90 hover:bg-red-600/90 text-white rounded-full transition-all duration-200 flex items-center justify-center shadow-lg shadow-red-500/50 hover:shadow-red-500/70 backdrop-blur-sm" 
            onClick={onReject}
            title="Decline"
          >
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28-.79-.73-1.68-1.36-2.66-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
            </svg>
          </button>
          
          {/* Accept Button */}
          <button 
            className="w-20 h-20 bg-green-500/90 hover:bg-green-600/90 text-white rounded-full transition-all duration-200 flex items-center justify-center shadow-lg shadow-green-500/50 hover:shadow-green-500/70 backdrop-blur-sm" 
            onClick={onAccept}
            title="Accept"
          >
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
            </svg>
          </button>
        </div>
        
        {/* Slide to Answer Hint (for mobile) */}
        <div className="mt-8 text-center relative z-10">
          <div className="text-white/60 text-sm">
            Swipe up to answer
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallIncomingModal;