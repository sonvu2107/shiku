import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
   Plus, Search, Filter, Grid, List, Users, MapPin, Calendar,
   TrendingUp, Star, Globe, Lock, EyeOff, MoreVertical, Settings, UserMinus, UserPlus, Check, Tag, Crown
} from 'lucide-react';
import { api } from '../api';
import { useSEO } from '../utils/useSEO';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';
import { getUserAvatarUrl, AVATAR_SIZES } from '../utils/avatarUtils';
import { useToast } from '../contexts/ToastContext';
import Avatar from '../components/Avatar';

// --- UI COMPONENTS (Đồng bộ Design System) ---

const GridPattern = () => (
   <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-black bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
      <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[500px] w-[500px] rounded-full bg-neutral-200 dark:bg-neutral-900 opacity-20 blur-[100px]"></div>
   </div>
);

const NoiseOverlay = () => (
   <div className="fixed inset-0 z-50 pointer-events-none opacity-[0.03] mix-blend-overlay"
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
   />
);

// Card có hiệu ứng đèn pin
const SpotlightGroupCard = ({ group, onJoin, onLeave, userRole, isJoining, isLeaving }) => {
   const divRef = useRef(null);
   const [position, setPosition] = useState({ x: 0, y: 0 });
   const [opacity, setOpacity] = useState(0);
   const navigate = useNavigate();

   const handleMouseMove = (e) => {
      if (!divRef.current) return;
      const div = divRef.current;
      const rect = div.getBoundingClientRect();
      setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
   };

   const isMember = !!userRole;
   const isOwner = userRole === 'owner';
   const isPending = !!group.hasPendingJoinRequest;

   // Icon loại nhóm
   const TypeIcon = group.settings?.type === 'private' ? Lock : group.settings?.type === 'secret' ? EyeOff : Globe;

   return (
      <motion.div
         ref={divRef}
         onMouseMove={handleMouseMove}
         onMouseEnter={() => setOpacity(1)}
         onMouseLeave={() => setOpacity(0)}
         initial={{ opacity: 0, y: 20 }}
         whileInView={{ opacity: 1, y: 0 }}
         viewport={{ once: true }}
         className="relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 transition-all duration-300 hover:shadow-xl group cursor-default h-full flex flex-col"
      >
         {/* Spotlight Effect */}
         <div
            className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 z-0"
            style={{
               opacity,
               background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, rgba(150,150,150,0.1), transparent 40%)`,
            }}
         />

         <div className="relative z-10 flex flex-col h-full">
            {/* Cover */}
            <div className="h-32 w-full relative overflow-hidden">
               {group.coverImage ? (
                  <img src={group.coverImage} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
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

               <Link to={`/groups/${group._id}`} className="block mb-1 mt-10">
                  <h3 className="font-bold text-lg text-neutral-900 dark:text-white hover:text-black dark:text-white transition-colors line-clamp-1">
                     {group.name}
                  </h3>
               </Link>

               <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3 line-clamp-2 flex-1">
                  {group.description || "Chưa có mô tả"}
               </p>

               {/* Stats - Thành viên */}
               <div className="flex items-center gap-4 text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
                  <div className="flex items-center gap-1.5"><Users size={14} /> {group.stats?.memberCount || group.memberCount || 0} thành viên</div>
               </div>

               {/* Location - Vị trí */}
               {group.location?.name && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-400 dark:text-neutral-400 mb-3">
                     <MapPin size={12} />
                     <span className="line-clamp-1">{group.location.name}</span>
                  </div>
               )}

               {/* Tags */}
               {group.tags && group.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                     {group.tags.slice(0, 2).map((tag, index) => (
                        <span
                           key={index}
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

               {/* Owner Info - Chủ sở hữu */}
               {group.owner && (
                  <div className="flex items-center gap-2 mb-5 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                     <Avatar
                        src={group.owner.avatarUrl}
                        name={group.owner?.name || group.owner?.fullName || 'Owner'}
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
                  {isOwner ? (
                     <button onClick={() => navigate(`/groups/${group._id}`)} className="w-full py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold text-sm hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
                        Quản lý
                     </button>
                  ) : isMember ? (
                     <div className="flex gap-2">
                        <button onClick={() => navigate(`/groups/${group._id}`)} className="flex-1 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold text-sm hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors flex items-center justify-center gap-2">
                           <Check size={16} /> Đã tham gia
                        </button>
                        <button
                           onClick={() => onLeave(group._id)}
                           disabled={isLeaving}
                           className="px-3 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                           <UserMinus size={18} />
                        </button>
                     </div>
                  ) : isPending ? (
                     <button className="w-full py-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/50 text-yellow-600 dark:text-yellow-400 font-bold text-sm cursor-default flex items-center justify-center gap-2">
                        Đang chờ duyệt...
                     </button>
                  ) : (
                     <button
                        onClick={() => onJoin(group._id)}
                        disabled={isJoining}
                        className="w-full py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold text-sm hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                     >
                        {isJoining ? "..." : <><UserPlus size={16} className="text-white dark:text-black" /> Tham gia</>}
                     </button>
                  )}
               </div>
            </div>
         </div>
      </motion.div>
   );
};

export default function Groups() {
   const navigate = useNavigate();
   const { showError } = useToast();

   // State
   const [groups, setGroups] = useState([]);
   const [myGroups, setMyGroups] = useState([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);

   // Filter & Pagination
   const [activeTab, setActiveTab] = useState('discover');
   const [searchTerm, setSearchTerm] = useState('');
   const [currentPage, setCurrentPage] = useState(1);
   const [totalPages, setTotalPages] = useState(1);
   const [totalGroups, setTotalGroups] = useState(0);

   // UI State
   const [isJoining, setIsJoining] = useState({});
   const [isLeaving, setIsLeaving] = useState({});

   useSEO({
      title: "Nhóm - Shiku",
      description: "Khám phá và tham gia các nhóm cộng đồng thú vị trên Shiku",
   });

   // API Calls
   const loadGroups = async (page = 1, reset = false) => {
      try {
         setLoading(true);
         const params = new URLSearchParams({ page: page.toString(), limit: '12', search: searchTerm });
         const response = await api(`/api/groups?${params}`);
         if (response.success) {
            if (reset) setGroups(response.data.groups);
            else {
               setGroups(prev => {
                  const existing = new Set(prev.map(g => g._id));
                  return [...prev, ...response.data.groups.filter(g => !existing.has(g._id))];
               });
            }
            setCurrentPage(response.data.pagination.current);
            setTotalPages(response.data.pagination.pages);
            setTotalGroups(response.data.pagination.total);
         }
      } catch (err) { setError('Không thể tải danh sách nhóm'); }
      finally { setLoading(false); }
   };

   const loadMyGroups = async () => {
      try {
         const response = await api('/api/groups/my-groups');
         if (response.success) setMyGroups(response.data.groups);
      } catch (error) { }
   };

   useEffect(() => {
      loadGroups(1, true);
      loadMyGroups();
   }, []);

   useEffect(() => {
      const delaySearch = setTimeout(() => {
         if (activeTab === 'discover') loadGroups(1, true);
      }, 500);
      return () => clearTimeout(delaySearch);
   }, [searchTerm]);

   // Actions
   const handleJoin = async (groupId) => {
      setIsJoining(prev => ({ ...prev, [groupId]: true }));
      try {
         const res = await api(`/api/groups/${groupId}/join`, { method: "POST", body: {} });
         if (res.success) {
            // Optimistic update: cập nhật UI ngay lập tức
            if (res.joined) {
               // Đã join thành công -> update userRole = 'member' ngay
               setGroups(prev => prev.map(g =>
                  g._id === groupId ? { ...g, userRole: 'member' } : g
               ));
            } else if (res.pending) {
               // Đang chờ duyệt -> update để hiển thị pending state
               setGroups(prev => prev.map(g =>
                  g._id === groupId ? { ...g, hasPendingJoinRequest: true } : g
               ));
            }
            // Reload data trong background để sync với server
            loadMyGroups();
         }
      } catch (err) { showError(err.message || 'Không thể tham gia nhóm'); }
      finally { setIsJoining(prev => ({ ...prev, [groupId]: false })); }
   };

   const handleLeave = async (groupId) => {
      if (!confirm("Bạn có chắc muốn rời nhóm?")) return;
      setIsLeaving(prev => ({ ...prev, [groupId]: true }));
      try {
         const res = await api(`/api/groups/${groupId}/leave`, { method: "POST", body: {} });
         if (res.success) {
            // Optimistic update: xóa userRole ngay lập tức
            setGroups(prev => prev.map(g =>
               g._id === groupId ? { ...g, userRole: null, hasPendingJoinRequest: false } : g
            ));
            // Reload myGroups trong background
            loadMyGroups();
         }
      } catch (err) { showError(err.message || 'Không thể rời nhóm'); }
      finally { setIsLeaving(prev => ({ ...prev, [groupId]: false })); }
   };

   return (
      <div className="min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-white transition-colors duration-300 font-sans relative overflow-x-hidden pb-32">
         <NoiseOverlay />
         <GridPattern />

         <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24">

            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
               <div>
                  <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2">Cộng đồng</h1>
                  <p className="text-neutral-500 text-lg">Tìm kiếm bộ lạc của bạn</p>
               </div>

               <div className="flex gap-3 w-full md:w-auto">
                  <div className="relative flex-1 md:w-80 group">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" size={20} />
                     <input
                        type="text"
                        placeholder="Tìm kiếm nhóm..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-neutral-100 dark:bg-neutral-900 border border-transparent focus:bg-white dark:focus:bg-black focus:border-neutral-300 dark:focus:border-neutral-700 rounded-2xl py-3 pl-12 pr-4 outline-none transition-all shadow-sm"
                     />
                  </div>
                  <Link
                     to="/groups/create"
                     className="bg-black dark:bg-white text-white dark:text-black p-3 rounded-2xl hover:scale-105 transition-transform shadow-lg flex items-center justify-center"
                     title="Tạo nhóm mới"
                  >
                     <Plus size={24} className="text-white dark:text-black" />
                  </Link>
               </div>
            </div>

            {/* --- TABS --- */}
            <div className="mb-8 bg-white/80 dark:bg-black/80 backdrop-blur-xl rounded-2xl p-1.5 border border-neutral-200 dark:border-neutral-800 inline-flex w-full md:w-auto">
               {[
                  { id: 'discover', label: 'Khám phá', icon: Globe, count: totalGroups },
                  { id: 'my-groups', label: 'Nhóm của tôi', icon: Users, count: myGroups.length },
               ].map(tab => (
                  <button
                     key={tab.id}
                     onClick={() => setActiveTab(tab.id)}
                     className={cn(
                        "flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 min-h-[44px] rounded-xl text-sm font-bold transition-all whitespace-nowrap text-center touch-manipulation",
                        activeTab === tab.id
                           ? "bg-black dark:bg-white text-white dark:text-black shadow-md"
                           : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                     )}
                  >
                     <tab.icon size={16} className="flex-shrink-0 hidden md:block" />
                     <span>{tab.label}</span>
                     {tab.count > 0 && (
                        <span className={cn(
                           "text-xs px-1.5 py-0.5 rounded-md ml-1 font-bold flex-shrink-0",
                           activeTab === tab.id
                              ? "bg-white/20 dark:bg-black/20 text-white dark:text-black"
                              : "bg-neutral-300 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
                        )}>
                           {tab.count}
                        </span>
                     )}
                  </button>
               ))}
            </div>

            {/* --- CONTENT --- */}
            <div className="min-h-[400px] pb-8">
               {activeTab === 'discover' && (
                  <>
                     {loading && groups.length === 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                           {[1, 2, 3, 4].map(i => <div key={i} className="h-80 bg-neutral-100 dark:bg-neutral-900 rounded-2xl animate-pulse" />)}
                        </div>
                     ) : groups.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                           {groups.map(group => (
                              <SpotlightGroupCard
                                 key={group._id}
                                 group={group}
                                 onJoin={handleJoin}
                                 onLeave={handleLeave}
                                 userRole={group.userRole}
                                 isJoining={isJoining[group._id]}
                                 isLeaving={isLeaving[group._id]}
                              />
                           ))}
                        </div>
                     ) : (
                        <motion.div
                           initial={{ opacity: 0, y: 20 }}
                           animate={{ opacity: 1, y: 0 }}
                           transition={{ duration: 0.4 }}
                           className="text-center py-20"
                        >
                           <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 rounded-full flex items-center justify-center shadow-inner">
                              <Users size={40} className="text-neutral-400 dark:text-neutral-500" />
                           </div>
                           <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Không tìm thấy nhóm nào</h3>
                           <p className="text-neutral-500 dark:text-neutral-400 mb-6">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</p>
                        </motion.div>
                     )}

                     {/* Load More */}
                     {currentPage < totalPages && !loading && (
                        <div className="flex justify-center mt-12">
                           <button onClick={() => loadGroups(currentPage + 1)} className="px-8 py-3 bg-neutral-100 dark:bg-neutral-900 rounded-full font-bold hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors">
                              Tải thêm nhóm
                           </button>
                        </div>
                     )}
                  </>
               )}

               {activeTab === 'my-groups' && (
                  myGroups.length > 0 ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {myGroups.map(group => (
                           <SpotlightGroupCard
                              key={group._id}
                              group={group}
                              onJoin={handleJoin}
                              onLeave={handleLeave}
                              userRole={group.userRole} // API my-groups thường trả về role
                              isJoining={isJoining[group._id]}
                              isLeaving={isLeaving[group._id]}
                           />
                        ))}
                     </div>
                  ) : (
                     <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="text-center py-20 bg-neutral-50 dark:bg-neutral-900 rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-800"
                     >
                        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center shadow-inner">
                           <Users size={40} className="text-black dark:text-white dark:text-blue-400" />
                        </div>
                        <h3 className="font-bold text-xl text-neutral-900 dark:text-white mb-2">Bạn chưa tham gia nhóm nào</h3>
                        <p className="text-neutral-500 dark:text-neutral-400 mb-6">Khám phá các cộng đồng thú vị ngay!</p>
                        <button
                           onClick={() => setActiveTab('discover')}
                           className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold hover:scale-105 transition-transform shadow-lg"
                        >
                           Khám phá ngay
                        </button>
                     </motion.div>
                  )
               )}
            </div>

         </div>
      </div>
   );
}
