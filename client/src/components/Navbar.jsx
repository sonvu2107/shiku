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
  Settings,     // Icon cài đặt
  Moon,         // Icon chế độ tối
  Sun           // Icon chế độ sáng
} from "lucide-react";

/**
 * Navbar - Component thanh điều hướng chính của ứng dụng
 * Bao gồm logo, search, navigation links, user menu, chat popups
 * @param {Object} user - Thông tin user hiện tại (null nếu chưa đăng nhập)
 * @param {Function} setUser - Function để cập nhật user state
 */
export default function Navbar({ user, setUser, darkMode, setDarkMode }) {
  // ==================== STATE MANAGEMENT ====================
  const { openPopups, addChatPopup, closeChatPopup, unreadCount } = useChat();
  const navigate = useNavigate();
  const location = useLocation();

  // Search states
  const [searchQuery, setSearchQuery] = useState(""); // Query tìm kiếm
  // const [showMobileSearch, setShowMobileSearch] = useState(false); // Hiện search mobile -> Removed in favor of Search page
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

  return (
    // Main navbar container - Monochrome Luxury Style
    <div className="fixed top-0 left-0 w-full z-50 bg-white/80 dark:bg-black/80 backdrop-blur-2xl border-b border-neutral-200/50 dark:border-neutral-800/50 transition-all duration-300">
      <div className="max-w-[1920px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* LEFT ZONE: Logo & Search */}
        <div className="flex items-center gap-4 md:gap-8 flex-shrink-0">
          <Link 
            to="/" 
            className="flex items-center gap-2 hover:opacity-80 transition-opacity group"
            onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          >
            <Logo size="small" className="transition-transform group-hover:scale-105" />
          </Link>

          {/* Desktop Search */}
          <form onSubmit={handleSearch} className="relative hidden lg:block group/search">
            <div className="relative">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within/search:text-black dark:group-focus-within/search:text-white transition-colors" />
              <input
                type="text"
                placeholder="Tìm kiếm trên Shiku..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                maxLength={100}
                className="pl-11 pr-4 py-2.5 w-[280px] xl:w-[320px] text-[15px] rounded-full bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 border-none outline-none ring-1 ring-transparent focus:ring-black/10 dark:focus:ring-white/10 focus:bg-white dark:focus:bg-black transition-all shadow-sm"
                autoComplete="off"
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => {
                  if (!historyEditing) {
                    setSearchFocused(false);
                  }
                }, 200)}
              />
              
              {/* Search Dropdown */}
              {(searchFocused || searchQuery.trim() || historyEditing) && (
                (searchResults.length > 0 || searchPosts.length > 0 || searchHistory.length > 0) && (
                  <div className="absolute left-0 top-full mt-2 w-[360px] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-100 dark:border-neutral-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    {/* History Section */}
                    {(!searchQuery.trim() || (searchQuery.trim() && searchResults.length === 0 && searchPosts.length === 0)) && searchHistory.length > 0 && (
                      <div className="py-2">
                        <div className="flex items-center justify-between px-4 py-2">
                          <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Gần đây</span>
                          <button 
                            type="button" 
                            onMouseDown={(e) => {
                              e.preventDefault();
                              if (historyEditing) {
                                setHistoryEditing(false);
                                setSearchFocused(false);
                                setSearchQuery('');
                              } else {
                                setHistoryEditing(true);
                              }
                            }} 
                            className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          >
                            {historyEditing ? 'Xong' : 'Chỉnh sửa'}
                          </button>
                        </div>
                        {searchHistory
                          .filter(h => !searchQuery.trim() || h.query.toLowerCase().includes(searchQuery.toLowerCase()))
                          .slice(0, 8)
                          .map((item) => (
                            <div 
                              key={item.id} 
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer group transition-colors"
                              onMouseDown={() => { setSearchQuery(item.query); setTimeout(() => { (async () => { await handleSearch(new Event('submit')); })(); }, 0); }}
                            >
                              <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 group-hover:bg-white dark:group-hover:bg-neutral-700 group-hover:shadow-sm transition-all">
                                <Search size={14} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-neutral-900 dark:text-white text-sm truncate">{item.query}</div>
                              </div>
                              {historyEditing && (
                                <button 
                                  type="button" 
                                  onMouseDown={(e) => { e.stopPropagation(); deleteHistoryItem(item.id); }} 
                                  className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Users Results */}
                    {searchResults.length > 0 && (
                      <div className="py-2 border-t border-neutral-100 dark:border-neutral-800">
                        <div className="px-4 py-2 text-xs font-bold text-neutral-500 uppercase tracking-wider">Mọi người</div>
                        {searchResults.map(user => (
                          <div
                            key={user._id}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                            onClick={() => navigate(`/user/${user._id}`)}
                          >
                            <img
                              src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&length=2&background=000000&color=ffffff`}
                              alt={user.name}
                              className="w-9 h-9 rounded-full object-cover border border-neutral-200 dark:border-neutral-700"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-neutral-900 dark:text-white text-sm truncate">
                                <UserName user={user} maxLength={25} />
                              </div>
                              <div className="text-xs text-neutral-500 truncate">{user.email}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Posts Results */}
                    {searchResults.length === 0 && searchPosts.length > 0 && (
                      <div className="py-2 border-t border-neutral-100 dark:border-neutral-800">
                        <div className="px-4 py-2 text-xs font-bold text-neutral-500 uppercase tracking-wider">Bài viết</div>
                        {searchPosts.map(post => (
                          <div
                            key={post._id}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                            onClick={() => navigate(`/post/${post.slug || post._id}`)}
                          >
                            {renderPostPreview(post, "w-10 h-10 rounded-lg object-cover shadow-sm")}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-neutral-900 dark:text-white text-sm line-clamp-1">{post.title || post.content}</div>
                              <div className="text-xs text-neutral-500">bởi {post.author?.name}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </form>
        </div>

        {/* RIGHT ZONE: Actions */}
        <div className="flex items-center justify-end gap-2 md:gap-3 flex-shrink-0">
          
          {user ? (
            <>
              {/* Desktop Actions */}
              <div className="hidden md:flex items-center gap-1">
                {/* Dark Mode Toggle */}
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2.5 rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-black dark:hover:text-white transition-all"
                >
                  {darkMode ? <Moon size={20} /> : <Sun size={20} />}
                </button>
                {/* Friends */}
                <Link 
                  to="/friends" 
                  className={`p-2.5 rounded-full transition-all relative ${
                    location.pathname === '/friends'
                      ? "text-black dark:text-white bg-neutral-100 dark:bg-neutral-800"
                      : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-black dark:hover:text-white"
                  }`}
                  title="Bạn bè"
                >
                  <Users size={20} />
                  {pendingRequests > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-black" />
                  )}
                </Link>

                {/* Chat */}
                <ChatDropdown onOpenChat={addChatPopup} />
                
                {/* Notifications */}
                <NotificationBell user={user} />
                
                {/* Profile Menu */}
                <div className="relative ml-2" onKeyDown={(e) => { if (e.key === 'Escape') setShowProfileMenu(false); }}>
                  <button
                    className="flex items-center gap-2 rounded-full p-1 pr-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                  >
                    <img
                      src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&length=2&background=000000&color=ffffff`}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover border border-neutral-200 dark:border-neutral-700"
                    />
                    <span className="font-bold text-sm text-neutral-900 dark:text-white max-w-[100px] truncate hidden xl:block">
                      {user.name}
                    </span>
                  </button>

                  {/* Profile Dropdown */}
                  {showProfileMenu && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-100 dark:border-neutral-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="fixed inset-0 z-[-1]" onClick={() => setShowProfileMenu(false)} />
                      
                      <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50">
                        <div className="flex items-center gap-3">
                          <img
                            src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&length=2&background=000000&color=ffffff`}
                            alt={user.name}
                            className="w-12 h-12 rounded-full border-2 border-white dark:border-neutral-700 shadow-sm"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-neutral-900 dark:text-white text-base truncate">
                              <UserName user={user} maxLength={18} />
                            </div>
                            <Link to="/profile" className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline" onClick={() => setShowProfileMenu(false)}>
                              Xem trang cá nhân
                            </Link>
                          </div>
                        </div>
                      </div>

                      <div className="p-2">
                        {user.role === "admin" && (
                          <Link to="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors" onClick={() => setShowProfileMenu(false)}>
                            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                              <Crown size={16} />
                            </div>
                            <span className="font-medium">Admin Dashboard</span>
                          </Link>
                        )}
                        <Link to="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors" onClick={() => setShowProfileMenu(false)}>
                          <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500">
                            <Settings size={16} />
                          </div>
                          <span className="font-medium">Cài đặt & Quyền riêng tư</span>
                        </Link>
                        <Link to="/support" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors" onClick={() => setShowProfileMenu(false)}>
                          <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500">
                            <MessageCircle size={16} />
                          </div>
                          <span className="font-medium">Trợ giúp & Hỗ trợ</span>
                        </Link>
                        
                        <div className="h-px bg-neutral-100 dark:bg-neutral-800 my-1" />
                        
                        <button onClick={() => { setShowProfileMenu(false); logout(); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors">
                          <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <LogOut size={16} />
                          </div>
                          <span className="font-bold">Đăng xuất</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile Actions */}
              <div className="flex md:hidden items-center gap-1">
                <button
                  onClick={() => navigate('/search')}
                  className="p-2 rounded-full text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <Search size={20} />
                </button>
                
                <button
                  onClick={() => navigate('/chat')}
                  className="p-2 rounded-full text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 relative"
                >
                  <MessageCircle size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-black" />
                  )}
                </button>

                <button
                  onClick={() => navigate('/notifications')}
                  className="p-2 rounded-full text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <Bell size={20} />
                </button>

                <MobileMenu user={user} setUser={setUser} />
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              {/* Dark Mode Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2.5 rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-black dark:hover:text-white transition-all hidden md:flex"
              >
                {darkMode ? <Moon size={20} /> : <Sun size={20} />}
              </button>
              <Link to="/login" className="hidden md:flex px-5 py-2.5 rounded-full font-bold text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors">
                Đăng nhập
              </Link>
              <Link to="/register" className="px-5 py-2.5 rounded-full font-bold text-sm bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition-opacity shadow-lg shadow-black/20 dark:shadow-white/20">
                Đăng ký
              </Link>
              <div className="md:hidden">
                 <MobileMenu user={user} setUser={setUser} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
