import { MessageCircle, UserMinus, Circle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import MessageButton from "./MessageButton";

/**
 * FriendCard - Component hiển thị thông tin bạn bè
 * Bao gồm avatar, tên, trạng thái online và các action buttons
 * @param {Object} friend - Thông tin bạn bè
 * @param {string} friend._id - ID của bạn bè
 * @param {string} friend.name - Tên hiển thị
 * @param {string} friend.avatarUrl - URL avatar
 * @param {boolean} friend.isOnline - Trạng thái online
 * @param {string} friend.lastSeen - Thời gian hoạt động cuối
 * @param {Function} onRemoveFriend - Callback khi hủy kết bạn
 * @param {boolean} showOnlineStatus - Hiển thị trạng thái online (default: true)
 */
export default function FriendCard({ friend, onRemoveFriend, showOnlineStatus = true }) {
  const navigate = useNavigate();
  
  return (
    <div className="bg-white rounded-lg border p-4 space-y-3">
      {/* Header với avatar và thông tin */}
      <div className="flex items-center gap-3">
        <div className="relative">
          {/* Avatar với click để xem profile */}
          <img
            src={friend.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.name)}&background=cccccc&color=222222&size=64`}
            alt="avatar"
            className="w-12 h-12 rounded-full object-cover border border-gray-300 bg-gray-100 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate(`/user/${friend._id}`)}
          />
          
          {/* Online status indicator */}
          {showOnlineStatus && (
            <div className="absolute -bottom-1 -right-1">
              <Circle 
                size={16} 
                className={`${
                  friend.isOnline 
                    ? 'text-green-500 fill-green-500' 
                    : 'text-gray-400 fill-gray-400'
                }`}
              />
            </div>
          )}
        </div>
        
        {/* Thông tin tên và trạng thái */}
        <div className="flex-1">
          <Link 
            to={`/user/${friend._id}`}
            className="font-semibold text-gray-800 hover:text-blue-600"
          >
            {friend.name}
          </Link>
          <div className="text-sm text-gray-500">
            {friend.isOnline ? (
              <span className="text-green-600">● Đang hoạt động</span>
            ) : (
              <span>Hoạt động {new Date(friend.lastSeen).toLocaleDateString('vi-VN')}</span>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {/* Message button */}
        <MessageButton 
          user={friend} 
          className="flex-1 btn flex items-center justify-center gap-2" 
        >
          <MessageCircle size={16} />
          Nhắn tin
        </MessageButton>
        
        {/* Remove friend button */}
        <button
          onClick={() => onRemoveFriend(friend._id)}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2 transition-colors"
        >
          <UserMinus size={16} />
          Hủy kết bạn
        </button>
      </div>
    </div>
  );
}
