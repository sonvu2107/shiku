// Import các dependencies cần thiết
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { api } from "../api";
import { removeAuthToken } from "../utils/auth";
import { invalidateUserCache } from "../utils/userCache.js";

// Import các components
import Logo from "./Logo";
import NotificationBell from "./NotificationBell";
import ChatDropdown from "./ChatDropdown";
import ChatPopup from "./ChatPopup";
import { ChatPopupWithCallModal } from "./ChatPopup";
import ChatPopupManager from "./ChatPopupManager";
import MobileMenu from "./MobileMenu";
import UserName from "./UserName";
import { useChat } from "../contexts/ChatContext";

// Import icons từ Lucide React
import {
  Crown,        // Icon admin
  User,         // Icon user
  LogOut,       // Icon đăng xuất
  LogIn,        // Icon đăng nhập
  UserPlus,     // Icon đăng ký
  Search,       // Icon tìm kiếm
  X,            // Icon đóng
  Users,        // Icon bạn bè
  MessageCircle, // Icon tin nhắn/support
  Bell,         // Icon thông báo
  UserCheck,    // Icon groups
  Home,         // Icon trang chủ
  Compass,      // Icon khám phá
  Calendar,     // Icon sự kiện
  Image,        // Icon kho media
  Moon,
  Sun,
  Settings      // Icon cài đặt thú cưng
} from "lucide-react";

/**
 * Navbar - Component thanh điều hướng chính của ứng dụng
 * Bao gồm logo, search, navigation links, user menu, chat popups
 * @param {Object} user - Thông tin user hiện tại (null nếu chưa đăng nhập)
 * @param {Function} setUser - Function để cập nhật user state
 */
export default function Navbar({ user, setUser, darkMode, setDarkMode }) {
  // ==================== STATE MANAGEMENT ====================
  const { openPopups, addChatPopup, closeChatPopup } = useChat();
  const navigate = useNavigate();
  const location = useLocation();

  // Search states
  const [searchQuery, setSearchQuery] = useState(""); // Query tìm kiếm
  const [showMobileSearch, setShowMobileSearch] = useState(false); // Hiện search mobile
  const [searchResults, setSearchResults] = useState([]); // Kết quả search users
  const [searchLoading, setSearchLoading] = useState(false); // Loading state
  const [searchPosts, setSearchPosts] = useState([]); // Kết quả search posts
  const [searchFocused, setSearchFocused] = useState(false); // Focus input desktop
  const [historyEditing, setHistoryEditing] = useState(false); // Chỉnh sửa lịch sử
  const [searchHistory, setSearchHistory] = useState([]); // Lịch sử tìm kiếm

  // UI states
  const [pendingRequests, setPendingRequests] = useState(0); // Số lời mời kết bạn
  const [showProfileMenu, setShowProfileMenu] = useState(false); // Menu profile dropdown

  // ==================== EFFECTS ====================

  /**
   * Load số lượng friend requests đang chờ khi user đăng nhập
   */
  useEffect(() => {
    if (user) {
      loadPendingRequests();
    }
  }, [user]);

  // Load search history từ localStorage và server (nếu có) + đồng bộ đa tab
  useEffect(() => {
    let localItems = [];
    try {
      const raw = localStorage.getItem('searchHistory');
      const parsed = JSON.parse(raw || '[]');
      localItems = Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      localItems = [];
    }
    setSearchHistory(localItems);

    (async () => {
      try {
        const res = await api('/api/search/history');
        const serverItems = Array.isArray(res.items) ? res.items : [];
        if (serverItems.length > 0) {
          // Merge server + local theo query (ưu tiên server)
          const map = new Map();
          for (const it of localItems) {
            if (it && it.query) map.set(it.query.toLowerCase(), it);
          }
          for (const it of serverItems) {
            if (it && it.query) map.set(it.query.toLowerCase(), it);
          }
          const merged = Array.from(map.values()).sort((a, b) => (b.count || 0) - (a.count || 0) || (b.lastSearchedAt || 0) - (a.lastSearchedAt || 0));
          setSearchHistory(merged);
          try { localStorage.setItem('searchHistory', JSON.stringify(merged)); } catch (_) { }
        }
      } catch (_) {
        // ignore if API not available or unauthorized
      }
    })();

    // Sync giữa các tab
    const onStorage = (e) => {
      if (e.key === 'searchHistory') {
        try {
          const next = JSON.parse(e.newValue || '[]');
          if (Array.isArray(next)) setSearchHistory(next);
        } catch (_) { }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  /**
   * Lấy số lượng friend requests đang chờ phê duyệt
   */
  async function loadPendingRequests() {
    try {
      const data = await api("/api/friends/requests");
      setPendingRequests(data.requests?.length || 0);
    } catch (error) {
      // Silent handling for pending requests loading error
    }
  }

  // ==================== HELPER FUNCTIONS ====================

  /**
   * Lấy thông tin preview media của bài viết (ưu tiên coverUrl → ảnh đầu tiên → video đầu tiên)
   * @param {Object} post - Dữ liệu bài viết
   * @returns {Object} Object chứa url và type của media preview
   */
  function getPostPreviewMedia(post) {
    if (post.coverUrl) {
      // Tìm type của coverUrl trong files
      const found = Array.isArray(post.files)
        ? post.files.find(f => f.url === post.coverUrl)
        : null;
      return { url: post.coverUrl, type: found ? found.type : "image" };
    }
    // Fallback về files nếu có
    if (Array.isArray(post.files) && post.files.length > 0) {
      // Tìm file ảnh đầu tiên
      const imageFile = post.files.find(f => f.type === 'image');
      if (imageFile) {
        return imageFile;
      }
      // Nếu không có ảnh, tìm video đầu tiên
      const videoFile = post.files.find(f => f.type === 'video');
      if (videoFile) {
        return videoFile;
      }
      // Fallback về file đầu tiên (bất kể loại)
      return post.files[0];
    }
    // Fallback cuối cùng: dùng logo/mark sẵn có để tránh ảnh bị vỡ
    return { url: '/assets/posts.png', type: 'image' };
  }

  /**
   * Render preview media component cho search results
   * @param {Object} post - Dữ liệu bài viết
   * @param {string} className - CSS classes
   * @returns {JSX.Element} Media preview component
   */
  function renderPostPreview(post, className = "w-8 h-8 rounded object-cover") {
    const media = getPostPreviewMedia(post);

    if (media.type === 'video') {
      return (
        <video
          src={media.url}
          className={className}
          muted
          preload="metadata"
          onLoadedMetadata={(e) => {
            // Tự động pause video ở frame đầu tiên để hiển thị thumbnail
            e.target.currentTime = 0.1;
            e.target.pause();
          }}
        />
      );
    } else {
      return (
        <img
          src={media.url}
          alt={post.title}
          className={className}
          onError={(e) => {
            // Fallback khi ảnh lỗi hoặc bài viết không có ảnh
            e.currentTarget.onerror = null;
            e.currentTarget.src = '/assets/shiku-mark.svg';
          }}
        />
      );
    }
  }

  function saveHistoryLocal(next) {
    setSearchHistory(next);
    try { localStorage.setItem('searchHistory', JSON.stringify(next)); } catch (_) { }
    // Notify other tabs immediately
    try {
      localStorage.setItem('searchHistory__lastUpdate', String(Date.now()));
      localStorage.removeItem('searchHistory__lastUpdate');
    } catch (_) { }
  }

  async function syncHistory(action, payload) {
    try {
      if (action === 'add') {
        await api('/api/search/history', {
      method: "POST",
      body: payload
    });
      } else if (action === 'delete') {
        await api(`/api/search/history/${payload.id}`, {
      method: "DELETE"
    });
      } else if (action === 'clear') {
        await api('/api/search/history', {
      method: "DELETE"
    });
      }
    } catch (_) {
      // optional sync
    }
  }

  function addToSearchHistory(query) {
    const trimmed = (query || '').trim();
    if (!trimmed) return;
    const now = Date.now();
    const existing = searchHistory.find(h => h.query.toLowerCase() === trimmed.toLowerCase());
    let next;
    if (existing) {
      next = searchHistory
        .map(h => h.query.toLowerCase() === trimmed.toLowerCase() ? { ...h, count: (h.count || 0) + 1, lastSearchedAt: now } : h)
        .sort((a, b) => (b.count || 0) - (a.count || 0) || (b.lastSearchedAt || 0) - (a.lastSearchedAt || 0));
    } else {
      const item = { id: Math.random().toString(36).slice(2), query: trimmed, count: 1, lastSearchedAt: now };
      next = [item, ...searchHistory].slice(0, 20);
      syncHistory('add', item);
    }
    saveHistoryLocal(next);
  }

  function deleteHistoryItem(id) {
    const next = searchHistory.filter(h => h.id !== id);
    saveHistoryLocal(next);
    syncHistory('delete', { id });
  }

  function clearHistory() {
    saveHistoryLocal([]);
    syncHistory('clear');
  }

  // ==================== HANDLERS ====================

  /**
   * Xử lý tìm kiếm users và posts
   * @param {Event} e - Form submit event
   */
  async function handleSearch(e) {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();

    if (trimmedQuery && trimmedQuery.length <= 100) {
      setSearchLoading(true);
      try {
        // Tìm users
        const userRes = await api(`/api/users/search?q=${encodeURIComponent(trimmedQuery)}`);
        setSearchResults(userRes.users || []);

        // Tìm bài viết
        const postRes = await api(`/api/posts?q=${encodeURIComponent(trimmedQuery)}`);
        setSearchPosts(postRes.items || []);

        // Lưu lịch sử
        addToSearchHistory(trimmedQuery);
      } catch (err) {
        setSearchResults([]);
        setSearchPosts([]);
      } finally {
        setSearchLoading(false);
      }
    } else {
      // Reset kết quả nếu query không hợp lệ
      setSearchResults([]);
      setSearchPosts([]);
    }
  }

  /**
   * Xử lý đăng xuất user
   */
  async function logout() {
    try {
      // Gọi API logout để invalidate session trên server
      await api("/api/auth/logout", {
      method: "POST",
      body: {}
    });
    } catch (err) {
      // Silent handling for logout error
    }

    // Xóa token khỏi localStorage
    removeAuthToken();
    // Clear user cache
    invalidateUserCache();
    // Reset user state
    if (setUser) setUser(null);
    // Redirect về trang chủ
    navigate("/");
  }

  // ==================== RENDER ====================

  // Helper component cho navigation icons
  const NavIcon = ({ icon: Icon, active, to, title, badge = null, variant = 'center' }) => {
    const variantStyles = {
      center: { padding: 'p-3', size: 24, base: 'rounded-xl' },
      right: { padding: 'p-2.5', size: 22, base: 'rounded-full' },
      subtle: { padding: 'p-2', size: 18, base: 'rounded-full' }
    };
    const v = variantStyles[variant] || variantStyles.center;

    return (
      <Link
        to={to}
        title={title}
        className={`${v.padding} ${v.base} transition-all duration-200 relative ${
          active
            ? "bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-blue-400 shadow-md dark:shadow-[inset_0_0_4px_rgba(255,255,255,0.1)]"
            : "text-gray-600 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-gray-100"
        }`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <Icon size={v.size} />
        {badge && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    // Main navbar container - compact & modern
    <div className="fixed top-0 left-0 w-full z-50 bg-white/70 dark:bg-black/70 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 shadow-sm transition-colors">

      <div className="flex items-center justify-between px-6 h-[64px]">
        {/* LEFT ZONE: Logo + Search */}
        <div className="flex items-center gap-2 flex-1 translate-y-[1px]">

          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
            <span onClick={() => { navigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <Logo size="small" className="translate-y-[1px]" />
            </span>
          </Link>

          {/* Search bar - compact design */}
          <form onSubmit={handleSearch} className="relative hidden md:flex items-center ml-3">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm trên Shiku..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                maxLength={100}
                className="pl-10 pr-4 py-2.5 w-72 text-sm rounded-full border-0 bg-gray-100 dark:bg-[#3A3B3C] text-gray-900 dark:text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
                autoComplete="off"
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => {
                  if (!historyEditing) {
                    setSearchFocused(false);
                  }
                }, 200)}
              />
              {/* Dropdown kết quả tìm kiếm - compact */}
              {(searchFocused || searchQuery.trim() || historyEditing) && (
                (searchResults.length > 0 || searchPosts.length > 0 || searchHistory.length > 0) && (
                  <div className="absolute left-0 top-full mt-1 w-80 sm:w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                    {/* Lịch sử tìm kiếm / Gợi ý */}
                    {(!searchQuery.trim() || (searchQuery.trim() && searchResults.length === 0 && searchPosts.length === 0)) && searchHistory.length > 0 && (
                      <React.Fragment key="search-history">
                        <div className="flex items-center justify-between px-3 py-2 text-xs text-gray-500 bg-gray-50 dark:bg-gray-700">
                          <span>Gần đây</span>
                          <button 
                            type="button" 
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (historyEditing) {
                                // Khi click "Xong" - tắt dropdown và reset focus
                                setHistoryEditing(false);
                                setSearchFocused(false);
                                setSearchQuery('');
                              } else {
                                // Khi click "Chỉnh sửa" - chỉ enable editing mode
                                setHistoryEditing(true);
                              }
                            }} 
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {historyEditing ? 'Xong' : 'Chỉnh sửa'}
                          </button>
                        </div>
                        {searchHistory
                          .filter(h => !searchQuery.trim() || h.query.toLowerCase().includes(searchQuery.toLowerCase()))
                          .slice(0, 10)
                          .map(item => (
                            <div key={item.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer group border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                              onMouseDown={() => { setSearchQuery(item.query); setTimeout(() => { (async () => { await handleSearch(new Event('submit')); })(); }, 0); }}>
                              <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 flex items-center justify-center text-xs">•</div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{item.query}</div>
                                <div className="text-xs text-gray-500">{new Date(item.lastSearchedAt).toLocaleDateString('vi-VN')}</div>
                              </div>
                              {historyEditing && (
                                <button type="button" onMouseDown={(e) => { e.stopPropagation(); deleteHistoryItem(item.id); }} className="text-gray-400 hover:text-red-600">✕</button>
                              )}
                            </div>
                          ))}
                        {historyEditing && (
                          <div className="px-3 py-2">
                            <button type="button" onMouseDown={(e) => { e.stopPropagation(); clearHistory(); }} className="text-red-600 text-xs hover:underline">Xóa tất cả lịch sử</button>
                          </div>
                        )}
                        <div className="h-px bg-gray-100 dark:bg-gray-700" />
                      </React.Fragment>
                    )}
                    {/* Kết quả user */}
                    {searchResults.length > 0 && (
                      <React.Fragment key="search-fragment">
                        <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 dark:bg-gray-700">Người dùng</div>
                        {searchResults.map(user => (
                          <div
                            key={user._id}
                            className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                            onClick={() => navigate(`/user/${user._id}`)}
                          >
                            <img
                              src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&length=2&background=cccccc&color=222222`}
                              alt={user.name}
                              className="w-7 h-7 rounded-full"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                                <UserName user={user} maxLength={20} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </React.Fragment>
                    )}
                    {/* Kết quả bài viết: chỉ hiện nếu không có user nào khớp */}
                    {searchResults.length === 0 && searchPosts.length > 0 && (
                      <React.Fragment key="search-fragment">
                        <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 dark:bg-gray-700">Bài viết</div>
                        {searchPosts.map(post => (
                          <div
                            key={post._id}
                            className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                            onClick={() => navigate(`/post/${post.slug || post._id}`)}
                          >
                            {renderPostPreview(post, "w-7 h-7 rounded object-cover")}
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">{post.title}</div>
                              <div className="text-xs text-gray-500">{post.author?.name || ''}</div>
                            </div>
                          </div>
                        ))}
                      </React.Fragment>
                    )}
                    {searchLoading && (
                      <div className="px-3 py-3 text-gray-500 text-sm text-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mx-auto mb-1"></div>
                        Đang tìm kiếm...
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </form>
        </div>

        {/* RIGHT ZONE: Actions - Compact spacing */}
  <div className="flex items-center justify-end flex-1 gap-2">
          {/* Dark mode toggle - Compact design */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="hidden md:inline-flex p-2 rounded-full transition-all duration-200 text-gray-600 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-gray-100"
            aria-label={darkMode ? "Tắt dark mode" : "Bật dark mode"}
            title={darkMode ? "Tắt dark mode" : "Bật dark mode"}
          >
            {darkMode ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          
          {/* Friends Icon with badge - Desktop only */}
          <div className="hidden md:flex items-center">
            {user && (
              <NavIcon
                icon={Users}
                active={location.pathname === "/friends"}
                to="/friends"
                title="Bạn bè"
                badge={pendingRequests > 0 ? pendingRequests : null}
                variant="right"
              />
            )}
          </div>
          
          {/* MOBILE ACTIONS (only mobile) — order: search, darkmode, chat, bell, menu, right-aligned */}

          <div className="flex md:hidden items-center gap-[7px] ml-1 [&>button]:w-9 [&>button]:h-9 [&>button]:flex [&>button]:items-center [&>button]:justify-center">
            {/* Darkmode (mobile) */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="rounded-full transition-all duration-200 text-gray-600 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-gray-100"
              aria-label={darkMode ? "Tắt dark mode" : "Bật dark mode"}
              title={darkMode ? "Tắt dark mode" : "Bật dark mode"}
            >
              {darkMode ? <Moon size={21} /> : <Sun size={21} />}
            </button>

            {/* Search (mobile) */}
            <button
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              className="p-2 rounded-full transition-all duration-200 text-gray-600 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-gray-100"
              title="Tìm kiếm"
              aria-label="Tìm kiếm"
            >
              <Search size={18} />
            </button>

            {/* Chat */}
            {user && (
              <button
                onClick={() => navigate('/chat')}
                className="rounded-full transition-all duration-200 text-gray-600 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-gray-100"
                title="Chat"
                aria-label="Chat"
              >
                <MessageCircle size={19} />
              </button>
            )}

            {/* Thông báo */}
            {user && (
              <button
                onClick={() => navigate('/notifications')}
                className="rounded-full transition-all duration-200 text-gray-600 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-gray-100"
                title="Thông báo"
                aria-label="Thông báo"
              >
                <Bell size={20} />
              </button>
            )}

            {/* Menu */}
            <MobileMenu user={user} setUser={setUser} />
          </div>

          {/* Desktop Navigation - Hidden on mobile */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <React.Fragment key="user-desktop-nav">
                <ChatDropdown onOpenChat={(conv) => {
                  addChatPopup(conv);
                }} />
                <NotificationBell user={user} />
                <div className="relative" onKeyDown={(e) => { if (e.key === 'Escape') setShowProfileMenu(false); }}>
                  <button
                    className="flex items-center gap-2 focus:outline-none rounded-full p-2 transition-all duration-200 hover:bg-gray-200/60 dark:hover:bg-gray-700/60"
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                  >
                    <img
                      src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&length=2&background=cccccc&color=222222`}
                      alt={user.name}
                      className="w-9 h-9 rounded-full border border-gray-300 dark:border-gray-600 shadow-sm"
                    />
                  </button>
                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 py-3"
                      onMouseLeave={() => { /* optional */ }}>
                      {/* Click outside closer */}
                      <div className="fixed inset-0 -z-10" onClick={() => setShowProfileMenu(false)} />
                      <div className="px-4 pb-3 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <img
                            src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&length=2&background=cccccc&color=222222`}
                            alt={user.name}
                            className="w-12 h-12 rounded-full border border-gray-200 dark:border-gray-600"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 dark:text-gray-100 text-base truncate">
                              <UserName user={user} maxLength={18} />
                            </div>
                            <Link to={`/profile`} className="text-gray-500 dark:text-gray-400 text-sm hover:underline" onClick={() => setShowProfileMenu(false)}>Xem trang cá nhân</Link>
                          </div>
                        </div>
                      </div>
                      <div className="py-2">
                        {user.role === "admin" && (
                          <Link to="/admin" className="flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-red-600 dark:text-red-400 text-base" onClick={() => setShowProfileMenu(false)}>
                            <Crown size={18} className="mr-3" />
                            <span>Admin</span>
                          </Link>
                        )}
                        <Link to="/settings" className="flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-base" onClick={() => setShowProfileMenu(false)}>
                          <User size={18} className="mr-3" />
                          <span>Cài đặt & quyền riêng tư</span>
                        </Link>
                        <Link to="/support" className="flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-base" onClick={() => setShowProfileMenu(false)}>
                          <MessageCircle size={18} className="mr-3" />
                          <span>Trợ giúp & hỗ trợ</span>
                        </Link>
                        <button onClick={() => { setShowProfileMenu(false); logout(); }} className="flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 w-full text-left text-gray-700 dark:text-gray-300 text-base">
                          <LogOut size={18} className="mr-3" />
                          <span>Đăng xuất</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </React.Fragment>
            ) : (
              <React.Fragment key="guest-desktop-nav">
                <Link to="/login" className="btn-outline flex items-center gap-2 text-sm px-3 py-1.5">
                  <LogIn size={18} />
                  Đăng nhập
                </Link>
                <Link to="/register" className="btn flex items-center gap-2 text-sm px-3 py-1.5">
                  <UserPlus size={18} />
                  Đăng ký
                </Link>
              </React.Fragment>
            )}
          </div>
        </div>
        {/* Popup chat Messenger */}
        <ChatPopupManager 
          conversations={openPopups}
          onCloseConversation={closeChatPopup}
        />
      </div>

      {/* Mobile search bar - Compact modern design */}
      {showMobileSearch && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Tìm kiếm trên Shiku"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-4 pr-4 py-2 w-full border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all duration-200 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                autoFocus
              />
              {/* Mobile search results dropdown - Compact */}
              {(searchQuery.trim() || searchHistory.length > 0) && (
                (searchResults.length > 0 || searchPosts.length > 0 || searchHistory.length > 0) && (
                  <div className="absolute left-0 top-full mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto">
                    {/* Lịch sử tìm kiếm / Gợi ý */}
                    {(!searchQuery.trim() || (searchQuery.trim() && searchResults.length === 0 && searchPosts.length === 0)) && searchHistory.length > 0 && (
                      <React.Fragment key="search-fragment">
                        <div className="flex items-center justify-between px-3 py-2 text-xs text-gray-500 bg-gray-50 dark:bg-gray-700 font-medium">
                          <span>Mới đây</span>
                          <button 
                            type="button" 
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (historyEditing) {
                                // Khi click "Xong" - tắt dropdown và reset
                                setHistoryEditing(false);
                                setShowMobileSearch(false);
                                setSearchQuery('');
                              } else {
                                // Khi click "Chỉnh sửa" - chỉ enable editing mode
                                setHistoryEditing(true);
                              }
                            }} 
                            className="text-blue-600 dark:text-blue-400"
                          >
                            {historyEditing ? 'Xong' : 'Chỉnh sửa'}
                          </button>
                        </div>
                        {searchHistory
                          .filter(h => !searchQuery.trim() || h.query.toLowerCase().includes(searchQuery.toLowerCase()))
                          .slice(0, 8)
                          .map(item => (
                            <div key={item.id}
                              className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                              onMouseDown={() => { setSearchQuery(item.query); setTimeout(() => { (async () => { await handleSearch(new Event('submit')); })(); }, 0); }}>
                              <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 flex items-center justify-center text-xs">•</div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{item.query}</div>
                                <div className="text-xs text-gray-500 truncate">{new Date(item.lastSearchedAt).toLocaleDateString('vi-VN')}</div>
                              </div>
                              {historyEditing && (
                                <button type="button" onMouseDown={(e) => { e.stopPropagation(); deleteHistoryItem(item.id); }} className="text-gray-400 hover:text-red-600">✕</button>
                              )}
                            </div>
                          ))}
                        {historyEditing && (
                          <div className="px-3 py-2">
                            <button type="button" onMouseDown={(e) => { e.stopPropagation(); clearHistory(); }} className="text-red-600 text-xs">Xóa tất cả</button>
                          </div>
                        )}
                        <div className="h-px bg-gray-100 dark:bg-gray-700" />
                      </React.Fragment>
                    )}
                    {/* Kết quả user */}
                    {searchResults.length > 0 && (
                      <React.Fragment key="search-fragment">
                        <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 dark:bg-gray-700 font-medium">Người dùng</div>
                        {searchResults.map(user => (
                          <div
                            key={user._id}
                            className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                            onClick={() => {
                              navigate(`/user/${user._id}`);
                              setShowMobileSearch(false);
                              setSearchQuery("");
                            }}
                          >
                            <img
                              src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&length=2&background=cccccc&color=222222`}
                              alt={user.name}
                              className="w-7 h-7 rounded-full flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                                <UserName user={user} maxLength={15} />
                              </div>
                              <div className="text-xs text-gray-500 truncate">{user.email}</div>
                            </div>
                          </div>
                        ))}
                      </React.Fragment>
                    )}
                    {/* Kết quả bài viết: chỉ hiện nếu không có user nào khớp */}
                    {searchResults.length === 0 && searchPosts.length > 0 && (
                      <React.Fragment key="search-fragment">
                        <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 dark:bg-gray-700 font-medium">Bài viết</div>
                        {searchPosts.map(post => (
                          <div
                            key={post._id}
                            className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                            onClick={() => {
                              navigate(`/post/${post.slug || post._id}`);
                              setShowMobileSearch(false);
                              setSearchQuery("");
                            }}
                          >
                            {renderPostPreview(post, "w-7 h-7 rounded flex-shrink-0 object-cover")}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{post.title}</div>
                              <div className="text-xs text-gray-500 truncate">{post.author?.name || ''}</div>
                            </div>
                          </div>
                        ))}
                      </React.Fragment>
                    )}
                    {searchLoading && (
                      <div className="px-3 py-3 text-center text-gray-500 text-sm">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mx-auto mb-1"></div>
                        Đang tìm kiếm...
                      </div>
                    )}
                    {searchQuery.trim() && searchResults.length === 0 && searchPosts.length === 0 && !searchLoading && (
                      <div className="px-3 py-3 text-center text-gray-500 text-sm">
                        Không tìm thấy kết quả nào
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowMobileSearch(false)}
              className="btn-outline p-2 text-sm"
              title="Đóng tìm kiếm"
            >
              <X size={18} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
