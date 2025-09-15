import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";
import PostCard from "../components/PostCard";
import PostCreator from "../components/PostCreator";
import { ArrowUpDown, Clock, Eye, TrendingUp, Loader2 } from "lucide-react";

/**
 * Home - Trang chủ hiển thị feed các bài viết
 * Hỗ trợ infinite scroll, sorting, search và hiển thị cả public + private posts
 * @param {Object} user - Thông tin user hiện tại
 */
export default function Home({ user }) {
  // ==================== STATE MANAGEMENT ====================
  
  // Posts data
  const [items, setItems] = useState([]); // Danh sách bài viết
  const [page, setPage] = useState(1); // Trang hiện tại cho pagination
  const [hasMore, setHasMore] = useState(true); // Còn posts để load không
  const [totalPages, setTotalPages] = useState(0); // Tổng số trang
  
  // Loading states
  const [loading, setLoading] = useState(true); // Loading initial
  const [loadingMore, setLoadingMore] = useState(false); // Loading more posts
  const [loadingAll, setLoadingAll] = useState(false); // Loading all posts
  const [error, setError] = useState(null); // Error state
  
  // Search and sorting
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || ''; // Search query từ URL
  const [sortBy, setSortBy] = useState('newest'); // Kiểu sort hiện tại
  const [showSortDropdown, setShowSortDropdown] = useState(false); // Hiện dropdown sort
  
  // Infinite scroll
  const observer = useRef(); // IntersectionObserver cho infinite scroll
  const loadingRef = useRef(false); // Prevent duplicate requests

  // ==================== INFINITE SCROLL ====================
  
  /**
   * Ref callback cho element cuối cùng để implement infinite scroll
   * Sử dụng IntersectionObserver để detect khi user scroll đến cuối
   */
  const lastPostElementRef = useCallback(node => {
    if (loadingRef.current || !hasMore) return; // Prevent duplicate requests
    
    if (observer.current) observer.current.disconnect(); // Disconnect observer cũ
    
    // Tạo observer mới với optimized settings
    observer.current = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
          loadMore(); // Load thêm posts khi element cuối xuất hiện
        }
      },
      {
        root: null,
        rootMargin: '100px', // Load 100px before element comes into view
        threshold: 0.1
      }
    );
    
    if (node) observer.current.observe(node); // Observe element mới
  }, [hasMore]);

  // ==================== EFFECTS ====================
  
  /**
   * Reset và reload posts khi search query, user, hoặc sort thay đổi
   */
  useEffect(() => {
    setItems([]); // Reset danh sách posts
    setPage(1); // Reset về trang 1
    setHasMore(true); // Reset hasMore flag
    setTotalPages(0); // Reset total pages
    setError(null); // Clear any errors
    loadingRef.current = false; // Reset loading ref
    loadInitial(); // Load posts mới
  }, [q, user, sortBy]);

  /**
   * Đóng sort dropdown khi click outside
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSortDropdown && !event.target.closest('.sort-dropdown')) {
        setShowSortDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSortDropdown]);

  /**
   * Cleanup observer on unmount
   */
  useEffect(() => {
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    loadingRef.current = true;
    
    try {
      // Balanced approach: Load enough posts for good browsing experience
      const limit = 50; // Increased from 20 to 50 for better content discovery
      const publishedData = await api(`/api/posts?page=1&limit=${limit}&q=${encodeURIComponent(q)}&status=published`);
      let allItems = publishedData.items;

      // If user is logged in, also load their private posts and merge
      if (user) {
        try {
          const privateData = await api(`/api/posts?page=1&limit=${limit}&status=private&author=${user._id}`);
          allItems = [...privateData.items, ...allItems];
        } catch (privateError) {
          console.log('Cannot load private posts:', privateError.message);
        }
      }

      // Apply sorting
      allItems = sortPosts(allItems, sortBy);

      setItems(allItems);
      setTotalPages(publishedData.pages);
      setHasMore(publishedData.pages > 1);
      setPage(2); // Next page to load
    } catch (error) {
      console.error('Error loading posts:', error);
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
      // Balanced batch size for good browsing experience
      const limit = 25; // Increased from 15 to 25 for better content discovery
      const publishedData = await api(`/api/posts?page=${page}&limit=${limit}&q=${encodeURIComponent(q)}&status=published`);
      const newItems = sortPosts(publishedData.items, sortBy);

      setItems(prev => [...prev, ...newItems]);
      setHasMore(page < publishedData.pages);
      setPage(prev => prev + 1);
    } catch (error) {
      console.error('Error loading more posts:', error);
      setError('Không thể tải thêm bài viết. Vui lòng thử lại.');
    } finally {
      setLoadingMore(false);
      loadingRef.current = false;
    }
  }, [page, hasMore, loadingMore, q, sortBy]);

  // Load all remaining posts at once
  const loadAllRemaining = useCallback(async () => {
    if (loadingAll || !hasMore) return;

    setLoadingAll(true);
    setError(null);
    loadingRef.current = true;
    
    try {
      const allRemainingPosts = [];
      let currentPage = page;
      
      // Load all remaining pages
      while (currentPage <= totalPages) {
        const publishedData = await api(`/api/posts?page=${currentPage}&limit=25&q=${encodeURIComponent(q)}&status=published`);
        const newItems = sortPosts(publishedData.items, sortBy);
        allRemainingPosts.push(...newItems);
        currentPage++;
      }

      setItems(prev => [...prev, ...allRemainingPosts]);
      setHasMore(false);
      setPage(totalPages + 1);
    } catch (error) {
      console.error('Error loading all posts:', error);
      setError('Không thể tải tất cả bài viết. Vui lòng thử lại.');
    } finally {
      setLoadingAll(false);
      loadingRef.current = false;
    }
  }, [page, hasMore, loadingAll, totalPages, q, sortBy]);

  // Function to sort posts - memoized for performance
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

  // Memoized sort functions for performance
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

  // Memoized loading skeleton component
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

  {/* Sticky Header */ }
  return (
    <div className="min-h-screen bg-gray-50 pt-16 sm:pt-20">
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">Bảng tin</h1>
              {items.length > 0 && (
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {items.length} bài viết
                </span>
              )}
            </div>

            <div className="relative sort-dropdown">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                {getSortIcon(sortBy)}
                <span className="hidden sm:inline">{getSortLabel(sortBy)}</span>
                <ArrowUpDown size={14} className="opacity-60" />
              </button>

              {showSortDropdown && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1">
                  {[
                    { key: 'newest', label: 'Mới nhất', icon: <Clock size={16} /> },
                    { key: 'oldest', label: 'Cũ nhất', icon: <Clock size={16} className="rotate-180" /> },
                    { key: 'mostViewed', label: 'Xem nhiều nhất', icon: <Eye size={16} /> },
                    { key: 'leastViewed', label: 'Xem ít nhất', icon: <Eye size={16} className="opacity-50" /> }
                  ].map(option => (
                    <button
                      key={option.key}
                      onClick={() => {
                        setSortBy(option.key);
                        setShowSortDropdown(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors ${sortBy === option.key ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-500' : 'text-gray-700'
                        }`}
                    >
                      {option.icon}
                      <span className="text-sm font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6">

        {/* Post Creator */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-2 overflow-hidden">
          <PostCreator user={user} />
        </div>

        {/* Initial Loading */}
        {loading && (
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <LoadingSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <TrendingUp size={24} className="text-red-400" />
            </div>
            <h3 className="text-lg font-medium text-red-900 mb-2">Có lỗi xảy ra</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadInitial}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Posts Feed */}
        {!loading && !error && (
          <>
            {items.length > 0 ? (
              <div className="space-y-6">
                {items.map((post, index) => {
                  const isLastPost = index === items.length - 1;
                  
                  return (
                    <div
                      key={post._id}
                      ref={isLastPost ? lastPostElementRef : null}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden"
                    >
                      <PostCard post={post} onUpdate={loadInitial} />
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
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Tải thêm 25 bài viết
                    </button>
                    {totalPages - page + 1 > 1 && (
                      <button
                        onClick={loadAllRemaining}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Tải tất cả ({totalPages - page + 1} trang còn lại)
                      </button>
                    )}
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
          </>
        )}
      </div>
    </div>
  );
}