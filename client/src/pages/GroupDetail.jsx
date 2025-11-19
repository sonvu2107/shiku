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
  Plus
} from 'lucide-react';
import { api } from '../api';
import { useSavedPosts } from '../hooks/useSavedPosts';
import ModernPostCard from '../components/ModernPostCard';
import PostCreator from '../components/PostCreator';
import { getAccessToken } from '../utils/tokenManager.js';

/**
 * GroupDetail Page - Trang chi tiết nhóm
 * Hiển thị thông tin nhóm, danh sách bài viết, thành viên và các chức năng quản lý
 */
const GroupDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

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
        setHasMorePosts(response.items.length === 10); // hoặc kiểm tra response.total
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
      alert(error.message || 'Không thể tham gia nhóm');
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
      alert(error.response?.data?.message || 'Không thể rời khỏi nhóm');
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

      // Cập nhật thống kê nhóm
      setGroupStats({
        memberCount: group.stats?.memberCount || group.members?.length || 0,
        postCount: posts.length,
        pendingCount: Array.isArray(group.joinRequests) ? group.joinRequests.filter(r => r.status === 'pending').length : 0
      });
    }
  }, [group, posts]);

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
        alert('Vui lòng nhập tên nhóm');
        setSettingsLoading(false);
        return;
      }

      if (settingsData.name.trim().length > 100) {
        alert('Tên nhóm không được quá 100 ký tự');
        setSettingsLoading(false);
        return;
      }

      if (settingsData.description && settingsData.description.length > 500) {
        alert('Mô tả nhóm không được quá 500 ký tự');
        setSettingsLoading(false);
        return;
      }

      // Validate tags
      if (settingsData.tags) {
        const tagsArray = settingsData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        if (tagsArray.length > 10) {
          alert('Tối đa 10 tags');
          setSettingsLoading(false);
          return;
        }
        for (const tag of tagsArray) {
          if (tag.length > 20) {
            alert(`Tag "${tag}" không được quá 20 ký tự`);
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
        alert('Cài đặt đã được lưu thành công!');
      }
    } catch (error) {
      alert(error.message || 'Có lỗi xảy ra khi lưu cài đặt');
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
      alert('Vui lòng chọn file ảnh');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Kích thước file không được vượt quá 5MB');
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
        alert('Cập nhật ảnh đại diện thành công!');
      }
    } catch (error) {
      alert(error.message || 'Có lỗi xảy ra khi tải ảnh lên');
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
      alert('Vui lòng chọn file ảnh');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Kích thước file không được vượt quá 5MB');
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
        alert('Cập nhật ảnh bìa thành công!');
      }
    } catch (error) {
      alert(error.message || 'Có lỗi xảy ra khi tải ảnh lên');
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
        alert('Cập nhật vai trò thành công!');
      }
    } catch (error) {
      alert(error.message || 'Có lỗi xảy ra khi cập nhật vai trò');
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
        alert('Đã xóa thành viên khỏi nhóm!');
      }
    } catch (error) {
      alert(error.message || 'Có lỗi xảy ra khi xóa thành viên');
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
        alert('Đã cấm thành viên khỏi nhóm!');
      }
    } catch (error) {
      alert(error.message || 'Có lỗi xảy ra khi cấm thành viên');
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 min-h-[64px]">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              <button
                onClick={() => navigate('/groups')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-700 dark:text-gray-300 flex-shrink-0 touch-target"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 truncate">{group.name}</h1>
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  <span className={groupTypeInfo.color}>
                    {groupTypeInfo.icon} {groupTypeInfo.text}
                  </span>
                  <span className="hidden sm:inline">•</span>
                  <span className="truncate">{group.stats?.memberCount || 0} thành viên</span>
                </div>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2">
              {group.userRole ? (
                <>
                  {hasPermission('change_settings') && (
                    <button
                      onClick={() => setActiveTab('settings')}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
                      title="Cài đặt nhóm"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={handleLeave}
                    disabled={isLeaving || group.userRole === 'owner'}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLeaving ? 'Đang rời...' : 'Rời nhóm'}
                  </button>
                </>
              ) : (
                requiresApproval && isPendingJoin ? (
                  <button
                    onClick={() => setActiveTab('posts')}
                    className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-lg border border-yellow-300 dark:border-yellow-700 transition-colors"
                  >
                    Đang chờ duyệt...
                  </button>
                ) : (
                  <button
                    onClick={handleJoin}
                    disabled={isJoining}
                    className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 transition-colors"
                  >
                    {isJoining ? 'Đang gửi yêu cầu...' : (requiresApproval ? 'Yêu cầu tham gia' : 'Tham gia nhóm')}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Group Info Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/20 border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6">
              {/* Cover Image with Avatar */}
              <div className="w-full h-40 sm:h-48 rounded-lg overflow-hidden mb-4 relative group-cover">
                {group.coverImage ? (
                  <img
                    src={group.coverImage}
                    alt={`Cover của ${group.name}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                    <div className="text-white text-center">
                      <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-lg font-medium opacity-75">{group.name}</p>
                    </div>
                  </div>
                )}

                {/* Upload Cover Button for Admin */}
                {isAdmin() && (
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
                    <label className="cursor-pointer bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-3 transition-all">
                      <Camera className="w-6 h-6 text-gray-700" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverUpload}
                        className="hidden"
                        disabled={uploadingCover}
                      />
                    </label>
                    {uploadingCover && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="text-white text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                          <p className="text-sm">Đang tải...</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Group Avatar positioned at bottom left */}
                <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-white dark:bg-gray-800 border-4 border-white dark:border-gray-800 shadow-lg relative">
                    {group.avatar ? (
                      <img
                        src={group.avatar}
                        alt={`Avatar của ${group.name}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                        <Users className="w-8 h-8 text-gray-500" />
                      </div>
                    )}

                    {/* Avatar Upload for Admin */}
                    {isAdmin() && (
                      <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100 rounded-full">
                        <label className="cursor-pointer">
                          <Camera className="w-5 h-5 text-white" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            className="hidden"
                            disabled={uploadingAvatar}
                          />
                        </label>
                      </div>
                    )}

                    {uploadingAvatar && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-full">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Group Description */}
              {group.description && (
                <p className="text-gray-700 dark:text-gray-300 mb-4">{group.description}</p>
              )}

              {/* Group Stats */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 flex-shrink-0" />
                  <span>{groupStats.memberCount} thành viên</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  <span>{groupStats.postCount} bài viết</span>
                </div>
                {group.location?.name && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{group.location.name}</span>
                  </div>
                )}
              </div>

              {/* Tags */}
              {group.tags && group.tags.length > 0 && (
                <div className="mt-4">
                  <div className="flex flex-wrap gap-2">
                    {group.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm rounded-full font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/20 border border-gray-200 dark:border-gray-700 ${activeTab === 'members' ? 'overflow-visible' : 'overflow-hidden'}`}>
              <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <nav className="flex px-3 sm:px-6 space-x-4 sm:space-x-8 overflow-x-auto no-scrollbar">
                  {[
                    { id: 'posts', label: 'Bài viết', count: group.stats?.postCount || 0 },
                    { id: 'members', label: 'Thành viên', count: groupStats.memberCount },
                    ...(hasPermission('approve_join_request') ? [{ id: 'pending', label: 'Chờ duyệt', count: (activeTab === 'pending' ? pendingRequests.length : groupStats.pendingCount) }] : []),
                    ...(hasPermission('view_analytics') ? [{ id: 'analytics', label: 'Thống kê', count: 0 }] : []),
                    ...(hasPermission('change_settings') ? [{ id: 'settings', label: 'Cài đặt', count: 0 }] : [])
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap touch-target transition-colors relative ${
                        activeTab === tab.id
                          ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      {tab.label}
                      {tab.count > 0 && (
                        <span className={`ml-2 py-0.5 px-2 rounded-full text-xs font-bold ${
                          activeTab === tab.id
                            ? 'bg-blue-600 dark:bg-blue-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>
              </div>

              <div className={`p-6 ${activeTab === 'members' ? 'overflow-visible' : ''}`}>
                {/* Posts Tab */}
                {activeTab === 'posts' && (
                  <div>
                    {/* Pending banner for users awaiting approval */}
                    {requiresApproval && !group.userRole && (group.hasPendingJoinRequest || isPendingJoin) && (
                      <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg text-yellow-800 dark:text-yellow-300 flex items-center justify-between gap-3">
                        <div className="text-sm">
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
                          className="px-3 py-1.5 bg-white dark:bg-gray-700 text-yellow-700 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-600 rounded-lg text-sm hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
                        >
                          Hủy yêu cầu
                        </button>
                      </div>
                    )}
                    {canPost() && (
                      <div className="mb-6">
                        <PostCreator
                          ref={postCreatorRef}
                          user={user}
                          groupId={id}
                        />
                      </div>
                    )}

                    {posts.length > 0 ? (
                      <div className="space-y-4">
                        {posts.map((post) => (
                          <ModernPostCard
                            key={post._id}
                            post={post}
                            user={user}
                            isSaved={savedMap[post._id]}
                            onSavedChange={updateSavedState}
                          />
                        ))}

                        {hasMorePosts && (
                          <div className="text-center">
                            <button
                              onClick={loadMorePosts}
                              disabled={postsLoading}
                              className="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 w-full sm:w-auto transition-colors"
                            >
                              {postsLoading ? 'Đang tải...' : 'Tải thêm'}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
                          <MessageSquare className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Chưa có bài viết nào</h3>
                          <p className="text-gray-600 dark:text-gray-400">
                            {canPost()
                              ? 'Hãy là người đầu tiên đăng bài trong nhóm này'
                              : 'Chưa có bài viết nào trong nhóm này'
                            }
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Members Tab */}
                {activeTab === 'members' && (isAdmin() || group.settings?.showMemberList) && (
                  <div>
                    {group.members && group.members.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-visible">
                        {group.members.map((member) => (
                          <div key={member.user._id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors overflow-visible relative">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600">
                              <img
                                src={getUserAvatarUrl(member.user, AVATAR_SIZES.MEDIUM)}
                                alt={member.user.name || member.user.fullName || member.user.username || 'User'}
                                className="w-full h-full object-cover"
                              />
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                {member.user.name || member.user.fullName || member.user.username || member.user.displayName || 'Unknown'}
                              </p>
                              <div className="flex items-center gap-2">
                                {member.role === 'owner' && (
                                  <Crown className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />
                                )}
                                {member.role === 'admin' && (
                                  <Shield className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                                )}
                                {member.role === 'moderator' && (
                                  <UserCheck className="w-4 h-4 text-green-500 dark:text-green-400" />
                                )}
                                <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                                  {member.role === 'owner' ? 'Chủ sở hữu' :
                                    member.role === 'admin' ? 'Quản trị viên' :
                                      member.role === 'moderator' ? 'Điều hành viên' : 'Thành viên'}
                                </span>
                              </div>
                            </div>

                            {canManage() && member.role !== 'owner' && (
                              <div className="relative member-menu">
                                <button
                                  onClick={() => setShowMemberMenu(showMemberMenu === member.user._id ? null : member.user._id)}
                                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-400 transition-colors"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>

                                {showMemberMenu === member.user._id && (
                                  <div className="absolute right-0 top-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg dark:shadow-gray-900/50 py-1 z-50 min-w-[180px] border border-gray-200 dark:border-gray-700">
                                    {/* Role Management - Phân quyền chi tiết */}

                                    {/* Chỉ Owner mới có thể thăng Admin */}
                                    {group.userRole === 'owner' && member.role !== 'admin' && (
                                      <button
                                        onClick={() => {
                                          handleMemberRoleChange(member.user._id, 'admin');
                                          setShowMemberMenu(null);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                                      >
                                        <Shield className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                                        Thăng Quản trị viên
                                      </button>
                                    )}

                                    {/* Chỉ Owner mới có thể hạ Admin */}
                                    {group.userRole === 'owner' && member.role === 'admin' && (
                                      <button
                                        onClick={() => {
                                          handleMemberRoleChange(member.user._id, 'member');
                                          setShowMemberMenu(null);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                      >
                                        <UserCheck className="w-4 h-4 text-gray-500" />
                                        Hạ xuống Thành viên
                                      </button>
                                    )}

                                    {/* Admin và Owner có thể thăng Moderator */}
                                    {hasPermission('promote_to_moderator') && member.role === 'member' && (
                                      <button
                                        onClick={() => {
                                          handleMemberRoleChange(member.user._id, 'moderator');
                                          setShowMemberMenu(null);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                      >
                                        <UserCheck className="w-4 h-4 text-green-500" />
                                        Thăng Điều hành viên
                                      </button>
                                    )}

                                    {/* Admin và Owner có thể hạ Moderator */}
                                    {hasPermission('promote_to_moderator') && member.role === 'moderator' && (
                                      <button
                                        onClick={() => {
                                          handleMemberRoleChange(member.user._id, 'member');
                                          setShowMemberMenu(null);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                      >
                                        <UserCheck className="w-4 h-4 text-gray-500" />
                                        Hạ xuống Thành viên
                                      </button>
                                    )}

                                    {/* Chỉ hiển thị actions nếu có quyền và không phải Admin (trừ Owner) */}
                                    {(hasPermission('remove_member') && (member.role !== 'admin' || group.userRole === 'owner')) && (
                                      <>
                                        <div className="border-t my-1"></div>

                                        {/* Actions */}
                                        <button
                                          onClick={() => {
                                            handleRemoveMember(member.user._id, member.user.name || 'thành viên');
                                            setShowMemberMenu(null);
                                          }}
                                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                        >
                                          <UserX className="w-4 h-4" />
                                          Xóa khỏi nhóm
                                        </button>
                                        <button
                                          onClick={() => {
                                            handleBanMember(member.user._id, member.user.name || 'thành viên');
                                            setShowMemberMenu(null);
                                          }}
                                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                        >
                                          <Ban className="w-4 h-4" />
                                          Cấm
                                        </button>
                                      </>
                                    )}

                                    {/* Thông báo nếu không có quyền */}
                                    {!hasPermission('remove_member') || (member.role === 'admin' && group.userRole !== 'owner') ? (
                                      <div className="px-4 py-2 text-xs text-gray-500 italic">
                                        {member.role === 'admin' && group.userRole !== 'owner'
                                          ? 'Chỉ chủ sở hữu mới có thể quản lý admin'
                                          : 'Quyền hạn hạn chế'
                                        }
                                      </div>
                                    ) : null}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
                          <Users className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Chưa có thành viên</h3>
                          <p className="text-gray-600 dark:text-gray-400">Nhóm này chưa có thành viên nào</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Pending Join Requests - Admin only */}
                {activeTab === 'pending' && hasPermission('approve_join_request') && (
                  <div>
                    {pendingLoading ? (
                      <div className="py-8 text-center text-gray-500 dark:text-gray-400">Đang tải danh sách...</div>
                    ) : pendingRequests && pendingRequests.length > 0 ? (
                      <div className="space-y-3">
                        {pendingRequests.map((req) => (
                          <div key={req._id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600">
                              <img src={getUserAvatarUrl(req.user, AVATAR_SIZES.MEDIUM)} alt={req.user?.name || 'User'} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{req.user?.name || 'Người dùng'}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{new Date(req.requestedAt).toLocaleString('vi-VN')}</p>
                              {req.message && <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{req.message}</p>}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={async () => {
                                  try {
                                    await api(`/api/groups/${id}/join-requests/${req._id}/approve`, { method: 'POST' });
                                    // Optimistic remove
                                    setPendingRequests(prev => prev.filter(r => r._id !== req._id));
                                    setGroupStats(s => ({ ...s, pendingCount: Math.max(0, (s.pendingCount || 0) - 1), memberCount: (s.memberCount || 0) + 1 }));
                                    // Refetch to be sure
                                    const res = await api(`/api/groups/${id}/join-requests?t=${Date.now()}`, { method: 'GET' });
                                    if (res.success) setPendingRequests(Array.isArray(res.data) ? res.data : []);
                                    await loadGroup();
                                  } catch (e) { alert(e.message || 'Lỗi duyệt yêu cầu'); }
                                }}
                                className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                              >
                                Duyệt
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    await api(`/api/groups/${id}/join-requests/${req._id}/reject`, { method: 'POST' });
                                    setPendingRequests(prev => prev.filter(r => r._id !== req._id));
                                    setGroupStats(s => ({ ...s, pendingCount: Math.max(0, (s.pendingCount || 0) - 1) }));
                                    const res = await api(`/api/groups/${id}/join-requests?t=${Date.now()}`, { method: 'GET' });
                                    if (res.success) setPendingRequests(Array.isArray(res.data) ? res.data : []);
                                    await loadGroup();
                                  } catch (e) { alert(e.message || 'Lỗi từ chối yêu cầu'); }
                                }}
                                className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                              >
                                Từ chối
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Không có yêu cầu chờ duyệt</h3>
                        <p className="text-gray-600">Khi có yêu cầu tham gia, chúng sẽ xuất hiện ở đây</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && hasPermission('change_settings') && (
                  <div className="space-y-8">
                    {/* Group Basic Settings */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                      <div className="flex items-center gap-3 mb-6">
                        <Settings className="w-6 h-6 text-gray-700" />
                        <h3 className="text-xl font-semibold text-gray-900">Cài đặt cơ bản</h3>
                      </div>

                      <div className="space-y-6">
                        {/* Group Name */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tên nhóm
                          </label>
                          <input
                            type="text"
                            value={settingsData.name}
                            onChange={(e) => handleSettingsChange('name', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                            placeholder="Nhập tên nhóm..."
                          />
                        </div>

                        {/* Group Description */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Mô tả nhóm
                          </label>
                          <textarea
                            value={settingsData.description}
                            onChange={(e) => handleSettingsChange('description', e.target.value)}
                            rows={4}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                            placeholder="Mô tả về nhóm..."
                          />
                          <p className="mt-1 text-sm text-gray-500">
                            {settingsData.description?.length || 0}/500 ký tự
                          </p>
                        </div>

                        {/* Group Type */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Loại nhóm
                          </label>
                          <div className="space-y-4">
                            {[
                              { value: 'public', label: 'Công khai', desc: 'Mọi người có thể tìm thấy và tham gia' },
                              { value: 'private', label: 'Riêng tư', desc: 'Chỉ thành viên mới thấy nội dung' },
                              { value: 'secret', label: 'Bí mật', desc: 'Chỉ thành viên mới tìm thấy nhóm' }
                            ].map((type) => (
                              <label key={type.value} className="flex items-center gap-4 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                <input
                                  type="radio"
                                  name="groupType"
                                  value={type.value}
                                  checked={settingsData.type === type.value}
                                  onChange={(e) => handleSettingsChange('type', e.target.value)}
                                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-2 flex-shrink-0"
                                />
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900 text-base">{type.label}</p>
                                  <p className="text-sm text-gray-600 mt-1">{type.desc}</p>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Permissions Settings */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                      <div className="flex items-center gap-3 mb-6">
                        <Shield className="w-6 h-6 text-gray-700" />
                        <h3 className="text-xl font-semibold text-gray-900">Quyền hạn</h3>
                      </div>

                      <div className="space-y-6">
                        {/* Join Approval */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Ai có thể tham gia?
                          </label>
                          <select
                            value={settingsData.joinApproval}
                            onChange={(e) => handleSettingsChange('joinApproval', e.target.value)}
                            disabled={!isOwnerRole()}
                            className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 text-base ${!isOwnerRole() ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            <option value="anyone">Bất kỳ ai</option>
                            <option value="admin_approval">Cần duyệt từ admin</option>
                            <option value="invite_only">Chỉ được mời</option>
                          </select>
                        </div>

                        {/* Post Permissions */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Ai có thể đăng bài?
                          </label>
                          <select
                            value={settingsData.postPermissions}
                            onChange={(e) => handleSettingsChange('postPermissions', e.target.value)}
                            disabled={!isOwnerRole()}
                            className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 text-base ${!isOwnerRole() ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            <option value="all_members">Tất cả thành viên</option>
                            <option value="moderators_and_admins">Điều hành viên và admin</option>
                            <option value="admins_only">Chỉ admin</option>
                          </select>
                        </div>

                        {/* Comment Permissions */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Ai có thể bình luận?
                          </label>
                          <select
                            value={settingsData.commentPermissions}
                            onChange={(e) => handleSettingsChange('commentPermissions', e.target.value)}
                            disabled={!isOwnerRole()}
                            className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 text-base ${!isOwnerRole() ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            <option value="all_members">Tất cả thành viên</option>
                            <option value="members_only">Chỉ thành viên</option>
                            <option value="admins_only">Chỉ admin</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Additional Settings */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                      <div className="flex items-center gap-3 mb-6">
                        <Users className="w-6 h-6 text-gray-700" />
                        <h3 className="text-xl font-semibold text-gray-900">Cài đặt khác</h3>
                      </div>

                      <div className="space-y-4">
                        <label className={`flex items-center justify-between p-3 border rounded-lg ${isOwnerRole() ? 'hover:bg-gray-50 cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}>
                          <div>
                            <p className="font-medium text-gray-900">Cho phép thành viên mời người khác</p>
                            <p className="text-sm text-gray-600">Thành viên có thể mời bạn bè tham gia nhóm</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={settingsData.allowMemberInvites}
                            onChange={(e) => handleSettingsChange('allowMemberInvites', e.target.checked)}
                            disabled={!isOwnerRole()}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </label>

                        <label className={`flex items-center justify-between p-3 border rounded-lg ${isOwnerRole() ? 'hover:bg-gray-50 cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}>
                          <div>
                            <p className="font-medium text-gray-900">Hiển thị danh sách thành viên</p>
                            <p className="text-sm text-gray-600">Mọi người có thể xem danh sách thành viên</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={settingsData.showMemberList}
                            onChange={(e) => handleSettingsChange('showMemberList', e.target.checked)}
                            disabled={!isOwnerRole()}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </label>

                        <label className={`flex items-center justify-between p-3 border rounded-lg ${isOwnerRole() ? 'hover:bg-gray-50 cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}>
                          <div>
                            <p className="font-medium text-gray-900">Cho phép tìm kiếm nhóm</p>
                            <p className="text-sm text-gray-600">Nhóm có thể được tìm thấy qua tìm kiếm</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={settingsData.searchable}
                            onChange={(e) => handleSettingsChange('searchable', e.target.checked)}
                            disabled={!isOwnerRole()}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Tags and Location */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                      <div className="flex items-center gap-3 mb-6">
                        <Tag className="w-6 h-6 text-gray-700" />
                        <h3 className="text-xl font-semibold text-gray-900">Thông tin bổ sung</h3>
                      </div>

                      <div className="space-y-6">
                        {/* Tags */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tags
                          </label>
                          <input
                            type="text"
                            value={settingsData.tags}
                            onChange={(e) => handleSettingsChange('tags', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                            placeholder="Công nghệ, Học tập, Thể thao... (cách nhau bởi dấu phẩy)"
                          />
                          <p className="mt-1 text-sm text-gray-500">
                            Tối đa 10 tags, mỗi tag không quá 20 ký tự
                          </p>
                        </div>

                        {/* Location */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Vị trí
                          </label>
                          <input
                            type="text"
                            value={settingsData.location}
                            onChange={(e) => handleSettingsChange('location', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                            placeholder="Thành phố, quốc gia..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={handleCancelSettings}
                        disabled={settingsLoading}
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveSettings}
                        disabled={settingsLoading}
                        className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                      >
                        {settingsLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Analytics Tab */}
                {activeTab === 'analytics' && hasPermission('view_analytics') && (
                  <div className="space-y-8">
                    {/* Analytics Header */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <BarChart3 className="w-6 h-6" />
                            Thống kê nhóm
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Phân tích hoạt động và hiệu suất của nhóm
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <select
                            value={analyticsPeriod}
                            onChange={(e) => setAnalyticsPeriod(e.target.value)}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                          >
                            <option value="7d">7 ngày qua</option>
                            <option value="30d">30 ngày qua</option>
                            <option value="90d">90 ngày qua</option>
                            <option value="1y">1 năm qua</option>
                          </select>
                          <button
                            onClick={loadAnalytics}
                            className="px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors text-sm"
                          >
                            Làm mới
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Analytics Content */}
                    {analyticsLoading ? (
                      <div className="space-y-6">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                            <div className="animate-pulse">
                              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : analyticsError ? (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                          <span className="text-red-400 text-2xl">⚠️</span>
                        </div>
                        <h3 className="text-lg font-medium text-red-900 dark:text-red-100 mb-2">Có lỗi xảy ra</h3>
                        <p className="text-red-600 dark:text-red-400 mb-4">{analyticsError}</p>
                        <button
                          onClick={loadAnalytics}
                          className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-800 transition-colors"
                        >
                          Thử lại
                        </button>
                      </div>
                    ) : analytics ? (
                      <div className="space-y-6">
                        {/* Overview Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-blue-100 text-sm">Tổng lượt xem</p>
                                <p className="text-2xl font-bold">{analytics.totalViews.toLocaleString()}</p>
                              </div>
                              <Eye className="w-8 h-8 text-blue-200" />
                            </div>
                          </div>
                          
                          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-green-100 text-sm">Tổng bài viết</p>
                                <p className="text-2xl font-bold">{analytics.totalPosts}</p>
                              </div>
                              <FileText className="w-8 h-8 text-green-200" />
                            </div>
                          </div>
                          
                          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-purple-100 text-sm">Tổng bình luận</p>
                                <p className="text-2xl font-bold">{analytics.totalComments.toLocaleString()}</p>
                              </div>
                              <MessageSquare className="w-8 h-8 text-purple-200" />
                            </div>
                          </div>
                          
                          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-orange-100 text-sm">Tổng thành viên</p>
                                <p className="text-2xl font-bold">{analytics.totalMembers}</p>
                              </div>
                              <Users className="w-8 h-8 text-orange-200" />
                            </div>
                          </div>
                        </div>

                        {/* Recent Activity Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Bài viết mới</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{analytics.recentPosts}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {analytics.period === '7d' ? '7 ngày' : analytics.period === '30d' ? '30 ngày' : analytics.period === '90d' ? '90 ngày' : '1 năm'} qua
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                                <MessageSquare className="w-6 h-6 text-green-600 dark:text-green-400" />
                              </div>
                              <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Bình luận mới</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{analytics.recentComments}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {analytics.period === '7d' ? '7 ngày' : analytics.period === '30d' ? '30 ngày' : analytics.period === '90d' ? '90 ngày' : '1 năm'} qua
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                                <UserPlus className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                              </div>
                              <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Thành viên mới</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{analytics.recentMembers}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {analytics.period === '7d' ? '7 ngày' : analytics.period === '30d' ? '30 ngày' : analytics.period === '90d' ? '90 ngày' : '1 năm'} qua
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Top Posts */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5" />
                            Top bài viết có lượt xem cao nhất
                          </h4>
                          {analytics.topPosts && analytics.topPosts.length > 0 ? (
                            <div className="space-y-3">
                              {analytics.topPosts.map((post, index) => (
                                <div key={post._id} className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                  <div className="flex items-start gap-3 flex-1 min-w-0">
                                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold text-sm flex-shrink-0">
                                      {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h5 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                        {post.title}
                                      </h5>
                                      <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {post.author?.name || 'Người dùng'} • {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 flex-shrink-0 ml-3">
                                    <Eye className="w-4 h-4" />
                                    <span className="font-semibold">{post.views.toLocaleString()}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                              <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                              <p>Chưa có dữ liệu phân tích</p>
                            </div>
                          )}
                        </div>

                        {/* Recent Posts */}
                        {analytics.recentPostsList && analytics.recentPostsList.length > 0 && (
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                              <Calendar className="w-5 h-5" />
                              Bài viết gần đây ({analytics.period === '7d' ? '7 ngày' : analytics.period === '30d' ? '30 ngày' : analytics.period === '90d' ? '90 ngày' : '1 năm'})
                            </h4>
                            <div className="space-y-3">
                              {analytics.recentPostsList.map((post) => (
                                <div key={post._id} className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                  <div className="flex-1 min-w-0">
                                    <h5 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                      {post.title}
                                    </h5>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                      {post.author?.name || 'Người dùng'} • {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 flex-shrink-0 ml-3">
                                    <Eye className="w-4 h-4" />
                                    <span className="font-semibold">{post.views.toLocaleString()}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                          <BarChart3 className="w-8 h-8 text-blue-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Chưa có dữ liệu phân tích</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">Nhóm sẽ có dữ liệu thống kê khi có hoạt động!</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Group Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Thông tin nhóm</h3>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Tạo ngày:</span>
                  <span className="text-gray-900">
                    {new Date(group.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Thành viên:</span>
                  <span className="text-gray-900">{groupStats.memberCount}</span>
                </div>

                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Bài viết:</span>
                  <span className="text-gray-900">{groupStats.postCount}</span>
                </div>
              </div>
            </div>

            {/* Owner Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Chủ sở hữu</h3>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
                  <img
                    src={getUserAvatarUrl(group.owner, AVATAR_SIZES.MEDIUM)}
                    alt={group.owner?.name || group.owner?.fullName || group.owner?.username || 'User'}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div>
                  <p className="font-medium text-gray-900">
                    {group.owner?.name || group.owner?.fullName || group.owner?.username || group.owner?.displayName || 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-600">Chủ sở hữu</p>
                </div>
              </div>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:block bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Hành động</h3>
              {group.userRole ? (
                <div className="flex flex-col gap-3">
                  {canPost() && (
                    <button
                      onClick={() => {
                        setActiveTab('posts');
                        postCreatorRef.current?.openModal();
                      }}
                      className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
                    >
                      Viết bài mới
                    </button>
                  )}
                  <button
                    onClick={handleLeave}
                    disabled={isLeaving || group.userRole === 'owner'}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLeaving ? 'Đang rời...' : 'Rời nhóm'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleJoin}
                  disabled={isJoining}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isJoining ? 'Đang tham gia...' : 'Tham gia nhóm'}
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
      {/* Mobile action bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg dark:shadow-gray-900/50 safe-area-bottom">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2">
          {group.userRole ? (
            <>
              {canPost() && (
                <button
                  onClick={() => {
                    setActiveTab('posts');
                    postCreatorRef.current?.openModal();
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-700 dark:text-gray-300 touch-target"
                  title="Viết bài mới"
                >
                  <Plus className="w-5 h-5" />
                </button>
              )}
              {hasPermission('change_settings') && (
                <button
                  onClick={() => setActiveTab('settings')}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-700 dark:text-gray-300 touch-target"
                  title="Cài đặt nhóm"
                >
                  <Settings className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={handleLeave}
                disabled={isLeaving || group.userRole === 'owner'}
                className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg touch-target disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {isLeaving ? 'Đang rời...' : 'Rời nhóm'}
              </button>
            </>
          ) : (
            requiresApproval && isPendingJoin ? (
              <button
                onClick={() => setActiveTab('posts')}
                className="flex-1 px-4 py-2.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-lg touch-target border border-yellow-300 dark:border-yellow-700 font-medium transition-colors"
              >
                Đang chờ duyệt...
              </button>
            ) : (
              <button
                onClick={handleJoin}
                disabled={isJoining}
                className="flex-1 px-4 py-2.5 bg-blue-600 dark:bg-blue-500 text-white rounded-lg touch-target disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {isJoining ? 'Đang gửi...' : (requiresApproval ? 'Yêu cầu tham gia' : 'Tham gia nhóm')}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupDetail;


