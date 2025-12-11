import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Video, Type } from 'lucide-react';
import { api } from '../api';

/**
 * StoryCreator - Modal create new story
 * Upload image/video with caption
 */
export default function StoryCreator({ user, onClose, onStoryCreated }) {
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState("friends");
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // Hide FloatingDock on desktop when modal is open
  useEffect(() => {
    const isDesktop = window.innerWidth >= 768;
    if (isDesktop) {
      const floatingDock = document.querySelector('[class*="fixed bottom-6"]');
      if (floatingDock) floatingDock.style.display = 'none';
    }

    return () => {
      const floatingDock = document.querySelector('[class*="fixed bottom-6"]');
      if (floatingDock) floatingDock.style.display = '';
    };
  }, []);

  /**
   * Handle file selection
   */
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setError("Vui lòng chọn file ảnh hoặc video");
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setError("File quá lớn (tối đa 50MB)");
      return;
    }

    setMediaFile(file);
    setMediaType(file.type.startsWith('image/') ? 'image' : 'video');
    setError("");

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  /**
   * Upload file to server
   */
  const uploadMedia = async () => {
    if (!mediaFile) return null;

    const formData = new FormData();
    formData.append('file', mediaFile);

    try {
      const response = await api('/api/uploads', {
        method: 'POST',
        body: formData
      });

      return response.url;
    } catch (err) {
      throw new Error("Lỗi upload file: " + err.message);
    }
  };

  /**
   * Create story
   */
  const handleCreate = async () => {
    if (!mediaFile) {
      setError("Vui lòng chọn ảnh hoặc video");
      return;
    }

    setCreating(true);
    setError("");

    try {
      // Upload media first
      setUploading(true);
      const mediaUrl = await uploadMedia();
      setUploading(false);

      if (!mediaUrl) {
        throw new Error("Không thể upload file");
      }

      // Create story
      const storyData = {
        mediaUrl,
        mediaType,
        caption: caption.trim(),
        visibility
      };

      const response = await api('/api/stories', {
        method: 'POST',
        body: storyData
      });

      // Callback when created successfully
      if (onStoryCreated) {
        onStoryCreated(response.story);
      }

      onClose();
    } catch (err) {
      setError(err.message || "Lỗi tạo story");
    } finally {
      setCreating(false);
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-[32px] max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl z-10">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Tạo tin mới</h2>
          <button
            onClick={onClose}
            className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6 flex-1">
          {/* Media Upload/Preview */}
          {!mediaPreview ? (
            <div className="border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl p-10 text-center hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors group cursor-pointer relative">
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="flex flex-col items-center gap-4 pointer-events-none">
                <div className="flex gap-4">
                  <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                    <ImageIcon size={32} />
                  </div>
                  <div className="w-16 h-16 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform delay-75">
                    <Video size={32} />
                  </div>
                </div>
                <div>
                  <p className="text-lg font-bold text-neutral-900 dark:text-white mb-1">Chọn ảnh hoặc video</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Kéo thả hoặc nhấn để tải lên</p>
                </div>
                <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-full text-xs font-bold text-neutral-500 dark:text-neutral-400">
                  Tối đa 50MB
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative bg-black rounded-3xl overflow-hidden shadow-lg aspect-[9/16] max-h-[500px] mx-auto">
                {mediaType === 'image' ? (
                  <img
                    src={mediaPreview}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <video
                    src={mediaPreview}
                    controls
                    className="w-full h-full object-contain"
                  />
                )}

                {/* Caption Overlay Preview */}
                {caption && (
                  <div className="absolute bottom-8 left-4 right-4 pointer-events-none">
                    <div className="bg-black/40 backdrop-blur-md p-3 rounded-xl border border-white/10">
                      <p className="text-white text-center font-medium text-sm drop-shadow-md break-words">
                        {caption}
                      </p>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    setMediaFile(null);
                    setMediaPreview(null);
                    setMediaType(null);
                    setCaption("");
                  }}
                  className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors backdrop-blur-sm"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Caption Input */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-neutral-900 dark:text-white ml-1">Thêm chú thích</label>
                <div className="relative">
                  <Type className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Nhập nội dung..."
                    className="w-full pl-12 pr-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
                    maxLength={100}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
                    {caption.length}/100
                  </div>
                </div>
              </div>

              {/* Visibility Selection */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-neutral-900 dark:text-white ml-1">Quyền riêng tư</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setVisibility('public')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border ${visibility === 'public'
                      ? 'bg-black dark:bg-white text-white dark:text-black border-transparent'
                      : 'bg-transparent text-neutral-500 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                      }`}
                  >
                    Công khai
                  </button>
                  <button
                    onClick={() => setVisibility('friends')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border ${visibility === 'friends'
                      ? 'bg-black dark:bg-white text-white dark:text-black border-transparent'
                      : 'bg-transparent text-neutral-500 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                      }`}
                  >
                    Bạn bè
                  </button>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-neutral-100 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl sticky bottom-0 z-10">
          <button
            onClick={handleCreate}
            disabled={!mediaFile || creating || uploading}
            className="w-full py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-base hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-black/10 dark:shadow-white/5 flex items-center justify-center gap-2"
          >
            {creating || uploading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black rounded-full animate-spin" />
                <span>Đang đăng tin...</span>
              </>
            ) : (
              <span>Chia sẻ lên tin</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
