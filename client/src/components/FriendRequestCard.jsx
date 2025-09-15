import { UserCheck, UserX, Clock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

/**
 * FriendRequestCard - Component hiển thị thẻ lời mời kết bạn
 * Hiển thị thông tin người gửi lời mời và các nút hành động (chấp nhận/từ chối)
 * @param {Object} props - Component props
 * @param {Object} props.request - Dữ liệu lời mời kết bạn
 * @param {Object} props.request.from - Thông tin người gửi lời mời
 * @param {string} props.request.from._id - ID người gửi
 * @param {string} props.request.from.name - Tên người gửi
 * @param {string} props.request.from.avatarUrl - Avatar URL người gửi
 * @param {string} props.request.createdAt - Thời gian tạo lời mời
 * @param {string} props.request.status - Trạng thái: pending, accepted, rejected
 * @param {Function} props.onAccept - Callback khi chấp nhận lời mời
 * @param {Function} props.onReject - Callback khi từ chối lời mời
 * @returns {JSX.Element} Component friend request card
 */
export default function FriendRequestCard({ request, onAccept, onReject }) {
  // ==================== DESTRUCTURING & HOOKS ====================
  
  const { from, createdAt, status } = request; // Destructure request data
  const navigate = useNavigate(); // Navigation hook

  return (
    <div className="bg-white rounded-lg border p-3 sm:p-4 space-y-3">
      {/* User Info Section */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Avatar */}
        <img
          src={from.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(from.name)}&background=cccccc&color=222222&size=64`}
          alt="avatar"
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border border-gray-300 bg-gray-100 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
          onClick={() => navigate(`/user/${from._id}`)}
        />
        
        {/* User Details */}
        <div className="flex-1 min-w-0">
          {/* User Name */}
          <Link 
            to={`/user/${from._id}`}
            className="font-semibold text-gray-800 hover:text-blue-600 text-sm sm:text-base truncate block"
            title={from.name}
          >
            {from.name}
          </Link>
          
          {/* Request Date */}
          <div className="text-xs sm:text-sm text-gray-500 flex items-center gap-1">
            <Clock size={12} className="sm:w-3.5 sm:h-3.5" />
            <span className="truncate">{new Date(createdAt).toLocaleDateString('vi-VN')}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons - Only show for pending requests */}
      {status === 'pending' && (
        <div className="flex gap-1 sm:gap-2">
          {/* Accept Button */}
          <button
            onClick={() => onAccept(request._id)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium flex items-center justify-center gap-1 sm:gap-2 transition-colors text-xs sm:text-sm touch-target"
          >
            <UserCheck size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Chấp nhận</span>
            <span className="sm:hidden">OK</span>
          </button>
          
          {/* Reject Button */}
          <button
            onClick={() => onReject(request._id)}
            className="flex-1 bg-gray-500 hover:bg-gray-600 active:bg-gray-700 text-white px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium flex items-center justify-center gap-1 sm:gap-2 transition-colors text-xs sm:text-sm touch-target"
          >
            <UserX size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Từ chối</span>
            <span className="sm:hidden">Từ chối</span>
          </button>
        </div>
      )}

      {/* Status Indicators */}
      {status === 'accepted' && (
        <div className="text-center text-green-600 font-medium text-sm sm:text-base">
          ✓ Đã chấp nhận
        </div>
      )}

      {status === 'rejected' && (
        <div className="text-center text-red-600 font-medium text-sm sm:text-base">
          ✗ Đã từ chối
        </div>
      )}
    </div>
  );
}
