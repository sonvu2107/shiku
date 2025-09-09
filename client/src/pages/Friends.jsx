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
  Circle
} from 'lucide-react';

export default function Friends() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFriends();
    loadRequests();
    loadSuggestions();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadFriends = async () => {
    try {
      const data = await api('/api/friends/list');
      setFriends(data.friends);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const loadRequests = async () => {
    try {
      const data = await api('/api/friends/requests');
      setRequests(data.requests);
    } catch (error) {
      console.error('Error loading requests:', error);
    }
  };

  const loadSuggestions = async () => {
    try {
      const data = await api('/api/friends/suggestions');
      setSuggestions(data.suggestions);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const searchUsers = async () => {
    try {
      setLoading(true);
      const data = await api(`/api/friends/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(data.users);
    } catch (error) {
      console.error('Error searching users:', error);
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
      loadSuggestions(); // Refresh suggestions
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
      alert('Đã từ chối lời mời kết bạn!');
    } catch (error) {
      alert(error.message || 'Có lỗi xảy ra');
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
    if (isOnline) return 'Đang online';
    
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
    return `${diffDays} ngày trước`;
  };

  const UserCard = ({ user, showActions = false, isRequest = false, requestId = null, showEmail = true }) => (
    <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className="relative">
          <img
            src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=cccccc&color=222222&size=64`}
            alt={user.name}
            className="w-12 h-12 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate(`/user/${user._id}`)}
          />
          {user.isOnline && (
            <Circle size={12} className="absolute -bottom-1 -right-1 fill-green-500 text-green-500" />
          )}
        </div>
        
        <div className="flex-1">
          <h3 
            className="font-semibold cursor-pointer hover:text-blue-600 transition-colors"
            onClick={() => navigate(`/user/${user._id}`)}
          >
            {user.name}
          </h3>
          {showEmail && <p className="text-sm text-gray-600">{user.email}</p>}
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Clock size={12} />
            {getLastSeenText(user.lastSeen, user.isOnline)}
          </p>
        </div>

        {showActions && (
          <div className="flex gap-2">
            {isRequest ? (
              <>
                <button
                  onClick={() => acceptRequest(requestId)}
                  className="btn-outline text-green-600 border-green-600 hover:bg-green-50 p-2"
                >
                  <UserCheck size={16} />
                </button>
                <button
                  onClick={() => rejectRequest(requestId)}
                  className="btn-outline text-red-600 border-red-600 hover:bg-red-50 p-2"
                >
                  <UserX size={16} />
                </button>
              </>
            ) : (
              <button
                onClick={() => sendFriendRequest(user._id)}
                className="btn-outline flex items-center gap-2"
              >
                <UserPlus size={16} />
                Kết bạn
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
  <div className="w-full px-6 py-6 pt-24">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="card">
          <h1 className="text-3xl font-bold mb-4 flex items-center gap-3">
            <Users size={32} />
            Bạn bè
          </h1>
          
          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm người dùng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Search Results */}
        {searchQuery.trim() && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Kết quả tìm kiếm</h2>
            {loading ? (
              <p>Đang tìm kiếm...</p>
            ) : searchResults.length > 0 ? (
              <div className="grid gap-4">
                {searchResults.map(user => (
                  <UserCard key={user._id} user={user} showActions={true} />
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Không tìm thấy người dùng nào</p>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="card">
          <div className="flex border-b mb-4">
            <button
              className={`px-4 py-2 font-medium ${activeTab === 'friends' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('friends')}
            >
              Danh sách bạn bè ({friends.length})
            </button>
            <button
              className={`px-4 py-2 font-medium ${activeTab === 'requests' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('requests')}
            >
              Lời mời ({requests.length})
            </button>
            <button
              className={`px-4 py-2 font-medium ${activeTab === 'suggestions' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('suggestions')}
            >
              Gợi ý kết bạn
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'friends' && (
            <div className="grid gap-4 md:grid-cols-2">
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
                <p className="text-gray-500 col-span-2">Chưa có bạn bè nào</p>
              )}
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="space-y-4">
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
                <p className="text-gray-500">Không có lời mời nào</p>
              )}
            </div>
          )}

          {activeTab === 'suggestions' && (
            <div className="space-y-4">
              {suggestions.length > 0 ? (
                suggestions.map(user => (
                  <UserCard key={user._id} user={user} showActions={true} showEmail={false} />
                ))
              ) : (
                <p className="text-gray-500">Không có gợi ý nào</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
