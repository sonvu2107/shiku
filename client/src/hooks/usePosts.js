import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api.js";

/**
 * Hook to fetch posts feed with infinite scroll support
 * Uses React Query for caching, deduplication, and automatic refetching
 * 
 * @param {Object} options - Query options
 * @param {string} options.sortBy - Sort order: 'recommended' | 'newest' | 'oldest' | 'mostViewed' | 'leastViewed'
 * @param {string} options.searchQuery - Search query string
 * @param {number} options.limit - Posts per page (default: 8 for fast initial load)
 */
export function usePosts({ sortBy = 'recommended', searchQuery = '', limit = 8 } = {}) {
    return useInfiniteQuery({
        queryKey: ['posts', { sortBy, searchQuery }],
        queryFn: async ({ pageParam = 1 }) => {
            let response;

            if (sortBy === 'recommended') {
                // Smart feed endpoint
                response = await api(`/api/posts/feed/smart?page=${pageParam}&limit=${limit}`);
            } else {
                // Unified feed for other sort options
                response = await api(`/api/posts/feed?page=${pageParam}&limit=${limit}&q=${encodeURIComponent(searchQuery)}&sort=${sortBy}`);
            }

            return {
                items: response.items || [],
                page: pageParam,
                hasMore: (response.items || []).length >= limit
            };
        },
        getNextPageParam: (lastPage) => {
            return lastPage.hasMore ? lastPage.page + 1 : undefined;
        },
        staleTime: 2 * 60 * 1000, // 2 minutes - posts change often
        gcTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false, // Don't refetch on tab focus (can be annoying)
    });
}

/**
 * Hook to get all posts flattened from infinite query pages
 * Utility function for easier access to posts array
 */
export function usePostsFlattened(options) {
    const query = usePosts(options);

    // Flatten all pages into single array with deduplication
    const posts = query.data?.pages?.flatMap(page => page.items) || [];
    const uniquePosts = Array.from(
        new Map(posts.map(post => [post._id, post])).values()
    );

    // Calculate hasNextPage from last page's hasMore
    const hasNextPage = query.data?.pages?.[query.data.pages.length - 1]?.hasMore ?? false;

    return {
        ...query,
        posts: uniquePosts,
        hasNextPage, // Override React Query's hasNextPage with our custom logic
        hasMore: hasNextPage // Alias for backward compatibility
    };
}

/**
 * Hook to like/unlike a post
 */
export function useLikePost() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (postId) => {
            const response = await api(`/api/posts/${postId}/like`, {
                method: "POST",
            });
            return response;
        },
        onSuccess: () => {
            // Invalidate posts cache to refetch with updated like count
            queryClient.invalidateQueries({ queryKey: ["posts"] });
        },
    });
}

/**
 * Hook to delete a post
 */
export function useDeletePost() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (postId) => {
            const response = await api(`/api/posts/${postId}`, {
                method: "DELETE",
            });
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["posts"] });
        },
    });
}

/**
 * Hook to create a new post
 */
export function useCreatePost() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (postData) => {
            const response = await api("/api/posts", {
                method: "POST",
                body: postData,
            });
            return response;
        },
        onSuccess: () => {
            // Invalidate posts to show new post
            queryClient.invalidateQueries({ queryKey: ["posts"] });
        },
    });
}

/**
 * Hook to prefetch posts (useful for navigation)
 */
export function usePrefetchPosts() {
    const queryClient = useQueryClient();

    return (options = {}) => {
        queryClient.prefetchInfiniteQuery({
            queryKey: ['posts', options],
            queryFn: async ({ pageParam = 1 }) => {
                const sortBy = options.sortBy || 'recommended';
                const limit = options.limit || 20;

                if (sortBy === 'recommended') {
                    const response = await api(`/api/posts/feed/smart?page=${pageParam}&limit=${limit}`);
                    return { items: response.items || [], page: pageParam, hasMore: (response.items || []).length >= limit };
                } else {
                    const response = await api(`/api/posts/feed?page=${pageParam}&limit=${limit}&sort=${sortBy}`);
                    return { items: response.items || [], page: pageParam, hasMore: (response.items || []).length >= limit };
                }
            },
            initialPageParam: 1,
            pages: 1, // Only prefetch first page
        });
    };
}
