import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Calendar, MapPin, Clock, Users, Plus, Search, Globe, Lock } from "lucide-react";
import { useSEO } from "../utils/useSEO";
import { PageLayout, PageHeader, SpotlightCard } from "../components/ui/DesignSystem";
import { motion } from "framer-motion";
import { cn } from "../utils/cn";

// --- COMPONENT CON: EVENT CARD (STYLE MỚI) ---
const EventCard = ({ event, onJoin }) => {
   const dateObj = new Date(event.date);
   const dateStr = dateObj.toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric' });
   const timeStr = dateObj.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
   const isUpcoming = dateObj > new Date();

   // Màu sắc badge dựa trên trạng thái tham gia
   let statusBadge = null;
   if (event.userRole === 'creator') statusBadge = <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Của tôi</span>;
   else if (event.userRole === 'attendee') statusBadge = <span className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Đã tham gia</span>;
   else if (isUpcoming) statusBadge = <span className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Sắp diễn ra</span>;

   return (
      <SpotlightCard className="h-full flex flex-col p-0 border-0 overflow-hidden group">
         {/* Image Container */}
         <div className="relative h-48 overflow-hidden">
            {event.coverImage ? (
               <img
                  src={event.coverImage}
                  alt={event.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
               />
            ) : (
               <div className="w-full h-full bg-gradient-to-br from-neutral-200 to-neutral-400 dark:from-neutral-800 dark:to-neutral-900 flex items-center justify-center">
                  <Calendar className="w-12 h-12 text-neutral-400 dark:text-neutral-600" />
               </div>
            )}

            {/* Overlay Date Badge */}
            <div className="absolute top-3 left-3 bg-white/90 dark:bg-black/80 backdrop-blur-sm rounded-xl px-3 py-1.5 flex flex-col items-center shadow-lg border border-white/20 dark:border-white/10">
               <span className="text-xs font-bold text-neutral-500 uppercase">{dateObj.toLocaleString('vi-VN', { month: 'short' })}</span>
               <span className="text-xl font-black text-neutral-900 dark:text-white leading-none">{dateObj.getDate()}</span>
            </div>

            {/* Type Badge */}
            <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md text-white p-1.5 rounded-full">
               {event.type === 'private' ? <Lock size={14} /> : <Globe size={14} />}
            </div>
         </div>

         {/* Content */}
         <div className="p-5 flex-1 flex flex-col">
            <div className="flex justify-between items-start mb-2 gap-2">
               <h3 className="text-lg font-bold text-neutral-900 dark:text-white line-clamp-2 leading-tight group-hover:text-blue-500 transition-colors">
                  <Link to={`/events/${event._id}`}>{event.title}</Link>
               </h3>
               {statusBadge}
            </div>

            <div className="space-y-2 text-sm text-neutral-500 dark:text-neutral-400 mb-4">
               <div className="flex items-center gap-2">
                  <Clock size={14} /> {timeStr}
               </div>
               <div className="flex items-center gap-2">
                  <MapPin size={14} />
                  <span className="truncate">{event.location || 'Online / Chưa xác định'}</span>
               </div>
               <div className="flex items-center gap-2">
                  <Users size={14} />
                  <span>{event.attendees?.length || 0} người tham gia</span>
               </div>
            </div>

            <div className="mt-auto pt-4 border-t border-neutral-100 dark:border-neutral-800 flex gap-2">
               <Link
                  to={`/events/${event._id}`}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold text-sm text-center hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
               >
                  Chi tiết
               </Link>
               {isUpcoming && !event.userRole && (
                  <button
                     onClick={() => onJoin(event._id)}
                     className="px-4 py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold text-sm hover:scale-105 transition-transform"
                  >
                     Tham gia
                  </button>
               )}
            </div>
         </div>
      </SpotlightCard>
   );
};

// --- MAIN PAGE ---
export default function Events() {
   const [events, setEvents] = useState([]);
   const [loading, setLoading] = useState(true); // Mặc định true để tránh flash empty state
   const [searchQuery, setSearchQuery] = useState("");
   const [filter, setFilter] = useState("all");

   useSEO({
      title: "Sự kiện - Shiku",
      description: "Khám phá và tham gia các sự kiện thú vị trên Shiku",
      robots: "index, follow",
      canonical: "https://shiku.click/events"
   });

   // Load Events
   useEffect(() => {
      const fetchEvents = async () => {
         setLoading(true);
         try {
            const params = new URLSearchParams();
            if (searchQuery) params.append("search", searchQuery);
            if (filter !== "all") params.append("filter", filter);

            const res = await api(`/api/events?${params.toString()}`);
            setEvents(res.events || []);
         } catch (error) {
            setEvents([]);
         } finally {
            setLoading(false);
         }
      };

      // Debounce search
      const timer = setTimeout(fetchEvents, 300);
      return () => clearTimeout(timer);
   }, [filter, searchQuery]);

   const handleJoinEvent = async (eventId) => {
      try {
         await api(`/api/events/${eventId}/join`, { method: "POST" });
         // Optimistic update hoặc reload
         setEvents(prev => prev.map(e => e._id === eventId ? { ...e, userRole: 'attendee', attendees: [...(e.attendees || []), 'me'] } : e));
      } catch (_) { }
   };

   const filters = [
      { id: "all", label: "Tất cả" },
      { id: "upcoming", label: "Sắp tới" },
      { id: "past", label: "Đã qua" },
      { id: "my", label: "Của tôi" }
   ];

   return (
      <PageLayout>
         {/* Header Section */}
         <PageHeader
            title="Sự kiện"
            subtitle="Khám phá những khoảnh khắc đáng nhớ"
            action={
               <Link
                  to="/events/create"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold hover:scale-105 transition-transform shadow-lg"
               >
                  <Plus size={20} /> Tạo sự kiện
               </Link>
            }
         />

         {/* Search & Filter Bar */}
         <div className="flex flex-col md:flex-row gap-4 mb-8 sticky top-24 z-30 bg-white/80 dark:bg-black/80 backdrop-blur-xl p-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            {/* Search Input */}
            <div className="relative flex-1">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
               <input
                  type="text"
                  placeholder="Tìm kiếm sự kiện..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-2.5 bg-transparent border-none outline-none text-neutral-900 dark:text-white placeholder-neutral-400"
               />
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 overflow-x-auto no-scrollbar p-1 border-t md:border-t-0 md:border-l border-neutral-200 dark:border-neutral-800">
               {filters.map(f => (
                  <button
                     key={f.id}
                     onClick={() => setFilter(f.id)}
                     className={cn(
                        "px-4 py-1.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                        filter === f.id
                           ? "bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white"
                           : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300"
                     )}
                  >
                     {f.label}
                  </button>
               ))}
            </div>
         </div>

         {/* Content Grid */}
         <div className="min-h-[400px]">
            {loading ? (
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[1, 2, 3, 4].map(i => <div key={i} className="h-80 bg-neutral-100 dark:bg-neutral-900 rounded-2xl animate-pulse" />)}
               </div>
            ) : events.length > 0 ? (
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                  {events.map(event => (
                     <motion.div
                        key={event._id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                     >
                        <EventCard event={event} onJoin={handleJoinEvent} />
                     </motion.div>
                  ))}
               </div>
            ) : (
               <div className="text-center py-24">
                  <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-6">
                     <Calendar className="w-10 h-10 text-neutral-400" />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Không tìm thấy sự kiện nào</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 mb-8 max-w-sm mx-auto">
                     Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc, hoặc tự tạo sự kiện của riêng bạn.
                  </p>
                  {filter === 'my' ? (
                     <Link to="/events/create" className="px-6 py-2.5 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 transition-colors">
                        Tạo sự kiện ngay
                     </Link>
                  ) : (
                     <button onClick={() => { setFilter('all'); setSearchQuery('') }} className="px-6 py-2.5 border border-neutral-300 dark:border-neutral-700 rounded-full font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                        Xóa bộ lọc
                     </button>
                  )}
               </div>
            )}
         </div>
      </PageLayout>
   );
}
