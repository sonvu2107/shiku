import React from "react";
import { Phone, PhoneOff, Video, Mic } from "lucide-react";

/**
 * CallIncomingModal - Modal hiển thị khi có cuộc gọi đến
 * UI/UX tone đen trắng đồng nhất với web
 * @param {Object} props - Component props
 * @param {boolean} props.open - Trạng thái mở/đóng modal
 * @param {Object} props.caller - Thông tin người gọi
 * @param {boolean} props.isVideo - Loại cuộc gọi (video/voice)
 * @param {Function} props.onAccept - Callback khi chấp nhận cuộc gọi
 * @param {Function} props.onReject - Callback khi từ chối cuộc gọi
 */
const CallIncomingModal = ({ open, caller, isVideo, onAccept, onReject }) => {
  if (!open) {
    return null;
  }

  // Extract caller info
  const callerName = caller?.name || caller?.username || "Người dùng";
  const callerAvatar = caller?.avatarUrl || caller?.avatar || caller?.profilePicture;
  const callerInitial = callerName.charAt(0)?.toUpperCase() || "?";

  console.log('👤 CallIncomingModal: Caller info', {
    name: callerName,
    avatar: callerAvatar,
    callerObj: caller
  });

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900 dark:bg-black backdrop-blur-sm">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-800/50 via-gray-900/80 to-black/90 dark:from-black/50 dark:via-black/80 dark:to-black/95"></div>

      <div className="relative z-10 flex flex-col items-center justify-center px-4 py-8 w-full max-w-md">
        {/* Avatar với animation */}
        <div className="relative mb-8">
          {/* Pulsating rings */}
          <div className="absolute inset-0 -m-4 rounded-full border-4 border-gray-400 dark:border-gray-300 opacity-40 animate-ping"></div>
          <div className="absolute inset-0 -m-8 rounded-full border-4 border-gray-500 dark:border-gray-400 opacity-20 animate-ping" style={{ animationDelay: "0.2s" }}></div>
          <div className="absolute inset-0 -m-12 rounded-full border-4 border-gray-600 dark:border-gray-500 opacity-10 animate-ping" style={{ animationDelay: "0.4s" }}></div>

          {/* Avatar */}
          <div className="relative w-32 h-32 rounded-full border-4 border-white dark:border-gray-200 shadow-2xl overflow-hidden bg-gradient-to-br from-gray-400 to-gray-600 dark:from-gray-600 dark:to-gray-800">
            {callerAvatar ? (
              <img
                src={callerAvatar}
                alt={callerName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className={`absolute inset-0 flex items-center justify-center text-white text-5xl font-bold ${callerAvatar ? 'hidden' : 'flex'}`}
            >
              {callerInitial}
            </div>
          </div>

          {/* Call type icon */}
          <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-gray-700 dark:bg-gray-600 rounded-full border-4 border-white dark:border-gray-900 shadow-lg flex items-center justify-center">
            {isVideo ? (
              <Video className="w-6 h-6 text-white" />
            ) : (
              <Mic className="w-6 h-6 text-white" />
            )}
          </div>
        </div>

        {/* Caller name */}
        <h2 className="text-white dark:text-gray-100 text-3xl font-bold mb-2 text-center animate-fadeInUp">
          {callerName}
        </h2>

        {/* Call type label */}
        <p className="text-gray-300 dark:text-gray-400 text-lg mb-8 text-center animate-fadeInUp" style={{ animationDelay: "0.1s" }}>
          {isVideo ? "Cuộc gọi video đến..." : "Cuộc gọi thoại đến..."}
        </p>

        {/* Action buttons - Clean monochrome style */}
        <div className="flex items-center justify-center gap-6 w-full animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
          {/* Decline button */}
          <button
            onClick={onReject}
            className="group relative flex flex-col items-center gap-3 transition-transform hover:scale-110 active:scale-95"
            title="Từ chối"
          >
            <div className="w-16 h-16 rounded-full bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700 shadow-lg shadow-red-500/30 dark:shadow-red-600/30 flex items-center justify-center transition-all group-hover:shadow-xl">
              <PhoneOff className="w-7 h-7 text-white" />
            </div>
            <span className="text-white dark:text-gray-300 text-sm font-medium">Từ chối</span>
          </button>

          {/* Accept button */}
          <button
            onClick={onAccept}
            className="group relative flex flex-col items-center gap-3 transition-transform hover:scale-110 active:scale-95"
            title="Chấp nhận"
          >
            <div className="w-16 h-16 rounded-full bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700 shadow-lg shadow-green-500/30 dark:shadow-green-600/30 flex items-center justify-center transition-all group-hover:shadow-xl">
              <Phone className="w-7 h-7 text-white" />
            </div>
            <span className="text-white dark:text-gray-300 text-sm font-medium">Chấp nhận</span>
          </button>
        </div>

        {/* Swipe hint for mobile */}
        <div className="mt-12 text-gray-400 dark:text-gray-500 text-sm text-center animate-bounce">
          <div className="flex items-center gap-2 justify-center">
            <div className="w-8 h-1 bg-gray-400/30 dark:bg-gray-500/30 rounded-full"></div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.4s ease-out;
        }
      `}</style>
    </div>
  );
};

export default CallIncomingModal;