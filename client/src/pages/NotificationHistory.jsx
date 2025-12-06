import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, CheckCheck, Trash2, Bell } from "lucide-react";
import { api } from "../api";
import { PageLayout, PageHeader, SpotlightCard } from "../components/ui/DesignSystem";
import { motion } from "framer-motion";
import { cn } from "../utils/cn";
import BackToTop from "../components/BackToTop";

/**
 * NotificationHistory - Trang lịch sử thông báo (Monochrome Luxury Style)
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
  const [filter, setFilter] = useState("all"); // Bộ lọc: tất cả, chưa đọc, đã đọc
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
      await api(`/api/notifications/${notificationId}/read`, {
        method: "PUT",
        body: {}
      });
      setNotifications(prev =>
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      // Silent handling for mark as read error
    }
  };

  const markAllAsRead = async () => {
    try {
      await api("/api/notifications/mark-all-read", {
        method: "PUT",
        body: {}
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setSelectedNotifications([]);
    } catch (error) {
      // Silent handling for mark all as read error
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await api(`/api/notifications/${notificationId}`, {
        method: "DELETE"
      });
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
          api(`/api/notifications/${id}`, { method: "DELETE" })
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
        <span className="bg-neutral-900 dark:bg-white text-white dark:text-black text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
          SYSTEM
        </span>
      );
      case "admin_message": return (
        <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
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

    // Điều hướng đến trang có liên quan nếu URL được cung cấp
    if (notification.data?.url) {
      navigate(notification.data.url);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <PageLayout>
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="group flex items-center gap-2 text-neutral-500 hover:text-black dark:hover:text-white mb-6 transition-colors"
      >
        <div className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-900 group-hover:bg-neutral-200 dark:group-hover:bg-neutral-800 transition-colors">
          <ArrowLeft size={20} />
        </div>
        <span className="font-medium">Quay lại</span>
      </button>

      {/* Header */}
      <PageHeader
        title="Lịch sử thông báo"
        subtitle="Quản lý và theo dõi tất cả thông báo của bạn"
        action={
          <div className="flex flex-wrap gap-3">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-semibold text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2"
              >
                <CheckCheck size={18} />
                <span>Đánh dấu tất cả đã đọc ({unreadCount})</span>
              </button>
            )}

            {selectedNotifications.length > 0 && (
              <button
                onClick={deleteSelected}
                className="px-4 py-2 rounded-full bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Trash2 size={18} />
                <span>Xóa đã chọn ({selectedNotifications.length})</span>
              </button>
            )}
          </div>
        }
      />

      {/* Filter Tabs */}
      <div className="sticky top-24 z-30 mb-8">
        <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl rounded-full p-1.5 flex gap-2 shadow-sm border border-neutral-200 dark:border-neutral-800 max-w-md">
          {[
            { key: "all", label: "Tất cả", count: notifications.length },
            { key: "unread", label: "Chưa đọc", count: unreadCount },
            { key: "read", label: "Đã đọc", count: notifications.length - unreadCount }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-bold transition-all duration-300",
                filter === tab.key
                  ? "bg-black dark:bg-white text-white dark:text-black shadow-md"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/10"
              )}
            >
              <span>{tab.label}</span>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full font-bold",
                filter === tab.key
                  ? "bg-white/20 dark:bg-black/20"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions */}
      {notifications.length > 0 && (
        <SpotlightCard className="mb-6">
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedNotifications.length === notifications.length && notifications.length > 0}
                onChange={selectAll}
                className="w-5 h-5 rounded border-neutral-300 dark:border-neutral-700 text-black dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white"
              />
              <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                Chọn tất cả thông báo
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                Đã chọn:
              </span>
              <span className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-full text-sm font-bold">
                {selectedNotifications.length}/{notifications.length}
              </span>
            </div>
          </label>
        </SpotlightCard>
      )}

      {/* Notifications List */}
      <div className="space-y-4">
        {loading && page === 1 ? (
          <SpotlightCard>
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-black dark:border-white mx-auto mb-4"></div>
              <div className="text-neutral-500 dark:text-neutral-400 font-medium">Đang tải thông báo...</div>
            </div>
          </SpotlightCard>
        ) : notifications.length === 0 ? (
          <SpotlightCard>
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-neutral-400" />
              </div>
              <div className="text-neutral-900 dark:text-white text-lg mb-2 font-bold">
                {filter === "all" ? "Chưa có thông báo nào" :
                  filter === "unread" ? "Không có thông báo chưa đọc" :
                    "Không có thông báo đã đọc"}
              </div>
              <div className="text-neutral-500 dark:text-neutral-400 text-sm">
                {filter === "all" ? "Thông báo sẽ xuất hiện ở đây khi có hoạt động mới" :
                  filter === "unread" ? "Tất cả thông báo đã được đọc" :
                    "Chưa có thông báo nào được đánh dấu đã đọc"}
              </div>
            </div>
          </SpotlightCard>
        ) : (
          notifications.map((notification, index) => (
            <motion.div
              key={notification._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <SpotlightCard
                className={cn(
                  "cursor-pointer transition-all",
                  !notification.read && "ring-2 ring-neutral-200 dark:ring-neutral-800"
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-4">
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={selectedNotifications.includes(notification._id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelectNotification(notification._id);
                      }}
                      className="w-5 h-5 rounded border-neutral-300 dark:border-neutral-700 text-black dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white"
                      onClick={(e) => e.stopPropagation()}
                    />
                    {(notification.type === 'system' || notification.type === 'admin_message') && (
                      <div className="flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                    )}
                  </div>

                  {!(notification.type === 'system' || notification.type === 'admin_message') && (
                    <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 rounded-2xl">
                      {getNotificationIcon(notification.type)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className={cn(
                        "font-bold leading-tight text-base truncate pr-2",
                        !notification.read
                          ? "text-neutral-900 dark:text-white"
                          : "text-neutral-600 dark:text-neutral-400"
                      )}>
                        {notification.title}
                      </h3>
                      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                        {!notification.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification._id);
                            }}
                            className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
                            title="Đánh dấu đã đọc"
                          >
                            <Check size={18} />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification._id);
                          }}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-500 p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                          title="Xóa thông báo"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    <p className="text-neutral-600 dark:text-neutral-400 mb-4 leading-relaxed text-sm line-clamp-2">
                      {notification.message}
                    </p>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-500 dark:text-neutral-500 font-medium bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-full">
                        {getTimeAgo(notification.createdAt)}
                      </span>
                      {notification.sender && (
                        <span className="text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-full font-medium truncate max-w-[150px]" title={notification.sender.name}>
                          từ {notification.sender.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </SpotlightCard>
            </motion.div>
          ))
        )}
      </div>

      {/* Load More */}
      {hasMore && !loading && notifications.length > 0 && (
        <div className="text-center mt-8">
          <button
            onClick={loadMore}
            className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg"
          >
            Tải thêm thông báo
          </button>
        </div>
      )}

      {loading && page > 1 && (
        <div className="text-center mt-8">
          <SpotlightCard>
            <div className="py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-black dark:border-white mx-auto mb-2"></div>
              <div className="text-neutral-500 dark:text-neutral-400 text-sm font-medium">Đang tải thêm...</div>
            </div>
          </SpotlightCard>
        </div>
      )}
      <BackToTop />
    </PageLayout>
  );
}
