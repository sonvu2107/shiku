import { useCallback, useEffect, useState } from "react";
import { api } from "../api";

/**
 * Hook to manage fetching profile data (friends, posts, analytics, recent images)
 * Refactored from the old Profile to preserve identical logic
 */
export function useProfileData(userId) {
  // ======= STATES =======
  const [data, setData] = useState({
    posts: [],
    friends: [],
    analytics: null,
    recentImages: [],
  });

  const [loading, setLoading] = useState({
    posts: false,
    friends: false,
    analytics: false,
    recentImages: false,
  });

  const [errors, setErrors] = useState({
    posts: null,
    friends: null,
    analytics: null,
    recentImages: null,
  });

  // ======= EXTRACT RECENT IMAGES =======
  const extractRecentImages = useCallback((posts) => {
    const allImages = [];
    
    posts.forEach(post => {
      // Add coverUrl if present
      if (post.coverUrl) {
        allImages.push({
          url: post.coverUrl,
          postId: post._id,
          postTitle: post.title || "Không có tiêu đề",
          createdAt: post.createdAt
        });
      }
      
      // Add images from the files array
      if (post.files && Array.isArray(post.files)) {
        post.files.forEach(file => {
          if (file.type === 'image' && file.url) {
            allImages.push({
              url: file.url,
              postId: post._id,
              postTitle: post.title || "Không có tiêu đề",
              createdAt: post.createdAt
            });
          }
        });
      }
    });
    
    // Sort by creation time (newest first) and take the first 12 images
    return allImages
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 12);
  }, []);

  // ======= LOAD POSTS (from old Profile) =======
  const loadPosts = useCallback(async () => {
    if (!userId) return;

    setLoading(l => ({ ...l, posts: true }));
    setErrors(e => ({ ...e, posts: null }));

    try {
      // Logic from the old Profile:
      // const userId = user._id || user.id;
      const [publicData, privateData] = await Promise.all([
        api(`/api/posts?author=${userId}&status=published&limit=50`),
        api(`/api/posts?author=${userId}&status=private&limit=50`),
      ]);

      // Backend returns { posts: [...], pagination: {...} } from posts-secure.js
      // Or { items: [...], total, page, pages } from posts.js
      // Check both "posts" and "items" to be compatible with both APIs
      const privatePosts = privateData?.posts || privateData?.items || [];
      const publicPosts = publicData?.posts || publicData?.items || [];
      const allPosts = [...privatePosts, ...publicPosts];
      
      console.log("[useProfileData] API Response - privateData:", privateData);
      console.log("[useProfileData] API Response - publicData:", publicData);
      console.log("[useProfileData] Extracted - privatePosts:", privatePosts.length, "publicPosts:", publicPosts.length);

      const sortedPosts = allPosts.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      // Extract recent images from posts
      const images = extractRecentImages(sortedPosts);

      setData(d => ({
        ...d,
        posts: sortedPosts,
        recentImages: images,
      }));
      console.log("[useProfileData] Loaded posts:", sortedPosts.length, "| Recent images:", images.length);
    } catch (error) {
      console.error("Error loading posts:", error);
      setErrors(e => ({
        ...e,
        posts: error.message || "Không thể tải bài đăng. Vui lòng thử lại.",
      }));
    } finally {
      setLoading(l => ({ ...l, posts: false }));
    }
  }, [userId, extractRecentImages]);

  // ======= LOAD FRIENDS (from old Profile) =======
  const loadFriends = useCallback(async () => {
    // API does not require userId because the backend derives it from the token
    setLoading(l => ({ ...l, friends: true }));
    setErrors(e => ({ ...e, friends: null }));

    try {
      const response = await api(`/api/friends/list`);
      const friendsList = response.friends || [];
      setData(d => ({
        ...d,
        friends: friendsList,
      }));
      console.log("[useProfileData] Loaded friends:", friendsList.length);
    } catch (err) {
      console.error("Error loading friends:", err);
      setErrors(e => ({
        ...e,
        friends: err.message || "Không thể tải danh sách bạn bè. Vui lòng thử lại.",
      }));
    } finally {
      setLoading(l => ({ ...l, friends: false }));
    }
  }, []);

  // ======= LOAD ANALYTICS (from old Profile) =======
  const loadAnalytics = useCallback(
    async (period = "30d") => {
      if (!userId) return;

      setLoading(l => ({ ...l, analytics: true }));
      setErrors(e => ({ ...e, analytics: null }));

      try {
        // Old profile used: `/api/posts/analytics?period=${analyticsPeriod}`
        const response = await api(`/api/posts/analytics?period=${period}`);
        setData(d => ({
          ...d,
          analytics: response.analytics || null,
        }));
        console.log("[useProfileData] Loaded analytics:", response.analytics);
      } catch (err) {
        console.error("Error loading analytics:", err);
        setErrors(e => ({
          ...e,
          analytics: err.message || "Không thể tải dữ liệu phân tích. Vui lòng thử lại.",
        }));
      } finally {
        setLoading(l => ({ ...l, analytics: false }));
      }
    },
    [userId]
  );

  // ======= LOAD RECENT IMAGES (optional, extracted from posts) =======
  const loadRecentImages = useCallback(async () => {
    if (!userId) return;
    
    setLoading(l => ({ ...l, recentImages: true }));
    setErrors(e => ({ ...e, recentImages: null }));
    
    try {
      // Load posts first to extract images
      const [publicData, privateData] = await Promise.all([
        api(`/api/posts?author=${userId}&status=published&limit=100`),
        api(`/api/posts?author=${userId}&status=private&limit=100`)
      ]);
      
      const allPosts = [...(privateData?.items || []), ...(publicData?.items || [])];
      const images = extractRecentImages(allPosts);
      
      setData(d => ({ ...d, recentImages: images }));
    } catch (err) {
      console.error("Failed to load recent images:", err);
      setErrors(e => ({ ...e, recentImages: err.message }));
    } finally {
      setLoading(l => ({ ...l, recentImages: false }));
    }
  }, [userId, extractRecentImages]);

  // ======= REFRESH ALL =======
  const refreshAll = useCallback(
    async (period = "30d") => {
      // Load all data at once
      await Promise.all([
        loadPosts(),
        loadFriends(),
        loadAnalytics(period),
      ]);
    },
    [loadPosts, loadFriends, loadAnalytics]
  );

  // ======= AUTO LOAD POSTS WHEN userId EXISTS =======
  useEffect(() => {
    console.log("[useProfileData] useEffect triggered - userId:", userId);
    if (!userId) {
      console.log("[useProfileData] userId is null/undefined, skipping loadPosts");
      return;
    }
    console.log("[useProfileData] Calling loadPosts() for userId:", userId);
    loadPosts();
  }, [userId, loadPosts]);

  // Debug log on return
  useEffect(() => {
    console.log("[useProfileData] Hook state:", {
      userId,
      data,
      loading,
      errors,
    });
  }, [userId, data, loading, errors]);

  return {
    data,
    loading,
    errors,
    loadPosts,
    loadFriends,
    loadAnalytics,
    loadRecentImages,
    refreshAll,
  };
}
