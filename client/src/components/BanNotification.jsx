import { AlertTriangle, Clock } from "lucide-react";

/**
 * BanNotification - Component show ban notification
 * Displays ban reason, remaining time, and detailed information
 * @param {Object} banInfo - Ban information from server
 * @param {boolean} banInfo.isBanned - Whether the user is banned
 * @param {string} banInfo.banReason - Reason for the ban
 * @param {number} banInfo.remainingMinutes - Remaining minutes (-1 = permanent ban)
 * @param {Function} onClose - Callback when closing notification
 */
export default function BanNotification({ banInfo, onClose }) {
  // Do not display if user is not banned
  if (!banInfo || !banInfo.isBanned) return null;

  /**
   * Format remaining ban time into a readable string
   * @param {number} minutes - Remaining minutes
   * @returns {string} Formatted time string
   */
  const formatTime = (minutes) => {
    if (minutes === -1) return "vĩnh viễn";
    if (minutes < 60) return `${minutes} phút`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} giờ ${minutes % 60} phút`;
    return `${Math.floor(minutes / 1440)} ngày ${Math.floor((minutes % 1440) / 60)} giờ`;
  };

  return (
    // Modal overlay - covers the entire screen with a backdrop
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      {/* Modal content */}
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        {/* Header with warning icon */}
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="text-red-500" size={24} />
          <h3 className="text-lg font-semibold text-red-600">Tài khoản bị cấm</h3>
        </div>

        {/* Detailed ban information */}
        <div className="space-y-3 mb-6">
          {/* Ban reason */}
          <p className="text-gray-700">
            <strong>Lý do:</strong> {banInfo.banReason}
          </p>

          {/*Time remaining (if not permanently banned) */}
          {banInfo.remainingMinutes !== -1 && (
            <div className="flex items-center gap-2 text-gray-700">
              <Clock size={16} />
              <span>
                <strong>Thời gian còn lại:</strong> {formatTime(banInfo.remainingMinutes)}
              </span>
            </div>
          )}

          {/* Permanent ban notification */}
          {banInfo.remainingMinutes === -1 && (
            <p className="text-red-600 font-medium">
              Tài khoản của bạn đã bị cấm vĩnh viễn.
            </p>
          )}

          {/* User guide */}
          <p className="text-sm text-gray-500">
            Vui lòng chờ hết thời gian cấm để có thể đăng bài và bình luận trở lại.
          </p>
        </div>

        {/* Close button */}
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
