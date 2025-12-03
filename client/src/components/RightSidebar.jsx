import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, ArrowRight, TrendingUp, Hash, Loader2, Check, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api';
import UserName from './UserName';
import UserAvatar from './UserAvatar';
import { useTrendingTags } from '../hooks/useTrendingTags';
import { useToast } from '../contexts/ToastContext';

/**
 * RightSidebar - Right sidebar with friend suggestions and trending tags
 */
function RightSidebar({ user }) {
  const { showError } = useToast();
  const [friendSuggestions, setFriendSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingRequests, setSendingRequests] = useState(new Set()); // Track which requests are being sent
  const [sentRequests, setSentRequests] = useState(new Set()); // Track which requests were sent successfully
  const navigate = useNavigate();
  
  // OPTIMIZATION: Sử dụng React Query hook với caching tự động
  const { data: trendingTags, isLoading: tagsLoading } = useTrendingTags(3);
  
  // Fallback nếu chưa có data
  const displayTags = trendingTags || [];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  // Memoized loadData function - chỉ load friend suggestions
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load friend suggestions
      try {
        const suggestionsResponse = await api('/api/friends/suggestions?limit=5');
        setFriendSuggestions(suggestionsResponse.suggestions || []);
      } catch (error) {
        // Silent fail
      }
    } catch (error) {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const handleTagClick = (tag) => {
    navigate(`/explore?q=${encodeURIComponent(tag)}`);
  };

  /**
   * Send a friend request - reuses logic from Friends.jsx
   * @param {string} userId - ID of the user to send the request to
   */
  const handleAddFriend = async (userId) => {
    try {
      // Mark request as sending
      setSendingRequests(prev => new Set(prev).add(userId));

      // Send request using the appropriate endpoint (reused logic)
      await api('/api/friends/send-request', {
        method: 'POST',
        body: { to: userId }
      });

      // Mark as sent successfully
      setSentRequests(prev => new Set(prev).add(userId));

      // Reload suggestions to update the list (sent user will be removed)
      try {
        const suggestionsResponse = await api('/api/friends/suggestions?limit=5');
        // Update the list with new suggestions
        setFriendSuggestions(suggestionsResponse.suggestions || []);
      } catch (error) {
        // If reload fails, remove the sent user from the current list
        setFriendSuggestions(prev => prev.filter(f => f._id !== userId));
      }

      // Clear the "sent" state after 1 second to reset the UI
      setTimeout(() => {
        setSentRequests(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      }, 1000);
    } catch (error) {
      // Show error toast
      showError(error.message || 'Có lỗi xảy ra khi gửi lời mời kết bạn');
    } finally {
      // Clear sending state
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
    <div className="space-y-6 max-h-[calc(100vh-5rem)] overflow-y-auto scrollbar-hide pb-20">
      {/* Friend Suggestions */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white dark:bg-[#111] rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-transparent dark:border-white/5 overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <h3 className="font-bold text-neutral-900 dark:text-white">Gợi ý kết bạn</h3>
          <Link
            to="/friends?tab=suggestions"
            className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1 transition-colors"
          >
            Xem tất cả
            <ArrowRight size={14} />
          </Link>
        </div>
        <div className="p-5">
          {friendSuggestions.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-4">
              Không có gợi ý bạn bè
            </p>
          ) : (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              {friendSuggestions.slice(0, 4).map((friend) => {
              const isSending = sendingRequests.has(friend._id);
              const isSent = sentRequests.has(friend._id);

              return (
                <motion.div 
                  key={friend._id} 
                  variants={itemVariants}
                  className="flex items-center gap-3 group"
                >
                  <Link to={`/user/${friend._id}`} className="flex-shrink-0 relative">
                    <UserAvatar 
                      user={friend}
                      size={40}
                      showFrame={false}
                      showBadge={false}
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/user/${friend._id}`}
                      className="block text-sm font-bold text-neutral-900 dark:text-white hover:underline truncate"
                    >
                      <UserName user={friend} />
                    </Link>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                      @{friend.name.toLowerCase().replace(/\s+/g, '')}
                    </p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleAddFriend(friend._id)}
                    disabled={isSending || isSent}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 shadow-sm ${
                      isSent
                        ? 'bg-green-500 dark:bg-green-600 text-white cursor-default'
                        : isSending
                        ? 'bg-neutral-400 dark:bg-neutral-600 text-white cursor-wait'
                        : 'bg-black dark:bg-neutral-800 text-white dark:text-white hover:bg-neutral-800 dark:hover:bg-neutral-700'
                    }`}
                    title={isSent ? 'Đã gửi lời mời' : isSending ? 'Đang gửi...' : 'Gửi lời mời kết bạn'}
                  >
                    {isSent ? (
                      <Check size={16} strokeWidth={2.5} />
                    ) : isSending ? (
                      <Loader2 size={16} className="animate-spin" strokeWidth={2.5} />
                    ) : (
                      <Plus size={16} strokeWidth={2.5} />
                    )}
                  </motion.button>
                </motion.div>
              );
              })}
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Trending Tags */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="bg-white dark:bg-[#111] rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-transparent dark:border-white/5 overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-neutral-900 dark:text-white" />
            <h3 className="font-bold text-neutral-900 dark:text-white">Tags xu hướng</h3>
          </div>
          <Link
            to="/explore"
            className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1 transition-colors"
          >
            Xem thêm
            <ArrowRight size={14} />
          </Link>
        </div>
        <div className="p-5 space-y-2">
          {tagsLoading ? (
            <div className="text-center py-4">
              <Loader2 size={20} className="animate-spin text-neutral-400 mx-auto" />
            </div>
          ) : displayTags.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-4">
              Chưa có tag xu hướng
            </p>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-1"
            >
              {displayTags.map(({ tag, count }, index) => (
                <motion.div
                  key={tag}
                  variants={itemVariants}
                  onClick={() => handleTagClick(tag)}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 group-hover:bg-white dark:group-hover:bg-black border border-transparent group-hover:border-neutral-200 dark:group-hover:border-neutral-700 flex items-center justify-center transition-all">
                      <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 group-hover:text-black dark:group-hover:text-white">#{index + 1}</span>
                    </div>
                    <span className="font-medium text-neutral-700 dark:text-neutral-200 truncate group-hover:text-black dark:group-hover:text-white transition-colors">
                      {tag}
                    </span>
                  </div>
                  <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium ml-2 flex-shrink-0 bg-neutral-50 dark:bg-neutral-900 px-2 py-1 rounded-md">
                    {count}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Footer Links */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="px-4 py-2"
      >
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-neutral-400 dark:text-neutral-500 justify-center">
          <Link to="/about" className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">Giới thiệu</Link>
          <Link to="/help" className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">Hỗ trợ</Link>
          <Link to="/terms" className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">Điều khoản</Link>
          <Link to="/privacy" className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">Quyền riêng tư</Link>
        </div>
        <div className="mt-4 text-center text-[10px] text-neutral-300 dark:text-neutral-600 font-medium">
          © 2025 SHIKU SOCIAL
        </div>
      </motion.div>
    </div>
  );
}

// Memoize component để tối ưu performance
export default React.memo(RightSidebar, (prevProps, nextProps) => {
  // Re-render chỉ khi user._id thay đổi
  return prevProps.user?._id === nextProps.user?._id;
});

