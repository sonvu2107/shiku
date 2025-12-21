import React, { useEffect, useState, useCallback } from "react";
import AdminFeedback from "./AdminFeedback";
import APIMonitoring from "../components/APIMonitoring";
import RoleManagement from "../components/RoleManagement";
// AutoLikeBot removed - replaced by upvote system
import AdminCharts from "../components/AdminCharts";
import Pagination from '../components/admin/Pagination';
import SystemHealth from '../components/admin/SystemHealth';
import SecurityAlerts from '../components/admin/SecurityAlerts';
import MobileQuickActions from '../components/admin/MobileQuickActions';
import AdminPostsTab from '../components/admin/AdminPostsTab';
import AdminInsightsTab from '../components/admin/AdminInsightsTab';
import AdminCommentsTab from '../components/admin/AdminCommentsTab';
import AdminReportsTab from '../components/admin/AdminReportsTab';
import ActiveUsersChart from '../components/admin/ActiveUsersChart';
import VerifiedBadge from "../components/VerifiedBadge";
import Avatar from "../components/Avatar";
import { getUserAvatarUrl, AVATAR_SIZES } from "../utils/avatarUtils";
import { api } from "../api";
import { useNavigate } from "react-router-dom";
import { useAdminData } from "../hooks/useAdminData";
import { useAdminActions } from "../hooks/useAdminActions";
import { PageLayout, PageHeader, SpotlightCard } from "../components/ui/DesignSystem";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../utils/cn";
import { useToast } from "../contexts/ToastContext";
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
   Shield,
   Search,
   Filter,
   CheckCircle2,
   AlertCircle,
   Loader2,
   UserX,
   ChevronRight,
   Ban,
   X,
   Sword,
   Target,
   Flag
} from "lucide-react";

/**
 * AdminDashboard - Admin dashboard page (Redesigned)
 * Style: Monochrome Luxury
 */
export default function AdminDashboard() {
   // ==================== CUSTOM HOOKS ====================

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
      updateSingleUserInState,
      clearError: clearDataError,
      loadStats,
      loadOnlineUsers,
      setUsers,
      // Pagination
      userPagination,
      userFilters,
      usersLoading,
      goToPage,
      securityAlerts,
      dismissAlert,
      updateUserFilters
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

   const [user, setUser] = useState(null);
   const [updatingRoles, setUpdatingRoles] = useState(new Set());
   const loading = dataLoading || actionLoading;

   const [activeTab, setActiveTab] = useState("stats");
   const [availableRoles, setAvailableRoles] = useState([]);
   const [userSearchTerm, setUserSearchTerm] = useState("");
   const [userRoleFilter, setUserRoleFilter] = useState("");

   // Debounce timer for server-side search
   const searchTimeoutRef = React.useRef(null);
   const handleUserSearch = React.useCallback((value) => {
      setUserSearchTerm(value);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
         updateUserFilters({ search: value });
      }, 400);
   }, [updateUserFilters]);
   const handleRoleFilterChange = React.useCallback((value) => {
      setUserRoleFilter(value);
      updateUserFilters({ role: value });
   }, [updateUserFilters]);

   const navigate = useNavigate();
   const { showError, showSuccess } = useToast();

   useEffect(() => {
      checkAdmin();
      loadAvailableRoles();
   }, []);

   const loadAvailableRoles = useCallback(async () => {
      try {
         const response = await api("/api/admin/roles", { method: "GET" });
         if (response.success) {
            setAvailableRoles(response.roles || []);
         }
      } catch (error) {
         setAvailableRoles([
            { name: "user", displayName: "User" },
            { name: "admin", displayName: "Admin" }
         ]);
      }
   }, []);

   useEffect(() => {
      if (activeTab === "online") {
         loadOnlineUsers();
      } else if (activeTab === "stats") {
         loadStats();
      }
   }, [activeTab, loadOnlineUsers, loadStats]);

   async function checkAdmin() {
      try {
         const res = await api("/api/auth/me");
         // Allow access if user is admin OR has any admin.* permission
         const userRole = res.user.role;
         const isAdmin = userRole === "admin";
         const hasAdminPermissions = res.user.roleData?.permissions &&
            Object.keys(res.user.roleData.permissions).some(k => k.startsWith('admin.') && res.user.roleData.permissions[k]);

         if (!isAdmin && !hasAdminPermissions) {
            showError("Bạn không có quyền truy cập trang này!");
            navigate("/");
            return;
         }
         setUser({ ...res.user, isFullAdmin: isAdmin });
      } catch (e) {
         showError("Lỗi xác thực!");
         navigate("/login");
      }
   }

   // Helper function to check if user has a specific permission
   const hasPermission = (permKey) => {
      if (!user) return false;
      if (user.isFullAdmin || user.role === 'admin') return true;
      return user.roleData?.permissions?.[permKey] === true;
   };

   async function updateUserRole(userId, newRoleName) {
      if (!window.confirm(`Bạn có chắc muốn đổi role user này thành ${newRoleName}?`)) return;

      setUpdatingRoles(prev => new Set([...prev, userId]));
      const originalUsers = [...users];
      const newRoleObject = availableRoles.find(r => r.name === newRoleName);

      updateSingleUserInState(userId, {
         role: newRoleObject || { name: newRoleName, displayName: newRoleName }
      });

      try {
         const response = await api(`/api/admin/users/${userId}/role`, {
            method: "PUT",
            body: { role: newRoleName }
         });

         if (response.user) {
            updateSingleUserInState(userId, response.user);
         }
      } catch (err) {
         setUsers(originalUsers);
         showError("Lỗi khi cập nhật role: " + err.message);
      } finally {
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
         showSuccess("Đã xóa người dùng!");
      } catch (e) {
         showError("Lỗi: " + e.message);
      }
   }

   if (dataLoading && !user) {
      return (
         <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-black dark:border-white"></div>
         </div>
      );
   }

   // --- SIDEBAR TABS CONFIGURATION ---
   const allMenuItems = [
      { id: 'stats', label: 'Thống kê', icon: BarChart3, permission: 'admin.viewStats' },
      { id: 'insights', label: 'Insights', icon: Target, permission: 'admin.viewStats' },
      { id: 'users', label: 'Quản lý N.Dùng', icon: Users, permission: 'admin.manageUsers' },
      { id: 'posts', label: 'Quản lý bài viết', icon: FileText, permission: 'admin.managePosts' },
      { id: 'comments', label: 'Quản lý B.Luận', icon: MessageCircle, permission: 'admin.manageComments' },
      { id: 'reports', label: 'Báo cáo', icon: Flag, permission: 'admin.manageReports' },
      { id: 'online', label: 'Online & Traffic', icon: Activity, permission: 'admin.viewStats' },
      { id: 'roles', label: 'Phân quyền', icon: Crown, permission: 'admin.manageRoles' },
      { id: 'bans', label: 'Cấm N.Dùng', icon: Ban, permission: 'admin.manageBans' },
      { id: 'notifications', label: 'Thông báo', icon: Bell, permission: 'admin.sendNotifications' },
      { id: 'feedback', label: 'Phản hồi', icon: MessageCircle, permission: 'admin.viewFeedback' },
      { id: 'equipment', label: 'Trang Bị', icon: Sword, external: true, path: '/admin/equipment', permission: 'admin.manageEquipment' },
      { id: 'api-monitoring', label: 'API Monitor', icon: Code, permission: 'admin.viewAPI' },

   ];

   // Filter menu items based on user permissions
   const menuItems = allMenuItems.filter(item => hasPermission(item.permission));

   return (
      <PageLayout>
         <PageHeader
            title="Admin Dashboard"
            subtitle={`Xin chào, ${user?.name || 'Admin'}`}
         />

         {/* Global Alerts */}
         <div className="max-w-7xl mx-auto mb-6 space-y-4">
            {(dataError || actionError) && (
               <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700/50 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl shadow-sm">
                  <div className="flex items-center gap-2"><AlertCircle size={18} /> {dataError || actionError}</div>
                  <button onClick={() => { clearError(); clearDataError(); if (dataError) refreshAllData(); }}><X size={18} /></button>
               </div>
            )}
            {actionSuccess && (
               <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700/50 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl shadow-sm">
                  <div className="flex items-center gap-2"><CheckCircle2 size={18} /> {actionSuccess}</div>
                  <button onClick={clearSuccess}><X size={18} /></button>
               </div>
            )}
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* --- LEFT SIDEBAR --- */}
            <div className="lg:col-span-3 space-y-6">
               <div className="bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl rounded-2xl p-2 border border-neutral-200/80 dark:border-neutral-800/80 shadow-sm sticky top-24 overflow-y-auto max-h-[calc(100vh-8rem)] custom-scrollbar">
                  {menuItems.map((item) => {
                     if (item.external) {
                        return (
                           <button
                              key={item.id}
                              onClick={() => navigate(item.path)}
                              className={cn(
                                 "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all mb-1 last:mb-0",
                                 "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-200"
                              )}
                           >
                              <div className="flex items-center gap-3">
                                 <item.icon size={18} />
                                 {item.label}
                              </div>
                              <ChevronRight size={16} />
                           </button>
                        );
                     }
                     return (
                        <button
                           key={item.id}
                           onClick={() => setActiveTab(item.id)}
                           className={cn(
                              "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all mb-1 last:mb-0",
                              activeTab === item.id
                                 ? "bg-black dark:bg-white text-white dark:text-black shadow-md"
                                 : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-200"
                           )}
                        >
                           <div className="flex items-center gap-3">
                              <item.icon size={18} />
                              {item.label}
                           </div>
                           {activeTab === item.id && <ChevronRight size={16} />}
                        </button>
                     );
                  })}
               </div>
            </div>

            {/* --- RIGHT CONTENT --- */}
            <div className="lg:col-span-9 min-h-[500px]">
               <AnimatePresence mode="wait">

                  {/* 1. STATS TAB */}
                  {activeTab === "stats" && (
                     <motion.div key="stats" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        {!stats ? (
                           <div className="py-20 flex justify-center"><Loader2 className="animate-spin" /></div>
                        ) : (
                           <>
                              {/* Overview Cards */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                 {/* Posts */}
                                 <SpotlightCard className="p-4 bg-neutral-100 dark:bg-neutral-800/50 dark:bg-blue-900/10">
                                    <div className="flex items-center gap-2 mb-2">
                                       <FileText className="text-black dark:text-white" size={24} />
                                       <div className="text-2xl font-bold text-black dark:text-white">
                                          {stats?.overview ? stats?.overview.totalPosts.count : (stats.totalPosts || 0)}
                                       </div>
                                    </div>
                                    <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Tổng bài viết</div>
                                    {stats?.overview && (
                                       <div className="space-y-1 text-xs">
                                          <div className="text-neutral-500 dark:text-neutral-400">
                                             Tháng này: {stats?.overview.totalPosts.thisMonth}
                                          </div>
                                          <div className={`flex items-center gap-1 ${stats?.overview.totalPosts.growth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                             {stats?.overview.totalPosts.growth >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                             {Math.abs(stats?.overview.totalPosts.growth)}% so với tháng trước
                                          </div>
                                       </div>
                                    )}
                                 </SpotlightCard>

                                 {/* Views */}
                                 <SpotlightCard className="p-4 bg-green-50/50 dark:bg-green-900/10">
                                    <div className="flex items-center gap-2 mb-2">
                                       <Eye className="text-green-600 dark:text-green-400" size={24} />
                                       <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                          {stats?.overview ? stats?.overview.totalViews.count : (stats.totalViews || 0)}
                                       </div>
                                    </div>
                                    <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Tổng lượt xem</div>
                                    {stats?.overview && (
                                       <div className="space-y-1 text-xs">
                                          <div className="text-neutral-500 dark:text-neutral-400">
                                             Tháng này: {stats?.overview.totalViews.thisMonth}
                                          </div>
                                          <div className={`flex items-center gap-1 ${stats?.overview.totalViews.growth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                             {stats?.overview.totalViews.growth >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                             {Math.abs(stats?.overview.totalViews.growth)}% so với tháng trước
                                          </div>
                                       </div>
                                    )}
                                 </SpotlightCard>

                                 {/* Comments */}
                                 <SpotlightCard className="p-4 bg-purple-50/50 dark:bg-purple-900/10">
                                    <div className="flex items-center gap-2 mb-2">
                                       <MessageCircle className="text-purple-600 dark:text-purple-400" size={24} />
                                       <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                          {stats?.overview ? stats?.overview.totalComments.count : (stats.totalComments || 0)}
                                       </div>
                                    </div>
                                    <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Tổng bình luận</div>
                                    {stats?.overview && (
                                       <div className="space-y-1 text-xs">
                                          <div className="text-neutral-500 dark:text-neutral-400">
                                             Tháng này: {stats?.overview.totalComments.thisMonth}
                                          </div>
                                          <div className={`flex items-center gap-1 ${stats?.overview.totalComments.growth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                             {stats?.overview.totalComments.growth >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                             {Math.abs(stats?.overview.totalComments.growth)}% so với tháng trước
                                          </div>
                                       </div>
                                    )}
                                 </SpotlightCard>

                                 {/* Upvotes */}
                                 <SpotlightCard className="p-4 bg-red-50/50 dark:bg-red-900/10">
                                    <div className="flex items-center gap-2 mb-2">
                                       <Heart className="text-red-600 dark:text-red-400" size={24} />
                                       <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                          {stats?.overview ? stats?.overview.totalUpvotes?.count ?? 0 : (stats.totalUpvotes || 0)}
                                       </div>
                                    </div>
                                    <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Tổng upvotes</div>
                                    {stats?.overview?.totalUpvotes && (
                                       <div className="space-y-1 text-xs">
                                          <div className="text-neutral-500 dark:text-neutral-400">
                                             Tháng này: {stats?.overview.totalUpvotes.thisMonth ?? 0}
                                          </div>
                                          <div className={`flex items-center gap-1 ${(stats?.overview.totalUpvotes.growth ?? 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                             {(stats?.overview.totalUpvotes.growth ?? 0) >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                             {Math.abs(stats?.overview.totalUpvotes.growth ?? 0)}% so với tháng trước
                                          </div>
                                       </div>
                                    )}
                                 </SpotlightCard>

                                 {/* Users */}
                                 <SpotlightCard className="p-4 bg-yellow-50/50 dark:bg-yellow-900/10">
                                    <div className="flex items-center gap-2 mb-2">
                                       <Users className="text-yellow-600 dark:text-yellow-400" size={24} />
                                       <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                                          {stats?.overview ? stats?.overview.totalUsers.count : (stats.totalUsers || 0)}
                                       </div>
                                    </div>
                                    <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Tổng người dùng</div>
                                    {stats?.overview && (
                                       <div className="space-y-1 text-xs">
                                          <div className="text-neutral-500 dark:text-neutral-400">
                                             Tháng này: {stats?.overview.totalUsers.thisMonth}
                                          </div>
                                          <div className={`flex items-center gap-1 ${stats?.overview.totalUsers.growth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                             {stats?.overview.totalUsers.growth >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                             {Math.abs(stats?.overview.totalUsers.growth)}% so với tháng trước
                                          </div>
                                       </div>
                                    )}
                                 </SpotlightCard>

                                 {/* Published posts */}
                                 <SpotlightCard className="p-4 bg-indigo-50/50 dark:bg-indigo-900/10">
                                    <div className="flex items-center gap-2 mb-2">
                                       <FileText className="text-indigo-600 dark:text-indigo-400" size={24} />
                                       <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                          {stats?.overview ? stats?.overview.publishedPosts.count : (stats.publishedPosts || 0)}
                                       </div>
                                    </div>
                                    <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Bài đã đăng</div>
                                    {stats?.overview && (
                                       <div className="space-y-1 text-xs">
                                          <div className="text-neutral-500 dark:text-neutral-400">
                                             Tháng này: {stats?.overview.publishedPosts.thisMonth}
                                          </div>
                                          <div className={`flex items-center gap-1 ${stats?.overview.publishedPosts.growth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                             {stats?.overview.publishedPosts.growth >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                             {Math.abs(stats?.overview.publishedPosts.growth)}% so với tháng trước
                                          </div>
                                       </div>
                                    )}
                                 </SpotlightCard>

                                 {/* Draft posts */}
                                 <SpotlightCard className="p-4 bg-gray-50/50 dark:bg-neutral-900/50">
                                    <div className="flex items-center gap-2 mb-2">
                                       <Edit className="text-gray-600 dark:text-gray-400" size={24} />
                                       <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                                          {stats?.overview ? stats?.overview.draftPosts.count : (stats.draftPosts || 0)}
                                       </div>
                                    </div>
                                    <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Bài riêng tư</div>
                                    {stats?.overview && (
                                       <div className="space-y-1 text-xs">
                                          <div className="text-neutral-500 dark:text-neutral-400">
                                             Tháng này: {stats?.overview.draftPosts.thisMonth}
                                          </div>
                                          <div className={`flex items-center gap-1 ${stats?.overview.draftPosts.growth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                             {stats?.overview.draftPosts.growth >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                             {Math.abs(stats?.overview.draftPosts.growth)}% so với tháng trước
                                          </div>
                                       </div>
                                    )}
                                 </SpotlightCard>

                                 {/* Admin */}
                                 <SpotlightCard className="p-4 bg-pink-50/50 dark:bg-pink-900/10">
                                    <div className="flex items-center gap-2 mb-2">
                                       <Crown className="text-pink-600 dark:text-pink-400" size={24} />
                                       <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                                          {stats?.overview ? stats?.overview.adminUsers.count : (stats.adminUsers || 0)}
                                       </div>
                                    </div>
                                    <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Admin</div>
                                    {stats?.overview && (
                                       <div className="space-y-1 text-xs">
                                          <div className="text-neutral-500 dark:text-neutral-400">
                                             Tháng này: {stats?.overview.adminUsers.thisMonth}
                                          </div>
                                          <div className={`flex items-center gap-1 ${stats?.overview.adminUsers.growth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                             {stats?.overview.adminUsers.growth >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                             {Math.abs(stats?.overview.adminUsers.growth)}% so với tháng trước
                                          </div>
                                       </div>
                                    )}
                                 </SpotlightCard>

                                 {/* Online users */}
                                 <SpotlightCard className="p-4 bg-emerald-50/50 dark:bg-emerald-900/10">
                                    <div className="flex items-center gap-2 mb-2">
                                       <Wifi className="text-emerald-600 dark:text-emerald-400" size={24} />
                                       <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                          {onlineUsers.length}
                                       </div>
                                    </div>
                                    <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Đang online</div>
                                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                       {stats?.overview ?
                                          Math.max(0, stats?.overview.totalUsers.count - onlineUsers.length) :
                                          Math.max(0, users.length - onlineUsers.length)
                                       } người offline
                                    </div>
                                 </SpotlightCard>

                                 {/* Total visitors */}
                                 <SpotlightCard className="p-4 bg-cyan-50/50 dark:bg-cyan-900/10">
                                    <div className="flex items-center gap-2 mb-2">
                                       <UserCheck className="text-cyan-600 dark:text-cyan-400" size={24} />
                                       <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                                          {totalVisitors.toLocaleString()}
                                       </div>
                                    </div>
                                    <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Tổng lượt truy cập</div>
                                    {visitorStats && (
                                       <div className="space-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                                          <div>{visitorStats.totalUsers} người đã đăng ký</div>
                                          <div>{visitorStats.usersWithActivity} người đã hoạt động</div>
                                          <div>{visitorStats.onlineUsers} đang online</div>
                                       </div>
                                    )}
                                 </SpotlightCard>
                              </div>

                              {/* Top Lists */}
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                 <SpotlightCard>
                                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><TrendingUp size={18} /> Top bài viết có nhiều lượt xem</h3>
                                    <div className="space-y-3">
                                       {stats.topPosts?.map((post, i) => (
                                          <div key={post._id} className="flex justify-between items-center p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-700/50 shadow-sm">
                                             <div className="flex gap-3 overflow-hidden">
                                                <span className="font-black text-neutral-300">#{i + 1}</span>
                                                <div className="truncate">
                                                   <div className="font-bold text-sm truncate">{post.title}</div>
                                                   <div className="text-xs text-neutral-500">bởi {post.author?.name}</div>
                                                </div>
                                             </div>
                                             <div className="text-sm font-bold text-black dark:text-white">{post.views}</div>
                                          </div>
                                       ))}
                                    </div>
                                 </SpotlightCard>

                                 <SpotlightCard>
                                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Crown size={18} /> Top người dùng có nhiều bài viết</h3>
                                    <div className="space-y-3">
                                       {stats.topUsers?.map((u, i) => (
                                          <div key={u._id} className="flex justify-between items-center p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-700/50 shadow-sm">
                                             <div className="flex gap-3 items-center">
                                                <span className="font-black text-neutral-300">#{i + 1}</span>
                                                <Avatar src={u.avatarUrl} name={u.name} size={32} className="" />
                                                <div className="min-w-0 max-w-[120px]">
                                                   <div className="font-bold text-sm truncate">{u.name}</div>
                                                   <div className="text-xs text-neutral-500 truncate">{u.role}</div>
                                                </div>
                                             </div>
                                             <div className="text-sm font-bold text-green-500">{u.postCount} bài</div>
                                          </div>
                                       ))}
                                    </div>
                                 </SpotlightCard>
                              </div>
                              {/* Charts Section */}
                              <AdminCharts />
                           </>
                        )}
                     </motion.div>
                  )}

                  {/* 2. USERS MANAGEMENT TAB */}
                  {activeTab === "users" && (
                     <motion.div key="users" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <SpotlightCard className="min-h-[600px]">
                           <div className="flex flex-col md:flex-row gap-4 mb-6">
                              <div className="relative flex-1">
                                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                                 <input
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    placeholder="Tìm kiếm theo tên, email..."
                                    value={userSearchTerm}
                                    onChange={e => handleUserSearch(e.target.value)}
                                 />
                              </div>
                              <select
                                 className="px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none cursor-pointer"
                                 value={userRoleFilter}
                                 onChange={e => handleRoleFilterChange(e.target.value)}
                              >
                                 <option value="">Tất cả quyền</option>
                                 {availableRoles.map(r => <option key={r.name} value={r.name}>{r.displayName}</option>)}
                              </select>
                           </div>

                           {/* Desktop Table View */}
                           <div className="hidden md:block overflow-x-auto">
                              <table className="w-full text-left text-sm">
                                 <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
                                    <tr>
                                       <th className="px-4 py-3 font-semibold text-neutral-900 dark:text-white">Người dùng</th>
                                       <th className="px-4 py-3 font-semibold text-neutral-900 dark:text-white">Trạng thái</th>
                                       <th className="px-4 py-3 font-semibold text-neutral-900 dark:text-white">Ngày tham gia</th>
                                       <th className="px-4 py-3 font-semibold text-neutral-900 dark:text-white">Số bài viết</th>
                                       <th className="px-4 py-3 font-semibold text-neutral-900 dark:text-white">Quyền</th>
                                       <th className="px-4 py-3 font-semibold text-neutral-900 dark:text-white">Hành động</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                                    {users.map(u => {
                                       const isOnline = onlineUsers.some(ou => ou._id === u._id || ou._id?.toString() === u._id?.toString());
                                       const isBanned = u.isBanned;
                                       return (
                                          <tr key={u._id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                                             <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                   <Avatar src={u.avatarUrl} name={u.name} size={40} className="" />
                                                   <div className="min-w-0 max-w-[180px]">
                                                      <div className="font-bold text-sm truncate flex items-center gap-1">
                                                         {u.name}
                                                         <VerifiedBadge role={u.role?.name || u.role} isVerified={u.isVerified} />
                                                      </div>
                                                      <div className="text-xs text-neutral-500 truncate">{u.email}</div>
                                                   </div>
                                                </div>
                                             </td>
                                             <td className="px-4 py-3">
                                                <div className="flex flex-col gap-1">
                                                   {isBanned ? (
                                                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                                                         <Ban size={12} />
                                                         Bị cấm
                                                      </span>
                                                   ) : isOnline ? (
                                                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                                                         <Wifi size={12} />
                                                         Đang online
                                                      </span>
                                                   ) : (
                                                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-neutral-900 text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-neutral-800">
                                                         <WifiOff size={12} />
                                                         Offline
                                                      </span>
                                                   )}
                                                </div>
                                             </td>
                                             <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                                                {u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN', {
                                                   year: 'numeric',
                                                   month: '2-digit',
                                                   day: '2-digit'
                                                }) : 'N/A'}
                                             </td>
                                             <td className="px-4 py-3">
                                                <span className="font-semibold text-black dark:text-white">{u.postCount || 0}</span>
                                             </td>
                                             <td className="px-4 py-3">
                                                <select
                                                   value={u.role?.name || u.role}
                                                   onChange={(e) => updateUserRole(u._id, e.target.value)}
                                                   disabled={u._id === user._id || updatingRoles.has(u._id)}
                                                   className="text-xs bg-transparent border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-1 outline-none cursor-pointer hover:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-50 appearance-none"
                                                >
                                                   {availableRoles.map(r => <option key={r.name} value={r.name}>{r.displayName}</option>)}
                                                </select>
                                             </td>
                                             <td className="px-4 py-3">
                                                <button onClick={() => deleteUser(u._id)} disabled={u._id === user._id} className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50">
                                                   <Trash2 size={16} />
                                                </button>
                                             </td>
                                          </tr>
                                       );
                                    })}
                                    {users.length === 0 && (
                                       <tr>
                                          <td colSpan="6" className="px-4 py-12 text-center text-neutral-500">
                                             {usersLoading ? "Đang tải..." : "Không có người dùng nào"}
                                          </td>
                                       </tr>
                                    )}
                                 </tbody>
                              </table>
                           </div>

                           {/* Mobile List View */}
                           <div className="md:hidden space-y-2">
                              {users.map(u => {
                                 const isOnline = onlineUsers.some(ou => ou._id === u._id || ou._id?.toString() === u._id?.toString());
                                 const isBanned = u.isBanned;
                                 return (
                                    <div key={u._id} className="p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-xl transition-all border border-neutral-100 dark:border-neutral-800/50 hover:border-neutral-300 dark:hover:border-neutral-700 shadow-sm hover:shadow-md">
                                       <div className="flex items-start justify-between mb-2">
                                          <div className="flex items-center gap-3 overflow-hidden flex-1">
                                             <Avatar src={u.avatarUrl} name={u.name} size={40} className="flex-shrink-0" />
                                             <div className="min-w-0 flex-1">
                                                <div className="font-bold text-sm truncate flex items-center gap-1">
                                                   {u.name}
                                                   <VerifiedBadge role={u.role?.name || u.role} isVerified={u.isVerified} />
                                                </div>
                                                <div className="text-xs text-neutral-500 truncate">{u.email}</div>
                                             </div>
                                          </div>
                                          <button onClick={() => deleteUser(u._id)} disabled={u._id === user._id} className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0">
                                             <Trash2 size={16} />
                                          </button>
                                       </div>
                                       <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                                          <div>
                                             <span className="text-neutral-500">Trạng thái:</span>
                                             <div className="mt-1">
                                                {isBanned ? (
                                                   <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                                                      <Ban size={10} />
                                                      Bị cấm
                                                   </span>
                                                ) : isOnline ? (
                                                   <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                                      <Wifi size={10} />
                                                      Online
                                                   </span>
                                                ) : (
                                                   <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-neutral-900 text-gray-700 dark:text-gray-400">
                                                      <WifiOff size={10} />
                                                      Offline
                                                   </span>
                                                )}
                                             </div>
                                          </div>
                                          <div>
                                             <span className="text-neutral-500">Số bài viết:</span>
                                             <div className="mt-1 font-semibold text-black dark:text-white">{u.postCount || 0}</div>
                                          </div>
                                       </div>
                                       <div className="text-xs text-neutral-500 mb-2">
                                          Ngày tham gia: {u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                                       </div>
                                       <div>
                                          <select
                                             value={u.role?.name || u.role}
                                             onChange={(e) => updateUserRole(u._id, e.target.value)}
                                             disabled={u._id === user._id || updatingRoles.has(u._id)}
                                             className="w-full text-xs bg-transparent border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-1 outline-none cursor-pointer hover:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-50 appearance-none"
                                          >
                                             {availableRoles.map(r => <option key={r.name} value={r.name}>{r.displayName}</option>)}
                                          </select>
                                       </div>
                                    </div>
                                 );
                              })}
                           </div>

                           {/* Pagination Controls */}
                           <Pagination
                              pagination={userPagination}
                              onPageChange={goToPage}
                              loading={usersLoading}
                           />
                        </SpotlightCard>
                     </motion.div>
                  )}

                  {/* 3. ONLINE & TRAFFIC */}
                  {activeTab === "online" && (
                     <motion.div key="online" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">Thống kê truy cập và người dùng</h2>

                        {/* Visitor Stats Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                           <SpotlightCard className="p-4 text-center bg-emerald-50/50 dark:bg-emerald-900/10">
                              <Wifi size={32} className="mx-auto text-emerald-600 dark:text-emerald-400 mb-2" />
                              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{onlineUsers.length}</div>
                              <div className="text-sm text-neutral-600 dark:text-neutral-400">Đang online</div>
                           </SpotlightCard>
                           <SpotlightCard className="p-4 text-center bg-gray-50/50 dark:bg-neutral-900/50">
                              <WifiOff size={32} className="mx-auto text-gray-600 dark:text-gray-400 mb-2" />
                              <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                                 {stats?.overview ?
                                    Math.max(0, stats?.overview.totalUsers.count - onlineUsers.length) :
                                    Math.max(0, users.length - onlineUsers.length)
                                 }
                              </div>
                              <div className="text-sm text-neutral-600 dark:text-neutral-400">Offline</div>
                           </SpotlightCard>
                           <SpotlightCard className="p-4 text-center bg-neutral-100 dark:bg-neutral-800/50 dark:bg-blue-900/10">
                              <UserCheck size={32} className="mx-auto text-black dark:text-white mb-2" />
                              <div className="text-2xl font-bold text-black dark:text-white">{totalVisitors.toLocaleString()}</div>
                              <div className="text-sm text-neutral-600 dark:text-neutral-400">Tổng lượt truy cập</div>
                           </SpotlightCard>
                           <SpotlightCard className="p-4 text-center bg-purple-50/50 dark:bg-purple-900/10">
                              <Users size={32} className="mx-auto text-purple-600 dark:text-purple-400 mb-2" />
                              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                 {stats?.overview ? stats?.overview.totalUsers.count : users.length}
                              </div>
                              <div className="text-sm text-neutral-600 dark:text-neutral-400">Tổng người dùng</div>
                           </SpotlightCard>
                        </div>

                        {/* System Health */}
                        <SpotlightCard>
                           <SystemHealth />
                        </SpotlightCard>

                        {/* Detailed Time Stats */}
                        {visitorStats && visitorStats.timeStats && (
                           <SpotlightCard>
                              <h3 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-white">Thống kê truy cập theo thời gian</h3>
                              {/* Daily Active Users Chart */}
                              <ActiveUsersChart />
                              {/* Stats below chart */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                                 <div className="text-center p-4 bg-green-50/50 dark:bg-green-900/10 rounded-xl">
                                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{visitorStats.timeStats.today}</div>
                                    <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Hôm nay</div>
                                 </div>
                                 <div className="text-center p-4 bg-neutral-100 dark:bg-neutral-800/50 dark:bg-blue-900/10 rounded-xl">
                                    <div className="text-2xl font-bold text-black dark:text-white">{visitorStats.timeStats.thisWeek}</div>
                                    <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Tuần này</div>
                                 </div>
                                 <div className="text-center p-4 bg-purple-50/50 dark:bg-purple-900/10 rounded-xl">
                                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{visitorStats.timeStats.thisMonth}</div>
                                    <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Tháng này</div>
                                 </div>
                              </div>
                           </SpotlightCard>
                        )}

                        {/* Online User List */}
                        <SpotlightCard>
                           <div className="flex justify-between items-center mb-4">
                              <h3 className="font-bold text-lg text-neutral-900 dark:text-white">
                                 Người dùng trực tuyến
                                 <span className="ml-2 text-sm font-normal text-neutral-500">
                                    ({onlineUsers.length} {onlineUsers.length > 100 ? `(hiển thị 100 đầu tiên)` : ''})
                                 </span>
                              </h3>
                              <button onClick={updateOfflineUsers} className="text-xs font-bold px-3 py-1.5 border border-orange-300 dark:border-orange-700/50 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-400 dark:hover:border-orange-600 transition-all shadow-sm hover:shadow-md">Force Update</button>
                           </div>
                           <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                              {onlineUsers.slice(0, 100).map(u => (
                                 <div key={u._id} className="flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 transition-all">
                                    <div className="flex items-center gap-3">
                                       <div className="relative">
                                          <Avatar src={u.avatarUrl} name={u.name} size={32} className="" />
                                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-neutral-900 rounded-full"></span>
                                       </div>
                                       <div className="min-w-0 max-w-[150px]">
                                          <div className="font-bold text-sm text-neutral-900 dark:text-white truncate">{u.name}</div>
                                          <div className="text-xs text-neutral-500 truncate">{u.email}</div>
                                       </div>
                                    </div>
                                    <div className="text-xs font-mono text-neutral-400">{new Date(u.lastSeen).toLocaleTimeString()}</div>
                                 </div>
                              ))}
                              {onlineUsers.length === 0 && <div className="text-center py-10 text-neutral-500">Không có ai online.</div>}
                              {onlineUsers.length > 100 && (
                                 <div className="text-center py-4 text-sm text-neutral-500 border-t border-neutral-200 dark:border-neutral-700 mt-2">
                                    Đang hiển thị 100 người đầu tiên trong tổng số {onlineUsers.length} người đang online
                                 </div>
                              )}
                           </div>
                        </SpotlightCard>
                     </motion.div>
                  )}

                  {/* 4. BAN MANAGEMENT */}
                  {activeTab === "bans" && (
                     <motion.div key="bans" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <SpotlightCard>
                           <h3 className="font-bold text-lg mb-6 text-red-600 flex items-center gap-2"><Ban size={20} /> Xử phạt người dùng</h3>

                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                              <div>
                                 <label className="block text-xs font-bold uppercase text-neutral-500 mb-1">Tìm người dùng</label>
                                 <input
                                    type="text"
                                    placeholder="Nhập tên hoặc email để tìm..."
                                    value={banForm.searchTerm || ''}
                                    onChange={e => setBanForm({ ...banForm, searchTerm: e.target.value, userId: '' })}
                                    className="w-full p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                                 />
                              </div>
                              <div>
                                 <label className="block text-xs font-bold uppercase text-neutral-500 mb-1">Chọn người dùng</label>
                                 <select
                                    value={banForm.userId}
                                    onChange={e => setBanForm({ ...banForm, userId: e.target.value })}
                                    className="w-full p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors appearance-none cursor-pointer"
                                 >
                                    <option value="">Chọn người dùng...</option>
                                    {users
                                       .filter(u => !u.isBanned && u.role !== 'admin')
                                       .filter(u => {
                                          if (!banForm.searchTerm) return true;
                                          const term = banForm.searchTerm.toLowerCase();
                                          return u.name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term);
                                       })
                                       .slice(0, 50)
                                       .map(u => (
                                          <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                                       ))}
                                 </select>
                                 {banForm.searchTerm && (
                                    <div className="text-xs text-neutral-500 mt-1">
                                       Hiển thị tối đa 50 kết quả phù hợp
                                    </div>
                                 )}
                              </div>
                              <div>
                                 <label className="block text-xs font-bold uppercase text-neutral-500 mb-1">Thời gian</label>
                                 <select
                                    value={banForm.duration}
                                    onChange={e => setBanForm({ ...banForm, duration: e.target.value })}
                                    className="w-full p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors appearance-none cursor-pointer"
                                 >
                                    <option value="">Chọn thời hạn...</option>
                                    <option value="60">1 giờ</option>
                                    <option value="1440">24 giờ</option>
                                    <option value="10080">7 ngày</option>
                                    <option value="permanent">Vĩnh viễn</option>
                                 </select>
                              </div>
                              <div className="md:col-span-2">
                                 <label className="block text-xs font-bold uppercase text-neutral-500 mb-1">Lý do</label>
                                 <input
                                    value={banForm.reason}
                                    onChange={e => setBanForm({ ...banForm, reason: e.target.value })}
                                    placeholder="Vi phạm tiêu chuẩn cộng đồng..."
                                    className="w-full p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                                 />
                              </div>
                           </div>
                           <div className="flex justify-end">
                              <button
                                 onClick={async (e) => {
                                    e.preventDefault();
                                    const success = await handleBanSubmit(e);
                                    if (success) {
                                       // Optimistic update
                                       const banExpiresAt = banForm.duration === "permanent" ? null : new Date(Date.now() + parseInt(banForm.duration) * 60 * 1000);
                                       updateSingleUserInState(banForm.userId, { isBanned: true, banReason: banForm.reason, bannedAt: new Date(), banExpiresAt });
                                    }
                                 }}
                                 disabled={!banForm.userId || !banForm.duration || !banForm.reason || actionLoading}
                                 className="px-6 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
                              >
                                 {actionLoading ? <Loader2 className="animate-spin" /> : "Thi hành kỷ luật"}
                              </button>
                           </div>

                           {/* Banned List */}
                           <div className="mt-10 pt-6 border-t border-neutral-200/80 dark:border-neutral-800/80">
                              <h4 className="font-bold mb-4">Danh sách đang bị cấm</h4>
                              <div className="space-y-2">
                                 {users.filter(u => u.isBanned).map(u => (
                                    <div key={u._id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800/50 shadow-sm">
                                       <div className="min-w-0 flex-1">
                                          <div className="font-bold text-sm text-red-800 dark:text-red-300 truncate max-w-[200px]">{u.name}</div>
                                          <div className="text-xs text-red-600/70 truncate">{u.banReason} • {u.banExpiresAt ? `Hết hạn: ${new Date(u.banExpiresAt).toLocaleDateString()}` : "Vĩnh viễn"}</div>
                                       </div>
                                       <button
                                          onClick={async () => {
                                             if (await unbanUser(u._id)) {
                                                updateSingleUserInState(u._id, { isBanned: false, banReason: null, bannedAt: null, banExpiresAt: null });
                                             }
                                          }}
                                          className="px-3 py-1.5 bg-white dark:bg-black text-xs font-bold rounded-lg border border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-400 dark:hover:border-red-600 transition-all shadow-sm hover:shadow-md"
                                       >
                                          Gỡ cấm
                                       </button>
                                    </div>
                                 ))}
                                 {users.filter(u => u.isBanned).length === 0 && <div className="text-center text-neutral-500 text-sm">Danh sách trống</div>}
                              </div>
                           </div>
                        </SpotlightCard>
                     </motion.div>
                  )}

                  {/* 5. NOTIFICATIONS TAB */}
                  {activeTab === "notifications" && (
                     <motion.div key="notifications" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                           <SpotlightCard>
                              <h3 className="font-bold text-lg mb-4 text-black dark:text-white">Thông báo Hệ thống</h3>
                              <div className="space-y-4">
                                 <input
                                    placeholder="Tiêu đề..."
                                    value={notificationForm.title}
                                    onChange={e => setNotificationForm({ ...notificationForm, title: e.target.value })}
                                    className="w-full p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                 />
                                 <textarea
                                    rows={3}
                                    placeholder="Nội dung..."
                                    value={notificationForm.message}
                                    onChange={e => setNotificationForm({ ...notificationForm, message: e.target.value })}
                                    className="w-full p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors"
                                 />
                                 <select
                                    value={notificationForm.targetRole}
                                    onChange={e => setNotificationForm({ ...notificationForm, targetRole: e.target.value })}
                                    className="w-full p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none cursor-pointer"
                                 >
                                    <option value="">Tất cả người dùng</option>
                                    <option value="admin">Chỉ admin</option>
                                    <option value="user">Chỉ người dùng</option>
                                 </select>
                                 <button
                                    onClick={handleNotificationSubmit}
                                    disabled={!notificationForm.title || !notificationForm.message}
                                    className="w-full py-3 bg-black dark:bg-white text-white dark:text-black font-bold rounded-xl hover:opacity-80 transition-colors disabled:opacity-50"
                                 >
                                    Gửi thông báo
                                 </button>
                              </div>
                           </SpotlightCard>
                           {/* Có thể thêm history thông báo ở đây */}
                        </div>
                     </motion.div>
                  )}

                  {/* OTHER TABS */}
                  {activeTab === "feedback" && <div className="pt-4"><AdminFeedback /></div>}
                  {activeTab === "api-monitoring" && <div className="pt-4"><APIMonitoring /></div>}
                  {activeTab === "roles" && (
                     <div className="pt-4">
                        <RoleManagement onRolesChange={async () => { await loadAvailableRoles(); await refreshAllData(); }} />
                     </div>
                  )}

                  {activeTab === "posts" && (
                     <motion.div key="posts" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <AdminPostsTab />
                     </motion.div>
                  )}

                  {activeTab === "comments" && (
                     <motion.div key="comments" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <AdminCommentsTab />
                     </motion.div>
                  )}

                  {activeTab === "reports" && (
                     <motion.div key="reports" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <AdminReportsTab />
                     </motion.div>
                  )}

                  {activeTab === "insights" && (
                     <AdminInsightsTab />
                  )}

               </AnimatePresence>
            </div>
         </div>
         {/* Mobile Quick Actions Bar */}
         <MobileQuickActions
            stats={stats}
            onlineCount={onlineUsers?.length || 0}
            onBanUser={async (email, reason) => {
               setBanForm(prev => ({ ...prev, email, reason }));
               await handleBanSubmit({ email, reason, userId: null });
            }}
            loading={actionLoading}
         />
      </PageLayout>
   );
}
