import { useEffect, useState } from "react";
import { api, uploadImage } from "../api";
import UserName from "../components/UserName";
import PostCard from "../components/PostCard";
import PostCreator from "../components/PostCreator";
import ProfileCustomization from "../components/ProfileCustomization";
import {
  Settings,
  Edit3,
  MapPin,
  Globe,
  Phone,
  Calendar,
  Heart,
  Users,
  FileText,
  Calendar as CalendarIcon,
  Eye,
  EyeOff,
  Mail,
  Camera,
  MessageCircle,
  BarChart3,
  TrendingUp,
  Eye as EyeIcon
} from "lucide-react";

// Custom SVG Icons
const CustomIcons = {
  Settings: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Camera: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Users: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    </svg>
  ),
  Calendar: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  MessageCircle: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  Edit3: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  FileText: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  MapPin: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Plus: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  ),
  BarChart3: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
};

/**
 * Profile - Trang profile cá nhân của user
 * Cho phép xem và chỉnh sửa thông tin cá nhân, upload avatar
 * @returns {JSX.Element} Component profile page
 */
export default function Profile() {
  // ==================== STATE MANAGEMENT ====================

  const [user, setUser] = useState(null); // Thông tin user hiện tại
  const [editing, setEditing] = useState(false); // Trạng thái edit mode
  const [form, setForm] = useState({
    name: "", // Tên hiển thị
    email: "", // Email
    birthday: "", // Ngày sinh
    gender: "", // Giới tính
    hobbies: "", // Sở thích
    avatarUrl: "", // URL avatar
    coverUrl: "", // URL ảnh bìa
    password: "", // Mật khẩu mới (optional)
    location: "", // Địa chỉ
    website: "", // Website
    phone: "" // Số điện thoại
  });
  const [avatarUploading, setAvatarUploading] = useState(false); // Loading khi upload avatar

  // Customization states
  const [showCustomization, setShowCustomization] = useState(false); // Hiển thị modal customization

  // Posts states
  const [posts, setPosts] = useState([]); // Danh sách bài đăng cá nhân
  const [postsLoading, setPostsLoading] = useState(false); // Loading posts
  const [postsError, setPostsError] = useState(""); // Error khi load posts

  // Tab states
  const [activeTab, setActiveTab] = useState('posts'); // Tab hiện tại đang active

  // Friends and Events states
  const [friends, setFriends] = useState([]); // Danh sách bạn bè
  const [friendsLoading, setFriendsLoading] = useState(false); // Loading friends
  const [friendsError, setFriendsError] = useState(""); // Error khi load friends

  // Analytics states
  const [analytics, setAnalytics] = useState(null); // Analytics data
  const [analyticsLoading, setAnalyticsLoading] = useState(false); // Loading analytics
  const [analyticsError, setAnalyticsError] = useState(""); // Error khi load analytics
  const [analyticsPeriod, setAnalyticsPeriod] = useState('30d'); // Analytics period


  // ==================== EFFECTS ====================

  /**
   * Load thông tin user khi component mount
   */
  useEffect(() => {
    load();
  }, []);

  /**
   * Load posts sau khi user đã được load
   */
  useEffect(() => {
    if (user) {
      loadPosts();
    }
  }, [user]);

  /**
   * Load friends khi chuyển sang tab friends
   */
  useEffect(() => {
    if (activeTab === 'friends' && user && friends.length === 0) {
      loadFriends();
    }
  }, [activeTab, user]);

  /**
   * Load analytics khi chuyển sang tab analytics
   */
  useEffect(() => {
    if (activeTab === 'analytics' && user) {
      loadAnalytics();
    }
  }, [activeTab, user, analyticsPeriod]);


  // ==================== API FUNCTIONS ====================

  /**
   * Load thông tin user hiện tại và populate form
   */
  async function load() {
    const res = await api("/api/auth/me");
    console.log("🔍 API /me response:", res);
    console.log("🔍 User object:", res.user);
    console.log("🔍 User._id:", res.user?._id);
    setUser(res.user);

    // Populate form với data từ server
    setForm({
      name: res.user.name || "",
      email: res.user.email || "",
      birthday: res.user.birthday || "",
      gender: res.user.gender || "",
      hobbies: res.user.hobbies || "",
      bio: res.user.bio || "",
      avatarUrl: res.user.avatarUrl || "",
      coverUrl: res.user.coverUrl || "",
      password: "", // Luôn reset password field
      location: res.user.location || "",
      website: res.user.website || "",
      phone: res.user.phone || "",
      role: res.user.role || "",
      isVerified: res.user.isVerified || false
    });
  }

  /**
   * Load bài đăng cá nhân của user
   */
  async function loadPosts() {
    if (!user) return;

    setPostsLoading(true);
    setPostsError("");

    try {
      console.log("🔍 Loading posts for user:", user._id || user.id, user.name);
      
      // Load cả public và private posts của user
      const userId = user._id || user.id;
      const [publicData, privateData] = await Promise.all([
        api(`/api/posts?author=${userId}&status=published&limit=50`),
        api(`/api/posts?author=${userId}&status=private&limit=50`)
      ]);

      console.log("📊 Public posts:", publicData.items?.length || 0);
      console.log("📊 Private posts:", privateData.items?.length || 0);
      
      // Debug: Kiểm tra author của posts
      const allPosts = [...privateData.items, ...publicData.items];
      console.log("🔍 All posts authors:", allPosts.map(p => ({ id: p._id, author: p.author?._id, authorName: p.author?.name })));

      // Merge và sort theo thời gian tạo
      const sortedPosts = allPosts
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setPosts(sortedPosts);
    } catch (error) {
      console.error("❌ Error loading posts:", error);
      setPostsError('Không thể tải bài đăng. Vui lòng thử lại.');
    } finally {
      setPostsLoading(false);
    }
  }

  /**
   * Load danh sách bạn bè của user
   */
  async function loadFriends() {
    if (!user) return;

    setFriendsLoading(true);
    setFriendsError("");

    try {
      // Sử dụng đúng API friends/list
      const response = await api(`/api/friends/list`);
      setFriends(response.friends || []);
    } catch (err) {
      setFriendsError("Không thể tải danh sách bạn bè: " + err.message);
    } finally {
      setFriendsLoading(false);
    }
  }

  /**
   * Load analytics data cho user
   */
  async function loadAnalytics() {
    if (!user) return;

    setAnalyticsLoading(true);
    setAnalyticsError("");

    try {
      const response = await api(`/api/posts/analytics?period=${analyticsPeriod}`);
      setAnalytics(response.analytics);
    } catch (err) {
      setAnalyticsError("Không thể tải dữ liệu phân tích: " + err.message);
    } finally {
      setAnalyticsLoading(false);
    }
  }


  /**
   * Xem profile của bạn bè
   */
  function handleViewProfile(friendId) {
    // Chuyển đến trang profile của bạn bè (sử dụng route /user/:userId)
    window.location.href = `/user/${friendId}`;
  }

  /**
   * Bắt đầu cuộc trò chuyện với bạn bè
   */
  function handleStartChat(friendId, friendName) {
    // Chuyển đến trang chat với bạn bè
    window.location.href = `/chat?user=${friendId}`;
  }


  if (!user) return <div className="card">Đang tải...</div>;

  // Get theme colors
  const getThemeColors = (theme) => {
    const themes = {
      default: { primary: "#3b82f6", secondary: "#1e40af" },
      dark: { primary: "#1f2937", secondary: "#111827" },
      blue: { primary: "#2563eb", secondary: "#1d4ed8" },
      green: { primary: "#059669", secondary: "#047857" },
      purple: { primary: "#7c3aed", secondary: "#6d28d9" },
      pink: { primary: "#db2777", secondary: "#be185d" },
      orange: { primary: "#ea580c", secondary: "#c2410c" }
    };
    return themes[theme] || themes.default;
  };

  const themeColors = getThemeColors(user.profileTheme || "default");

  // Layout configurations
  const getLayoutClass = (layout) => {
    switch (layout) {
      case "modern":
        return "modern-layout";
      case "minimal":
        return "minimal-layout";
      case "creative":
        return "creative-layout";
      default:
        return "classic-layout";
    }
  };

  const layoutClass = getLayoutClass(user.profileLayout || "classic");

  return (
    <div key={`profile-${user._id}-${user.profileTheme}-${user.profileLayout}-${user.useCoverImage}`} className={`w-full min-h-screen ${layoutClass} bg-gray-50 dark:bg-gray-900`}>
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        /* Layout Styles */
        .modern-layout .cover-section {
          border-radius: 0;
          box-shadow: none;
        }
        .modern-layout .profile-card {
          border-radius: 16px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        .minimal-layout .cover-section {
          height: 200px;
        }
        .minimal-layout .profile-info {
          padding: 1rem;
        }
        .minimal-layout .contact-info {
          display: none;
        }
        
        .creative-layout .cover-section {
          background: linear-gradient(135deg, var(--theme-primary), var(--theme-secondary));
          position: relative;
          overflow: hidden;
        }
        .creative-layout .cover-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.1"/><circle cx="10" cy="60" r="0.5" fill="white" opacity="0.1"/><circle cx="90" cy="40" r="0.5" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
        }
        
        :root {
          --theme-primary: ${themeColors.primary};
          --theme-secondary: ${themeColors.secondary};
        }
      `}</style>
      {/* Cover Photo */}
      <div className="relative h-72 md:h-80 lg:h-96 group cover-section">
        {form.coverUrl && user.useCoverImage === true ? (
          <img
            src={form.coverUrl}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ backgroundColor: themeColors.primary }}
          />
        )}
        <div className="absolute inset-0 bg-black bg-opacity-20" />

        {/* Cover Photo Upload Button */}
        {editing && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <label className="flex items-center gap-2 px-4 py-2 bg-black bg-opacity-90 hover:bg-opacity-100 rounded-lg text-white font-medium cursor-pointer transition-all">
              <CustomIcons.Camera />
              {form.coverUrl ? "Đổi ảnh bìa" : "Thêm ảnh bìa"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setAvatarUploading(true);
                  try {
                    const { url } = await uploadImage(file);
                    setForm(f => ({ ...f, coverUrl: url }));
                  } catch (err) {
                    alert("Upload thất bại: " + err.message);
                  } finally {
                    setAvatarUploading(false);
                  }
                }}
              />
            </label>
          </div>
        )}

        {/* Cover Display Toggle */}
        {form.coverUrl && (
          <div className="absolute top-3 left-3 md:top-4 md:left-4 z-10">
            <button
              onClick={() => setShowCustomization(true)}
              className="flex items-center gap-1 md:gap-2 px-2 py-1.5 md:px-4 md:py-2 bg-black bg-opacity-90 hover:bg-opacity-100 rounded-lg text-white font-medium transition-all shadow-lg text-sm md:text-base"
              title="Thay đổi hiển thị ảnh bìa"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">
                {user.useCoverImage === true ? "Màu theme" : "Ảnh cover"}
              </span>
            </button>
          </div>
        )}

        {/* Customization Button */}
        <div className="absolute top-3 right-3 md:top-4 md:right-4 z-10">
          <button
            onClick={() => setShowCustomization(true)}
            className="flex items-center gap-1 md:gap-2 px-2 py-1.5 md:px-4 md:py-2 bg-black bg-opacity-90 hover:bg-opacity-100 rounded-lg text-white font-medium transition-all shadow-lg text-sm md:text-base"
          >
            <CustomIcons.Settings />
            <span className="hidden sm:inline">Tùy chỉnh</span>
          </button>
        </div>
      </div>

 {/* Profile Info */}
<div className="relative -mt-8 md:-mt-20 px-4 md:px-6 pb-6">
  <div className="max-w-4xl mx-auto">
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
      <div className="pt-16 md:pt-12 p-4 md:p-6 profile-info">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-4 md:gap-6">
                {/* Avatar */}
                <div className="relative -mt-6 md:-mt-20 z-10 flex-shrink-0">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white shadow-lg overflow-hidden">
                    {form.avatarUrl ? (
                      <img
                        src={form.avatarUrl}
                        alt="avatar"
                        className="w-full h-full object-cover"
                        onError={e => {
                          e.target.onerror = null;
                          e.target.src =
                            "https://ui-avatars.com/api/?name=" +
                            encodeURIComponent(form.name) +
                            "&background=cccccc&color=222222&size=128";
                        }}
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-4xl font-bold text-white"
                        style={{ backgroundColor: themeColors.primary }}
                      >
                        {form.name ? form.name.trim()[0].toUpperCase() : "?"}
                      </div>
                    )}
                  </div>

                  {/* Edit Avatar Button */}
                  {editing && (
                    <label className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                      <Edit3 className="w-4 h-4 text-gray-600" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setAvatarUploading(true);
                          try {
                            const { url } = await uploadImage(file);
                            setForm(f => ({ ...f, avatarUrl: url }));
                          } catch (err) {
                            alert("Upload thất bại: " + err.message);
                          } finally {
                            setAvatarUploading(false);
                          }
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                        <UserName user={form} />
                      </h1>
                      {form.bio ? (
                        <p className="text-gray-600 dark:text-gray-300 mb-3 text-sm md:text-base">{form.bio}</p>
                      ) : (
                        <p className="text-gray-400 mb-3 italic text-sm md:text-base">Chưa có tiểu sử</p>
                      )}

                      {/* Contact Info */}
                      <div className="mt-3">
                        {(() => {
                          const hasContactInfo = (
                            (user.showEmail !== false && form.email) ||
                            (user.showPhone !== false && form.phone) ||
                            (user.showLocation !== false && form.location) ||
                            (user.showWebsite !== false && form.website) ||
                            (user.showBirthday !== false && form.birthday) ||
                            (user.showHobbies !== false && form.hobbies)
                          );
                          
                          if (!hasContactInfo) {
                            return (
                              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                                <p className="text-gray-500 dark:text-gray-300 text-sm">Chưa có thông tin liên hệ</p>
                                <p className="text-gray-400 dark:text-gray-300/70 text-xs mt-1">Nhấn "Chỉnh sửa" để thêm thông tin cá nhân</p>
                              </div>
                            );
                          }
                          
                          return (
                            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-2">
                              {user.showEmail !== false && form.email && (
                                <div className="flex items-center min-w-0 gap-2 text-gray-600 py-0.5">
                                  <Mail className="w-4 h-4 flex-shrink-0 text-gray-500" />
                                  <span className="text-sm truncate">{form.email}</span>
                                </div>
                              )}
                              {user.showPhone !== false && form.phone && (
                                <div className="flex items-center min-w-0 gap-2 text-gray-600 py-0.5">
                                  <Phone className="w-4 h-4 flex-shrink-0 text-gray-500" />
                                  <span className="text-sm truncate">{form.phone}</span>
                                </div>
                              )}
                              {user.showLocation !== false && form.location && (
                                <div className="flex items-center min-w-0 gap-2 text-gray-600 py-0.5">
                                  <MapPin className="w-4 h-4 flex-shrink-0 text-gray-500" />
                                  <span className="text-sm truncate">{form.location}</span>
                                </div>
                              )}
                              {user.showWebsite !== false && form.website && (
                                <div className="flex items-center min-w-0 gap-2 text-gray-600 py-0.5">
                                  <Globe className="w-4 h-4 flex-shrink-0 text-gray-500" />
                                  <a
                                    href={form.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:underline truncate leading-tight block"
                                  >
                                    {form.website}
                                  </a>
                                </div>
                              )}
                              {user.showBirthday !== false && form.birthday && (
                                <div className="flex items-center min-w-0 gap-2 text-gray-600 py-0.5">
                                  <Calendar className="w-4 h-4 flex-shrink-0 text-gray-500" />
                                  <span className="text-sm truncate">{form.birthday}</span>
                                </div>
                              )}
                              {user.showHobbies !== false && form.hobbies && (
                                <div className="flex items-center min-w-0 gap-2 text-gray-600 py-0.5">
                                  <Heart className="w-4 h-4 flex-shrink-0 text-gray-500" />
                                  <span className="text-sm truncate">{form.hobbies}</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => setShowCustomization(true)}
                        className="px-3 py-2 bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-lg transition-colors flex items-center gap-2 text-sm"
                      >
                        <Settings className="w-4 h-4" />
                        <span className="hidden sm:inline">Tùy chỉnh</span>
                      </button>
                      <button
                        onClick={() => setEditing(!editing)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm"
                      >
                        <CustomIcons.Edit3 />
                        <span className="hidden sm:inline">{editing ? "Hủy" : "Chỉnh sửa"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Edit Form */}
            {editing && (
              <div className="border-t border-gray-200 p-6">
                <form
                  className="space-y-4"
                  onSubmit={async e => {
                    e.preventDefault();
                    try {
                      // Pre-process website field
                      if (form.website && form.website !== "" && !form.website.startsWith('http://') && !form.website.startsWith('https://')) {
                        form.website = `https://${form.website}`;
                      }

                      const updateData = Object.fromEntries(
                        Object.entries(form).filter(([key, value]) => {
                          // Always include name and email
                          if (key === "name" || key === "email") return true;

                          // Include avatarUrl and coverUrl if not empty
                          if ((key === "avatarUrl" || key === "coverUrl") && value !== "") return true;

                          // Password validation
                          if (key === "password") {
                            if (value === "") return false;
                            const hasMinLength = value.length >= 8;
                            const hasLower = /[a-z]/.test(value);
                            const hasUpper = /[A-Z]/.test(value);
                            const hasDigit = /\d/.test(value);
                            const hasSpecial = /[@$!%*?&]/.test(value);

                            if (!hasMinLength || !hasLower || !hasUpper || !hasDigit || !hasSpecial) {
                              alert("Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt (@$!%*?&)");
                              return false;
                            }
                            return true;
                          }

                          // Birthday validation
                          if (key === "birthday") {
                            if (value === "") return false;
                            if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
                            const year = parseInt(value.split('-')[0]);
                            if (year < 1900 || year > 2024) {
                              alert("Năm sinh phải từ 1900 đến 2024");
                              return false;
                            }
                            return true;
                          }

                          // Website validation
                          if (key === "website") {
                            if (value === "") return false;
                            return true; // Already processed above
                          }

                          // Phone validation
                          if (key === "phone") {
                            if (value === "") return false;
                            // Basic phone validation
                            const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,15}$/;
                            if (!phoneRegex.test(value)) {
                              alert("Số điện thoại không hợp lệ");
                              return false;
                            }
                            return true;
                          }

                          // Include other fields if not empty
                          return value !== "";
                        })
                      );


                      const response = await api("/api/auth/update-profile", {
                        method: "PUT",
                        body: updateData
                      });


                      // Cập nhật user state với dữ liệu mới
                      if (response.user) {
                        setUser(response.user);

                        // Cập nhật form state với dữ liệu mới
                        const newFormData = {
                          name: response.user.name || "",
                          email: response.user.email || "",
                          birthday: response.user.birthday || "",
                          gender: response.user.gender || "",
                          hobbies: response.user.hobbies || "",
                          bio: response.user.bio || "",
                          avatarUrl: response.user.avatarUrl || "",
                          coverUrl: response.user.coverUrl || "",
                          password: "", // Reset password field
                          location: response.user.location || "",
                          website: response.user.website || "",
                          phone: response.user.phone || ""
                        };

                        setForm(newFormData);
                      }

                      alert("Cập nhật thành công!");
                      setEditing(false);
                    } catch (err) {
                      alert("Lỗi: " + (err.response?.data?.message || err.message || err));
                    }
                  }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tên</label>
                      <input
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
                      <input
                        type="password"
                        value={form.password}
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        placeholder="Để trống nếu không đổi"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ngày sinh</label>
                      <input
                        type="date"
                        value={form.birthday}
                        onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Giới tính</label>
                      <select
                        value={form.gender}
                        onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Chọn</option>
                        <option value="male">Nam</option>
                        <option value="female">Nữ</option>
                        <option value="other">Khác</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sở thích</label>
                      <input
                        value={form.hobbies}
                        onChange={e => setForm(f => ({ ...f, hobbies: e.target.value }))}
                        placeholder="VD: Đọc sách, Du lịch..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                      <input
                        value={form.location || ""}
                        onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                        placeholder="Thành phố, Quốc gia"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                      <input
                        value={form.website || ""}
                        onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                        placeholder="https://example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                      <input
                        value={form.phone || ""}
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="+84 123 456 789"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tiểu sử</label>
                      <textarea
                        value={form.bio || ""}
                        onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                        placeholder="Hãy kể về bản thân..."
                        rows={3}
                        maxLength={500}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                      <div className="text-right text-sm text-gray-500 mt-1">
                        {(form.bio || "").length}/500
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      Lưu thay đổi
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(false);
                        load();
                      }}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Hủy
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Role Badge - only show if not 'user' */}
            {user.role && user.role !== "user" && (
              <div className="px-6 pb-4">
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                  Vai trò: {user.role}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="max-w-4xl mx-auto px-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-1 md:space-x-8 px-2 md:px-6 overflow-x-auto scrollbar-hide">
              {[
                ...(user.showPosts === false ? [] : [{ id: "posts", label: "Bài đăng", icon: CustomIcons.FileText, count: posts.filter(post => post.status === 'published').length }]),
                { id: "friends", label: "Bạn bè", icon: CustomIcons.Users, count: friends.length },
                { id: "analytics", label: "Phân tích", icon: CustomIcons.BarChart3, count: analytics?.totalPosts || 0 }
              ].map(({ id, label, icon: Icon, count }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`${activeTab === id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-3 md:py-4 px-3 md:px-1 border-b-2 font-medium text-sm flex items-center gap-1 md:gap-2 transition-colors min-w-fit flex-shrink-0`}
                >
                  <Icon className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="text-xs md:text-sm">{label}</span>
                  {count > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="min-h-[600px] p-4 md:p-6">
            {/* Posts Tab */}
            {activeTab === 'posts' && (
              <div>
                {/* Post Creator */}
                {user.showPosts === false ? null : (
                  <div className="mb-6">
                    <PostCreator user={user} />
                  </div>
                )}

                {/* Posts List */}
                {user.showPosts === false ? (
                  <div className="text-center py-16 text-gray-500">Bài đăng của bạn đang ở chế độ riêng tư</div>
                ) : postsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="bg-gray-50 rounded-lg p-4">
                        <div className="animate-pulse">
                          <div className="flex items-center space-x-3 mb-4">
                            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-gray-200 rounded w-32"></div>
                              <div className="h-3 bg-gray-200 rounded w-20"></div>
                            </div>
                          </div>
                          <div className="space-y-2 mb-4">
                            <div className="h-4 bg-gray-200 rounded"></div>
                            <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                            <div className="h-4 bg-gray-200 rounded w-3/5"></div>
                          </div>
                          <div className="h-64 bg-gray-200 rounded-lg"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : postsError ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-red-400 text-2xl">⚠️</span>
                    </div>
                    <h3 className="text-lg font-medium text-red-900 mb-2">Có lỗi xảy ra</h3>
                    <p className="text-red-600 mb-4">{postsError}</p>
                    <button
                      onClick={loadPosts}
                      className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      Thử lại
                    </button>
                  </div>
                ) : posts.length > 0 ? (
                  <div className="space-y-6">
                    {posts.map((post) => (
                      <div
                        key={post._id}
                        className="bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors overflow-hidden"
                      >
                        <PostCard post={post} user={user} onUpdate={loadPosts} hidePublicIcon={true} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-gray-400 text-2xl"></span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có bài đăng nào</h3>
                    <p className="text-gray-500">Hãy tạo bài đăng đầu tiên của bạn!</p>
                  </div>
                )}
              </div>
            )}

            {/* Friends Tab */}
            {activeTab === 'friends' && (
              <div>
                {/* Friends Header */}
                <div className="mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Bạn bè</h3>
                    <p className="text-sm text-gray-500">
                      {friends.length} người bạn
                      {friends.length > 0 && (
                        <span className="ml-2 text-green-600">
                          ({friends.filter(f => f.isOnline).length} đang hoạt động)
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Friends List */}
                {friendsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="bg-gray-50 rounded-lg p-4">
                        <div className="animate-pulse">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-gray-200 rounded w-32"></div>
                              <div className="h-3 bg-gray-200 rounded w-20"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : friendsError ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-red-400 text-2xl">⚠️</span>
                    </div>
                    <h3 className="text-lg font-medium text-red-900 mb-2">Có lỗi xảy ra</h3>
                    <p className="text-red-600 mb-4">{friendsError}</p>
                    <button
                      onClick={loadFriends}
                      className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      Thử lại
                    </button>
                  </div>
                ) : friends.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {friends.map((friend, index) => (
                      <div key={friend._id || index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center space-x-3">
                          {/* Avatar */}
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                              {friend.avatarUrl ? (
                                <img
                                  src={friend.avatarUrl}
                                  alt={friend.name || 'Avatar'}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div
                                className={`w-full h-full flex items-center justify-center text-gray-600 font-medium text-lg ${friend.avatarUrl ? 'hidden' : 'flex'
                                  }`}
                              >
                                {friend.name ? friend.name.charAt(0).toUpperCase() : '?'}
                              </div>
                            </div>
                            {/* Online Status Indicator */}
                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${friend.isOnline ? 'bg-green-500' : 'bg-gray-400'
                              }`}></div>
                          </div>

                          {/* Friend Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 truncate">
                              {friend.name || 'Người dùng'}
                            </h4>
                            <div className="mt-1">
                              <span className="text-xs text-gray-500">
                                {friend.isOnline ? 'Đang hoạt động' :
                                  friend.lastSeen ?
                                    `Hoạt động ${new Date(friend.lastSeen).toLocaleDateString('vi-VN')}` :
                                    'Offline'}
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-col space-y-2">
                            <button
                              onClick={() => handleViewProfile(friend._id)}
                              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Xem profile"
                            >
                              <CustomIcons.Users />
                            </button>
                            <button
                              onClick={() => handleStartChat(friend._id, friend.name)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Nhắn tin"
                            >
                              <CustomIcons.MessageCircle />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                      <CustomIcons.Users className="w-8 h-8 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có bạn bè</h3>
                    <p className="text-gray-500 mb-6">Kết bạn để kết nối và chia sẻ với mọi người!</p>
                    <div className="space-y-3">
                      <button className="w-full md:w-auto px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors" onClick={() => { window.location.href = '/friends?tab=suggestions&source=fof'; }}>
                        Mời bạn bè
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div>
                {/* Analytics Header */}
                <div className="mb-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Phân tích bài viết</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Thống kê lượt xem và hiệu suất bài viết của bạn
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={analyticsPeriod}
                        onChange={(e) => {
                          setAnalyticsPeriod(e.target.value);
                        }}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                      >
                        <option value="7d">7 ngày qua</option>
                        <option value="30d">30 ngày qua</option>
                        <option value="90d">90 ngày qua</option>
                        <option value="1y">1 năm qua</option>
                      </select>
                      <button
                        onClick={loadAnalytics}
                        className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
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
                      <div key={i} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                        <div className="animate-pulse">
                          <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-1/3 mb-4"></div>
                          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
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
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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
                          <EyeIcon className="w-8 h-8 text-blue-200" />
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
                            <p className="text-purple-100 text-sm">Trung bình lượt xem</p>
                            <p className="text-2xl font-bold">{analytics.avgViewsPerPost.toLocaleString()}</p>
                          </div>
                          <TrendingUp className="w-8 h-8 text-purple-200" />
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-orange-100 text-sm">Bài đã công khai</p>
                            <p className="text-2xl font-bold">{analytics.publishedPosts}</p>
                          </div>
                          <Globe className="w-8 h-8 text-orange-200" />
                        </div>
                      </div>
                    </div>

                    {/* Top Posts */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Top bài viết có lượt xem cao nhất
                      </h4>
                      {analytics.topPosts.length > 0 ? (
                        <div className="space-y-3">
                          {analytics.topPosts.map((post, index) => (
                            <div key={post._id} className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold text-sm flex-shrink-0">
                                  {index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {post.title}
                                  </h5>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {new Date(post.createdAt).toLocaleDateString('vi-VN')} • 
                                    <span className={`ml-1 ${post.status === 'published' ? 'text-green-600' : 'text-orange-600'}`}>
                                      {post.status === 'published' ? 'Công khai' : 'Riêng tư'}
                                    </span>
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 flex-shrink-0 ml-3">
                                <EyeIcon className="w-4 h-4" />
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
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Bài viết gần đây ({analytics.period === '7d' ? '7 ngày' : analytics.period === '30d' ? '30 ngày' : analytics.period === '90d' ? '90 ngày' : '1 năm'})
                      </h4>
                      {analytics.recentPosts.length > 0 ? (
                        <div className="space-y-3">
                          {analytics.recentPosts.map((post) => (
                            <div key={post._id} className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <div className="flex-1 min-w-0">
                                <h5 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                  {post.title}
                                </h5>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {new Date(post.createdAt).toLocaleDateString('vi-VN')} • 
                                  <span className={`ml-1 ${post.status === 'published' ? 'text-green-600' : 'text-orange-600'}`}>
                                    {post.status === 'published' ? 'Công khai' : 'Riêng tư'}
                                  </span>
                                </p>
                              </div>
                              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 flex-shrink-0 ml-3">
                                <EyeIcon className="w-4 h-4" />
                                <span className="font-semibold">{post.views.toLocaleString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p>Không có bài viết nào trong khoảng thời gian này</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <BarChart3 className="w-8 h-8 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Chưa có dữ liệu phân tích</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">Tạo bài viết để bắt đầu theo dõi thống kê!</p>
                    <button
                      onClick={() => setActiveTab('posts')}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Tạo bài viết
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Profile Customization Modal */}
      {showCustomization && (
        <ProfileCustomization
          user={user}
          onUpdate={() => {
            load();
            setShowCustomization(false);
          }}
          onClose={() => setShowCustomization(false)}
        />
      )}
    </div>
  );
}
