import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import { motion } from "framer-motion";
import ModernPostCard from "../components/ModernPostCard";
import { useSavedPosts } from "../hooks/useSavedPosts";
import { generateAvatarUrl, AVATAR_SIZES } from "../utils/avatarUtils";
import UserAvatar, { UserTitle, UserBadge } from "../components/UserAvatar";
import ProfileEffect from "../components/ProfileEffect";
import CultivationBadge from "../components/CultivationBadge";
import { cn } from "../utils/cn";
import { useToast } from "../contexts/ToastContext";
import { Loader2 } from "lucide-react";
import {
  MapPin, Link as LinkIcon, Calendar as CalendarIcon, Heart, Users, FileText,
  MessageCircle, UserPlus, UserMinus, UserCheck, MoreHorizontal, Phone, Ban, Shield, Sparkles
} from "lucide-react";
import BackToTop from "../components/BackToTop";

// --- UI COMPONENTS ---

const GridPattern = () => (
  <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-black bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
    <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[500px] w-[500px] rounded-full bg-neutral-200 dark:bg-neutral-900 opacity-20 blur-[100px]"></div>
  </div>
);

const NoiseOverlay = () => (
  <div className="fixed inset-0 z-50 pointer-events-none opacity-[0.03] mix-blend-overlay"
    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
  />
);

const SpotlightCard = ({ children, className = "", onClick }) => {
  const divRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e) => {
    if (!divRef.current) return;
    const div = divRef.current;
    const rect = div.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 p-6 transition-all duration-300 hover:shadow-lg cursor-default",
        className
      )}
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300"
        style={{
          opacity,
          background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, rgba(150,150,150,0.1), transparent 40%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default function UserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  // ==================== STATE ====================
  const [user, setUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Friend Status - sử dụng cấu trúc từ API /api/users/:id
  const [friendStatus, setFriendStatus] = useState('none'); // none, friend, pending_sent, pending_received
  const [loadingAction, setLoadingAction] = useState(false);
  
  // Block status
  const [isBlocked, setIsBlocked] = useState(false); // Trạng thái đã chặn user này chưa
  const [showMenu, setShowMenu] = useState(false); // Hiển thị dropdown menu
  const [loadingBlock, setLoadingBlock] = useState(false); // Loading khi block/unblock
  const menuRef = useRef(null);
  const coverRef = useRef(null); // Ref for ProfileEffect

  // Data
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [currentUserFriends, setCurrentUserFriends] = useState([]); // Danh sách bạn bè của currentUser để check friend status
  
  const [activeTab, setActiveTab] = useState('posts');
  const { savedMap, updateSavedState } = useSavedPosts(posts);

  // ==================== EFFECTS ====================
  useEffect(() => {
    loadProfile();
  }, [userId]);

  useEffect(() => {
    if (user) {
      loadPosts();
      if (activeTab === 'friends') loadFriends();
    }
  }, [user, activeTab]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // ==================== API CALLS ====================
  async function loadProfile() {
    setLoading(true);
    setError("");
    try {
      // Lấy thông tin user cần xem
      const res = await api(`/api/users/${userId}`);
      
      // Kiểm tra nếu bị chặn
      if (res.user.theyBlockedMe) {
        setError("Người dùng này đã chặn bạn");
        setLoading(false);
        return;
      }
      
      setUser(res.user);
      
      // Lấy thông tin user hiện tại để check trạng thái bạn bè
      try {
        const meRes = await api("/api/auth/me");
        setCurrentUser(meRes.user);
        
        // Redirect về Profile nếu xem chính mình
        if (meRes.user._id === res.user._id || meRes.user.id === res.user._id) {
          navigate('/profile');
      return;
    }
        
        // Load danh sách bạn bè của currentUser để check friend status trong Friends tab
        try {
          const friendsRes = await api("/api/friends/list");
          setCurrentUserFriends(friendsRes.friends || []);
        } catch (e) {
          // Không load được friends, không sao
        }
      } catch (e) {
        // User chưa đăng nhập, không sao
      }
      
      // Set friend status từ API response
      if (res.user.isFriend) {
        setFriendStatus('friend');
      } else if (res.user.hasPendingRequest) {
        if (res.user.pendingRequestDirection === 'sent') {
          setFriendStatus('pending_sent');
        } else {
          setFriendStatus('pending_received');
        }
      } else {
        setFriendStatus('none');
      }
      
      // Set block status từ API response
      setIsBlocked(res.user.iBlockedThem || false);
      
      // Set friends từ user object (đã được populate)
      if (res.user.friends) {
        setFriends(res.user.friends);
      }
    } catch (err) {
      setError("Không tìm thấy người dùng");
    } finally {
      setLoading(false);
    }
  }

  async function loadPosts() {
    setPostsLoading(true);
    try {
      // Chỉ load bài public của người khác
      const res = await api(`/api/posts?author=${userId}&status=published&limit=20`);
      setPosts(res.items || []);
    } catch (error) {
      console.error(error);
    } finally {
      setPostsLoading(false);
    }
  }

  async function loadFriends() {
    if(friends.length > 0) return;
    setFriendsLoading(true);
    try {
      // Friends đã được populate trong loadProfile, nhưng reload để đảm bảo data mới nhất
      const res = await api(`/api/users/${userId}`);
      if (res.user && res.user.friends) {
        setFriends(res.user.friends);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setFriendsLoading(false);
    }
  }

  // ==================== ACTIONS ====================
  const handleFriendAction = async () => {
    setLoadingAction(true);
    try {
      if (friendStatus === 'none') {
        // Gửi lời mời
        await api("/api/friends/send-request", { method: "POST", body: { to: user._id } });
        setFriendStatus('pending_sent');
      } else if (friendStatus === 'pending_sent') {
        // Hủy lời mời
        await api(`/api/friends/cancel-request/${user._id}`, { method: "DELETE" });
        setFriendStatus('none');
      } else if (friendStatus === 'pending_received') {
        // Chấp nhận - cần load requests để tìm requestId
        const requestsRes = await api("/api/friends/requests");
        const request = requestsRes.requests?.find(r => {
          const fromId = r.from?._id || r.from;
          return fromId === user._id || fromId?.toString() === user._id?.toString();
        });
        if (request) {
          await api(`/api/friends/accept-request/${request._id}`, { method: "POST" });
          setFriendStatus('friend');
          // Reload friends list
          await loadFriends();
        } else {
          throw new Error("Không tìm thấy lời mời kết bạn");
        }
      } else if (friendStatus === 'friend') {
        // Hủy kết bạn (Cần confirm)
        if(window.confirm("Bạn có chắc muốn hủy kết bạn?")) {
           await api(`/api/friends/remove/${user._id}`, { method: "DELETE" });
           setFriendStatus('none');
           showSuccess("Đã hủy kết bạn.");
           // Reload friends list
           await loadFriends();
        }
      }
    } catch (e) {
      showError(e.message || "Có lỗi xảy ra");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleMessage = () => {
    navigate(`/chat?user=${user._id}`);
  };

  const handleBlock = async () => {
    if (!window.confirm(isBlocked 
      ? "Bạn có chắc muốn bỏ chặn người dùng này?" 
      : "Bạn có chắc muốn chặn người dùng này? Bạn sẽ không thể xem nội dung của họ và họ cũng không thể xem nội dung của bạn."
    )) {
      return;
    }

    setLoadingBlock(true);
    try {
      if (isBlocked) {
        // Bỏ chặn
        await api(`/api/users/unblock/${user._id}`, { method: "POST" });
        setIsBlocked(false);
        showSuccess("Đã bỏ chặn người dùng.");
      } else {
        // Chặn
        await api(`/api/users/block/${user._id}`, { method: "POST" });
        setIsBlocked(true);
        showSuccess("Đã chặn người dùng.");
        // Reset friend status khi block
        setFriendStatus('none');
      }
      setShowMenu(false);
    } catch (e) {
      showError(e.message || "Có lỗi xảy ra");
    } finally {
      setLoadingBlock(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={32} className="animate-spin text-gray-600 dark:text-gray-300" />
          <p className="text-gray-600 dark:text-gray-300">Đang tải thông tin...</p>
        </div>
      </div>
    );
  }
  
  if (error || !user) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <Ban size={24} className="text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Không tìm thấy người dùng</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error || "Người dùng không tồn tại"}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

      return (
    <div className="min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-white transition-colors duration-300 font-sans relative overflow-x-hidden">
      <NoiseOverlay />
      <GridPattern />

      {/* --- 1. HEADER SECTION --- */}
      <div className="relative">
        {/* Cover Image */}
        <div ref={coverRef} className="h-64 md:h-80 lg:h-96 w-full relative overflow-hidden group">
          {user.coverUrl && user.useCoverImage !== false ? (
            <motion.img
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.5 }}
              src={user.coverUrl}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-neutral-200 to-neutral-400 dark:from-neutral-800 dark:to-neutral-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent dark:from-black dark:via-transparent dark:to-transparent opacity-90" />
          
          {/* Profile Effect Overlay */}
          {user.cultivationCache?.equipped?.profileEffect && (
            <ProfileEffect 
              effectId={user.cultivationCache.equipped.profileEffect}
              containerRef={coverRef}
              className="z-10"
            />
          )}
      </div>

        {/* Info Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-24 relative z-10">
          <div className="flex flex-col md:flex-row items-end md:items-end gap-6 mb-8">
            
                {/* Avatar */}
            <div className="relative mx-auto md:mx-0">
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
              >
                <UserAvatar 
                  user={user}
                  size={160}
                  showFrame={true}
                  showBadge={true}
                  showTitle={false}
                  className="hidden md:block border-4 md:border-[6px] border-white dark:border-black rounded-full shadow-2xl"
                />
                <UserAvatar 
                  user={user}
                  size={128}
                  showFrame={true}
                  showBadge={true}
                  showTitle={false}
                  className="hidden sm:block md:hidden border-4 border-white dark:border-black rounded-full shadow-2xl"
                />
                <UserAvatar 
                  user={user}
                  size={112}
                  showFrame={true}
                  showBadge={true}
                  showTitle={false}
                  className="sm:hidden border-4 border-white dark:border-black rounded-full shadow-2xl"
                />
              </motion.div>
                      </div>

            {/* Name & Actions */}
            <div className="flex-1 mb-2 w-full md:w-auto text-center md:text-left">
               <div className="flex items-center gap-3 mb-1 flex-wrap justify-center md:justify-start">
                  <motion.h1 
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="text-3xl md:text-5xl font-black text-neutral-900 dark:text-white tracking-tight"
                  >
                     {user.name}
                  </motion.h1>
                  {/* Role badge - chỉ hiển thị khi displayBadgeType = 'none' hoặc 'role' */}
                  {(!user.displayBadgeType || user.displayBadgeType === 'none' || user.displayBadgeType === 'role') && 
                   user.role && user.role !== "user" && (
                     <span className="px-3 py-1 bg-neutral-900 dark:bg-white text-white dark:text-black text-xs font-bold rounded-full uppercase tracking-wider">
                        {user.role}
                     </span>
                  )}
                  {/* Hiển thị cảnh giới tu tiên - nếu chọn realm hoặc both */}
                  {(user.displayBadgeType === 'realm' || user.displayBadgeType === 'both' || user.displayBadgeType === 'cultivation') && 
                   user.cultivationCache?.realmName && (
                     <CultivationBadge 
                        cultivation={user.cultivationCache} 
                        size="md" 
                        variant="gradient" 
                     />
                  )}
                  {/* Danh hiệu tu tiên - nếu chọn title hoặc both */}
                  {(user.displayBadgeType === 'title' || user.displayBadgeType === 'both') && (
                     <UserTitle user={user} className="text-sm" />
                  )}
               </div>
               
               {user.nickname && (
                  <p className="text-neutral-500 dark:text-neutral-400 text-lg font-medium mb-4">{user.nickname}</p>
               )}
               {!user.nickname && (
                  <div className="mb-4"></div>
               )}
               
               {/* Stats Row (Mobile - Grid 2 columns) */}
               <div className="grid grid-cols-2 md:hidden gap-4 mb-6 max-w-xs mx-auto md:mx-0">
                  <div className="text-center p-3 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                     <span className="block font-black text-black dark:text-white text-2xl">{posts.length}</span>
                     <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Bài viết</span>
                  </div>
                  <div className="text-center p-3 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                     <span className="block font-black text-black dark:text-white text-2xl">{friends.length || 0}</span>
                     <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Bạn bè</span>
                  </div>
               </div>
               
               <div className="flex flex-wrap justify-center md:justify-start gap-2 md:gap-3 w-full md:w-auto">
                  {/* Nút Kết bạn (Magic Button State) */}
                  <button 
                    onClick={handleFriendAction}
                    disabled={loadingAction}
                    className={cn(
                        "px-4 md:px-6 py-2.5 rounded-full font-bold text-xs md:text-sm hover:scale-105 active:scale-95 transition-transform shadow-lg flex items-center justify-center gap-1.5 md:gap-2 min-h-[44px] touch-manipulation flex-1 md:flex-initial",
                        friendStatus === 'friend' ? "bg-green-600 text-white" : 
                        friendStatus === 'pending_sent' ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300" :
                        friendStatus === 'pending_received' ? "bg-blue-600 text-white" :
                        "bg-neutral-900 dark:bg-white text-white dark:text-black",
                        loadingAction && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {loadingAction ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                        <>
                            {friendStatus === 'none' && <><UserPlus size={16} className="md:w-[18px] md:h-[18px]" /> <span className="whitespace-nowrap">Kết bạn</span></>}
                            {friendStatus === 'friend' && <><UserCheck size={16} className="md:w-[18px] md:h-[18px]" /> <span className="whitespace-nowrap">Bạn bè</span></>}
                            {friendStatus === 'pending_sent' && <><Users size={16} className="md:w-[18px] md:h-[18px]" /> <span className="hidden sm:inline">Đã gửi lời mời</span><span className="sm:hidden">Đã gửi</span></>}
                            {friendStatus === 'pending_received' && <><UserPlus size={16} className="md:w-[18px] md:h-[18px]" /> <span className="whitespace-nowrap">Chấp nhận</span></>}
                        </>
                    )}
                  </button>
                  
                  {/* Nút Nhắn tin */}
                  <button 
                    onClick={handleMessage}
                    className="px-4 md:px-6 py-2.5 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-medium text-xs md:text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 active:bg-neutral-200 dark:active:bg-neutral-700 transition-colors flex items-center justify-center gap-1.5 md:gap-2 min-h-[44px] touch-manipulation flex-1 md:flex-initial"
                  >
                    <MessageCircle size={16} className="md:w-[18px] md:h-[18px]" /> <span className="hidden sm:inline">Nhắn tin</span><span className="sm:hidden">Tin</span>
                  </button>

                  <div className="relative" ref={menuRef}>
                    <button 
                      onClick={() => setShowMenu(!showMenu)}
                      className="p-2.5 md:p-2.5 rounded-full border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 active:bg-neutral-200 dark:active:bg-neutral-700 transition-colors min-w-[44px] min-h-[44px] touch-manipulation flex items-center justify-center"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                    
                    {/* Dropdown Menu */}
                    {showMenu && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg z-50 overflow-hidden">
                        <button
                          onClick={handleBlock}
                          disabled={loadingBlock}
                          className="w-full px-4 py-3 text-left text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                          {loadingBlock ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-red-600 dark:border-red-400"></div>
                          ) : isBlocked ? (
                            <>
                              <Shield size={16} />
                              Bỏ chặn
                            </>
                          ) : (
                            <>
                              <Ban size={16} />
                              Chặn
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                  </div>
                </div>

            {/* Desktop Stats */}
            <div className="hidden md:flex gap-4 mb-2">
               <SpotlightCard className="py-4 px-6 min-w-[120px] text-center !rounded-2xl">
                  <span className="block text-2xl font-black text-black dark:text-white">{posts.length}</span>
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Bài viết</span>
               </SpotlightCard>
               <SpotlightCard className="py-4 px-6 min-w-[120px] text-center !rounded-2xl">
                  <span className="block text-2xl font-black text-black dark:text-white">{friends.length || 0}</span>
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Bạn bè</span>
               </SpotlightCard>
            </div>
          </div>

          {/* Details */}
          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.2 }}
             className="max-w-3xl mb-12"
          >
             <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-neutral-500 dark:text-neutral-500">
                {user.location && (
                   <div className="flex items-center gap-1.5">
                      <MapPin size={16} /> {user.location}
                   </div>
                )}
                {user.phone && (
                   <div className="flex items-center gap-1.5">
                      <Phone size={16} /> {user.phone}
                   </div>
                )}
                {user.birthday && (
                   <div className="flex items-center gap-1.5">
                      <CalendarIcon size={16} /> {new Date(user.birthday).toLocaleDateString('vi-VN')}
                   </div>
                )}
                {user.gender && (
                   <div className="flex items-center gap-1.5">
                      <span className="text-xs">Giới tính:</span> {
                         user.gender === 'male' ? 'Nam' :
                         user.gender === 'female' ? 'Nữ' :
                         user.gender === 'other' ? 'Khác' : user.gender
                      }
                   </div>
                )}
                {user.hobbies && (
                   <div className="flex items-center gap-1.5">
                      <Heart size={16} /> {user.hobbies}
                   </div>
                )}
                {user.website && (
                   <a 
                      href={user.website} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="flex items-center gap-1.5 hover:text-blue-500 transition-colors"
                   >
                      <LinkIcon size={16} /> {user.website.replace(/^https?:\/\//, '')}
                   </a>
                )}
             </div>
          </motion.div>

          {/* --- 2. TABS NAVIGATION --- */}
          <div className="sticky top-20 z-30 mb-6 md:mb-8">
            <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl rounded-full p-1 md:p-1.5 flex shadow-sm border border-neutral-200 dark:border-neutral-800 max-w-full md:max-w-xs mx-auto md:mx-0">
              {[
                { id: "posts", label: "Bài viết", icon: FileText },
                { id: "friends", label: "Bạn bè", icon: Users },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 md:gap-2 py-2 md:py-2.5 px-3 md:px-4 rounded-full text-xs md:text-sm font-bold transition-all duration-300 min-h-[44px] touch-manipulation",
                    activeTab === tab.id
                      ? "bg-black dark:bg-white text-white dark:text-black shadow-md"
                      : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/20"
                  )}
                >
                  <tab.icon size={14} className="md:w-4 md:h-4" strokeWidth={2.5} />
                  <span className="whitespace-nowrap">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* --- 3. CONTENT AREA --- */}
          <div className="min-h-[500px] pb-32 md:pb-28">
            
            {/* Posts Tab */}
            {activeTab === "posts" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Sidebar Info */}
                <div className="hidden lg:block lg:col-span-1">
                   <div className="sticky top-40 space-y-6">
                      <SpotlightCard>
                         <h3 className="font-bold text-lg text-neutral-900 dark:text-white mb-4">Tiểu sử</h3>
                         <div className="pt-2">
                            {user.bio ? (
                               <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-line text-center">
                                  {user.bio}
                               </p>
                            ) : (
                               <div className="text-center py-8">
                                  <span className="text-neutral-500 dark:text-neutral-400 text-sm block">
                                     Chưa cập nhật tiểu sử
                                  </span>
                               </div>
                            )}
                         </div>
                      </SpotlightCard>
                   </div>
                  </div>

                {/* Feed */}
                <div className="lg:col-span-2 space-y-6">
                   {postsLoading ? (
                      [1,2,3].map(i => <div key={i} className="h-64 bg-neutral-100 dark:bg-neutral-900 rounded-3xl animate-pulse"/>)
                ) : posts.length > 0 ? (
                      posts.map((post, index) => (
                         <motion.div 
                        key={post._id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.05 }}
                         >
                            <ModernPostCard post={post} user={currentUser} onUpdate={loadPosts} isSaved={savedMap[post._id]} onSavedChange={updateSavedState} hideActionsMenu={true}/>
                         </motion.div>
                      ))
                   ) : (
                      <div className="text-center py-20 bg-neutral-50 dark:bg-neutral-900 rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-700">
                         <div className="w-16 h-16 bg-neutral-200 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="text-neutral-400" />
                    </div>
                         <h3 className="font-bold text-lg">Chưa có bài viết nào</h3>
                         <p className="text-neutral-500">Người dùng này chưa đăng bài viết công khai nào.</p>
                  </div>
                )}
                </div>
              </div>
            )}

            {/* Friends Tab */}
            {activeTab === "friends" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                 {friendsLoading ? (
                    [1,2,3,4,5,6].map(i => <div key={i} className="h-24 bg-neutral-100 dark:bg-neutral-900 rounded-2xl animate-pulse"/>)
                 ) : friends.length > 0 ? (
                    friends.map(friend => {
                      // Check xem currentUser có phải là bạn của friend này không
                      const isCurrentUserFriend = currentUser && currentUserFriends.some(f => 
                        (f._id || f) === friend._id || (f._id || f)?.toString() === friend._id?.toString()
                      );
                      
                      return (
                        <SpotlightCard key={friend._id} className="p-4">
                          <div className="flex items-center gap-4 mb-3">
                             <div 
                                className="cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/user/${friend._id}`);
                                }}
                             >
                                <UserAvatar 
                                   user={friend} 
                                   size={48} 
                                   showFrame={true} 
                                   showBadge={true} 
                                />
                             </div>
                             <div className="flex-1 min-w-0">
                                <div 
                                   className="font-bold cursor-pointer hover:text-blue-500 transition-colors truncate flex items-center gap-2"
                                   onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/user/${friend._id}`);
                                   }}
                                >
                                   {friend.name}
                                   <UserTitle user={friend} />
                                </div>
                                <div className="text-xs text-neutral-500 uppercase font-bold tracking-wider flex items-center gap-2">
                                   <span className={cn(
                                      "w-2 h-2 rounded-full",
                                      friend.isOnline ? "bg-green-500" : "bg-neutral-400"
                                   )} />
                                   {friend.isOnline ? "Online" : "Offline"}
                                </div>
                            </div>
                          </div>

                          {/* Nút hành động */}
                          {currentUser && (
                             <div className="flex gap-2">
                                {/* Nút kết bạn (chỉ hiển thị nếu chưa là bạn) */}
                                {!isCurrentUserFriend ? (
                                   <button
                                      onClick={async (e) => {
                                         e.stopPropagation();
                                         try {
                                            await api("/api/friends/send-request", { method: "POST", body: { to: friend._id } });
                                            showSuccess("Đã gửi lời mời kết bạn.");
                                            // Reload currentUser friends để update status
                                            const friendsRes = await api("/api/friends/list");
                                            setCurrentUserFriends(friendsRes.friends || []);
                                         } catch (err) {
                                            showError(err.message || "Có lỗi xảy ra");
                                         }
                                      }}
                                      className="flex-1 px-4 py-2 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-black font-bold text-sm hover:scale-105 transition-transform shadow-lg flex items-center justify-center gap-2"
                                   >
                                      <UserPlus size={16} /> Kết bạn
                                   </button>
                                ) : (
                                   <button
                                      onClick={async (e) => {
                                         e.stopPropagation();
                                         if (window.confirm(`Bạn có chắc muốn hủy kết bạn với ${friend.name}?`)) {
                                            try {
                                               await api(`/api/friends/remove/${friend._id}`, { method: "DELETE" });
                                               showSuccess("Đã hủy kết bạn.");
                                               // Reload currentUser friends để update status
                                               const friendsRes = await api("/api/friends/list");
                                               setCurrentUserFriends(friendsRes.friends || []);
                                               // Reload friends của user profile
                                               await loadFriends();
                                            } catch (err) {
                                               showError(err.message || "Có lỗi xảy ra");
                                            }
                                         }
                                      }}
                                      className="flex-1 px-4 py-2 rounded-full bg-green-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-green-700 transition-colors cursor-pointer"
                                   >
                                      <UserCheck size={16} /> Đã kết bạn
                                   </button>
                                )}
                                
                                {/* Nút nhắn tin */}
                                <button
                                   onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/chat?user=${friend._id}`);
                                   }}
                                   className="px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-medium text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
                                >
                                   <MessageCircle size={16} />
                                </button>
                             </div>
                          )}
                        </SpotlightCard>
                      );
                    })
                 ) : (
                    <div className="col-span-full text-center py-10 text-neutral-500">Chưa có bạn bè công khai.</div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
      <BackToTop />
    </div>
  );
}
