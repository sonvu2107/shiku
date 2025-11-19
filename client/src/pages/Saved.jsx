import { useEffect, useState } from "react";
import { api } from "../api";
import ModernPostCard from "../components/ModernPostCard";
import { useSavedPosts } from "../hooks/useSavedPosts";

export default function Saved() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const { savedMap, updateSavedState } = useSavedPosts(posts);

  useEffect(() => {
    load();
    loadCurrentUser();
  }, []);

  /**
   * Load thông tin user hiện tại (để hiển thị cảm xúc đã thả)
   */
  async function loadCurrentUser() {
    try {
      const res = await api("/api/auth/me");
      setUser(res.user);
    } catch (error) {
      // Silent fail - user có thể không đăng nhập
    }
  }

  async function load(page = 1) {
    try {
      setLoading(true);
      const res = await api(`/api/posts/saved/list?page=${page}&limit=50`);
      setPosts(res.posts || []);
    } catch (e) {
      setError("Không thể tải bài đã lưu");
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Xử lý khi người dùng lưu/bỏ lưu bài viết
   * Cập nhật savedCount trong post object và xóa bài viết khỏi danh sách nếu bỏ lưu
   */
  function handleSavedChange(postId, isSaved) {
    updateSavedState(postId, isSaved);
    
    // Nếu bỏ lưu, xóa bài viết khỏi danh sách
    if (!isSaved) {
      setPosts(prevPosts => prevPosts.filter(p => p._id !== postId));
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white dark:bg-[#111] rounded-[32px] p-5 mb-6
        shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]
        border border-transparent dark:border-white/5 text-gray-600 dark:text-gray-300 text-center py-12">
          Đang tải...
        </div>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white dark:bg-[#111] rounded-[32px] p-5 mb-6
        shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]
        border border-transparent dark:border-white/5 text-red-600 dark:text-red-400 text-center py-12">
          {error}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Bài đã lưu</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Các bài viết bạn đã đánh dấu lưu.</p>
        </div>
        <div className="space-y-6">
          {posts.length === 0 ? (
            <div className="bg-white dark:bg-[#111] rounded-[32px] px-5 pt-4 pb-6 mb-6
            shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]
            border border-transparent dark:border-white/5 text-center py-12 sm:py-16">
              <svg className="mx-auto mb-4 w-16 h-16 text-gray-300 dark:text-gray-600 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Chưa có bài viết nào được lưu.</p>
              <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-2">Lưu bài viết để xem lại sau này</p>
            </div>
          ) : (
            posts.map(p => (
              <ModernPostCard
                key={p._id}
                post={p}
                user={user}
                isSaved={savedMap[p._id] ?? true}
                onSavedChange={handleSavedChange}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

