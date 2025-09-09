import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";
import PostCard from "../components/PostCard";
import PostCreator from "../components/PostCreator";
import { ArrowUpDown, Clock, Eye, TrendingUp, Loader2 } from "lucide-react";

export default function Home({ user }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const [sortBy, setSortBy] = useState('newest');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const observer = useRef();

  // Ref for the last post element (for intersection observer)
  const lastPostElementRef = useCallback(node => {
    if (loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    });
    if (node) observer.current.observe(node);
  }, [loadingMore, hasMore]);

  useEffect(() => {
    // Reset when search query or sort changes
    setItems([]);
    setPage(1);
    setHasMore(true);
    loadInitial();
  }, [q, user, sortBy]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSortDropdown && !event.target.closest('.sort-dropdown')) {
        setShowSortDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSortDropdown]);

  async function loadInitial() {
    setLoading(true);
    try {
      const publishedData = await api(`/api/posts?page=1&limit=10&q=${encodeURIComponent(q)}&status=published`);
      let allItems = publishedData.items;
      
      // If user is logged in, also load their private posts and merge
      if (user) {
        try {
          const privateData = await api(`/api/posts?page=1&limit=100&status=private&author=${user._id}`);
          allItems = [...privateData.items, ...allItems];
        } catch (privateError) {
          console.log('Cannot load private posts:', privateError.message);
        }
      }
      
      // Apply sorting
      allItems = sortPosts(allItems, sortBy);
      
      setItems(allItems);
      setHasMore(publishedData.pages > 1);
      setPage(2); // Next page to load
    } catch (error) {
      console.error('Error loading posts:', error);
      setItems([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      const publishedData = await api(`/api/posts?page=${page}&limit=10&q=${encodeURIComponent(q)}&status=published`);
      const newItems = sortPosts(publishedData.items, sortBy);
      
      setItems(prev => [...prev, ...newItems]);
      setHasMore(page < publishedData.pages);
      setPage(prev => prev + 1);
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      setLoadingMore(false);
    }
  }

  // Function to sort posts
  const sortPosts = (posts, sortType) => {
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
  };

  const getSortIcon = (type) => {
    switch (type) {
      case 'newest': return <Clock size={16} />;
      case 'oldest': return <Clock size={16} className="rotate-180" />;
      case 'mostViewed': return <Eye size={16} />;
      case 'leastViewed': return <Eye size={16} className="opacity-50" />;
      default: return <TrendingUp size={16} />;
    }
  };

  const getSortLabel = (type) => {
    const labels = {
      newest: 'Mới nhất',
      oldest: 'Cũ nhất', 
      mostViewed: 'Xem nhiều nhất',
      leastViewed: 'Xem ít nhất'
    };
    return labels[type] || 'Sắp xếp';
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
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
  );

      {/* Sticky Header */}
  return (
  <div className="min-h-screen bg-gray-50 pt-16">
  <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">Bảng tin</h1>
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
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors ${
                        sortBy === option.key ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-500' : 'text-gray-700'
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
      <div className="max-w-2xl mx-auto px-4 py-6">
        
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

        {/* Posts Feed */}
        {!loading && (
          <>
            {items.length > 0 ? (
              <div className="space-y-6">
                {items.map((post, index) => {
                  // Add ref to last element for infinite scroll
                  if (index === items.length - 1) {
                    return (
                      <div 
                        key={post._id} 
                        ref={lastPostElementRef}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden"
                      >
                        <PostCard post={post} />
                      </div>
                    );
                  } else {
                    return (
                      <div 
                        key={post._id} 
                        className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden"
                      >
                        <PostCard post={post} />
                      </div>
                    );
                  }
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
                
                {/* End of feed message */}
                {!hasMore && items.length > 0 && (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-gray-500 text-sm">
                      <span></span>
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