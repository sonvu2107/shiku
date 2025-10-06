import { AlertTriangle, Clock } from "lucide-react";

/**
 * BanNotification - Component hiển thị thông báo khi user bị ban
 * Hiển thị lý do ban, thời gian còn lại và thông tin chi tiết
 * @param {Object} banInfo - Thông tin ban từ server
 * @param {boolean} banInfo.isBanned - User có bị ban không
 * @param {string} banInfo.banReason - Lý do bị ban
 * @param {number} banInfo.remainingMinutes - Số phút còn lại (-1 = vĩnh viễn)
 * @param {Function} onClose - Callback khi đóng notification
 */
export default function BanNotification({ banInfo, onClose }) {
  // Không hiển thị nếu user không bị ban
  if (!banInfo || !banInfo.isBanned) return null;

  /**
   * Format thời gian ban còn lại thành chuỗi dễ đọc
   * @param {number} minutes - Số phút còn lại
   * @returns {string} Chuỗi thời gian đã format
   */
  const formatTime = (minutes) => {
    if (minutes === -1) return "vĩnh viễn";
    if (minutes < 60) return `${minutes} phút`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} giờ ${minutes % 60} phút`;
    return `${Math.floor(minutes / 1440)} ngày ${Math.floor((minutes % 1440) / 60)} giờ`;
  };

  return (
    // Modal overlay - che phủ toàn màn hình với backdrop
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      {/* Modal content */}
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        {/* Header với icon cảnh báo */}
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="text-red-500" size={24} />
          <h3 className="text-lg font-semibold text-red-600">Tài khoản bị cấm</h3>
        </div>

        {/* Thông tin chi tiết về ban */}
        <div className="space-y-3 mb-6">
          {/* Lý do bị ban */}
          <p className="text-gray-700">
            <strong>Lý do:</strong> {banInfo.banReason}
          </p>

          {/* Thời gian còn lại (nếu không phải ban vĩnh viễn) */}
          {banInfo.remainingMinutes !== -1 && (
            <div className="flex items-center gap-2 text-gray-700">
              <Clock size={16} />
              <span>
                <strong>Thời gian còn lại:</strong> {formatTime(banInfo.remainingMinutes)}
              </span>
            </div>
          )}

          {/* Thông báo ban vĩnh viễn */}
          {banInfo.remainingMinutes === -1 && (
            <p className="text-red-600 font-medium">
              Tài khoản của bạn đã bị cấm vĩnh viễn.
            </p>
          )}

          {/* Hướng dẫn cho user */}
          <p className="text-sm text-gray-500">
            Vui lòng chờ hết thời gian cấm để có thể đăng bài và bình luận trở lại.
          </p>
        </div>

        {/* Nút đóng */}
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
