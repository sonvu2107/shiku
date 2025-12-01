import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

/**
 * Custom hook to load user statistics with React Query caching   
 * Optimize performance by:
 * - Automatic caching with staleTime
 * - Retry and error handling  
 * - Deduplication requests
 * 
 * @param {string} userId - User ID to load stats
 * @returns {Object} { stats, isLoading, error, refetch }
 */
export function useUserStats(userId) {
  return useQuery({
    queryKey: ['userStats', userId],
    queryFn: async () => {
      if (!userId) return null;

      // Load user profile and stats in one request
      const data = await api(`/api/users/${userId}`);
      const friendCount = Array.isArray(data.user?.friends) ? data.user.friends.length : 0;
      
      let postCount = 0;
      let likeCount = 0;
      let viewCount = 0;
      

      // Load post count from analytics API or fallback
      try {
        const analyticsRes = await api(`/api/posts/analytics?period=30d`);
        if (analyticsRes?.analytics) {
          postCount = analyticsRes.analytics.totalPosts || 0;
          
          // Only use totalLikes/totalViews if value > 0
          if (analyticsRes.analytics.totalLikes > 0) {
            likeCount = analyticsRes.analytics.totalLikes;
          }
          if (analyticsRes.analytics.totalViews > 0) {
            viewCount = analyticsRes.analytics.totalViews;
          }
        }
      } catch (err) {
        // Fallback: load postCount from pagination
        try {
          const [publicRes, privateRes] = await Promise.all([
            api(`/api/posts?author=${userId}&status=published&limit=1`).catch(() => null),
            api(`/api/posts?author=${userId}&status=private&limit=1`).catch(() => null),
          ]);
          
          const publicTotal = publicRes?.pagination?.total || publicRes?.total || 0;
          const privateTotal = privateRes?.pagination?.total || privateRes?.total || 0;
          postCount = publicTotal + privateTotal;
        } catch {
          // Silent failure
        }
      }
      
      // OPTIMIZATION: Load likes/views accurately but with smaller limit
      // Only load if analytics has no value or = 0
      if (likeCount === 0 || viewCount === 0) {
        try {
          // Load maximum 100 recent posts to count (instead of 1000)
          const [publicRes, privateRes] = await Promise.all([
            api(`/api/posts?author=${userId}&status=published&limit=100`).catch(() => ({ posts: [], items: [] })),
            api(`/api/posts?author=${userId}&status=private&limit=100`).catch(() => ({ posts: [], items: [] })),
          ]);
          
          const allPosts = [
            ...(publicRes?.posts || publicRes?.items || []),
            ...(privateRes?.posts || privateRes?.items || [])
          ];
          
          // Count likes (emotes) and views from posts
          // Use emoteCount if available, otherwise fallback to emotes.length
          const calculatedLikes = allPosts.reduce((sum, post) => {
            const postEmotes = typeof post.emoteCount === 'number' 
              ? post.emoteCount 
              : (Array.isArray(post.emotes) ? post.emotes.length : 0);
            return sum + postEmotes;
          }, 0);
          
          const calculatedViews = allPosts.reduce((sum, post) => {
            return sum + (typeof post.views === 'number' ? post.views : 0);
          }, 0);
          
          // Only override if calculated > 0
          if (calculatedLikes > 0) likeCount = calculatedLikes;
          if (calculatedViews > 0) viewCount = calculatedViews;
        } catch (err) {
          console.warn('Error loading likes/views:', err);
        }
      }
      
      return {
        postCount,
        friendCount,
        likeCount,
        viewCount
      };
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes - balance between accuracy and performance
    cacheTime: 5 * 60 * 1000, // 5 minutes - keep in cache
    retry: 1, // Retry 1 time if failed
    refetchOnWindowFocus: false, // Don't auto-refetch when focus window (avoid spam API)
  });
}

