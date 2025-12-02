import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import { useSavedPosts } from "../hooks/useSavedPosts";
import { useSEO } from "../utils/useSEO";
import PostCard from "../components/PostCard";
import ModernPostCard from "../components/ModernPostCard";
import Stories from "../components/Stories";
import LeftSidebar from "../components/LeftSidebar";
import RightSidebar from "../components/RightSidebar";
import NotificationBell from "../components/NotificationBell";
import ChatDropdown from "../components/ChatDropdown";
import ChatPopupManager from "../components/ChatPopupManager";
import UserName from "../components/UserName";
import UserAvatar from "../components/UserAvatar";
import Navbar from "../components/Navbar";
import { ArrowUpDown, Clock, Eye, TrendingUp, Loader2, Sparkles, Search, Bell, MessageCircle, Plus, X, Moon, Sun, Users, ArrowUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "../components/Toast";
import { useChat } from "../contexts/ChatContext";

// --- VISUAL COMPONENTS FROM LANDING PAGE ---
const NoiseOverlay = () => (
  <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03] mix-blend-overlay"
    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
  />
);

const GridPattern = () => {
  return (
    <div className="fixed inset-0 z-0 h-full w-full bg-white dark:bg-black bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
      <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-neutral-400 opacity-10 blur-[120px] dark:bg-white"></div>
    </div>
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

  // Dữ liệu bài viết
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalPages, setTotalPages] = useState(0);

  // Tải trạng thái
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const { savedMap, updateSavedState } = useSavedPosts(items);

  // Tìm kiếm và sắp xếp
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const [sortBy, setSortBy] = useState('recommended');

  // Hàm chuyển sang chế độ sắp xếp tiếp theo
  const cycleSortBy = useCallback(() => {
    const sortOptions = ['recommended', 'newest', 'oldest', 'mostViewed', 'leastViewed'];
    setSortBy(prev => {
      const currentIndex = sortOptions.indexOf(prev);
      const nextIndex = (currentIndex + 1) % sortOptions.length;
      return sortOptions[nextIndex];
    });
  }, []);
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

  // Scroll to top button logic
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // ==================== SEO ====================
  // QUAN TRỌNG: Phải set robots="index, follow" để đảm bảo Google index trang chủ
  useSEO({
    title: "Shiku – Mạng xã hội chia sẻ khoảnh khắc",
    description: "Nơi chia sẻ câu chuyện hàng ngày, khám phá cộng đồng xung quanh bạn.",
    robots: "index, follow", // Explicitly set để tránh bị override bởi trang khác
    canonical: "https://shiku.click"
  });

  // ==================== API CALLS ====================

  const getSortIcon = useCallback((type) => {
    const iconClassName = "text-gray-600 dark:text-gray-300";
    switch (type) {
      case 'recommended': return <Sparkles size={16} className={iconClassName} />;
      case 'newest': return <Clock size={16} className={iconClassName} />;
      case 'oldest': return <Clock size={16} className={`rotate-180 ${iconClassName}`} />;
      case 'mostViewed': return <Eye size={16} className={iconClassName} />;
      case 'leastViewed': return <Eye size={16} className={`opacity-50 ${iconClassName}`} />;
      default: return <TrendingUp size={16} className={iconClassName} />;
    }
  }, []);

  const getSortLabel = useCallback((type) => {
    switch (type) {
      case 'recommended': return 'Đề xuất';
      case 'newest': return 'Mới nhất';
      case 'oldest': return 'Cũ nhất';
      case 'mostViewed': return 'Xem nhiều nhất';
      case 'leastViewed': return 'Xem ít nhất';
      default: return 'Đề xuất';
    }
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    loadingRef.current = true;

    try {
      // Use smart feed for "recommended" sort
      if (sortBy === 'recommended') {
        // Smart feed with pagination support
        const limit = 20;
        const smartFeedData = await api(`/api/posts/feed/smart?page=1&limit=${limit}`);
        setItems(smartFeedData.items || []);
        // Enable pagination: if we got 20 items, assume there are more
        setHasMore((smartFeedData.items || []).length >= limit);
        setPage(2); // Prepare for next page
        setTotalPages(100); // Smart feed doesn't provide exact total, use large number as assumption
      } else {
        // Use unified feed endpoint for other sort options
        // This handles both published and private posts in a single query with correct sorting
        const limit = 20;
        const feedData = await api(`/api/posts/feed?page=1&limit=${limit}&q=${encodeURIComponent(q)}&sort=${sortBy}`);

        // No need to manually fetch private posts or sort - backend does it all
        setItems(feedData.items || []);
        setTotalPages(feedData.pages);
        setHasMore((feedData.items || []).length >= limit && feedData.page < feedData.pages);
        setPage(2);
      }
    } catch (error) {
      setError('Không thể tải bài viết. Vui lòng thử lại.');
      setItems([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [q, user, sortBy]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore || loadingMore) return;

    setLoadingMore(true);
    setError(null);
    loadingRef.current = true;

    try {
      let newItems = [];
      const limit = 20; // Unified limit for all feed types

      if (sortBy === 'recommended') {
        // Smart feed pagination
        const smartFeedData = await api(`/api/posts/feed/smart?page=${page}&limit=${limit}`);
        newItems = smartFeedData.items || [];
      } else {
        // Unified feed for other sort options
        const feedData = await api(`/api/posts/feed?page=${page}&limit=${limit}&q=${encodeURIComponent(q)}&sort=${sortBy}`);
        newItems = feedData.items || [];
      }

      // Deduplicate posts by _id to prevent duplicates when new posts are added
      setItems(prev => {
        const uniquePosts = new Map();
        // Add existing posts to Map
        prev.forEach(p => uniquePosts.set(p._id, p));
        // Add new posts to Map (will overwrite if duplicate, keeping newer version)
        newItems.forEach(p => uniquePosts.set(p._id, p));
        // Convert back to array
        return Array.from(uniquePosts.values());
      });

      // Update hasMore based on returned items count (if less than limit, no more items)
      if (newItems.length < limit) {
        setHasMore(false);
      } else {
        setPage(prev => prev + 1);
      }
    } catch (error) {
      setError('Không thể tải thêm bài viết. Vui lòng thử lại.');
    } finally {
      setLoadingMore(false);
      loadingRef.current = false;
    }
  }, [page, hasMore, loadingMore, q, sortBy]);

  // ==================== INFINITE SCROLL ====================

  const lastPostElementRef = useCallback(node => {
    if (loadingRef.current || !hasMore) return;

    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
          loadMore();
        }
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.1
      }
    );

    if (node) observer.current.observe(node);
  }, [hasMore, loadMore]);

  // ==================== EFFECTS ====================

  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    setTotalPages(0);
    setError(null);
    loadingRef.current = false;
    loadInitial();
  }, [q, user, sortBy, loadInitial]);


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

  // Debounced search function
  const handleSearchDebounced = useCallback(
    (() => {
      let timeoutId;
      return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
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
      };
    })(),
    [topSearchQuery]
  );

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

  const LoadingSkeleton = useCallback(() => (
    <div className="bg-white dark:bg-[#111] rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-transparent dark:border-white/5 overflow-hidden transition-colors duration-300">
      <div className="p-5">
        {/* Header skeleton */}
        <div className="flex items-center space-x-3 mb-4 px-1">
          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-32"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-24"></div>
          </div>
        </div>

        {/* Content skeleton */}
        <div className="space-y-2 mb-4 px-1">
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-4/5"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-3/5"></div>
        </div>

        {/* Image skeleton */}
        <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-3xl animate-pulse mb-5"></div>

        {/* Actions skeleton */}
        <div className="flex items-center justify-between px-1">
          <div className="flex space-x-1">
            <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse w-20"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse w-20"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse w-16"></div>
          </div>
          <div className="h-10 w-10 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse"></div>
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
        <nav className="md:hidden fixed top-0 left-0 right-0 z-50" role="navigation" aria-label="Điều hướng chính">
          <Navbar user={user} setUser={setUser} darkMode={darkMode} setDarkMode={setDarkMode} />
        </nav>

        {/* Left Sidebar - ẩn trên mobile */}
        <motion.aside
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          role="complementary"
          aria-label="Menu điều hướng"
        >
          <LeftSidebar user={user} setUser={setUser} />
        </motion.aside>        {/* Main Content Area với margin-left cho left sidebar */}
        <main
          className="main-content-with-sidebar pt-[64px] md:pt-16 lg:ml-64 min-h-screen transition-all duration-300 ease-in-out"
          role="main"
        >
          {/* Top Navigation Bar - ẩn trên mobile, hiện từ md trở lên - luôn fixed và visible */}
          <nav
            className="nav-with-sidebar hidden md:flex fixed top-0 left-0 lg:left-64 right-0 h-16 bg-white/70 dark:bg-black/70 backdrop-blur-2xl border-b border-neutral-200/50 dark:border-neutral-800/50 shadow-sm z-40 transition-all duration-300 ease-in-out"
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
                                className="text-blue-600 dark:text-blue-400 hover:underline"
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
                                  <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{user.email}</div>
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

              {/* Add New Post Button - Giữ nguyên vị trí */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  // Trigger PostCreator modal từ global PostCreator (App.jsx)
                  const triggerBtn = document.querySelector('[data-post-creator-trigger]');
                  if (triggerBtn) {
                    triggerBtn.click();
                  }
                }}
                className="px-4 md:px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-full font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 text-sm whitespace-nowrap flex-shrink-0 active:scale-[0.98]"
                aria-label="Đăng bài mới"
              >
                <Plus size={18} strokeWidth={2.5} className="text-white dark:text-black" />
                <span>Đăng bài mới</span>
              </motion.button>

              {/* Spacer - Đẩy các icons sang bên phải */}
              <div className="flex-1"></div>

              {/* User Icons - Đẩy sang bên phải */}
              {user && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* 1. Dark Mode Toggle */}
                  <button
                    onClick={() => {
                      // Use flushSync for immediate state update
                      setDarkMode(prev => !prev);
                    }}
                    className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors duration-75"
                    title={darkMode ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
                    aria-label={darkMode ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
                  >
                    {darkMode ? (
                      <Sun size={20} className="text-gray-600 dark:text-gray-300" />
                    ) : (
                      <Moon size={20} className="text-gray-600 dark:text-gray-300" />
                    )}
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
          <div className="sticky md:static top-[64px] md:top-0 z-[100] px-4 md:px-6 lg:px-8 py-2 md:py-2 border-b border-neutral-200/50 dark:border-neutral-800/50 bg-white/70 dark:bg-black/70 backdrop-blur-2xl transition-colors duration-300">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 overflow-hidden">
                <h2 className="text-lg md:text-xl font-bold text-neutral-900 dark:text-white whitespace-nowrap flex-shrink-0">Bảng tin</h2>
                {items.length > 0 && (
                  <span className="hidden sm:inline text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-900 px-3 py-1.5 rounded-full font-semibold whitespace-nowrap flex-shrink-0">
                    {items.length} bài viết
                  </span>
                )}
              </div>

              {/* Mobile: Nút đăng bài mới - chỉ hiển thị trên mobile */}
              <div className="md:hidden flex-shrink-0">
                <button
                  onClick={() => {
                    // Trigger PostCreator modal từ global PostCreator (App.jsx)
                    const triggerBtn = document.querySelector('[data-post-creator-trigger]');
                    if (triggerBtn) {
                      triggerBtn.click();
                    }
                  }}
                  className="px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black rounded-full font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-1.5 text-xs whitespace-nowrap active:scale-[0.98] touch-manipulation min-h-[36px]"
                  title="Đăng bài mới"
                  aria-label="Đăng bài mới"
                >
                  <Plus size={16} strokeWidth={2.5} className="text-white dark:text-black" />
                  <span>Đăng bài</span>
                </button>
              </div>

              <button
                onClick={cycleSortBy}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all duration-200 whitespace-nowrap touch-manipulation flex-shrink-0"
                aria-label={`Sắp xếp: ${getSortLabel(sortBy)}. Bấm để chuyển sang chế độ khác`}
                title={`Bấm để chuyển sang chế độ sắp xếp khác`}
              >
                <span className="hidden sm:inline-flex flex-shrink-0">{getSortIcon(sortBy)}</span>
                <span className="whitespace-nowrap">{getSortLabel(sortBy)}</span>
                {sortBy === 'recommended' && (
                  <span className="relative inline-flex items-center text-[11px] px-2 sm:px-2.5 py-1 bg-gradient-to-r from-black via-neutral-800 to-black dark:from-white dark:via-neutral-200 dark:to-white text-white dark:text-black rounded-full font-black flex-shrink-0 shadow-lg shadow-black/20 dark:shadow-white/20 animate-pulse">
                    <span>AI</span>
                  </span>
                )}
                <ArrowUpDown size={14} className="opacity-60 dark:opacity-70 flex-shrink-0 text-neutral-600 dark:text-neutral-300 hidden sm:inline" />
              </button>
            </div>
          </div>

          {/* Content Area - 2 Columns */}
          <div className="px-4 md:px-6 lg:px-8 py-6 md:py-8">
            <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 md:gap-8">
              {/* Center Column - Main Feed */}
              <div className="space-y-6 min-w-0">
                {/* Stories Section */}
                <Stories user={user} />

                {/* Posts Feed */}
                {loading ? (
                  <div className="space-y-6">
                    {[1, 2, 3].map(i => (
                      <LoadingSkeleton key={i} />
                    ))}
                  </div>
                ) : error ? (
                  <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-2xl p-6 md:p-8 text-center transition-colors duration-300 shadow-md">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-800/50 rounded-full flex items-center justify-center">
                      <TrendingUp size={24} className="text-red-400" />
                    </div>
                    <h3 className="text-lg font-bold text-red-900 dark:text-red-300 mb-2">Có lỗi xảy ra</h3>
                    <p className="text-base text-red-600 dark:text-red-400 mb-6 break-words px-2">{error}</p>
                    <button
                      onClick={loadInitial}
                      className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-semibold text-base hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all duration-200 shadow-md hover:shadow-lg"
                      aria-label="Thử tải lại bài viết"
                    >
                      Thử lại
                    </button>
                  </div>
                ) : items.length > 0 ? (
                  <div className="space-y-6">
                    {items.map((post, index) => {
                      const isLastPost = index === items.length - 1;

                      return (
                        <motion.div
                          key={post._id}
                          ref={isLastPost ? lastPostElementRef : null}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.5,
                            delay: (index % 5) * 0.1,
                            ease: [0.25, 0.1, 0.25, 1]
                          }}
                        >
                          <ModernPostCard
                            post={post}
                            user={user}
                            onUpdate={loadInitial}
                            isSaved={savedMap[post._id]}
                            onSavedChange={updateSavedState}
                          />
                        </motion.div>
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
                        <div className="inline-flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-full text-gray-600 dark:text-gray-300 text-sm font-semibold">
                          <span>✨</span>
                          <span>Bạn đã xem hết tất cả bài viết!</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-[#111] rounded-2xl shadow-md dark:shadow-lg border border-transparent dark:border-white/5 p-12 text-center transition-colors duration-300">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                      <TrendingUp size={24} className="text-gray-400 dark:text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Chưa có bài viết nào</h3>
                    <p className="text-base text-gray-600 dark:text-gray-300">Hãy là người đầu tiên chia sẻ điều gì đó thú vị!</p>
                  </div>
                )}
              </div>

              {/* Right Sidebar - Friend Suggestions, Profile Activity, Upcoming Events */}
              <motion.aside
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
                className="hidden xl:block relative z-[1]"
                role="complementary"
                aria-label="Gợi ý bạn bè và hoạt động"
              >
                <div className="sticky top-20">
                  <RightSidebar user={user} />
                </div>
              </motion.aside>
            </div>
          </div>

          {/* Scroll To Top Button */}
          <AnimatePresence>
            {showScrollTop && (
              <motion.button
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5, y: 20 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={scrollToTop}
                className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-50 p-3 bg-black dark:bg-neutral-700 text-white dark:text-white rounded-full shadow-lg hover:shadow-xl transition-shadow"
                aria-label="Cuộn lên đầu trang"
              >
                <ArrowUp size={24} />
              </motion.button>
            )}
          </AnimatePresence>
        </main>

        {/* Chat Popup Manager */}
        <ChatPopupManager
          conversations={openPopups}
          onCloseConversation={closeChatPopup}
          onShowInfo={showInfo}
        />
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
