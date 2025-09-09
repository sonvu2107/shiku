import { AlertTriangle, Clock } from "lucide-react";

export default function BanNotification({ banInfo, onClose }) {
  if (!banInfo || !banInfo.isBanned) return null;

  const formatTime = (minutes) => {
    if (minutes === -1) return "vĩnh viễn";
    if (minutes < 60) return `${minutes} phút`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} giờ ${minutes % 60} phút`;
    return `${Math.floor(minutes / 1440)} ngày ${Math.floor((minutes % 1440) / 60)} giờ`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="text-red-500" size={24} />
          <h3 className="text-lg font-semibold text-red-600">Tài khoản bị cấm</h3>
        </div>
        
        <div className="space-y-3 mb-6">
          <p className="text-gray-700">
            <strong>Lý do:</strong> {banInfo.banReason}
          </p>
          
          {banInfo.remainingMinutes !== -1 && (
            <div className="flex items-center gap-2 text-gray-700">
              <Clock size={16} />
              <span>
                <strong>Thời gian còn lại:</strong> {formatTime(banInfo.remainingMinutes)}
              </span>
            </div>
          )}
          
          {banInfo.remainingMinutes === -1 && (
            <p className="text-red-600 font-medium">
              Tài khoản của bạn đã bị cấm vĩnh viễn.
            </p>
          )}
          
          <p className="text-sm text-gray-500">
            Vui lòng chờ hết thời gian cấm để có thể đăng bài và bình luận trở lại.
          </p>
        </div>
        
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
}
