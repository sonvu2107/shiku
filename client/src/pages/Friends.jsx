import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { cn } from '../utils/cn';
import { SpotlightCard } from '../components/ui/SpotlightCard';
import { PageLayout } from '../components/ui/DesignSystem';
import { generateAvatarUrl } from '../utils/avatarUtils';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import {
  Users, UserPlus, UserCheck, UserX, Search, Clock,
  Send, UserMinus, MessageCircle, Zap
} from 'lucide-react';
import Avatar from '../components/Avatar';
import Pagination from '../components/admin/Pagination';

// --- UI COMPONENTS ---
const GridPattern = () => (
  <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-black bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
);

export default function Friends() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showSuccess, showError } = useToast();

  // State
  const [activeTab, setActiveTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [pagination, setPagination] = useState({
    friends: { page: 1, limit: 12, totalPages: 1, total: 0 },
    requests: { page: 1, limit: 12, totalPages: 1, total: 0 },
    sent: { page: 1, limit: 12, totalPages: 1, total: 0 },
    suggestions: { page: 1, limit: 12, totalPages: 1, total: 0 }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState(new Set());

  // Initial Load
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['friends', 'requests', 'sent', 'suggestions'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    loadAllData();
  }, []);

  // Tab Switch Logic
  useEffect(() => {
    // Reload data when switching tabs to ensure freshness
    if (activeTab === 'friends' && friends.length === 0) loadFriends();
    if (activeTab === 'requests') loadRequests();
    if (activeTab === 'sent') loadSentRequests();
    if (activeTab === 'suggestions' && suggestions.length === 0) loadSuggestions();
  }, [activeTab]);

  // Search Logic
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) searchUsers();
      else setSearchResults([]);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // API Calls
  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([loadFriends(), loadRequests(), loadSuggestions()]);
    setLoading(false);
  };

  const loadFriends = async (page = 1) => {
    try {
      const res = await api(`/api/friends/list?page=${page}&limit=12`);
      setFriends(res.friends || []);
      if (res.pagination) {
        setPagination(prev => ({ ...prev, friends: res.pagination }));
      }
    } catch (_) { }
  };
  const loadRequests = async (page = 1) => {
    try {
      const res = await api(`/api/friends/requests?page=${page}&limit=12`);
      setRequests(res.requests || []);
      if (res.pagination) {
        setPagination(prev => ({ ...prev, requests: res.pagination }));
      }
    } catch (_) { }
  };
  const loadSentRequests = async (page = 1) => {
    try {
      const res = await api(`/api/friends/sent-requests?page=${page}&limit=12`);
      setSentRequests(res.requests || []);
      if (res.pagination) {
        setPagination(prev => ({ ...prev, sent: res.pagination }));
      }
    } catch (_) { }
  };
  const loadSuggestions = async (page = 1) => {
    try {
      const res = await api(`/api/friends/suggestions?page=${page}&limit=12`);
      setSuggestions(res.suggestions || []);
      if (res.pagination) {
        setPagination(prev => ({ ...prev, suggestions: res.pagination }));
      }
    } catch (_) { }
  };
  const searchUsers = async () => {
    try {
      const res = await api(`/api/friends/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(res.users || []);
    } catch (_) { }
  };

  // Helper function to format last seen time (same as FriendCard)
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

  // Actions
  const handleFriendAction = async (action, id) => {
    const actionKey = `${action}-${id}`;
    try {
      setProcessingIds(prev => new Set([...prev, actionKey]));

      if (action === 'accept') {
        await api(`/api/friends/accept-request/${id}`, { method: 'POST' });
        setRequests(prev => prev.filter(r => r._id !== id));
        loadFriends(); // Refresh friends list
      } else if (action === 'reject') {
        await api(`/api/friends/reject-request/${id}`, { method: 'POST' });
        setRequests(prev => prev.filter(r => r._id !== id));
      } else if (action === 'cancel') {
        if (confirm('Hủy lời mời?')) {
          await api(`/api/friends/cancel-request/${id}`, { method: 'DELETE' });
          setSentRequests(prev => prev.filter(r => r.to._id !== id));
        }
      } else if (action === 'remove') {
        if (confirm('Xóa bạn bè?')) {
          await api(`/api/friends/remove/${id}`, { method: 'DELETE' });
          setFriends(prev => prev.filter(f => f._id !== id));
        }
      } else if (action === 'add') {
        await api('/api/friends/send-request', { method: 'POST', body: { to: id } });
        setSuggestions(prev => prev.filter(u => u._id !== id)); // Remove from suggestions UI
        showSuccess('Đã gửi lời mời!');
      }
    } catch (err) {
      showError(err.message || 'Có lỗi xảy ra');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(actionKey);
        return newSet;
      });
    }
  };

  // Helper render user card
  const renderUserCard = (user, type) => {
    // Normalize data structure based on type
    const userData = type === 'request' ? user.from : (type === 'sent' ? user.to : user);
    const requestId = type === 'request' ? user._id : null; // request object has _id

    // Skip rendering if userData is null (e.g., deleted user)
    if (!userData) return null;

    return (
      <SpotlightCard key={userData._id} className="p-4">
        <div className="flex items-center gap-4 mb-3">
          <Avatar
            src={userData.avatarUrl}
            name={userData.name}
            size={48}
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/user/${userData._id}`);
            }}
          />
          <div className="flex-1 min-w-0">
            <div
              className="font-bold cursor-pointer hover:text-black dark:text-white transition-colors truncate"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/user/${userData._id}`);
              }}
            >
              {userData.name}
            </div>
            <div className={cn(
              "text-xs truncate",
              type === 'friend' || type === 'suggestion' || type === 'sent' || type === 'request'
                ? (userData.isOnline
                  ? "text-green-600 dark:text-green-400 uppercase font-bold tracking-wider"
                  : "text-neutral-500 dark:text-neutral-400 uppercase font-bold tracking-wider")
                : "text-neutral-500 dark:text-neutral-400"
            )}>
              {type === 'request' ? `Đã gửi ${new Date(user.createdAt).toLocaleDateString('vi-VN')}` :
                type === 'sent' ? `Gửi ${new Date(user.createdAt).toLocaleDateString('vi-VN')}` :
                  type === 'friend' ? (userData.isOnline ? 'Online' : getLastSeenText(userData.lastSeen, userData.isOnline)) :
                    type === 'suggestion' ? (userData.isOnline ? 'Online' : getLastSeenText(userData.lastSeen, userData.isOnline)) :
                      'User'}
            </div>
          </div>
        </div>

        {/* Actions Buttons */}
        <div className="flex gap-2">
          {type === 'friend' && (
            <>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (window.confirm(`Bạn có chắc muốn hủy kết bạn với ${userData.name}?`)) {
                    await handleFriendAction('remove', userData._id);
                  }
                }}
                className="flex-1 px-4 py-2 rounded-full bg-black dark:bg-white text-white dark:text-black font-bold text-sm flex items-center justify-center gap-2 hover:bg-neutral-800 dark:hover:bg-neutral-200 active:bg-neutral-700 dark:active:bg-neutral-300 transition-colors min-h-[44px] touch-manipulation"
              >
                <UserCheck size={16} /> Đã kết bạn
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/chat?user=${userData._id}`);
                }}
                className="px-3 md:px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-medium text-xs md:text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 active:bg-neutral-200 dark:active:bg-neutral-700 transition-colors flex items-center justify-center min-w-[44px] min-h-[44px] touch-manipulation"
              >
                <MessageCircle size={14} className="md:w-4 md:h-4" />
              </button>
            </>
          )}

          {type === 'request' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleFriendAction('accept', requestId);
                }}
                disabled={processingIds.has(`accept-${requestId}`)}
                className="flex-1 px-3 md:px-4 py-2 rounded-full bg-black dark:bg-white text-white dark:text-black font-bold text-xs md:text-sm flex items-center justify-center gap-1.5 md:gap-2 hover:bg-neutral-800 dark:hover:bg-neutral-200 active:bg-neutral-700 dark:active:bg-neutral-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] touch-manipulation"
              >
                <UserCheck size={14} className="md:w-4 md:h-4" />
                <span className="truncate">{processingIds.has(`accept-${requestId}`) ? 'Đang xử lý...' : 'Chấp nhận'}</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleFriendAction('reject', requestId);
                }}
                disabled={processingIds.has(`reject-${requestId}`)}
                className="flex-1 px-3 md:px-4 py-2 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold text-xs md:text-sm flex items-center justify-center gap-1.5 md:gap-2 hover:bg-neutral-300 dark:hover:bg-neutral-700 active:bg-neutral-400 dark:active:bg-neutral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] touch-manipulation"
              >
                <UserX size={14} className="md:w-4 md:h-4" />
                <span className="truncate">{processingIds.has(`reject-${requestId}`) ? 'Đang xử lý...' : 'Từ chối'}</span>
              </button>
            </>
          )}

          {type === 'sent' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFriendAction('cancel', userData._id);
              }}
              className="flex-1 px-3 md:px-4 py-2 rounded-full border border-red-200 dark:border-red-800 bg-white dark:bg-neutral-900 text-red-600 dark:text-red-400 font-medium text-xs md:text-sm hover:bg-red-50 dark:hover:bg-red-900/20 active:bg-red-100 dark:active:bg-red-900/30 transition-colors min-h-[44px] touch-manipulation"
            >
              <span className="whitespace-nowrap">Hủy lời mời</span>
            </button>
          )}

          {type === 'suggestion' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFriendAction('add', userData._id);
              }}
              className="flex-1 px-3 md:px-4 py-2 rounded-full bg-black dark:bg-white text-white dark:text-black font-bold text-xs md:text-sm flex items-center justify-center gap-1.5 md:gap-2 hover:scale-105 active:scale-95 transition-transform min-h-[44px] touch-manipulation"
            >
              <UserPlus size={14} className="md:w-4 md:h-4" /> <span className="whitespace-nowrap">Kết bạn</span>
            </button>
          )}
        </div>
      </SpotlightCard>
    );
  };



  const getPaginationForActiveTab = () => {
    switch (activeTab) {
      case 'friends': return pagination.friends;
      case 'requests': return pagination.requests;
      case 'sent': return pagination.sent;
      case 'suggestions': return pagination.suggestions;
      default: return null;
    }
  };

  const handlePageChange = (newPage) => {
    switch (activeTab) {
      case 'friends': loadFriends(newPage); break;
      case 'requests': loadRequests(newPage); break;
      case 'sent': loadSentRequests(newPage); break;
      case 'suggestions': loadSuggestions(newPage); break;
    }
  };

  const currentPagination = getPaginationForActiveTab();

  return (
    <PageLayout className="relative overflow-x-hidden bg-white dark:bg-black">
      <GridPattern />

      <div>
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2">Bạn bè</h1>
            <p className="text-neutral-500 dark:text-neutral-300 text-lg">Quản lý các kết nối của bạn</p>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" size={20} />
            <input
              type="text"
              placeholder="Tìm bạn bè, người dùng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-100 dark:bg-neutral-900 border border-transparent focus:bg-white dark:focus:bg-black focus:border-neutral-300 dark:focus:border-neutral-700 rounded-2xl py-3 pl-12 pr-4 outline-none transition-all shadow-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
            />
          </div>
        </div>

        {/* --- TABS NAVIGATION --- */}
        <div className="sticky top-20 z-30 mb-6 md:mb-8">
          <div className="relative">
            {/* Gradient indicators for mobile scroll */}
            <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white dark:from-black to-transparent z-10 pointer-events-none md:hidden"></div>
            <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white dark:from-black to-transparent z-10 pointer-events-none md:hidden"></div>

            <div className="bg-white/80 dark:bg-black/80 backdrop-blur-xl rounded-2xl p-1 md:p-1.5 border border-neutral-200 dark:border-neutral-800 w-full overflow-x-auto scrollbar-hide">
              <div className="flex gap-1.5 md:gap-2 min-w-max md:min-w-full md:inline-flex">
                {[
                  { id: 'friends', label: 'Tất cả bạn bè', icon: Users, count: friends.length },
                  { id: 'requests', label: 'Lời mời', icon: UserPlus, count: requests.length },
                  { id: 'sent', label: 'Đã gửi', icon: Send, count: sentRequests.length },
                  { id: 'suggestions', label: 'Gợi ý', icon: Zap, count: suggestions.length },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex-shrink-0 flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap min-h-[44px] touch-manipulation text-neutral-500 dark:text-neutral-300",
                      activeTab === tab.id
                        ? "bg-black dark:bg-white text-white dark:text-black shadow-md"
                        : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900 active:bg-neutral-200 dark:active:bg-neutral-800"
                    )}
                  >
                    <tab.icon size={14} className="hidden md:block md:w-4 md:h-4 flex-shrink-0" />
                    <span className="truncate">{tab.label}</span>
                    {tab.count > 0 && (
                      <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded-md ml-1 font-bold flex-shrink-0",
                        activeTab === tab.id
                          ? "bg-white/30 dark:bg-neutral-900/50 text-white dark:text-black border border-white/20 dark:border-neutral-800/30"
                          : "bg-neutral-300 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200"
                      )}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* --- CONTENT GRID --- */}
        <div className="min-h-[400px]">
          {searchQuery.trim() ? (
            // Search Results
            <div>
              <h3 className="text-xl font-bold mb-6">Kết quả tìm kiếm ({searchResults.length})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {searchResults.map(user => renderUserCard(user, 'suggestion'))}
              </div>
              {searchResults.length === 0 && <div className="text-neutral-500 dark:text-neutral-400">Không tìm thấy kết quả nào.</div>}
            </div>
          ) : (
            // Tab Content
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

              {activeTab === 'friends' && (
                friends.length > 0 ? friends.map(f => renderUserCard(f, 'friend'))
                  : <div className="col-span-full text-center py-20 text-neutral-500 dark:text-neutral-400">Chưa có bạn bè nào.</div>
              )}

              {activeTab === 'requests' && (
                requests.length > 0 ? requests.map(r => renderUserCard(r, 'request'))
                  : (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="col-span-full text-center py-20"
                    >
                      <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center shadow-inner">
                        <UserCheck size={40} className="text-black dark:text-white dark:text-blue-400" />
                      </div>
                      <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Không có lời mời nào</h3>
                      <p className="text-neutral-500 dark:text-neutral-400">Bạn sẽ thấy lời mời kết bạn ở đây khi có người gửi cho bạn</p>
                    </motion.div>
                  )
              )}

              {activeTab === 'sent' && (
                sentRequests.length > 0 ? sentRequests.map(r => renderUserCard(r, 'sent'))
                  : (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="col-span-full text-center py-20"
                    >
                      <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-full flex items-center justify-center shadow-inner">
                        <Clock size={40} className="text-yellow-500 dark:text-yellow-400" />
                      </div>
                      <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Chưa gửi lời mời nào</h3>
                      <p className="text-neutral-500 dark:text-neutral-400">Các lời mời kết bạn bạn đã gửi sẽ hiển thị ở đây</p>
                    </motion.div>
                  )
              )}

              {activeTab === 'suggestions' && (
                suggestions.length > 0 ? suggestions.map(u => renderUserCard(u, 'suggestion'))
                  : (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="col-span-full text-center py-20"
                    >
                      <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/30 dark:to-blue-900/30 rounded-full flex items-center justify-center shadow-inner">
                        <Zap size={40} className="text-green-500 dark:text-green-400" />
                      </div>
                      <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Không có gợi ý nào</h3>
                      <p className="text-neutral-500 dark:text-neutral-400 mb-6">Chúng tôi sẽ đề xuất bạn bè dựa trên hoạt động của bạn</p>
                      <button
                        onClick={() => loadSuggestions()}
                        className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full font-semibold hover:scale-105 transition-transform shadow-lg"
                      >
                        Tải lại
                      </button>
                    </motion.div>
                  )
              )}
            </div>
          )}

          {/* Pagination Controls */}
          {!searchQuery.trim() && currentPagination && currentPagination.totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                pagination={currentPagination}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>

      </div>
    </PageLayout>
  );
}
