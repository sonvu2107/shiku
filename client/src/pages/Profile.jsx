import React, { useEffect, useState, useRef } from "react";
import { api, uploadImage } from "../api";
import { useSavedPosts } from "../hooks/useSavedPosts";
import { useProfileData } from "../hooks/useProfileData";
import ProfileCustomization from "../components/ProfileCustomization";
import AvatarCropper from "../components/AvatarCropper";
import ProfileHeader from "../components/profile/ProfileHeader";
import ProfileTabs from "../components/profile/ProfileTabs";
import ProfileEditForm from "../components/profile/ProfileEditForm";
import PostsTab from "../components/profile/PostsTab";
import FriendsTab from "../components/profile/FriendsTab";
import AnalyticsTab from "../components/profile/AnalyticsTab";
import { useToast } from "../contexts/ToastContext";
import BackToTop from "../components/BackToTop";
import InfoTab from "../components/profile/InfoTab";

// --- UI COMPONENTS ---
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

export default function Profile({ user: propUser, setUser: propSetUser }) {
  const { showSuccess, showError } = useToast();
  // ==================== STATE MANAGEMENT ====================
  // Local state for user, synced with prop from App.jsx
  const [user, setLocalUser] = useState(propUser);

  // Sync local user when propUser changes from App
  useEffect(() => {
    if (propUser) {
      setLocalUser(propUser);
    }
  }, [propUser]);

  // Wrapper to update both local and App state
  const setUser = (newUser) => {
    setLocalUser(newUser);
    if (propSetUser) {
      propSetUser(newUser);
    }
  };
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", nickname: "", birthday: "", gender: "", hobbies: "",
    avatarUrl: "", coverUrl: "", password: "", location: "", website: "", phone: "", bio: "",
    postsCount: 0, friendsCount: 0
  });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showAvatarCropper, setShowAvatarCropper] = useState(false);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState(null);
  const [showCustomization, setShowCustomization] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Data states
  const [activeTab, setActiveTab] = useState('posts');
  const [analyticsPeriod, setAnalyticsPeriod] = useState('30d');

  // Use profile data hook để lấy dữ liệu từ API (chỉ khi user đã được load)
  // API trả về user.id (không phải _id), nên cần check cả 2
  const userId = user?.id || user?._id || null;
  const profileData = useProfileData(userId);
  const {
    data: { posts = [], friends = [], analytics = null, recentImages = [] },
    loading: { posts: postsLoading = false, friends: friendsLoading = false, analytics: analyticsLoading = false },
    loadPosts,
    loadFriends,
    loadAnalytics,
    refreshAll,
  } = profileData;


  const { savedMap, updateSavedState } = useSavedPosts(posts);

  // Refs để cleanup async operations
  const abortControllerRef = useRef(null);

  // ==================== EFFECTS & API ====================

  // Load user data on mount
  useEffect(() => {
    let isMounted = true;
    abortControllerRef.current = new AbortController();

    async function load() {
      try {
        const res = await api("/api/auth/me");
        if (isMounted && !abortControllerRef.current?.signal.aborted) {
          // Đảm bảo user object có cả id và _id để tương thích
          const userData = {
            ...res.user,
            _id: res.user.id || res.user._id, // Đảm bảo có _id
            id: res.user.id || res.user._id,   // Đảm bảo có id
          };
          setUser(userData);
          setForm({
            ...userData,
            password: "",
            postsCount: userData.postsCount || 0,
            friendsCount: userData.friendsCount || 0,
          });
        }
      } catch (error) {
        if (isMounted && !abortControllerRef.current?.signal.aborted) {
        }
      }
    }

    load();

    return () => {
      isMounted = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  // Posts sẽ tự động load khi user._id thay đổi thông qua useProfileData hook
  // Hook đã tự động handle việc load posts khi userId thay đổi

  // Update posts count when posts change
  useEffect(() => {
    if (posts.length >= 0) { // >= 0 để cập nhật cả khi posts = []
      setForm(f => ({ ...f, postsCount: posts.length }));
    }
  }, [posts.length]);

  // Load friends ngay khi vào trang để ProfileHeader có số liệu sớm
  useEffect(() => {
    const currentUserId = user?.id || user?._id;
    if (!currentUserId) return;
    // Load friends ngay khi userId có sẵn (không cần đợi tab friends)
    loadFriends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?._id]);

  // Reload friends khi chuyển sang tab friends (để đảm bảo data mới nhất)
  useEffect(() => {
    const currentUserId = user?.id || user?._id;
    if (activeTab !== 'friends' || !currentUserId) return;
    loadFriends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Update friends count when friends change
  useEffect(() => {
    if (friends.length >= 0) { // >= 0 để cập nhật cả khi friends = []
      setForm(f => ({ ...f, friendsCount: friends.length }));
    }
  }, [friends.length]);

  // Load analytics ngay khi vào trang để ProfileHeader có số liệu sớm
  useEffect(() => {
    const currentUserId = user?.id || user?._id;
    if (!currentUserId) return;
    // Load analytics ngay khi userId có sẵn (không cần đợi tab analytics)
    loadAnalytics(analyticsPeriod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?._id, analyticsPeriod]);

  // Reload analytics khi chuyển sang tab analytics (để đảm bảo data mới nhất)
  useEffect(() => {
    const currentUserId = user?.id || user?._id;
    if (activeTab !== 'analytics' || !currentUserId) return;
    loadAnalytics(analyticsPeriod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ==================== HANDLERS ====================

  const handleCoverChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const { url } = await uploadImage(file);
      setForm(f => ({ ...f, coverUrl: url }));
      // Update user object as well
      setUser(prev => prev ? { ...prev, coverUrl: url } : null);
    } catch (err) {
      showError(err.message || 'Lỗi khi tải ảnh bìa');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarClick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if file is video
    const isVideo = file.type.startsWith('video/');

    // Check file size limits
    const maxSize = isVideo ? 10 * 1024 * 1024 : 5 * 1024 * 1024; // 10MB for video, 5MB for images
    if (file.size > maxSize) {
      showError(`File quá lớn. Tối đa ${isVideo ? '10MB' : '5MB'} cho ${isVideo ? 'video' : 'ảnh'}`);
      return;
    }

    // Video: Chỉ admin mới được upload video avatar
    if (isVideo) {
      // Kiểm tra quyền admin
      const isAdmin = user?.role === 'admin' ||
        Object.keys(user?.roleData?.permissions || {}).some(k => k.startsWith('admin.') && user?.roleData?.permissions[k]);

      if (!isAdmin) {
        showError('⚠️ Tính năng avatar video đang trong giai đoạn thử nghiệm và chỉ dành cho Admin. Vui lòng sử dụng ảnh thay thế.');
        return;
      }

      try {
        setAvatarUploading(true);
        const { url } = await uploadImage(file);
        setForm(f => ({ ...f, avatarUrl: url }));
        setUser(prev => prev ? { ...prev, avatarUrl: url } : null);
        showSuccess('Đã cập nhật avatar video! (Tính năng thử nghiệm)');
      } catch (err) {
        showError('Tải lên thất bại: ' + err.message);
      } finally {
        setAvatarUploading(false);
      }
      return;
    }

    // GIF: Upload trực tiếp không qua crop để giữ animation
    // (Canvas crop chỉ lấy frame đầu tiên, sẽ mất animation)
    if (file.type === 'image/gif') {
      try {
        setAvatarUploading(true);
        const { url } = await uploadImage(file);
        setForm(f => ({ ...f, avatarUrl: url }));
        setUser(prev => prev ? { ...prev, avatarUrl: url } : null);
        showSuccess('Đã cập nhật avatar GIF!');
      } catch (err) {
        showError('Tải lên thất bại: ' + err.message);
      } finally {
        setAvatarUploading(false);
      }
      return;
    }

    // Các định dạng ảnh khác: Mở cropper như bình thường
    setSelectedAvatarFile(file);
    setShowAvatarCropper(true);
  };

  const handleFormSubmit = async (filteredData) => {
    setFormLoading(true);
    try {
      const res = await api("/api/auth/update-profile", { method: "PUT", body: filteredData });
      if (res.user) {
        // Reload fresh user data from API to ensure UI has latest data
        const freshUserRes = await api("/api/auth/me");
        const userData = {
          ...freshUserRes.user,
          _id: freshUserRes.user.id || freshUserRes.user._id,
          id: freshUserRes.user.id || freshUserRes.user._id,
        };

        setUser(userData);
        setForm({
          ...userData,
          password: "",
          postsCount: userData.postsCount || 0,
          friendsCount: userData.friendsCount || 0,
        });
        setEditing(false);

        // Reload tất cả dữ liệu sau khi update profile
        const updatedUserId = userData.id || userData._id;
        if (updatedUserId) {
          await refreshAll(analyticsPeriod);
        }

        showSuccess("Đã lưu thay đổi!");
      }
    } catch (err) {
      showError(err.message || 'Lỗi khi lưu thay đổi');
    } finally {
      setFormLoading(false);
    }
  };

  const handleAvatarCropComplete = async (croppedBlob) => {
    try {
      setAvatarUploading(true);
      setShowAvatarCropper(false);

      // Convert blob to File
      const croppedFile = new File([croppedBlob], selectedAvatarFile.name, {
        type: 'image/png',
        lastModified: Date.now()
      });

      // Upload cropped image
      const { url } = await uploadImage(croppedFile);
      setForm(f => ({ ...f, avatarUrl: url }));

      // Update user object as well
      setUser(prev => prev ? { ...prev, avatarUrl: url } : null);

      // Reset state
      setSelectedAvatarFile(null);
    } catch (err) {
      showError("Tải lên thất bại: " + err.message);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleLoadPosts = async () => {
    const currentUserId = user?.id || user?._id;
    if (!currentUserId) return;
    await loadPosts();
  };

  // ==================== RENDER ====================

  if (!user) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-neutral-900 dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-white transition-colors duration-300 font-sans relative overflow-x-hidden">
      <NoiseOverlay />
      <GridPattern />

      {/* Header Section */}
      <ProfileHeader
        user={user}
        form={form}
        editing={editing}
        avatarUploading={avatarUploading}
        analytics={analytics}
        analyticsLoading={analyticsLoading}
        friendsCount={friends.length}
        friendsLoading={friendsLoading}
        onEditToggle={() => setEditing(!editing)}
        onCustomizeClick={() => setShowCustomization(true)}
        onCoverChange={handleCoverChange}
        onAvatarClick={handleAvatarClick}
      />

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10" style={{ overflow: 'visible' }}>
        {/* Edit Form */}
        <ProfileEditForm
          editing={editing}
          form={form}
          setForm={setForm}
          onSubmit={handleFormSubmit}
          loading={formLoading}
        />

        {/* Tabs Navigation */}
        <ProfileTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Content Area */}
        <div className="min-h-[500px] pb-32 md:pb-28">
          {activeTab === "info" && (
            <InfoTab
              form={form}
              user={user}
            />
          )}

          {activeTab === "posts" && (
            <PostsTab
              user={user}
              posts={posts}
              postsLoading={postsLoading}
              form={form}
              savedMap={savedMap}
              recentImages={recentImages}
              onUpdate={handleLoadPosts}
              onSavedChange={updateSavedState}
            />
          )}

          {activeTab === "friends" && (
            <FriendsTab
              friends={friends}
              friendsLoading={friendsLoading}
              onRemoveFriend={loadFriends}
            />
          )}

          {activeTab === "analytics" && (
            <AnalyticsTab
              analytics={analytics}
              analyticsLoading={analyticsLoading}
              analyticsPeriod={analyticsPeriod}
              onPeriodChange={setAnalyticsPeriod}
              onRefresh={() => loadAnalytics(analyticsPeriod)}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {showCustomization && (
        <ProfileCustomization
          user={user}
          onUpdate={async () => {
            // Reload user data
            try {
              const res = await api("/api/auth/me");
              // Đảm bảo user object có cả id và _id để tương thích
              const userData = {
                ...res.user,
                _id: res.user.id || res.user._id, // Đảm bảo có _id
                id: res.user.id || res.user._id,   // Đảm bảo có id
              };
              setUser(userData);
              setForm({
                ...userData,
                password: "",
                postsCount: userData.postsCount || 0,
                friendsCount: userData.friendsCount || 0,
              });

              // Reload tất cả dữ liệu sau khi update customization
              const updatedUserId = userData.id || userData._id;
              if (updatedUserId) {
                // Sử dụng refreshAll để reload tất cả dữ liệu với period hiện tại
                await refreshAll(analyticsPeriod);
              }
            } catch (err) {
            }
            setShowCustomization(false);
          }}
          onClose={() => setShowCustomization(false)}
        />
      )}

      {showAvatarCropper && selectedAvatarFile && (
        <AvatarCropper
          imageFile={selectedAvatarFile}
          onCropComplete={handleAvatarCropComplete}
          onCancel={() => {
            setShowAvatarCropper(false);
            setSelectedAvatarFile(null);
          }}
        />
      )}
      <BackToTop />
    </div>
  );
}
