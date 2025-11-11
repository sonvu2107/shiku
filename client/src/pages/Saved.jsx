import { useEffect, useState } from "react";
import { api } from "../api";
import PostCard from "../components/PostCard";
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

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-4">
        <div className="card bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300">Đang tải...</div>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-4">
        <div className="card bg-white dark:bg-gray-800 text-red-600 dark:text-red-400">{error}</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Bài đã lưu</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Các bài viết bạn đã đánh dấu lưu.</p>
        </div>
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="card text-gray-500 dark:text-gray-400">Chưa có bài viết nào.</div>
          ) : (
            posts.map(p => (
              <PostCard
                key={p._id}
                post={p}
                user={user}
                hidePublicIcon={false}
                hideActionsMenu={true}
                isSaved={savedMap[p._id] ?? true}
                onSavedChange={updateSavedState}
                skipSavedStatusFetch={true}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

