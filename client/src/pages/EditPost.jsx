import { useEffect, useState } from "react";
import { api } from "../api";
import { useNavigate, useParams } from "react-router-dom";
import MarkdownEditor from "../components/MarkdownEditor";
import { Image, ArrowLeft, Save, X, Globe, Lock, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "../contexts/ToastContext";
import YouTubePlayer, { isValidYouTubeUrl } from "../components/YouTubePlayer";

/**
 * EditPost - Trang chỉnh sửa bài viết
 * Có Compact/Advanced mode giống PostCreator
 */
export default function EditPost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  // State
  const [post, setPost] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);

  useEffect(() => { load(); }, [id]);

  // Tự động switch advanced mode nếu có title hoặc content dài
  useEffect(() => {
    if (post) {
      if (post.title?.trim() || (post.content?.length || 0) > 500) {
        setAdvancedMode(true);
      }
    }
  }, [post?.title, post?.content?.length]);

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

  // Multi-file upload
  const handleFilesUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles.length) return;
    setUploading(true);
    try {
      const { uploadMediaFiles } = await import("../api");
      const uploaded = await uploadMediaFiles(selectedFiles, { folder: "blog" });
      setPost(prev => {
        const updated = { ...prev };
        updated.files = [...(updated.files || []), ...uploaded];
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

  // Handle paste trong compact mode - auto switch advanced nếu > 500
  const handleCompactPaste = (e) => {
    const pastedText = e.clipboardData.getData('text');
    const currentContent = post.content || '';
    const newContent = currentContent + pastedText;
    if (newContent.length > 500) {
      setAdvancedMode(true);
      setPost({ ...post, content: newContent.slice(0, 5000) });
      e.preventDefault();
    }
  };

  async function save(e) {
    e.preventDefault();
    if (!post.content?.trim()) {
      showError("Vui lòng nhập nội dung");
      return;
    }
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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-black dark:border-white"></div>
      </div>
    );
  }

  // Error state
  if (err && !post) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 text-lg mb-4">Lỗi: {err}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-full font-bold"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-neutral-500 dark:text-neutral-400 text-lg mb-4">Không tìm thấy bài viết</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-full font-bold"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  const contentLength = post.content?.length || 0;
  const maxLength = advancedMode ? 5000 : 500;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-black">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(`/post/${post.slug}`)}
            className="p-2 -ml-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <ArrowLeft size={20} className="text-neutral-600 dark:text-neutral-400" />
          </button>
          <h1 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
            Chỉnh sửa bài viết
          </h1>
          <button
            onClick={save}
            disabled={saving || !post.content?.trim()}
            className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-transform flex items-center gap-1.5"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white dark:border-black"></div>
            ) : (
              <>
                <Save size={16} />
                <span className="hidden sm:inline">Lưu</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-2xl mx-auto">
        <form onSubmit={save} className="p-4 sm:p-6 space-y-4 sm:space-y-6">

          {/* Status Dropdown */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Trạng thái:</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full px-3 py-1.5 flex items-center gap-1.5 transition-all"
              >
                {post.status === "published" ? (
                  <>
                    <Globe size={12} strokeWidth={2.5} />
                    <span>Công khai</span>
                  </>
                ) : (
                  <>
                    <Lock size={12} strokeWidth={2.5} />
                    <span>Riêng tư</span>
                  </>
                )}
                <ChevronDown size={12} />
              </button>

              {showStatusDropdown && (
                <div className="absolute top-full left-0 mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-20 min-w-[140px] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setPost({ ...post, status: "published" });
                      setShowStatusDropdown(false);
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 text-sm font-bold text-neutral-700 dark:text-neutral-300 transition-colors"
                  >
                    <Globe size={14} strokeWidth={2.5} />
                    <span>Công khai</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPost({ ...post, status: "private" });
                      setShowStatusDropdown(false);
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 text-sm font-bold text-neutral-700 dark:text-neutral-300 transition-colors"
                  >
                    <Lock size={14} strokeWidth={2.5} />
                    <span>Riêng tư</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Compact/Advanced Mode Editor */}
          {!advancedMode ? (
            // ========== COMPACT MODE ==========
            <div className="space-y-3">
              {/* Simple Textarea */}
              <div className="relative">
                <textarea
                  value={post.content || ''}
                  onChange={(e) => setPost({ ...post, content: e.target.value.slice(0, 500) })}
                  onPaste={handleCompactPaste}
                  placeholder="Bạn đang nghĩ gì thế?"
                  rows={3}
                  maxLength={500}
                  className="w-full bg-neutral-100 dark:bg-neutral-800/50 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 rounded-2xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-600 text-[15px] leading-relaxed transition-all"
                />
                {/* Character Counter */}
                <div className="absolute bottom-3 right-3">
                  <span className={`text-xs transition-colors ${contentLength >= 450
                      ? contentLength >= 500
                        ? 'text-red-500 font-semibold'
                        : 'text-amber-500'
                      : 'text-neutral-400'
                    }`}>
                    {contentLength}/500
                  </span>
                </div>
              </div>

              {/* Toggle to Advanced */}
              <button
                type="button"
                onClick={() => setAdvancedMode(true)}
                className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 flex items-center gap-1 transition-colors"
              >
                <ChevronDown size={14} />
                <span>Viết bài dài / thêm tiêu đề</span>
              </button>
            </div>
          ) : (
            // ========== ADVANCED MODE ==========
            <div className="space-y-4">
              {/* Toggle to Compact */}
              <button
                type="button"
                onClick={() => setAdvancedMode(false)}
                className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 flex items-center gap-1 transition-colors"
              >
                <ChevronUp size={14} />
                <span>Thu gọn</span>
              </button>

              {/* Title - Borderless */}
              <div>
                <input
                  type="text"
                  value={post.title || ''}
                  onChange={e => setPost({ ...post, title: e.target.value.slice(0, 100) })}
                  maxLength={100}
                  className="w-full border-0 bg-transparent text-2xl font-black text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 resize-none focus:outline-none"
                  placeholder="Tiêu đề bài viết..."
                />
              </div>

              {/* Content - Full Markdown Editor */}
              <div className="relative">
                <MarkdownEditor
                  value={post.content || ''}
                  onChange={v => setPost({ ...post, content: v.slice(0, 5000) })}
                  placeholder="Bạn đang nghĩ gì thế?"
                  rows={8}
                />
                <div className="flex justify-end mt-1">
                  <span className={`text-xs transition-colors ${contentLength >= 4500
                      ? contentLength >= 5000
                        ? 'text-red-500 font-semibold'
                        : 'text-amber-500'
                      : 'text-neutral-400'
                    }`}>
                    {contentLength}/5000
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 block">Tags</label>
            <input
              type="text"
              value={(post.tags || []).join(", ")}
              onChange={e => setPost({ ...post, tags: e.target.value.split(",").map(s => s.trim()).filter(s => s) })}
              className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white text-neutral-900 dark:text-white placeholder-neutral-400 text-sm"
              placeholder="Ví dụ: công nghệ, lập trình, react"
            />
          </div>

          {/* Media Upload */}
          <div>
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 block">Ảnh/Video</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
              <label className="aspect-square flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-all cursor-pointer group">
                <div className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-800 group-hover:scale-110 transition-transform">
                  {uploading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-black dark:border-white"></div>
                  ) : (
                    <Image size={20} className="text-neutral-500" />
                  )}
                </div>
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                  {uploading ? "Đang tải..." : "Thêm"}
                </span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFilesUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>

              {post.files && post.files.map((file, idx) => (
                <div key={idx} className="relative group aspect-square rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800">
                  {file.type === "image" ? (
                    <img src={file.url} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <video src={file.url} className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => setPost({ ...post, files: post.files.filter((_, i) => i !== idx) })}
                    className="absolute top-1 right-1 p-1.5 w-6 h-6 bg-black/60 hover:bg-red-500 text-white rounded-full transition-colors flex items-center justify-center"
                  >
                    <X size={12} />
                  </button>
                  {idx === 0 && (
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-[8px] font-bold text-white uppercase">
                      Bìa
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* YouTube URL */}
          <div>
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 block">Nhạc YouTube</label>
            <input
              type="url"
              value={post.youtubeUrl || ""}
              onChange={e => setPost({ ...post, youtubeUrl: e.target.value })}
              className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white text-neutral-900 dark:text-white placeholder-neutral-400 text-sm"
              placeholder="Dán link YouTube..."
            />
            {post.youtubeUrl && !isValidYouTubeUrl(post.youtubeUrl) && (
              <p className="text-xs text-red-500 font-medium mt-1">Link YouTube không hợp lệ</p>
            )}
            {post.youtubeUrl && isValidYouTubeUrl(post.youtubeUrl) && (
              <div className="mt-2">
                <YouTubePlayer url={post.youtubeUrl} variant="compact" />
              </div>
            )}
          </div>

          {/* Error */}
          {err && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{err}</p>
            </div>
          )}

          {/* Mobile Submit Button */}
          <div className="sm:hidden pt-4 pb-8">
            <button
              type="submit"
              disabled={saving || !post.content?.trim()}
              className="w-full py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white dark:border-black"></div>
              ) : (
                <>
                  <Save size={18} />
                  Lưu bài viết
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
