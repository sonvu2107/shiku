import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, ArrowRight, TrendingUp, Hash, Loader2, Check } from 'lucide-react';
import { api } from '../api';
import UserName from './UserName';

/**
 * RightSidebar - Sidebar phải với Friend Suggestions, Trending Tags
 */
export default function RightSidebar({ user }) {
  const [friendSuggestions, setFriendSuggestions] = useState([]);
  const [trendingTags, setTrendingTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingRequests, setSendingRequests] = useState(new Set()); // Track which requests are being sent
  const [sentRequests, setSentRequests] = useState(new Set()); // Track which requests were sent successfully
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load friend suggestions
      try {
        const suggestionsResponse = await api('/api/friends/suggestions?limit=5');
        setFriendSuggestions(suggestionsResponse.suggestions || []);
      } catch (error) {
        // Silent fail
      }

      // Load trending tags
      loadTrendingTags();
    } catch (error) {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

  const loadTrendingTags = async () => {
    try {
      // Gọi API để lấy các bài viết và đếm tags
      const response = await api('/api/posts?limit=100&status=published');
      
      // Đếm tần suất xuất hiện của mỗi tag
      const tagCount = {};
      response.items?.forEach(post => {
        if (post.tags && Array.isArray(post.tags)) {
          post.tags.forEach(tag => {
            if (tag && tag.trim()) {
              const normalizedTag = tag.trim().toLowerCase();
              tagCount[normalizedTag] = (tagCount[normalizedTag] || 0) + 1;
            }
          });
        }
      });

      // Chuyển thành array và sắp xếp theo tần suất
      const sortedTags = Object.entries(tagCount)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3); // Top 3 tags

      setTrendingTags(sortedTags);
    } catch (error) {
      // Silent fail
      setTrendingTags([]);
    }
  };

  const handleTagClick = (tag) => {
    navigate(`/explore?q=${encodeURIComponent(tag)}`);
  };

  /**
   * Gửi lời mời kết bạn - Tái sử dụng logic từ Friends.jsx
   * @param {string} userId - ID của user nhận lời mời
   */
  const handleAddFriend = async (userId) => {
    try {
      // Đánh dấu đang gửi request
      setSendingRequests(prev => new Set(prev).add(userId));

      // Gửi request sử dụng endpoint đúng - tái sử dụng logic từ Friends.jsx
      await api('/api/friends/send-request', {
        method: 'POST',
        body: { to: userId }
      });

      // Đánh dấu đã gửi thành công
      setSentRequests(prev => new Set(prev).add(userId));

      // Reload suggestions để cập nhật danh sách (người đã gửi lời mời sẽ không còn trong suggestions)
      try {
        const suggestionsResponse = await api('/api/friends/suggestions?limit=5');
        // Cập nhật danh sách với suggestions mới (loại trừ user đã gửi lời mời)
        setFriendSuggestions(suggestionsResponse.suggestions || []);
      } catch (error) {
        // Nếu reload thất bại, chỉ xóa user đã gửi lời mời khỏi danh sách hiện tại
        setFriendSuggestions(prev => prev.filter(f => f._id !== userId));
      }

      // Xóa trạng thái "đã gửi" sau 1 giây để reset UI
      setTimeout(() => {
        setSentRequests(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      }, 1000);
    } catch (error) {
      // Hiển thị thông báo lỗi - tái sử dụng logic từ Friends.jsx
      alert(error.message || 'Có lỗi xảy ra khi gửi lời mời kết bạn');
    } finally {
      // Xóa trạng thái đang gửi
      setSendingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Loading skeletons */}
        {[1, 2].map(i => (
          <div key={i} className="bg-white dark:bg-[#111] rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-transparent dark:border-white/5 p-5">
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-24 mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map(j => (
                <div key={j} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-32 mb-1"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-24"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-h-[calc(100vh-5rem)] overflow-y-auto scrollbar-hide">
      {/* Friend Suggestions */}
      <div className="bg-white dark:bg-[#111] rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-transparent dark:border-white/5 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="font-bold text-gray-900 dark:text-white">Gợi ý kết bạn</h3>
          <Link
            to="/friends?tab=suggestions"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 transition-colors"
          >
            Xem tất cả
            <ArrowRight size={14} />
          </Link>
        </div>
        <div className="p-5">
          {friendSuggestions.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              Không có gợi ý bạn bè
            </p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
              {friendSuggestions.slice(0, 4).map((friend) => {
              const isSending = sendingRequests.has(friend._id);
              const isSent = sentRequests.has(friend._id);

              return (
                <div key={friend._id} className="flex items-center gap-3">
                  <Link to={`/user/${friend._id}`} className="flex-shrink-0">
                    <img
                      src={friend.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.name)}&length=2&background=cccccc&color=222222&size=40`}
                      alt={friend.name}
                      className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-neutral-600"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/user/${friend._id}`}
                      className="block text-sm font-medium text-gray-900 dark:text-white hover:underline truncate"
                    >
                      <UserName user={friend} />
                    </Link>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      @{friend.name.toLowerCase().replace(/\s+/g, '')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAddFriend(friend._id)}
                    disabled={isSending || isSent}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 shadow-sm hover:shadow-md ${
                      isSent
                        ? 'bg-green-500 dark:bg-green-600 text-white cursor-default'
                        : isSending
                        ? 'bg-gray-400 dark:bg-gray-600 text-white cursor-wait'
                        : 'bg-gray-900 dark:bg-gray-700 text-white dark:text-gray-100 hover:bg-gray-800 dark:hover:bg-gray-600 active:scale-95 border border-gray-800 dark:border-gray-600'
                    }`}
                    title={isSent ? 'Đã gửi lời mời' : isSending ? 'Đang gửi...' : 'Gửi lời mời kết bạn'}
                  >
                    {isSent ? (
                      <Check size={18} strokeWidth={2.5} />
                    ) : isSending ? (
                      <Loader2 size={18} className="animate-spin" strokeWidth={2.5} />
                    ) : (
                      <Plus size={18} strokeWidth={2.5} />
                    )}
                  </button>
                </div>
              );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Trending Tags */}
      <div className="bg-white dark:bg-[#111] rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-transparent dark:border-white/5 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-gray-900 dark:text-white" />
            <h3 className="font-bold text-gray-900 dark:text-white">Tags xu hướng</h3>
          </div>
          <Link
            to="/explore"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 transition-colors"
          >
            Xem thêm
            <ArrowRight size={14} />
          </Link>
        </div>
        <div className="p-5 space-y-2">
          {trendingTags.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              Chưa có tag xu hướng
            </p>
          ) : (
            trendingTags.map(({ tag, count }, index) => (
              <div
                key={tag}
                onClick={() => handleTagClick(tag)}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{index + 1}</span>
                  </div>
                  <Hash size={14} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <span className="font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {tag}
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium ml-2 flex-shrink-0">
                  {count} bài
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

