import { useEffect, useState } from "react";
import { api } from "../api";
import { useNavigate, useParams } from "react-router-dom";
import Editor from "../components/Editor";
import { Image, Video, ArrowLeft, Save, X, Globe, Lock } from "lucide-react";
import { PageLayout, PageHeader, SpotlightCard } from "../components/ui/DesignSystem";
import { motion } from "framer-motion";
import { useToast } from "../components/Toast";
import { cn } from "../utils/cn";

/**
 * EditPost - Trang chỉnh sửa bài viết (Monochrome Luxury Style)
 * Hỗ trợ upload multi-file (ảnh/video) và chỉnh sửa nội dung Markdown
 * @returns {JSX.Element} Component edit post page
 */
export default function EditPost() {
  // ==================== ROUTER & NAVIGATION ====================
  
  const { id } = useParams(); // ID bài viết từ URL
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  
  // ==================== STATE MANAGEMENT ====================
  
  // Post data
  const [post, setPost] = useState(null); // Dữ liệu bài viết
  const [err, setErr] = useState(""); // Error message
  const [loading, setLoading] = useState(true); // Loading state
  const [uploading, setUploading] = useState(false); // Upload state
  const [saving, setSaving] = useState(false); // Saving state

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    try {
      setLoading(true);
      setErr("");
      const data = await api(`/api/posts/edit/${id}`);
      setPost(data.post);
    } catch (err) {
      setErr(err.message);
      showError(err.message || "Có lỗi xảy ra khi tải bài viết");
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
      showError("Lỗi upload file: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api(`/api/posts/${id}`, { method: "PUT", body: post });
      showSuccess("Cập nhật bài viết thành công!");
      navigate(`/post/${post.slug}`);
    } catch (e) { 
      setErr(e.message);
      showError(e.message || "Có lỗi xảy ra khi cập nhật bài viết");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] dark:bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-black dark:border-white"></div>
      </div>
    );
  }

  if (err && !post) {
    return (
      <PageLayout>
        <div className="text-center py-20">
          <p className="text-red-600 dark:text-red-400 text-lg mb-4">Lỗi: {err}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-full font-bold"
          >
            Quay lại
          </button>
        </div>
      </PageLayout>
    );
  }

  if (!post) {
    return (
      <PageLayout>
        <div className="text-center py-20">
          <p className="text-neutral-500 dark:text-neutral-400 text-lg mb-4">Không tìm thấy bài viết</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-full font-bold"
          >
            Quay lại
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      {/* Back Button */}
      <button
        onClick={() => navigate(`/post/${post.slug}`)}
        className="group flex items-center gap-2 text-neutral-500 hover:text-black dark:hover:text-white mb-6 transition-colors"
      >
        <div className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-900 group-hover:bg-neutral-200 dark:group-hover:bg-neutral-800 transition-colors">
          <ArrowLeft size={20} />
        </div>
        <span className="font-medium">Quay lại</span>
      </button>

      {/* Header */}
      <PageHeader 
        title="Chỉnh sửa bài viết" 
        subtitle="Cập nhật nội dung bài viết của bạn"
      />

      {/* Form */}
      <motion.form 
        onSubmit={save} 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto space-y-6"
      >
        {/* Title */}
        <SpotlightCard>
          <label htmlFor="title" className="block text-sm font-bold text-neutral-500 uppercase tracking-wider mb-3">
            Tiêu đề *
          </label>
          <input
            type="text"
            id="title"
            value={post.title}
            onChange={e => setPost({ ...post, title: e.target.value })}
            className="w-full px-4 py-3 bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-3xl focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500"
            placeholder="Nhập tiêu đề bài viết"
          />
        </SpotlightCard>

        {/* Tags */}
        <SpotlightCard>
          <label htmlFor="tags" className="block text-sm font-bold text-neutral-500 uppercase tracking-wider mb-3">
            Tags
          </label>
          <input
            type="text"
            id="tags"
            value={(post.tags || []).join(", ")}
            onChange={e => setPost({ ...post, tags: e.target.value.split(",").map(s => s.trim()).filter(s => s) })}
            className="w-full px-4 py-3 bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-3xl focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500"
            placeholder="Ví dụ: công nghệ, lập trình, react"
          />
        </SpotlightCard>

        {/* Status */}
        <SpotlightCard>
          <label htmlFor="status" className="block text-sm font-bold text-neutral-500 uppercase tracking-wider mb-3">
            Trạng thái
          </label>
          <div className="flex items-start gap-4">
            <div className="flex items-center gap-2">
              <input
                type="radio"
                id="published"
                name="status"
                value="published"
                checked={post.status === "published"}
                onChange={e => setPost({ ...post, status: e.target.value })}
                className="w-4 h-4 text-black dark:text-white border-neutral-300 dark:border-neutral-700 focus:ring-2 focus:ring-black dark:focus:ring-white"
              />
              <label htmlFor="published" className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white cursor-pointer">
                <Globe size={16} />
                Công khai
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="radio"
                id="private"
                name="status"
                value="private"
                checked={post.status === "private"}
                onChange={e => setPost({ ...post, status: e.target.value })}
                className="w-4 h-4 text-black dark:text-white border-neutral-300 dark:border-neutral-700 focus:ring-2 focus:ring-black dark:focus:ring-white"
              />
              <label htmlFor="private" className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white cursor-pointer">
                <Lock size={16} />
                Riêng tư
              </label>
            </div>
          </div>
        </SpotlightCard>

        {/* Multi-file upload section */}
        <SpotlightCard>
          <label className="block text-sm font-bold text-neutral-500 uppercase tracking-wider mb-3">
            <Image className="inline w-4 h-4 mr-2" />
            <Video className="inline w-4 h-4 mr-2" />
            Ảnh/Video
          </label>
          <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-semibold text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer">
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
          {post.files && post.files.length > 0 && (
            <div className="flex gap-3 flex-wrap mt-4">
              {post.files.map((file, idx) => (
                <div key={idx} className="relative group">
                  {file.type === "image" ? (
                    <img 
                      src={file.url} 
                      alt="preview" 
                      className="w-24 h-24 object-cover rounded-2xl border border-neutral-200 dark:border-neutral-800"
                    />
                  ) : (
                    <video 
                      src={file.url} 
                      className="w-24 h-24 object-cover rounded-2xl border border-neutral-200 dark:border-neutral-800"
                      controls
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setPost({ ...post, files: post.files.filter((_, i) => i !== idx) })}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </SpotlightCard>

        {/* Editor */}
        <SpotlightCard>
          <label className="block text-sm font-bold text-neutral-500 uppercase tracking-wider mb-3">
            Nội dung *
          </label>
          <div className="border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden">
            <Editor value={post.content} onChange={v => setPost({ ...post, content: v })} />
          </div>
        </SpotlightCard>

        {/* Error Message */}
        {err && (
          <SpotlightCard className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10">
            <p className="text-sm text-red-600 dark:text-red-400">{err}</p>
          </SpotlightCard>
        )}

        {/* Submit Button */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <button
            type="button"
            onClick={() => navigate(`/post/${post.slug}`)}
            className="flex-1 px-6 py-3 border border-neutral-200 dark:border-neutral-800 rounded-full text-neutral-700 dark:text-neutral-300 font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={saving}
            className={cn(
              "flex-1 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg flex items-center justify-center gap-2",
              saving && "opacity-50 cursor-not-allowed"
            )}
          >
            {saving ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white dark:border-black"></div>
            ) : (
              <>
                <Save size={20} />
                Lưu bài viết
              </>
            )}
          </button>
        </div>
      </motion.form>
    </PageLayout>
  );
}
