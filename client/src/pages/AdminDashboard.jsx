import React, { useEffect, useState, useCallback } from "react";
import AdminFeedback from "./AdminFeedback";
import APIMonitoring from "../components/APIMonitoring";
import RoleManagement from "../components/RoleManagement";
import VerifiedBadge from "../components/VerifiedBadge";
import { getUserAvatarUrl, AVATAR_SIZES } from "../utils/avatarUtils";
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
  Activity,
  Shield
} from "lucide-react";

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
    updateOfflineUsers,
    loadSingleUser,
    updateSingleUserInState,
    clearError: clearDataError,
    loadStats,
    loadOnlineUsers,
    setUsers // For optimistic updates
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
  const [updatingRoles, setUpdatingRoles] = useState(new Set()); // Track which users are being updated
  const loading = dataLoading || actionLoading; // Combined loading state

  // UI states
  const [activeTab, setActiveTab] = useState("stats"); // Tab hiện tại
  const [availableRoles, setAvailableRoles] = useState([]); // Dynamic roles từ database
  const [userSearchTerm, setUserSearchTerm] = useState(""); // Search term for users
  const [userRoleFilter, setUserRoleFilter] = useState(""); // Role filter for users

  const navigate = useNavigate();

  useEffect(() => {
    checkAdmin();
    loadAvailableRoles();
  }, []);

  // Load available roles from database với debounce
  const loadAvailableRoles = useCallback(async () => {
    try {
      const response = await api("/api/admin/roles", { method: "GET" });
      if (response.success) {
        setAvailableRoles(response.roles || []);
        // Không cần trigger refresh nữa - sẽ pass trực tiếp vào props
      }
    } catch (error) {
      console.error("Error loading roles:", error);
      // Fallback to default roles
      setAvailableRoles([
        { name: "user", displayName: "User" },
        { name: "admin", displayName: "Admin" }
      ]);
    }
  }, []);

  // Auto refresh specific data when tab changes (avoid full refresh)
  useEffect(() => {
    // Only refresh specific data that's relevant to the active tab
    if (activeTab === "online") {
      loadOnlineUsers(); // Only load online users for that tab
    } else if (activeTab === "stats") {
      loadStats(); // Only load stats for that tab
    }
    // Don't refresh users data unnecessarily - it's already loaded on mount
  }, [activeTab, loadOnlineUsers, loadStats]);

  async function checkAdmin() {
    try {
      const res = await api("/api/auth/me");
      if (res.user.role !== "admin") {
        alert("Bạn không có quyền truy cập trang này!");
        navigate("/");
        return;
      }
      setUser(res.user);
      // Don't call refreshAllData here - it's already called in useAdminData hook
    } catch (e) {
      alert("Lỗi xác thực!");
      navigate("/login");
    } finally {
      // Loading state is now managed by custom hooks
    }
  }

  async function updateUserRole(userId, newRoleName) {
    if (!window.confirm(`Bạn có chắc muốn đổi role user này thành ${newRoleName}?`)) return;

    // ✅ LOADING STATE - Hiển thị loading cho user đang update
    setUpdatingRoles(prev => new Set([...prev, userId]));

    const originalUsers = [...users];
    const newRoleObject = availableRoles.find(r => r.name === newRoleName);

    // ✅ OPTIMISTIC UPDATE - Hiển thị ngay lập tức với role object đầy đủ
    updateSingleUserInState(userId, {
      role: newRoleObject || { name: newRoleName, displayName: newRoleName }
    });

    try {
      // ✅ API CALL - Cập nhật trong DB
      const response = await api(`/api/admin/users/${userId}/role`, {
        method: "PUT",
        body: { role: newRoleName }
      });

      // ✅ UPDATE WITH SERVER RESPONSE - Đảm bảo sync với server
      if (response.user) {
        updateSingleUserInState(userId, response.user);
      }

      // ✅ SUCCESS FEEDBACK - Không cần reload toàn bộ UI

    } catch (err) {
      // ❌ REVERT ON ERROR
      setUsers(originalUsers);
      alert("Lỗi khi cập nhật role: " + err.message);
    } finally {
      // ✅ CLEAR LOADING STATE
      setUpdatingRoles(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  }

  async function deleteUser(userId) {
    if (!window.confirm("Bạn có chắc muốn xóa người dùng này? Tất cả bài viết và bình luận của họ sẽ bị xóa!")) return;
    try {
      await api(`/api/admin/users/${userId}`, {
      method: "DELETE"
    });
      await refreshAllData();
      alert("Đã xóa người dùng!");
    } catch (e) {
      alert("Lỗi: " + e.message);
    }
  }

  if (dataLoading && !user) {
    return (
      <div className="w-full px-6 py-6 pt-20">
        <div className="card max-w-4xl mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            Đang xác thực quyền admin...
          </div>
        </div>
      </div>
    );
  }

  if (dataLoading && (!users.length || !stats)) {
    return (
      <div className="w-full px-6 py-6 pt-20">
        <div className="card max-w-4xl mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            Đang tải dữ liệu admin...
          </div>
        </div>
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
            <button 
              onClick={() => {
                clearError();
                clearDataError();
                if (dataError) {
                  // Clear data error by attempting to reload
                  refreshAllData();
                }
              }} 
              className="ml-2 text-red-500 hover:text-red-700"
            >
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
          <div>
            <h1 className="text-xl sm:text-3xl font-bold mb-2">QUẢN LÝ NGƯỜI DÙNG</h1>
            <div className="text-sm sm:text-base text-gray-600">Chào mừng, {user?.name}!</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="card max-w-7xl mx-auto">
        <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700 scrollbar-hide">
          <button
            className={`min-w-[90px] px-3 sm:px-4 py-2 font-medium flex items-center gap-1 sm:gap-2 whitespace-nowrap touch-target ${activeTab === "stats" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
            onClick={() => setActiveTab("stats")}
          >
            <span className="text-sm sm:text-base">Thống kê</span>
          </button>
          <button
            className={`min-w-[110px] px-3 sm:px-4 py-2 font-medium flex items-center gap-1 sm:gap-2 whitespace-nowrap touch-target ${activeTab === "users" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
            onClick={() => setActiveTab("users")}
          >
            <span className="text-sm sm:text-base">Người dùng</span>
          </button>
          <button
            className={`min-w-[60px] px-3 sm:px-4 py-2 font-medium flex items-center gap-1 sm:gap-2 whitespace-nowrap touch-target ${activeTab === "bans" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
            onClick={() => setActiveTab("bans")}
          >
            <span className="text-sm sm:text-base">Cấm</span>
          </button>
          <button
            className={`min-w-[90px] px-3 sm:px-4 py-2 font-medium flex items-center gap-1 sm:gap-2 whitespace-nowrap touch-target ${activeTab === "notifications" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
            onClick={() => setActiveTab("notifications")}
          >
            <span className="text-sm sm:text-base">Thông báo</span>
          </button>
          <button
            className={`min-w-[80px] px-3 sm:px-4 py-2 font-medium flex items-center gap-1 sm:gap-2 whitespace-nowrap touch-target ${activeTab === "online" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
            onClick={() => setActiveTab("online")}
          >
            <span className="text-sm sm:text-base">Truy cập</span>
          </button>
          <button
            className={`min-w-[70px] px-3 sm:px-4 py-2 font-medium flex items-center gap-1 sm:gap-2 whitespace-nowrap touch-target ${activeTab === "feedback" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
            onClick={() => setActiveTab("feedback")}
          >
            <span className="text-sm sm:text-base">Góp ý</span>
          </button>
          <button
            className={`min-w-[100px] px-3 sm:px-4 py-2 font-medium flex items-center gap-1 sm:gap-2 whitespace-nowrap touch-target ${activeTab === "api-monitoring" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
            onClick={() => setActiveTab("api-monitoring")}
          >
            <span className="text-sm sm:text-base">API Monitor</span>
          </button>
          <button
            className={`min-w-[90px] px-3 sm:px-4 py-2 font-medium flex items-center gap-1 sm:gap-2 whitespace-nowrap touch-target ${activeTab === "roles" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
            onClick={() => setActiveTab("roles")}
          >
            <span className="text-sm sm:text-base">Quản lý Role</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="card max-w-7xl mx-auto">
        {/* Stats Tab */}
        {activeTab === "stats" && (
          <div className="pt-4">
            <h2 className="text-lg sm:text-xl font-bold mb-4">Thống kê tổng quan</h2>
            {!stats ? (
              <div className="text-center py-8 text-gray-500">
                Đang tải thống kê...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {/* Bài viết */}
                <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="text-blue-600 sm:w-6 sm:h-6" size={20} />
                    <div className="text-xl sm:text-2xl font-bold text-blue-600">
                      {stats.overview ? stats.overview.totalPosts.count : (stats.totalPosts || 0)}
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
                      {stats.overview ? stats.overview.totalViews.count : (stats.totalViews || 0)}
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
                      {stats.overview ? stats.overview.totalComments.count : (stats.totalComments || 0)}
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
                      {stats.overview ? stats.overview.totalEmotes.count : (stats.totalEmotes || 0)}
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
                      {stats.overview ? stats.overview.totalUsers.count : (stats.totalUsers || 0)}
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
                      {stats.overview ? stats.overview.publishedPosts.count : (stats.publishedPosts || 0)}
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
                      {stats.overview ? stats.overview.draftPosts.count : (stats.draftPosts || 0)}
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
                      {stats.overview ? stats.overview.adminUsers.count : (stats.adminUsers || 0)}
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
                      {stats.overview ? 
                        Math.max(0, stats.overview.totalUsers.count - onlineUsers.length) : 
                        Math.max(0, users.length - onlineUsers.length)
                      } người offline
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
            )}

            {/* Top Stats */}
            {stats && (
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Posts */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h3 className="font-bold mb-3">Top 5 bài viết có nhiều lượt xem nhất</h3>
                  {stats.topPosts?.length > 0 ? (
                    stats.topPosts.map((post, index) => (
                      <div key={post._id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                        <div>
                          <div className="font-medium text-sm">{index + 1}. {post.title}</div>
                          <div className="text-xs text-gray-500">by {post.author?.name}</div>
                        </div>
                        <div className="text-sm font-medium text-blue-600">{post.views} views</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-500">Chưa có dữ liệu</div>
                  )}
                </div>

                {/* Top Users */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h3 className="font-bold mb-3">Top 5 user có nhiều bài viết nhất</h3>
                  {stats.topUsers?.length > 0 ? (
                    stats.topUsers.map((userStat, index) => (
                      <div key={userStat._id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                        <div>
                          <div className="font-medium text-sm">{index + 1}. {userStat.name}</div>
                          <div className="text-xs text-gray-500">{userStat.role === "admin" ? "Admin" : "User"}</div>
                        </div>
                        <div className="text-sm font-medium text-green-600">{userStat.postCount} bài</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-500">Chưa có dữ liệu</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="pt-4">
            <h2 className="text-lg sm:text-xl font-bold mb-4">
              Quản lý người dùng ({stats.overview ? stats.overview.totalUsers.count : users.length})
            </h2>
            
            {/* Search and Filter */}
            <div className="mb-4 space-y-3 sm:space-y-0 sm:flex sm:gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên hoặc email..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white touch-target"
                />
              </div>
              <div className="sm:w-48">
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white touch-target"
                >
                  <option value="">Tất cả quyền</option>
                  {availableRoles.map(role => (
                    <option key={role.name} value={role.name}>
                      {role.displayName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {!users || users.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Đang tải danh sách người dùng...
              </div>
            ) : (() => {
              // Filter users based on search term and role filter
              const filteredUsers = users.filter(u => {
                const matchesSearch = !userSearchTerm || 
                  u.name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                  u.email?.toLowerCase().includes(userSearchTerm.toLowerCase());
                const matchesRole = !userRoleFilter || 
                  (u.role?.name || u.role) === userRoleFilter;
                return matchesSearch && matchesRole;
              });

              return filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Không tìm thấy người dùng nào phù hợp với bộ lọc
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full border border-gray-200 dark:border-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        <th className="px-4 py-2 text-left text-sm">Avatar</th>
                        <th className="px-4 py-2 text-left text-sm">Tên</th>
                        <th className="px-4 py-2 text-left text-sm">Email</th>
                        <th className="px-4 py-2 text-left text-sm">Quyền</th>
                        <th className="px-4 py-2 text-left text-sm hidden md:table-cell">Ngày tham gia</th>
                        <th className="px-4 py-2 text-left text-sm hidden lg:table-cell">Số bài viết</th>
                        <th className="px-4 py-2 text-left text-sm">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                      {filteredUsers.map(u => (
                    <tr key={u._id} className="border-t border-gray-200 dark:border-gray-700">
                        <td className="px-4 py-2">
                        <img
                          src={getUserAvatarUrl(u, AVATAR_SIZES.SMALL)}
                          alt="avatar"
                            className="w-8 h-8 rounded-full object-cover"
                        />
                      </td>
                        <td className="px-4 py-2 font-medium flex items-center gap-2">
                          <span className="text-sm truncate">{u.name}</span>
                        <VerifiedBadge 
                          role={u.role?.name || u.role} 
                          isVerified={u.isVerified}
                          roleData={typeof u.role === 'object' ? u.role : null}
                          availableRoles={availableRoles}
                        />
                      </td>
                        <td className="px-4 py-2 text-sm truncate max-w-[150px]">{u.email}</td>
                        <td className="px-4 py-2">
                        <select
                          value={u.role?.name || u.role}
                          onChange={async (e) => {
                            const newRole = e.target.value;
                            await updateUserRole(u._id, newRole);
                          }}
                          disabled={u._id === user._id || updatingRoles.has(u._id)}
                            className={`btn-outline btn-sm text-sm ${
                            updatingRoles.has(u._id) ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {updatingRoles.has(u._id) && (
                            <option>Đang cập nhật...</option>
                          )}
                          {!updatingRoles.has(u._id) && availableRoles.map(role => (
                            <option key={role.name} value={role.name}>
                              {role.displayName}
                            </option>
                          ))}
                        </select>
                      </td>
                        <td className="px-4 py-2 text-sm hidden md:table-cell">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-2 text-sm hidden lg:table-cell">{u.postCount}</td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                          <button
                              className="btn-outline btn-sm text-red-600"
                            onClick={() => deleteUser(u._id)}
                            disabled={u._id === user._id}
                          >
                              Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                    ))}
                  </tbody>
                </table>
              </div>

                {/* Mobile Card View */}
                <div className="sm:hidden space-y-3">
                  {filteredUsers.map(u => (
                    <div key={u._id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Avatar */}
                          <img
                            src={getUserAvatarUrl(u, AVATAR_SIZES.SMALL)}
                            alt="avatar"
                            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                          />
                          
                          {/* User Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                {u.name}
                              </h3>
                              <VerifiedBadge 
                                role={u.role?.name || u.role} 
                                isVerified={u.isVerified}
                                roleData={typeof u.role === 'object' ? u.role : null}
                                availableRoles={availableRoles}
                              />
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate mb-1">
                              {u.email}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                              <span>{new Date(u.createdAt).toLocaleDateString()}</span>
                              <span>•</span>
                              <span>{u.postCount} bài viết</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex-shrink-0 ml-2">
                          <button
                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg touch-target"
                            onClick={() => deleteUser(u._id)}
                            disabled={u._id === user._id}
                            title="Xóa người dùng"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      {/* Role Selector */}
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Quyền hạn
                        </label>
                        <select
                          value={u.role?.name || u.role}
                          onChange={async (e) => {
                            const newRole = e.target.value;
                            await updateUserRole(u._id, newRole);
                          }}
                          disabled={u._id === user._id || updatingRoles.has(u._id)}
                          className={`w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white touch-target ${
                            updatingRoles.has(u._id) ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {updatingRoles.has(u._id) && (
                            <option>Đang cập nhật...</option>
                          )}
                          {!updatingRoles.has(u._id) && availableRoles.map(role => (
                            <option key={role.name} value={role.name}>
                              {role.displayName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </>
              );
            })()}
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
                  {users
                    .filter(u => u && u.role !== "admin" && u._id !== user?._id && !u.isBanned)
                    .map(u => (
                      <option key={u._id} value={u._id}>
                        {u.name || 'Unknown User'} ({u.email || 'Unknown Email'})
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
                  <option value="15">15 phút</option>
                  <option value="30">30 phút</option>
                  <option value="60">1 giờ</option>
                  <option value="180">3 giờ</option>
                  <option value="360">6 giờ</option>
                  <option value="720">12 giờ</option>
                  <option value="1440">1 ngày</option>
                  <option value="4320">3 ngày</option>
                  <option value="10080">1 tuần</option>
                  <option value="permanent">Vĩnh viễn</option>
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
                  onClick={async (e) => {
                    e.preventDefault();
                    
                    if (!banForm.userId || !banForm.duration || !banForm.reason.trim()) {
                      return;
                    }

                    const success = await handleBanSubmit(e);
                    if (success) {
                      // Optimistic update for banned user
                      const banExpiresAt = banForm.duration === "permanent" 
                        ? null 
                        : new Date(Date.now() + parseInt(banForm.duration) * 60 * 1000);
                      
                      updateSingleUserInState(banForm.userId, {
                        isBanned: true,
                        banReason: banForm.reason,
                        bannedAt: new Date(),
                        banExpiresAt,
                        bannedBy: user._id
                      });
                    }
                  }}
                  className="btn bg-red-600 text-white flex items-center justify-center"
                  disabled={!banForm.userId || !banForm.duration || !banForm.reason.trim() || actionLoading}
                >
                  {actionLoading ? 'Đang xử lý...' : 'Cấm'}
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
                  {users.filter(u => u && u.isBanned).map(u => (
                    <tr key={u._id} className="border">
                      <td className="px-4 py-2 border">
                        <div className="flex items-center gap-2">
                          <img
                            src={getUserAvatarUrl(u, AVATAR_SIZES.SMALL)}
                            alt="avatar"
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          <span className="font-medium">{u.name || 'Unknown User'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 border">{u.banReason || 'Không có lý do'}</td>
                      <td className="px-4 py-2 border text-sm">
                        {u.bannedAt ? new Date(u.bannedAt).toLocaleString() : "N/A"}
                      </td>
                      <td className="px-4 py-2 border text-sm">
                        {u.banExpiresAt ? new Date(u.banExpiresAt).toLocaleString() : "Vĩnh viễn"}
                      </td>
                      <td className="px-4 py-2 border">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${!u.banExpiresAt
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
                          onClick={async () => {
                            if (await unbanUser(u._id)) {
                              // Optimistic update instead of full refresh
                              updateSingleUserInState(u._id, {
                                isBanned: false,
                                banReason: null,
                                bannedAt: null,
                                banExpiresAt: null,
                                bannedBy: null
                              });
                            }
                          }}
                          disabled={actionLoading}
                        >
                          {actionLoading ? 'Đang xử lý...' : 'Gỡ cấm'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.filter(u => u && u.isBanned).length === 0 && (
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

              {/* System Notification */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 text-blue-800">Thông báo hệ thống</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Tiêu đề thông báo..."
                    value={notificationForm.title}
                    onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                    className="input w-full"
                  />

                  <textarea
                    placeholder="Nội dung thông báo..."
                    value={notificationForm.message}
                    onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                    className="input w-full h-20 resize-none"
                  />

                  <select
                    value={notificationForm.targetRole}
                    onChange={(e) => setNotificationForm({ ...notificationForm, targetRole: e.target.value })}
                    className="input w-full"
                  >
                    <option value="">Tất cả người dùng</option>
                    <option value="admin">Chỉ Admin</option>
                    <option value="user">Chỉ User thường</option>
                  </select>

                  <button
                    onClick={handleNotificationSubmit}
                    className="btn bg-blue-600 text-white w-full hover:bg-blue-700 flex items-center justify-center"
                    disabled={!notificationForm.title.trim() || !notificationForm.message.trim()}
                  >
                    Gửi thông báo hệ thống
                  </button>
                </div>
              </div>

              {/* Admin Broadcast */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 text-green-800">Thông báo từ Admin</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Tiêu đề thông báo..."
                    value={notificationForm.title}
                    onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                    className="input w-full"
                  />

                  <textarea
                    placeholder="Nội dung thông báo..."
                    value={notificationForm.message}
                    onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                    className="input w-full h-20 resize-none"
                  />

                  <button
                    onClick={handleNotificationSubmit}
                    className="btn bg-green-600 text-white w-full hover:bg-green-700 flex items-center justify-center"
                    disabled={!notificationForm.title.trim() || !notificationForm.message.trim()}
                  >
                    Gửi thông báo
                  </button>
                </div>
              </div>
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
                <div className="text-2xl font-bold text-gray-600">
                  {stats.overview ? 
                    Math.max(0, stats.overview.totalUsers.count - onlineUsers.length) : 
                    Math.max(0, users.length - onlineUsers.length)
                  }
                </div>
                <div className="text-gray-600">Offline</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <UserCheck className="text-blue-600 mx-auto mb-2" size={32} />
                <div className="text-2xl font-bold text-blue-600">{totalVisitors.toLocaleString()}</div>
                <div className="text-gray-600">Tổng lượt truy cập</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <Users className="text-purple-600 mx-auto mb-2" size={32} />
                <div className="text-2xl font-bold text-purple-600">
                  {stats.overview ? stats.overview.totalUsers.count : users.length}
                </div>
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
                            src={getUserAvatarUrl(user, AVATAR_SIZES.SMALL)}
                            alt="avatar"
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium">{user.name}</td>
                        <td className="px-4 py-3 text-gray-600">{user.email}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                            {user.role || 'User'}
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

            {/* Last Update */}
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


        {/* Role Management Tab */}
        {activeTab === "roles" && (
          <div className="pt-4">
            <RoleManagement onRolesChange={async () => {
              // Load roles first
              await loadAvailableRoles();
              // Then refresh user data to get updated role info
              await refreshAllData();
            }} />
          </div>
        )}
      </div>
    </div>
  );
}