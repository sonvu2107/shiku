import React, { useState, useRef, useEffect, memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, ThumbsUp, Plus, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getOptimizedImageUrl } from "../utils/imageOptimization";
import LazyImage from "./LazyImageSimple";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "../utils/cn";
import { api } from "../api";
import UserName from "./UserName";
import VerifiedBadge from "./VerifiedBadge";

// Mapping emotes với file GIF tương ứng
const emoteMap = {
  "👍": "like.gif",
  "❤️": "care.gif", 
  "😂": "haha.gif",
  "😮": "wow.gif",
  "😢": "sad.gif",
  "😡": "angry.gif"
};
const emotes = Object.keys(emoteMap);

const ModernPostCard = ({ post, user, onUpdate, isSaved: isSavedProp, onSavedChange }) => {
  const navigate = useNavigate();
  
  // ==================== STATE & REFS ====================
  const [showEmotePopup, setShowEmotePopup] = useState(false);
  const emotePopupTimeout = useRef();
  const [showMainMenu, setShowMainMenu] = useState(false);
  const mainMenuRef = useRef(null);
  const mainMenuButtonRef = useRef(null);
  const [interestStatus, setInterestStatus] = useState(null);
  const [interestLoading, setInterestLoading] = useState(false);
  const [emotesState, setEmotesState] = useState(() => {
    if (post.emotes && Array.isArray(post.emotes)) {
      return post.emotes.map(e => ({
        type: e.type,
        user: e.user || null,
        createdAt: e.createdAt || null
      })).filter(Boolean);
    }
    return [];
  });
  const [saved, setSaved] = useState(isSavedProp || false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const heartAnimationKey = useRef(0);
  const [localUserEmote, setLocalUserEmote] = useState(null);

  // Sync emotesState when post.emotes changes
  useEffect(() => {
    if (post.emotes) {
      const normalizedEmotes = Array.isArray(post.emotes) 
        ? post.emotes.map(e => {
            if (e && e.type) {
              return {
                type: e.type,
                user: e.user || null,
                createdAt: e.createdAt || null
              };
            }
            return null;
          }).filter(Boolean)
        : [];
      setEmotesState(normalizedEmotes);
    } else {
      setEmotesState([]);
    }
  }, [post.emotes]);

  // Sync saved state
  useEffect(() => {
    if (typeof isSavedProp === 'boolean') {
      setSaved(isSavedProp);
    }
  }, [isSavedProp]);

  // Fetch interest status on mount
  useEffect(() => {
    if (!user || !user._id || user._id === post.author?._id) {
      return;
    }

    let active = true;
    (async () => {
      try {
        const res = await api(`/api/posts/${post._id}/interest-status`);
        if (active && res !== null && res !== undefined) {
          setInterestStatus(res.interested);
        }
      } catch (_) {
        // Ignore errors - status is optional
      }
    })();
    return () => {
      active = false;
    };
  }, [post._id, user, post.author?._id]);

  // Handle interest
  const handleInterested = async (interested) => {
    if (!user || !user._id) {
      alert('Vui lòng đăng nhập để sử dụng tính năng này');
      return;
    }

    if (user._id === post.author?._id) {
      alert('Bạn không thể đánh dấu quan tâm/không quan tâm bài viết của chính mình');
      return;
    }

    setInterestLoading(true);
    try {
      const response = await api(`/api/posts/${post._id}/interest`, {
        method: 'POST',
        body: { interested }
      });

      if (response.success) {
        setInterestStatus(interested);
        alert(response.message || (interested ? 'Đã đánh dấu quan tâm bài viết này' : 'Đã đánh dấu không quan tâm bài viết này'));
      }
    } catch (error) {
      console.error('Error updating interest:', error);
      alert(error.message || 'Có lỗi xảy ra khi cập nhật');
    } finally {
      setInterestLoading(false);
    }
  };

  // Close main menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMainMenu && mainMenuRef.current) {
        const insideMain = mainMenuRef.current.contains(event.target);
        const onMainButton = mainMenuButtonRef.current && mainMenuButtonRef.current.contains(event.target);
        if (!insideMain && !onMainButton) {
          setShowMainMenu(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showMainMenu]);

  // Lấy cảm xúc user đã thả
  const getUserEmote = React.useMemo(() => {
    if (!user || typeof user !== 'object') return null;
    const currentUserRawId = user._id ?? user.id;
    if (!currentUserRawId) return null;
    if (!emotesState || !Array.isArray(emotesState) || emotesState.length === 0) return null;
    
    let currentUserId;
    if (typeof currentUserRawId === 'string') {
      currentUserId = currentUserRawId;
    } else if (currentUserRawId && currentUserRawId.toString) {
      currentUserId = currentUserRawId.toString();
    } else {
      return null;
    }
    
    const userEmote = emotesState.find(e => {
      if (!e || !e.user || !e.type) return false;
      
      let userId = null;
      if (typeof e.user === 'string') {
        userId = e.user;
      } else if (typeof e.user === 'object' && e.user !== null) {
        if (e.user._id) {
          if (typeof e.user._id === 'string') {
            userId = e.user._id;
          } else if (e.user._id.toString) {
            userId = e.user._id.toString();
          }
        } else if (e.user.toString && typeof e.user.toString === 'function') {
          userId = e.user.toString();
        } else {
          userId = e.user.id || (e.user.toString ? e.user.toString() : null);
        }
      }
      
      if (!userId) return false;
      try {
        return String(userId) === String(currentUserId);
      } catch (error) {
        return false;
      }
    });
    
    return userEmote && userEmote.type ? userEmote.type : null;
  }, [user, emotesState]);

  const userEmote = getUserEmote;
  const uiUserEmote = localUserEmote !== null ? localUserEmote : userEmote;

  // Đếm số lượng từng loại emote
  const countEmotes = () => {
    const counts = {};
    for (const emo of emotes) counts[emo] = 0;
    for (const e of emotesState) {
      if (counts[e.type] !== undefined) counts[e.type]++;
    }
    return counts;
  };
  
  const counts = countEmotes();
  const totalEmotes = Object.values(counts).reduce((a, b) => a + b, 0);

  // Thêm/xóa emote cho bài viết
  const handleEmote = async (emoteType) => {
    const hadEmote = !!uiUserEmote;
    if ((emoteType === '👍' || emoteType === '❤️') && !hadEmote) {
      heartAnimationKey.current += 1;
      setShowHeartAnimation(true);
      setTimeout(() => setShowHeartAnimation(false), 1000);
    }
    
    try {
      const res = await api(`/api/posts/${post._id}/emote`, {
        method: "POST",
        body: { emote: emoteType }
      });
      
      if (res && res.emotes) {
        const normalizedEmotes = Array.isArray(res.emotes) 
          ? res.emotes.map(e => ({
              type: e.type,
              user: e.user || null,
              createdAt: e.createdAt || null
            })).filter(Boolean)
          : [];
        setEmotesState(normalizedEmotes);
        setShowEmotePopup(false);
        if (emotePopupTimeout.current) {
          clearTimeout(emotePopupTimeout.current);
        }
        // Không gọi onUpdate để tránh reload
      }
    } catch (e) {
      alert(e?.message || 'Không thể thêm cảm xúc. Vui lòng thử lại.');
    }
  };

  // Xử lý save
  const handleSave = async (e) => {
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const res = await api(`/api/posts/${post._id}/save`, {
        method: 'POST',
        body: {}
      });
      const actualSaved = !!res.saved;
      setSaved(actualSaved);
      if (onSavedChange) onSavedChange(post._id, actualSaved);
    } catch (error) {
      alert(error?.message || "Không thể lưu bài viết");
    }
  };

  // Format thời gian
  const timeAgo = post.createdAt 
    ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: vi }) 
    : "";

  // Lấy media để hiển thị
  const getDisplayMedia = () => {
    if (post.coverUrl) {
      const found = Array.isArray(post.files)
        ? post.files.find(f => f.url === post.coverUrl)
        : null;
      if (found) return { url: post.coverUrl, type: found.type };
      return { url: post.coverUrl, type: "image" };
    }
    if (Array.isArray(post.files) && post.files.length > 0) {
      return post.files[0];
    }
    return null;
  };

  const displayMedia = getDisplayMedia();
  const statusLabel = post.status === 'private' ? 'Riêng tư' : 'Công khai';

  // Close emote popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showEmotePopup && !event.target.closest('.emote-picker') && !event.target.closest('.emote-trigger')) {
        if (window.innerWidth < 768) {
          setShowEmotePopup(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmotePopup]);

  return (
    <div 
      onClick={() => navigate(`/post/${post.slug || post._id}`)}
      className="group relative bg-white dark:bg-[#111] rounded-[32px] px-5 pt-4 pb-6 mb-6 cursor-pointer
      shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]
      hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_12px_40px_rgb(0,0,0,0.6)]
      transition-all duration-500 hover:-translate-y-1 border border-transparent dark:border-white/5"
    >
      {/* 1. Header: User Info */}
      <div className="flex justify-between items-start mb-3 px-1">
        <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
          <Link to={`/user/${post.author?._id}`} className="relative">
            <div className="absolute -inset-1 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-500" />
            <img
              src={getOptimizedImageUrl(post.author?.avatarUrl, 100) || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author?.name || 'User')}&length=2&background=cccccc&color=222222`}
              alt={post.author?.name}
              className="relative w-9 h-9 rounded-full object-cover border-2 border-white dark:border-[#111]"
            />
          </Link>
          <div>
            <Link 
              to={`/user/${post.author?._id}`} 
              className="font-bold text-base text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5"
              onClick={e => e.stopPropagation()}
            >
              <UserName user={post.author} maxLength={20} />
              {post.author?.role === 'admin' && <VerifiedBadge user={post.author} />}
            </Link>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5 mt-0.5">
              {timeAgo && <span>{timeAgo}</span>}
              {timeAgo && <span>•</span>}
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                post.status === 'private' 
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400" 
                  : "bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
              )}>
                {statusLabel}
              </span>
            </div>
          </div>
        </div>
        <div className="relative z-10">
          <button 
            ref={mainMenuButtonRef}
            type="button"
            className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowMainMenu(prev => !prev);
            }}
            title="Tùy chọn"
            aria-label="Tùy chọn"
            aria-expanded={showMainMenu}
            aria-haspopup="true"
            tabIndex={0}
          >
            <MoreHorizontal size={20} />
          </button>

          {/* Dropdown menu */}
          {showMainMenu && (
            <div
              ref={mainMenuRef}
              className="absolute right-0 top-full mt-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg shadow-lg dark:shadow-2xl z-[100] min-w-[240px] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="py-1">
                {/* Chỉ hiển thị nút quan tâm/không quan tâm khi user đã đăng nhập và không phải tác giả */}
                {user && user._id && user._id !== post.author?._id && (
                  <>
                    {/* Quan tâm */}
                    <button
                      type="button"
                      className={cn(
                        "w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors flex items-start gap-3 group",
                        interestStatus === true && "bg-blue-50 dark:bg-blue-900/20",
                        interestLoading && "opacity-50 cursor-not-allowed"
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!interestLoading) {
                          setShowMainMenu(false);
                          handleInterested(true);
                        }
                      }}
                      disabled={interestLoading}
                    >
                      <div className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center transition-colors",
                        interestStatus === true 
                          ? "bg-blue-100 dark:bg-blue-800 border-blue-300 dark:border-blue-600" 
                          : "bg-gray-100 dark:bg-neutral-700 border-gray-200 dark:border-neutral-600 group-hover:bg-gray-200 dark:group-hover:bg-neutral-600"
                      )}>
                        <Plus size={16} className={interestStatus === true ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          "font-semibold text-sm mb-0.5",
                          interestStatus === true 
                            ? "text-blue-600 dark:text-blue-400" 
                            : "text-gray-900 dark:text-white"
                        )}>
                          Quan tâm
                          {interestStatus === true && <span className="ml-2 text-xs">✓</span>}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                          Bạn sẽ nhìn thấy nhiều bài viết tương tự hơn.
                        </div>
                      </div>
                    </button>
                    
                    {/* Không quan tâm */}
                    <button
                      type="button"
                      className={cn(
                        "w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors flex items-start gap-3 group border-t border-gray-100 dark:border-neutral-700",
                        interestStatus === false && "bg-red-50 dark:bg-red-900/20",
                        interestLoading && "opacity-50 cursor-not-allowed"
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!interestLoading) {
                          setShowMainMenu(false);
                          handleInterested(false);
                        }
                      }}
                      disabled={interestLoading}
                    >
                      <div className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center transition-colors",
                        interestStatus === false 
                          ? "bg-red-100 dark:bg-red-800 border-red-300 dark:border-red-600" 
                          : "bg-gray-100 dark:bg-neutral-700 border-gray-200 dark:border-neutral-600 group-hover:bg-gray-200 dark:group-hover:bg-neutral-600"
                      )}>
                        <Minus size={16} className={interestStatus === false ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-300"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          "font-semibold text-sm mb-0.5",
                          interestStatus === false 
                            ? "text-red-600 dark:text-red-400" 
                            : "text-gray-900 dark:text-white"
                        )}>
                          Không quan tâm
                          {interestStatus === false && <span className="ml-2 text-xs">✓</span>}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                          Bạn sẽ nhìn thấy ít bài viết tương tự hơn.
                        </div>
                      </div>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Title */}
      {post.title && (
        <h3 className="px-1 mb-3 text-lg font-bold text-gray-900 dark:text-white leading-tight line-clamp-2">
          {post.title}
        </h3>
      )}

      {/* 3. Content */}
      {post.content && (
        <p className="px-1 mb-4 text-[15px] text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-3">
          {post.content}
        </p>
      )}

      {/* 4. Media (Tràn viền bo góc) */}
      {displayMedia && (
        <div className="rounded-3xl overflow-hidden bg-gray-100 dark:bg-black mb-4 relative group/media">
          {displayMedia.type === 'video' ? (
            <video 
              src={displayMedia.url} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover/media:scale-105"
              controls={false}
              muted
              playsInline
            />
          ) : (
            <LazyImage
              src={getOptimizedImageUrl(displayMedia.url, 800)}
              alt={post.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover/media:scale-105"
              style={{ aspectRatio: '16/9', minHeight: '300px' }}
            />
          )}
        </div>
      )}

      {/* 5. Action Bar (Floating Style) */}
      <div className="flex items-center justify-between px-1" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          {/* Emote/Like Button với Popup */}
          <div
            className="relative emote-trigger"
            role="button"
            tabIndex={0}
            aria-label="Thả cảm xúc"
            title={uiUserEmote ? "Bỏ cảm xúc" : "Thả cảm xúc"}
            onMouseEnter={() => {
              if (window.innerWidth >= 768) {
                if (emotePopupTimeout.current) clearTimeout(emotePopupTimeout.current);
                setShowEmotePopup(true);
              }
            }}
            onMouseLeave={() => {
              if (window.innerWidth >= 768) {
                emotePopupTimeout.current = setTimeout(() => setShowEmotePopup(false), 1200);
              }
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (e.target.closest('.emote-picker')) {
                return;
              }
              
              if (window.innerWidth < 768) {
                setShowEmotePopup(prev => !prev);
                return;
              }

              if (uiUserEmote) {
                setLocalUserEmote(null);
                handleEmote(uiUserEmote);
              } else {
                setLocalUserEmote('👍');
                handleEmote('👍');
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (uiUserEmote) {
                  setLocalUserEmote(null);
                  handleEmote(uiUserEmote);
                } else {
                  setLocalUserEmote('👍');
                  handleEmote('👍');
                }
              }
            }}
          >
            {/* Heart Animation */}
            <AnimatePresence>
              {showHeartAnimation && (
                <motion.div
                  key={heartAnimationKey.current}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ 
                    scale: [0, 1.3, 1],
                    opacity: [0, 1, 1, 0],
                    y: [0, -30, -50],
                    rotate: [0, -10, 10, 0]
                  }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ 
                    duration: 0.8,
                    ease: "easeOut"
                  }}
                  className="absolute -top-8 left-1/2 -translate-x-1/2 pointer-events-none z-50"
                >
                  <Heart 
                    size={32} 
                    className="text-red-500 fill-red-500 drop-shadow-lg"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <button
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-full transition-all active:scale-90",
                uiUserEmote 
                  ? "bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-500" 
                  : "hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400"
              )}
            >
              {uiUserEmote ? (
                <>
                  <img 
                    src={`/assets/${emoteMap[uiUserEmote]}`} 
                    alt={uiUserEmote} 
                    width={22}
                    height={22}
                    className="w-[22px] h-[22px]"
                    loading="lazy"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <span className="font-bold text-sm">
                    {uiUserEmote === '👍' && 'Đã thích'}
                    {uiUserEmote === '❤️' && 'Yêu thích'}
                    {uiUserEmote === '😂' && 'Haha'}
                    {uiUserEmote === '😮' && 'Wow'}
                    {uiUserEmote === '😢' && 'Buồn'}
                    {uiUserEmote === '😡' && 'Phẫn nộ'}
                    {totalEmotes > 0 && ` • ${totalEmotes.toLocaleString()}`}
                  </span>
                </>
              ) : (
                <>
                  <ThumbsUp size={22} strokeWidth={2} />
                  <span className="font-bold text-sm">
                    {totalEmotes > 0 ? totalEmotes.toLocaleString() : 'Thích'}
                  </span>
                </>
              )}
            </button>

            {/* Emote Popup */}
            {showEmotePopup && (
              <div
                className="absolute bottom-full left-0 mb-2 emote-picker bg-white dark:bg-gray-800 rounded-xl shadow-lg z-20 border border-gray-200 dark:border-gray-700 p-2 flex gap-1"
                onMouseEnter={() => {
                  if (window.innerWidth >= 768) {
                    if (emotePopupTimeout.current) clearTimeout(emotePopupTimeout.current);
                  }
                }}
                onMouseLeave={() => {
                  if (window.innerWidth >= 768) {
                    emotePopupTimeout.current = setTimeout(() => setShowEmotePopup(false), 1200);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {emotes.map(e => {
                  const isActive = uiUserEmote === e;
                  return (
                    <button 
                      key={e} 
                      className={cn(
                        "emote-btn transition-all hover:scale-110 active:scale-95",
                        isActive ? 'opacity-100 ring-2 ring-blue-500 rounded-full' : 'opacity-90'
                      )}
                      type="button" 
                      onClick={(event) => { 
                        event.stopPropagation();
                        setLocalUserEmote(prev => prev === e ? null : e);
                        handleEmote(e);
                        if (window.innerWidth < 768) {
                          setTimeout(() => setShowEmotePopup(false), 100);
                        }
                      }}
                      onMouseDown={(e) => e.preventDefault()}
                      title={isActive ? `Bỏ cảm xúc ${e}` : `Thả cảm xúc ${e}`}
                    >
                      <img 
                        src={`/assets/${emoteMap[e]}`} 
                        alt={e} 
                        width={32}
                        height={32}
                        className="w-8 h-8"
                        loading="lazy"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Comment */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/post/${post.slug || post._id}`);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/20 dark:hover:text-blue-400 text-gray-600 dark:text-gray-400 transition-all active:scale-90"
          >
            <MessageCircle size={22} />
            <span className="font-bold text-sm">{post.commentCount || 0}</span>
          </button>

          {/* Share */}
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const url = `${window.location.origin}/post/${post.slug || post._id}`;
              navigator.clipboard.writeText(url).then(() => {
                alert("Đã sao chép liên kết!");
              }).catch(() => {
                alert("Không thể sao chép liên kết");
              });
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-500/20 dark:hover:text-green-400 text-gray-600 dark:text-gray-400 transition-all active:scale-90"
          >
            <Share2 size={22} />
          </button>
        </div>

        <button 
          onClick={handleSave}
          className={cn(
            "p-3 rounded-full transition-all active:scale-90",
            saved
              ? "bg-yellow-50 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-500"
              : "hover:bg-yellow-50 hover:text-yellow-600 dark:hover:bg-yellow-500/20 dark:hover:text-yellow-500 text-gray-400"
          )}
        >
          <Bookmark size={22} className={saved ? "fill-current" : ""} strokeWidth={saved ? 0 : 2} />
        </button>
      </div>
    </div>
  );
};

export default memo(ModernPostCard);
