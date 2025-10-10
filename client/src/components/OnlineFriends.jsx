import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Users, RefreshCw } from 'lucide-react';
import { api } from '../api';
import { chatAPI } from '../chatAPI';
import { ChatPopupWithCallModal } from './ChatPopup';
import socketService from '../socket';

/**
 * OnlineFriends - Component hiển thị danh sách bạn bè online
 * Giống sidebar phải của Facebook Messenger
 */
export default function OnlineFriends({ user }) {
  const [onlineFriends, setOnlineFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openPopups, setOpenPopups] = useState([]); // Chat popups đang mở

  useEffect(() => {
    if (user) {
      loadOnlineFriends();
      
      // Join user room để nhận real-time updates
      socketService.ensureConnection().then(connected => {
        if (connected) {
          const socket = socketService.socket;
          if (socket) {
            socket.emit('join-user', user._id);
          }
        }
      });
    }
  }, [user]);

  // Lắng nghe real-time updates cho trạng thái online của bạn bè
  useEffect(() => {
    let isMounted = true;
    let socketRef = null;

    const handleFriendOnline = (data) => {
      setOnlineFriends(prev => {
        const exists = prev.find(friend => friend._id === data.userId);
        if (exists) {
          // Cập nhật trạng thái online của bạn bè hiện có
          return prev.map(friend => 
            friend._id === data.userId 
              ? { ...friend, isOnline: data.isOnline, lastSeen: data.lastSeen }
              : friend
          );
        } else if (data.isOnline) {
          // Thêm bạn bè mới vào danh sách online (nếu họ vừa online)
          // Cần load thông tin đầy đủ của bạn bè này
          loadOnlineFriends();
        }
        return prev;
      });
    };

    const handleFriendOffline = (data) => {
      setOnlineFriends(prev => {
        // Xóa bạn bè khỏi danh sách online khi họ offline
        return prev.filter(friend => friend._id !== data.userId);
      });
    };

    const attachListeners = async () => {
      const connected = await socketService.ensureConnection();
      if (!connected || !isMounted) {
        return;
      }

      socketRef = socketService.socket;
      if (!socketRef) return;

      socketRef.on('friend-online', handleFriendOnline);
      socketRef.on('friend-offline', handleFriendOffline);
    };

    attachListeners();

    return () => {
      isMounted = false;
      if (socketRef) {
        socketRef.off('friend-online', handleFriendOnline);
        socketRef.off('friend-offline', handleFriendOffline);
      }
    };
  }, []);

  const loadOnlineFriends = async () => {
    try {
      setLoading(true);
      // Load tất cả bạn bè và filter những người online
      const response = await api('/api/friends/list');
      const allFriends = response.friends || [];
      
      // Filter chỉ những bạn bè đang online (isOnline === true)
      const onlineFriends = allFriends.filter(friend => friend.isOnline === true);
      setOnlineFriends(onlineFriends);
    } catch (error) {
      // Silent handling for online friends loading error
      setOnlineFriends([]);
    } finally {
      setLoading(false);
    }
  };

  // Format thời gian lastSeen
  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Không rõ';
    
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffInMinutes = Math.floor((now - lastSeenDate) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Vừa xong';
    if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} ngày trước`;
    
    return lastSeenDate.toLocaleDateString('vi-VN');
  };

  // Mở chat popup với bạn bè
  const handleOpenChat = async (friend) => {
    try {
      // Tạo conversation mới hoặc lấy conversation hiện có
      const conversation = await chatAPI.createPrivateConversation(friend._id);
      
      // Tạo conversation object giống hệt ChatPopup
      const conversationData = {
        _id: conversation._id || conversation.id,
        conversationType: 'private',
        otherParticipants: [
          {
            user: {
              _id: friend._id,
              name: friend.name,
              avatarUrl: friend.avatarUrl,
              isOnline: friend.isOnline,
              lastSeen: friend.lastSeen
            }
          }
        ],
        participants: [
          {
            _id: friend._id,
            name: friend.name,
            avatarUrl: friend.avatarUrl,
            isOnline: friend.isOnline,
            lastSeen: friend.lastSeen
          },
          {
            _id: user._id,
            name: user.name,
            avatarUrl: user.avatarUrl,
            isOnline: user.isOnline,
            lastSeen: user.lastSeen
          }
        ],
        me: user
      };
      
      // Thêm vào danh sách popups đang mở
      setOpenPopups(prev => {
        // Nếu đã mở rồi thì đưa lên cuối
        const exists = prev.find(p => p._id === conversationData._id);
        let newPopups = exists ? prev.filter(p => p._id !== conversationData._id) : [...prev];
        newPopups.push(conversationData);
        // Giới hạn tối đa 2 popup
        if (newPopups.length > 2) newPopups = newPopups.slice(1);
        return newPopups;
      });
    } catch (error) {
      alert('Không thể mở cuộc trò chuyện');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Users size={18} className="text-gray-600" />
          <h3 className="font-semibold text-gray-900">Bạn bè online</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-24 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded animate-pulse w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-gray-600" />
          <h3 className="font-semibold text-gray-900">Bạn bè online</h3>
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
            {onlineFriends.length}
          </span>
        </div>
        <button
          onClick={loadOnlineFriends}
          className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100 transition-colors"
          title="Refresh danh sách"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {onlineFriends.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
            <Users size={24} className="text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm">Không có ai online</p>
        </div>
      ) : (
        <div className="space-y-2">
          {onlineFriends.map((friend) => (
            <Link
              key={friend._id}
              to={`/user/${friend._id}`}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="relative">
                <img
                  src={friend.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.name)}&length=2&background=cccccc&color=222222&size=40`}
                  alt={friend.name}
                  className="w-10 h-10 rounded-full object-cover border border-gray-200"
                  onError={(e) => {
                    // Fallback nếu ảnh lỗi
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.name)}&length=2&background=cccccc&color=222222&size=40`;
                  }}
                />
                {/* Online indicator - chỉ hiển thị khi isOnline = true */}
                {friend.isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate group-hover:text-blue-600 transition-colors">
                  {friend.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {friend.isOnline ? 'Đang online' : formatLastSeen(friend.lastSeen)}
                </p>
              </div>

              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleOpenChat(friend);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded-full"
                title="Nhắn tin"
              >
                <MessageCircle size={16} className="text-gray-600" />
              </button>
            </Link>
          ))}
        </div>
      )}

      {/* Chat Popups */}
      {openPopups.map((conv, idx) => (
        <div key={conv._id || idx} style={{ position: 'fixed', bottom: 16, right: 16 + idx * 340, zIndex: 100 + idx }}>
          <ChatPopupWithCallModal
            conversation={conv}
            onClose={() => setOpenPopups(popups => popups.filter(p => p._id !== conv._id))}
          />
        </div>
      ))}
    </div>
  );
}
