import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import { useSavedPosts } from "../hooks/useSavedPosts";
import { usePostsFlattened } from "../hooks/usePosts";
import { useSEO } from "../utils/useSEO";
import ModernPostCard from "../components/ModernPostCard";
// import Stories from "../components/Stories"; // FEATURE FLAG: Stories disabled
import LeftSidebar from "../components/LeftSidebar";
import RightSidebar from "../components/RightSidebar";
import NotificationBell from "../components/NotificationBell";
import ChatDropdown from "../components/ChatDropdown";
import ChatPopupManager from "../components/ChatPopupManager";
import UserName from "../components/UserName";
import UserAvatar from "../components/UserAvatar";
import Navbar from "../components/Navbar";
import { ArrowUpDown, Loader2, Search, Bell, MessageCircle, Plus, X, Moon, Sun, Users, AlertCircle, ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "../contexts/ToastContext";
import { useChat } from "../contexts/ChatContext";
import BackToTop from "../components/BackToTop";
import PullToRefresh from "../components/PullToRefresh";
import PostCreator from "../components/PostCreator";

// --- VISUAL COMPONENTS ---
const NoiseOverlay = () => (
  <div className="hidden md:block fixed inset-0 z-0 pointer-events-none opacity-[0.03] mix-blend-overlay"
    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
  />
);

const GridPattern = () => {
  return (
    <>
      {/* Desktop: Full grid pattern with blur effect */}
      <div className="hidden md:block fixed inset-0 z-0 h-full w-full bg-white dark:bg-black bg-[linear-gradient(to_right,#80808005_1px,transparent_1px),linear-gradient(to_bottom,#80808005_1px,transparent_1px)] bg-[size:24px_24px]">
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-neutral-400 opacity-[0.02] blur-[120px] dark:bg-white dark:opacity-[0.015]"></div>
      </div>
      {/* Mobile: Simple solid background only - no GPU-heavy effects */}
      <div className="md:hidden fixed inset-0 z-0 h-full w-full bg-white dark:bg-black"></div>
    </>
  );
};

/**
 * Home - Trang chủ mạng xã hội với bố cục 3 cột
 * - Sidebar trái: Shortcuts (menu nhanh)
 * - Cột giữa: Stories, Posts feed với infinite scroll
 * - Sidebar phải: OnlineFriends (bạn bè online)
 */
function Home({ user, setUser }) {
  // ==================== STATE MANAGEMENT ====================

  // Dark mode state for mobile navbar - sync with localStorage
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem("app:darkMode");
      if (saved !== null) return saved === "1";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {
      return false;
    }
  });

  // Sync dark mode with document - optimized for performance
  useEffect(() => {
    // Update DOM immediately for instant visual feedback (synchronous)
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Save to localStorage asynchronously to avoid blocking main thread
    // Use setTimeout with 0 delay to defer to next event loop tick
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem('app:darkMode', darkMode ? '1' : '0');
      } catch {
        // Ignore localStorage errors
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [darkMode]);

  // Tìm kiếm và sắp xếp
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';

  // Persist sortBy to localStorage
  const [sortBy, setSortBy] = useState(() => {
    try {
      const saved = localStorage.getItem('home:sortBy');
      if (saved && ['recommended', 'hot', 'newest', 'oldest', 'mostViewed', 'leastViewed', 'mostUpvoted'].includes(saved)) {
        return saved;
      }
    } catch { }
    return 'recommended';
  });

  // Save sortBy to localStorage when changed
  useEffect(() => {
    try {
      localStorage.setItem('home:sortBy', sortBy);
    } catch { }
  }, [sortBy]);

  // React Query for posts - replaces manual state management
  const {
    posts: items,
    isLoading: loading,
    isFetchingNextPage: loadingMore,
    hasNextPage: hasMore,
    fetchNextPage,
    error: postsError,
    refetch: refetchPosts
  } = usePostsFlattened({ sortBy, searchQuery: q });

  const error = postsError?.message || null;
  const { savedMap, updateSavedState } = useSavedPosts(items, { enabled: !!user });

  // Filter dropdown state
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef(null);

  // Filter options - thay vì cycle
  const filterOptions = useMemo(() => [
    { key: 'recommended', label: 'Đề xuất' },
    { key: 'hot', label: 'Hot' },
    { key: 'newest', label: 'Mới nhất' },
    { key: 'oldest', label: 'Cũ nhất' },
    { key: 'mostUpvoted', label: 'Upvote nhiều' },
    { key: 'mostViewed', label: 'Xem nhiều' },
    { key: 'leastViewed', label: 'Xem ít' }
  ], []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target)) {
        setFilterDropdownOpen(false);
      }
    };
    if (filterDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [filterDropdownOpen]);
  const [topSearchQuery, setTopSearchQuery] = useState(q);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchPosts, setSearchPosts] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [historyEditing, setHistoryEditing] = useState(false);
  const { openPopups, addChatPopup, closeChatPopup } = useChat();
  const searchInputRef = useRef(null);
  const { showInfo } = useToast();

  // Infinite scroll
  const observer = useRef();
  const loadingRef = useRef(false);
  const navigate = useNavigate();

  // ==================== KEYBOARD SHORTCUTS ====================
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input, textarea, or contenteditable
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable
      ) {
        return;
      }

      // Focus search with "/" key
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          setSearchFocused(true);
        }
      }

      // Escape to blur search
      if (e.key === 'Escape' && searchFocused) {
        if (searchInputRef.current) {
          searchInputRef.current.blur();
          setSearchFocused(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchFocused]);

  // ==================== SEO ====================
  // QUAN TRỌNG: Phải set robots="index, follow" để đảm bảo Google index trang chủ
  useSEO({
    title: "Shiku – Mạng xã hội chia sẻ khoảnh khắc",
    description: "Nơi chia sẻ câu chuyện hàng ngày, khám phá cộng đồng xung quanh bạn.",
    robots: "index, follow", // Explicitly set để tránh bị override bởi trang khác
    canonical: "https://shiku.click"
  });

  // ==================== API CALLS ====================

  const getSortLabel = useCallback((type) => {
    switch (type) {
      case 'recommended': return 'Đề xuất';
      case 'hot': return '🔥 Hot';
      case 'newest': return 'Mới nhất';
      case 'mostUpvoted': return '▲ Upvote';
      case 'mostViewed': return 'Xem nhiều';
      default: return 'Đề xuất';
    }
  }, []);

  // ==================== INFINITE SCROLL ====================
  // Using React Query's fetchNextPage instead of manual loadMore

  const lastPostElementRef = useCallback(node => {
    if (loadingMore || !hasMore) return;

    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          fetchNextPage();
        }
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.1
      }
    );

    if (node) observer.current.observe(node);
  }, [hasMore, loadingMore, fetchNextPage]);

  // Note: React Query automatically refetches when sortBy or q changes (queryKey dependency)
  // No need for manual useEffect to call loadInitial


  // ==================== SEARCH HELPER FUNCTIONS ====================

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
          loading="lazy"
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

  /**
   * Xử lý tìm kiếm users và posts - Memoized
   * @param {Event} e - Sự kiện gửi biểu mẫu (tùy chọn)
   * @param {string} query - Chuỗi truy vấn để tìm kiếm (tùy chọn, sử dụng topSearchQuery nếu không được cung cấp)
   * @param {boolean} saveToHistory - Có lưu vào lịch sử tìm kiếm hay không (mặc định: false cho tìm kiếm bị trả lại, true cho tìm kiếm rõ ràng)
   */
  const handleSearch = useCallback(async (e, query = null, saveToHistory = false) => {
    if (e) e.preventDefault();
    const trimmedQuery = (query || topSearchQuery).trim();

    if (trimmedQuery && trimmedQuery.length <= 100) {
      setSearchLoading(true);
      try {
        // Tìm users
        const userRes = await api(`/api/users/search?q=${encodeURIComponent(trimmedQuery)}`);
        setSearchResults(userRes.users || []);

        // Tìm bài viết
        const postRes = await api(`/api/posts?q=${encodeURIComponent(trimmedQuery)}`);
        setSearchPosts(postRes.items || []);

        // Lưu lịch sử nếu được yêu cầu
        if (saveToHistory) {
          addToSearchHistory(trimmedQuery);
        }
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
  }, [topSearchQuery, addToSearchHistory]);

  // OPTIMIZED: Debounced search function using ref to persist timeout
  const searchDebounceRef = useRef(null);

  const handleSearchDebounced = useCallback(() => {
    // Clear previous timeout
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(async () => {
      const trimmedQuery = topSearchQuery.trim();
      if (trimmedQuery && trimmedQuery.length <= 100) {
        setSearchLoading(true);
        try {
          // Tìm users
          const userRes = await api(`/api/users/search?q=${encodeURIComponent(trimmedQuery)}`);
          setSearchResults(userRes.users || []);

          // Tìm bài viết
          const postRes = await api(`/api/posts?q=${encodeURIComponent(trimmedQuery)}`);
          setSearchPosts(postRes.items || []);
          // Note: không lưu lịch sử khi debounced search (chỉ preview)
        } catch (err) {
          setSearchResults([]);
          setSearchPosts([]);
        } finally {
          setSearchLoading(false);
        }
      }
    }, 300);
  }, [topSearchQuery]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);


  const handleTopSearch = (e) => {
    e.preventDefault();
    if (topSearchQuery.trim()) {
      handleSearch(e, null, true); // Save to history when submitting form
      navigate(`/?q=${encodeURIComponent(topSearchQuery.trim())}`);
      setSearchFocused(false);
    }
  };

  // Load search history from localStorage and server
  useEffect(() => {
    // Load from localStorage first
    try {
      const stored = localStorage.getItem('searchHistory');
      if (stored) {
        setSearchHistory(JSON.parse(stored));
      }
    } catch (_) {
      // Silent handling for localStorage error
    }

    // Load from server and merge
    (async () => {
      try {
        const res = await api('/api/search/history');
        const serverItems = Array.isArray(res.items) ? res.items : [];
        if (serverItems.length > 0) {
          // Merge server + local theo query (ưu tiên server)
          const map = new Map();
          // Load từ localStorage
          try {
            const local = JSON.parse(localStorage.getItem('searchHistory') || '[]');
            for (const it of local) {
              if (it && it.query) map.set(it.query.toLowerCase(), it);
            }
          } catch (_) { }
          // Override với server data
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

  // Auto search when typing (debounced)
  useEffect(() => {
    if (topSearchQuery.trim()) {
      handleSearchDebounced();
    } else {
      setSearchResults([]);
      setSearchPosts([]);
    }
  }, [topSearchQuery, handleSearchDebounced]);

  useEffect(() => {
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, []);

  // ==================== LOADING SKELETON ====================
  // Note: Keeping as function component wrapped in useCallback since it's used as <LoadingSkeleton />
  const LoadingSkeleton = useCallback(() => (
    <div className="bg-white dark:bg-[#111] rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-transparent dark:border-white/5 overflow-hidden transition-colors duration-300">
      <div className="p-5">
        {/* Header skeleton with shimmer */}
        <div className="flex items-center space-x-3 mb-4 px-1">
          <div className="relative w-12 h-12 bg-neutral-100 dark:bg-neutral-900 rounded-full overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          </div>
          <div className="flex-1 space-y-2">
            <div className="relative h-4 bg-neutral-100 dark:bg-neutral-900 rounded overflow-hidden w-32">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            </div>
            <div className="relative h-3 bg-neutral-100 dark:bg-neutral-900 rounded overflow-hidden w-24">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            </div>
          </div>
        </div>

        {/* Content skeleton with shimmer */}
        <div className="space-y-2 mb-4 px-1">
          <div className="relative h-4 bg-neutral-100 dark:bg-neutral-900 rounded overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          </div>
          <div className="relative h-4 bg-neutral-100 dark:bg-neutral-900 rounded overflow-hidden w-4/5">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          </div>
          <div className="relative h-4 bg-neutral-100 dark:bg-neutral-900 rounded overflow-hidden w-3/5">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          </div>
        </div>

        {/* Image skeleton with shimmer */}
        <div className="relative h-64 bg-neutral-100 dark:bg-neutral-900 rounded-3xl overflow-hidden mb-5">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        </div>

        {/* Actions skeleton with shimmer */}
        <div className="flex items-center justify-between px-1">
          <div className="flex space-x-1">
            <div className="relative h-10 bg-neutral-100 dark:bg-neutral-900 rounded-full overflow-hidden w-20">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            </div>
            <div className="relative h-10 bg-neutral-100 dark:bg-neutral-900 rounded-full overflow-hidden w-20">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            </div>
            <div className="relative h-10 bg-neutral-100 dark:bg-neutral-900 rounded-full overflow-hidden w-16">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            </div>
          </div>
          <div className="relative h-10 w-10 bg-neutral-100 dark:bg-neutral-900 rounded-full overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          </div>
        </div>
      </div>
    </div>
  ), []);




  // ==================== RENDER ====================
  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-300 pb-32 relative font-sans selection:bg-neutral-200 dark:selection:bg-neutral-800">
      <NoiseOverlay />
      <GridPattern />

      <div className="relative z-10">
        {/* Accessible, SEO-friendly heading without affecting layout */}
        <h1 className="sr-only">Shiku – Mạng xã hội chia sẻ khoảnh khắc</h1>
        <p className="sr-only">Nơi chia sẻ câu chuyện hàng ngày, khám phá cộng đồng xung quanh bạn.</p>

        {/* Mobile Navbar - chỉ hiện trên mobile, fixed top */}
        <nav className="md:hidden fixed top-0 left-0 right-0 z-[110]" role="navigation" aria-label="Điều hướng chính">
          <Navbar user={user} setUser={setUser} darkMode={darkMode} setDarkMode={setDarkMode} />
        </nav>

        {/* Left Sidebar - ẩn trên mobile, không cần animation vì là fixed element */}
        <aside role="complementary" aria-label="Menu điều hướng">
          <LeftSidebar user={user} setUser={setUser} />
        </aside>        {/* Main Content Area với margin-left cho left sidebar */}
        <main
          className="main-content-with-sidebar pt-[64px] md:pt-16 min-h-screen transition-all duration-300 ease-in-out"
          role="main"
        >
          {/* Top Navigation Bar - ẩn trên mobile, hiện từ md trở lên - luôn fixed và visible */}
          <nav
            className="nav-with-sidebar hidden md:flex fixed top-0 right-0 h-16 bg-white/70 dark:bg-black/70 backdrop-blur-2xl border-b border-neutral-200/50 dark:border-neutral-800/50 shadow-sm z-30 transition-all duration-300 ease-in-out"
            role="navigation"
            aria-label="Thanh tìm kiếm và điều hướng"
          >
            <div className="w-full flex items-center h-full px-4 md:px-6 lg:px-8">
              {/* Search Input with Dropdown - Left side, takes available space */}
              <form onSubmit={handleTopSearch} className="flex-1 max-w-2xl mr-4">
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Tìm kiếm bạn bè, nhóm, bài viết..."
                    value={topSearchQuery}
                    onChange={(e) => setTopSearchQuery(e.target.value)}
                    maxLength={100}
                    autoComplete="off"
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setTimeout(() => {
                      if (!historyEditing) {
                        setSearchFocused(false);
                      }
                    }, 200)}
                    className="w-full pl-12 pr-4 py-2.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-full text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all text-sm"
                  />
                  {/* Search Dropdown */}
                  {(searchFocused || topSearchQuery.trim() || historyEditing) && (
                    (searchResults.length > 0 || searchPosts.length > 0 || searchHistory.length > 0) && (
                      <div className="absolute left-0 top-full mt-1 w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg dark:shadow-2xl z-50 max-h-80 overflow-y-auto custom-scrollbar">
                        {/* Lịch sử tìm kiếm / Gợi ý */}
                        {(!topSearchQuery.trim() || (topSearchQuery.trim() && searchResults.length === 0 && searchPosts.length === 0)) && searchHistory.length > 0 && (
                          <React.Fragment key="search-history">
                            <div className="flex items-center justify-between px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-900">
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
                                    setTopSearchQuery('');
                                  } else {
                                    // Khi click "Chỉnh sửa" - chỉ enable editing mode
                                    setHistoryEditing(true);
                                  }
                                }}
                                className="text-black dark:text-white hover:underline"
                              >
                                {historyEditing ? 'Xong' : 'Chỉnh sửa'}
                              </button>
                            </div>
                            {searchHistory
                              .filter(h => !topSearchQuery.trim() || h.query.toLowerCase().includes(topSearchQuery.toLowerCase()))
                              .slice(0, 10)
                              .map(item => (
                                <div
                                  key={item.id}
                                  className="flex items-center gap-3 px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer group border-b border-neutral-100 dark:border-neutral-800 last:border-b-0"
                                  onMouseDown={() => {
                                    setTopSearchQuery(item.query);
                                    setTimeout(() => {
                                      handleSearch(null, item.query, true); // Save to history when clicking history item
                                    }, 0);
                                  }}
                                >
                                  <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 flex items-center justify-center text-xs">•</div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-neutral-900 dark:text-white text-sm truncate">{item.query}</div>
                                    <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{new Date(item.lastSearchedAt).toLocaleDateString('vi-VN')}</div>
                                  </div>
                                  {historyEditing && (
                                    <button
                                      type="button"
                                      onMouseDown={(e) => {
                                        e.stopPropagation();
                                        deleteHistoryItem(item.id);
                                      }}
                                      className="text-neutral-400 hover:text-red-600 dark:hover:text-red-400"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              ))}
                            {historyEditing && (
                              <div className="px-3 py-2">
                                <button
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    clearHistory();
                                  }}
                                  className="text-red-600 dark:text-red-400 text-xs hover:underline"
                                >
                                  Xóa tất cả lịch sử
                                </button>
                              </div>
                            )}
                            <div className="h-px bg-neutral-100 dark:bg-neutral-800" />
                          </React.Fragment>
                        )}
                        {/* Kết quả user */}
                        {searchResults.length > 0 && (
                          <React.Fragment key="search-users">
                            <div className="px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-900">Người dùng</div>
                            {searchResults.map(user => (
                              <div
                                key={user._id}
                                className="flex items-center gap-3 px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer border-b border-neutral-100 dark:border-neutral-800 last:border-b-0"
                                onClick={() => {
                                  navigate(`/user/${user._id}`);
                                  setSearchFocused(false);
                                  setTopSearchQuery("");
                                }}
                              >
                                <UserAvatar
                                  user={user}
                                  size={28}
                                  showFrame={true}
                                  showBadge={true}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-neutral-900 dark:text-white text-sm truncate">
                                    <UserName user={user} maxLength={20} />
                                  </div>
                                  {user.nickname && <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">@{user.nickname}</div>}
                                </div>
                              </div>
                            ))}
                          </React.Fragment>
                        )}
                        {/* Kết quả bài viết: chỉ hiện nếu không có user nào khớp */}
                        {searchResults.length === 0 && searchPosts.length > 0 && (
                          <React.Fragment key="search-posts">
                            <div className="px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-900">Bài viết</div>
                            {searchPosts.map(post => (
                              <div
                                key={post._id}
                                className="flex items-center gap-3 px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer border-b border-neutral-100 dark:border-neutral-800 last:border-b-0"
                                onClick={() => {
                                  navigate(`/post/${post.slug || post._id}`);
                                  setSearchFocused(false);
                                  setTopSearchQuery("");
                                }}
                              >
                                {renderPostPreview(post, "w-7 h-7 rounded flex-shrink-0 object-cover")}
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-neutral-900 dark:text-white text-sm truncate">{post.title}</div>
                                  <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{post.author?.name || ''}</div>
                                </div>
                              </div>
                            ))}
                          </React.Fragment>
                        )}
                        {searchLoading && (
                          <div className="px-3 py-3 text-neutral-500 dark:text-neutral-400 text-sm text-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-neutral-600 dark:border-neutral-300 mx-auto mb-1"></div>
                            <span className="dark:text-neutral-300">Đang tìm kiếm...</span>
                          </div>
                        )}
                        {topSearchQuery.trim() && searchResults.length === 0 && searchPosts.length === 0 && !searchLoading && (
                          <div className="px-3 py-3 text-neutral-500 dark:text-neutral-400 text-sm text-center">
                            <span className="dark:text-neutral-300">Không tìm thấy kết quả nào</span>
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              </form>

              {/* Add New Post Button - Only show when logged in */}
              {user && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    // Trigger PostCreator modal từ global PostCreator (App.jsx)
                    const triggerBtn = document.querySelector('[data-post-creator-trigger]');
                    if (triggerBtn) {
                      triggerBtn.click();
                    }
                  }}
                  className={`px-4 md:px-6 py-2.5 rounded-full font-semibold transition-all duration-200 flex items-center gap-2 text-sm whitespace-nowrap flex-shrink-0 active:scale-[0.98] ${items.length === 0
                    ? 'border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-600 hover:text-neutral-900 dark:hover:text-white bg-transparent'
                    : 'bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 shadow-md hover:shadow-lg'
                    }`}
                  aria-label="Đăng bài"
                >
                  <Plus size={18} strokeWidth={2.5} />
                  <span>Đăng bài</span>
                </motion.button>
              )}

              {/* Spacer */}
              <div className="flex-1"></div>

              {/* User Icons */}
              {user && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* 1. Dark Mode Toggle */}
                  <button
                    onClick={() => {
                      // Use flushSync for immediate state update
                      setDarkMode(prev => !prev);
                    }}
                    className="p-2.5 rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-black dark:hover:text-white transition-all"
                    title={darkMode ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
                    aria-label={darkMode ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
                  >
                    {darkMode ? <Moon size={20} /> : <Sun size={20} />}
                  </button>

                  {/* 2. Friends */}
                  <Link
                    to="/friends"
                    className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                    title="Bạn bè"
                    aria-label="Bạn bè"
                  >
                    <Users size={20} className="text-gray-600 dark:text-gray-300" />
                  </Link>

                  {/* 3. Chat */}
                  <ChatDropdown onOpenChat={addChatPopup} />

                  {/* 4. Thông báo */}
                  <NotificationBell user={user} />

                  {/* Avatar */}
                  <Link
                    to="/profile"
                    className="ml-0.5"
                  >
                    <UserAvatar
                      user={user}
                      size={40}
                      showFrame={true}
                      showBadge={true}
                    />
                  </Link>
                </div>
              )}
            </div>
          </nav>

          {/* Feed Bar - Trải dài toàn bộ chiều rộng - Sticky trên mobile (dưới navbar), static trên desktop, sát navbar trên desktop */}
          <div className="sticky md:relative top-[64px] md:top-0 z-20 px-6 md:px-8 lg:px-10 py-2 md:py-2 border-b border-neutral-200/50 dark:border-neutral-800/50 bg-white/70 dark:bg-black/70 backdrop-blur-2xl transition-colors duration-300">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 overflow-hidden">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white whitespace-nowrap flex-shrink-0">Bảng tin</h2>
                {items.length > 0 && (
                  <span className="hidden text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-900 px-3 py-1.5 rounded-full font-semibold whitespace-nowrap flex-shrink-0">
                    {items.length} bài viết
                  </span>
                )}
              </div>

              {/* Sort Dropdown */}
              <div className="relative" ref={filterDropdownRef}>
                <button
                  onClick={() => setFilterDropdownOpen(prev => !prev)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all"
                >
                  <span>{filterOptions.find(f => f.key === sortBy)?.label || 'Đề xuất'}</span>
                  <ChevronDown size={14} className={`transition-transform ${filterDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {filterDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 top-full mt-2 bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 py-1 z-[200]"
                  >
                    {filterOptions.map(option => (
                      <button
                        key={option.key}
                        onClick={() => {
                          setSortBy(option.key);
                          setFilterDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${sortBy === option.key
                          ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                          }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* Content Area - 2 Columns when logged in, 1 Column when guest */}
          <div className="px-4 md:px-6 lg:px-4 py-6 md:py-8">
            <div className={`grid grid-cols-1 gap-8 max-w-[1440px] mx-auto ${user ? "xl:grid-cols-[1fr_300px]" : ""}`}>
              {/* Center Column - Main Feed - Centered & Restricted Width */}
              <div className="w-full max-w-[680px] mx-auto space-y-4 min-w-0">
                {/* Pull to Refresh - Mobile only */}
                <PullToRefresh onRefresh={refetchPosts} disabled={loading}>
                  {/* Post Creator - Mobile only */}
                  {user && (
                    <div className="md:hidden mb-4">
                      <PostCreator user={user} />
                    </div>
                  )}

                  {/* FEATURE FLAG: Stories disabled - uncomment when DAU >= 500 and stories/day >= 20 */}
                  {/* <Stories user={user} /> */}

                  {/* Posts Feed */}
                  {loading ? (
                    <div className="space-y-3 sm:space-y-4">
                      {[1, 2, 3].map(i => (
                        <LoadingSkeleton key={i} />
                      ))}
                    </div>
                  ) : error ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-2xl p-6 md:p-8 text-center transition-colors duration-300 shadow-md"
                    >
                      <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-800/50 rounded-full flex items-center justify-center">
                        <AlertCircle size={24} className="text-red-500 dark:text-red-400" />
                      </div>
                      <h3 className="text-lg font-bold text-red-900 dark:text-red-300 mb-2">Có lỗi xảy ra</h3>
                      <p className="text-base text-red-600 dark:text-red-400 mb-6 break-words px-2">{error}</p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                          onClick={loadInitial}
                          className="px-6 py-3 bg-red-600 dark:bg-red-700 text-white rounded-xl font-semibold text-base hover:bg-red-700 dark:hover:bg-red-600 transition-all duration-200 shadow-md hover:shadow-lg"
                          aria-label="Thử tải lại bài viết"
                        >
                          Thử lại
                        </button>
                        <button
                          onClick={() => {
                            setError(null);
                            navigate(0);
                          }}
                          className="px-6 py-3 bg-gray-200 dark:bg-neutral-800 text-gray-800 dark:text-gray-200 rounded-xl font-semibold text-base hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200"
                        >
                          Tải lại trang
                        </button>
                      </div>
                    </motion.div>
                  ) : items.length > 0 ? (
                    <div className="space-y-3 sm:space-y-4">
                      {items.map((post, index) => {
                        const isLastPost = index === items.length - 1;
                        // Chỉ animate 3 post đầu tiên để giảm lag
                        const shouldAnimate = index < 3;

                        return shouldAnimate ? (
                          <motion.div
                            key={post._id}
                            ref={isLastPost ? lastPostElementRef : null}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              duration: 0.3,
                              delay: index * 0.05,
                              ease: "easeOut"
                            }}
                          >
                            <ModernPostCard
                              post={post}
                              user={user}
                              onUpdate={refetchPosts}
                              isSaved={savedMap[post._id]}
                              onSavedChange={updateSavedState}
                              isFirst={index === 0}
                            />
                          </motion.div>
                        ) : (
                          <div key={post._id} ref={isLastPost ? lastPostElementRef : null}>
                            <ModernPostCard
                              post={post}
                              user={user}
                              onUpdate={refetchPosts}
                              isSaved={savedMap[post._id]}
                              onSavedChange={updateSavedState}
                              isFirst={index === 0}
                            />
                          </div>
                        );
                      })}

                      {/* Loading more indicator */}
                      {loadingMore && (
                        <div className="flex justify-center py-8">
                          <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300 text-base">
                            <Loader2 size={20} className="animate-spin text-gray-600 dark:text-gray-300" />
                            <span className="font-semibold">Đang tải thêm bài viết...</span>
                          </div>
                        </div>
                      )}

                      {/* End of feed message */}
                      {!hasMore && items.length > 0 && (
                        <div className="text-center py-8">
                          <div className="inline-flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-neutral-900 border border-gray-200 dark:border-gray-800 rounded-full text-gray-600 dark:text-gray-300 text-sm font-semibold">
                            <span>✨</span>
                            <span>Bạn đã xem hết tất cả bài viết!</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Empty State - Fake input CTA style */
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8"
                    >
                      <h3 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white mb-4 text-center">
                        Chưa có bài viết nào
                      </h3>

                      {user ? (
                        <button
                          onClick={() => {
                            const triggerBtn = document.querySelector('[data-post-creator-trigger]');
                            if (triggerBtn) {
                              triggerBtn.click();
                            }
                          }}
                          className="w-full flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl border border-neutral-200 dark:border-neutral-700 transition-all duration-200 cursor-text group"
                        >
                          <UserAvatar user={user} size={40} className="flex-shrink-0" />
                          <span className="text-neutral-400 dark:text-neutral-500 text-base group-hover:text-neutral-500 dark:group-hover:text-neutral-400 transition-colors">
                            Bạn đang nghĩ gì?
                          </span>
                        </button>
                      ) : (
                        <Link
                          to="/login"
                          className="w-full flex items-center justify-center gap-3 p-4 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl border border-neutral-200 dark:border-neutral-700 transition-all duration-200"
                        >
                          <span className="text-neutral-600 dark:text-neutral-400 text-base font-medium">
                            Đăng nhập để chia sẻ suy nghĩ đầu tiên
                          </span>
                        </Link>
                      )}
                    </motion.div>
                  )}
                </PullToRefresh>
              </div>

              {/* Right Sidebar - Friend Suggestions, Profile Activity, Upcoming Events - Only for logged-in users */}
              {user && (
                <aside
                  className="hidden xl:block relative"
                  role="complementary"
                  aria-label="Gợi ý bạn bè và hoạt động"
                >
                  <div className="sticky top-20">
                    <RightSidebar user={user} />
                  </div>
                </aside>
              )}
            </div>
          </div>

          {/* Scroll To Top Button */}
          <BackToTop />
        </main>

        {/* Chat Popup Manager - Only for logged-in users */}
        {user && (
          <ChatPopupManager
            conversations={openPopups}
            onCloseConversation={closeChatPopup}
            onShowInfo={showInfo}
          />
        )}
      </div>
    </div>
  );
}

// Memoize component với custom comparison để tối ưu performance
export default React.memo(Home, (prevProps, nextProps) => {
  // Chỉ re-render khi user._id thay đổi
  return prevProps.user?._id === nextProps.user?._id &&
    prevProps.setUser === nextProps.setUser;
});
