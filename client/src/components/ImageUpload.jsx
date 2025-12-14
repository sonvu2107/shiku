import { useState, useRef } from "react";
import { api } from "../api";
import { Upload, X, Image, Loader2 } from "lucide-react";
import { useToast } from "../contexts/ToastContext";

/**
 * ImageUpload - Component upload image
 * Only supports image upload for event cover photos
 */
export default function ImageUpload({ onUpload, accept = "image/*", className = "", children }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const { showError, showSuccess } = useToast();

  const handleFileSelect = async (file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError('Vui lòng chọn file hình ảnh');
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      showError('File quá lớn. Kích thước tối đa là 10MB');
      return;
    }

    setUploading(true);
    try {
      // Use unified upload helper (supports direct + fallback)
      const { uploadImage } = await import('../api');
      const response = await uploadImage(file, { folder: "avatars" });

      if (response.success && response.url) {
        onUpload(response.url);
        showSuccess('Ảnh đã được tải lên thành công!');
      } else {
        throw new Error(response.message || 'Tải lên thất bại');
      }
    } catch (error) {
      showError('Có lỗi xảy ra khi tải lên ảnh: ' + (error.message || 'Vui lòng thử lại'));
    } finally {
      setUploading(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div
      className={className}
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      style={{ cursor: 'pointer' }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      {uploading ? (
        <div className="flex flex-col items-center justify-center h-full">
          <Loader2 size={32} className="animate-spin text-blue-600 mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Đang tải lên...</p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
