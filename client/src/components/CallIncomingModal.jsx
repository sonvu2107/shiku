import React from "react";

export default function CallIncomingModal({ open, caller, onAccept, onReject, isVideo }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl p-6 min-w-[320px] max-w-[95vw] flex flex-col items-center relative">
        <div className="mb-2 font-semibold text-lg">
          {isVideo ? "Cuộc gọi video" : "Cuộc gọi thoại"} từ {caller?.name || "Người dùng"}
        </div>
        <div className="flex gap-4 mt-4">
          <button className="px-4 py-2 bg-green-500 text-white rounded-lg" onClick={onAccept}>Chấp nhận</button>
          <button className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg" onClick={onReject}>Từ chối</button>
        </div>
      </div>
    </div>
  );
}
