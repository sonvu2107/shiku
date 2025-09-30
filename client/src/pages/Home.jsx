import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";
import PostCard from "../components/PostCard";
import PostCreator from "../components/PostCreator";
import Stories from "../components/Stories";
import Shortcuts from "../components/Shortcuts";
import OnlineFriends from "../components/OnlineFriends";
import { ArrowUpDown, Clock, Eye, TrendingUp, Loader2 } from "lucide-react";

/**
 * Home - Trang chủ mạng xã hội với bố cục 3 cột
 * - Sidebar trái: Shortcuts (menu nhanh)
 * - Cột giữa: Stories, PostCreator, Posts feed với infinite scroll
 * - Sidebar phải: OnlineFriends (bạn bè online)
 */
export default function Home({ user }) {
  // ==================== STATE MANAGEMENT ====================
  
  // Posts data
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [error, setError] = useState(null);
  
  // Search and sorting
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const [sortBy, setSortBy] = useState('newest');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  
  // Infinite scroll
  const observer = useRef();
  const loadingRef = useRef(false);

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
  }, [hasMore]);

  // ==================== EFFECTS ====================
  
  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    setTotalPages(0);
    setError(null);
    loadingRef.current = false;
    loadInitial();
  }, [q, user, sortBy]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSortDropdown && !event.target.closest('.sort-dropdown')) {
        setShowSortDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSortDropdown]);

  useEffect(() => {
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, []);

  // ==================== API CALLS ====================
  
  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    loadingRef.current = true;
    
    try {
      const limit = 100; // Giới hạn bài viết 
      const publishedData = await api(`/api/posts?page=1&limit=${limit}&q=${encodeURIComponent(q)}&status=published`);
      let allItems = publishedData.items;

      // Load private posts if user is logged in
      if (user) {
        try {
          const privateData = await api(`/api/posts?page=1&limit=${limit}&status=private&author=${user._id}`);
          allItems = [...privateData.items, ...allItems];
        } catch (privateError) {
          // Silent handling for private posts loading error
        }
      }

      // Apply sorting
      allItems = sortPosts(allItems, sortBy);

      setItems(allItems);
      setTotalPages(publishedData.pages);
      setHasMore(publishedData.pages > 1);
      setPage(2);
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
  }, [page, hasMore, loadingMore, q, sortBy]);

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
  }, [page, hasMore, loadingAll, totalPages, q, sortBy]);

  // ==================== HELPER FUNCTIONS ====================
  
  const sortPosts = useCallback((posts, sortType) => {
    const sortedPosts = [...posts];

    switch (sortType) {
      case 'newest':
        return sortedPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      case 'oldest':
        return sortedPosts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'mostViewed':
        return sortedPosts.sort((a, b) => (b.views || 0) - (a.views || 0));
      case 'leastViewed':
        return sortedPosts.sort((a, b) => (a.views || 0) - (b.views || 0));
      default:
        return sortedPosts;
    }
  }, []);

  const getSortIcon = useCallback((type) => {
    switch (type) {
      case 'newest': return <Clock size={16} />;
      case 'oldest': return <Clock size={16} className="rotate-180" />;
      case 'mostViewed': return <Eye size={16} />;
      case 'leastViewed': return <Eye size={16} className="opacity-50" />;
      default: return <TrendingUp size={16} />;
    }
  }, []);

  const getSortLabel = useCallback((type) => {
    const labels = {
      newest: 'Mới nhất',
      oldest: 'Cũ nhất',
      mostViewed: 'Xem nhiều nhất',
      leastViewed: 'Xem ít nhất'
    };
    return labels[type] || 'Sắp xếp';
  }, []);

  // ==================== LOADING SKELETON ====================
  
  const LoadingSkeleton = useCallback(() => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4">
        {/* Header skeleton */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
            <div className="h-3 bg-gray-200 rounded animate-pulse w-20"></div>
          </div>
        </div>

        {/* Content skeleton */}
        <div className="space-y-2 mb-4">
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-4/5"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/5"></div>
        </div>

        {/* Image skeleton */}
        <div className="h-64 bg-gray-200 rounded-lg animate-pulse mb-4"></div>

        {/* Actions skeleton */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex space-x-6">
            <div className="h-8 bg-gray-200 rounded animate-pulse w-16"></div>
            <div className="h-8 bg-gray-200 rounded animate-pulse w-20"></div>
            <div className="h-8 bg-gray-200 rounded animate-pulse w-18"></div>
          </div>
        </div>
      </div>
    </div>
  ), []);

  // ==================== RENDER ====================
  return (
    <div className="min-h-screen bg-gray-50 pt-16 sm:pt-20">
      {/* Accessible, SEO-friendly heading without affecting layout */}
      <h1 className="sr-only">Shiku - Mạng xã hội hiện đại kết nối bạn bè</h1>
      <p className="sr-only">Shiku là nơi bạn có thể chia sẻ khoảnh khắc, kết nối bạn bè, tham gia nhóm và sự kiện.</p>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">Bảng tin</h2>
              {items.length > 0 && (
                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  {items.length} bài viết
                </span>
              )}
            </div>

            <div className="relative sort-dropdown">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 touch-manipulation"
              >
                {getSortIcon(sortBy)}
                <span className="hidden sm:inline">{getSortLabel(sortBy)}</span>
                <ArrowUpDown size={14} className="opacity-60" />
              </button>

              {showSortDropdown && (
                <div className="absolute right-0 top-full mt-2 w-48 sm:w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1">
                  {[
                    { key: 'newest', label: 'Mới nhất', icon: <Clock size={14} /> },
                    { key: 'oldest', label: 'Cũ nhất', icon: <Clock size={14} className="rotate-180" /> },
                    { key: 'mostViewed', label: 'Xem nhiều nhất', icon: <Eye size={14} /> },
                    { key: 'leastViewed', label: 'Xem ít nhất', icon: <Eye size={14} className="opacity-50" /> }
                  ].map(option => (
                    <button
                      key={option.key}
                      onClick={() => {
                        setSortBy(option.key);
                        setShowSortDropdown(false);
                      }}
                      className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-left hover:bg-gray-50 flex items-center gap-2 sm:gap-3 transition-colors touch-manipulation ${
                        sortBy === option.key ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-500' : 'text-gray-700'
                      }`}
                    >
                      {option.icon}
                      <span className="text-xs sm:text-sm font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout - 3 Columns */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar - Shortcuts (ẩn trên mobile) */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24">
              <Shortcuts user={user} />
            </div>
          </div>

          {/* Center Column - Main Feed (luôn hiển thị) */}
          <div className="flex-1 w-full lg:max-w-2xl lg:mx-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Stories Section */}
            <div className="border-b border-gray-200">
              <Stories user={user} />
            </div>

            {/* Post Creator */}
            <div className="border-b border-gray-200">
              <PostCreator user={user} />
            </div>

            {/* Posts Feed */}
            {loading ? (
              <div className="space-y-6">
                {[1, 2, 3].map(i => (
                  <LoadingSkeleton key={i} />
                ))}
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                  <TrendingUp size={24} className="text-red-400" />
                </div>
                <h3 className="text-lg font-medium text-red-900 mb-2">Có lỗi xảy ra</h3>
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={loadInitial}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors touch-manipulation"
                >
                  Thử lại
                </button>
              </div>
            ) : items.length > 0 ? (
              <div className="space-y-0">
                {items.map((post, index) => {
                  const isLastPost = index === items.length - 1;
                  
                  return (
                    <div
                      key={post._id}
                      ref={isLastPost ? lastPostElementRef : null}
                      className={`${index < items.length - 1 ? 'border-b border-gray-200' : ''} hover:bg-gray-50 transition-colors duration-200`}
                    >
                      <PostCard post={post} user={user} onUpdate={loadInitial} />
                    </div>
                  );
                })}

                {/* Loading more indicator */}
                {loadingMore && (
                  <div className="flex justify-center py-8">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Loader2 size={20} className="animate-spin" />
                      <span>Đang tải thêm bài viết...</span>
                    </div>
                  </div>
                )}

                {/* Load more buttons */}
                {!loadingMore && !loadingAll && hasMore && (
                  <div className="flex flex-col sm:flex-row gap-3 justify-center py-4">
                    <button
                      onClick={loadMore}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors touch-manipulation"
                    >
                      Tải thêm 15 bài viết
                    </button>
                    {totalPages - page + 1 > 1 && (
                      <button
                        onClick={loadAllRemaining}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors touch-manipulation"
                      >
                        Tải tất cả ({totalPages - page + 1} trang còn lại)
                      </button>
                    )}
                  </div>
                )}

                {/* Load all button - hiển thị ngay từ đầu nếu có nhiều bài viết */}
                {!loadingMore && !loadingAll && !hasMore && totalPages > 1 && (
                  <div className="flex justify-center py-4">
                    <button
                      onClick={loadAllRemaining}
                      className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors touch-manipulation"
                    >
                      Tải tất cả bài viết ({totalPages} trang)
                    </button>
                  </div>
                )}

                {/* Loading all indicator */}
                {loadingAll && (
                  <div className="flex justify-center py-8">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Loader2 size={20} className="animate-spin" />
                      <span>Đang tải tất cả bài viết...</span>
                    </div>
                  </div>
                )}

                {/* End of feed message */}
                {!hasMore && items.length > 0 && (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-gray-500 text-sm">
                      <span>✨</span>
                      <span>Bạn đã xem hết tất cả bài viết!</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <TrendingUp size={24} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có bài viết nào</h3>
                <p className="text-gray-500">Hãy là người đầu tiên chia sẻ điều gì đó thú vị!</p>
              </div>
            )}
            </div>
          </div>

          {/* Right Sidebar - Online Friends (ẩn trên mobile, hiện từ lg trở lên) */}
          <div className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-24">
              <OnlineFriends user={user} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}