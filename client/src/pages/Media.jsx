import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Image, Video, Upload, Search, Grid, List, Download, Eye } from "lucide-react";

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
      await api(`/api/media/${mediaId}/view`, { method: "POST" });
      loadMedia(); // Reload media to update view count
    } catch (error) {
      console.error("Error updating media views:", error);
    }
  };

  const filters = [
    { id: "all", label: "Tất cả", icon: Grid },
    { id: "images", label: "Hình ảnh", icon: Image },
    { id: "videos", label: "Video", icon: Video }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Kho media</h1>
            <button className="btn flex items-center gap-2">
              <Upload size={20} />
              Tải lên
            </button>
          </div>
          
          {/* Search */}
          <form onSubmit={handleSearch} className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Tìm kiếm media..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </form>

          {/* Filters and View Mode */}
          <div className="flex items-center justify-between">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              {filters.map((filterItem) => {
                const Icon = filterItem.icon;
                return (
                  <button
                    key={filterItem.id}
                    onClick={() => setFilter(filterItem.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                      filter === filterItem.id
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <Icon size={16} />
                    {filterItem.label}
                  </button>
                );
              })}
            </div>

            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-md transition-colors ${
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
                className={`p-2 rounded-md transition-colors ${
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
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div>
            {media.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Image size={48} className="mx-auto mb-4 text-gray-300" />
                <p>Không có media nào để hiển thị</p>
                <button className="btn mt-4 flex items-center gap-2 mx-auto">
                  <Upload size={20} />
                  Tải lên media đầu tiên
                </button>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {media.map((item) => (
                  <div key={item._id} className="bg-white rounded-lg shadow-sm border overflow-hidden group">
                    <div className="aspect-square relative">
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      {item.type === "video" && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-black bg-opacity-50 rounded-full p-2">
                            <Video size={24} className="text-white" />
                          </div>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                        <button 
                          onClick={() => handleViewMedia(item._id)}
                          className="bg-white bg-opacity-90 p-2 rounded-full hover:bg-opacity-100"
                        >
                          <Eye size={16} />
                        </button>
                        <a 
                          href={item.url} 
                          download={item.originalName}
                          className="bg-white bg-opacity-90 p-2 rounded-full hover:bg-opacity-100"
                        >
                          <Download size={16} />
                        </a>
                      </div>
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-gray-900 text-sm truncate">{item.title}</h3>
                      <p className="text-gray-500 text-xs">{formatSize(item.size)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {media.map((item) => (
                  <div key={item._id} className="bg-white rounded-lg shadow-sm border p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 relative flex-shrink-0">
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-full h-full object-cover rounded"
                        />
                        {item.type === "video" && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-black bg-opacity-50 rounded p-1">
                              <Video size={16} className="text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{item.title}</h3>
                        <div className="flex items-center gap-4 text-gray-500 text-sm mt-1">
                          <span>{item.type === "image" ? "Hình ảnh" : "Video"}</span>
                          <span>•</span>
                          <span>{formatSize(item.size)}</span>
                          <span>•</span>
                          <span>{formatDate(item.uploadedAt)}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Eye size={14} />
                            {item.views}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleViewMedia(item._id)}
                          className="p-2 text-gray-400 hover:text-gray-600"
                        >
                          <Eye size={18} />
                        </button>
                        <a 
                          href={item.url} 
                          download={item.originalName}
                          className="p-2 text-gray-400 hover:text-gray-600"
                        >
                          <Download size={18} />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
