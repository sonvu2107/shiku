import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api";
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
  UserX
} from "lucide-react";

/**
 * EventDetail - Trang chi tiết sự kiện
 * Hiển thị thông tin chi tiết và cho phép tham gia/rời sự kiện
 */
export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadEvent();
  }, [id]);

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
      // Silent handling for event loading error
      setError("Có lỗi xảy ra khi tải sự kiện");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinEvent = async () => {
    setActionLoading(true);
    try {
      const response = await api(`/api/events/${id}/join`, { method: "POST" });
      if (response.success) {
        setEvent(response.event);
      } else {
        throw new Error(response.message || "Có lỗi xảy ra khi tham gia sự kiện");
      }
    } catch (error) {
      // Silent handling for event joining error
      alert(error.message || "Có lỗi xảy ra khi tham gia sự kiện");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveEvent = async () => {
    setActionLoading(true);
    try {
      const response = await api(`/api/events/${id}/leave`, { method: "POST" });
      if (response.success) {
        setEvent(response.event);
      } else {
        throw new Error(response.message || "Có lỗi xảy ra khi rời sự kiện");
      }
    } catch (error) {
      // Silent handling for event leaving error
      alert(error.message || "Có lỗi xảy ra khi rời sự kiện");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkInterested = async () => {
    setActionLoading(true);
    try {
      const response = await api(`/api/events/${id}/interested`, { method: "POST" });
      if (response.success) {
        setEvent(response.event);
      } else {
        throw new Error(response.message || "Có lỗi xảy ra khi đánh dấu quan tâm");
      }
    } catch (error) {
      // Silent handling for interested marking error
      alert(error.message || "Có lỗi xảy ra khi đánh dấu quan tâm");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineEvent = async () => {
    setActionLoading(true);
    try {
      const response = await api(`/api/events/${id}/decline`, { method: "POST" });
      if (response.success) {
        setEvent(response.event);
      } else {
        throw new Error(response.message || "Có lỗi xảy ra khi từ chối");
      }
    } catch (error) {
      // Silent handling for event declining error
      alert(error.message || "Có lỗi xảy ra khi từ chối");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa sự kiện này?")) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await api(`/api/events/${id}`, { method: "DELETE" });
      if (response.success) {
        navigate("/events");
      } else {
        throw new Error(response.message || "Có lỗi xảy ra khi xóa sự kiện");
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      alert(error.message || "Có lỗi xảy ra khi xóa sự kiện");
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("vi-VN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      }),
      time: date.toLocaleTimeString("vi-VN", { 
        hour: "2-digit", 
        minute: "2-digit" 
      })
    };
  };

  const isUpcoming = (dateString) => {
    return new Date(dateString) > new Date();
  };

  const isPast = (dateString) => {
    return new Date(dateString) < new Date();
  };

  const isFull = () => {
    return event.maxAttendees && event.attendees.length >= event.maxAttendees;
  };

  const canJoin = () => {
    return isUpcoming(event.date) && 
           event.userRole !== 'creator' && 
           event.userRole !== 'attendee' && 
           event.userRole !== 'interested' &&
           event.userRole !== 'declined' &&
           !isFull();
  };

  const canLeave = () => {
    return event.userRole === 'attendee';
  };

  const canMarkInterested = () => {
    return isUpcoming(event.date) && 
           event.userRole !== 'creator' && 
           event.userRole !== 'attendee' && 
           event.userRole !== 'interested' &&
           event.userRole !== 'declined';
  };

  const canDecline = () => {
    return isUpcoming(event.date) && 
           event.userRole !== 'creator' && 
           event.userRole !== 'attendee' && 
           event.userRole !== 'declined';
  };

  const canEdit = () => {
    return event.userRole === 'creator';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button
            onClick={() => navigate("/events")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} />
            Quay lại
          </button>
          <div className="text-center py-12">
            <div className="text-red-500 text-lg mb-4">{error}</div>
            <button
              onClick={() => navigate("/events")}
              className="btn"
            >
              Quay về danh sách sự kiện
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { date, time } = formatDate(event.date);
  const upcoming = isUpcoming(event.date);
  const past = isPast(event.date);

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/events")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} />
            Quay lại
          </button>
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.title}</h1>
              <div className="flex items-center gap-2 mb-4">
                {event.userRole === 'creator' && (
                  <span className="bg-blue-100 text-blue-600 text-sm px-3 py-1 rounded-full">
                    Người tạo
                  </span>
                )}
                {event.userRole === 'attendee' && (
                  <span className="bg-green-100 text-green-600 text-sm px-3 py-1 rounded-full">
                    Đã tham gia
                  </span>
                )}
                {upcoming && (
                  <span className="bg-green-100 text-green-600 text-sm px-3 py-1 rounded-full">
                    Sắp diễn ra
                  </span>
                )}
                {past && (
                  <span className="bg-gray-100 text-gray-600 text-sm px-3 py-1 rounded-full">
                    Đã kết thúc
                  </span>
                )}
                {isFull() && (
                  <span className="bg-red-100 text-red-600 text-sm px-3 py-1 rounded-full">
                    Đã đầy
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 ml-4">
              {(canEdit() || event.userRole === 'creator') && (
                <>
                  <button
                    onClick={() => navigate(`/events/${id}/edit`)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                    title="Chỉnh sửa"
                  >
                    <Edit size={20} />
                  </button>
                  <button
                    onClick={handleDeleteEvent}
                    disabled={actionLoading}
                    className="p-2 text-gray-400 hover:text-red-600"
                    title="Xóa"
                  >
                    <Trash2 size={20} />
                  </button>
                </>
              )}
              <button
                onClick={() => navigator.share?.({ 
                  title: event.title, 
                  text: event.description,
                  url: window.location.href 
                })}
                className="p-2 text-gray-400 hover:text-gray-600"
                title="Chia sẻ"
              >
                <Share2 size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Cover Image */}
        {event.coverImage && (
          <div className="mb-8">
            <img
              src={event.coverImage}
              alt={event.title}
              className="w-full h-64 sm:h-80 lg:h-96 object-cover rounded-lg shadow-lg"
            />
          </div>
        )}

        {/* Event Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Mô tả sự kiện</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{event.description}</p>
            </div>

            {/* Event Info */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Thông tin sự kiện</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="text-gray-400" size={20} />
                  <div>
                    <p className="font-medium text-gray-900">{date}</p>
                    <p className="text-gray-600">{time}</p>
                  </div>
                </div>

                {event.location && (
                  <div className="flex items-center gap-3">
                    <MapPin className="text-gray-400" size={20} />
                    <p className="text-gray-700">{event.location}</p>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Users className="text-gray-400" size={20} />
                  <p className="text-gray-700">
                    {event.attendees.length} người tham gia
                    {event.maxAttendees && ` / ${event.maxAttendees} tối đa`}
                  </p>
                </div>

                {event.tags && event.tags.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Tag className="text-gray-400 mt-1" size={20} />
                    <div className="flex flex-wrap gap-2">
                      {event.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Participants */}
            <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Người tham gia ({event.attendees.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {event.attendees.map((attendee) => (
                  <div key={attendee._id} className="flex items-center gap-3">
                    <img
                      src={attendee.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(attendee.name)}&background=3b82f6&color=ffffff`}
                      alt={attendee.name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{attendee.name}</p>
                      {attendee._id === event.creator._id && (
                        <p className="text-xs text-blue-600">Người tạo</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Interested */}
            {event.interested && event.interested.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Quan tâm ({event.interested.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {event.interested.map((user) => (
                    <div key={user._id} className="flex items-center gap-3">
                      <img
                        src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3b82f6&color=ffffff`}
                        alt={user.name}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{user.name}</p>
                        <p className="text-xs text-orange-600">Quan tâm</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Declined */}
            {event.declined && event.declined.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Từ chối ({event.declined.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {event.declined.map((user) => (
                    <div key={user._id} className="flex items-center gap-3">
                      <img
                        src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3b82f6&color=ffffff`}
                        alt={user.name}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{user.name}</p>
                        <p className="text-xs text-red-600">Từ chối</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Creator Info */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Người tạo</h3>
              <div className="flex items-center gap-3">
                <img
                  src={event.creator.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(event.creator.name)}&background=3b82f6&color=ffffff`}
                  alt={event.creator.name}
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <p className="font-medium text-gray-900">{event.creator.name}</p>
                  <Link
                    to={`/user/${event.creator._id}`}
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Xem hồ sơ
                  </Link>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              {canJoin() && (
                <button
                  onClick={handleJoinEvent}
                  disabled={actionLoading}
                  className="w-full btn flex items-center justify-center gap-2 mb-3"
                >
                  {actionLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <UserPlus size={20} />
                      Tham gia sự kiện
                    </>
                  )}
                </button>
              )}

              {canMarkInterested() && (
                <button
                  onClick={handleMarkInterested}
                  disabled={actionLoading}
                  className="w-full btn-outline flex items-center justify-center gap-2 mb-3"
                >
                  {actionLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  ) : (
                    <>
                      <Heart size={20} />
                      Quan tâm
                    </>
                  )}
                </button>
              )}

              {canDecline() && (
                <button
                  onClick={handleDeclineEvent}
                  disabled={actionLoading}
                  className="w-full btn-outline flex items-center justify-center gap-2 mb-3"
                >
                  {actionLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  ) : (
                    <>
                      <XCircle size={20} />
                      Từ chối
                    </>
                  )}
                </button>
              )}

              {canLeave() && (
                <button
                  onClick={handleLeaveEvent}
                  disabled={actionLoading}
                  className="w-full btn-outline flex items-center justify-center gap-2 mb-3"
                >
                  {actionLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  ) : (
                    <>
                      <UserMinus size={20} />
                      Rời sự kiện
                    </>
                  )}
                </button>
              )}

              {/* Status indicators */}
              {event.userRole === 'interested' && (
                <div className="flex items-center justify-center gap-2 text-orange-600 text-sm mb-3">
                  <Heart size={16} />
                  Bạn đã quan tâm sự kiện này
                </div>
              )}

              {event.userRole === 'declined' && (
                <div className="flex items-center justify-center gap-2 text-red-600 text-sm mb-3">
                  <XCircle size={16} />
                  Bạn đã từ chối sự kiện này
                </div>
              )}

              {!upcoming && !past && (
                <p className="text-center text-gray-500 text-sm mt-4">
                  Sự kiện đang diễn ra
                </p>
              )}

              {past && (
                <p className="text-center text-gray-500 text-sm mt-4">
                  Sự kiện đã kết thúc
                </p>
              )}

              {isFull() && event.userRole !== 'attendee' && event.userRole !== 'creator' && (
                <p className="text-center text-red-500 text-sm mt-4">
                  Sự kiện đã đầy
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
