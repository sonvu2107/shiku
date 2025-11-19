import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Image, Video, Upload, Search, Grid, List, Download, Eye } from "lucide-react";
import MediaUpload from "../components/MediaUpload";
import MediaViewer from "../components/MediaViewer";
import { MediaGridSkeleton, MediaListSkeleton } from "../components/MediaCardSkeleton";

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
      // Silent handling for media loading error
      // Fallback để làm trống mảng nếu API không thành công
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
        loadMedia(); // Reload để cập nhật lượt xem
      }
    } catch (error) {
      // Silent handling for media viewing error
    }
  };

  const handleUploadSuccess = (uploadedMedia) => {
    // Reload media sau khi upload thành công
    loadMedia();
    setShowUploadModal(false);
  };

  const filters = [
    { id: "all", label: "Tất cả", icon: Grid },
    { id: "images", label: "Hình ảnh", icon: Image },
    { id: "videos", label: "Video", icon: Video }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16 sm:pt-20 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Kho ảnh & video của bạn</h1>
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 z-10" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm phương tiện..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                        focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent 
                        outline-none text-sm sm:text-base bg-white dark:bg-gray-800 
                        text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 
                        shadow-sm dark:shadow-gray-900/50 transition-all duration-200
                        hover:border-gray-400 dark:hover:border-gray-500"
            />
          </form>

          {/* Filters and View Mode */}
          <div className="flex flex-col gap-4">
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit min-w-full transition-colors duration-200">
                {filters.map((filterItem) => {
                  const Icon = filterItem.icon;
                  return (
                    <button
                      key={filterItem.id}
                      onClick={() => setFilter(filterItem.id)}
                      className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-md transition-colors text-sm whitespace-nowrap touch-target flex-shrink-0 ${
                        filter === filterItem.id
                          ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                      }`}
                    >
                      <Icon size={16} />
                      <span className="hidden sm:inline">{filterItem.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit transition-colors duration-200" role="group" aria-label="Chế độ xem">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-md transition-colors touch-target ${
                  viewMode === "grid"
                    ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
                title="Lưới"
                aria-label="Xem dạng lưới"
                aria-pressed={viewMode === "grid"}
              >
                <Grid size={16} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-md transition-colors touch-target ${
                  viewMode === "list"
                    ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
                title="Danh sách"
                aria-label="Xem dạng danh sách"
                aria-pressed={viewMode === "list"}
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Media Content */}
        {loading ? (
          <div>
            {viewMode === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 lg:gap-5">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <MediaGridSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <MediaListSkeleton key={i} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {media.length === 0 ? (
              <div className="bg-white dark:bg-[#111] rounded-[32px] px-5 pt-4 pb-6 mb-6
              shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]
              border border-transparent dark:border-white/5 text-center py-12 sm:py-16">
                <Image size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600 opacity-60" />
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-4">Không có phương tiện nào để hiển thị</p>
                <button 
                  onClick={() => setShowUploadModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium"
                  aria-label="Tải lên phương tiện đầu tiên"
                >
                  <Upload size={18} />
                  <span className="text-sm sm:text-base">Tải lên phương tiện đầu tiên</span>
                </button>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 lg:gap-5">
                {media.map((item) => (
                  <div key={item._id} className="bg-white dark:bg-[#111] rounded-[32px] overflow-hidden group
                  shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]
                  hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_12px_40px_rgb(0,0,0,0.6)]
                  transition-all duration-500 hover:-translate-y-1 border border-transparent dark:border-white/5">
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
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                      {/* Action bar - góc phải trên, chỉ hiện khi hover */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1 sm:gap-2 z-10">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewMedia(item._id);
                          }}
                          className="bg-white dark:bg-gray-800 bg-opacity-90 dark:bg-opacity-90 p-1.5 sm:p-2 rounded-full hover:bg-opacity-100 dark:hover:bg-opacity-100 touch-target shadow-lg"
                          title="Xem chi tiết"
                        >
                          <Eye size={14} className="text-gray-700 dark:text-gray-300" />
                        </button>
                        <a 
                          href={item.url} 
                          download={item.originalName}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-white dark:bg-gray-800 bg-opacity-90 dark:bg-opacity-90 p-1.5 sm:p-2 rounded-full hover:bg-opacity-100 dark:hover:bg-opacity-100 touch-target shadow-lg"
                          title="Tải xuống"
                        >
                          <Download size={14} className="text-gray-700 dark:text-gray-300" />
                        </a>
                      </div>
                    </div>
                    <div className="p-2 sm:p-3">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 text-xs sm:text-sm truncate">{item.title}</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">{formatSize(item.size)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {media.map((item) => (
                  <div key={item._id} className="bg-white dark:bg-[#111] rounded-[32px] px-5 pt-4 pb-6 mb-6
                  shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]
                  hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_12px_40px_rgb(0,0,0,0.6)]
                  transition-all duration-500 hover:-translate-y-1 border border-transparent dark:border-white/5">
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
                            loading="lazy"
                            decoding="async"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base truncate">{item.title}</h3>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1">
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
                        <div className="sm:hidden text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {formatDate(item.uploadedAt)}
                        </div>
                      </div>
                      <div className="flex gap-1 sm:gap-2">
                        <button 
                          onClick={() => handleViewMedia(item._id)}
                          className="p-1.5 sm:p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 touch-target transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye size={16} />
                        </button>
                        <a 
                          href={item.url} 
                          download={item.originalName}
                          className="p-1.5 sm:p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 touch-target transition-colors"
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
