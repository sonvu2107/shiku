import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Play, Image as ImageIcon, Image } from 'lucide-react';
import { api } from '../api';

// Component tạo bài viết đơn giản cho modal
function PostCreatorModal({ user, onClose }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      setErr("Vui lòng nhập tiêu đề và nội dung");
      return;
    }

    setLoading(true);
    try {
      const response = await api("/api/posts", {
        method: "POST",
        body: { 
          title, 
          content, 
          files,
          status: "published",
          tags: [],
          group: null
        }
      });
      
      // Reset form và đóng modal
      setTitle("");
      setContent("");
      setFiles([]);
      setErr("");
      onClose();
      
      // Reload trang để hiển thị bài viết mới
      window.location.reload();
    } catch (error) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Xử lý upload multiple files (images/videos)
   * @param {Event} e - File input change event
   */
  const handleFilesUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles.length) return;
    
    setUploading(true);
    try {
      // Tạo FormData cho multiple files
      const formData = new FormData();
      selectedFiles.forEach(f => formData.append("files", f));

      // Upload files qua fetch (không qua api helper để handle FormData)
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
      const response = await fetch(`${API_URL}/api/uploads/media`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      
      // Thêm files đã upload vào state
      if (data.files) {
        setFiles(prev => [...prev, ...data.files]);
      }
    } catch (error) {
      setErr("Lỗi upload file: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Tiêu đề */}
      <div>
        <input
          type="text"
          placeholder="Tiêu đề bài viết..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* Nội dung */}
      <div>
        <textarea
          placeholder="Bạn đang nghĩ gì?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] resize-none"
          required
        />
      </div>

      {/* Upload section: ảnh/video + preview */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1">
          <label className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
            <Image size={18} />
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
        </div>
        {files.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {files.map((f, idx) => (
              <div key={idx} className="relative">
                {f.type === "image" ? (
                  <img src={f.url} alt="preview" className="w-16 h-16 object-cover rounded-lg" />
                ) : (
                  <video src={f.url} controls className="w-16 h-16 object-cover rounded-lg" />
                )}
                <button
                  type="button"
                  onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {err && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
          {err}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={loading || !title.trim() || !content.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Đang đăng..." : "Đăng bài"}
        </button>
      </div>
    </form>
  );
}

/**
 * Stories - Component hiển thị stories như Facebook
 * Bao gồm tạo story mới và xem stories của bạn bè
 */
export default function Stories({ user }) {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPostCreator, setShowPostCreator] = useState(false);

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      setLoading(true);
      // Load stories từ API (có thể là posts gần đây hoặc stories thực tế)
      const response = await api('/api/posts?limit=8&status=published');
      if (response.items) {
        setStories(response.items.slice(0, 8));
      }
    } catch (error) {
      console.error('Error loading stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDisplayMedia = (post) => {
    if (post.coverUrl) {
      return { url: post.coverUrl, type: 'image' };
    }
    if (Array.isArray(post.files) && post.files.length > 0) {
      return post.files[0];
    }
    return null;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex-shrink-0">
              <div className="w-28 h-40 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex gap-4 overflow-x-auto scrollbar-hide">
        {/* Tạo story mới */}
        {user && (
          <div className="flex-shrink-0">
            <button
              onClick={() => setShowPostCreator(true)}
              className="block w-28 h-40 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors flex flex-col items-center justify-center"
            >
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-2">
                <Plus size={24} className="text-white" />
              </div>
              <span className="text-sm text-gray-600 text-center px-1">Tạo tin</span>
            </button>
          </div>
        )}

        {/* Stories của bạn bè */}
        {stories.map((story, index) => {
          const media = getDisplayMedia(story);
          const isVideo = media?.type === 'video';
          
          return (
            <div key={story._id} className="flex-shrink-0">
              <Link
                to={`/post/${story.slug}`}
                className="block w-28 h-40 rounded-lg overflow-hidden relative group"
              >
                {media ? (
                  <>
                    {isVideo ? (
                      <video
                        src={media.url}
                        className="w-full h-full object-cover"
                        muted
                      />
                    ) : (
                      <img
                        src={media.url}
                        alt={story.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                    {isVideo && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                          <Play size={20} className="text-white ml-0.5" />
                        </div>
                      </div>
                    )}
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                  </>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                    <ImageIcon size={28} className="text-white" />
                  </div>
                )}
                
                {/* User name */}
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-white text-sm font-medium truncate">
                    {story.author?.name || 'Người dùng'}
                  </p>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
      
      {/* PostCreator Modal */}
      {showPostCreator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Tạo bài viết mới</h2>
              <button
                onClick={() => setShowPostCreator(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
            <div className="p-4">
              <PostCreatorModal 
                user={user} 
                onClose={() => setShowPostCreator(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
