import React from "react";

/**
 * CallIncomingModal - Modal hiển thị khi có cuộc gọi đến
 * Hiển thị thông tin người gọi và các nút chấp nhận/từ chối
 * @param {Object} props - Component props
 * @param {boolean} props.open - Trạng thái hiển thị modal
 * @param {Object} props.caller - Thông tin người gọi
 * @param {string} props.caller.name - Tên người gọi
 * @param {Function} props.onAccept - Callback khi chấp nhận cuộc gọi
 * @param {Function} props.onReject - Callback khi từ chối cuộc gọi
 * @param {boolean} props.isVideo - Loại cuộc gọi (video/voice)
 * @returns {JSX.Element|null} Component modal hoặc null nếu không hiển thị
 */
export default function CallIncomingModal({ open, caller, onAccept, onReject, isVideo }) {
  // Không render nếu modal không mở
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl p-6 min-w-[320px] max-w-[95vw] flex flex-col items-center relative">
        {/* Thông tin cuộc gọi */}
        <div className="mb-2 font-semibold text-lg">
          {isVideo ? "Cuộc gọi video" : "Cuộc gọi thoại"} từ {caller?.name || "Người dùng"}
        </div>
        
        {/* Các nút hành động */}
        <div className="flex gap-4 mt-4">
          <button 
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors" 
            onClick={onAccept}
          >
            Chấp nhận
          </button>
          <button 
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors" 
            onClick={onReject}
          >
            Từ chối
          </button>
        </div>
      </div>
    </div>
  );
}
