import React, { useEffect, useState } from "react";
import { api } from "../api";
import ModernPostCard from "../components/ModernPostCard";
import { useSavedPosts } from "../hooks/useSavedPosts";
import { PageLayout, PageHeader, SpotlightCard } from "../components/ui/DesignSystem";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, Search, Grid, List, ArrowRight } from "lucide-react";
import { cn } from "../utils/cn";
import { Link } from "react-router-dom";
import BackToTop from "../components/BackToTop";
import Pagination from "../components/admin/Pagination";

export default function Saved() {
   // ==================== STATE ====================
   const [posts, setPosts] = useState([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);
   const [user, setUser] = useState(null);
   const [viewMode, setViewMode] = useState("list"); // 'list' hoặc 'grid' (cho tương lai nếu muốn layout 2 cột)
   const [pagination, setPagination] = useState({
      page: 1, totalPages: 1, total: 0, hasPrevPage: false, hasNextPage: false
   });
   const { savedMap, updateSavedState } = useSavedPosts(posts);

   // ==================== EFFECTS ====================
   useEffect(() => {
      load();
      loadCurrentUser();
   }, []);

   // ==================== API CALLS ====================
   async function loadCurrentUser() {
      try {
         const res = await api("/api/auth/me");
         setUser(res.user);
      } catch (error) {
         // Silent fail
      }
   }

   async function load(pageNum = 1) {
      try {
         setLoading(true);
         const res = await api(`/api/posts/saved/list?page=${pageNum}&limit=20`);
         setPosts(res.posts || []);
         if (res.pagination) {
            setPagination({
               page: res.pagination.page,
               totalPages: res.pagination.pages,
               total: res.pagination.total,
               hasPrevPage: res.pagination.page > 1,
               hasNextPage: res.pagination.page < res.pagination.pages
            });
         }
      } catch (e) {
         setError("Không thể tải bộ sưu tập");
         setPosts([]);
      } finally {
         setLoading(false);
      }
   }

   const handlePageChange = (newPage) => {
      load(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
   };

   // ==================== HANDLERS ====================
   function handleSavedChange(postId, isSaved) {
      updateSavedState(postId, isSaved);
      // Hiệu ứng xóa dần bài viết khỏi danh sách khi bỏ lưu
      if (!isSaved) {
         // Dùng setTimeout để đợi animation của nút save chạy xong (nếu có)
         // Hoặc xóa ngay lập tức để phản hồi nhanh
         setPosts(prevPosts => prevPosts.filter(p => p._id !== postId));
      }
   }

   // ==================== RENDER ====================
   return (
      <PageLayout>
         {/* --- HEADER --- */}
         <PageHeader
            title="Bộ sưu tập"
            subtitle="Những khoảnh khắc bạn đã lưu giữ"
            action={
               <div className="flex items-center gap-2 bg-white/80 dark:bg-black/80 backdrop-blur-xl p-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                  <button
                     onClick={() => setViewMode("list")}
                     className={cn(
                        "p-2 rounded-lg transition-all",
                        viewMode === "list" ? "bg-black dark:bg-white text-white dark:text-black shadow-md" : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                     )}
                     title="Xem danh sách"
                  >
                     <List size={18} />
                  </button>
                  <button
                     onClick={() => setViewMode("grid")}
                     className={cn(
                        "p-2 rounded-lg transition-all",
                        viewMode === "grid" ? "bg-black dark:bg-white text-white dark:text-black shadow-md" : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                     )}
                     title="Xem lưới (Compact)"
                  >
                     <Grid size={18} />
                  </button>
               </div>
            }
         />

         {/* --- CONTENT AREA --- */}
         <div className="min-h-[500px] max-w-5xl mx-auto">

            {loading ? (
               // Skeleton Loading
               <div className={cn("grid gap-6", viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
                  {[1, 2, 3].map(i => (
                     <div key={i} className="bg-white dark:bg-[#1C1C1E] rounded-[32px] h-96 animate-pulse border border-neutral-200 dark:border-neutral-800"></div>
                  ))}
               </div>
            ) : error ? (
               // Error State
               <div className="text-center py-20 bg-red-50 dark:bg-red-900/10 rounded-[32px] border border-red-100 dark:border-red-900/30">
                  <p className="text-red-600 dark:text-red-400 font-medium mb-4">{error}</p>
                  <button onClick={() => load()} className="px-6 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors">Thử lại</button>
               </div>
            ) : posts.length === 0 ? (
               // Empty State
               <div className="flex flex-col items-center justify-center py-32 text-center border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-[32px]">
                  <div className="w-24 h-24 bg-neutral-100 dark:bg-neutral-900 rounded-full flex items-center justify-center mb-6 shadow-inner">
                     <Bookmark className="w-10 h-10 text-neutral-400" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-2xl font-black text-neutral-900 dark:text-white mb-3">Chưa có gì ở đây</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto mb-8 text-lg">
                     Hãy khám phá Newfeed và lưu lại những bài viết thú vị để xem lại sau nhé.
                  </p>
                  <Link
                     to="/"
                     className="group px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold hover:scale-105 transition-transform shadow-lg flex items-center gap-2"
                  >
                     <Search size={20} /> Khám phá ngay <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
               </div>
            ) : (
               // Posts List
               <div className={cn(
                  "grid gap-6 pb-20",
                  viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-2" : "grid-cols-1"
               )}>
                  <AnimatePresence>
                     {posts.map((p, index) => (
                        <motion.div
                           key={p._id}
                           layout // Auto animate layout changes
                           initial={{ opacity: 0, y: 20 }}
                           animate={{ opacity: 1, y: 0 }}
                           exit={{ opacity: 0, scale: 0.9 }}
                           transition={{ delay: index * 0.05 }}
                        >
                           <ModernPostCard
                              post={p}
                              user={user}
                              isSaved={true} // Luôn là true trong trang này
                              onSavedChange={handleSavedChange}
                              hideActionsMenu={true}
                              compact={viewMode === 'grid'} // Truyền prop compact nếu muốn card nhỏ hơn ở chế độ grid
                           />
                        </motion.div>
                     ))}
                  </AnimatePresence>
               </div>
            )}

            {/* Pagination */}
            {!loading && posts.length > 0 && (
               <Pagination
                  pagination={pagination}
                  onPageChange={handlePageChange}
                  loading={loading}
                  itemLabel="bài viết"
               />
            )}
         </div>
         <BackToTop />
      </PageLayout>
   );
}
