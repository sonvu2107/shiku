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

  if (loading) return <div className="card">Đang tải...</div>;
  if (error) return <div className="card text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-4">
          <h1 className="text-xl font-bold">Bài đã lưu</h1>
          <p className="text-sm text-gray-500">Các bài viết bạn đã đánh dấu lưu.</p>
        </div>
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="card text-gray-500">Chưa có bài viết nào.</div>
          ) : (
            posts.map(p => (
              <div key={p._id} className="bg-white rounded-lg shadow-sm border border-gray-200">
                <PostCard post={p} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
