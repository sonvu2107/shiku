import React, { useEffect, useState, useCallback } from "react";
import AdminFeedback from "./AdminFeedback";
import APIMonitoring from "../components/APIMonitoring";
import RoleManagement from "../components/RoleManagement";
import AutoLikeBot from "../components/AutoLikeBot";
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
import AdminGiftCodeTab from '../components/admin/AdminGiftCodeTab';
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
   Flag,
   Gift
} from "lucide-react";

/**
 * AdminDashboard - Admin dashboard page (Redesigned)
 * Style: Monochrome Luxury
 */
export default function AdminDashboard() {
   // ==================== CUSTOM HOOKS ====================

   const toast = useToast();
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
   const [expAdjustModal, setExpAdjustModal] = useState({
      open: false,
      user: null,
      mode: "delta",
      value: "",
      reason: ""
   });
   const [expAdjustLoading, setExpAdjustLoading] = useState(false);

   // State cho search users trong ban tab
   const [banSearchResults, setBanSearchResults] = useState([]);
   const [banSearchLoading, setBanSearchLoading] = useState(false);
   const banSearchTimeoutRef = React.useRef(null);

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

   // Search users cho ban form (server-side)
   const searchUsersForBan = React.useCallback(async (searchTerm) => {
      if (!searchTerm || searchTerm.length < 2) {
         setBanSearchResults([]);
         return;
      }
      setBanSearchLoading(true);
      try {
         const res = await api(`/api/admin/users?search=${encodeURIComponent(searchTerm)}&limit=50`);
         // Filter: không bị ban và không phải admin
         const filtered = (res.users || []).filter(u => !u.isBanned && u.role !== 'admin');
         setBanSearchResults(filtered);
      } catch (e) {
         setBanSearchResults([]);
      } finally {
         setBanSearchLoading(false);
      }
   }, []);

   // Handle ban search input với debounce
   const handleBanSearch = React.useCallback((value) => {
      setBanForm({ ...banForm, searchTerm: value, userId: '' });
      if (banSearchTimeoutRef.current) clearTimeout(banSearchTimeoutRef.current);
      banSearchTimeoutRef.current = setTimeout(() => {
         searchUsersForBan(value);
      }, 400);
   }, [banForm, setBanForm, searchUsersForBan]);

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

   // Helper function to format numbers with K/M suffixes
   const formatNumber = (num) => {
      if (num === null || num === undefined) return '0';
      return num.toLocaleString('vi-VN');
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

   const openExpAdjustModal = useCallback((targetUser) => {
      setExpAdjustModal({
         open: true,
         user: targetUser,
         mode: "delta",
         value: "",
         reason: ""
      });
   }, []);

   const closeExpAdjustModal = useCallback(() => {
      setExpAdjustModal({
         open: false,
         user: null,
         mode: "delta",
         value: "",
         reason: ""
      });
      setExpAdjustLoading(false);
   }, []);

   const handleExpAdjustSubmit = useCallback(async (event) => {
      event?.preventDefault();
      if (!expAdjustModal.user) return;

      const rawValue = String(expAdjustModal.value || "").trim();
      if (!rawValue) {
         showError("Vui lòng nhập giá trị tu vi");
         return;
      }

      const parsedValue = Number(rawValue);
      if (!Number.isFinite(parsedValue) || !Number.isInteger(parsedValue)) {
         showError("Giá trị phải là số nguyên");
         return;
      }

      if (expAdjustModal.mode === "set" && parsedValue < 0) {
         showError("Tu vi không thể nhỏ hơn 0");
         return;
      }

      const payload = expAdjustModal.mode === "set"
         ? { exp: parsedValue }
         : { delta: parsedValue };

      if (expAdjustModal.reason?.trim()) {
         payload.reason = expAdjustModal.reason.trim();
      }

      setExpAdjustLoading(true);
      try {
         const response = await api(`/api/admin/users/${expAdjustModal.user._id}/cultivation-exp`, {
            method: "POST",
            body: payload
         });
         if (response?.success) {
            const delta = response?.data?.delta;
            const deltaLabel = typeof delta === "number" ? delta.toLocaleString("vi-VN") : null;
            showSuccess(deltaLabel ? `Đã cập nhật tu vi (${deltaLabel})` : "Đã cập nhật tu vi");
            updateSingleUserInState(expAdjustModal.user._id, {
               cultivationCache: {
                  ...(expAdjustModal.user.cultivationCache || {}),
                  exp: response.data?.exp ?? expAdjustModal.user.cultivationCache?.exp ?? 0,
                  realmLevel: response.data?.realmLevel ?? expAdjustModal.user.cultivationCache?.realmLevel,
                  realmName: response.data?.realmName ?? expAdjustModal.user.cultivationCache?.realmName
               }
            });
            closeExpAdjustModal();
         } else {
            showError(response?.message || "Không thể cập nhật tu vi");
         }
      } catch (e) {
         showError(e.message || "Lỗi cập nhật tu vi");
      } finally {
         setExpAdjustLoading(false);
      }
   }, [expAdjustModal, closeExpAdjustModal, showError, showSuccess, updateSingleUserInState]);

   if (dataLoading && !user) {
      return (
         <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-black dark:border-white"></div>
         </div>
      );
   }

   // --- SIDEBAR TABS CONFIGURATION ---
   const menuGroups = [
      {
         label: 'Phân tích',
         items: [
            { id: 'stats', label: 'Thống kê', icon: BarChart3, permission: 'admin.viewStats' },
            { id: 'insights', label: 'Insights', icon: Target, permission: 'admin.viewStats' },
            { id: 'online', label: 'Online & Traffic', icon: Activity, permission: 'admin.viewStats' },
         ]
      },
      {
         label: 'Nội dung',
         items: [
            { id: 'posts', label: 'Quản lý bài viết', icon: FileText, permission: 'admin.managePosts' },
            { id: 'comments', label: 'Quản lý bình luận', icon: MessageCircle, permission: 'admin.manageComments' },
            { id: 'reports', label: 'Báo cáo', icon: Flag, permission: 'admin.manageReports' },
         ]
      },
      {
         label: 'Người dùng',
         items: [
            { id: 'users', label: 'Quản lý người dùng', icon: Users, permission: 'admin.manageUsers' },
            { id: 'roles', label: 'Phân quyền', icon: Crown, permission: 'admin.manageRoles' },
            { id: 'bans', label: 'Cấm người dùng', icon: Ban, permission: 'admin.manageBans' },
         ]
      },
      {
         label: 'Hệ thống',
         items: [
            { id: 'notifications', label: 'Thông báo', icon: Bell, permission: 'admin.sendNotifications' },
            { id: 'feedback', label: 'Phản hồi', icon: MessageCircle, permission: 'admin.viewFeedback' },
            { id: 'bot', label: 'Auto Bot', icon: Heart, permission: 'admin.manageUsers' },
            { id: 'giftcode', label: 'Mã Quà Tặng', icon: Gift, permission: 'admin.manageUsers' },
            { id: 'equipment', label: 'Trang Bị', icon: Sword, external: true, path: '/admin/equipment', permission: 'admin.manageEquipment' },
            { id: 'api-monitoring', label: 'API Monitor', icon: Code, permission: 'admin.viewAPI' },
         ]
      }
   ];

   // Filter menu groups based on user permissions
   const filteredGroups = menuGroups.map(group => ({
      ...group,
      items: group.items.filter(item => hasPermission(item.permission))
   })).filter(group => group.items.length > 0);

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
               <div className="bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl rounded-2xl p-3 border border-neutral-200/80 dark:border-neutral-800/80 shadow-sm sticky top-24 overflow-y-auto max-h-[calc(100vh-8rem)] custom-scrollbar">
                  {filteredGroups.map((group, groupIndex) => (
                     <div key={group.label} className={groupIndex > 0 ? "mt-4 pt-4 border-t border-neutral-200/60 dark:border-neutral-700/60" : ""}>
                        {/* Group Header */}
                        <div className="px-3 py-2 text-[11px] uppercase font-semibold tracking-wider text-neutral-400 dark:text-neutral-500">
                           {group.label}
                        </div>
                        {/* Group Items */}
                        {group.items.map((item) => {
                           if (item.external) {
                              return (
                                 <button
                                    key={item.id}
                                    onClick={() => navigate(item.path)}
                                    className={cn(
                                       "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-1 last:mb-0",
                                       "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-neutral-200"
                                    )}
                                 >
                                    <div className="flex items-center gap-3">
                                       <item.icon size={18} className="text-neutral-400 dark:text-neutral-500" />
                                       {item.label}
                                    </div>
                                    <ChevronRight size={16} className="text-neutral-400" />
                                 </button>
                              );
                           }
                           return (
                              <button
                                 key={item.id}
                                 onClick={() => setActiveTab(item.id)}
                                 className={cn(
                                    "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-1 last:mb-0",
                                    activeTab === item.id
                                       ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-md"
                                       : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-neutral-200"
                                 )}
                              >
                                 <div className="flex items-center gap-3">
                                    <item.icon size={18} className={activeTab === item.id ? "text-white dark:text-neutral-900" : "text-neutral-400 dark:text-neutral-500"} />
                                    {item.label}
                                 </div>
                                 {activeTab === item.id && <ChevronRight size={16} />}
                              </button>
                           );
                        })}
                     </div>
                  ))}
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
                              {/* Overview Cards - Grouped Layout */}
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                                 {/* Content Stats Group */}
                                 <SpotlightCard className="p-5 dark:bg-neutral-800/60 border dark:border-neutral-700/50">
                                    <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-4">Nội dung</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                       {/* Posts */}
                                       <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/50">
                                          <div className="flex items-center gap-2 mb-1">
                                             <FileText className="text-blue-600 dark:text-blue-400" size={18} />
                                             <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Bài viết</span>
                                          </div>
                                          <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                                             {formatNumber(stats?.overview ? stats?.overview.totalPosts.count : (stats.totalPosts || 0))}
                                          </div>
                                          {stats?.overview && (
                                             <div className="text-xs flex items-center gap-1.5 mt-1">
                                                <span className="text-neutral-500 dark:text-neutral-400">+{formatNumber(stats?.overview.totalPosts.thisMonth)} tháng này</span>
                                                <span className="text-neutral-300 dark:text-neutral-600">•</span>
                                                <span className={stats?.overview.totalPosts.growth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                                   {stats?.overview.totalPosts.growth >= 0 ? '+' : ''}{stats?.overview.totalPosts.growth}%
                                                </span>
                                             </div>
                                          )}
                                       </div>
                                       {/* Views */}
                                       <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/50">
                                          <div className="flex items-center gap-2 mb-1">
                                             <Eye className="text-green-600 dark:text-green-400" size={18} />
                                             <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Lượt xem</span>
                                          </div>
                                          <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                                             {formatNumber(stats?.overview ? stats?.overview.totalViews.count : (stats.totalViews || 0))}
                                          </div>
                                          {stats?.overview && (
                                             <div className="text-xs flex items-center gap-1.5 mt-1">
                                                <span className="text-neutral-500 dark:text-neutral-400">+{formatNumber(stats?.overview.totalViews.thisMonth)} tháng này</span>
                                                <span className="text-neutral-300 dark:text-neutral-600">•</span>
                                                <span className={stats?.overview.totalViews.growth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                                   {stats?.overview.totalViews.growth >= 0 ? '+' : ''}{stats?.overview.totalViews.growth}%
                                                </span>
                                             </div>
                                          )}
                                       </div>
                                       {/* Comments */}
                                       <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/50">
                                          <div className="flex items-center gap-2 mb-1">
                                             <MessageCircle className="text-purple-600 dark:text-purple-400" size={18} />
                                             <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Bình luận</span>
                                          </div>
                                          <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                                             {formatNumber(stats?.overview ? stats?.overview.totalComments.count : (stats.totalComments || 0))}
                                          </div>
                                          {stats?.overview && (
                                             <div className="text-xs flex items-center gap-1.5 mt-1">
                                                <span className="text-neutral-500 dark:text-neutral-400">+{formatNumber(stats?.overview.totalComments.thisMonth)} tháng này</span>
                                                <span className="text-neutral-300 dark:text-neutral-600">•</span>
                                                <span className={stats?.overview.totalComments.growth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                                   {stats?.overview.totalComments.growth >= 0 ? '+' : ''}{stats?.overview.totalComments.growth}%
                                                </span>
                                             </div>
                                          )}
                                       </div>
                                       {/* Upvotes */}
                                       <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/50">
                                          <div className="flex items-center gap-2 mb-1">
                                             <Heart className="text-red-600 dark:text-red-400" size={18} />
                                             <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Upvotes</span>
                                          </div>
                                          <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                                             {formatNumber(stats?.overview ? stats?.overview.totalUpvotes?.count ?? 0 : (stats.totalUpvotes || 0))}
                                          </div>
                                          {stats?.overview?.totalUpvotes && (
                                             <div className="text-xs flex items-center gap-1.5 mt-1">
                                                <span className="text-neutral-500 dark:text-neutral-400">+{formatNumber(stats?.overview.totalUpvotes.thisMonth ?? 0)} tháng này</span>
                                                <span className="text-neutral-300 dark:text-neutral-600">•</span>
                                                <span className={(stats?.overview.totalUpvotes.growth ?? 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                                   {(stats?.overview.totalUpvotes.growth ?? 0) >= 0 ? '+' : ''}{stats?.overview.totalUpvotes.growth ?? 0}%
                                                </span>
                                             </div>
                                          )}
                                       </div>
                                    </div>
                                 </SpotlightCard>

                                 {/* User Stats Group */}
                                 <SpotlightCard className="p-5 dark:bg-neutral-800/60 border dark:border-neutral-700/50">
                                    <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-4">Người dùng</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                       {/* Total Users */}
                                       <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/50">
                                          <div className="flex items-center gap-2 mb-1">
                                             <Users className="text-amber-600 dark:text-amber-400" size={18} />
                                             <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Tổng người dùng</span>
                                          </div>
                                          <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                                             {formatNumber(stats?.overview ? stats?.overview.totalUsers.count : (stats.totalUsers || 0))}
                                          </div>
                                          {stats?.overview && (
                                             <div className="text-xs flex items-center gap-1.5 mt-1">
                                                <span className="text-neutral-500 dark:text-neutral-400">+{formatNumber(stats?.overview.totalUsers.thisMonth)} tháng này</span>
                                                <span className="text-neutral-300 dark:text-neutral-600">•</span>
                                                <span className={stats?.overview.totalUsers.growth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                                   {stats?.overview.totalUsers.growth >= 0 ? '+' : ''}{stats?.overview.totalUsers.growth}%
                                                </span>
                                             </div>
                                          )}
                                       </div>
                                       {/* Online */}
                                       <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/50">
                                          <div className="flex items-center gap-2 mb-1">
                                             <Wifi className="text-emerald-600 dark:text-emerald-400" size={18} />
                                             <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Đang online</span>
                                          </div>
                                          <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                                             {onlineUsers.length}
                                          </div>
                                          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                             {stats?.overview ?
                                                Math.max(0, stats?.overview.totalUsers.count - onlineUsers.length) :
                                                Math.max(0, users.length - onlineUsers.length)
                                             } offline
                                          </div>
                                       </div>
                                       {/* Admins */}
                                       <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/50">
                                          <div className="flex items-center gap-2 mb-1">
                                             <Crown className="text-pink-600 dark:text-pink-400" size={18} />
                                             <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Admin</span>
                                          </div>
                                          <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                                             {stats?.overview ? stats?.overview.adminUsers.count : (stats.adminUsers || 0)}
                                          </div>
                                          {stats?.overview && (
                                             <div className={`text-xs flex items-center gap-1 mt-1 ${stats?.overview.adminUsers.growth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {stats?.overview.adminUsers.growth >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                {Math.abs(stats?.overview.adminUsers.growth)}%
                                             </div>
                                          )}
                                       </div>
                                       {/* Visitors */}
                                       <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/50">
                                          <div className="flex items-center gap-2 mb-1">
                                             <UserCheck className="text-cyan-600 dark:text-cyan-400" size={18} />
                                             <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Đã đăng ký</span>
                                          </div>
                                          <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                                             {formatNumber(totalVisitors)}
                                          </div>
                                          {visitorStats && (
                                             <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                                {visitorStats.usersWithActivity} có hoạt động
                                             </div>
                                          )}
                                       </div>
                                    </div>
                                 </SpotlightCard>

                                 {/* Post Status Group */}
                                 <SpotlightCard className="p-5 dark:bg-neutral-800/60 border dark:border-neutral-700/50 lg:col-span-2">
                                    <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-4">Trạng thái bài viết</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                       {/* Published */}
                                       <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/50">
                                          <div className="flex items-center gap-2 mb-1">
                                             <FileText className="text-indigo-600 dark:text-indigo-400" size={18} />
                                             <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Đã đăng</span>
                                          </div>
                                          <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                                             {formatNumber(stats?.overview ? stats?.overview.publishedPosts.count : (stats.publishedPosts || 0))}
                                          </div>
                                          {stats?.overview && (
                                             <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                                +{stats?.overview.publishedPosts.thisMonth} tháng này
                                             </div>
                                          )}
                                       </div>
                                       {/* Draft */}
                                       <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/50">
                                          <div className="flex items-center gap-2 mb-1">
                                             <Edit className="text-gray-600 dark:text-gray-400" size={18} />
                                             <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Riêng tư</span>
                                          </div>
                                          <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                                             {formatNumber(stats?.overview ? stats?.overview.draftPosts.count : (stats.draftPosts || 0))}
                                          </div>
                                          {stats?.overview && (
                                             <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                                +{stats?.overview.draftPosts.thisMonth} tháng này
                                             </div>
                                          )}
                                       </div>
                                       {/* This Month Posts */}
                                       <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/50">
                                          <div className="flex items-center gap-2 mb-1">
                                             <TrendingUp className="text-green-600 dark:text-green-400" size={18} />
                                             <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Tháng này</span>
                                          </div>
                                          <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                                             {stats?.overview?.totalPosts.thisMonth || 0}
                                          </div>
                                          {stats?.overview && (
                                             <div className={`text-xs flex items-center gap-1 mt-1 ${stats?.overview.totalPosts.growth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {stats?.overview.totalPosts.growth >= 0 ? '+' : ''}{stats?.overview.totalPosts.growth}% so tháng trước
                                             </div>
                                          )}
                                       </div>
                                       {/* Activity */}
                                       <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/50">
                                          <div className="flex items-center gap-2 mb-1">
                                             <Activity className="text-orange-600 dark:text-orange-400" size={18} />
                                             <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Hoạt động</span>
                                          </div>
                                          <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                                             {formatNumber((stats?.overview?.totalComments.thisMonth || 0) + (stats?.overview?.totalPosts.thisMonth || 0))}
                                          </div>
                                          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                             Bài + Bình luận tháng này
                                          </div>
                                       </div>
                                    </div>
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
                                       <th className="px-4 py-3 font-semibold text-neutral-900 dark:text-white">Tu vi</th>
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
                                                <span className="font-semibold text-black dark:text-white">
                                                   {formatNumber(u.cultivationCache?.exp || 0)}
                                                </span>
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
                                                <div className="flex items-center gap-2">
                                                   <button
                                                      onClick={() => openExpAdjustModal(u)}
                                                      className="p-2 text-neutral-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                                                      title="Chỉnh tu vi"
                                                   >
                                                      <Edit size={16} />
                                                   </button>
                                                   <button
                                                      onClick={() => deleteUser(u._id)}
                                                      disabled={u._id === user._id}
                                                      className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                                      title="Xóa người dùng"
                                                   >
                                                      <Trash2 size={16} />
                                                   </button>
                                                </div>
                                             </td>
                                          </tr>
                                       );
                                    })}
                                    {users.length === 0 && (
                                       <tr>
                                          <td colSpan="7" className="px-4 py-12 text-center text-neutral-500">
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
                                          <div>
                                             <span className="text-neutral-500">Tu vi:</span>
                                             <div className="mt-1 font-semibold text-black dark:text-white">
                                                {formatNumber(u.cultivationCache?.exp || 0)}
                                             </div>
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
                                       <div className="mt-2">
                                          <button
                                             onClick={() => openExpAdjustModal(u)}
                                             className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-amber-300/70 text-amber-700 dark:text-amber-300 dark:border-amber-700/60 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                                          >
                                             Chỉnh tu vi
                                          </button>
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
                           <SpotlightCard className="p-4 text-center dark:bg-emerald-950/40 border dark:border-emerald-800/30">
                              <Wifi size={32} className="mx-auto text-emerald-600 dark:text-emerald-400 mb-2" />
                              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatNumber(onlineUsers.length)}</div>
                              <div className="text-sm text-neutral-600 dark:text-neutral-400">Đang online</div>
                           </SpotlightCard>
                           <SpotlightCard className="p-4 text-center dark:bg-neutral-800/60 border dark:border-neutral-700/50">
                              <WifiOff size={32} className="mx-auto text-gray-600 dark:text-gray-400 mb-2" />
                              <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                                 {formatNumber(stats?.overview ?
                                    Math.max(0, stats?.overview.totalUsers.count - onlineUsers.length) :
                                    Math.max(0, users.length - onlineUsers.length)
                                 )}
                              </div>
                              <div className="text-sm text-neutral-600 dark:text-neutral-400">Offline</div>
                           </SpotlightCard>
                           <SpotlightCard className="p-4 text-center dark:bg-cyan-950/40 border dark:border-cyan-800/30">
                              <UserCheck size={32} className="mx-auto text-cyan-600 dark:text-cyan-400 mb-2" />
                              <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{formatNumber(totalVisitors)}</div>
                              <div className="text-sm text-neutral-600 dark:text-neutral-400">Tổng lượt đăng ký</div>
                           </SpotlightCard>
                           <SpotlightCard className="p-4 text-center dark:bg-purple-950/40 border dark:border-purple-800/30">
                              <Users size={32} className="mx-auto text-purple-600 dark:text-purple-400 mb-2" />
                              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                 {formatNumber(stats?.overview ? stats?.overview.totalUsers.count : users.length)}
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
                                 <div className="text-center p-4 dark:bg-green-950/40 border dark:border-green-800/30 rounded-xl">
                                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{formatNumber(visitorStats.timeStats.today)}</div>
                                    <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Hôm nay</div>
                                 </div>
                                 <div className="text-center p-4 dark:bg-blue-950/40 border dark:border-blue-800/30 rounded-xl">
                                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatNumber(visitorStats.timeStats.thisWeek)}</div>
                                    <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Tuần này</div>
                                 </div>
                                 <div className="text-center p-4 dark:bg-purple-950/40 border dark:border-purple-800/30 rounded-xl">
                                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatNumber(visitorStats.timeStats.thisMonth)}</div>
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
                              <button
                                 onClick={async () => {
                                    const result = await updateOfflineUsers();
                                    if (result?.success) {
                                       toast.showSuccess("Đã cập nhật trạng thái offline");
                                    } else {
                                       toast.showError(result?.error || "Lỗi cập nhật");
                                    }
                                 }}
                                 className="text-xs font-bold px-3 py-1.5 border border-orange-300 dark:border-orange-700/50 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-400 dark:hover:border-orange-600 transition-all shadow-sm hover:shadow-md"
                              >Force Update</button>
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
                                    placeholder="Nhập tên hoặc email để tìm (tối thiểu 2 ký tự)..."
                                    value={banForm.searchTerm || ''}
                                    onChange={e => handleBanSearch(e.target.value)}
                                    className="w-full p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                                 />
                                 {banSearchLoading && (
                                    <div className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
                                       <Loader2 size={12} className="animate-spin" /> Đang tìm...
                                    </div>
                                 )}
                              </div>
                              <div>
                                 <label className="block text-xs font-bold uppercase text-neutral-500 mb-1">Chọn người dùng</label>
                                 <select
                                    value={banForm.userId}
                                    onChange={e => setBanForm({ ...banForm, userId: e.target.value })}
                                    className="w-full p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors appearance-none cursor-pointer"
                                 >
                                    <option value="">
                                       {banForm.searchTerm && banForm.searchTerm.length >= 2
                                          ? (banSearchResults.length > 0 ? 'Chọn người dùng...' : 'Không tìm thấy')
                                          : 'Nhập tên để tìm kiếm...'}
                                    </option>
                                    {banSearchResults.map(u => (
                                       <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                                    ))}
                                 </select>
                                 {banForm.searchTerm && banSearchResults.length > 0 && (
                                    <div className="text-xs text-neutral-500 mt-1">
                                       Tìm thấy {banSearchResults.length} người dùng
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

                  {activeTab === "bot" && (
                     <motion.div key="bot" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <AutoLikeBot />
                     </motion.div>
                  )}

                  {activeTab === "giftcode" && (
                     <motion.div key="giftcode" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <AdminGiftCodeTab />
                     </motion.div>
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

         <AnimatePresence>
            {expAdjustModal.open && (
               <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                  onClick={closeExpAdjustModal}
               >
                  <motion.div
                     initial={{ scale: 0.96, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     exit={{ scale: 0.96, opacity: 0 }}
                     onClick={(e) => e.stopPropagation()}
                     className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden"
                  >
                     <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
                        <div>
                           <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Chỉnh tu vi</h3>
                           <p className="text-xs text-neutral-500 mt-1">
                              {expAdjustModal.user?.name} · {expAdjustModal.user?.email}
                           </p>
                        </div>
                        <button
                           onClick={closeExpAdjustModal}
                           className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        >
                           <X className="w-5 h-5 text-neutral-500" />
                        </button>
                     </div>

                     <form onSubmit={handleExpAdjustSubmit} className="p-6 space-y-4">
                        <div>
                           <label className="block text-xs font-bold uppercase text-neutral-500 mb-1">Chế độ</label>
                           <select
                              value={expAdjustModal.mode}
                              onChange={(e) => setExpAdjustModal(prev => ({ ...prev, mode: e.target.value }))}
                              className="w-full p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors appearance-none cursor-pointer"
                           >
                              <option value="delta">Cộng/Trừ tu vi</option>
                              <option value="set">Đặt tu vi mới</option>
                           </select>
                        </div>

                        <div>
                           <label className="block text-xs font-bold uppercase text-neutral-500 mb-1">
                              {expAdjustModal.mode === "set" ? "Tu vi mới" : "Delta tu vi"}
                           </label>
                           <input
                              type="number"
                              step="1"
                              min={expAdjustModal.mode === "set" ? 0 : undefined}
                              placeholder={expAdjustModal.mode === "set" ? "VD: 120000" : "VD: -5000 hoặc 5000"}
                              value={expAdjustModal.value}
                              onChange={(e) => setExpAdjustModal(prev => ({ ...prev, value: e.target.value }))}
                              className="w-full p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                           />
                           <p className="text-[11px] text-neutral-500 mt-1">
                              {expAdjustModal.mode === "set"
                                 ? "Giá trị tuyệt đối sẽ ghi đè tu vi hiện tại."
                                 : "Số âm sẽ giảm, số dương sẽ tăng."}
                           </p>
                        </div>

                        <div>
                           <label className="block text-xs font-bold uppercase text-neutral-500 mb-1">Lý do (tuỳ chọn)</label>
                           <input
                              value={expAdjustModal.reason}
                              onChange={(e) => setExpAdjustModal(prev => ({ ...prev, reason: e.target.value }))}
                              placeholder="Ghi chú xử lý..."
                              className="w-full p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                           />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                           <button
                              type="button"
                              onClick={closeExpAdjustModal}
                              className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                           >
                              Huỷ
                           </button>
                           <button
                              type="submit"
                              disabled={expAdjustLoading}
                              className="px-5 py-2 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 disabled:opacity-50 transition-colors"
                           >
                              {expAdjustLoading ? "Đang cập nhật..." : "Cập nhật"}
                           </button>
                        </div>
                     </form>
                  </motion.div>
               </motion.div>
            )}
         </AnimatePresence>
      </PageLayout>
   );
}
