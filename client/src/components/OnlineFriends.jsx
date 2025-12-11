import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Users, RefreshCw } from 'lucide-react';
import { api } from '../api';
import { chatAPI } from '../chatAPI';
import { ChatPopupWithCallModal } from './ChatPopup';
import socketService from '../socket';
import { useOnlineFriends } from '../hooks/useFriends';
import UserName from './UserName';
import UserAvatar from './UserAvatar';
import { useChat } from '../contexts/ChatContext';
import { useToast } from '../contexts/ToastContext';

/**
 * OnlineFriends - Component show online friends sidebar
 */
export default function OnlineFriends({ user, minimal = false }) {
  const { addChatPopup } = useChat();
  const { showError } = useToast();

  // Use React Query for online friends
  const { data: onlineFriendsData, isLoading, refetch } = useOnlineFriends();
  const onlineFriends = onlineFriendsData?.friends || [];

  useEffect(() => {
    if (user) {
      // Join user room to receive real-time updates
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

  // Listen for real-time updates on friends' online status
  useEffect(() => {
    let isMounted = true;
    let socketRef = null;

    const handleFriendOnline = (data) => {
      // Refetch online friends list when there is a change
      refetch();
    };

    const handleFriendOffline = (data) => {
      // Refetch online friends list when there is a change
      refetch();
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
  }, [refetch]);

  // Format time lastSeen
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

  // Open chat popup with a friend
  const handleOpenChat = async (friend) => {
    try {
      // Create new conversation or get existing one
      const conversation = await chatAPI.createPrivateConversation(friend._id);

      // Create conversation object identical to ChatPopup
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

      // Add to the list of open popups
      addChatPopup(conversationData);
    } catch (error) {
      showError('Không thể mở cuộc trò chuyện');
    }
  };

  if (isLoading) {
    return (
      <div className={minimal ? "p-5" : "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4"}>
        <div className={minimal ? "flex items-center justify-between mb-4 pb-4 border-b border-neutral-100 dark:border-neutral-800 -mx-5 px-5 -mt-5 pt-4" : "flex items-center gap-2 mb-4"}>
          <div className="flex items-center gap-2">
            <Users size={18} className={minimal ? "text-neutral-900 dark:text-white" : "text-gray-600 dark:text-gray-300"} />
            <h3 className={minimal ? "font-bold text-neutral-900 dark:text-white" : "font-semibold text-gray-900 dark:text-gray-100"}>Bạn bè online</h3>
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className={minimal ? "w-10 h-10 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" : "w-10 h-10 bg-gray-200 rounded-full animate-pulse"}></div>
              <div className="flex-1">
                <div className={minimal ? "h-4 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse w-24 mb-1" : "h-4 bg-gray-200 rounded animate-pulse w-24 mb-1"}></div>
                <div className={minimal ? "h-3 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse w-16" : "h-3 bg-gray-200 rounded animate-pulse w-16"}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={minimal ? "p-5" : "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4"}>
      <div className={minimal ? "flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800 -mx-5 px-5 -mt-5 pt-4 mb-4" : "flex items-center justify-between mb-4"}>
        <div className="flex items-center gap-2">
          <Users size={18} className={minimal ? "text-neutral-900 dark:text-white" : "text-gray-600 dark:text-gray-300"} />
          <h3 className={minimal ? "font-bold text-neutral-900 dark:text-white" : "font-semibold text-gray-900 dark:text-gray-100"}>Bạn bè online</h3>
          <span className={minimal ? "text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium" : "text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-full"}>
            {onlineFriends.length}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className={minimal ? "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"}
          title="Làm mới"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {onlineFriends.length === 0 ? (
        <div className="text-center py-6">
          <div className={minimal ? "w-12 h-12 mx-auto mb-3 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center" : "w-16 h-16 mx-auto mb-3 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center"}>
            <Users size={20} className={minimal ? "text-neutral-400 dark:text-neutral-500" : "text-gray-400 dark:text-gray-500"} />
          </div>
          <p className={minimal ? "text-neutral-500 dark:text-neutral-400 text-sm" : "text-gray-500 dark:text-gray-400 text-sm"}>Không có ai online</p>
        </div>
      ) : (
        <div className={minimal ? "space-y-1 max-h-[280px] overflow-y-auto scrollbar-hide" : "space-y-2 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400"}>
          {onlineFriends.map((friend) => (
            <Link
              key={friend._id}
              to={`/user/${friend._id}`}
              className={minimal
                ? "flex items-center gap-3 p-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all group"
                : "flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"}
            >
              <div className="relative">
                <UserAvatar
                  user={friend}
                  size={36}
                  showFrame={false}
                  showBadge={false}
                />
                {/* Online indicator */}
                <div className={minimal ? "absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#111] rounded-full" : "absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full z-20"}></div>
              </div>

              <div className="flex-1 min-w-0">
                <p className={minimal
                  ? "font-bold text-neutral-900 dark:text-white text-sm truncate group-hover:text-black dark:group-hover:text-white transition-colors"
                  : "font-medium text-gray-900 dark:text-gray-100 text-sm truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"}>
                  <UserName user={friend} />
                </p>
                <p className={minimal ? "text-xs text-neutral-500 dark:text-neutral-400 truncate" : "text-xs text-gray-500 dark:text-gray-400 truncate"}>
                  @{friend.name?.toLowerCase().replace(/\s+/g, '') || 'user'}
                </p>
              </div>

              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleOpenChat(friend);
                }}
                className={minimal
                  ? "opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                  : "opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full"}
                title="Nhắn tin"
              >
                <MessageCircle size={16} className={minimal ? "text-neutral-900 dark:text-white" : "text-gray-600 dark:text-gray-300"} />
              </button>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
