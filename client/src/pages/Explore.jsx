import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import { Search, Users, MessageSquare, Hash, TrendingUp, ArrowRight } from "lucide-react";
import UserName from "../components/UserName";
import { getUserAvatarUrl, AVATAR_SIZES } from "../utils/avatarUtils";
import { useSEO } from "../utils/useSEO";
import ModernPostCard from "../components/ModernPostCard";
import { PageLayout, PageHeader, SpotlightCard } from "../components/ui/DesignSystem";
import { motion } from "framer-motion";
import { cn } from "../utils/cn";

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

         {/* Search Bar (Sticky Glass) */}
         <div className="sticky top-24 z-30 mb-8">
            <div className="flex flex-col md:flex-row gap-4 bg-white/80 dark:bg-black/80 backdrop-blur-xl p-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm transition-all">
               {/* Search Input */}
               <form onSubmit={handleSearch} className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" size={18} />
                  <input
                     type="text"
                     placeholder="Tìm kiếm bài viết, người dùng, nhóm..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full pl-12 pr-4 py-2.5 bg-transparent border-none outline-none text-neutral-900 dark:text-white placeholder-neutral-400 font-medium"
                  />
               </form>

               {/* Tab Navigation */}
               <div className="flex gap-2 overflow-x-auto no-scrollbar p-1 border-t md:border-t-0 md:border-l border-neutral-200 dark:border-neutral-800 pt-3 md:pt-0 md:pl-2 w-full md:w-auto">
                  {tabs.map((tab) => (
                     <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                           "flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex-1 md:flex-none",
                           activeTab === tab.id
                              ? "bg-black dark:bg-white text-white dark:text-black shadow-md"
                              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5 bg-neutral-50/50 dark:bg-white/5 md:bg-transparent"
                        )}
                     >
                        <tab.icon size={18} /> {tab.label}
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
                  {activeTab === "users" && (
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {users.length === 0 ? (
                           <div className="col-span-full text-center py-20 text-neutral-500">Không tìm thấy người dùng nào.</div>
                        ) : (
                           users.map((user) => (
                              <SpotlightCard key={user._id} className="flex flex-col items-center p-6 text-center hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors group" onClick={() => navigate(`/user/${user._id}`)}>
                                 <div className="relative mb-4">
                                    <img
                                       src={getUserAvatarUrl(user, AVATAR_SIZES.MEDIUM)}
                                       alt={user.name}
                                       className="w-20 h-20 rounded-full object-cover border-4 border-neutral-100 dark:border-neutral-800 group-hover:border-white dark:group-hover:border-neutral-600 transition-colors"
                                    />
                                    {/* Online dot (optional) */}
                                 </div>
                                 <h3 className="font-bold text-lg text-neutral-900 dark:text-white truncate w-full mb-1">
                                    <UserName user={user} />
                                 </h3>
                                 <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate w-full mb-4">{user.email}</p>
                                 <button className="px-6 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-full text-sm font-bold hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all w-full">
                                    Xem hồ sơ
                                 </button>
                              </SpotlightCard>
                           ))
                        )}
                     </div>
                  )}

                  {/* GROUPS TAB */}
                  {activeTab === "groups" && (
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {groups.length === 0 ? (
                           <div className="col-span-full text-center py-20 text-neutral-500">Không tìm thấy nhóm nào.</div>
                        ) : (
                           groups.map((group) => (
                              <SpotlightCard key={group._id} className="p-0 flex flex-col overflow-hidden border-0 h-full group" onClick={() => navigate(`/groups/${group._id}`)}>
                                 <div className="h-32 bg-neutral-200 dark:bg-neutral-800 relative">
                                    {group.avatar && (
                                       <img src={group.avatar} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="" />
                                    )}
                                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                                       <h3 className="text-white font-bold text-lg truncate">{group.name}</h3>
                                    </div>
                                 </div>
                                 <div className="p-5 flex-1 flex flex-col">
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-4 flex-1">
                                       {group.description || "Không có mô tả"}
                                    </p>
                                    <div className="flex justify-between items-center pt-4 border-t border-neutral-100 dark:border-neutral-800">
                                       <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">{group.members?.length || 0} thành viên</span>
                                       <ArrowRight size={16} className="text-neutral-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                                    </div>
                                 </div>
                              </SpotlightCard>
                           ))
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
                                    <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center font-black text-neutral-400 group-hover:text-blue-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                                       {index + 1}
                                    </div>
                                    <div>
                                       <h4 className="font-bold text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">#{tag}</h4>
                                       <p className="text-xs text-neutral-500 font-medium">{count} bài viết</p>
                                    </div>
                                 </div>
                                 <TrendingUp size={16} className="text-neutral-300 group-hover:text-blue-500 transition-colors" />
                              </SpotlightCard>
                           ))
                        )}
                     </div>
                  )}

               </div>
            )}
         </div>
      </PageLayout>
   );
}
