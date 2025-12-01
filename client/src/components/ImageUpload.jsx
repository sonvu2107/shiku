import { useState, useRef } from "react";
import { api } from "../api";
import { Upload, X, Image } from "lucide-react";

/**
 * ImageUpload - Component upload image
 * Only supports image upload for event cover photos
 */
export default function ImageUpload({ onUpload, accept = "image/*", className = "", children }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file hình ảnh');
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('File quá lớn. Kích thước tối đa là 10MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api('/api/uploads', {
        method: 'POST',
        body: formData
      });

      if (response.success && response.url) {
        onUpload(response.url);
      } else {
        throw new Error(response.message || 'Tải lên thất bại');
      }
    } catch (error) {
      // Silent handling for upload error
      alert('Có lỗi xảy ra khi tải lên ảnh: ' + error.message);
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <p className="text-sm text-gray-600">Đang tải lên...</p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
