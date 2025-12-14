import { UserCheck, UserX, Clock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import UserName from "./UserName";
import UserAvatar from "./UserAvatar";

/**
 * FriendRequestCard - Component show friend request card
 * Displays information about the sender of the request and action buttons (accept/reject)
 * @param {Object} props - Component props
 * @param {Object} props.request - Friend request data
 * @param {Object} props.request.from - Information about the sender of the request
 * @param {string} props.request.from._id - ID of the sender
 * @param {string} props.request.from.name - Name of the sender
 * @param {string} props.request.from.avatarUrl - Avatar URL of the sender
 * @param {string} props.request.createdAt - Creation time of the request
 * @param {string} props.request.status - Status: pending, accepted, rejected
 * @param {Function} props.onAccept - Callback when accepting the request
 * @param {Function} props.onReject - Callback when rejecting the request
 * @returns {JSX.Element} Component friend request card
 */
export default function FriendRequestCard({ request, onAccept, onReject }) {
  // ==================== DESTRUCTURING & HOOKS ====================

  const { from, createdAt, status } = request; // Destructure request data
  const navigate = useNavigate(); // Navigation hook

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 space-y-3 transition-colors duration-200">
      {/* User Info Section */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Avatar */}
        <div
          className="cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
          onClick={() => navigate(`/user/${from._id}`)}
        >
          <UserAvatar
            user={from}
            size={48}
            showFrame={true}
            showBadge={true}
            className="hidden sm:block"
          />
          <UserAvatar
            user={from}
            size={40}
            showFrame={true}
            showBadge={true}
            className="sm:hidden"
          />
        </div>

        {/* User Details */}
        <div className="flex-1 min-w-0">
          {/* User Name */}
          <Link
            to={`/user/${from._id}`}
            className="font-semibold text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 text-sm sm:text-base truncate block transition-colors"
            title={from.nickname || from.name}
          >
            <UserName user={from} maxLength={20} />
          </Link>

          {/* Request Date */}
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
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
            className="flex-1 bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 
                      active:bg-blue-800 dark:active:bg-blue-900 text-white px-2 sm:px-4 py-2 sm:py-2.5 
                      rounded-lg font-medium flex items-center justify-center gap-1 sm:gap-2 
                      transition-colors text-xs sm:text-sm touch-target"
          >
            <UserCheck size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Chấp nhận</span>
            <span className="sm:hidden">OK</span>
          </button>

          {/* Reject Button */}
          <button
            onClick={() => onReject(request._id)}
            className="flex-1 bg-gray-500 dark:bg-gray-600 hover:bg-gray-600 dark:hover:bg-gray-700 
                      active:bg-gray-700 dark:active:bg-gray-800 text-white px-2 sm:px-4 py-2 sm:py-2.5 
                      rounded-lg font-medium flex items-center justify-center gap-1 sm:gap-2 
                      transition-colors text-xs sm:text-sm touch-target"
          >
            <UserX size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Từ chối</span>
            <span className="sm:hidden">Từ chối</span>
          </button>
        </div>
      )}

      {/* Status Indicators */}
      {status === 'accepted' && (
        <div className="text-center text-green-600 dark:text-green-400 font-medium text-sm sm:text-base">
          ✓ Đã chấp nhận
        </div>
      )}

      {status === 'rejected' && (
        <div className="text-center text-red-600 dark:text-red-400 font-medium text-sm sm:text-base">
          ✗ Đã từ chối
        </div>
      )}
    </div>
  );
}
