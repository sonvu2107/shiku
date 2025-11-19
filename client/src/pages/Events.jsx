import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Calendar, MapPin, Clock, Users, Plus, Search } from "lucide-react";
import { useSEO } from "../utils/useSEO";
import EventCardSkeleton from "../components/EventCardSkeleton";

/**
 * Events - Trang quản lý sự kiện
 * Hiển thị danh sách sự kiện, tạo sự kiện mới
 */
export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all"); // Tất cả, sắp diễn ra, đã kết thúc, của tôi

  // ==================== SEO ====================
  // Trang danh sách sự kiện là public → index, follow
  useSEO({
    title: "Sự kiện - Shiku",
    description: "Khám phá và tham gia các sự kiện thú vị trên Shiku",
    robots: "index, follow",
    canonical: "https://shiku.click/events"
  });

  useEffect(() => {
    loadEvents();
  }, [filter]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (filter !== "all") params.append("filter", filter);
      
      const res = await api(`/api/events?${params.toString()}`);
      setEvents(res.events || []);
    } catch (error) {
      // Silent handling for events loading error
      // Quay lại mảng trống nếu API không thành công
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadEvents();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("vi-VN"),
      time: date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    };
  };

  const isUpcoming = (dateString) => {
    return new Date(dateString) > new Date();
  };

  const handleJoinEvent = async (eventId) => {
    try {
      await api(`/api/events/${eventId}/join`, { method: "POST" });
      loadEvents(); // Tải lại sự kiện để cập nhật số lượng người tham dự
    } catch (error) {
      // Silent handling for event joining error
    }
  };

  const filters = [
    { id: "all", label: "Tất cả" },
    { id: "upcoming", label: "Sắp diễn ra" },
    { id: "past", label: "Đã kết thúc" },
    { id: "my", label: "Sự kiện của tôi" }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16 sm:pt-20 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Sự kiện</h1>
            <Link
              to="/events/create"
              className="btn flex items-center justify-center gap-2 w-full sm:w-auto touch-manipulation min-h-[44px] px-4 py-3 sm:py-2"
            >
              <Plus size={16} className="sm:w-4 sm:h-4" />
              <span className="text-sm sm:text-base font-medium">Tạo sự kiện</span>
            </Link>
          </div>
          
          {/* Search */}
          <form onSubmit={handleSearch} className="relative mb-4 sm:mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 z-10" size={16} />
            <input
              type="text"
              placeholder="Tìm kiếm sự kiện..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-4 py-3 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                        focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent 
                        outline-none text-sm sm:text-base bg-white dark:bg-gray-800 
                        text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 
                        shadow-sm dark:shadow-gray-900/50 transition-all duration-200
                        hover:border-gray-400 dark:hover:border-gray-500 touch-manipulation min-h-[44px]"
            />
          </form>

          {/* Filters */}
          <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg transition-colors duration-200" role="group" aria-label="Lọc sự kiện">
            <div className="grid grid-cols-4 gap-1">
              {filters.map((filterItem) => (
                <button
                  key={filterItem.id}
                  onClick={() => setFilter(filterItem.id)}
                  className={`px-1.5 sm:px-3 py-2.5 sm:py-2 rounded-md transition-colors text-[10px] sm:text-sm whitespace-nowrap touch-manipulation min-h-[44px] ${
                    filter === filterItem.id
                      ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm font-medium"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                  aria-label={`Lọc ${filterItem.label}`}
                  aria-pressed={filter === filterItem.id}
                >
                  {filterItem.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Events List */}
        {loading ? (
          <div className="space-y-3 sm:space-y-4">
            {[1, 2, 3].map(i => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {events.length === 0 ? (
              <div className="bg-white dark:bg-[#111] rounded-[32px] px-5 pt-4 pb-6 mb-6
              shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]
              border border-transparent dark:border-white/5 text-center py-12 sm:py-16">
                <Calendar size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600 opacity-60" />
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-4">Không có sự kiện nào để hiển thị</p>
                <Link
                  to="/events/create"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium"
                  aria-label="Tạo sự kiện đầu tiên"
                >
                  <Plus size={18} />
                  <span>Tạo sự kiện đầu tiên</span>
                </Link>
              </div>
            ) : (
              events.map((event) => {
                const { date, time } = formatDate(event.date);
                const upcoming = isUpcoming(event.date);
                
                return (
                  <div key={event._id} className="bg-white dark:bg-[#111] rounded-[32px] mb-6 overflow-hidden
                  shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]
                  hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_12px_40px_rgb(0,0,0,0.6)]
                  transition-all duration-500 hover:-translate-y-1 border border-transparent dark:border-white/5">
                    {/* Cover Image */}
                    {event.coverImage && (
                      <div className="h-48 sm:h-56 md:h-64 lg:h-72 w-full">
                        <img
                          src={event.coverImage}
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    
                    <div className="px-5 pt-4 pb-6">
                      <div className="flex flex-col gap-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-gray-100">{event.title}</h3>
                            {event.userRole === 'creator' && (
                              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs px-2 py-1 rounded-full">
                                Của tôi
                              </span>
                            )}
                            {event.userRole === 'attendee' && (
                              <span className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs px-2 py-1 rounded-full">
                                Đã tham gia
                              </span>
                            )}
                            {event.userRole === 'interested' && (
                              <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs px-2 py-1 rounded-full">
                                Quan tâm
                              </span>
                            )}
                            {event.userRole === 'declined' && (
                              <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs px-2 py-1 rounded-full">
                                Từ chối
                              </span>
                            )}
                            {upcoming && (
                              <span className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs px-2 py-1 rounded-full">
                                Sắp diễn ra
                              </span>
                            )}
                          </div>
                          
                          <p className="text-gray-600 dark:text-gray-300 mb-3 sm:mb-4 text-sm sm:text-base line-clamp-2">{event.description}</p>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-gray-400 dark:text-gray-500" />
                              <span className="truncate">{date}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock size={14} className="text-gray-400 dark:text-gray-500" />
                              <span className="truncate">{time}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin size={14} className="text-gray-400 dark:text-gray-500" />
                              <span className="truncate">{event.location || 'Chưa xác định'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users size={14} className="text-gray-400 dark:text-gray-500" />
                              <span className="truncate">
                                {event.attendees?.length || 0} tham gia
                                {event.interested?.length > 0 && `, ${event.interested.length} quan tâm`}
                                {event.maxAttendees ? ` / ${event.maxAttendees} tối đa` : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                          <Link
                            to={`/events/${event._id}`}
                            className="btn-outline text-sm sm:text-sm px-4 py-3 sm:py-2 text-center touch-manipulation min-h-[44px] flex items-center justify-center font-medium"
                          >
                            Xem chi tiết
                          </Link>
                          {upcoming && event.userRole !== 'creator' && event.userRole !== 'attendee' && event.userRole !== 'interested' && event.userRole !== 'declined' && (
                            <button 
                              onClick={() => handleJoinEvent(event._id)}
                              className="btn text-sm sm:text-sm px-4 py-3 sm:py-2 touch-manipulation min-h-[44px] flex items-center justify-center font-medium"
                            >
                              Tham gia
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
