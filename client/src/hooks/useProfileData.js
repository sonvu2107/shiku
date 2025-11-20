import { useCallback, useEffect, useState } from "react";
import { api } from "../api";

/**
 * Hook để quản lý việc lấy dữ liệu profile (bạn bè, bài đăng, phân tích, ảnh gần đây)
 * Refactored từ Profile cũ để đảm bảo logic giống hệt
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
      // Thêm coverUrl nếu có
      if (post.coverUrl) {
        allImages.push({
          url: post.coverUrl,
          postId: post._id,
          postTitle: post.title || "Không có tiêu đề",
          createdAt: post.createdAt
        });
      }
      
      // Thêm ảnh từ files array
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
    
    // Sắp xếp theo thời gian tạo (mới nhất trước) và lấy 12 ảnh đầu
    return allImages
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 12);
  }, []);

  // ======= LOAD POSTS (từ Profile cũ) =======
  const loadPosts = useCallback(async () => {
    if (!userId) return;

    setLoading(l => ({ ...l, posts: true }));
    setErrors(e => ({ ...e, posts: null }));

    try {
      // Logic từ Profile cũ:
      // const userId = user._id || user.id;
      const [publicData, privateData] = await Promise.all([
        api(`/api/posts?author=${userId}&status=published&limit=50`),
        api(`/api/posts?author=${userId}&status=private&limit=50`),
      ]);

      // Backend trả về { posts: [...], pagination: {...} } từ posts-secure.js
      // Hoặc { items: [...], total, page, pages } từ posts.js
      // Cần check cả "posts" và "items" để tương thích với cả 2 API
      const privatePosts = privateData?.posts || privateData?.items || [];
      const publicPosts = publicData?.posts || publicData?.items || [];
      const allPosts = [...privatePosts, ...publicPosts];
      
      console.log("[useProfileData] API Response - privateData:", privateData);
      console.log("[useProfileData] API Response - publicData:", publicData);
      console.log("[useProfileData] Extracted - privatePosts:", privatePosts.length, "publicPosts:", publicPosts.length);

      const sortedPosts = allPosts.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      // Extract recent images từ posts
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

  // ======= LOAD FRIENDS (từ Profile cũ) =======
  const loadFriends = useCallback(async () => {
    // API không cần userId, vì backend lấy từ token
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

  // ======= LOAD ANALYTICS (từ Profile cũ) =======
  const loadAnalytics = useCallback(
    async (period = "30d") => {
      if (!userId) return;

      setLoading(l => ({ ...l, analytics: true }));
      setErrors(e => ({ ...e, analytics: null }));

      try {
        // Profile cũ: `/api/posts/analytics?period=${analyticsPeriod}`
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
      // Load tất cả dữ liệu cùng lúc
      await Promise.all([
        loadPosts(),
        loadFriends(),
        loadAnalytics(period),
      ]);
    },
    [loadPosts, loadFriends, loadAnalytics]
  );

  // ======= AUTO LOAD POSTS KHI userId CÓ GIÁ TRỊ =======
  useEffect(() => {
    console.log("[useProfileData] useEffect triggered - userId:", userId);
    if (!userId) {
      console.log("[useProfileData] userId is null/undefined, skipping loadPosts");
      return;
    }
    console.log("[useProfileData] Calling loadPosts() for userId:", userId);
    loadPosts();
  }, [userId, loadPosts]);

  // Debug log khi return
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
