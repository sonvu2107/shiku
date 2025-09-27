import { useState, useRef } from "react";
import { api } from "../api";
import { Upload, X, Image, Video, File, AlertCircle, CheckCircle } from "lucide-react";

/**
 * MediaUpload - Component upload media files lên Cloudinary
 * Hỗ trợ upload hình ảnh, video và các file khác
 */
export default function MediaUpload({ onUploadSuccess, onClose }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  // Supported file types
  const supportedTypes = {
    image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm'],
    audio: ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  };

  const getFileType = (mimeType) => {
    for (const [type, mimes] of Object.entries(supportedTypes)) {
      if (mimes.includes(mimeType)) {
        return type;
      }
    }
    return 'document';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const validateFile = (file) => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const fileType = getFileType(file.type);
    
    if (file.size > maxSize) {
      return `File quá lớn. Kích thước tối đa là ${formatFileSize(maxSize)}`;
    }

    if (!Object.values(supportedTypes).flat().includes(file.type)) {
      return 'Định dạng file không được hỗ trợ';
    }

    return null;
  };

  const handleFiles = (newFiles) => {
    const fileArray = Array.from(newFiles);
    const validFiles = [];
    const newErrors = {};

    fileArray.forEach((file, index) => {
      const error = validateFile(file);
      if (error) {
        newErrors[file.name] = error;
      } else {
        validFiles.push({
          file,
          id: Date.now() + index,
          type: getFileType(file.type),
          size: file.size,
          preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
        });
      }
    });

    setFiles(prev => [...prev, ...validFiles]);
    setErrors(prev => ({ ...prev, ...newErrors }));
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (fileId) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file && file.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  const uploadFiles = async (filesToUpload) => {
    const formData = new FormData();
    
    // Thêm tất cả files vào FormData với tên "files"
    filesToUpload.forEach(fileData => {
      formData.append('files', fileData.file);
    });

    const response = await api('/api/uploads/media', {
      method: 'POST',
      body: formData
    });

    if (response.files && response.files.length > 0) {
      // Tạo media records cho tất cả files đã upload
      const mediaPromises = response.files.map((uploadResult, index) => {
        const fileData = filesToUpload[index];
        const mediaData = {
          url: uploadResult.url,
          thumbnail: uploadResult.url, // Sử dụng URL gốc làm thumbnail
          originalName: fileData.file.name,
          title: fileData.file.name.split('.')[0],
          type: uploadResult.type,
          size: fileData.size,
          mimeType: fileData.file.type
        };

        return api('/api/media', {
          method: 'POST',
          body: JSON.stringify(mediaData)
        });
      });

      const mediaResults = await Promise.all(mediaPromises);
      return mediaResults;
    } else {
      throw new Error(response.error || 'Upload failed');
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setErrors({});

    try {
      // Upload tất cả files cùng lúc
      const results = await uploadFiles(files);

      // Check if all uploads were successful
      const failedUploads = results.filter(result => !result.success);
      
      if (failedUploads.length > 0) {
        setErrors({ submit: `${failedUploads.length} file upload thất bại` });
      } else {
        // Clear files and close modal
        setFiles([]);
        if (onUploadSuccess) {
          onUploadSuccess(results);
        }
        if (onClose) {
          onClose();
        }
      }
    } catch (error) {
      // Silent handling for upload error
      setErrors({ submit: error.message || 'Có lỗi xảy ra khi upload' });
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (type) => {
    switch (type) {
      case 'image': return <Image size={20} className="text-green-600" />;
      case 'video': return <Video size={20} className="text-blue-600" />;
      case 'audio': return <File size={20} className="text-purple-600" />;
      default: return <File size={20} className="text-gray-600" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Tải lên Media</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              Kéo thả file vào đây hoặc
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              chọn file
            </button>
            <p className="text-sm text-gray-500 mt-2">
              Hỗ trợ: JPG, PNG, GIF, MP4, AVI, MP3, PDF, DOC (tối đa 50MB)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileInput}
              className="hidden"
              accept={Object.values(supportedTypes).flat().join(',')}
            />
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Files đã chọn ({files.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {files.map((fileData) => (
                  <div key={fileData.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    {fileData.preview ? (
                      <img
                        src={fileData.preview}
                        alt={fileData.file.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                        {getFileIcon(fileData.type)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {fileData.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(fileData.size)} • {fileData.type}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFile(fileData.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Messages */}
          {Object.keys(errors).length > 0 && (
            <div className="mt-4 space-y-2">
              {Object.entries(errors).map(([key, error]) => (
                <div key={key} className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              onClick={handleUpload}
              disabled={files.length === 0 || uploading}
              className="flex-1 btn flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Đang upload...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Upload {files.length > 0 && `(${files.length})`}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
