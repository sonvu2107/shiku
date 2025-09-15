import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, X, Check, CheckCheck } from "lucide-react";
import { api } from "../api";

/**
 * NotificationBell - Component chuông thông báo với dropdown
 * Hiển thị số lượng thông báo chưa đọc và danh sách thông báo
 * @param {Object} user - Thông tin user hiện tại
 */
export default function NotificationBell({ user }) {
  // ==================== STATE MANAGEMENT ====================
  
  const [notifications, setNotifications] = useState([]); // Danh sách thông báo
  const [unreadCount, setUnreadCount] = useState(0); // Số thông báo chưa đọc
  const [showDropdown, setShowDropdown] = useState(false); // Hiện dropdown
  const [loading, setLoading] = useState(false); // Loading state
  const navigate = useNavigate();

  // ==================== EFFECTS ====================
  
  /**
   * Load unread count và setup polling khi user đăng nhập
   */
  useEffect(() => {
    if (user) {
      loadUnreadCount();
      // Polling mỗi 30 giây để cập nhật unread count
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // ==================== API FUNCTIONS ====================
  
  /**
   * Load số lượng thông báo chưa đọc
   */
  const loadUnreadCount = async () => {
    try {
      const data = await api("/api/notifications/unread-count");
      setUnreadCount(data.unreadCount);
    } catch (error) {
      console.error("Error loading unread count:", error);
    }
  };

  /**
   * Load danh sách thông báo (10 thông báo gần nhất)
   */
  const loadNotifications = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const data = await api("/api/notifications?limit=10");
      setNotifications(data.notifications);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await api(`/api/notifications/${notificationId}/read`, { method: "PUT" });
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api("/api/notifications/mark-all-read", { method: "PUT" });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleBellClick = () => {
    setShowDropdown(!showDropdown);
    if (!showDropdown) {
      loadNotifications();
    }
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
        className="relative p-2 text-gray-600 hover:text-gray-800 transition-colors"
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
        <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-[500px] overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-white">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-800 text-lg">Thông báo</h3>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium px-2 py-1 rounded-md hover:bg-blue-100 transition-all"
                  title="Đánh dấu tất cả đã đọc"
                >
                  <CheckCheck size={14} />
                  <span className="hidden sm:inline">Đọc hết</span>
                </button>
              )}
              <button
                onClick={() => setShowDropdown(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <div className="text-gray-500 text-sm">Đang tải...</div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-3">🔔</div>
                <div className="text-gray-500 font-medium mb-1">Không có thông báo nào</div>
                <div className="text-gray-400 text-sm">Thông báo mới sẽ xuất hiện ở đây</div>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-all duration-200 ${
                    !notification.read ? "bg-blue-50 border-blue-200" : ""
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
                            <h4 className="font-semibold text-gray-800 text-sm leading-tight">
                              {notification.title}
                            </h4>
                          </div>
                          {!notification.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification._id);
                              }}
                              className="text-blue-600 hover:text-blue-800 p-1 rounded-md hover:bg-blue-100 transition-all flex-shrink-0"
                              title="Đánh dấu đã đọc"
                            >
                              <Check size={14} />
                            </button>
                          )}
                        </div>
                        <div className="ml-6">
                          <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed mb-3">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400 font-medium">
                              {getTimeAgo(notification.createdAt)}
                            </span>
                            {notification.sender && (
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
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
                            <h4 className="font-semibold text-gray-800 text-sm leading-tight pr-2">
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification._id);
                                }}
                                className="text-blue-600 hover:text-blue-800 p-1 rounded-md hover:bg-blue-100 transition-all flex-shrink-0"
                                title="Đánh dấu đã đọc"
                              >
                                <Check size={14} />
                              </button>
                            )}
                          </div>
                          <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed mb-3">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400 font-medium">
                              {getTimeAgo(notification.createdAt)}
                            </span>
                            {notification.sender && (
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
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
            <div className="border-t border-gray-200 bg-gray-50 p-4">
              <button
                onClick={() => {
                  setShowDropdown(false);
                  navigate("/notifications");
                }}
                className="w-full text-blue-600 hover:text-blue-800 text-sm font-semibold py-3 px-4 rounded-lg hover:bg-blue-100 transition-all duration-200 border border-blue-200 hover:border-blue-300"
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