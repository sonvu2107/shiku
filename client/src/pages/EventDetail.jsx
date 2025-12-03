import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import { useSEO } from "../utils/useSEO";
import { motion, AnimatePresence } from "framer-motion";
import {
   Calendar,
   MapPin,
   Clock,
   Users,
   ArrowLeft,
   Edit,
   Trash2,
   UserPlus,
   UserMinus,
   Share2,
   Tag,
   Heart,
   XCircle,
   UserCheck,
   UserX,
   Check,
   MoreVertical,
   Globe,
   Lock
} from "lucide-react";
import { PageLayout, SpotlightCard } from "../components/ui/DesignSystem";
import { getUserAvatarUrl, AVATAR_SIZES } from "../utils/avatarUtils";
import { cn } from "../utils/cn";
import { useToast } from "../contexts/ToastContext";

/**
 * EventDetail - Event detail page (Redesigned)
 * Style: Monochrome Luxury
 */
export default function EventDetail() {
   const { id } = useParams();
   const navigate = useNavigate();
   const { showError } = useToast();
   const [event, setEvent] = useState(null);
   const [loading, setLoading] = useState(true);
   const [actionLoading, setActionLoading] = useState(false);
   const [error, setError] = useState(null);
   const [showMenu, setShowMenu] = useState(false);
   const menuRef = useRef(null);

   // SEO
   useSEO({
      title: event ? `${event.title} - Shiku` : "Sự kiện - Shiku",
      description: event?.description
         ? `${event.description.substring(0, 160)}...`
         : `Xem sự kiện ${event?.title || ''} trên Shiku`,
      robots: "index, follow",
      canonical: event?._id ? `https://shiku.click/events/${event._id}` : undefined
   });

   useEffect(() => {
      loadEvent();
   }, [id]);

   // Close menu when clicking outside
   useEffect(() => {
      const handleClickOutside = (event) => {
         if (menuRef.current && !menuRef.current.contains(event.target)) {
            setShowMenu(false);
         }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
         document.removeEventListener("mousedown", handleClickOutside);
      };
   }, []);

   const loadEvent = async () => {
      setLoading(true);
      try {
         const response = await api(`/api/events/${id}`);
         if (response.success) {
            setEvent(response.event);
         } else {
            setError(response.message || "Không tìm thấy sự kiện");
         }
      } catch (error) {
         setError("Có lỗi xảy ra khi tải sự kiện");
      } finally {
         setLoading(false);
      }
   };

   const handleAction = async (actionType) => {
      setActionLoading(true);
      try {
         let endpoint = "";
         let method = "POST";

         switch (actionType) {
            case "join": endpoint = `/api/events/${id}/join`; break;
            case "leave": endpoint = `/api/events/${id}/leave`; break;
            case "interested": endpoint = `/api/events/${id}/interested`; break;
            case "decline": endpoint = `/api/events/${id}/decline`; break;
            case "delete":
               if (!window.confirm("Bạn có chắc chắn muốn xóa sự kiện này?")) {
                  setActionLoading(false);
                  return;
               }
               endpoint = `/api/events/${id}`;
               method = "DELETE";
               break;
            default: return;
         }

         const response = await api(endpoint, { method });

         if (actionType === "delete") {
            if (response.success) navigate("/events");
            else throw new Error(response.message);
         } else {
            if (response.success) setEvent(response.event);
            else throw new Error(response.message);
         }

      } catch (error) {
         showError(error.message || "Có lỗi xảy ra");
      } finally {
         setActionLoading(false);
         setShowMenu(false);
      }
   };

   const formatDate = (dateString) => {
      const date = new Date(dateString);
      return {
         date: date.toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
         time: date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
         day: date.getDate(),
         month: date.toLocaleString('vi-VN', { month: 'short' }).toUpperCase()
      };
   };

   const isUpcoming = (dateString) => new Date(dateString) > new Date();
   const isPast = (dateString) => new Date(dateString) < new Date();
   const isFull = () => event.maxAttendees && event.attendees.length >= event.maxAttendees;
   const canEdit = () => event.userRole === 'creator';

   if (loading) {
      return (
         <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-black dark:border-white"></div>
         </div>
      );
   }

   if (error || !event) {
      return (
         <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center text-neutral-500">
            <div className="text-center">
               <p className="mb-4 text-lg">{error || "Sự kiện không tồn tại"}</p>
               <button onClick={() => navigate("/events")} className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold">Quay lại</button>
            </div>
         </div>
      );
   }

   const { date, time, day, month } = formatDate(event.date);
   const upcoming = isUpcoming(event.date);
   const past = isPast(event.date);

   return (
      <PageLayout>
         {/* Back Button */}
         <button
            onClick={() => navigate("/events")}
            className="group flex items-center gap-2 text-neutral-500 hover:text-black dark:hover:text-white mb-6 transition-colors"
         >
            <div className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-900 group-hover:bg-neutral-200 dark:group-hover:bg-neutral-800 transition-colors">
               <ArrowLeft size={20} />
            </div>
            <span className="font-medium">Quay lại danh sách</span>
         </button>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT COLUMN: MAIN CONTENT */}
            <div className="lg:col-span-2 space-y-8">

               {/* HERO IMAGE CARD */}
               <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative rounded-[32px] overflow-hidden h-64 md:h-96 group"
               >
                  {event.coverImage ? (
                     <img src={event.coverImage} alt={event.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  ) : (
                     <div className="w-full h-full bg-gradient-to-br from-neutral-200 to-neutral-400 dark:from-neutral-800 dark:to-neutral-900 flex items-center justify-center">
                        <Calendar size={64} className="text-neutral-400 dark:text-neutral-600 opacity-50" />
                     </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />

                  {/* Date Badge (Floating) */}
                  <div className="absolute top-6 left-6 bg-white/90 dark:bg-black/80 backdrop-blur-md rounded-2xl p-3 text-center min-w-[80px] shadow-lg border border-white/20 dark:border-white/10">
                     <span className="block text-sm font-bold text-neutral-500 uppercase tracking-wider">{month}</span>
                     <span className="block text-3xl font-black text-neutral-900 dark:text-white leading-none mt-1">{day}</span>
                  </div>

                  {/* Type Badge */}
                  <div className="absolute top-6 right-6">
                     <span className="flex items-center gap-2 bg-black/50 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-bold border border-white/10">
                        {event.type === 'private' ? <Lock size={14} /> : <Globe size={14} />}
                        {event.type === 'private' ? 'Riêng tư' : 'Công khai'}
                     </span>
                  </div>

                  {/* Title & Location (Overlay) */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                     <h1 className="text-3xl md:text-5xl font-black text-white mb-2 tracking-tight leading-tight drop-shadow-md">{event.title}</h1>
                     <div className="flex flex-wrap items-center gap-4 text-neutral-300 font-medium text-sm md:text-base">
                        <div className="flex items-center gap-2"><Clock size={18} /> {time}</div>
                        <div className="flex items-center gap-2"><MapPin size={18} /> {event.location || 'Online / Chưa xác định'}</div>
                     </div>
                  </div>
               </motion.div>

               {/* DESCRIPTION */}
               <SpotlightCard className="min-h-[200px]">
                  <h2 className="text-2xl font-bold mb-4 text-neutral-900 dark:text-white">Chi tiết sự kiện</h2>
                  <p className="text-neutral-600 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed text-lg">
                     {event.description}
                  </p>

                  {event.tags && event.tags.length > 0 && (
                     <div className="mt-6 flex flex-wrap gap-2">
                        {event.tags.map((tag, i) => (
                           <span key={i} className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-sm font-medium text-neutral-600 dark:text-neutral-400">#{tag}</span>
                        ))}
                     </div>
                  )}
               </SpotlightCard>

               {/* COMMENTS (Placeholder - có thể thêm component comment vào đây) */}
               {/* <div className="mt-8"><CommentSection ... /></div> */}
            </div>

            {/* RIGHT COLUMN: SIDEBAR */}
            <div className="space-y-6">

               {/* CREATOR INFO */}
               <SpotlightCard className="p-5">
                  <div className="flex items-start gap-4 mb-4">
                     <img src={getUserAvatarUrl(event.creator, AVATAR_SIZES.MEDIUM)} className="w-16 h-16 rounded-full object-cover bg-neutral-200 border-2 border-neutral-200 dark:border-neutral-800 flex-shrink-0" alt={event.creator.name} />
                     <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Tổ chức bởi</div>
                        <Link to={`/user/${event.creator._id}`} className="font-bold text-lg hover:text-blue-500 dark:hover:text-blue-400 transition-colors block truncate">{event.creator.name}</Link>
                        {event.creator.bio && (
                           <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">{event.creator.bio}</p>
                        )}
                     </div>
                  </div>
                  <Link
                     to={`/user/${event.creator._id}`}
                     className="w-full py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-semibold text-sm text-center hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors block"
                  >
                     Xem hồ sơ
                  </Link>
               </SpotlightCard>

               {/* EVENT INFO SUMMARY */}
               <SpotlightCard className="p-5">
                  <h3 className="font-bold text-lg mb-4 text-neutral-900 dark:text-white flex items-center gap-2">
                     <Calendar size={18} /> Thông tin sự kiện
                  </h3>
                  <div className="space-y-3">
                     <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex-shrink-0">
                           <Calendar size={16} className="text-neutral-600 dark:text-neutral-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-0.5">Ngày</div>
                           <div className="text-sm font-semibold text-neutral-900 dark:text-white">{date}</div>
                        </div>
                     </div>
                     <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex-shrink-0">
                           <Clock size={16} className="text-neutral-600 dark:text-neutral-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-0.5">Giờ</div>
                           <div className="text-sm font-semibold text-neutral-900 dark:text-white">{time}</div>
                        </div>
                     </div>
                     <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex-shrink-0">
                           <MapPin size={16} className="text-neutral-600 dark:text-neutral-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-0.5">Địa điểm</div>
                           <div className="text-sm font-semibold text-neutral-900 dark:text-white">{event.location || 'Online / Chưa xác định'}</div>
                        </div>
                     </div>
                     <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex-shrink-0">
                           <Users size={16} className="text-neutral-600 dark:text-neutral-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-0.5">Tham gia</div>
                           <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                              {event.attendees.length} người
                              {event.maxAttendees && ` / ${event.maxAttendees} tối đa`}
                              {event.interested && event.interested.length > 0 && (
                                 <span className="text-neutral-500 dark:text-neutral-400 font-normal"> • {event.interested.length} quan tâm</span>
                              )}
                           </div>
                        </div>
                     </div>
                  </div>
               </SpotlightCard>

               {/* ACTION PANEL (Sticky) */}
               <div className="sticky top-24 space-y-6">
                  <div className="bg-white dark:bg-[#1C1C1E] rounded-[24px] p-6 border border-neutral-200 dark:border-neutral-800 shadow-xl">
                     <h3 className="font-bold text-xl mb-6 text-neutral-900 dark:text-white flex items-center justify-between">
                        Thao tác
                        {/* Admin Menu */}
                        {canEdit() && (
                           <div className="relative" ref={menuRef}>
                              <button onClick={() => setShowMenu(!showMenu)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors">
                                 <MoreVertical size={20} className="text-neutral-500" />
                              </button>
                              <AnimatePresence>
                                 {showMenu && (
                                    <motion.div
                                       initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                       animate={{ opacity: 1, scale: 1, y: 0 }}
                                       exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                       className="absolute right-0 top-10 w-48 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl z-50 overflow-hidden"
                                    >
                                       <button onClick={() => navigate(`/events/${id}/edit`)} className="w-full px-4 py-3 text-left text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2">
                                          <Edit size={16} /> Chỉnh sửa
                                       </button>
                                       <button onClick={() => handleAction("delete")} className="w-full px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                                          <Trash2 size={16} /> Xóa sự kiện
                                       </button>
                                    </motion.div>
                                 )}
                              </AnimatePresence>
                           </div>
                        )}
                     </h3>

                     <div className="space-y-3">
                        {/* Main Action Button */}
                        {upcoming && !event.userRole && !isFull() && (
                           <button
                              onClick={() => handleAction("join")}
                              disabled={actionLoading}
                              className="w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black text-lg hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg flex items-center justify-center gap-2"
                           >
                              {actionLoading ? "Đang xử lý..." : <><UserPlus size={20} /> THAM GIA NGAY</>}
                           </button>
                        )}

                        {event.userRole === 'attendee' && (
                           <div className="w-full py-4 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 border border-green-200 dark:border-green-800">
                              <Check size={24} /> ĐÃ THAM GIA
                           </div>
                        )}

                        {/* Secondary Actions */}
                        <div className="grid grid-cols-2 gap-3">
                           {(!event.userRole || event.userRole === 'declined') && upcoming && (
                              <button
                                 onClick={() => handleAction("interested")}
                                 disabled={actionLoading}
                                 className="py-3 px-4 rounded-xl bg-orange-50 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400 font-bold text-sm hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors flex items-center justify-center gap-2"
                              >
                                 <Heart size={18} /> Quan tâm
                              </button>
                           )}
                           {(!event.userRole || event.userRole === 'interested') && upcoming && (
                              <button
                                 onClick={() => handleAction("decline")}
                                 disabled={actionLoading}
                                 className="py-3 px-4 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-bold text-sm hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors flex items-center justify-center gap-2"
                              >
                                 <XCircle size={18} /> Từ chối
                              </button>
                           )}
                        </div>

                        {event.userRole === 'attendee' && (
                           <button
                              onClick={() => handleAction("leave")}
                              disabled={actionLoading}
                              className="w-full py-3 text-red-500 font-medium text-sm hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors flex items-center justify-center gap-2"
                           >
                              <UserMinus size={16} /> Rời sự kiện
                           </button>
                        )}

                        <button
                           onClick={() => navigator.share?.({ title: event.title, url: window.location.href })}
                           className="w-full py-3 border border-neutral-200 dark:border-neutral-800 rounded-xl font-bold text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
                        >
                           <Share2 size={18} /> Chia sẻ
                        </button>
                     </div>

                     {isFull() && <div className="mt-4 text-center text-red-500 font-medium text-sm bg-red-50 dark:bg-red-900/10 p-2 rounded-lg">Sự kiện đã đủ người tham gia</div>}
                     {past && <div className="mt-4 text-center text-neutral-500 font-medium text-sm bg-neutral-100 dark:bg-neutral-800 p-2 rounded-lg">Sự kiện đã kết thúc</div>}
                  </div>

                  {/* ATTENDEES MINI GRID */}
                  <SpotlightCard>
                     <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-lg flex items-center gap-2"><Users size={18} /> Tham gia ({event.attendees.length})</h3>
                     </div>
                     {event.attendees.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                           {event.attendees.slice(0, 12).map(user => (
                              <Link key={user._id} to={`/user/${user._id}`} title={user.name}>
                                 <img src={getUserAvatarUrl(user, AVATAR_SIZES.SMALL)} className="w-10 h-10 rounded-full border-2 border-white dark:border-black hover:scale-110 transition-transform" alt="" />
                              </Link>
                           ))}
                           {event.attendees.length > 12 && (
                              <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 border-2 border-white dark:border-black flex items-center justify-center text-xs font-bold text-neutral-500">
                                 +{event.attendees.length - 12}
                              </div>
                           )}
                        </div>
                     ) : (
                        <div className="text-neutral-500 text-sm text-center py-4">Chưa có ai tham gia</div>
                     )}
                  </SpotlightCard>
               </div>
            </div>
         </div>
      </PageLayout>
   );
}
