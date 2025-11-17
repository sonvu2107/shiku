import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import { useSavedPosts } from "../hooks/useSavedPosts";
import { useSEO } from "../utils/useSEO";
import PostCard from "../components/PostCard";
import PostCreator from "../components/PostCreator";
import Stories from "../components/Stories";
import LeftSidebar from "../components/LeftSidebar";
import RightSidebar from "../components/RightSidebar";
import NotificationBell from "../components/NotificationBell";
import ChatDropdown from "../components/ChatDropdown";
import ChatPopupManager from "../components/ChatPopupManager";
import UserName from "../components/UserName";
import Navbar from "../components/Navbar";
import { ArrowUpDown, Clock, Eye, TrendingUp, Loader2, Sparkles, Search, Bell, MessageCircle, Settings, Plus, X, Moon, Sun } from "lucide-react";

/**
 * Home - Trang chủ mạng xã hội với bố cục 3 cột
 * - Sidebar trái: Shortcuts (menu nhanh)
 * - Cột giữa: Stories, PostCreator, Posts feed với infinite scroll
 * - Sidebar phải: OnlineFriends (bạn bè online)
 */
export default function Home({ user, setUser }) {
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
  const [loadingAll, setLoadingAll] = useState(false);
  const [error, setError] = useState(null);
  const { savedMap, updateSavedState } = useSavedPosts(items);

  // Tìm kiếm và sắp xếp
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const [sortBy, setSortBy] = useState('recommended');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [topSearchQuery, setTopSearchQuery] = useState(q);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchPosts, setSearchPosts] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [historyEditing, setHistoryEditing] = useState(false);
  const [openPopups, setOpenPopups] = useState([]);
  const postCreatorRef = useRef(null);
  const postCreatorWrapperRef = useRef(null);
  const searchInputRef = useRef(null);

  const addChatPopup = (conv) => {
    if (!openPopups.find(p => p._id === conv._id)) {
      setOpenPopups([...openPopups, conv]);
    }
  };

  const closeChatPopup = (convId) => {
    setOpenPopups(openPopups.filter(p => p._id !== convId));
  };

  // Infinite scroll
  const observer = useRef();
  const loadingRef = useRef(false);
  const navigate = useNavigate();

  // ==================== SEO ====================
  useSEO({
    title: "Shiku – Mạng xã hội chia sẻ khoảnh khắc",
    description: "Nơi chia sẻ câu chuyện hàng ngày, khám phá cộng đồng xung quanh bạn.",
    canonical: "https://shiku.click"
  });

  // ==================== API CALLS ====================

  const sortPosts = useCallback((posts, sortType) => {
    if (!Array.isArray(posts)) return [];
    const sorted = [...posts];
    switch (sortType) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'mostViewed':
        return sorted.sort((a, b) => (b.views || 0) - (a.views || 0));
      case 'leastViewed':
        return sorted.sort((a, b) => (a.views || 0) - (b.views || 0));
      default:
        return sorted;
    }
  }, []);

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
        // Smart feed loads all at once (no pagination support yet)
        // Request more posts upfront
        const smartFeedData = await api(`/api/posts/feed/smart?limit=50`);
        setItems(smartFeedData.items || []);
        // No pagination for smart feed - all posts loaded
        setHasMore(false);
        setPage(1);
        setTotalPages(1);
      } else {
        // Use regular feed for other sort options
        const limit = 100;
        const publishedData = await api(`/api/posts?page=1&limit=${limit}&q=${encodeURIComponent(q)}&status=published`);
        let allItems = publishedData.items;

        // Tải bài viết riêng tư nếu người dùng đã đăng nhập
        if (user) {
          try {
            const privateData = await api(`/api/posts?page=1&limit=${limit}&status=private&author=${user._id}`);
            allItems = [...privateData.items, ...allItems];
          } catch (privateError) {
            // Silent handling for private posts loading error
          }
        }

        // Áp dụng sắp xếp
        allItems = sortPosts(allItems, sortBy);

        setItems(allItems);
        setTotalPages(publishedData.pages);
        setHasMore(publishedData.pages > 1);
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
  }, [q, user, sortBy, sortPosts]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore || loadingMore) return;

    // Bỏ qua tải thêm để được đề xuất (tải nguồn cấp dữ liệu thông minh cùng lúc)
    if (sortBy === 'recommended') return;

    setLoadingMore(true);
    setError(null);
    loadingRef.current = true;

    try {
      // Sử dụng nguồn cấp dữ liệu thông thường cho các tùy chọn sắp xếp khác
      const limit = 15;
      const publishedData = await api(`/api/posts?page=${page}&limit=${limit}&q=${encodeURIComponent(q)}&status=published`);
      const newItems = sortPosts(publishedData.items, sortBy);

      setItems(prev => [...prev, ...newItems]);
      setHasMore(page < publishedData.pages);
      setPage(prev => prev + 1);
    } catch (error) {
      setError('Không thể tải thêm bài viết. Vui lòng thử lại.');
    } finally {
      setLoadingMore(false);
      loadingRef.current = false;
    }
  }, [page, hasMore, loadingMore, q, sortBy, sortPosts]);

  const loadAllRemaining = useCallback(async () => {
    if (loadingAll) return;

    setLoadingAll(true);
    setError(null);
    loadingRef.current = true;

    try {
      const allRemainingPosts = [];
      let currentPage = page;

      // Nếu chưa có hasMore, bắt đầu từ trang 2
      if (!hasMore && totalPages > 1) {
        currentPage = 2;
      }

      while (currentPage <= totalPages) {
        const publishedData = await api(`/api/posts?page=${currentPage}&limit=15&q=${encodeURIComponent(q)}&status=published`);
        const newItems = sortPosts(publishedData.items, sortBy);
        allRemainingPosts.push(...newItems);
        currentPage++;
      }

      setItems(prev => [...prev, ...allRemainingPosts]);
      setHasMore(false);
      setPage(totalPages + 1);
    } catch (error) {
      setError('Không thể tải tất cả bài viết. Vui lòng thử lại.');
    } finally {
      setLoadingAll(false);
      loadingRef.current = false;
    }
  }, [page, hasMore, totalPages, q, sortBy, sortPosts]);

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSortDropdown && !event.target.closest('.sort-dropdown')) {
        setShowSortDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSortDropdown]);

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
   * Xử lý tìm kiếm users và posts
   * @param {Event} e - Sự kiện gửi biểu mẫu (tùy chọn)
   * @param {string} query - Chuỗi truy vấn để tìm kiếm (tùy chọn, sử dụng topSearchQuery nếu không được cung cấp)
   * @param {boolean} saveToHistory - Có lưu vào lịch sử tìm kiếm hay không (mặc định: false cho tìm kiếm bị trả lại, true cho tìm kiếm rõ ràng)
   */
  async function handleSearch(e, query = null, saveToHistory = false) {
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
  }

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
    <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-md border border-gray-300 dark:border-neutral-600 overflow-hidden transition-colors duration-100">
      <div className="p-5">
        {/* Header skeleton */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gray-200 dark:bg-neutral-700 rounded-full animate-pulse"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse w-32"></div>
            <div className="h-3 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse w-20"></div>
          </div>
        </div>

        {/* Content skeleton */}
        <div className="space-y-2 mb-4">
          <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse w-4/5"></div>
          <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse w-3/5"></div>
        </div>

        {/* Image skeleton */}
        <div className="h-64 bg-gray-200 dark:bg-neutral-700 rounded-xl animate-pulse mb-4"></div>

        {/* Actions skeleton */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-neutral-600">
          <div className="flex space-x-6">
            <div className="h-8 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse w-16"></div>
            <div className="h-8 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse w-20"></div>
            <div className="h-8 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse w-18"></div>
          </div>
        </div>
      </div>
    </div>
  ), []);


  // ==================== RENDER ====================
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 transition-colors duration-100">
      {/* Accessible, SEO-friendly heading without affecting layout */}
      <h1 className="sr-only">Shiku – Mạng xã hội chia sẻ khoảnh khắc</h1>
      <p className="sr-only">Nơi chia sẻ câu chuyện hàng ngày, khám phá cộng đồng xung quanh bạn.</p>

      {/* Mobile Navbar - chỉ hiện trên mobile, fixed top */}
      <nav className="md:hidden fixed top-0 left-0 right-0 z-50" role="navigation" aria-label="Điều hướng chính">
        <Navbar user={user} setUser={setUser} darkMode={darkMode} setDarkMode={setDarkMode} />
      </nav>

      {/* Left Sidebar - ẩn trên mobile */}
      <aside role="complementary" aria-label="Menu điều hướng">
        <LeftSidebar user={user} setUser={setUser} />
      </aside>

      {/* Main Content Area với margin-left cho left sidebar */}
      <main className="pt-[64px] md:pt-16 lg:ml-64 min-h-screen" role="main">
        {/* Top Navigation Bar - ẩn trên mobile, hiện từ md trở lên - luôn fixed và visible */}
        <nav className="hidden md:flex fixed top-0 left-0 lg:left-64 right-0 h-16 bg-white dark:bg-neutral-800 border-b border-gray-300 dark:border-neutral-600 shadow-sm z-40" role="navigation" aria-label="Thanh tìm kiếm và điều hướng">
          <div className="w-full flex items-center h-full px-4 md:px-6 lg:px-8">
            {/* Search Input with Dropdown - Left side, takes available space */}
            <form onSubmit={handleTopSearch} className="flex-1 max-w-2xl mr-4">
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
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
                  className="w-full pl-12 pr-4 py-2.5 bg-neutral-100 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-full text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all text-sm"
                />
                {/* Search Dropdown */}
                {(searchFocused || topSearchQuery.trim() || historyEditing) && (
                  (searchResults.length > 0 || searchPosts.length > 0 || searchHistory.length > 0) && (
                    <div className="absolute left-0 top-full mt-1 w-full bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg shadow-lg dark:shadow-2xl z-50 max-h-80 overflow-y-auto custom-scrollbar">
                      {/* Lịch sử tìm kiếm / Gợi ý */}
                      {(!topSearchQuery.trim() || (topSearchQuery.trim() && searchResults.length === 0 && searchPosts.length === 0)) && searchHistory.length > 0 && (
                        <React.Fragment key="search-history">
                          <div className="flex items-center justify-between px-3 py-2 text-xs text-gray-500 dark:text-gray-400 bg-neutral-100 dark:bg-neutral-700">
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
                                className="flex items-center gap-3 px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer group border-b border-neutral-100 dark:border-neutral-600 last:border-b-0"
                                onMouseDown={() => {
                                  setTopSearchQuery(item.query);
                                  setTimeout(() => {
                                    handleSearch(null, item.query, true); // Save to history when clicking history item
                                  }, 0);
                                }}
                              >
                                <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-600 text-gray-500 dark:text-gray-400 flex items-center justify-center text-xs">•</div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900 dark:text-white text-sm truncate">{item.query}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{new Date(item.lastSearchedAt).toLocaleDateString('vi-VN')}</div>
                                </div>
                                {historyEditing && (
                                  <button
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      deleteHistoryItem(item.id);
                                    }}
                                    className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
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
                          <div className="h-px bg-neutral-100 dark:bg-neutral-700" />
                        </React.Fragment>
                      )}
                      {/* Kết quả user */}
                      {searchResults.length > 0 && (
                        <React.Fragment key="search-fragment">
                          <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 bg-neutral-100 dark:bg-neutral-700">Người dùng</div>
                          {searchResults.map(user => (
                            <div
                              key={user._id}
                              className="flex items-center gap-3 px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer border-b border-neutral-100 dark:border-neutral-600 last:border-b-0"
                              onClick={() => {
                                navigate(`/user/${user._id}`);
                                setSearchFocused(false);
                                setTopSearchQuery("");
                              }}
                            >
                              <img
                                src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&length=2&background=cccccc&color=222222`}
                                alt={user.name}
                                width={28}
                                height={28}
                                className="w-7 h-7 rounded-full flex-shrink-0"
                                loading="lazy"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                  <UserName user={user} maxLength={20} />
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</div>
                              </div>
                            </div>
                          ))}
                        </React.Fragment>
                      )}
                      {/* Kết quả bài viết: chỉ hiện nếu không có user nào khớp */}
                      {searchResults.length === 0 && searchPosts.length > 0 && (
                        <React.Fragment key="search-fragment">
                          <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 bg-neutral-100 dark:bg-neutral-700">Bài viết</div>
                          {searchPosts.map(post => (
                            <div
                              key={post._id}
                              className="flex items-center gap-3 px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer border-b border-neutral-100 dark:border-neutral-600 last:border-b-0"
                              onClick={() => {
                                navigate(`/post/${post.slug || post._id}`);
                                setSearchFocused(false);
                                setTopSearchQuery("");
                              }}
                            >
                              {renderPostPreview(post, "w-7 h-7 rounded flex-shrink-0 object-cover")}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 dark:text-white text-sm truncate">{post.title}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{post.author?.name || ''}</div>
                              </div>
                            </div>
                          ))}
                        </React.Fragment>
                      )}
                      {searchLoading && (
                        <div className="px-3 py-3 text-gray-500 dark:text-gray-400 text-sm text-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 dark:border-gray-300 mx-auto mb-1"></div>
                          <span className="dark:text-gray-300">Đang tìm kiếm...</span>
                        </div>
                      )}
                      {topSearchQuery.trim() && searchResults.length === 0 && searchPosts.length === 0 && !searchLoading && (
                        <div className="px-3 py-3 text-gray-500 dark:text-gray-400 text-sm text-center">
                          <span className="dark:text-gray-300">Không tìm thấy kết quả nào</span>
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            </form>

              {/* Add New Post Button - Giữ nguyên vị trí */}
            <button
              onClick={() => {
                // Trigger PostCreator modal via ref
                if (postCreatorRef.current && typeof postCreatorRef.current.openModal === 'function') {
                  postCreatorRef.current.openModal();
                } else {
                  // Fallback: click hidden trigger button
                  const triggerBtn = document.querySelector('[data-post-creator-trigger]');
                  if (triggerBtn) {
                    triggerBtn.click();
                  }
                }
              }}
              className="px-4 md:px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-full font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 text-sm whitespace-nowrap flex-shrink-0 active:scale-[0.98]"
              aria-label="Đăng bài mới"
            >
              <Plus size={18} strokeWidth={2.5} className="text-white dark:text-black" />
              <span>Đăng bài mới</span>
            </button>

            {/* Spacer - Đẩy các icons sang bên phải */}
            <div className="flex-1"></div>

            {/* User Icons - Đẩy sang bên phải */}
            {user && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Dark Mode Toggle */}
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
                
                <ChatDropdown onOpenChat={addChatPopup} />
                <NotificationBell user={user} />
                <Link
                  to="/settings"
                  className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  title="Cài đặt"
                  aria-label="Cài đặt"
                >
                  <Settings size={20} className="text-gray-600 dark:text-gray-300" />
                </Link>
                <Link
                  to={`/user/${user._id}`}
                  className="ml-0.5"
                >
                  <img
                    src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&length=2&background=cccccc&color=222222&size=40`}
                    alt={user.name}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover border-2 border-neutral-200 dark:border-neutral-600"
                    loading="lazy"
                  />
                  </Link>
                </div>
              )}
          </div>
        </nav>

        {/* Feed Bar - Trải dài toàn bộ chiều rộng - Sticky trên mobile (dưới navbar), static trên desktop, sát navbar trên desktop */}
        <div className="sticky md:static top-[64px] md:top-0 z-30 px-3 sm:px-4 md:px-6 lg:px-8 py-2 md:py-2.5 border-b border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 backdrop-blur-sm bg-opacity-95 dark:bg-opacity-100 md:bg-opacity-100 md:dark:bg-opacity-100 md:backdrop-blur-none transition-colors duration-100">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 overflow-hidden">
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 dark:text-white whitespace-nowrap flex-shrink-0">Bảng tin</h2>
              {items.length > 0 && (
                <span className="hidden sm:inline text-xs sm:text-sm text-gray-600 dark:text-gray-300 bg-neutral-100 dark:bg-neutral-700 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full font-medium whitespace-nowrap flex-shrink-0">
                  {items.length} bài viết
                </span>
              )}
            </div>

            {/* Mobile: Nút đăng bài mới - chỉ hiển thị trên mobile */}
            <div className="md:hidden flex-shrink-0">
              <button
                onClick={() => {
                  // Trigger PostCreator modal via ref
                  if (postCreatorRef.current && typeof postCreatorRef.current.openModal === 'function') {
                    postCreatorRef.current.openModal();
                  } else {
                    // Fallback: click hidden trigger button
                    const triggerBtn = document.querySelector('[data-post-creator-trigger]');
                    if (triggerBtn) {
                      triggerBtn.click();
                    }
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

            <div className="relative sort-dropdown flex-shrink-0">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-lg sm:rounded-xl transition-all duration-200 whitespace-nowrap touch-manipulation min-h-[36px] sm:min-h-[40px]"
                aria-label={`Sắp xếp: ${getSortLabel(sortBy)}`}
                aria-expanded={showSortDropdown}
                aria-haspopup="true"
              >
                <span className="flex-shrink-0">{getSortIcon(sortBy)}</span>
                <span className="whitespace-nowrap">{getSortLabel(sortBy)}</span>
                <ArrowUpDown size={12} className="sm:w-[14px] sm:h-[14px] opacity-60 dark:opacity-70 flex-shrink-0 text-gray-600 dark:text-gray-300" />
              </button>

              {showSortDropdown && (
                <div className="absolute right-0 top-full mt-2 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-600 rounded-xl sm:rounded-2xl shadow-2xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 py-2 min-w-[180px] sm:min-w-[220px] w-auto max-w-[90vw]">
                  {[
                    { key: 'recommended', label: 'Đề xuất', icon: <Sparkles size={14} className="text-gray-600 dark:text-gray-300 flex-shrink-0" />, badge: 'AI' },
                    { key: 'newest', label: 'Mới nhất', icon: <Clock size={14} className="text-gray-600 dark:text-gray-300 flex-shrink-0" /> },
                    { key: 'oldest', label: 'Cũ nhất', icon: <Clock size={14} className="rotate-180 text-gray-600 dark:text-gray-300 flex-shrink-0" /> },
                    { key: 'mostViewed', label: 'Xem nhiều nhất', icon: <Eye size={14} className="text-gray-600 dark:text-gray-300 flex-shrink-0" /> },
                    { key: 'leastViewed', label: 'Xem ít nhất', icon: <Eye size={14} className="opacity-50 text-gray-600 dark:text-gray-400 flex-shrink-0" /> }
                  ].map(option => (
                    <button
                      key={option.key}
                      onClick={() => {
                        setSortBy(option.key);
                        setShowSortDropdown(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left hover:bg-neutral-200 dark:hover:bg-neutral-600 active:bg-neutral-300 dark:active:bg-neutral-500 flex items-center justify-between gap-3 transition-colors ${sortBy === option.key ? 'bg-neutral-100 dark:bg-neutral-700 text-gray-900 dark:text-white font-semibold' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      aria-label={`Sắp xếp theo ${option.label}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="flex-shrink-0">{option.icon}</span>
                        <span className="text-sm font-medium whitespace-nowrap">{option.label}</span>
                      </div>
                      {option.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-blue-600 dark:bg-blue-500 text-white rounded-full font-bold flex-shrink-0 ml-2">
                          {option.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

          {/* Content Area - 2 Columns */}
          <div className="px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6">
            <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 sm:gap-5 md:gap-6">
              {/* Center Column - Main Feed */}
              <div className="space-y-3 sm:space-y-4 min-w-0">
                {/* Stories Section */}
                <Stories user={user} />

                {/* Post Creator - luôn hiển thị input, click để mở modal */}
                <div ref={postCreatorWrapperRef} className="mb-2 sm:mb-4">
                  <PostCreator user={user} ref={postCreatorRef} />
                </div>

                {/* Posts Feed */}
                {loading ? (
                  <div className="space-y-3 sm:space-y-4">
                    {[1, 2, 3].map(i => (
                      <LoadingSkeleton key={i} />
                    ))}
                  </div>
                ) : error ? (
                  <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center transition-colors duration-100 shadow-md">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-red-100 dark:bg-red-800/50 rounded-full flex items-center justify-center">
                      <TrendingUp size={20} className="sm:w-6 sm:h-6 text-red-400" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-red-900 dark:text-red-300 mb-2">Có lỗi xảy ra</h3>
                    <p className="text-sm sm:text-base text-red-600 dark:text-red-400 mb-4 break-words px-2">{error}</p>
                    <button
                      onClick={loadInitial}
                      className="px-4 sm:px-6 py-2 sm:py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-semibold text-sm sm:text-base hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all duration-200 touch-manipulation shadow-md hover:shadow-lg min-h-[44px]"
                      aria-label="Thử tải lại bài viết"
                    >
                      Thử lại
                    </button>
                  </div>
                ) : items.length > 0 ? (
                  <div className="space-y-3 sm:space-y-4">
                    {items.map((post, index) => {
                      const isLastPost = index === items.length - 1;

                      return (
                        <div
                          key={post._id}
                          ref={isLastPost ? lastPostElementRef : null}
                          className="hover:shadow-lg transition-all duration-200"
                        >
                          <PostCard
                            post={post}
                            user={user}
                            onUpdate={loadInitial}
                            hidePublicIcon={false}
                            hideActionsMenu={true}
                            isSaved={savedMap[post._id]}
                            onSavedChange={updateSavedState}
                            skipSavedStatusFetch={true}
                          />
                        </div>
                      );
                    })}

                    {/* Loading more indicator */}
                    {loadingMore && (
                      <div className="flex justify-center py-6 sm:py-8">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                          <Loader2 size={18} className="sm:w-5 sm:h-5 animate-spin text-gray-600 dark:text-gray-300" />
                          <span className="font-medium">Đang tải thêm bài viết...</span>
                        </div>
                      </div>
                    )}

                    {/* Load more buttons */}
                    {!loadingMore && !loadingAll && hasMore && (
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center py-3 sm:py-4">
                        <button
                          onClick={loadMore}
                          className="px-4 sm:px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-semibold text-sm sm:text-base hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all duration-200 touch-manipulation shadow-md hover:shadow-lg min-h-[44px]"
                          aria-label="Tải thêm 15 bài viết"
                        >
                          Tải thêm 15 bài viết
                        </button>
                        {totalPages - page + 1 > 1 && (
                          <button
                            onClick={loadAllRemaining}
                            className="px-4 sm:px-6 py-2.5 bg-neutral-700 dark:bg-neutral-600 text-white rounded-xl font-semibold text-sm sm:text-base hover:bg-neutral-800 dark:hover:bg-neutral-500 transition-all duration-200 touch-manipulation shadow-md min-h-[44px]"
                            aria-label="Tải tất cả bài viết còn lại"
                          >
                            <span className="hidden sm:inline">Tải tất cả ({totalPages - page + 1} trang còn lại)</span>
                            <span className="sm:hidden">Tải tất cả ({totalPages - page + 1})</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Load all button - hiển thị ngay từ đầu nếu có nhiều bài viết */}
                    {!loadingMore && !loadingAll && !hasMore && totalPages > 1 && (
                      <div className="flex justify-center py-3 sm:py-4">
                        <button
                          onClick={loadAllRemaining}
                          className="px-4 sm:px-6 py-2.5 bg-neutral-700 dark:bg-neutral-600 text-white rounded-xl font-semibold text-sm sm:text-base hover:bg-neutral-800 dark:hover:bg-neutral-500 transition-all duration-200 touch-manipulation shadow-md min-h-[44px]"
                          aria-label={`Tải tất cả bài viết (${totalPages} trang)`}
                        >
                          <span className="hidden sm:inline">Tải tất cả bài viết ({totalPages} trang)</span>
                          <span className="sm:hidden">Tải tất cả ({totalPages})</span>
                        </button>
                      </div>
                    )}

                    {/* Loading all indicator */}
                    {loadingAll && (
                      <div className="flex justify-center py-6 sm:py-8">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                          <Loader2 size={18} className="sm:w-5 sm:h-5 animate-spin text-gray-600 dark:text-gray-300" />
                          <span className="font-medium">Đang tải tất cả bài viết...</span>
                        </div>
                      </div>
                    )}

                    {/* End of feed message */}
                    {!hasMore && items.length > 0 && (
                      <div className="text-center py-6 sm:py-8">
                        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-full text-gray-600 dark:text-gray-300 text-xs sm:text-sm font-medium">
                          <span>✨</span>
                          <span>Bạn đã xem hết tất cả bài viết!</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-neutral-800 rounded-xl sm:rounded-2xl shadow-md dark:shadow-lg border border-gray-300 dark:border-neutral-600 p-6 sm:p-12 text-center transition-colors duration-100">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-gray-100 dark:bg-neutral-700 rounded-full flex items-center justify-center">
                      <TrendingUp size={20} className="sm:w-6 sm:h-6 text-gray-400 dark:text-gray-400" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">Chưa có bài viết nào</h3>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">Hãy là người đầu tiên chia sẻ điều gì đó thú vị!</p>
                  </div>
                )}
              </div>

              {/* Right Sidebar - Friend Suggestions, Profile Activity, Upcoming Events */}
              <aside className="hidden xl:block" role="complementary" aria-label="Gợi ý bạn bè và hoạt động">
                <div className="sticky top-20">
                  <RightSidebar user={user} />
                </div>
              </aside>
            </div>
          </div>
      </main>

      {/* Chat Popup Manager */}
      <ChatPopupManager
        conversations={openPopups}
        onCloseConversation={closeChatPopup}
      />
    </div>
  );
}
