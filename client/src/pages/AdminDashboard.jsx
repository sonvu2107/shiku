import { useEffect, useState, useMemo, useCallback } from "react";
import AdminFeedback from "./AdminFeedback";
import APIMonitoring from "../components/APIMonitoring";
import NotificationForm from "../components/NotificationForm";
import ErrorBoundary from "../components/ErrorBoundary";
import { api } from "../api";
import { useNavigate } from "react-router-dom";
import { useAdminData } from "../hooks/useAdminData";
import { useAdminActions } from "../hooks/useAdminActions";
import {
  BarChart3,
  Users,
  FileText,
  Eye,
  MessageCircle,
  Heart,
  Crown,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  Bell,
  Wifi,
  WifiOff,
  UserCheck,
  Code,
  Activity
} from "lucide-react";

// Constants for ban durations
const BAN_DURATIONS = [
  { value: "15", label: "15 phút" },
  { value: "30", label: "30 phút" },
  { value: "60", label: "1 giờ" },
  { value: "180", label: "3 giờ" },
  { value: "360", label: "6 giờ" },
  { value: "720", label: "12 giờ" },
  { value: "1440", label: "1 ngày" },
  { value: "4320", label: "3 ngày" },
  { value: "10080", label: "1 tuần" },
  { value: "permanent", label: "Vĩnh viễn" }
];

// Constants for user roles
const USER_ROLES = [
  { value: "user", label: "User" },
  { value: "sololeveling", label: "Solo" },
  { value: "sybau", label: "Sybau" },
  { value: "moxumxue", label: "Keeper" },
  { value: "admin", label: "Admin" },
  { value: "gay", label: "Gay" },
  { value: "special", label: "Special" }
];

/**
 * AdminDashboard - Trang quản trị admin
 * Bao gồm thống kê, quản lý người dùng, ban/unban, gửi thông báo và xem feedback
 * @returns {JSX.Element} Component admin dashboard page
 */
export default function AdminDashboard() {
  // ==================== CUSTOM HOOKS ====================
  
  // Admin data management
  const {
    stats,
    users,
    onlineUsers,
    totalVisitors,
    visitorStats,
    lastUpdate,
    loading: dataLoading,
    error: dataError,
    refreshAllData,
    updateOfflineUsers
  } = useAdminData();

  // Admin actions management
  const {
    banForm,
    notificationForm,
    loading: actionLoading,
    error: actionError,
    success: actionSuccess,
    setBanForm,
    setNotificationForm,
    handleBanSubmit,
    handleNotificationSubmit,
    unbanUser,
    clearError,
    clearSuccess
  } = useAdminActions();

  // ==================== LOCAL STATE ====================

  // User & Auth
  const [user, setUser] = useState(null); // Admin user hiện tại

  // UI states
  const [activeTab, setActiveTab] = useState("stats"); // Tab hiện tại

  const navigate = useNavigate();

  // Memoize combined loading state
  const loading = useMemo(() => dataLoading || actionLoading, [dataLoading, actionLoading]);

  // Memoize filtered users for ban form
  const bannableUsers = useMemo(() =>
    users.filter(u => u.role !== "admin" && u._id !== user?._id),
    [users, user]
  );

  // Memoize banned users list
  const bannedUsers = useMemo(() =>
    users.filter(u => u.isBanned),
    [users]
  );

  // Check admin authorization
  const checkAdmin = useCallback(async () => {
    try {
      const res = await api("/api/auth/me");
      if (res.user.role !== "admin") {
        alert("Bạn không có quyền truy cập trang này!");
        navigate("/");
        return;
      }
      setUser(res.user);
      await refreshAllData();
    } catch (e) {
      alert("Lỗi xác thực!");
      navigate("/login");
    }
  }, [navigate, refreshAllData]);

  // Update user role handler
  const updateUserRole = useCallback(async (userId, newRole) => {
    if (!window.confirm(`Bạn có chắc muốn đổi role user này thành ${newRole}?`)) return;
    try {
      await api(`/api/admin/users/${userId}/role`, {
        method: "PUT",
        body: { role: newRole }
      });
      await refreshAllData();
      alert("Đã cập nhật role cho user!");
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  }, [refreshAllData]);

  // Delete user handler
  const deleteUser = useCallback(async (userId) => {
    if (!window.confirm("Bạn có chắc muốn xóa người dùng này? Tất cả bài viết và bình luận của họ sẽ bị xóa!")) return;
    try {
      await api(`/api/admin/users/${userId}`, { method: "DELETE" });
      await refreshAllData();
      alert("Đã xóa người dùng!");
    } catch (e) {
      alert("Lỗi: " + e.message);
    }
  }, [refreshAllData]);

  // Handle unban with refresh
  const handleUnban = useCallback(async (userId) => {
    if (await unbanUser(userId)) {
      await refreshAllData();
    }
  }, [unbanUser, refreshAllData]);

  useEffect(() => {
    checkAdmin();
  }, [checkAdmin]);

  // Auto refresh data when tab changes
  useEffect(() => {
    if (activeTab === "online" || activeTab === "stats") {
      refreshAllData();
    }
  }, [activeTab, refreshAllData]);

  if (loading) {
    return (
      <div className="w-full px-6 py-6 pt-20">
        <div className="card max-w-4xl mx-auto">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="w-full px-3 sm:px-6 py-6 pt-20 space-y-4 sm:space-y-6">
      {/* Header */}
      {/* Error and Success Messages */}
      {(dataError || actionError) && (
        <div className="card max-w-7xl mx-auto mb-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {dataError || actionError}
            <button onClick={clearError} className="ml-2 text-red-500 hover:text-red-700">
              ×
            </button>
          </div>
        </div>
      )}
      
      {actionSuccess && (
        <div className="card max-w-7xl mx-auto mb-4">
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {actionSuccess}
            <button onClick={clearSuccess} className="ml-2 text-green-500 hover:text-green-700">
              ×
            </button>
          </div>
        </div>
      )}

      <div className="card max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold mb-2">QUẢN LÝ NGƯỜI DÙNG</h1>
            <div className="text-sm sm:text-base text-gray-600">Chào mừng, {user?.name}!</div>
          </div>
          <button
            onClick={refreshAllData}
            className="btn-outline btn-sm flex items-center gap-2 w-full sm:w-auto justify-center touch-target"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Làm mới
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="card max-w-7xl mx-auto">
        <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700 scrollbar-hide">
          <button
            className={`px-3 sm:px-4 py-2 font-medium flex items-center gap-1 sm:gap-2 whitespace-nowrap touch-target ${activeTab === "stats" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
            onClick={() => setActiveTab("stats")}
          >
            <BarChart3 size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="text-sm sm:text-base">Thống kê</span>
          </button>
          <button
            className={`px-3 sm:px-4 py-2 font-medium flex items-center gap-1 sm:gap-2 whitespace-nowrap touch-target ${activeTab === "users" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
            onClick={() => setActiveTab("users")}
          >
            <Users size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="text-sm sm:text-base">Người dùng</span>
          </button>
          <button
            className={`px-3 sm:px-4 py-2 font-medium flex items-center gap-1 sm:gap-2 whitespace-nowrap touch-target ${activeTab === "bans" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
            onClick={() => setActiveTab("bans")}
          >
            <Crown size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="text-sm sm:text-base">Cấm</span>
          </button>
          <button
            className={`px-3 sm:px-4 py-2 font-medium flex items-center gap-1 sm:gap-2 whitespace-nowrap touch-target ${activeTab === "notifications" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
            onClick={() => setActiveTab("notifications")}
          >
            <Bell size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="text-sm sm:text-base">Thông báo</span>
          </button>
          <button
            className={`px-3 sm:px-4 py-2 font-medium flex items-center gap-1 sm:gap-2 whitespace-nowrap touch-target ${activeTab === "online" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
            onClick={() => setActiveTab("online")}
          >
            <Wifi size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="text-sm sm:text-base">Truy cập</span>
          </button>
          <button
            className={`px-3 sm:px-4 py-2 font-medium flex items-center gap-1 sm:gap-2 whitespace-nowrap touch-target ${activeTab === "feedback" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
            onClick={() => setActiveTab("feedback")}
          >
            <MessageCircle size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="text-sm sm:text-base">Góp ý</span>
          </button>
          <button
            className={`px-3 sm:px-4 py-2 font-medium flex items-center gap-1 sm:gap-2 whitespace-nowrap touch-target ${activeTab === "api-monitoring" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
            onClick={() => setActiveTab("api-monitoring")}
          >
            <Activity size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="text-sm sm:text-base">API Monitor</span>
          </button>
          <button
            className={`px-3 sm:px-4 py-2 font-medium flex items-center gap-1 sm:gap-2 whitespace-nowrap touch-target ${activeTab === "api" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
            onClick={() => setActiveTab("api")}
          >
            <Code size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="text-sm sm:text-base">API Test</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="card max-w-7xl mx-auto">
        <ErrorBoundary>
        {/* Stats Tab */}
        {activeTab === "stats" && stats && (
          <div className="pt-4">
            <h2 className="text-lg sm:text-xl font-bold mb-4">Thống kê tổng quan</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {/* Bài viết */}
              <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="text-blue-600 sm:w-6 sm:h-6" size={20} />
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">
                    {stats.overview ? stats.overview.totalPosts.count : stats.totalPosts}
                  </div>
                </div>
                <div className="text-sm sm:text-base text-gray-600">Tổng bài viết</div>
                {stats.overview && (
                  <div className="mt-2 text-sm">
                    <div className="text-gray-500">
                      Tháng này: {stats.overview.totalPosts.thisMonth}
                    </div>
                    <div className={`flex items-center ${stats.overview.totalPosts.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.overview.totalPosts.growth >= 0 ?
                        <TrendingUp size={14} className="mr-1" /> :
                        <TrendingDown size={14} className="mr-1" />
                      }
                      {Math.abs(stats.overview.totalPosts.growth)}% so với tháng trước
                    </div>
                  </div>
                )}
              </div>

              {/* Lượt xem */}
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="text-green-600" size={24} />
                  <div className="text-2xl font-bold text-green-600">
                    {stats.overview ? stats.overview.totalViews.count : stats.totalViews}
                  </div>
                </div>
                <div className="text-gray-600">Tổng lượt xem</div>
                {stats.overview && (
                  <div className="mt-2 text-sm">
                    <div className="text-gray-500">
                      Tháng này: {stats.overview.totalViews.thisMonth}
                    </div>
                    <div className={`flex items-center ${stats.overview.totalViews.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <span className="mr-1">
                        {stats.overview.totalViews.growth >= 0 ? '↗' : '↘'}
                      </span>
                      {Math.abs(stats.overview.totalViews.growth)}% so với tháng trước
                    </div>
                  </div>
                )}
              </div>

              {/* Bình luận */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle className="text-purple-600" size={24} />
                  <div className="text-2xl font-bold text-purple-600">
                    {stats.overview ? stats.overview.totalComments.count : stats.totalComments}
                  </div>
                </div>
                <div className="text-gray-600">Tổng bình luận</div>
                {stats.overview && (
                  <div className="mt-2 text-sm">
                    <div className="text-gray-500">
                      Tháng này: {stats.overview.totalComments.thisMonth}
                    </div>
                    <div className={`flex items-center ${stats.overview.totalComments.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <span className="mr-1">
                        {stats.overview.totalComments.growth >= 0 ? '↗' : '↘'}
                      </span>
                      {Math.abs(stats.overview.totalComments.growth)}% so với tháng trước
                    </div>
                  </div>
                )}
              </div>

              {/* Emotes */}
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="text-red-600" size={24} />
                  <div className="text-2xl font-bold text-red-600">
                    {stats.overview ? stats.overview.totalEmotes.count : stats.totalEmotes}
                  </div>
                </div>
                <div className="text-gray-600">Tổng emote</div>
                {stats.overview && (
                  <div className="mt-2 text-sm">
                    <div className="text-gray-500">
                      Tháng này: {stats.overview.totalEmotes.thisMonth}
                    </div>
                    <div className={`flex items-center ${stats.overview.totalEmotes.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <span className="mr-1">
                        {stats.overview.totalEmotes.growth >= 0 ? '↗' : '↘'}
                      </span>
                      {Math.abs(stats.overview.totalEmotes.growth)}% so với tháng trước
                    </div>
                  </div>
                )}
              </div>

              {/* Người dùng */}
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="text-yellow-600" size={24} />
                  <div className="text-2xl font-bold text-yellow-600">
                    {stats.overview ? stats.overview.totalUsers.count : stats.totalUsers}
                  </div>
                </div>
                <div className="text-gray-600">Tổng người dùng</div>
                {stats.overview && (
                  <div className="mt-2 text-sm">
                    <div className="text-gray-500">
                      Tháng này: {stats.overview.totalUsers.thisMonth}
                    </div>
                    <div className={`flex items-center ${stats.overview.totalUsers.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <span className="mr-1">
                        {stats.overview.totalUsers.growth >= 0 ? '↗' : '↘'}
                      </span>
                      {Math.abs(stats.overview.totalUsers.growth)}% so với tháng trước
                    </div>
                  </div>
                )}
              </div>

              {/* Bài đã xuất bản */}
              <div className="bg-indigo-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="text-indigo-600" size={24} />
                  <div className="text-2xl font-bold text-indigo-600">
                    {stats.overview ? stats.overview.publishedPosts.count : stats.publishedPosts}
                  </div>
                </div>
                <div className="text-gray-600">Bài đã đăng</div>
                {stats.overview && (
                  <div className="mt-2 text-sm">
                    <div className="text-gray-500">
                      Tháng này: {stats.overview.publishedPosts.thisMonth}
                    </div>
                    <div className={`flex items-center ${stats.overview.publishedPosts.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <span className="mr-1">
                        {stats.overview.publishedPosts.growth >= 0 ? '↗' : '↘'}
                      </span>
                      {Math.abs(stats.overview.publishedPosts.growth)}% so với tháng trước
                    </div>
                  </div>
                )}
              </div>

              {/* Bài riêng tư */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Edit className="text-gray-600" size={24} />
                  <div className="text-2xl font-bold text-gray-600">
                    {stats.overview ? stats.overview.draftPosts.count : stats.draftPosts}
                  </div>
                </div>
                <div className="text-gray-600">Bài riêng tư</div>
                {stats.overview && (
                  <div className="mt-2 text-sm">
                    <div className="text-gray-500">
                      Tháng này: {stats.overview.draftPosts.thisMonth}
                    </div>
                    <div className={`flex items-center ${stats.overview.draftPosts.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <span className="mr-1">
                        {stats.overview.draftPosts.growth >= 0 ? '↗' : '↘'}
                      </span>
                      {Math.abs(stats.overview.draftPosts.growth)}% so với tháng trước
                    </div>
                  </div>
                )}
              </div>

              {/* Admin */}
              <div className="bg-pink-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="text-pink-600" size={24} />
                  <div className="text-2xl font-bold text-pink-600">
                    {stats.overview ? stats.overview.adminUsers.count : stats.adminUsers}
                  </div>
                </div>
                <div className="text-gray-600">Admin</div>
                {stats.overview && (
                  <div className="mt-2 text-sm">
                    <div className="text-gray-500">
                      Tháng này: {stats.overview.adminUsers.thisMonth}
                    </div>
                    <div className={`flex items-center ${stats.overview.adminUsers.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <span className="mr-1">
                        {stats.overview.adminUsers.growth >= 0 ? '↗' : '↘'}
                      </span>
                      {Math.abs(stats.overview.adminUsers.growth)}% so với tháng trước
                    </div>
                  </div>
                )}
              </div>

              {/* Người online */}
              <div className="bg-emerald-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Wifi className="text-emerald-600" size={24} />
                  <div className="text-2xl font-bold text-emerald-600">
                    {onlineUsers.length}
                  </div>
                </div>
                <div className="text-gray-600">Đang online</div>
                <div className="mt-2 text-sm">
                  <div className="text-gray-500">
                    {Math.max(0, users.length - onlineUsers.length)} người offline
                  </div>
                </div>
              </div>

              {/* Tổng lượt truy cập */}
              <div className="bg-cyan-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck className="text-cyan-600" size={24} />
                  <div className="text-2xl font-bold text-cyan-600">
                    {totalVisitors.toLocaleString()}
                  </div>
                </div>
                <div className="text-gray-600">Tổng lượt truy cập</div>
                {visitorStats && (
                  <div className="mt-2 text-sm space-y-1">
                    <div className="text-gray-500">
                      {visitorStats.totalUsers} người đã đăng ký
                    </div>
                    <div className="text-gray-500">
                      {visitorStats.usersWithActivity} người đã hoạt động
                    </div>
                    <div className="text-gray-500">
                      {visitorStats.onlineUsers} đang online
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Top Stats */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Posts */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="font-bold mb-3">Top 5 bài viết có nhiều lượt xem nhất</h3>
                {stats.topPosts?.map((post, index) => (
                  <div key={post._id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                    <div>
                      <div className="font-medium text-sm">{index + 1}. {post.title}</div>
                      <div className="text-xs text-gray-500">by {post.author?.name}</div>
                    </div>
                    <div className="text-sm font-medium text-blue-600">{post.views} views</div>
                  </div>
                ))}
              </div>

              {/* Top Users */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="font-bold mb-3">Top 5 user có nhiều bài viết nhất</h3>
                {stats.topUsers?.map((userStat, index) => (
                  <div key={userStat._id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                    <div>
                      <div className="font-medium text-sm">{index + 1}. {userStat.name}</div>
                      <div className="text-xs text-gray-500">{userStat.role === "admin" ? "Admin" : "User"}</div>
                    </div>
                    <div className="text-sm font-medium text-green-600">{userStat.postCount} bài</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="pt-4">
            <h2 className="text-lg sm:text-xl font-bold mb-4">Quản lý người dùng ({users.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200 dark:border-gray-700 min-w-[600px]">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Avatar</th>
                    <th className="px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Tên</th>
                    <th className="px-2 sm:px-4 py-2 text-left text-xs sm:text-sm hidden sm:table-cell">Email</th>
                    <th className="px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Quyền</th>
                    <th className="px-2 sm:px-4 py-2 text-left text-xs sm:text-sm hidden md:table-cell">Ngày tham gia</th>
                    <th className="px-2 sm:px-4 py-2 text-left text-xs sm:text-sm hidden lg:table-cell">Số bài viết</th>
                    <th className="px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id} className="border-t border-gray-200 dark:border-gray-700">
                      <td className="px-2 sm:px-4 py-2">
                        <img
                          src={u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=cccccc&color=222222&size=40`}
                          alt="avatar"
                          className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover"
                        />
                      </td>
                      <td className="px-2 sm:px-4 py-2 font-medium flex items-center gap-1 sm:gap-2">
                        <span className="text-xs sm:text-sm truncate">{u.name}</span>
                        {u.isVerified && (
                          <img
                            src={
                              u.role === "sololeveling" ? "/assets/Sung-tick.png"
                                : u.role === "sybau" ? "/assets/Sybau-tick.png"
                                  : u.role === "moxumexue" ? "/assets/moxumxue.png"
                                    : u.role === "gay" ? "/assets/gay.png"
                                      : u.role === "special" ? "/assets/special-user.jpg"
                                        : "/assets/default-tick.png"
                            }
                            alt="Tích xanh"
                            className="inline w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
                          />
                        )}
                      </td>
                      <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm hidden sm:table-cell truncate max-w-[150px]">{u.email}</td>
                      <td className="px-2 sm:px-4 py-2">
                        <select
                          value={u.role}
                          onChange={(e) => updateUserRole(u._id, e.target.value)}
                          disabled={u._id === user._id}
                          className="btn-outline btn-xs sm:btn-sm text-xs sm:text-sm touch-target"
                        >
                          {USER_ROLES.map(role => (
                            <option key={role.value} value={role.value}>{role.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm hidden md:table-cell">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm hidden lg:table-cell">{u.postCount}</td>
                      <td className="px-2 sm:px-4 py-2">
                        <div className="flex gap-1 sm:gap-2">
                          <button
                            className="btn-outline btn-xs sm:btn-sm text-red-600 touch-target"
                            onClick={() => deleteUser(u._id)}
                            disabled={u._id === user._id}
                          >
                            <span className="hidden sm:inline">Xóa</span>
                            <span className="sm:hidden">Xóa</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

{/* Ban Management Tab */}
{activeTab === "bans" && (
  <div className="pt-4">
    <h2 className="text-xl font-bold mb-4">Quản lý cấm người dùng</h2>

    {/* Ban Form */}
    <div className="bg-gray-50 p-4 rounded-lg mb-6">
      <h3 className="font-semibold mb-3">Cấm người dùng</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Chọn user */}
        <select
          value={banForm.userId}
          onChange={(e) => setBanForm({ ...banForm, userId: e.target.value })}
          className="input"
        >
          <option value="">Chọn người dùng</option>
          {bannableUsers.map(u => (
            <option key={u._id} value={u._id}>
              {u.name} ({u.email})
            </option>
          ))}
        </select>

        {/* Thời gian cấm */}
        <select
          value={banForm.duration}
          onChange={(e) => setBanForm({ ...banForm, duration: e.target.value })}
          className="input"
        >
          <option value="">Chọn thời gian cấm</option>
          {BAN_DURATIONS.map(duration => (
            <option key={duration.value} value={duration.value}>{duration.label}</option>
          ))}
        </select>

        {/* Lý do */}
        <input
          type="text"
          value={banForm.reason}
          onChange={(e) => setBanForm({ ...banForm, reason: e.target.value })}
          placeholder="Nhập lý do cấm..."
          className="input"
        />

        <button
          onClick={handleBanSubmit}
          className="btn bg-red-600 text-white flex items-center justify-center"
          disabled={!banForm.userId || !banForm.duration || !banForm.reason.trim()}
        >
          Cấm
        </button>
      </div>
    </div>

    {/* Banned Users List */}
    <div className="overflow-x-auto">
      <h3 className="font-semibold mb-3">Danh sách người dùng bị cấm</h3>
      <table className="w-full border-collapse border">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left border">Người dùng</th>
            <th className="px-4 py-2 text-left border">Lý do</th>
            <th className="px-4 py-2 text-left border">Thời gian cấm</th>
            <th className="px-4 py-2 text-left border">Hết hạn</th>
            <th className="px-4 py-2 text-left border">Trạng thái</th>
            <th className="px-4 py-2 text-left border">Hành động</th>
          </tr>
        </thead>
        <tbody>
          {bannedUsers.map(u => (
            <tr key={u._id} className="border">
              <td className="px-4 py-2 border">
                <div className="flex items-center gap-2">
                  <img
                    src={u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=cccccc&color=222222&size=32`}
                    alt="avatar"
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <span className="font-medium">{u.name}</span>
                </div>
              </td>
              <td className="px-4 py-2 border">{u.banReason}</td>
              <td className="px-4 py-2 border text-sm">
                {u.bannedAt ? new Date(u.bannedAt).toLocaleString() : "N/A"}
              </td>
              <td className="px-4 py-2 border text-sm">
                {u.banExpiresAt ? new Date(u.banExpiresAt).toLocaleString() : "Vĩnh viễn"}
              </td>
              <td className="px-4 py-2 border">
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    !u.banExpiresAt
                      ? "bg-red-100 text-red-800"
                      : new Date() < new Date(u.banExpiresAt)
                      ? "bg-orange-100 text-orange-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {!u.banExpiresAt
                    ? "Vĩnh viễn"
                    : new Date() < new Date(u.banExpiresAt)
                    ? "Đang cấm"
                    : "Hết hạn"}
                </span>
              </td>
              <td className="px-4 py-2 border">
                <button
                  className="btn-outline btn-sm text-green-600"
                  onClick={() => handleUnban(u._id)}
                >
                  Gỡ cấm
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {bannedUsers.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Không có người dùng nào bị cấm
        </div>
      )}
    </div>
  </div>
)}


        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div className="pt-4">
            <h2 className="text-xl font-bold mb-4">Gửi thông báo</h2>

            {/* Notification Forms */}
            <div className="grid gap-6 lg:grid-cols-2">
              <NotificationForm
                type="system"
                form={notificationForm}
                setForm={setNotificationForm}
                onSubmit={handleNotificationSubmit}
                disabled={actionLoading}
              />

              <NotificationForm
                type="admin"
                form={notificationForm}
                setForm={setNotificationForm}
                onSubmit={handleNotificationSubmit}
                disabled={actionLoading}
              />
            </div>

            {/* Info */}
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-medium mb-2">Phân biệt các loại thông báo:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li><strong>Thông báo hệ thống:</strong> Thông báo về cập nhật server, bảo trì, thay đổi chính sách (có thể chọn đối tượng)</li>
                <li><strong>Thông báo từ Admin:</strong> Thông báo cá nhân từ admin đến tất cả người dùng</li>
              </ul>
            </div>
          </div>
        )}

        {/* Visitor Stats Tab */}
        {activeTab === "online" && (
          <div className="pt-4">
            <h2 className="text-xl font-bold mb-4">
              Thống kê truy cập và người dùng
            </h2>
            
            {/* Visitor Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-emerald-50 p-4 rounded-lg text-center">
                <Wifi className="text-emerald-600 mx-auto mb-2" size={32} />
                <div className="text-2xl font-bold text-emerald-600">{onlineUsers.length}</div>
                <div className="text-gray-600">Đang online</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <WifiOff className="text-gray-600 mx-auto mb-2" size={32} />
                <div className="text-2xl font-bold text-gray-600">{Math.max(0, users.length - onlineUsers.length)}</div>
                <div className="text-gray-600">Offline</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <UserCheck className="text-blue-600 mx-auto mb-2" size={32} />
                <div className="text-2xl font-bold text-blue-600">{totalVisitors.toLocaleString()}</div>
                <div className="text-gray-600">Tổng lượt truy cập</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <Users className="text-purple-600 mx-auto mb-2" size={32} />
                <div className="text-2xl font-bold text-purple-600">{users.length}</div>
                <div className="text-gray-600">Tổng người dùng</div>
              </div>
            </div>

            {/* Detailed Time Stats */}
            {visitorStats && visitorStats.timeStats && (
              <div className="bg-white border rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">Thống kê theo thời gian</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{visitorStats.timeStats.today}</div>
                    <div className="text-gray-600">Hôm nay</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{visitorStats.timeStats.thisWeek}</div>
                    <div className="text-gray-600">Tuần này</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{visitorStats.timeStats.thisMonth}</div>
                    <div className="text-gray-600">Tháng này</div>
                  </div>
                </div>
              </div>
            )}

            {/* Online Users List */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold">Danh sách người dùng online</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left">Avatar</th>
                      <th className="px-4 py-3 text-left">Tên</th>
                      <th className="px-4 py-3 text-left">Email</th>
                      <th className="px-4 py-3 text-left">Role</th>
                      <th className="px-4 py-3 text-left">Trạng thái</th>
                      <th className="px-4 py-3 text-left">Thời gian online</th>
                    </tr>
                  </thead>
                  <tbody>
                    {onlineUsers.map(user => (
                      <tr key={user._id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3">
                          <img
                            src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=cccccc&color=222222&size=40`}
                            alt="avatar"
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium">{user.name}</td>
                        <td className="px-4 py-3 text-gray-600">{user.email}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.role === 'admin' ? 'bg-red-100 text-red-800' :
                            user.role === 'sololeveling' ? 'bg-purple-100 text-purple-800' :
                            user.role === 'sybau' ? 'bg-blue-100 text-blue-800' :
                            user.role === 'moxumxue' ? 'bg-pink-100 text-pink-800' :
                            user.role === 'gay' ? 'bg-pink-100 text-pink-800' :
                            user.role === 'special' ? 'bg-pink-100 text-pink-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {user.role === 'admin' ? 'Admin' :
                             user.role === 'sololeveling' ? 'Anh sung solo' :
                             user.role === 'sybau' ? 'Ahh Sybau' :
                             user.role === 'moxumxue' ? 'Hero great tomb guard keeper' :
                             user.role === 'gay' ? 'Gay' :
                             user.role === 'special' ? 'Special' :
                             'User'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-green-600 font-medium">Online</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {user.lastSeen ? new Date(user.lastSeen).toLocaleString() : 'Vừa xong'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {onlineUsers.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Không có người dùng nào đang online
                  </div>
                )}
              </div>
            </div>

            {/* Refresh Button & Last Update */}
            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Cập nhật lần cuối: {lastUpdate.toLocaleTimeString()}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => updateOfflineUsers()}
                  className="btn-outline btn-sm text-orange-600"
                >
                  Cập nhật offline
                </button>
                <button
                  onClick={refreshAllData}
                  className="btn-outline btn-sm"
                >
                  Làm mới danh sách
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Tab */}
        {activeTab === "feedback" && (
          <div className="pt-4">
            <div className="text-center py-8 text-gray-500">
              {/* Hiển thị danh sách góp ý từ người dùng */}
              <AdminFeedback />
            </div>
          </div>
        )}

        {/* API Monitoring Tab */}
        {activeTab === "api-monitoring" && (
          <div className="pt-4">
            <APIMonitoring />
          </div>
        )}

        {/* API Tester Tab */}
        {activeTab === "api" && (
          <div className="pt-4">
            <div className="text-center py-4">
              <h3 className="text-lg font-semibold mb-4">API Testing Tool</h3>
              <p className="text-gray-600 mb-4">
                Test tất cả các API endpoints để kiểm tra hoạt động
              </p>
              <a
                href="/admin/api-tester"
                target="_blank"
                rel="noopener noreferrer"
                className="btn bg-blue-600 text-white hover:bg-blue-700"
              >
                Mở API Tester
              </a>
            </div>
          </div>
        )}
        </ErrorBoundary>
      </div>
    </div>
  );
}