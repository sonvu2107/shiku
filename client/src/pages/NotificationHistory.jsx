import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, CheckCheck, Trash2 } from "lucide-react";
import { api } from "../api";
import { safariPUT, safariDELETE } from "../utils/safariAPI.js";

/**
 * NotificationHistory - Trang lịch sử thông báo
 * Hiển thị danh sách thông báo với pagination, filter và bulk actions
 * @returns {JSX.Element} Component notification history page
 */
export default function NotificationHistory() {
  // ==================== STATE MANAGEMENT ====================
  
  // Notifications data
  const [notifications, setNotifications] = useState([]); // Danh sách thông báo
  const [loading, setLoading] = useState(true); // Loading state
  const [page, setPage] = useState(1); // Trang hiện tại
  const [hasMore, setHasMore] = useState(true); // Có thêm thông báo để load
  
  // Filter & Selection
  const [filter, setFilter] = useState("all"); // Filter: all, unread, read
  const [selectedNotifications, setSelectedNotifications] = useState([]); // Thông báo đã chọn
  
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications(1, true);
  }, [filter]);

  const loadNotifications = async (pageNum = 1, reset = false) => {
    try {
      setLoading(pageNum === 1);
      const filterParam = filter !== "all" ? `&filter=${filter}` : "";
      const data = await api(`/api/notifications?page=${pageNum}&limit=20${filterParam}`);
      
      if (reset) {
        setNotifications(data.notifications);
      } else {
        setNotifications(prev => [...prev, ...data.notifications]);
      }
      
      setHasMore(data.notifications.length === 20);
      setPage(pageNum);
    } catch (error) {
      // Silent handling for notifications loading error
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      loadNotifications(page + 1, false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await safariPUT(`/api/notifications/${notificationId}/read`, {}, "đánh dấu thông báo đã đọc");
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      // Silent handling for mark as read error
    }
  };

  const markAllAsRead = async () => {
    try {
      await safariPUT("/api/notifications/mark-all-read", {}, "đánh dấu tất cả thông báo đã đọc");
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setSelectedNotifications([]);
    } catch (error) {
      // Silent handling for mark all as read error
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await safariDELETE(`/api/notifications/${notificationId}`, "xóa thông báo");
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      setSelectedNotifications(prev => prev.filter(id => id !== notificationId));
    } catch (error) {
      // Silent handling for notification deletion error
    }
  };

  const deleteSelected = async () => {
    if (selectedNotifications.length === 0) return;
    
    try {
      await Promise.all(
        selectedNotifications.map(id => 
          safariDELETE(`/api/notifications/${id}`, "xóa thông báo")
        )
      );
      
      setNotifications(prev => 
        prev.filter(n => !selectedNotifications.includes(n._id))
      );
      setSelectedNotifications([]);
    } catch (error) {
      // Silent handling for notifications deletion error
    }
  };

  const toggleSelectNotification = (notificationId) => {
    setSelectedNotifications(prev => 
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  const selectAll = () => {
    const visibleIds = notifications.map(n => n._id);
    setSelectedNotifications(
      selectedNotifications.length === visibleIds.length ? [] : visibleIds
    );
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
    
    // Navigate to relevant page if URL is provided
    if (notification.data?.url) {
      navigate(notification.data.url);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-gray-50 pt-16 sm:pt-20">
      <div className="max-w-5xl mx-auto p-3 sm:p-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors touch-target"
              >
                <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">Lịch sử thông báo</h1>
                <p className="text-gray-500 text-xs sm:text-sm">Quản lý và theo dõi tất cả thông báo của bạn</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 rounded-xl transition-all font-medium text-sm sm:text-base touch-target"
                >
                  <CheckCheck size={14} className="sm:w-4 sm:h-4" />
                  <span className="whitespace-nowrap">
                    <span className="hidden sm:inline">Đánh dấu tất cả đã đọc ({unreadCount})</span>
                    <span className="sm:hidden">Đọc hết ({unreadCount})</span>
                  </span>
                </button>
              )}
              
              {selectedNotifications.length > 0 && (
                <button
                  onClick={deleteSelected}
                  className="flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 rounded-xl transition-all font-medium text-sm sm:text-base touch-target"
                >
                  <Trash2 size={14} className="sm:w-4 sm:h-4" />
                  <span className="whitespace-nowrap">
                    <span className="hidden sm:inline">Xóa đã chọn ({selectedNotifications.length})</span>
                    <span className="sm:hidden">Xóa ({selectedNotifications.length})</span>
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex gap-2 sm:gap-4 overflow-x-auto scrollbar-hide">
            {[
              { key: "all", label: "Tất cả", count: notifications.length },
              { key: "unread", label: "Chưa đọc", count: unreadCount },
              { key: "read", label: "Đã đọc", count: notifications.length - unreadCount }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg border-2 transition-all duration-200 whitespace-nowrap font-medium text-sm sm:text-base touch-target ${
                  filter === tab.key
                    ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                    : "border-gray-200 text-gray-600 hover:text-gray-800 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <span className="mr-1 sm:mr-2">{tab.label}</span>
                <span className={`text-xs sm:text-sm px-2 py-1 rounded-full ${
                  filter === tab.key 
                    ? "bg-blue-200 text-blue-800" 
                    : "bg-gray-200 text-gray-600"
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Bulk Actions */}
        {notifications.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedNotifications.length === notifications.length && notifications.length > 0}
                  onChange={selectAll}
                  className="rounded w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 font-medium">
                  Chọn tất cả thông báo
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  Đã chọn:
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                  {selectedNotifications.length}/{notifications.length}
                </span>
              </div>
            </label>
          </div>
        )}

        {/* Notifications List */}
        <div className="space-y-4">
          {loading && page === 1 ? (
            <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-200">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <div className="text-gray-500 font-medium">Đang tải thông báo...</div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-200">
              <div className="text-6xl mb-4">🔔</div>
              <div className="text-gray-500 text-lg mb-2 font-semibold">
                {filter === "all" ? "Chưa có thông báo nào" : 
                 filter === "unread" ? "Không có thông báo chưa đọc" : 
                 "Không có thông báo đã đọc"}
              </div>
              <div className="text-gray-400 text-sm">
                {filter === "all" ? "Thông báo sẽ xuất hiện ở đây khi có hoạt động mới" : 
                 filter === "unread" ? "Tất cả thông báo đã được đọc" : 
                 "Chưa có thông báo nào được đánh dấu đã đọc"}
              </div>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification._id}
                className={`bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 ${
                  !notification.read ? "ring-2 ring-blue-100 border-blue-200" : ""
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={selectedNotifications.includes(notification._id)}
                        onChange={() => toggleSelectNotification(notification._id)}
                        className="rounded w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      {(notification.type === 'system' || notification.type === 'admin_message') && (
                        <div className="flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </div>
                      )}
                    </div>
                    
                    {!(notification.type === 'system' || notification.type === 'admin_message') && (
                      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gray-50 rounded-xl">
                        {getNotificationIcon(notification.type)}
                      </div>
                    )}
                    
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-gray-800 leading-tight text-sm sm:text-base truncate pr-2">
                          {notification.title}
                        </h3>
                        <div className="flex items-center gap-1 sm:gap-2 ml-2 flex-shrink-0">
                          {!notification.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification._id);
                              }}
                              className="text-blue-600 hover:text-blue-800 p-1.5 sm:p-2 rounded-lg hover:bg-blue-50 transition-all touch-target"
                              title="Đánh dấu đã đọc"
                            >
                              <Check size={14} className="sm:w-4 sm:h-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification._id);
                            }}
                            className="text-red-600 hover:text-red-800 p-1.5 sm:p-2 rounded-lg hover:bg-red-50 transition-all touch-target"
                            title="Xóa thông báo"
                          >
                            <Trash2 size={14} className="sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 mb-4 leading-relaxed text-sm sm:text-base line-clamp-2">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-gray-400 font-medium bg-gray-100 px-2 sm:px-3 py-1 rounded-full">
                          {getTimeAgo(notification.createdAt)}
                        </span>
                        {notification.sender && (
                          <span className="text-gray-500 bg-blue-50 text-blue-700 px-2 sm:px-3 py-1 rounded-full font-medium truncate max-w-[120px] sm:max-w-none" title={notification.sender.name}>
                            từ {notification.sender.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Load More */}
        {hasMore && !loading && notifications.length > 0 && (
          <div className="text-center mt-8">
            <button
              onClick={loadMore}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Tải thêm thông báo
            </button>
          </div>
        )}

        {loading && page > 1 && (
          <div className="text-center mt-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <div className="text-gray-500 text-sm font-medium">Đang tải thêm...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
