import { useEffect, useState } from "react";
import { api } from "../api";
import PostCard from "../components/PostCard";

export default function Saved() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    load();
  }, []);

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
              <PostCard key={p._id} post={p} isSaved={true} skipSavedStatusFetch={true} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

