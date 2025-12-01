import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

/**
 * Custom hook to load trending tags with React Query caching
 * Tối ưu performance bằng cách:
 * - Reduce limit from 100 to 30 posts
 * - Cache for 10 minutes (tags don't change frequently)
 * - Automatic retry and error handling
 * 
 * @param {number} limit - Number of tags to fetch (default: 3)
 * @returns {Object} { trendingTags, isLoading, error, refetch }
 */
export function useTrendingTags(limit = 3) {
  return useQuery({
    queryKey: ['trendingTags', limit],
    queryFn: async () => {
      // OPTIMIZATION: Only load 30 recent posts instead of 100
      // Still enough to determine trending tags
      const response = await api('/api/posts?limit=30&status=published');
      
      // Count tag frequency
      const tagCount = {};
      response.items?.forEach(post => {
        if (post.tags && Array.isArray(post.tags)) {
          post.tags.forEach(tag => {
            if (tag && tag.trim()) {
              const normalizedTag = tag.trim().toLowerCase();
              tagCount[normalizedTag] = (tagCount[normalizedTag] || 0) + 1;
            }
          });
        }
      });

      // Sort and get top tags
      const sortedTags = Object.entries(tagCount)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

      return sortedTags;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - tags don't change frequently
    cacheTime: 15 * 60 * 1000, // 15 minutes - keep longer in cache
    retry: 1, // Retry 1 time if failed   
  });
}

