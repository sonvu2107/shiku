import { useState, useRef } from "react";
import { Upload, X, Image, Loader2 } from "lucide-react";

/**
 * CommentImageUpload - Component upload image for comment
 * Supports multiple files, preview images before upload
 */
export default function CommentImageUpload({ onImagesChange, maxImages = 5, className = "", minimal = false }) {
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
          className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors touch-target"
        >
          <Image size={18} />
          <span className="font-medium">Thêm ảnh</span>
          <span className="text-xs text-neutral-400">
            ({selectedImages.length}/{maxImages})
          </span>
        </button>
      )}

      {/* Image Previews - Only show when not in minimal mode */}
      {!minimal && selectedImages.length > 0 && (
        <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2 animate-in fade-in zoom-in-95 duration-200">
          {selectedImages.map((image) => (
            <div key={image.id} className="relative group">
              <div className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-neutral-50 dark:bg-neutral-900 aspect-square">
                <img
                  src={image.preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => removeImage(image.id)}
                className="absolute top-1 right-1 bg-black/50 hover:bg-black text-white rounded-full p-1.5 min-w-[28px] min-h-[28px] flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all touch-manipulation backdrop-blur-sm"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
