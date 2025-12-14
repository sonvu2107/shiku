import { MessageCircle, UserMinus, Circle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import MessageButton from "./MessageButton";
import UserName from "./UserName";
import UserAvatar from "./UserAvatar";

/**
 * FriendCard - Component show friend information
 * Includes avatar, name, online status, and action buttons
 * @param {Object} friend - Friend information
 * @param {string} friend._id - Friend's ID
 * @param {string} friend.name - Display name
 * @param {string} friend.avatarUrl - Avatar URL
 * @param {boolean} friend.isOnline - Online status
 * @param {string} friend.lastSeen - Last active time
 * @param {Function} onRemoveFriend - Callback when removing friend
 * @param {boolean} showOnlineStatus - Show online status (default: true)
 */
export default function FriendCard({ friend, onRemoveFriend, showOnlineStatus = true }) {
  const navigate = useNavigate();

  // Function to calculate last active time text
  const getLastSeenText = (lastSeen) => {
    if (!lastSeen) return 'Chưa có thông tin';

    const now = new Date();
    const lastSeenDate = new Date(lastSeen);

    // Check if lastSeenDate is valid
    if (isNaN(lastSeenDate.getTime())) return 'Chưa có thông tin';

    const diffMs = now - lastSeenDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Vừa truy cập';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;

    // If more than 7 days, display date
    return `Hoạt động ${lastSeenDate.toLocaleDateString('vi-VN')}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 space-y-3 transition-colors duration-200">
      {/* Header với avatar và thông tin */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative flex-shrink-0">
          {/* Avatar với click để xem profile */}
          <div
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate(`/user/${friend._id}`)}
          >
            <UserAvatar
              user={friend}
              size={48}
              showFrame={true}
              showBadge={true}
              className="hidden sm:block"
            />
            <UserAvatar
              user={friend}
              size={40}
              showFrame={true}
              showBadge={true}
              className="sm:hidden"
            />
          </div>

          {/* Online status indicator */}
          {showOnlineStatus && (
            <div className="absolute -bottom-1 -right-1 z-20">
              <Circle
                size={12}
                className={`sm:w-4 sm:h-4 ${friend.isOnline
                    ? 'text-green-500 fill-green-500'
                    : 'text-gray-400 dark:text-gray-500 fill-gray-400 dark:fill-gray-500'
                  }`}
              />
            </div>
          )}
        </div>

        {/* Name and status information */}
        <div className="flex-1 min-w-0">
          <Link
            to={`/user/${friend._id}`}
            className="font-semibold text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 text-sm sm:text-base truncate block transition-colors"
            title={friend.nickname || friend.name}
          >
            <UserName user={friend} maxLength={20} />
          </Link>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
            {friend.isOnline ? (
              <span className="text-green-600 dark:text-green-400">Đang hoạt động</span>
            ) : (
              <span>{getLastSeenText(friend.lastSeen)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-1 sm:gap-2">
        {/* Message button */}
        <MessageButton
          user={friend}
          className="flex-1 btn bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 text-white 
                    flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-2.5 touch-target"
        >
          <MessageCircle size={14} className="sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Nhắn tin</span>
          <span className="sm:hidden">Chat</span>
        </MessageButton>

        {/* Remove friend button */}
        <button
          onClick={() => onRemoveFriend(friend._id)}
          className="px-2 sm:px-4 py-2 sm:py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 
                    active:bg-gray-300 dark:active:bg-gray-500 text-gray-700 dark:text-gray-300 
                    border border-gray-300 dark:border-gray-600 rounded-lg 
                    flex items-center gap-1 sm:gap-2 transition-colors text-xs sm:text-sm touch-target"
        >
          <UserMinus size={14} className="sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Hủy kết bạn</span>
          <span className="sm:hidden">Hủy</span>
        </button>
      </div>
    </div>
  );
}
