import { useState, useRef } from "react";
import { Upload, X, Image, Loader2 } from "lucide-react";

/**
 * CommentImageUpload - Component upload ảnh cho comment
 * Hỗ trợ multiple files, preview ảnh trước khi upload
 */
export default function CommentImageUpload({ onImagesChange, maxImages = 5, className = "" }) {
  const [selectedImages, setSelectedImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (files) => {
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files).slice(0, maxImages - selectedImages.length);
    
    // Validate files
    const validFiles = newFiles.filter(file => {
      if (!file.type.startsWith('image/')) {
        alert(`File ${file.name} không phải là hình ảnh`);
        return false;
      }
      
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        alert(`File ${file.name} quá lớn. Kích thước tối đa là 5MB`);
        return false;
      }
      
      return true;
    });

    if (validFiles.length === 0) return;

    // Create preview URLs
    const newImages = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substr(2, 9)
    }));

    setSelectedImages(prev => [...prev, ...newImages]);
    onImagesChange([...selectedImages, ...newImages]);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    handleFileSelect(files);
  };

  const removeImage = (id) => {
    const imageToRemove = selectedImages.find(img => img.id === id);
    if (imageToRemove) {
      URL.revokeObjectURL(imageToRemove.preview);
    }
    
    const newImages = selectedImages.filter(img => img.id !== id);
    setSelectedImages(newImages);
    onImagesChange(newImages);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div className={className}>
      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Upload Button */}
      {selectedImages.length < maxImages && (
        <button
          type="button"
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors touch-target"
        >
          <Image size={16} />
          <span>Thêm ảnh</span>
          <span className="text-xs text-gray-400">
            ({selectedImages.length}/{maxImages})
          </span>
        </button>
      )}

      {/* Image Previews */}
      {selectedImages.length > 0 && (
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {selectedImages.map((image) => (
            <div key={image.id} className="relative group">
              <div className="w-full rounded-lg border border-gray-200 overflow-hidden bg-gray-50 aspect-[4/3]">
                <img
                  src={image.preview}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
              </div>
              <button
                type="button"
                onClick={() => removeImage(image.id)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity touch-target"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
