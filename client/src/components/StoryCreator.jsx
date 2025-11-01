import React, { useState } from 'react';
import { X, Image as ImageIcon, Video, Type } from 'lucide-react';
import { api } from '../api';

/**
 * StoryCreator - Modal tạo story mới
 * Upload ảnh/video với caption
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

  /**
   * Xử lý chọn file ảnh/video
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
   * Upload file lên server
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
   * Tạo story
   */
  const handleCreate = async () => {
    if (!mediaFile) {
      setError("Vui lòng chọn ảnh hoặc video");
      return;
    }

    setCreating(true);
    setError("");

    try {
      // Upload media trước
      setUploading(true);
      const mediaUrl = await uploadMedia();
      setUploading(false);

      if (!mediaUrl) {
        throw new Error("Không thể upload file");
      }

      // Tạo story
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

      // Callback khi tạo thành công
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
    <div className="fixed inset-0 bg-black bg-opacity-75 dark:bg-opacity-85 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Tạo tin</h2>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Media Upload/Preview */}
          {!mediaPreview ? (
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="flex gap-4">
                  <ImageIcon size={32} className="text-gray-400 dark:text-gray-500" />
                  <Video size={32} className="text-gray-400 dark:text-gray-500" />
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-300 mb-2">Chọn ảnh hoặc video</p>
                  <label className="inline-block px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 cursor-pointer transition-colors">
                    Chọn file
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Tối đa 50MB</p>
              </div>
            </div>
          ) : (
            <div className="relative">
              {/* Preview */}
              <div className="relative bg-black rounded-lg overflow-hidden" style={{ maxHeight: '400px' }}>
                {mediaType === 'image' ? (
                  <img
                    src={mediaPreview}
                    alt="Preview"
                    className="w-full h-auto"
                  />
                ) : (
                  <video
                    src={mediaPreview}
                    controls
                    className="w-full h-auto"
                  />
                )}
                
                {/* Caption Overlay */}
                {caption && (
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-white text-lg font-medium drop-shadow-lg">
                      {caption}
                    </p>
                  </div>
                )}
              </div>

              {/* Change File Button */}
              <button
                onClick={() => {
                  setMediaFile(null);
                  setMediaPreview(null);
                  setMediaType(null);
                }}
                className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                Chọn file khác
              </button>
            </div>
          )}

          {/* Caption Input */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Type size={16} />
              Caption (không bắt buộc)
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Thêm chú thích cho story..."
              maxLength={500}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm 
                        bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                        placeholder-gray-500 dark:placeholder-gray-400
                        focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none"
              rows={3}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{caption.length}/500</p>
          </div>

          {/* Visibility Settings */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Ai có thể xem
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm 
                        bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                        focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value="friends">Bạn bè</option>
              <option value="public">Công khai</option>
            </select>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 
                        text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700
                        rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleCreate}
              disabled={!mediaFile || creating || uploading}
              className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg 
                        hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 
                        disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? "Đang tải lên..." : creating ? "Đang tạo..." : "Đăng tin"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
