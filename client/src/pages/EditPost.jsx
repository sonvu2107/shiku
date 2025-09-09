import { useEffect, useState } from "react";
import { api } from "../api";
import { useNavigate, useParams } from "react-router-dom";
import Editor from "../components/Editor";
import { Image } from "lucide-react";

export default function EditPost() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { load(); }, [id]);
  const load = async () => {
    try {
      setLoading(true);
      setErr("");
      console.log('Loading post with ID:', id);
      
      const data = await api(`/api/posts/edit/${id}`);
      console.log('Loaded post:', data.post);
      setPost(data.post);
    } catch (err) {
      console.error('Load error:', err);
      setErr(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
      const response = await fetch(`${API_URL}/api/uploads/image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");
      
      const data = await response.json();
      setPost({ ...post, coverUrl: data.url });
    } catch (error) {
      setErr("Lỗi upload ảnh: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  async function save(e) {
    e.preventDefault();
    try {
      await api(`/api/posts/${id}`, { method: "PUT", body: post });
      navigate(`/post/${post.slug}`);
    } catch (e) { setErr(e.message); }
  }

  if (loading) return <div className="w-full px-6 py-6"><div className="card max-w-4xl mx-auto">Đang tải...</div></div>;
  
  if (err) return <div className="w-full px-6 py-6"><div className="card max-w-4xl mx-auto text-red-600">Lỗi: {err}</div></div>;

  if (!post) return <div className="w-full px-6 py-6"><div className="card max-w-4xl mx-auto">Không tìm thấy bài viết</div></div>;

  return (
  <div className="w-full px-6 py-6 pt-20">
      <div className="card max-w-4xl mx-auto space-y-3">
        <h1 className="text-2xl font-bold">Sửa bài</h1>
        <form onSubmit={save} className="space-y-3">
          <div>
            <label>Tiêu đề</label>
            <input value={post.title} onChange={e => setPost({ ...post, title: e.target.value })} />
          </div>
          <div>
            <label>Tags</label>
            <input value={(post.tags || []).join(", ")} onChange={e => setPost({ ...post, tags: e.target.value.split(",").map(s => s.trim()) })} />
          </div>
          <div>
            <label>Trạng thái</label>
            <select value={post.status} onChange={e => setPost({ ...post, status: e.target.value })}>
              <option value="published">Công khai</option>
              <option value="private">Riêng tư</option>
            </select>
          </div>
          
          {/* Image upload section */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="btn-outline flex items-center gap-2 cursor-pointer w-fit">
                <Image size={18} />
                <span>{uploading ? "Đang tải..." : "Thêm ảnh"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
            {post.coverUrl && (
              <div className="relative">
                <img 
                  src={post.coverUrl} 
                  alt="Cover preview" 
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setPost({ ...post, coverUrl: "" })}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
                >
                  ×
                </button>
              </div>
            )}
          </div>
          
          <Editor value={post.content} onChange={v => setPost({ ...post, content: v })} />
          {err && <div className="text-red-600 text-sm">{err}</div>}
          <button className="btn">Lưu</button>
        </form>
      </div>
    </div>
  );
}
