import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getUserAvatarUrl, AVATAR_SIZES } from '../utils/avatarUtils';
import { useSEO } from '../utils/useSEO';
import {
   ArrowLeft,
   Settings,
   Users,
   Calendar,
   MapPin,
   Tag,
   MoreVertical,
   UserPlus,
   UserMinus,
   Shield,
   Crown,
   UserCheck,
   MessageSquare,
   Heart,
   Share2,
   Flag,
   Ban,
   UserX,
   Camera,
   Upload,
   MoreHorizontal,
   BarChart3,
   TrendingUp,
   Eye,
   FileText,
   Plus,
   Lock,
   Unlock,
   EyeOff,
   Globe,
   Star,
   Clock,
   AlertCircle,
   User,
   ShieldCheck
} from 'lucide-react';
import { api } from '../api';
import { useSavedPosts } from '../hooks/useSavedPosts';
import ModernPostCard from '../components/ModernPostCard';
import PostCreator from '../components/PostCreator';
import { getAccessToken } from '../utils/tokenManager.js';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../contexts/ToastContext';
import Avatar from '../components/Avatar';

// --- UI COMPONENTS (Đồng bộ Design System) ---

const GridPattern = () => (
   <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-black bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
      <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[500px] w-[500px] rounded-full bg-neutral-200 dark:bg-neutral-900 opacity-20 blur-[100px]"></div>
   </div>
);

const NoiseOverlay = () => (
   <div className="fixed inset-0 z-50 pointer-events-none opacity-[0.03] mix-blend-overlay"
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
   />
);

const SpotlightCard = ({ children, className = "", onClick }) => {
   const divRef = useRef(null);
   const [position, setPosition] = useState({ x: 0, y: 0 });
   const [opacity, setOpacity] = useState(0);

   const handleMouseMove = (e) => {
      if (!divRef.current) return;
      const div = divRef.current;
      const rect = div.getBoundingClientRect();
      setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
   };

   return (
      <div
         ref={divRef}
         onMouseMove={handleMouseMove}
         onMouseEnter={() => setOpacity(1)}
         onMouseLeave={() => setOpacity(0)}
         onClick={onClick}
         className={cn(
            "relative rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 p-6 transition-all duration-300 hover:shadow-lg cursor-default",
            className?.includes('overflow-visible') ? 'overflow-visible' : 'overflow-hidden',
            className
         )}
      >
         <div
            className="pointer-events-none absolute -inset-px opacity-0 transition duration-300"
            style={{
               opacity,
               background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, rgba(150,150,150,0.1), transparent 40%)`,
            }}
         />
         <div className="relative z-10">{children}</div>
      </div>
   );
};

/**
 * GroupDetail Page - Trang chi tiết nhóm
 * Hiển thị thông tin nhóm, danh sách bài viết, thành viên và các chức năng quản lý
 */
const GroupDetail = () => {
   const { id } = useParams();
   const navigate = useNavigate();
   const { showSuccess, showError } = useToast();

   // State cho nhóm
   const [group, setGroup] = useState(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);
   const [user, setUser] = useState(null);

   // ==================== SEO ====================
   // Trang chi tiết nhóm là public → index, follow
   useSEO({
      title: group ? `${group.name} - Shiku` : "Nhóm - Shiku",
      description: group?.description
         ? `${group.description.substring(0, 160)}...`
         : `Xem nhóm ${group?.name || ''} trên Shiku`,
      robots: "index, follow",
      canonical: group?._id ? `https://shiku.click/groups/${group._id}` : undefined
   });

   // State cho bài viết
   const [posts, setPosts] = useState([]);
   const [postsLoading, setPostsLoading] = useState(false);
   const [postsPage, setPostsPage] = useState(1);
   const { savedMap, updateSavedState } = useSavedPosts(posts);
   const [hasMorePosts, setHasMorePosts] = useState(true);
   const [totalPosts, setTotalPosts] = useState(0);

   // State cho UI
   const [activeTab, setActiveTab] = useState('posts'); // bài đăng, thành viên, cài đặt, chờ duyệt
   const [showMemberMenu, setShowMemberMenu] = useState(null);
   const [isJoining, setIsJoining] = useState(false);
   const [isLeaving, setIsLeaving] = useState(false);
   const [showPostCreator, setShowPostCreator] = useState(false);
   const postCreatorRef = useRef(null);
   const [settingsLoading, setSettingsLoading] = useState(false);
   const [settingsData, setSettingsData] = useState({});
   const [groupStats, setGroupStats] = useState({ memberCount: 0, postCount: 0, pendingCount: 0 });
   const [uploadingAvatar, setUploadingAvatar] = useState(false);
   const [uploadingCover, setUploadingCover] = useState(false);
   const [hasLoadedWithUser, setHasLoadedWithUser] = useState(false); // Flag để tránh reload nhiều lần
   const [isPendingJoin, setIsPendingJoin] = useState(false);
   const pendingKey = `groupJoinPending:${id}`;
   const [pendingRequests, setPendingRequests] = useState([]);
   const [pendingLoading, setPendingLoading] = useState(false);

   // Analytics states
   const [analytics, setAnalytics] = useState(null);
   const [analyticsLoading, setAnalyticsLoading] = useState(false);
   const [analyticsError, setAnalyticsError] = useState('');
   const [analyticsPeriod, setAnalyticsPeriod] = useState('30d');

   // Load group details
   const loadGroup = async () => {
      try {
         setLoading(true);
         setError(null);

         const timestamp = Date.now();
         const response = await api(`/api/groups/${id}?t=${timestamp}`, { method: 'GET' });

         /**
       * Xử lý logic tải thông tin nhóm:
       * 1. Gọi API lấy dữ liệu nhóm.
       * 2. Nếu thành công:
       *    - Lưu dữ liệu nhóm vào state.
       *    - Kiểm tra xem user có đang chờ duyệt tham gia nhóm không (từ server/localStorage).
       *    - Nếu user đã là thành viên -> xóa trạng thái "pending" cục bộ.
       * 3. Nếu lỗi -> hiển thị thông báo lỗi phù hợp.
       * 4. Cuối cùng -> tắt trạng thái loading.
       */
         if (response.success) {
            setGroup(response.data);
            const locallyPending = (() => { try { return localStorage.getItem(pendingKey) === '1'; } catch { return false; } })();
            setIsPendingJoin(!!response.data.hasPendingJoinRequest || locallyPending);
            if (response.data.userRole) {
               try { localStorage.removeItem(pendingKey); } catch { }
            }
         }
      } catch (error) {
         setError(error.response?.data?.message || 'Không thể tải thông tin nhóm');
      } finally {
         setLoading(false);
      }
   };

   // Tải các bài đăng trong nhóm
   const loadPosts = async (page = 1, reset = false) => {
      try {
         setPostsLoading(true);

         const response = await api(`/api/groups/${id}/posts?page=${page}&limit=10`, { method: 'GET' });

         if (response.items) {
            if (reset) {
               setPosts(response.items);
            } else {
               setPosts(prev => {
                  const existingIds = new Set(prev.map(post => post._id));
                  const newPosts = response.items.filter(post => !existingIds.has(post._id));
                  return [...prev, ...newPosts];
               });
            }
            setPostsPage(response.page || 1);
            // Cập nhật tổng số bài viết từ API
            if (response.total !== undefined) {
               setTotalPosts(response.total);
            }
            // Kiểm tra còn bài viết để load thêm
            const currentPostsCount = reset ? response.items.length : posts.length + response.items.length;
            setHasMorePosts(response.items.length === 10 && (response.total === undefined || currentPostsCount < response.total));
         }
      } catch (error) {
         // Lỗi khi tải bài đăng trong nhóm
      } finally {
         setPostsLoading(false);
      }
   };

   // Tham gia nhóm
   const handleJoin = async () => {
      try {
         setIsJoining(true);

         const response = await api(`/api/groups/${id}/join`, { method: 'POST' });

         if (response.success) {
            if (response.joined) {
               await loadGroup();
               return;
            }
            if (response.pending || group?.settings?.joinApproval !== 'anyone') {
               setIsPendingJoin(true);
               setActiveTab('posts');
               try { localStorage.setItem(pendingKey, '1'); } catch { }
               await loadGroup();
               return;
            }
            await loadGroup();
         }
      } catch (error) {
         // Với nhóm cần duyệt, server trả success, lỗi khác hiển thị như cũ
         showError(error.message || 'Không thể tham gia nhóm');
      } finally {
         setIsJoining(false);
      }
   };

   // Leave group
   const handleLeave = async () => {
      if (!confirm('Bạn có chắc muốn rời khỏi nhóm này?')) return;
      try {
         setIsLeaving(true);

         const response = await api(`/api/groups/${id}/leave`, { method: 'POST' });

         if (response.success) {
            // Ở lại trang nhóm và cập nhật UI để có thể tham gia lại
            await loadGroup();
            setActiveTab('posts');
         }
      } catch (error) {
         showError(error.response?.data?.message || 'Không thể rời khỏi nhóm');
      } finally {
         setIsLeaving(false);
      }
   };

   // Tải thêm nhiều bài đăng
   const loadMorePosts = () => {
      if (hasMorePosts && !postsLoading) {
         loadPosts(postsPage + 1, false);
      }
   };

   // Xử lý việc tạo bài đăng thành công
   const handlePostCreated = () => {
      setShowPostCreator(false);
      // Tăng tổng số bài viết khi tạo mới
      setTotalPosts(prev => prev + 1);
      loadPosts(1, true); // Tải lại bài đăng từ đầu
   };

   // Khởi tạo dữ liệu cài đặt khi nhóm tải xong
   useEffect(() => {
      if (group) {
         setSettingsData({
            name: group.name || '',
            description: group.description || '',
            type: group.settings?.type || 'public',
            joinApproval: group.settings?.joinApproval || 'anyone',
            postPermissions: group.settings?.postPermissions || 'all_members',
            commentPermissions: group.settings?.commentPermissions || 'all_members',
            allowMemberInvites: group.settings?.allowMemberInvites ?? true,
            showMemberList: group.settings?.showMemberList ?? true,
            searchable: group.settings?.searchable ?? true,
            tags: group.tags?.join(', ') || '',
            location: group.location?.name || ''
         });

         // Cập nhật tổng số bài viết từ group stats nếu chưa có từ API
         if (!totalPosts && group.stats?.postCount) {
            setTotalPosts(group.stats.postCount);
         }

         // Cập nhật thống kê nhóm
         setGroupStats({
            memberCount: group.stats?.memberCount || group.members?.length || 0,
            postCount: totalPosts || group.stats?.postCount || posts.length || 0,
            pendingCount: Array.isArray(group.joinRequests) ? group.joinRequests.filter(r => r.status === 'pending').length : 0
         });
      }
   }, [group, posts, totalPosts]);

   // Xử lý thay đổi đầu vào cài đặt
   const handleSettingsChange = (field, value) => {
      setSettingsData(prev => ({
         ...prev,
         [field]: value
      }));
   };

   // Lưu các cài đặt
   const handleSaveSettings = async () => {
      try {
         setSettingsLoading(true);

         // Validation
         if (!settingsData.name || !settingsData.name.trim()) {
            showError('Vui lòng nhập tên nhóm');
            setSettingsLoading(false);
            return;
         }

         if (settingsData.name.trim().length > 100) {
            showError('Tên nhóm không được quá 100 ký tự');
            setSettingsLoading(false);
            return;
         }

         if (settingsData.description && settingsData.description.length > 500) {
            showError('Mô tả nhóm không được quá 500 ký tự');
            setSettingsLoading(false);
            return;
         }

         // Validate tags
         if (settingsData.tags) {
            const tagsArray = settingsData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
            if (tagsArray.length > 10) {
               showError('Tối đa 10 tags');
               setSettingsLoading(false);
               return;
            }
            for (const tag of tagsArray) {
               if (tag.length > 20) {
                  showError(`Tag "${tag}" không được quá 20 ký tự`);
                  setSettingsLoading(false);
                  return;
               }
            }
         }

         const updateData = new FormData();
         updateData.append('name', settingsData.name.trim());
         updateData.append('description', settingsData.description || '');
         updateData.append('settings', JSON.stringify({
            type: settingsData.type,
            joinApproval: settingsData.joinApproval,
            postPermissions: settingsData.postPermissions,
            commentPermissions: settingsData.commentPermissions,
            allowMemberInvites: settingsData.allowMemberInvites,
            showMemberList: settingsData.showMemberList,
            searchable: settingsData.searchable
         }));
         updateData.append('tags', settingsData.tags || '');
         updateData.append('location', JSON.stringify({ name: settingsData.location || '' }));

         const response = await api(`/api/groups/${id}`, {
            method: 'PUT',
            body: updateData
         });

         if (response.success) {
            // Reload group data to reflect changes
            await loadGroup();
            showSuccess('Cài đặt đã được lưu thành công!');
         }
      } catch (error) {
         showError(error.message || 'Có lỗi xảy ra khi lưu cài đặt');
      } finally {
         setSettingsLoading(false);
      }
   };

   // Cancel settings changes
   const handleCancelSettings = () => {
      if (group) {
         setSettingsData({
            name: group.name || '',
            description: group.description || '',
            type: group.settings?.type || 'public',
            joinApproval: group.settings?.joinApproval || 'anyone',
            postPermissions: group.settings?.postPermissions || 'all_members',
            commentPermissions: group.settings?.commentPermissions || 'all_members',
            allowMemberInvites: group.settings?.allowMemberInvites ?? true,
            showMemberList: group.settings?.showMemberList ?? true,
            searchable: group.settings?.searchable ?? true,
            tags: group.tags?.join(', ') || '',
            location: group.location?.name || ''
         });
      }
   };

   // Handle avatar upload
   const handleAvatarUpload = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
         showError('Vui lòng chọn file ảnh');
         return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
         showError('Kích thước file không được vượt quá 5MB');
         return;
      }

      try {
         setUploadingAvatar(true);

         const formData = new FormData();
         formData.append('avatar', file);

         const response = await api(`/api/groups/${id}`, {
            method: 'PUT',
            body: formData
         });

         if (response.success) {
            await loadGroup(); // Reload group data
            showSuccess('Cập nhật ảnh đại diện thành công!');
         }
      } catch (error) {
         showError(error.message || 'Có lỗi xảy ra khi tải ảnh lên');
      } finally {
         setUploadingAvatar(false);
      }
   };

   // Handle cover upload
   const handleCoverUpload = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
         showError('Vui lòng chọn file ảnh');
         return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
         showError('Kích thước file không được vượt quá 5MB');
         return;
      }

      try {
         setUploadingCover(true);

         const formData = new FormData();
         formData.append('coverImage', file);

         const response = await api(`/api/groups/${id}`, {
            method: 'PUT',
            body: formData
         });

         if (response.success) {
            await loadGroup(); // Reload group data
            showSuccess('Cập nhật ảnh bìa thành công!');
         }
      } catch (error) {
         showError(error.message || 'Có lỗi xảy ra khi tải ảnh lên');
      } finally {
         setUploadingCover(false);
      }
   };

   // Handle member role change
   const handleMemberRoleChange = async (userId, newRole) => {
      try {
         const response = await api(`/api/groups/${id}/members/${userId}/role`, {
            method: 'PUT',
            body: { role: newRole }
         });

         if (response.success) {
            await loadGroup(); // Reload group data
            showSuccess('Cập nhật vai trò thành công!');
         }
      } catch (error) {
         showError(error.message || 'Có lỗi xảy ra khi cập nhật vai trò');
      }
   };

   // Handle remove member
   const handleRemoveMember = async (userId, userName) => {
      if (!confirm(`Bạn có chắc muốn xóa ${userName} khỏi nhóm?`)) return;

      try {
         const response = await api(`/api/groups/${id}/members/${userId}`, {
            method: 'DELETE'
         });

         if (response.success) {
            await loadGroup(); // Reload group data
            showSuccess('Đã xóa thành viên khỏi nhóm!');
         }
      } catch (error) {
         showError(error.message || 'Có lỗi xảy ra khi xóa thành viên');
      }
   };

   // Handle ban member
   const handleBanMember = async (userId, userName) => {
      const reason = prompt(`Lý do cấm ${userName}:`);
      if (reason === null) return; // User cancelled

      try {
         const response = await api(`/api/groups/${id}/ban`, {
            method: 'POST',
            body: { userId, reason }
         });

         if (response.success) {
            await loadGroup(); // Reload group data
            showSuccess('Đã cấm thành viên khỏi nhóm!');
         }
      } catch (error) {
         showError(error.message || 'Có lỗi xảy ra khi cấm thành viên');
      }
   };

   // Load user data
   useEffect(() => {
      const loadUser = async () => {
         try {
            const response = await api('/api/auth/me', { method: 'GET' });
            setUser(response.user || response.data?.user || response.data);
         } catch (error) {
            // Error loading user
         }
      };
      loadUser();
   }, []);

   // Load data on mount - load posts first
   useEffect(() => {
      loadPosts(1, true);
   }, [id]);

   // Load group when user context is ready
   useEffect(() => {
      const hasToken = !!getAccessToken();

      if (hasToken && !user) {
         // Has token but user not loaded yet, wait
         return;
      }

      // Only load if not already loaded with this user context
      const userKey = user?._id || 'no-user';
      if (hasLoadedWithUser !== userKey) {
         loadGroup();
         setHasLoadedWithUser(userKey);
      }
   }, [id, user]);

   // Load analytics data
   const loadAnalytics = async () => {
      if (!group) return;

      setAnalyticsLoading(true);
      setAnalyticsError('');

      try {
         const response = await api(`/api/groups/${id}/analytics?period=${analyticsPeriod}`);
         if (response.success) {
            setAnalytics(response.analytics);
         }
      } catch (err) {
         setAnalyticsError('Không thể tải dữ liệu phân tích: ' + err.message);
      } finally {
         setAnalyticsLoading(false);
      }
   };

   // Load analytics when switching to analytics tab
   useEffect(() => {
      if (activeTab === 'analytics' && group && hasPermission('view_analytics')) {
         loadAnalytics();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [activeTab, group, analyticsPeriod]);

   // Reset flag when changing groups
   useEffect(() => {
      setHasLoadedWithUser(false);
      setPendingRequests([]);
   }, [id]);

   // Fetch pending join requests for admins/moderators when opening Pending tab
   useEffect(() => {
      const fetchPending = async () => {
         if (!hasPermission('approve_join_request')) return;
         try {
            setPendingLoading(true);
            const res = await api(`/api/groups/${id}/join-requests?t=${Date.now()}`, { method: 'GET' });
            if (res.success) {
               const list = Array.isArray(res.data) ? res.data : [];
               setPendingRequests(list.filter(r => r.status === 'pending'));
            }
         } catch (e) {
            setPendingRequests([]);
         } finally {
            setPendingLoading(false);
         }
      };
      if (activeTab === 'pending') fetchPending();
   }, [activeTab, id, group?.userRole]);

   // Close member menu when clicking outside
   useEffect(() => {
      const handleClickOutside = (event) => {
         if (showMemberMenu && !event.target.closest('.member-menu')) {
            setShowMemberMenu(null);
         }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
   }, [showMemberMenu]);

   // Load more posts on scroll
   useEffect(() => {
      const handleScroll = () => {
         if (
            window.innerHeight + document.documentElement.scrollTop >=
            document.documentElement.offsetHeight - 1000
         ) {
            loadMorePosts();
         }
      };

      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
   }, [postsPage, hasMorePosts, postsLoading]);

   // Get group type info
   const getGroupTypeInfo = () => {
      switch (group?.settings?.type) {
         case 'public':
            return { icon: '🌐', text: 'Công khai', color: 'text-green-600' };
         case 'private':
            return { icon: '🔒', text: 'Riêng tư', color: 'text-yellow-600' };
         case 'secret':
            return { icon: '👁️‍🗨️', text: 'Bí mật', color: 'text-red-600' };
         default:
            return { icon: '🌐', text: 'Công khai', color: 'text-green-600' };
      }
   };

   // Check if user can post based on group settings
   const canPost = () => {
      if (!group) return false;
      const role = group.userRole;
      const setting = group.settings?.postPermissions || 'all_members';
      if (role === 'owner' || role === 'admin') return true;
      if (setting === 'admins_only') return false;
      if (setting === 'moderators_and_admins') return role === 'moderator';
      // 'all_members'
      return !!role; // must be a member
   };

   // Check if user is admin (chỉ admin thật và owner)
   const isAdmin = () => {
      return group?.userRole === 'owner' || group?.userRole === 'admin';
   };

   const isOwnerRole = () => group?.userRole === 'owner';

   // Check if user is moderator
   const isModerator = () => {
      return group?.userRole === 'moderator';
   };

   // Check if user can manage (admin, moderator, hoặc owner)
   const canManage = () => {
      return group?.userRole === 'owner' || group?.userRole === 'admin' || group?.userRole === 'moderator';
   };

   // Check specific permissions
   const hasPermission = (action) => {
      const role = group?.userRole;

      // Owner có tất cả quyền
      if (role === 'owner') return true;

      switch (action) {
         // Chỉ owner và admin
         case 'change_settings':
         case 'promote_to_admin':
         case 'delete_group':
            return role === 'admin';

         // Owner, admin và moderator
         case 'remove_member':
         case 'ban_member':
         case 'unban_member':
         case 'promote_to_moderator':
         case 'demote_moderator':
         case 'approve_join_request':
         case 'reject_join_request':
         case 'moderate_posts':
         case 'edit_post':
         case 'delete_post':
         case 'pin_post':
         case 'unpin_post':
         case 'view_analytics':
            return role === 'admin' || role === 'moderator';

         default:
            return false;
      }
   };

   if (loading) {
      return (
         <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
         </div>
      );
   }

   if (error) {
      return (
         <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
            <div className="text-center">
               <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
               <button
                  onClick={() => navigate('/groups')}
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
               >
                  Quay lại danh sách nhóm
               </button>
            </div>
         </div>
      );
   }

   if (!group) {
      return (
         <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
            <div className="text-center">
               <p className="text-gray-600 dark:text-gray-400 mb-4">Không tìm thấy nhóm</p>
               <button
                  onClick={() => navigate('/groups')}
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
               >
                  Quay lại danh sách nhóm
               </button>
            </div>
         </div>
      );
   }

   const groupTypeInfo = getGroupTypeInfo();
   const requiresApproval = group?.settings?.joinApproval && group.settings.joinApproval !== 'anyone';
   const GroupTypeIcon = group.settings?.type === 'private' ? Lock : group.settings?.type === 'secret' ? EyeOff : Globe;

   return (
      <div className="min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-white transition-colors duration-300 font-sans relative overflow-x-hidden">
         <NoiseOverlay />
         <GridPattern />

         {/* --- 1. IMMERSIVE HEADER --- */}
         <div className="relative">
            {/* Cover */}
            <div className="h-64 md:h-80 lg:h-96 w-full relative overflow-hidden group">
               {group.coverImage ? (
                  <motion.img
                     initial={{ scale: 1.1 }}
                     animate={{ scale: 1 }}
                     transition={{ duration: 1.5 }}
                     src={group.coverImage}
                     className="w-full h-full object-cover"
                     alt=""
                  />
               ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600" />
               )}
               <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent dark:from-black dark:via-transparent dark:to-transparent opacity-90" />

               {/* Back Button */}
               <button
                  onClick={() => navigate('/groups')}
                  className="absolute top-20 left-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md transition-colors z-20"
               >
                  <ArrowLeft size={20} />
               </button>

               {/* Badge Type */}
               <div className="absolute top-20 left-16 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold border border-white/10">
                  <GroupTypeIcon size={12} />
                  <span className="uppercase tracking-wider">{group.settings?.type === 'public' ? 'Công khai' : group.settings?.type === 'private' ? 'Riêng tư' : 'Bí mật'}</span>
               </div>

               {/* Upload Cover (Admin) */}
               {isAdmin() && (
                  <label className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full cursor-pointer transition-colors backdrop-blur-md">
                     <Camera size={18} />
                     <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleCoverUpload}
                        disabled={uploadingCover}
                     />
                  </label>
               )}
               {uploadingCover && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-30">
                     <div className="text-white text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white mx-auto mb-2"></div>
                        <p className="text-sm">Đang tải...</p>
                     </div>
                  </div>
               )}
            </div>

            {/* Group Info */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-24 relative z-10">
               <div className="flex flex-col md:flex-row items-end gap-6 mb-8">
                  {/* Avatar */}
                  <motion.div
                     initial={{ y: 20, opacity: 0 }}
                     animate={{ y: 0, opacity: 1 }}
                     className="relative w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-3xl border-4 md:border-[6px] border-white dark:border-black overflow-hidden bg-neutral-200 dark:bg-neutral-800 shadow-2xl mx-auto md:mx-0"
                  >
                     {group.avatar ? (
                        <img src={group.avatar} className="w-full h-full object-cover" alt="" />
                     ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-400"><Users size={48} /></div>
                     )}
                     {isAdmin() && (
                        <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                           <Camera className="text-white w-8 h-8" />
                           <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={handleAvatarUpload}
                              disabled={uploadingAvatar}
                           />
                        </label>
                     )}
                     {uploadingAvatar && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                           <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-white"></div>
                        </div>
                     )}
                  </motion.div>

                  {/* Name & Actions */}
                  <div className="flex-1 mb-2 w-full md:w-auto text-center md:text-left">
                     <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-3xl md:text-5xl font-black tracking-tight mb-2"
                     >
                        {group.name}
                     </motion.h1>

                     <div className="flex flex-wrap justify-center md:justify-start gap-2 md:gap-3 mb-6 w-full md:w-auto">
                        {group.userRole ? (
                           <>
                              <button className="px-4 md:px-6 py-2.5 bg-green-600 text-white rounded-full font-bold text-xs md:text-sm flex items-center justify-center gap-1.5 md:gap-2 shadow-lg shadow-green-500/20 min-h-[44px] touch-manipulation flex-1 md:flex-initial">
                                 <UserCheck size={16} className="md:w-[18px] md:h-[18px]" /> <span className="whitespace-nowrap">Đã tham gia</span>
                              </button>
                              {canPost() && (
                                 <button
                                    onClick={() => {
                                       setActiveTab('posts');
                                       postCreatorRef.current?.openModal();
                                    }}
                                    className="px-4 md:px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold text-xs md:text-sm hover:scale-105 active:scale-95 transition-transform min-h-[44px] touch-manipulation flex-1 md:flex-initial"
                                 >
                                    <span className="whitespace-nowrap">Viết bài</span>
                                 </button>
                              )}
                              {isAdmin() && (
                                 <button
                                    onClick={() => setActiveTab('settings')}
                                    className="p-2.5 border border-neutral-300 dark:border-neutral-700 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 active:bg-neutral-200 dark:active:bg-neutral-700 transition-colors min-w-[44px] min-h-[44px] touch-manipulation flex items-center justify-center"
                                 >
                                    <Settings size={18} className="md:w-5 md:h-5" />
                                 </button>
                              )}
                              <button
                                 onClick={handleLeave}
                                 disabled={isLeaving || group.userRole === 'owner'}
                                 className="p-2.5 border border-neutral-300 dark:border-neutral-700 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 active:bg-red-100 dark:active:bg-red-900/30 transition-colors min-w-[44px] min-h-[44px] touch-manipulation flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                 <UserMinus size={18} className="md:w-5 md:h-5" />
                              </button>
                           </>
                        ) : (
                           requiresApproval && isPendingJoin ? (
                              <button className="px-6 md:px-8 py-3 bg-yellow-500/10 text-yellow-600 border border-yellow-500/50 rounded-full font-bold text-xs md:text-sm cursor-default min-h-[44px] w-full md:w-auto">
                                 <span className="whitespace-nowrap">Đang chờ duyệt...</span>
                              </button>
                           ) : (
                              <button
                                 onClick={handleJoin}
                                 disabled={isJoining}
                                 className="px-6 md:px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold text-base md:text-lg hover:scale-105 active:scale-95 transition-transform shadow-xl min-h-[44px] touch-manipulation w-full md:w-auto"
                              >
                                 {isJoining ? "..." : "Tham gia nhóm"}
                              </button>
                           )
                        )}
                     </div>

                     {/* Desktop Stats */}
                     <div className="hidden md:flex gap-4">
                        <SpotlightCard className="py-3 px-5 min-w-[120px] !rounded-xl">
                           <div className="text-2xl font-black">{group.stats?.memberCount || 0}</div>
                           <div className="text-xs font-bold text-neutral-500 uppercase">Thành viên</div>
                        </SpotlightCard>
                        <SpotlightCard className="py-3 px-5 min-w-[120px] !rounded-xl">
                           <div className="text-2xl font-black">{totalPosts || groupStats.postCount || group.stats?.postCount || 0}</div>
                           <div className="text-xs font-bold text-neutral-500 uppercase">Bài viết</div>
                        </SpotlightCard>
                     </div>
                  </div>
               </div>

               {/* Description */}
               <div className="max-w-3xl mb-12 mx-auto">
                  {group.description && <p className="text-lg text-neutral-600 dark:text-neutral-300 leading-relaxed text-center md:text-left">{group.description}</p>}
                  <div className="flex flex-wrap gap-4 mt-4 justify-center md:justify-start">
                     {group.location?.name && (
                        <div className="flex items-center gap-1.5 text-sm font-medium text-neutral-500">
                           <MapPin size={16} /> {group.location.name}
                        </div>
                     )}
                     {group.tags?.map((tag, i) => (
                        <span key={i} className="px-2.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs font-bold rounded-md">#{tag}</span>
                     ))}
                  </div>
               </div>

               {/* --- 2. TABS NAVIGATION --- */}
               <div className="sticky top-20 z-30 mb-6 md:mb-8">
                  <div className="relative">
                     {/* Gradient indicators for mobile scroll */}
                     <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white dark:from-neutral-900 to-transparent z-10 pointer-events-none md:hidden"></div>
                     <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white dark:from-neutral-900 to-transparent z-10 pointer-events-none md:hidden"></div>

                     <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl rounded-full p-1 md:p-1.5 shadow-sm border border-neutral-200 dark:border-neutral-800 w-full overflow-x-auto scrollbar-hide">
                        <div className="flex gap-1.5 md:gap-2 min-w-max md:min-w-full md:justify-between">
                           {[
                              { id: 'posts', label: 'Thảo luận', icon: MessageSquare },
                              { id: 'members', label: 'Thành viên', icon: Users },
                              ...(hasPermission('approve_join_request') ? [{ id: 'pending', label: 'Chờ duyệt', icon: UserPlus }] : []),
                              ...(hasPermission('view_analytics') ? [{ id: 'analytics', label: 'Thống kê', icon: BarChart3 }] : []),
                              ...(hasPermission('change_settings') ? [{ id: 'settings', label: 'Cài đặt', icon: Settings }] : [])
                           ].map(tab => (
                              <button
                                 key={tab.id}
                                 onClick={() => setActiveTab(tab.id)}
                                 className={cn(
                                    "flex-shrink-0 flex items-center justify-center gap-1.5 md:gap-2 py-2 md:py-2.5 px-3 md:px-4 rounded-full text-xs md:text-sm font-bold transition-all whitespace-nowrap min-h-[44px] touch-manipulation",
                                    activeTab === tab.id ? "bg-black dark:bg-white text-white dark:text-black shadow-md" : "text-neutral-500 hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/20"
                                 )}
                              >
                                 <tab.icon size={14} className="hidden md:block md:w-4 md:h-4 flex-shrink-0" strokeWidth={2.5} />
                                 <span className="truncate">{tab.label}</span>
                              </button>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>

               {/* --- 3. CONTENT AREA --- */}
               <div className="min-h-[500px] pb-32">
                  {/* POSTS TAB */}
                  {activeTab === 'posts' && (
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Sidebar Info */}
                        <div className="hidden lg:block lg:col-span-1 space-y-6">
                           <SpotlightCard>
                              <h3 className="font-bold mb-4 flex items-center gap-2"><Shield size={18} /> Quản trị viên</h3>
                              <div className="space-y-3">
                                 {group.members?.filter(m => ['owner', 'admin'].includes(m.role)).map(member => (
                                    <div key={member.user._id} className="flex items-center gap-3">
                                       <Avatar
                                          src={member.user.avatarUrl}
                                          name={member.user?.name || member.user?.fullName || 'User'}
                                          size={32}
                                          className=""
                                       />
                                       <div className="text-sm font-medium">
                                          {member.user?.name || member.user?.fullName || member.user?.username || 'Unknown'}
                                          <span className="text-xs text-neutral-500 ml-1">
                                             ({member.role === 'owner' ? 'Owner' : 'Admin'})
                                          </span>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           </SpotlightCard>
                        </div>

                        {/* Feed */}
                        <div className="lg:col-span-2 space-y-6">
                           {/* Pending banner */}
                           {requiresApproval && !group.userRole && (group.hasPendingJoinRequest || isPendingJoin) && (
                              <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-2xl text-yellow-600 dark:text-yellow-400 flex items-center justify-between gap-3">
                                 <div className="text-sm font-medium">
                                    Yêu cầu tham gia của bạn đang chờ duyệt bởi quản trị viên.
                                 </div>
                                 <button
                                    onClick={async () => {
                                       try {
                                          await api(`/api/groups/${id}/join-requests/cancel`, { method: 'POST' });
                                       } catch (_) { }
                                       try { localStorage.removeItem(pendingKey); } catch { }
                                       await loadGroup();
                                    }}
                                    className="px-3 py-1.5 bg-white dark:bg-neutral-800 text-yellow-700 dark:text-yellow-300 border border-yellow-500/50 rounded-lg text-sm font-bold hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                                 >
                                    Hủy yêu cầu
                                 </button>
                              </div>
                           )}

                           {canPost() && (
                              <div className="mb-8">
                                 <PostCreator
                                    ref={postCreatorRef}
                                    user={user}
                                    groupId={id}
                                 />
                              </div>
                           )}

                           {postsLoading && posts.length === 0 ? (
                              [1, 2, 3].map(i => <div key={i} className="h-64 bg-neutral-100 dark:bg-neutral-900 rounded-3xl animate-pulse" />)
                           ) : posts.length > 0 ? (
                              posts.map((post, index) => (
                                 <motion.div
                                    key={post._id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.05 }}
                                 >
                                    <ModernPostCard
                                       post={post}
                                       user={user}
                                       onUpdate={loadPosts}
                                       isSaved={savedMap[post._id]}
                                       onSavedChange={updateSavedState}
                                       hideActionsMenu={true}
                                    />
                                 </motion.div>
                              ))
                           ) : (
                              <div className="text-center py-20 bg-neutral-50 dark:bg-neutral-900 rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-700">
                                 <MessageSquare size={40} className="mx-auto text-neutral-400 mb-4" />
                                 <h3 className="font-bold text-lg">Chưa có thảo luận nào</h3>
                                 <p className="text-neutral-500">
                                    {canPost()
                                       ? 'Bắt đầu cuộc trò chuyện ngay!'
                                       : 'Chưa có bài viết nào trong nhóm này'
                                    }
                                 </p>
                              </div>
                           )}

                           {hasMorePosts && !postsLoading && posts.length > 0 && (
                              <div className="text-center pt-4">
                                 <button
                                    onClick={loadMorePosts}
                                    className="px-6 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-full font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                                 >
                                    Xem thêm
                                 </button>
                              </div>
                           )}
                        </div>
                     </div>
                  )}

                  {/* MEMBERS TAB */}
                  {activeTab === 'members' && (isAdmin() || group.settings?.showMemberList) && (
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative">
                        {group.members?.map(member => {
                           const roleConfig = {
                              owner: { icon: Crown, label: 'Owner', color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-50 dark:bg-yellow-900/20', borderColor: 'border-yellow-200 dark:border-yellow-800' },
                              admin: { icon: Shield, label: 'Admin', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/20', borderColor: 'border-blue-200 dark:border-blue-800' },
                              moderator: { icon: ShieldCheck, label: 'Moderator', color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-900/20', borderColor: 'border-purple-200 dark:border-purple-800' },
                              member: { icon: User, label: 'Member', color: 'text-neutral-600 dark:text-neutral-400', bgColor: 'bg-neutral-50 dark:bg-neutral-800/50', borderColor: 'border-neutral-200 dark:border-neutral-700' }
                           };
                           const config = roleConfig[member.role] || roleConfig.member;
                           const RoleIcon = config.icon;
                           const isCurrentUser = user?._id === member.user?._id;

                           return (
                              <SpotlightCard
                                 key={member.user._id}
                                 className={cn(
                                    "p-5 relative transition-all",
                                    showMemberMenu === member.user._id ? "overflow-visible z-[100]" : "z-auto"
                                 )}
                              >
                                 <div className="flex items-start gap-4" onClick={(e) => {
                                    // Đóng dropdown nếu click vào card nhưng không phải vào menu button hoặc dropdown
                                    if (showMemberMenu === member.user._id && !e.target.closest('.member-menu')) {
                                       setShowMemberMenu(null);
                                    }
                                 }}>
                                    {/* Avatar with role badge */}
                                    <div className="relative flex-shrink-0">
                                       <Avatar
                                          src={member.user.avatarUrl}
                                          name={member.user?.name || member.user?.fullName || 'User'}
                                          size={56}
                                          className="border-2 border-neutral-200 dark:border-neutral-700"
                                       />
                                       <div className={cn(
                                          "absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white dark:border-neutral-900 flex items-center justify-center",
                                          config.bgColor,
                                          config.borderColor
                                       )}>
                                          <RoleIcon size={14} className={config.color} strokeWidth={2.5} />
                                       </div>
                                    </div>

                                    {/* Member Info */}
                                    <div className="flex-1 min-w-0">
                                       <div className="flex items-center gap-2 mb-2">
                                          <h3 className="font-black text-base truncate">
                                             {member.user?.name || member.user?.fullName || member.user?.username || 'Unknown'}
                                          </h3>
                                          {isCurrentUser && (
                                             <span className="px-2 py-0.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 text-xs font-bold rounded-full">
                                                Bạn
                                             </span>
                                          )}
                                       </div>

                                       {/* Role Badge */}
                                       <div className={cn(
                                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider",
                                          config.bgColor,
                                          config.color
                                       )}>
                                          <RoleIcon size={12} strokeWidth={2.5} />
                                          {config.label}
                                       </div>

                                       {/* Join Date */}
                                       {member.joinedAt && (
                                          <div className="mt-2 text-xs text-neutral-500 font-medium">
                                             Tham gia {new Date(member.joinedAt).toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' })}
                                          </div>
                                       )}
                                    </div>

                                    {/* Action Menu */}
                                    {canManage() && member.role !== 'owner' && !isCurrentUser && (
                                       <div className="relative member-menu flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                          <button
                                             onClick={(e) => {
                                                e.stopPropagation();
                                                setShowMemberMenu(showMemberMenu === member.user._id ? null : member.user._id);
                                             }}
                                             className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors relative z-10"
                                          >
                                             <MoreVertical size={18} className="text-neutral-500" />
                                          </button>

                                          {showMemberMenu === member.user._id && (
                                             <div
                                                className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 py-2 z-[110]"
                                                onClick={(e) => e.stopPropagation()}
                                             >
                                                {member.role === 'member' && hasPermission('promote_to_admin') && (
                                                   <button
                                                      onClick={async () => {
                                                         try {
                                                            await api(`/api/groups/${id}/members/${member.user._id}/role`, {
                                                               method: 'PUT',
                                                               body: { role: 'moderator' }
                                                            });
                                                            await loadGroup();
                                                            setShowMemberMenu(null);
                                                            showSuccess('Đã thăng cấp thành điều hành viên');
                                                         } catch (e) {
                                                            showError(e.message || 'Lỗi thăng cấp');
                                                         }
                                                      }}
                                                      className="w-full px-4 py-2 text-left text-sm font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2"
                                                   >
                                                      <ShieldCheck size={16} /> Thăng cấp điều hành viên
                                                   </button>
                                                )}
                                                {member.role === 'moderator' && hasPermission('promote_to_admin') && (
                                                   <button
                                                      onClick={async () => {
                                                         try {
                                                            await api(`/api/groups/${id}/members/${member.user._id}/role`, {
                                                               method: 'PUT',
                                                               body: { role: 'admin' }
                                                            });
                                                            await loadGroup();
                                                            setShowMemberMenu(null);
                                                            showSuccess('Đã thăng cấp thành admin');
                                                         } catch (e) {
                                                            showError(e.message || 'Lỗi thăng cấp');
                                                         }
                                                      }}
                                                      className="w-full px-4 py-2 text-left text-sm font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2"
                                                   >
                                                      <Shield size={16} /> Thăng cấp admin
                                                   </button>
                                                )}
                                                {hasPermission('remove_member') && (
                                                   <button
                                                      onClick={() => {
                                                         setShowMemberMenu(null);
                                                         handleRemoveMember(member.user._id, member.user?.name || member.user?.username);
                                                      }}
                                                      className="w-full px-4 py-2 text-left text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                                   >
                                                      <UserMinus size={16} /> Xóa khỏi nhóm
                                                   </button>
                                                )}
                                                {hasPermission('ban_member') && (
                                                   <button
                                                      onClick={() => {
                                                         setShowMemberMenu(null);
                                                         handleBanMember(member.user._id, member.user?.name || member.user?.username);
                                                      }}
                                                      className="w-full px-4 py-2 text-left text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                                   >
                                                      <Ban size={16} /> Cấm thành viên
                                                   </button>
                                                )}
                                             </div>
                                          )}
                                       </div>
                                    )}
                                 </div>
                              </SpotlightCard>
                           );
                        })}
                     </div>
                  )}

                  {/* PENDING TAB */}
                  {activeTab === 'pending' && hasPermission('approve_join_request') && (
                     <div className="space-y-6">
                        {pendingLoading ? (
                           <div className="space-y-4">
                              {[1, 2, 3].map(i => <div key={i} className="h-24 bg-neutral-100 dark:bg-neutral-900 rounded-2xl animate-pulse" />)}
                           </div>
                        ) : pendingRequests && pendingRequests.length > 0 ? (
                           <div className="space-y-4">
                              {pendingRequests.map((req) => (
                                 <SpotlightCard key={req._id} className="p-5">
                                    <div className="flex items-center gap-4">
                                       <Avatar
                                          src={req.user?.avatarUrl}
                                          name={req.user?.name || req.user?.fullName || 'User'}
                                          size={48}
                                          className=""
                                       />
                                       <div className="flex-1 min-w-0">
                                          <div className="font-bold text-base mb-1">{req.user?.name || req.user?.fullName || req.user?.username || 'Người dùng'}</div>
                                          <div className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-2">
                                             {new Date(req.requestedAt).toLocaleString('vi-VN')}
                                          </div>
                                          {req.message && (
                                             <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2 line-clamp-2">{req.message}</p>
                                          )}
                                       </div>
                                       <div className="flex gap-2 flex-shrink-0">
                                          <button
                                             onClick={async () => {
                                                try {
                                                   await api(`/api/groups/${id}/join-requests/${req._id}/approve`, { method: 'POST' });
                                                   setPendingRequests(prev => prev.filter(r => r._id !== req._id));
                                                   setGroupStats(s => ({ ...s, pendingCount: Math.max(0, (s.pendingCount || 0) - 1), memberCount: (s.memberCount || 0) + 1 }));
                                                   const res = await api(`/api/groups/${id}/join-requests?t=${Date.now()}`, { method: 'GET' });
                                                   if (res.success) setPendingRequests(Array.isArray(res.data) ? res.data.filter(r => r.status === 'pending') : []);
                                                   await loadGroup();
                                                   showSuccess('Đã duyệt yêu cầu tham gia');
                                                } catch (e) { showError(e.message || 'Lỗi duyệt yêu cầu'); }
                                             }}
                                             className="px-4 py-2 bg-green-600 text-white rounded-full font-bold text-sm hover:bg-green-700 transition-colors flex items-center gap-2"
                                          >
                                             <UserCheck size={16} /> Duyệt
                                          </button>
                                          <button
                                             onClick={async () => {
                                                try {
                                                   await api(`/api/groups/${id}/join-requests/${req._id}/reject`, { method: 'POST' });
                                                   setPendingRequests(prev => prev.filter(r => r._id !== req._id));
                                                   setGroupStats(s => ({ ...s, pendingCount: Math.max(0, (s.pendingCount || 0) - 1) }));
                                                   const res = await api(`/api/groups/${id}/join-requests?t=${Date.now()}`, { method: 'GET' });
                                                   if (res.success) setPendingRequests(Array.isArray(res.data) ? res.data.filter(r => r.status === 'pending') : []);
                                                   await loadGroup();
                                                   showSuccess('Đã từ chối yêu cầu tham gia');
                                                } catch (e) { showError(e.message || 'Lỗi từ chối yêu cầu'); }
                                             }}
                                             className="px-4 py-2 bg-red-600 text-white rounded-full font-bold text-sm hover:bg-red-700 transition-colors flex items-center gap-2"
                                          >
                                             <UserX size={16} /> Từ chối
                                          </button>
                                       </div>
                                    </div>
                                 </SpotlightCard>
                              ))}
                           </div>
                        ) : (
                           <div className="text-center py-20 bg-neutral-50 dark:bg-neutral-900 rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-700">
                              <UserPlus size={40} className="mx-auto text-neutral-400 mb-4" />
                              <h3 className="font-bold text-lg mb-2">Không có yêu cầu chờ duyệt</h3>
                              <p className="text-neutral-500">Khi có yêu cầu tham gia, chúng sẽ xuất hiện ở đây</p>
                           </div>
                        )}
                     </div>
                  )}

                  {/* ANALYTICS TAB */}
                  {activeTab === 'analytics' && hasPermission('view_analytics') && (
                     <div className="space-y-6">
                        {/* Period Selector */}
                        <div className="flex items-center justify-between mb-6">
                           <h2 className="text-2xl font-black">Thống kê nhóm</h2>
                           <div className="flex gap-2 bg-neutral-100 dark:bg-neutral-800 rounded-full p-1">
                              {[
                                 { value: '7d', label: '7 ngày' },
                                 { value: '30d', label: '30 ngày' },
                                 { value: '90d', label: '90 ngày' },
                                 { value: '1y', label: '1 năm' }
                              ].map(period => (
                                 <button
                                    key={period.value}
                                    onClick={() => setAnalyticsPeriod(period.value)}
                                    className={cn(
                                       "px-4 py-2 rounded-full text-sm font-bold transition-all",
                                       analyticsPeriod === period.value
                                          ? "bg-black dark:bg-white text-white dark:text-black"
                                          : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                                    )}
                                 >
                                    {period.label}
                                 </button>
                              ))}
                           </div>
                        </div>

                        {analyticsLoading ? (
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              {[1, 2, 3, 4].map(i => (
                                 <div key={i} className="h-32 bg-neutral-100 dark:bg-neutral-900 rounded-2xl animate-pulse" />
                              ))}
                           </div>
                        ) : analyticsError ? (
                           <SpotlightCard>
                              <div className="text-center py-8">
                                 <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
                                 <p className="text-red-600 dark:text-red-400 font-bold">{analyticsError}</p>
                              </div>
                           </SpotlightCard>
                        ) : analytics ? (
                           <>
                              {/* Overview Stats */}
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                 <SpotlightCard className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                       <Eye className="w-8 h-8 text-neutral-400" />
                                    </div>
                                    <div className="text-3xl font-black mb-1">{analytics.totalViews?.toLocaleString('vi-VN') || 0}</div>
                                    <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Tổng lượt xem</div>
                                 </SpotlightCard>

                                 <SpotlightCard className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                       <FileText className="w-8 h-8 text-neutral-400" />
                                    </div>
                                    <div className="text-3xl font-black mb-1">{analytics.totalPosts?.toLocaleString('vi-VN') || 0}</div>
                                    <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Tổng bài viết</div>
                                 </SpotlightCard>

                                 <SpotlightCard className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                       <MessageSquare className="w-8 h-8 text-neutral-400" />
                                    </div>
                                    <div className="text-3xl font-black mb-1">{analytics.totalComments?.toLocaleString('vi-VN') || 0}</div>
                                    <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Tổng bình luận</div>
                                 </SpotlightCard>

                                 <SpotlightCard className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                       <Users className="w-8 h-8 text-neutral-400" />
                                    </div>
                                    <div className="text-3xl font-black mb-1">{analytics.totalMembers?.toLocaleString('vi-VN') || 0}</div>
                                    <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Thành viên</div>
                                 </SpotlightCard>
                              </div>

                              {/* Recent Activity Stats */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                 <SpotlightCard className="p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                       <TrendingUp className="w-6 h-6 text-neutral-400" />
                                       <h3 className="text-lg font-black">Hoạt động gần đây</h3>
                                    </div>
                                    <div className="space-y-4">
                                       <div>
                                          <div className="text-2xl font-black mb-1">{analytics.recentPosts?.toLocaleString('vi-VN') || 0}</div>
                                          <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Bài viết mới</div>
                                       </div>
                                       <div>
                                          <div className="text-2xl font-black mb-1">{analytics.recentComments?.toLocaleString('vi-VN') || 0}</div>
                                          <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Bình luận mới</div>
                                       </div>
                                       <div>
                                          <div className="text-2xl font-black mb-1">{analytics.recentMembers?.toLocaleString('vi-VN') || 0}</div>
                                          <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Thành viên mới</div>
                                       </div>
                                    </div>
                                 </SpotlightCard>

                                 <SpotlightCard className="p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                       <BarChart3 className="w-6 h-6 text-neutral-400" />
                                       <h3 className="text-lg font-black">Hiệu suất</h3>
                                    </div>
                                    <div className="space-y-4">
                                       <div>
                                          <div className="text-2xl font-black mb-1">{analytics.publishedPosts?.toLocaleString('vi-VN') || 0}</div>
                                          <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Bài đã xuất bản</div>
                                       </div>
                                       <div>
                                          <div className="text-2xl font-black mb-1">{analytics.avgViewsPerPost?.toFixed(1) || 0}</div>
                                          <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Lượt xem TB/bài</div>
                                       </div>
                                    </div>
                                 </SpotlightCard>

                                 <SpotlightCard className="p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                       <Star className="w-6 h-6 text-neutral-400" />
                                       <h3 className="text-lg font-black">Bài viết nổi bật</h3>
                                    </div>
                                    <div className="space-y-3">
                                       {analytics.topPosts && analytics.topPosts.length > 0 ? (
                                          analytics.topPosts.slice(0, 5).map((post, idx) => (
                                             <div key={post._id || idx} className="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                                                <div className="flex-1 min-w-0">
                                                   <p className="text-sm font-bold truncate">{post.title || 'Không có tiêu đề'}</p>
                                                   <p className="text-xs text-neutral-500">{post.views || 0} lượt xem</p>
                                                </div>
                                             </div>
                                          ))
                                       ) : (
                                          <p className="text-sm text-neutral-500">Chưa có dữ liệu</p>
                                       )}
                                    </div>
                                 </SpotlightCard>
                              </div>

                              {/* Recent Posts List */}
                              {analytics.recentPostsList && analytics.recentPostsList.length > 0 && (
                                 <SpotlightCard>
                                    <div className="flex items-center gap-3 mb-6">
                                       <Clock className="w-6 h-6 text-neutral-400" />
                                       <h3 className="text-xl font-black">Bài viết gần đây</h3>
                                    </div>
                                    <div className="space-y-3">
                                       {analytics.recentPostsList.map((post) => (
                                          <div key={post._id} className="flex items-center gap-4 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                                             <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-base mb-1 truncate">{post.title || 'Không có tiêu đề'}</h4>
                                                <div className="flex items-center gap-4 text-xs text-neutral-500">
                                                   <span>{post.views || 0} lượt xem</span>
                                                   <span>{new Date(post.createdAt).toLocaleDateString('vi-VN')}</span>
                                                   {post.author && (
                                                      <span>{post.author.name || post.author.username || 'Người dùng'}</span>
                                                   )}
                                                </div>
                                             </div>
                                             {post.status === 'published' ? (
                                                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-full">Đã xuất bản</span>
                                             ) : (
                                                <span className="px-2 py-1 bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 text-xs font-bold rounded-full">Bản nháp</span>
                                             )}
                                          </div>
                                       ))}
                                    </div>
                                 </SpotlightCard>
                              )}
                           </>
                        ) : (
                           <SpotlightCard>
                              <div className="text-center py-12">
                                 <BarChart3 className="w-16 h-16 mx-auto text-neutral-400 mb-4" />
                                 <h3 className="font-bold text-lg mb-2">Chưa có dữ liệu thống kê</h3>
                                 <p className="text-neutral-500">Dữ liệu sẽ được cập nhật khi có hoạt động trong nhóm</p>
                              </div>
                           </SpotlightCard>
                        )}
                     </div>
                  )}

                  {/* SETTINGS TAB */}
                  {activeTab === 'settings' && hasPermission('change_settings') && (
                     <div className="max-w-4xl space-y-6">
                        {/* Basic Settings */}
                        <SpotlightCard>
                           <div className="flex items-center gap-3 mb-6">
                              <Settings className="w-6 h-6 text-neutral-700 dark:text-neutral-300" />
                              <h3 className="text-xl font-black">Cài đặt cơ bản</h3>
                           </div>
                           <div className="space-y-6">
                              <div>
                                 <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2 uppercase tracking-wider">
                                    Tên nhóm
                                 </label>
                                 <input
                                    type="text"
                                    value={settingsData.name || ''}
                                    onChange={(e) => handleSettingsChange('name', e.target.value)}
                                    className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent bg-white dark:bg-neutral-900 text-base font-medium"
                                    placeholder="Nhập tên nhóm..."
                                 />
                              </div>
                              <div>
                                 <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2 uppercase tracking-wider">
                                    Mô tả nhóm
                                 </label>
                                 <textarea
                                    value={settingsData.description || ''}
                                    onChange={(e) => handleSettingsChange('description', e.target.value)}
                                    rows={4}
                                    className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent bg-white dark:bg-neutral-900 text-base font-medium resize-none"
                                    placeholder="Mô tả về nhóm..."
                                 />
                                 <p className="mt-2 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                                    {(settingsData.description?.length || 0)}/500 ký tự
                                 </p>
                              </div>
                              <div>
                                 <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-3 uppercase tracking-wider">
                                    Loại nhóm
                                 </label>
                                 <div className="space-y-3">
                                    {[
                                       { value: 'public', label: 'Công khai', desc: 'Mọi người có thể tìm thấy và tham gia', icon: Globe },
                                       { value: 'private', label: 'Riêng tư', desc: 'Chỉ thành viên mới thấy nội dung', icon: Lock },
                                       { value: 'secret', label: 'Bí mật', desc: 'Chỉ thành viên mới tìm thấy nhóm', icon: EyeOff }
                                    ].map((type) => (
                                       <label key={type.value} className={cn(
                                          "flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all",
                                          settingsData.type === type.value
                                             ? "border-neutral-900 dark:border-white bg-neutral-100 dark:bg-neutral-800"
                                             : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"
                                       )}>
                                          <input
                                             type="radio"
                                             name="groupType"
                                             value={type.value}
                                             checked={settingsData.type === type.value}
                                             onChange={(e) => handleSettingsChange('type', e.target.value)}
                                             className="w-4 h-4 text-neutral-900 dark:text-white border-neutral-300 focus:ring-neutral-900 dark:focus:ring-white"
                                          />
                                          <type.icon className={cn(
                                             "w-5 h-5 flex-shrink-0",
                                             settingsData.type === type.value ? "text-neutral-900 dark:text-white" : "text-neutral-400"
                                          )} />
                                          <div className="flex-1">
                                             <p className="font-bold text-base">{type.label}</p>
                                             <p className="text-sm text-neutral-500 mt-1">{type.desc}</p>
                                          </div>
                                       </label>
                                    ))}
                                 </div>
                              </div>
                           </div>
                        </SpotlightCard>

                        {/* Permissions */}
                        <SpotlightCard>
                           <div className="flex items-center gap-3 mb-6">
                              <Shield className="w-6 h-6 text-neutral-700 dark:text-neutral-300" />
                              <h3 className="text-xl font-black">Quyền hạn</h3>
                           </div>
                           <div className="space-y-6">
                              <div>
                                 <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-3 uppercase tracking-wider">
                                    Ai có thể tham gia?
                                 </label>
                                 <select
                                    value={settingsData.joinApproval || 'anyone'}
                                    onChange={(e) => handleSettingsChange('joinApproval', e.target.value)}
                                    disabled={!isOwnerRole()}
                                    className={cn(
                                       "w-full px-4 py-3 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent bg-white dark:bg-neutral-900 text-base font-bold",
                                       !isOwnerRole() ? 'opacity-60 cursor-not-allowed' : ''
                                    )}
                                 >
                                    <option value="anyone">Bất kỳ ai</option>
                                    <option value="admin_approval">Cần duyệt từ admin</option>
                                    <option value="invite_only">Chỉ được mời</option>
                                 </select>
                              </div>
                              <div>
                                 <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-3 uppercase tracking-wider">
                                    Ai có thể đăng bài?
                                 </label>
                                 <select
                                    value={settingsData.postPermissions || 'all_members'}
                                    onChange={(e) => handleSettingsChange('postPermissions', e.target.value)}
                                    disabled={!isOwnerRole()}
                                    className={cn(
                                       "w-full px-4 py-3 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent bg-white dark:bg-neutral-900 text-base font-bold",
                                       !isOwnerRole() ? 'opacity-60 cursor-not-allowed' : ''
                                    )}
                                 >
                                    <option value="all_members">Tất cả thành viên</option>
                                    <option value="moderators_and_admins">Điều hành viên và admin</option>
                                    <option value="admins_only">Chỉ admin</option>
                                 </select>
                              </div>
                              <div>
                                 <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-3 uppercase tracking-wider">
                                    Ai có thể bình luận?
                                 </label>
                                 <select
                                    value={settingsData.commentPermissions || 'all_members'}
                                    onChange={(e) => handleSettingsChange('commentPermissions', e.target.value)}
                                    disabled={!isOwnerRole()}
                                    className={cn(
                                       "w-full px-4 py-3 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent bg-white dark:bg-neutral-900 text-base font-bold",
                                       !isOwnerRole() ? 'opacity-60 cursor-not-allowed' : ''
                                    )}
                                 >
                                    <option value="all_members">Tất cả thành viên</option>
                                    <option value="members_only">Chỉ thành viên</option>
                                    <option value="admins_only">Chỉ admin</option>
                                 </select>
                              </div>
                           </div>
                        </SpotlightCard>

                        {/* Additional Settings */}
                        <SpotlightCard>
                           <div className="flex items-center gap-3 mb-6">
                              <Users className="w-6 h-6 text-neutral-700 dark:text-neutral-300" />
                              <h3 className="text-xl font-black">Cài đặt khác</h3>
                           </div>
                           <div className="space-y-4">
                              <label className={cn(
                                 "flex items-center justify-between p-4 border-2 rounded-xl transition-all",
                                 isOwnerRole()
                                    ? "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 cursor-pointer"
                                    : "border-neutral-200 dark:border-neutral-800 opacity-60 cursor-not-allowed"
                              )}>
                                 <div>
                                    <p className="font-bold text-base">Cho phép thành viên mời người khác</p>
                                    <p className="text-sm text-neutral-500 mt-1">Thành viên có thể mời bạn bè tham gia nhóm</p>
                                 </div>
                                 <input
                                    type="checkbox"
                                    checked={settingsData.allowMemberInvites ?? true}
                                    onChange={(e) => handleSettingsChange('allowMemberInvites', e.target.checked)}
                                    disabled={!isOwnerRole()}
                                    className="w-5 h-5 text-neutral-900 dark:text-white border-neutral-300 rounded focus:ring-neutral-900 dark:focus:ring-white"
                                 />
                              </label>
                              <label className={cn(
                                 "flex items-center justify-between p-4 border-2 rounded-xl transition-all",
                                 isOwnerRole()
                                    ? "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 cursor-pointer"
                                    : "border-neutral-200 dark:border-neutral-800 opacity-60 cursor-not-allowed"
                              )}>
                                 <div>
                                    <p className="font-bold text-base">Hiển thị danh sách thành viên</p>
                                    <p className="text-sm text-neutral-500 mt-1">Mọi người có thể xem danh sách thành viên</p>
                                 </div>
                                 <input
                                    type="checkbox"
                                    checked={settingsData.showMemberList ?? true}
                                    onChange={(e) => handleSettingsChange('showMemberList', e.target.checked)}
                                    disabled={!isOwnerRole()}
                                    className="w-5 h-5 text-neutral-900 dark:text-white border-neutral-300 rounded focus:ring-neutral-900 dark:focus:ring-white"
                                 />
                              </label>
                              <label className={cn(
                                 "flex items-center justify-between p-4 border-2 rounded-xl transition-all",
                                 isOwnerRole()
                                    ? "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 cursor-pointer"
                                    : "border-neutral-200 dark:border-neutral-800 opacity-60 cursor-not-allowed"
                              )}>
                                 <div>
                                    <p className="font-bold text-base">Cho phép tìm kiếm nhóm</p>
                                    <p className="text-sm text-neutral-500 mt-1">Nhóm có thể được tìm thấy qua tìm kiếm</p>
                                 </div>
                                 <input
                                    type="checkbox"
                                    checked={settingsData.searchable ?? true}
                                    onChange={(e) => handleSettingsChange('searchable', e.target.checked)}
                                    disabled={!isOwnerRole()}
                                    className="w-5 h-5 text-neutral-900 dark:text-white border-neutral-300 rounded focus:ring-neutral-900 dark:focus:ring-white"
                                 />
                              </label>
                           </div>
                        </SpotlightCard>

                        {/* Tags and Location */}
                        <SpotlightCard>
                           <div className="flex items-center gap-3 mb-6">
                              <Tag className="w-6 h-6 text-neutral-700 dark:text-neutral-300" />
                              <h3 className="text-xl font-black">Thông tin bổ sung</h3>
                           </div>
                           <div className="space-y-6">
                              <div>
                                 <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2 uppercase tracking-wider">
                                    Tags
                                 </label>
                                 <input
                                    type="text"
                                    value={settingsData.tags || ''}
                                    onChange={(e) => handleSettingsChange('tags', e.target.value)}
                                    className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent bg-white dark:bg-neutral-900 text-base font-medium"
                                    placeholder="Công nghệ, Học tập, Thể thao... (cách nhau bởi dấu phẩy)"
                                 />
                                 <p className="mt-2 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                                    Tối đa 10 tags, mỗi tag không quá 20 ký tự
                                 </p>
                              </div>
                              <div>
                                 <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2 uppercase tracking-wider">
                                    Vị trí
                                 </label>
                                 <input
                                    type="text"
                                    value={settingsData.location || ''}
                                    onChange={(e) => handleSettingsChange('location', e.target.value)}
                                    className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent bg-white dark:bg-neutral-900 text-base font-medium"
                                    placeholder="Thành phố, quốc gia..."
                                 />
                              </div>
                           </div>
                        </SpotlightCard>

                        {/* Save Button */}
                        <div className="flex justify-end gap-3 pt-4">
                           <button
                              type="button"
                              onClick={handleCancelSettings}
                              disabled={settingsLoading}
                              className="px-6 py-3 border-2 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-full font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
                           >
                              Hủy
                           </button>
                           <button
                              type="button"
                              onClick={handleSaveSettings}
                              disabled={settingsLoading}
                              className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold hover:scale-105 transition-transform shadow-xl disabled:opacity-50"
                           >
                              {settingsLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                           </button>
                        </div>
                     </div>
                  )}

               </div>

            </div>
         </div>
      </div>
   );
};

export default GroupDetail;
