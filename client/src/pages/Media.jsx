import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Image, Video, Upload, Search, Grid, List, Download, Eye } from "lucide-react";
import MediaUpload from "../components/MediaUpload";
import MediaViewer from "../components/MediaViewer";

/**
 * Media - Trang quản lý kho media
 * Hiển thị hình ảnh, video đã upload
 */
export default function Media() {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // grid, list
  const [filter, setFilter] = useState("all"); // all, images, videos
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [viewingMedia, setViewingMedia] = useState(null);

  useEffect(() => {
    loadMedia();
  }, [filter]);

  const loadMedia = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (filter !== "all") params.append("type", filter);
      
      const res = await api(`/api/media?${params.toString()}`);
      setMedia(res.media || []);
    } catch (error) {
      console.error("Error loading media:", error);
      // Fallback to empty array if API fails
      setMedia([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadMedia();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  const formatSize = (size) => {
    if (size === 0) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let fileSize = size;
    let unitIndex = 0;
    
    while (fileSize >= 1024 && unitIndex < units.length - 1) {
      fileSize /= 1024;
      unitIndex++;
    }
    
    return `${fileSize.toFixed(1)} ${units[unitIndex]}`;
  };

  const handleViewMedia = async (mediaId) => {
    try {
      // Tìm media item để hiển thị
      const mediaItem = media.find(item => item._id === mediaId);
      if (mediaItem) {
        setViewingMedia(mediaItem);
        
        // Tăng lượt xem
        await api(`/api/media/${mediaId}/view`, { method: "POST" });
        loadMedia(); // Reload media to update view count
      }
    } catch (error) {
      console.error("Error viewing media:", error);
    }
  };

  const handleUploadSuccess = (uploadedMedia) => {
    // Reload media list to show newly uploaded files
    loadMedia();
    setShowUploadModal(false);
  };

  const filters = [
    { id: "all", label: "Tất cả", icon: Grid },
    { id: "images", label: "Hình ảnh", icon: Image },
    { id: "videos", label: "Video", icon: Video }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-16 sm:pt-20">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Kho media</h1>
            <button 
              onClick={() => setShowUploadModal(true)}
              className="btn flex items-center justify-center gap-2 w-full sm:w-auto touch-target"
            >
              <Upload size={18} />
              <span className="text-sm sm:text-base">Tải lên</span>
            </button>
          </div>
          
          {/* Search */}
          <form onSubmit={handleSearch} className="relative mb-4 sm:mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm media..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base"
            />
          </form>

          {/* Filters and View Mode */}
          <div className="flex flex-col gap-4">
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit min-w-full">
                {filters.map((filterItem) => {
                  const Icon = filterItem.icon;
                  return (
                    <button
                      key={filterItem.id}
                      onClick={() => setFilter(filterItem.id)}
                      className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-md transition-colors text-sm whitespace-nowrap touch-target flex-shrink-0 ${
                        filter === filterItem.id
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <Icon size={16} />
                      <span className="hidden sm:inline">{filterItem.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-md transition-colors touch-target ${
                  viewMode === "grid"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                title="Lưới"
              >
                <Grid size={16} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-md transition-colors touch-target ${
                  viewMode === "list"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                title="Danh sách"
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Media Content */}
        {loading ? (
          <div className="flex justify-center py-8 sm:py-12">
            <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div>
            {media.length === 0 ? (
              <div className="text-center py-8 sm:py-12 text-gray-500">
                <Image size={40} className="mx-auto mb-3 sm:mb-4 text-gray-300" />
                <p className="text-sm sm:text-base">Không có media nào để hiển thị</p>
                <button 
                  onClick={() => setShowUploadModal(true)}
                  className="btn mt-3 sm:mt-4 flex items-center gap-2 mx-auto touch-target"
                >
                  <Upload size={18} />
                  <span className="text-sm sm:text-base">Tải lên media đầu tiên</span>
                </button>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
                {media.map((item) => (
                  <div key={item._id} className="bg-white rounded-lg shadow-sm border overflow-hidden group">
                    <div 
                      className="aspect-square relative bg-gray-100 cursor-pointer"
                      onClick={() => handleViewMedia(item._id)}
                    >
                      {item.type === "video" ? (
                        <>
                          <video
                            src={item.url}
                            className="w-full h-full object-cover"
                            muted
                            preload="metadata"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-black bg-opacity-60 rounded-full p-2 sm:p-3">
                              <Video size={20} className="text-white" />
                            </div>
                          </div>
                        </>
                      ) : (
                        <img
                          src={item.thumbnail || item.url}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1 sm:gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewMedia(item._id);
                          }}
                          className="bg-white bg-opacity-90 p-1.5 sm:p-2 rounded-full hover:bg-opacity-100 touch-target"
                          title="Xem chi tiết"
                        >
                          <Eye size={14} />
                        </button>
                        <a 
                          href={item.url} 
                          download={item.originalName}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-white bg-opacity-90 p-1.5 sm:p-2 rounded-full hover:bg-opacity-100 touch-target"
                        >
                          <Download size={14} />
                        </a>
                      </div>
                      </div>
                    </div>
                    <div className="p-2 sm:p-3">
                      <h3 className="font-medium text-gray-900 text-xs sm:text-sm truncate">{item.title}</h3>
                      <p className="text-gray-500 text-xs">{formatSize(item.size)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {media.map((item) => (
                  <div key={item._id} className="bg-white rounded-lg shadow-sm border p-3 sm:p-4">
                      <div className="flex items-center gap-3 sm:gap-4">
                      <div 
                        className="w-12 h-12 sm:w-16 sm:h-16 relative flex-shrink-0 bg-gray-100 rounded cursor-pointer"
                        onClick={() => handleViewMedia(item._id)}
                      >
                        {item.type === "video" ? (
                          <>
                            <video
                              src={item.url}
                              className="w-full h-full object-cover rounded"
                              muted
                              preload="metadata"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="bg-black bg-opacity-60 rounded p-1">
                                <Video size={14} className="text-white" />
                              </div>
                            </div>
                          </>
                        ) : (
                          <img
                            src={item.thumbnail || item.url}
                            alt={item.title}
                            className="w-full h-full object-cover rounded"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">{item.title}</h3>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-gray-500 text-xs sm:text-sm mt-1">
                          <span>{item.type === "image" ? "Hình ảnh" : "Video"}</span>
                          <span className="hidden sm:inline">•</span>
                          <span>{formatSize(item.size)}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden sm:inline">{formatDate(item.uploadedAt)}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="flex items-center gap-1">
                            <Eye size={12} />
                            {item.views}
                          </span>
                        </div>
                        <div className="sm:hidden text-xs text-gray-500 mt-1">
                          {formatDate(item.uploadedAt)}
                        </div>
                      </div>
                      <div className="flex gap-1 sm:gap-2">
                        <button 
                          onClick={() => handleViewMedia(item._id)}
                          className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 touch-target"
                          title="Xem chi tiết"
                        >
                          <Eye size={16} />
                        </button>
                        <a 
                          href={item.url} 
                          download={item.originalName}
                          className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 touch-target"
                          title="Tải xuống"
                        >
                          <Download size={16} />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <MediaUpload
            onUploadSuccess={handleUploadSuccess}
            onClose={() => setShowUploadModal(false)}
          />
        )}

        {/* Media Viewer Modal */}
        {viewingMedia && (
          <MediaViewer
            media={viewingMedia}
            onClose={() => setViewingMedia(null)}
          />
        )}
      </div>
    </div>
  );
}
