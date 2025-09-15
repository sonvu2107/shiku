import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Calendar, MapPin, Clock, Users, Plus, Search } from "lucide-react";

/**
 * Events - Trang quản lý sự kiện
 * Hiển thị danh sách sự kiện, tạo sự kiện mới
 */
export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all, upcoming, past, my

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
      console.error("Error loading events:", error);
      // Fallback to empty array if API fails
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
      loadEvents(); // Reload events to update attendee count
    } catch (error) {
      console.error("Error joining event:", error);
    }
  };

  const filters = [
    { id: "all", label: "Tất cả" },
    { id: "upcoming", label: "Sắp diễn ra" },
    { id: "past", label: "Đã kết thúc" },
    { id: "my", label: "Sự kiện của tôi" }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Sự kiện</h1>
            <Link
              to="/events/create"
              className="btn flex items-center gap-2"
            >
              <Plus size={20} />
              Tạo sự kiện
            </Link>
          </div>
          
          {/* Search */}
          <form onSubmit={handleSearch} className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Tìm kiếm sự kiện..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </form>

          {/* Filters */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
            {filters.map((filterItem) => (
              <button
                key={filterItem.id}
                onClick={() => setFilter(filterItem.id)}
                className={`px-4 py-2 rounded-md transition-colors ${
                  filter === filterItem.id
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {filterItem.label}
              </button>
            ))}
          </div>
        </div>

        {/* Events List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {events.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
                <p>Không có sự kiện nào để hiển thị</p>
              </div>
            ) : (
              events.map((event) => {
                const { date, time } = formatDate(event.date);
                const upcoming = isUpcoming(event.date);
                
                return (
                  <div key={event._id} className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-semibold text-gray-900">{event.title}</h3>
                          {event.isMyEvent && (
                            <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full">
                              Của tôi
                            </span>
                          )}
                          {upcoming && (
                            <span className="bg-green-100 text-green-600 text-xs px-2 py-1 rounded-full">
                              Sắp diễn ra
                            </span>
                          )}
                        </div>
                        
                        <p className="text-gray-600 mb-4">{event.description}</p>
                        
                        <div className="flex items-center gap-6 text-gray-500">
                          <div className="flex items-center gap-2">
                            <Calendar size={16} />
                            <span>{date}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock size={16} />
                            <span>{time}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin size={16} />
                            <span>{event.location}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users size={16} />
                            <span>{event.attendees?.length || 0}{event.maxAttendees ? `/${event.maxAttendees}` : ''} người tham gia</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-6 flex flex-col gap-2">
                        <Link
                          to={`/events/${event._id}`}
                          className="btn-outline text-sm px-4 py-2"
                        >
                          Xem chi tiết
                        </Link>
                        {upcoming && event.userRole !== 'creator' && event.userRole !== 'attendee' && (
                          <button 
                            onClick={() => handleJoinEvent(event._id)}
                            className="btn text-sm px-4 py-2"
                          >
                            Tham gia
                          </button>
                        )}
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
