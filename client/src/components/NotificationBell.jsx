import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, X, Check, CheckCheck } from "lucide-react";
import { api } from "../api";
import { 
  useNotifications, 
  useUnreadNotificationsCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead 
} from "../hooks/useNotifications";

/**
 * NotificationBell - Component ring bell for notifications
 * Displays the count of unread notifications and the notification list
 * @param {Object} user - Current user information
 */
export default function NotificationBell({ user }) {
  // ==================== STATE MANAGEMENT ====================
  
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  // React Query hooks
  const { data: notificationsData, isLoading: notificationsLoading } = useNotifications();
  const { data: unreadCountData } = useUnreadNotificationsCount();
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const notifications = notificationsData?.notifications || [];
  const unreadCount = unreadCountData?.unreadCount || 0;
  const loading = notificationsLoading;

  // ==================== API FUNCTIONS ====================

  const markAsRead = async (notificationId) => {
    try {
      await markReadMutation.mutateAsync(notificationId);
    } catch (error) {
      // Silent handling for mark as read error
    }
  };

  const markAllAsRead = async () => {
    try {
      await markAllReadMutation.mutateAsync();
    } catch (error) {
      // Silent handling for mark all as read error
    }
  };

  const handleBellClick = () => {
    setShowDropdown(!showDropdown);
    // React Query will automatically load notifications when needed  
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "comment": return <span className="text-lg">💬</span>;
      case "reply": return <span className="text-lg">↩️</span>;
      case "reaction": return <span className="text-lg">👍</span>;
      case "ban": return <span className="text-lg">🚫</span>;
      case "unban": return <span className="text-lg">✅</span>;
      case "system": return (
        <span className="bg-blue-600 text-white text-xs px-1 py-0.5 rounded font-bold">
          SYSTEM
        </span>
      );
      case "admin_message": return (
        <span className="bg-red-600 text-white text-xs px-1 py-0.5 rounded font-bold">
          ADMIN
        </span>
      );
      default: return <span className="text-lg">🔔</span>;
    }
  };

  const getTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return "Vừa xong";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
    return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification._id);
    }
    if (notification.data?.url) {
      navigate(notification.data.url);
    }
  };

  if (!user) return null;

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={handleBellClick}
        className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-[500px] overflow-hidden dropdown-mobile">
          {/* Header */}
          <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-blue-50 to-white dark:from-gray-800 dark:to-gray-800">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base sm:text-lg">Thông báo</h3>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 active:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium px-2 py-1 rounded-md hover:bg-blue-100 active:bg-blue-200 dark:hover:bg-gray-700 dark:active:bg-gray-600 transition-all touch-target"
                  title="Đánh dấu tất cả đã đọc"
                >
                  <CheckCheck size={14} />
                  <span className="hidden sm:inline">Đọc hết</span>
                </button>
              )}
              <button
                onClick={() => setShowDropdown(false)}
                className="text-gray-400 hover:text-gray-600 active:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 transition-colors touch-target"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 sm:p-6 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <div className="text-gray-500 dark:text-gray-300 text-sm">Đang tải...</div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 sm:p-8 text-center">
                <div className="text-3xl sm:text-4xl mb-3">🔔</div>
                <div className="text-gray-500 dark:text-gray-300 font-medium mb-1 text-sm sm:text-base">Không có thông báo nào</div>
                <div className="text-gray-400 dark:text-gray-400/80 text-xs sm:text-sm">Thông báo mới sẽ xuất hiện ở đây</div>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-3 sm:p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 transition-all duration-200 touch-feedback ${
                    !notification.read ? "bg-blue-50 dark:bg-gray-700/40 border-blue-200 dark:border-gray-600" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {(notification.type === 'system' || notification.type === 'admin_message') ? (
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-shrink-0">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-xs sm:text-sm leading-tight">
                              {notification.title}
                            </h4>
                          </div>
                          {!notification.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification._id);
                              }}
                              className="text-blue-600 hover:text-blue-800 active:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded-md hover:bg-blue-100 dark:hover:bg-gray-700 active:bg-blue-200 transition-all flex-shrink-0 touch-target"
                              title="Đánh dấu đã đọc"
                            >
                              <Check size={14} />
                            </button>
                          )}
                        </div>
                        <div className="ml-6">
                          <p className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm line-clamp-2 leading-relaxed mb-2 sm:mb-3">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400 font-medium">
                              {getTimeAgo(notification.createdAt)}
                            </span>
                            {notification.sender && (
                              <span className="text-xs text-gray-500 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                                từ {notification.sender.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="mt-0.5 flex-shrink-0 w-8 h-8 flex items-center justify-center">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-xs sm:text-sm leading-tight pr-2">
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification._id);
                                }}
                                className="text-blue-600 hover:text-blue-800 active:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded-md hover:bg-blue-100 dark:hover:bg-gray-700 active:bg-blue-200 transition-all flex-shrink-0 touch-target"
                                title="Đánh dấu đã đọc"
                              >
                                <Check size={14} />
                              </button>
                            )}
                          </div>
                          <p className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm line-clamp-2 leading-relaxed mb-2 sm:mb-3">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400 font-medium">
                              {getTimeAgo(notification.createdAt)}
                            </span>
                            {notification.sender && (
                              <span className="text-xs text-gray-500 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                                từ {notification.sender.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer - Outside scroll area */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 sm:p-4">
              <button
                onClick={() => {
                  setShowDropdown(false);
                  navigate("/notifications");
                }}
                className="w-full text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 active:text-blue-900 text-sm font-semibold py-3 px-4 rounded-lg hover:bg-blue-100 dark:hover:bg-gray-700 active:bg-blue-200 transition-all duration-200 border border-blue-200 dark:border-gray-700 hover:border-blue-300 active:border-blue-400 touch-target"
              >
                Xem tất cả thông báo
              </button>
            </div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}