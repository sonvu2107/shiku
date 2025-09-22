import { useEffect, useState } from "react";
import { api } from "../api";
import { useNavigate, useParams } from "react-router-dom";
import Editor from "../components/Editor";
import { Image, Video } from "lucide-react";

/**
 * EditPost - Trang chỉnh sửa bài viết
 * Hỗ trợ upload multi-file (ảnh/video) và chỉnh sửa nội dung Markdown
 * @returns {JSX.Element} Component edit post page
 */
export default function EditPost() {
  // ==================== ROUTER & NAVIGATION ====================
  
  const { id } = useParams(); // ID bài viết từ URL
  const navigate = useNavigate();
  
  // ==================== STATE MANAGEMENT ====================
  
  // Post data
  const [post, setPost] = useState(null); // Dữ liệu bài viết
  const [err, setErr] = useState(""); // Error message
  const [loading, setLoading] = useState(true); // Loading state
  const [uploading, setUploading] = useState(false); // Upload state

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    try {
      setLoading(true);
      setErr("");
      const data = await api(`/api/posts/edit/${id}`);
      setPost(data.post);
    } catch (err) {
      setErr(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Multi-file upload (images/videos)
  const handleFilesUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles.length) return;
    setUploading(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach(f => formData.append("files", f));
      
      // Upload files qua api helper với FormData
      const data = await api("/api/uploads/media", {
        method: "POST",
        body: formData
      }); // {files: [{url, type}, ...]}

      setPost(prev => {
        const updated = { ...prev };
        updated.files = [...(updated.files || []), ...data.files];
        // Luôn set coverUrl là file đầu tiên trong files (bất kể loại)
        if (updated.files.length > 0) {
          updated.coverUrl = updated.files[0].url;
        } else {
          updated.coverUrl = "";
        }
        return updated;
      });
    } catch (error) {
      setErr("Lỗi upload file: " + error.message);
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
            <input 
              value={post.title} 
              onChange={e => setPost({ ...post, title: e.target.value })} 
            />
          </div>
          <div>
            <label>Tags</label>
            <input 
              value={(post.tags || []).join(", ")} 
              onChange={e => setPost({ ...post, tags: e.target.value.split(",").map(s => s.trim()) })} 
            />
          </div>
          <div>
            <label>Trạng thái</label>
            <select 
              value={post.status} 
              onChange={e => setPost({ ...post, status: e.target.value })}
            >
              <option value="published">Công khai</option>
              <option value="private">Riêng tư</option>
            </select>
          </div>

          {/* Multi-file upload section */}
          <div className="flex flex-col gap-2">
            <label className="btn-outline flex items-center gap-2 cursor-pointer w-fit">
              <Image size={18} />
              <Video size={18} />
              <span>{uploading ? "Đang tải..." : "Thêm ảnh/video"}</span>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFilesUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
            {/* Preview all files */}
            <div className="flex gap-3 flex-wrap mt-2">
              {(post.files || []).map((file, idx) => (
                <div key={idx} className="relative">
                  {file.type === "image" ? (
                    <img src={file.url} alt="preview" className="w-16 h-16 object-cover rounded-lg" />
                  ) : (
                    <video src={file.url} className="w-16 h-16 object-cover rounded-lg" controls />
                  )}
                  <button
                    type="button"
                    onClick={() => setPost({ ...post, files: post.files.filter((_, i) => i !== idx) })}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
                  >×</button>
                </div>
              ))}
            </div>
          </div>

          <Editor value={post.content} onChange={v => setPost({ ...post, content: v })} />
          {err && <div className="text-red-600 text-sm">{err}</div>}
          <button className="btn">Lưu</button>
        </form>
      </div>
    </div>
  );
}
