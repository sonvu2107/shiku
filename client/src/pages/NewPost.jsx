import { useState } from "react";
import { api } from "../api";
import { useNavigate } from "react-router-dom";
import Editor from "../components/Editor";

/**
 * NewPost - Trang tạo bài viết mới
 * Sử dụng Editor component để viết nội dung Markdown
 * @returns {JSX.Element} Component new post page
 */
export default function NewPost() {
  // ==================== STATE MANAGEMENT ====================
  
  // Form states
  const [title, setTitle] = useState(""); // Tiêu đề bài viết
  const [tags, setTags] = useState(""); // Tags (phân cách bằng phẩy)
  const [content, setContent] = useState(""); // Nội dung Markdown
  const [coverUrl, setCoverUrl] = useState(""); // URL ảnh cover
  const [status, setStatus] = useState("published"); // Trạng thái (công khai/riêng tư)
  const [err, setErr] = useState(""); // Error message
  
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      const body = { title, content, coverUrl, status, tags: tags.split(",").map(s => s.trim()).filter(Boolean), group: null };
      const data = await api("/api/posts", { method: "POST", body });
      navigate(`/post/${data.post.slug}`);
    } catch (e) { setErr(e.message); }
  }

  return (
    <div className="w-full px-6 py-6">
      <div className="card max-w-4xl mx-auto space-y-3">
        <h1 className="text-2xl font-bold">Viết bài mới</h1>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label>Tiêu đề</label>
          <input value={title} onChange={e => setTitle(e.target.value)} required />
        </div>
        <div>
          <label>Tags</label>
          <input value={tags} onChange={e => setTags(e.target.value)} placeholder="js, node, học tập" />
        </div>
        <div>
          <label>Ảnh cover</label>
          <input value={coverUrl} onChange={e => setCoverUrl(e.target.value)} placeholder="URL ảnh cover..." />
        </div>
        <div>
          <label>Trạng thái</label>
          <select value={status} onChange={e => setStatus(e.target.value)}>
            <option value="published">Công khai</option>
            <option value="private">Riêng tư</option>
          </select>
        </div>
        <Editor value={content} onChange={setContent} />
        {err && <div className="text-red-600 text-sm">{err}</div>}
        <button className="btn">Đăng bài</button>
      </form>
      </div>
    </div>
  );
}
