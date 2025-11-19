import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import FriendCard from '../components/FriendCard';
import FriendRequestCard from '../components/FriendRequestCard';
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Search,
  Clock,
  Circle,
  Send,
  UserMinus
} from 'lucide-react';

/**
 * Friends - Trang quản lý bạn bè
 * Bao gồm danh sách bạn bè, lời mời kết bạn, gợi ý kết bạn và tìm kiếm
 * @returns {JSX.Element} Component friends page
 */
export default function Friends() {
  const navigate = useNavigate();
  
  // ==================== STATE MANAGEMENT ====================
  
  // Tab management
  const [activeTab, setActiveTab] = useState('friends'); // Tab hiện tại
  
  // Data states
  const [friends, setFriends] = useState([]); // Danh sách bạn bè
  const [requests, setRequests] = useState([]); // Lời mời kết bạn
  const [sentRequests, setSentRequests] = useState([]); // Lời mời đã gửi
  const [suggestions, setSuggestions] = useState([]); // Gợi ý kết bạn
  const [searchResults, setSearchResults] = useState([]); // Kết quả tìm kiếm
  
  // Search states
  const [searchQuery, setSearchQuery] = useState(''); // Query tìm kiếm
  const [loading, setLoading] = useState(false); // Loading state

  // ==================== EFFECTS ====================
  
  /**
   * Load dữ liệu ban đầu khi component mount
   */
  useEffect(() => {
    // Đọc tham số URL để chọn tab mặc định
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const sourceParam = params.get('source');
    if (tabParam === 'suggestions') {
      setActiveTab('suggestions');
    }

    loadFriends();
    loadRequests();
    loadSentRequests();
    if (sourceParam === 'fof') {
      loadFriendsOfFriendsSuggestions();
    } else {
      loadSuggestions();
    }
  }, []);

  /**
   * Refresh danh sách khi chuyển tab
   */
  useEffect(() => {
    if (activeTab === 'friends') {
      loadFriends();
    } else if (activeTab === 'requests') {
      loadRequests();
    } else if (activeTab === 'sent') {
      loadSentRequests();
    } else if (activeTab === 'suggestions') {
      loadSuggestions();
    }
  }, [activeTab]);

  /**
   * Tìm kiếm users khi search query thay đổi
   */
  useEffect(() => {
    if (searchQuery.trim()) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  // ==================== API FUNCTIONS ====================
  
  /**
   * Load danh sách bạn bè
   */
  const loadFriends = async () => {
    try {
      const data = await api('/api/friends/list');
      setFriends(data.friends);
    } catch (error) {
      // Silent handling for friends loading error
    }
  };

  /**
   * Load danh sách lời mời kết bạn
   */
  const loadRequests = async () => {
    try {
      const data = await api('/api/friends/requests');
      setRequests(data.requests);
    } catch (error) {
      // Silent handling for requests loading error
    }
  };

  /**
   * Load danh sách lời mời đã gửi
   */
  const loadSentRequests = async () => {
    try {
      const data = await api('/api/friends/sent-requests');
      setSentRequests(data.requests);
    } catch (error) {
      // Silent handling for sent requests loading error
    }
  };

  /**
   * Load danh sách gợi ý kết bạn
   */
  const loadSuggestions = async () => {
    try {
      const data = await api('/api/friends/suggestions');
      setSuggestions(data.suggestions);
    } catch (error) {
      // Silent handling for suggestions loading error
    }
  };

  /**
   * Load gợi ý bạn của bạn bè (friends-of-friends)
   */
  const loadFriendsOfFriendsSuggestions = async () => {
    try {
      const data = await api('/api/friends/suggestions?source=fof');
      setSuggestions(data.suggestions);
    } catch (error) {
      // Silent handling for suggestions loading error
    }
  };

  /**
   * Tìm kiếm users theo query
   */
  const searchUsers = async () => {
    try {
      setLoading(true);
      const data = await api(`/api/friends/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(data.users);
    } catch (error) {
      // Silent handling for user search error
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (userId) => {
    try {
      await api('/api/friends/send-request', {
        method: 'POST',
        body: { to: userId }
      });
      alert('Đã gửi lời mời kết bạn!');
      loadSuggestions(); // Cập nhật lại gợi ý
      loadSentRequests(); // Cập nhật lại lời mời đã gửi
    } catch (error) {
      alert(error.message || 'Có lỗi xảy ra');
    }
  };

  const acceptRequest = async (requestId) => {
    try {
      await api(`/api/friends/accept-request/${requestId}`, {
        method: 'POST'
      });
      loadRequests();
      loadFriends();
      loadSentRequests(); // Refresh sent requests in case of any changes
      loadSuggestions(); // Refresh suggestions
      alert('Đã chấp nhận lời mời kết bạn!');
    } catch (error) {
      alert(error.message || 'Có lỗi xảy ra');
    }
  };

  const rejectRequest = async (requestId) => {
    try {
      await api(`/api/friends/reject-request/${requestId}`, {
        method: 'POST'
      });
      loadRequests();
      loadSuggestions(); // Refresh suggestions
      alert('Đã từ chối lời mời kết bạn!');
    } catch (error) {
      alert(error.message || 'Có lỗi xảy ra');
    }
  };

  const cancelSentRequest = async (userId) => {
    if (confirm('Bạn có chắc muốn hủy lời mời kết bạn này?')) {
      try {
        await api(`/api/friends/cancel-request/${userId}`, {
          method: 'DELETE'
        });
        loadSentRequests();
        loadSuggestions(); // Cập nhật lại gợi ý để có thể gửi lại
        alert('Đã hủy lời mời kết bạn!');
      } catch (error) {
        alert(error.message || 'Có lỗi xảy ra');
      }
    }
  };

  const removeFriend = async (friendId) => {
    if (confirm('Bạn có chắc muốn bỏ kết bạn?')) {
      try {
        await api(`/api/friends/remove/${friendId}`, {
          method: 'DELETE'
        });
        loadFriends();
        alert('Đã bỏ kết bạn!');
      } catch (error) {
        alert(error.message || 'Có lỗi xảy ra');
      }
    }
  };

  const getLastSeenText = (lastSeen, isOnline) => {
    if (isOnline) return 'Đang hoạt động';

    if (!lastSeen) return 'Chưa có thông tin';

    const now = new Date();
    const lastSeenDate = new Date(lastSeen);

    // Kiểm tra lastSeenDate có hợp lệ không
    if (isNaN(lastSeenDate.getTime())) return 'Chưa có thông tin';

    const diffMs = now - lastSeenDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Vừa truy cập';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    
    // Nếu quá 7 ngày, hiển thị ngày tháng
    return `Hoạt động ${lastSeenDate.toLocaleDateString('vi-VN')}`;
  };

  const UserCard = ({ user, showActions = false, isRequest = false, requestId = null, showEmail = true }) => (
    <div className="bg-white dark:bg-[#111] border border-transparent dark:border-white/5 rounded-[24px] p-4
    shadow-[0_4px_15px_rgb(0,0,0,0.02)] dark:shadow-[0_4px_15px_rgb(0,0,0,0.3)]
    hover:shadow-[0_8px_25px_rgb(0,0,0,0.06)] dark:hover:shadow-[0_8px_25px_rgb(0,0,0,0.5)]
    transition-all duration-300">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative flex-shrink-0">
          <img
            src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&length=2&background=cccccc&color=222222&size=64`}
            alt={user.name}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate(`/user/${user._id}`)}
          />
          {user.isOnline && (
            <Circle size={10} className="absolute -bottom-1 -right-1 fill-green-500 text-green-500 sm:w-3 sm:h-3" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3
            className="font-semibold cursor-pointer text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm sm:text-base truncate"
            onClick={() => navigate(`/user/${user._id}`)}
            title={user.name}
          >
            {user.name}
          </h3>
          {showEmail && <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">{user.email}</p>}
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Clock size={10} className="sm:w-3 sm:h-3" />
            <span className="truncate">{getLastSeenText(user.lastSeen, user.isOnline)}</span>
          </p>
        </div>

        {showActions && (
          <div className="flex gap-1 sm:gap-2 flex-shrink-0">
            {isRequest ? (
              <>
                <button
                  onClick={() => acceptRequest(requestId)}
                  className="btn-outline text-green-600 dark:text-green-400 border-green-600 dark:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 p-1.5 sm:p-2 touch-target transition-colors"
                  title="Chấp nhận"
                >
                  <UserCheck size={14} className="sm:w-4 sm:h-4" />
                </button>
                <button
                  onClick={() => rejectRequest(requestId)}
                  className="btn-outline text-red-600 dark:text-red-400 border-red-600 dark:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 sm:p-2 touch-target transition-colors"
                  title="Từ chối"
                >
                  <UserX size={14} className="sm:w-4 sm:h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => sendFriendRequest(user._id)}
                className="btn-outline flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 touch-target 
                          border-gray-800 dark:border-gray-600 text-gray-900 dark:text-gray-100 
                          bg-transparent dark:bg-transparent
                          hover:bg-gray-100 dark:hover:bg-gray-700 
                          hover:border-gray-900 dark:hover:border-gray-500
                          active:bg-gray-200 dark:active:bg-gray-600
                          transition-all duration-200 font-medium"
              >
                <UserPlus size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Kết bạn</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full px-3 sm:px-6 py-6 pt-20 sm:pt-24 min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">

        {/* Header */}
        <div className="bg-white dark:bg-[#111] rounded-[32px] p-5 mb-6
        shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]
        border border-transparent dark:border-white/5">
          <h1 className="text-2xl sm:text-3xl font-bold mb-4 flex items-center gap-2 sm:gap-3 text-gray-900 dark:text-gray-100">
            <Users size={24} className="sm:w-8 sm:h-8" />
            Bạn bè
          </h1>

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Tìm kiếm người dùng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full border border-gray-300 dark:border-gray-600 rounded-lg 
                        bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                        placeholder-gray-500 dark:placeholder-gray-400
                        focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 
                        focus:border-transparent text-sm sm:text-base py-2 sm:py-3 transition-colors"
            />
          </div>
        </div>

        {/* Search Results */}
        {searchQuery.trim() && (
          <div className="bg-white dark:bg-[#111] rounded-[32px] p-5 mb-6
          shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]
          border border-transparent dark:border-white/5">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Kết quả tìm kiếm</h2>
            {loading ? (
              <p className="text-gray-600 dark:text-gray-400">Đang tìm kiếm...</p>
            ) : searchResults.length > 0 ? (
              <div className="grid gap-4">
                {searchResults.map(user => (
                  <UserCard key={user._id} user={user} showActions={true} />
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">Không tìm thấy người dùng nào</p>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white dark:bg-[#111] rounded-[32px] mb-6 overflow-hidden
        shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]
        hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_12px_40px_rgb(0,0,0,0.6)]
        transition-all duration-500 border border-transparent dark:border-white/5">
          {/* Navigation */}
          <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
            <nav className="grid grid-cols-4 divide-x divide-gray-200 dark:divide-gray-700">
              <button
                onClick={() => setActiveTab('friends')}
                className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 font-medium transition-all duration-200 whitespace-nowrap relative touch-target text-xs sm:text-sm md:text-base ${
                  activeTab === 'friends'
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/30"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                }`}
              >
                <Users className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span>Bạn bè</span>
                {friends.length > 0 && (
                  <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold min-w-[18px] sm:min-w-[20px] text-center leading-none ${
                    activeTab === 'friends'
                      ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-sm dark:shadow-blue-900/50'
                      : 'bg-gray-300 dark:bg-gray-600/80 text-gray-700 dark:text-gray-200'
                  }`}>
                    {friends.length > 99 ? '99+' : friends.length}
                  </span>
                )}
                {activeTab === 'friends' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 font-medium transition-all duration-200 whitespace-nowrap relative touch-target text-xs sm:text-sm md:text-base ${
                  activeTab === 'requests'
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/30"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                }`}
              >
                <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span>Lời mời</span>
                {requests.length > 0 && (
                  <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold min-w-[18px] sm:min-w-[20px] text-center leading-none ${
                    activeTab === 'requests'
                      ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-sm dark:shadow-blue-900/50'
                      : 'bg-gray-300 dark:bg-gray-600/80 text-gray-700 dark:text-gray-200'
                  }`}>
                    {requests.length > 99 ? '99+' : requests.length}
                  </span>
                )}
                {activeTab === 'requests' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('sent')}
                className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 font-medium transition-all duration-200 whitespace-nowrap relative touch-target text-xs sm:text-sm md:text-base ${
                  activeTab === 'sent'
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/30"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                }`}
              >
                <Send className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span>Đã gửi</span>
                {sentRequests.length > 0 && (
                  <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold min-w-[18px] sm:min-w-[20px] text-center leading-none ${
                    activeTab === 'sent'
                      ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-sm dark:shadow-blue-900/50'
                      : 'bg-gray-300 dark:bg-gray-600/80 text-gray-700 dark:text-gray-200'
                  }`}>
                    {sentRequests.length > 99 ? '99+' : sentRequests.length}
                  </span>
                )}
                {activeTab === 'sent' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('suggestions')}
                className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 font-medium transition-all duration-200 whitespace-nowrap relative touch-target text-xs sm:text-sm md:text-base ${
                  activeTab === 'suggestions'
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/30"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                }`}
              >
                <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span>Gợi ý</span>
                {activeTab === 'suggestions' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></span>
                )}
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'friends' && (
            <div className="p-3 sm:p-4 bg-white dark:bg-gray-800 min-h-[400px]">
              <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                {friends.length > 0 ? (
                  friends.map(friend => (
                    <FriendCard
                      key={friend._id}
                      friend={friend}
                      onRemoveFriend={removeFriend}
                      showOnlineStatus={true}
                    />
                  ))
                ) : (
                  <div className="col-span-2 flex flex-col items-center justify-center py-12">
                    <Users size={48} className="text-gray-300 dark:text-gray-600 mb-4 opacity-60" />
                    <p className="text-gray-500 dark:text-gray-400 text-center text-sm sm:text-base">Chưa có bạn bè nào</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-white dark:bg-gray-800 min-h-[400px]">
              {requests.length > 0 ? (
                requests.map(request => (
                  <FriendRequestCard
                    key={request._id}
                    request={request}
                    onAccept={acceptRequest}
                    onReject={rejectRequest}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <UserPlus size={48} className="text-gray-300 dark:text-gray-600 mb-4 opacity-60" />
                  <p className="text-gray-500 dark:text-gray-400 text-center text-sm sm:text-base">Không có lời mời nào</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'sent' && (
            <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-white dark:bg-gray-800 min-h-[400px]">
              {sentRequests.length > 0 ? (
                sentRequests.map(request => (
                  <div key={request._id} className="bg-white dark:bg-[#111] border border-transparent dark:border-white/5 rounded-[24px] p-4
                  shadow-[0_4px_15px_rgb(0,0,0,0.02)] dark:shadow-[0_4px_15px_rgb(0,0,0,0.3)]
                  hover:shadow-[0_8px_25px_rgb(0,0,0,0.06)] dark:hover:shadow-[0_8px_25px_rgb(0,0,0,0.5)]
                  transition-all duration-300">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="relative flex-shrink-0">
                        <img
                          src={request.to.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(request.to.name)}&length=2&background=cccccc&color=222222&size=64`}
                          alt={request.to.name}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => navigate(`/user/${request.to._id}`)}
                        />
                        {request.to.isOnline && (
                          <Circle size={10} className="absolute -bottom-1 -right-1 fill-green-500 text-green-500 sm:w-3 sm:h-3" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3
                          className="font-semibold cursor-pointer text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm sm:text-base truncate"
                          onClick={() => navigate(`/user/${request.to._id}`)}
                          title={request.to.name}
                        >
                          {request.to.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">{request.to.email}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Clock size={10} className="sm:w-3 sm:h-3" />
                          <span className="truncate">Gửi {new Date(request.createdAt).toLocaleDateString('vi-VN')}</span>
                        </p>
                      </div>

                      <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                        <button
                          onClick={() => cancelSentRequest(request.to._id)}
                          className="btn-outline text-red-600 dark:text-red-400 border-red-600 dark:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 sm:p-2 touch-target transition-colors flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"
                          title="Hủy lời mời"
                        >
                          <UserMinus size={14} className="sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">Hủy</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Send size={48} className="text-gray-300 dark:text-gray-600 mb-4 opacity-60" />
                  <p className="text-gray-500 dark:text-gray-400 text-center text-sm sm:text-base">Chưa có lời mời nào đã gửi</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'suggestions' && (
            <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-white dark:bg-gray-800 min-h-[400px]">
              {suggestions.length > 0 ? (
                suggestions.map(user => (
                  <UserCard key={user._id} user={user} showActions={true} showEmail={false} />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <UserCheck size={48} className="text-gray-300 dark:text-gray-600 mb-4 opacity-60" />
                  <p className="text-gray-500 dark:text-gray-400 text-center text-sm sm:text-base">Không có gợi ý nào</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
