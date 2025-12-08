import React, { useState, useEffect } from "react";
import { api } from "../api";
import { Image, Video, Upload, Search, Grid, List, Download, Eye, Play, FileImage, Film } from "lucide-react";
import MediaUpload from "../components/MediaUpload";
import MediaViewer from "../components/MediaViewer";
import { PageLayout, PageHeader, SpotlightCard } from "../components/ui/DesignSystem";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../utils/cn";
import BackToTop from "../components/BackToTop";

// --- HELPER FUNCTIONS ---
const formatDate = (dateString) => {
   return new Date(dateString).toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric' });
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

export default function Media() {
   // ==================== STATE ====================
   const [media, setMedia] = useState([]);
   const [loading, setLoading] = useState(true);
   const [searchQuery, setSearchQuery] = useState("");
   const [viewMode, setViewMode] = useState("grid"); // grid, list
   const [filter, setFilter] = useState("all"); // all, image, video
   const [showUploadModal, setShowUploadModal] = useState(false);
   const [viewingMedia, setViewingMedia] = useState(null);

   // ==================== API CALLS ====================
   const loadMedia = async () => {
      setLoading(true);
      try {
         const params = new URLSearchParams();
         if (searchQuery) params.append("search", searchQuery);

         // FIX: Đảm bảo gửi đúng type (image/video) thay vì (images/videos)
         if (filter !== "all") params.append("type", filter);

         const res = await api(`/api/media?${params.toString()}`);

         // Client-side filter fallback (nếu API chưa support filter tốt)
         let fetchedMedia = res.media || [];
         if (filter !== 'all') {
            fetchedMedia = fetchedMedia.filter(m => m.type === filter);
         }

         setMedia(fetchedMedia);
      } catch (error) {
         setMedia([]);
      } finally {
         setLoading(false);
      }
   };

   // Load khi filter thay đổi
   useEffect(() => {
      loadMedia();
   }, [filter]);

   // Debounce search
   useEffect(() => {
      const timer = setTimeout(() => {
         if (searchQuery || searchQuery === "") loadMedia();
      }, 500);
      return () => clearTimeout(timer);
   }, [searchQuery]);

   const handleViewMedia = async (mediaId) => {
      try {
         const mediaItem = media.find(item => item._id === mediaId);
         if (mediaItem) {
            setViewingMedia(mediaItem);
            // Tăng view ngầm
            api(`/api/media/${mediaId}/view`, { method: "POST" }).catch(() => { });
         }
      } catch (_) { }
   };

   const handleUploadSuccess = () => {
      loadMedia();
      setShowUploadModal(false);
   };

   // ==================== RENDER HELPERS ====================
   // FIX: ID ở đây phải là số ít (image, video) để khớp với field 'type' trong DB
   const filters = [
      { id: "all", label: "Tất cả", icon: Grid },
      { id: "image", label: "Hình ảnh", icon: Image },
      { id: "video", label: "Video", icon: Video }
   ];

   return (
      <PageLayout>
         {/* --- HEADER --- */}
         <PageHeader
            title="Kho Lưu Trữ"
            subtitle="Quản lý hình ảnh và video của bạn"
            action={
               <button
                  onClick={() => setShowUploadModal(true)}
                  className="group relative inline-flex items-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold hover:scale-105 transition-transform shadow-lg overflow-hidden"
               >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 dark:via-black/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                  <Upload size={20} className="text-white dark:text-black" />
                  <span className="relative z-10">Tải lên</span>
               </button>
            }
         />

         {/* --- TOOLBAR (Sticky Glass) --- */}
         <div className="flex flex-col md:flex-row gap-4 mb-8 sticky top-24 z-30 bg-white/80 dark:bg-black/80 backdrop-blur-xl p-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm transition-all">
            {/* Search */}
            <div className="relative flex-1 group">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" size={18} />
               <input
                  type="text"
                  placeholder="Tìm kiếm file..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-2.5 bg-transparent border-none outline-none text-neutral-900 dark:text-white placeholder-neutral-400 font-medium"
               />
            </div>

            {/* Filters & View Mode */}
            <div className="flex items-center gap-2 border-t md:border-t-0 md:border-l border-neutral-200 dark:border-neutral-800 pt-2 md:pt-0 md:pl-2 overflow-x-auto no-scrollbar">
               {filters.map(f => (
                  <button
                     key={f.id}
                     onClick={() => setFilter(f.id)}
                     className={cn(
                        "flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 min-h-[40px] rounded-xl text-sm font-bold transition-all whitespace-nowrap text-center",
                        filter === f.id
                           ? "bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white shadow-sm"
                           : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5"
                     )}
                  >
                     <f.icon size={16} className="flex-shrink-0" />
                     <span>{f.label}</span>
                  </button>
               ))}

               <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-800 mx-1 hidden sm:block"></div>

               <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1">
                  <button onClick={() => setViewMode("grid")} className={cn("w-9 h-9 flex items-center justify-center rounded-lg transition-all", viewMode === "grid" ? "bg-white dark:bg-black shadow-sm text-black dark:text-white" : "text-neutral-400 hover:text-neutral-600")}>
                     <Grid size={16} />
                  </button>
                  <button onClick={() => setViewMode("list")} className={cn("w-9 h-9 flex items-center justify-center rounded-lg transition-all", viewMode === "list" ? "bg-white dark:bg-black shadow-sm text-black dark:text-white" : "text-neutral-400 hover:text-neutral-600")}>
                     <List size={16} />
                  </button>
               </div>
            </div>
         </div>

         {/* --- MEDIA CONTENT --- */}
         <div className="min-h-[400px]">
            {loading ? (
               <div className={viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" : "space-y-3"}>
                  {[...Array(10)].map((_, i) => (
                     <div key={i} className={cn("bg-neutral-100 dark:bg-neutral-900 animate-pulse rounded-2xl", viewMode === 'grid' ? "aspect-square" : "h-20 w-full")}></div>
                  ))}
               </div>
            ) : media.length > 0 ? (
               <div className={cn("pb-20", viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" : "flex flex-col gap-3")}>
                  {media.map((item, index) => (
                     <motion.div
                        key={item._id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                           "group relative bg-white dark:bg-[#111] border border-neutral-200 dark:border-neutral-800 overflow-hidden hover:border-neutral-300 dark:hover:border-neutral-600 transition-all duration-300 cursor-pointer",
                           viewMode === 'grid' ? "rounded-2xl aspect-square" : "rounded-xl flex items-center p-3 h-24"
                        )}
                        onClick={() => handleViewMedia(item._id)}
                     >
                        {/* Thumbnail */}
                        <div className={cn("relative overflow-hidden bg-neutral-100 dark:bg-neutral-900", viewMode === 'grid' ? "w-full h-full" : "w-24 h-full rounded-lg flex-shrink-0")}>
                           {item.type === 'video' ? (
                              <>
                                 <video src={item.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" muted />
                                 <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white shadow-lg">
                                       <Play size={14} fill="currentColor" />
                                    </div>
                                 </div>
                              </>
                           ) : (
                              <img
                                 src={item.thumbnail || item.url}
                                 alt={item.title}
                                 className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                                 loading="lazy"
                              />
                           )}

                           {/* Overlay Actions (Grid Mode) */}
                           {viewMode === 'grid' && (
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 backdrop-blur-[2px]">
                                 <div className="p-2 bg-white/20 hover:bg-white text-white hover:text-black rounded-full transition-colors backdrop-blur-md shadow-lg">
                                    <Eye size={18} />
                                 </div>
                                 <a href={item.url} download onClick={(e) => e.stopPropagation()} className="p-2 bg-white/20 hover:bg-white text-white hover:text-black rounded-full transition-colors backdrop-blur-md shadow-lg">
                                    <Download size={18} />
                                 </a>
                              </div>
                           )}
                        </div>

                        {/* Info (List Mode or Grid Overlay) */}
                        {viewMode === 'list' ? (
                           <div className="ml-4 flex-1 min-w-0 flex flex-col justify-center">
                              <h3 className="font-bold text-neutral-900 dark:text-white truncate">{item.title || "Không có tên"}</h3>
                              <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                 <span className="uppercase tracking-wider font-semibold flex items-center gap-1">
                                    {item.type === 'image' ? <Image size={12} /> : <Video size={12} />}
                                    {item.type}
                                 </span>
                                 <span>•</span>
                                 <span>{formatSize(item.size)}</span>
                                 <span>•</span>
                                 <span>{formatDate(item.uploadedAt)}</span>
                              </div>
                           </div>
                        ) : (
                           // Grid Info (Gradient Overlay at bottom)
                           <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                              <p className="text-white text-xs font-medium truncate">{item.title || "Không tên"}</p>
                              <div className="flex justify-between items-center mt-1">
                                 <p className="text-white/70 text-[10px]">{formatSize(item.size)}</p>
                                 <div className="flex items-center gap-1 text-white/70 text-[10px]">
                                    <Eye size={10} /> {item.views}
                                 </div>
                              </div>
                           </div>
                        )}

                        {/* Actions (List Mode) */}
                        {viewMode === 'list' && (
                           <div className="flex items-center gap-2 pr-2">
                              <a href={item.url} download onClick={(e) => e.stopPropagation()} className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
                                 <Download size={20} />
                              </a>
                           </div>
                        )}
                     </motion.div>
                  ))}
               </div>
            ) : (
               // Empty State
               <div className="flex flex-col items-center justify-center py-32 text-center border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-[32px]">
                  <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-900 rounded-full flex items-center justify-center mb-6">
                     {filter === 'video' ? <Film size={32} className="text-neutral-400" /> : <FileImage size={32} className="text-neutral-400" />}
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Chưa có phương tiện nào</h3>
                  <p className="text-neutral-500 max-w-xs mx-auto mb-8">
                     {searchQuery ? `Không tìm thấy kết quả cho "${searchQuery}"` : "Kho lưu trữ của bạn đang trống. Tải lên ngay!"}
                  </p>
                  <button
                     onClick={() => setShowUploadModal(true)}
                     className="px-8 py-3 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-full font-bold hover:scale-105 transition-transform"
                  >
                     Tải lên ngay
                  </button>
               </div>
            )}
         </div>

         {/* Modals */}
         {showUploadModal && <MediaUpload onUploadSuccess={handleUploadSuccess} onClose={() => setShowUploadModal(false)} />}
         {viewingMedia && <MediaViewer media={viewingMedia} onClose={() => setViewingMedia(null)} />}
         <BackToTop />
      </PageLayout>
   );
}
