import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import { Search, Users, MessageSquare, Hash, TrendingUp, ArrowRight, Globe, Lock, EyeOff, Crown, MapPin, UserPlus, Check, UserMinus } from "lucide-react";
import UserName from "../components/UserName";
import UserAvatar from "../components/UserAvatar";
import { getUserAvatarUrl, AVATAR_SIZES } from "../utils/avatarUtils";
import { useSEO } from "../utils/useSEO";
import ModernPostCard from "../components/ModernPostCard";
import { PageLayout, PageHeader, SpotlightCard } from "../components/ui/DesignSystem";
import { motion } from "framer-motion";
import { cn } from "../utils/cn";
import BackToTop from "../components/BackToTop";
import Pagination from "../components/admin/Pagination";

/**
 * Explore - Trang khám phá nội dung (Redesigned)
 * Style: Monochrome Luxury
 */
export default function Explore({ user }) {
   const [searchParams] = useSearchParams();
   const navigate = useNavigate();
   const [activeTab, setActiveTab] = useState("posts");
   const [posts, setPosts] = useState([]);
   const [users, setUsers] = useState([]);
   const [groups, setGroups] = useState([]);
   const [trendingTags, setTrendingTags] = useState([]);
   const [loading, setLoading] = useState(false);
   const [searchQuery, setSearchQuery] = useState("");

   // Pagination state for users
   const [usersPage, setUsersPage] = useState(1);
   const usersPerPage = 12;

   // SEO
   useSEO({
      title: searchQuery ? `Tìm kiếm "${searchQuery}" - Shiku` : "Khám phá - Shiku",
      description: "Khám phá bài viết, người dùng, nhóm và sự kiện thú vị trên Shiku",
      robots: "index, follow",
      canonical: "https://shiku.click/explore"
   });

   useEffect(() => {
      const queryFromUrl = searchParams.get('q');
      if (queryFromUrl) {
         setSearchQuery(queryFromUrl);
         performSearch(queryFromUrl);
      } else {
         loadExploreData();
      }
   }, [searchParams]);

   const performSearch = async (query) => {
      if (!query.trim()) {
         loadExploreData();
         return;
      }
      setLoading(true);
      try {
         const [postsRes, usersRes, groupsRes] = await Promise.all([
            api(`/api/posts?q=${encodeURIComponent(query)}&limit=50`),
            api(`/api/users/search?q=${encodeURIComponent(query)}`),
            api(`/api/groups?search=${encodeURIComponent(query)}&limit=20`)
         ]);
         setPosts(postsRes.items || []);
         setUsers(usersRes.users || []);
         setGroups(groupsRes.data?.groups || []);
         setUsersPage(1); // Reset pagination
      } catch (error) {
         setPosts([]); setUsers([]); setGroups([]);
      } finally {
         setLoading(false);
      }
   };

   const loadExploreData = async () => {
      setLoading(true);
      try {
         const [postsRes, usersRes, groupsRes] = await Promise.all([
            api("/api/posts?limit=50"),
            api("/api/users/search?q="),
            api("/api/groups?limit=20")
         ]);

         setPosts(postsRes.items || []);
         setUsers(usersRes.users || []);
         setGroups(groupsRes.data?.groups || []);
         setUsersPage(1); // Reset pagination
         loadTrendingTags(postsRes.items || []);
      } catch (error) {
         setPosts([]); setUsers([]); setGroups([]); setTrendingTags([]);
      } finally {
         setLoading(false);
      }
   };

   const loadTrendingTags = (postsData) => {
      try {
         const tagCount = {};
         postsData?.forEach(post => {
            if (post.tags && Array.isArray(post.tags)) {
               post.tags.forEach(tag => {
                  if (tag && tag.trim()) {
                     const normalizedTag = tag.trim().toLowerCase();
                     tagCount[normalizedTag] = (tagCount[normalizedTag] || 0) + 1;
                  }
               });
            }
         });
         const sortedTags = Object.entries(tagCount)
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 20);
         setTrendingTags(sortedTags);
      } catch (error) {
         setTrendingTags([]);
      }
   };

   const handleSearch = async (e) => {
      e.preventDefault();
      performSearch(searchQuery);
   };

   const tabs = [
      { id: "posts", label: "Bài viết", icon: MessageSquare },
      { id: "users", label: "Người dùng", icon: Users },
      { id: "groups", label: "Nhóm", icon: Users }, // Icon group tạm dùng Users
      { id: "tags", label: "Xu hướng", icon: Hash },
   ];

   return (
      <PageLayout>
         {/* Header */}
         <PageHeader
            title="Khám phá"
            subtitle="Tìm kiếm những điều thú vị đang diễn ra"
         />

         {/* Search Bar */}
         <div className="mb-8">
            <div className="flex flex-col md:flex-row gap-4 bg-white/80 dark:bg-black/80 backdrop-blur-xl p-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm transition-all">
               {/* Search Input */}
               <form onSubmit={handleSearch} className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" size={18} />
                  <input
                     type="text"
                     placeholder="Tìm kiếm bài viết, người dùng, nhóm..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full pl-12 pr-4 py-2.5 !bg-transparent border-none outline-none text-neutral-900 dark:text-white placeholder-neutral-400 font-medium"
                  />
               </form>

               {/* Tab Navigation */}
               <div className="flex gap-2 overflow-x-auto no-scrollbar p-1 border-t md:border-t-0 md:border-l border-neutral-200 dark:border-neutral-800 pt-3 md:pt-0 md:pl-2 w-full md:w-auto">
                  {tabs.map((tab) => (
                     <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                           "inline-flex items-center justify-center px-4 py-2 min-h-[40px] rounded-xl text-sm font-bold transition-all whitespace-nowrap text-center",
                           activeTab === tab.id
                              ? "bg-black dark:bg-white text-white dark:text-black shadow-md"
                              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5"
                        )}
                     >
                        {tab.label}
                     </button>
                  ))}
               </div>
            </div>
         </div>

         {/* Content Area */}
         <div className="min-h-[500px] pb-20">
            {loading ? (
               <div className="flex flex-col items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-black dark:border-white border-t-transparent"></div>
                  <p className="mt-4 text-sm text-neutral-500 font-medium">Đang tải nội dung...</p>
               </div>
            ) : (
               <div className="space-y-8">

                  {/* POSTS TAB */}
                  {activeTab === "posts" && (
                     <div className="max-w-2xl mx-auto space-y-6">
                        {posts.length === 0 ? (
                           <div className="text-center py-20 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-[32px]">
                              <MessageSquare size={40} className="mx-auto text-neutral-400 mb-4" />
                              <p className="text-neutral-500 font-medium">Không tìm thấy bài viết nào.</p>
                           </div>
                        ) : (
                           posts.map((post, index) => (
                              <motion.div
                                 key={post._id}
                                 initial={{ opacity: 0, y: 20 }}
                                 whileInView={{ opacity: 1, y: 0 }}
                                 viewport={{ once: true }}
                                 transition={{ delay: index * 0.05 }}
                              >
                                 <ModernPostCard post={post} user={user} hideActionsMenu={true} />
                              </motion.div>
                           ))
                        )}
                     </div>
                  )}

                  {/* USERS TAB */}
                  {activeTab === "users" && (() => {
                     // Pagination logic
                     const totalUsersPages = Math.ceil(users.length / usersPerPage);
                     const paginatedUsers = users.slice(
                        (usersPage - 1) * usersPerPage,
                        usersPage * usersPerPage
                     );
                     const usersPagination = {
                        page: usersPage,
                        totalPages: totalUsersPages,
                        total: users.length,
                        hasPrevPage: usersPage > 1,
                        hasNextPage: usersPage < totalUsersPages
                     };

                     return (
                        <div className="space-y-6">
                           {/* Header */}
                           {users.length > 0 && (
                              <div className="flex items-center justify-between">
                                 <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                    Tìm thấy <span className="font-bold text-neutral-900 dark:text-white">{users.length}</span> người dùng
                                 </p>
                              </div>
                           )}

                           {/* Users Grid - Responsive */}
                           <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                              {users.length === 0 ? (
                                 <div className="col-span-full text-center py-20 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
                                    <Users size={40} className="mx-auto text-neutral-400 mb-4" />
                                    <p className="text-neutral-500 font-medium">Không tìm thấy người dùng nào.</p>
                                 </div>
                              ) : (
                                 paginatedUsers.map((u, index) => (
                                    <motion.div
                                       key={u._id}
                                       initial={{ opacity: 0, y: 20 }}
                                       whileInView={{ opacity: 1, y: 0 }}
                                       viewport={{ once: true }}
                                       transition={{ delay: index * 0.03 }}
                                    >
                                       <SpotlightCard
                                          className="flex flex-col items-center p-3 sm:p-4 text-center hover:border-neutral-300 dark:hover:border-neutral-700 transition-all group cursor-pointer h-full"
                                          onClick={() => navigate(`/user/${u._id}`)}
                                       >
                                          {/* Avatar - Centered properly */}
                                          <div className="flex justify-center mb-3">
                                             <UserAvatar
                                                user={u}
                                                size={64}
                                                showFrame={true}
                                                showBadge={true}
                                             />
                                          </div>

                                          {/* Name */}
                                          <h3 className="font-bold text-sm sm:text-base text-neutral-900 dark:text-white truncate w-full mb-0.5">
                                             <UserName user={u} maxLength={15} />
                                          </h3>

                                          {/* Nickname */}
                                          {u.nickname && (
                                             <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate w-full mb-3">
                                                @{u.nickname}
                                             </p>
                                          )}
                                          {!u.nickname && <div className="mb-3" />}

                                          {/* Button */}
                                          <button className="px-4 py-1.5 sm:py-2 bg-neutral-100 dark:bg-neutral-800 rounded-full text-xs sm:text-sm font-bold hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all w-full mt-auto">
                                             Xem hồ sơ
                                          </button>
                                       </SpotlightCard>
                                    </motion.div>
                                 ))
                              )}
                           </div>

                           {/* Pagination */}
                           {totalUsersPages > 1 && (
                              <Pagination
                                 pagination={usersPagination}
                                 onPageChange={(page) => {
                                    setUsersPage(page);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                 }}
                                 loading={loading}
                                 itemLabel="người dùng"
                              />
                           )}
                        </div>
                     );
                  })()}

                  {/* GROUPS TAB */}
                  {activeTab === "groups" && (
                     <div className="space-y-6">
                        {/* Header với nút tạo nhóm */}
                        <div className="flex items-center justify-between">
                           <div>
                              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Khám phá nhóm</h2>
                              <p className="text-sm text-neutral-500 dark:text-neutral-400">Tham gia các cộng đồng phù hợp với bạn</p>
                           </div>
                           <Link
                              to="/groups/create"
                              className="px-3 py-1.5 md:px-4 md:py-2 bg-black dark:bg-white text-white dark:text-black rounded-full text-xs md:text-sm font-bold hover:opacity-90 transition-opacity whitespace-nowrap"
                           >
                              Tạo nhóm
                           </Link>
                        </div>

                        {groups.length === 0 ? (
                           <div className="text-center py-20 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-[32px]">
                              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center">
                                 <Users size={32} className="text-black dark:text-white dark:text-blue-400" />
                              </div>
                              <p className="text-neutral-500 font-medium mb-2">Không tìm thấy nhóm nào</p>
                              <p className="text-sm text-neutral-400">Hãy thử tìm kiếm với từ khóa khác</p>
                           </div>
                        ) : (
                           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                              {groups.map((group, index) => {
                                 const TypeIcon = group.settings?.type === 'private' ? Lock : group.settings?.type === 'secret' ? EyeOff : Globe;

                                 return (
                                    <motion.div
                                       key={group._id}
                                       initial={{ opacity: 0, y: 20 }}
                                       whileInView={{ opacity: 1, y: 0 }}
                                       viewport={{ once: true }}
                                       transition={{ delay: index * 0.05 }}
                                       className="relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 transition-all duration-300 hover:shadow-xl group cursor-pointer h-full flex flex-col"
                                       onClick={() => navigate(`/groups/${group._id}`)}
                                    >
                                       {/* Cover */}
                                       <div className="h-32 w-full relative overflow-hidden">
                                          {group.coverImage ? (
                                             <img src={group.coverImage} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
                                          ) : group.avatar ? (
                                             <img src={group.avatar} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
                                          ) : (
                                             <div className="w-full h-full bg-gradient-to-br from-neutral-200 to-neutral-400 dark:from-neutral-800 dark:to-neutral-900" />
                                          )}
                                          <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                             <TypeIcon size={12} />
                                             <span className="capitalize">{group.settings?.type === 'public' ? 'Công khai' : group.settings?.type === 'private' ? 'Riêng tư' : 'Bí mật'}</span>
                                          </div>
                                       </div>

                                       {/* Avatar & Info */}
                                       <div className="px-5 pb-5 flex-1 flex flex-col relative">
                                          <div className="absolute -top-8 left-5 z-20">
                                             <div className="w-16 h-16 rounded-2xl border-4 border-white dark:border-[#151515] overflow-hidden bg-neutral-100 dark:bg-neutral-800 shadow-lg">
                                                {group.avatar ? (
                                                   <img src={group.avatar} className="w-full h-full object-cover" alt="" />
                                                ) : (
                                                   <div className="w-full h-full flex items-center justify-center text-neutral-400"><Users size={24} /></div>
                                                )}
                                             </div>
                                          </div>

                                          <h3 className="font-bold text-lg text-neutral-900 dark:text-white hover:text-black dark:text-white transition-colors line-clamp-1 mt-10 mb-1">
                                             {group.name}
                                          </h3>

                                          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3 line-clamp-2 flex-1">
                                             {group.description || "Chưa có mô tả"}
                                          </p>

                                          {/* Stats */}
                                          <div className="flex items-center gap-4 text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
                                             <div className="flex items-center gap-1.5"><Users size={14} /> {group.stats?.memberCount || group.memberCount || group.members?.length || 0} thành viên</div>
                                          </div>

                                          {/* Location */}
                                          {group.location?.name && (
                                             <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-400 dark:text-neutral-400 mb-3">
                                                <MapPin size={12} />
                                                <span className="line-clamp-1">{group.location.name}</span>
                                             </div>
                                          )}

                                          {/* Tags */}
                                          {group.tags && group.tags.length > 0 && (
                                             <div className="flex flex-wrap gap-1.5 mb-3">
                                                {group.tags.slice(0, 2).map((tag, i) => (
                                                   <span
                                                      key={i}
                                                      className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs rounded-lg font-bold"
                                                   >
                                                      #{tag}
                                                   </span>
                                                ))}
                                                {group.tags.length > 2 && (
                                                   <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-500 text-xs rounded-lg font-bold">
                                                      +{group.tags.length - 2}
                                                   </span>
                                                )}
                                             </div>
                                          )}

                                          {/* Owner Info */}
                                          {group.owner && (
                                             <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                                                <UserAvatar
                                                   user={group.owner}
                                                   size={24}
                                                   className="flex-shrink-0"
                                                />
                                                <div className="flex-1 min-w-0">
                                                   <p className="text-xs font-bold text-neutral-400 dark:text-neutral-500">Chủ sở hữu</p>
                                                   <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300 truncate">
                                                      {group.owner?.name || group.owner?.fullName || group.owner?.username || 'Unknown'}
                                                   </p>
                                                </div>
                                                <Crown size={14} className="text-yellow-500 dark:text-yellow-400 flex-shrink-0" />
                                             </div>
                                          )}

                                          {/* Action Button */}
                                          <div className="mt-auto">
                                             <button
                                                onClick={(e) => { e.stopPropagation(); navigate(`/groups/${group._id}`); }}
                                                className="w-full py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold text-sm hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                                             >
                                                <UserPlus size={16} /> Xem nhóm
                                             </button>
                                          </div>
                                       </div>
                                    </motion.div>
                                 );
                              })}
                           </div>
                        )}

                        {/* Link xem thêm */}
                        {groups.length > 0 && (
                           <div className="flex justify-center">
                              <Link
                                 to="/groups"
                                 className="px-8 py-3 bg-neutral-100 dark:bg-neutral-900 rounded-full font-bold hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
                              >
                                 Xem tất cả nhóm
                              </Link>
                           </div>
                        )}
                     </div>
                  )}

                  {/* TAGS TAB */}
                  {activeTab === "tags" && (
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {trendingTags.length === 0 ? (
                           <div className="col-span-full text-center py-20 text-neutral-500">Chưa có xu hướng nào.</div>
                        ) : (
                           trendingTags.map(({ tag, count }, index) => (
                              <SpotlightCard
                                 key={tag}
                                 className="p-5 flex items-center justify-between hover:border-blue-500/30 dark:hover:border-blue-500/30 cursor-pointer transition-colors group"
                                 onClick={() => { setSearchQuery(tag); performSearch(tag); setActiveTab('posts'); }}
                              >
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center font-black text-neutral-400 group-hover:text-black dark:text-white group-hover:bg-neutral-100 dark:bg-neutral-800 dark:group-hover:bg-blue-900/20 transition-colors">
                                       {index + 1}
                                    </div>
                                    <div>
                                       <h4 className="font-bold text-neutral-900 dark:text-white group-hover:text-black dark:text-white dark:group-hover:text-blue-400 transition-colors">#{tag}</h4>
                                       <p className="text-xs text-neutral-500 font-medium">{count} bài viết</p>
                                    </div>
                                 </div>
                                 <TrendingUp size={16} className="text-neutral-300 group-hover:text-black dark:text-white transition-colors" />
                              </SpotlightCard>
                           ))
                        )}
                     </div>
                  )}

               </div>
            )}
         </div>
         <BackToTop />
      </PageLayout>
   );
}
