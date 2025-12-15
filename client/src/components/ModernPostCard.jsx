import React, { useState, useRef, useEffect, memo, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Star, X, Smile, Image as ImageIcon, Send, Loader2, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getOptimizedImageUrl } from "../utils/imageOptimization";
import LazyImage from "./LazyImageSimple";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "../utils/cn";
import { api } from "../api";
import UserName from "./UserName";
import UserAvatar from "./UserAvatar";
import Avatar from "./Avatar";
import ReactMarkdown from "react-markdown";
import Poll from "./Poll";
import YouTubePlayer from "./YouTubePlayer";
import { useToast } from "../contexts/ToastContext";

// Mapping of emotes to corresponding GIF filenames
const emoteMap = {
  "👍": "like.gif",
  "❤️": "care.gif",
  "😂": "haha.gif",
  "😮": "wow.gif",
  "😢": "sad.gif",
  "😡": "angry.gif"
};
const emotes = Object.keys(emoteMap);

// ThumbsUp Icon Component
const ThumbsUpIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M7 10v12" />
    <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
  </svg>
);

const ModernPostCard = ({ post, user, onUpdate, isSaved: isSavedProp, onSavedChange, hideActionsMenu = false, isFirst = false }) => {
  const navigate = useNavigate();
  const { showSuccess, showError, showInfo } = useToast();

  // ==================== STATE & REFS ====================
  const [showEmotePopup, setShowEmotePopup] = useState(false);
  const emotePopupTimeout = useRef();
  const [showMainMenu, setShowMainMenu] = useState(false);
  const mainMenuRef = useRef(null);
  const mainMenuButtonRef = useRef(null);
  const [interestStatus, setInterestStatus] = useState(null);
  const [interestLoading, setInterestLoading] = useState(false);
  const [savingPost, setSavingPost] = useState(false);
  const [emotingPost, setEmotingPost] = useState(false);
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

  // Comment input states
  const [commentContent, setCommentContent] = useState("");
  const [commentImages, setCommentImages] = useState([]);
  const [showCommentEmojiPicker, setShowCommentEmojiPicker] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const commentTextareaRef = useRef(null);

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

  // Handle interest - Memoized
  const handleInterested = useCallback(async (interested) => {
    if (!user || !user._id) {
      showInfo('Vui lòng đăng nhập để sử dụng tính năng này');
      return;
    }

    if (user._id === post.author?._id) {
      showInfo('Bạn không thể đánh dấu quan tâm/không quan tâm bài viết của chính mình');
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
        showSuccess(response.message || (interested ? 'Đã đánh dấu quan tâm bài viết này' : 'Đã đánh dấu không quan tâm bài viết này'));
      }
    } catch (error) {
      console.error('Error updating interest:', error);
      showError(error.message || 'Có lỗi xảy ra khi cập nhật');
    } finally {
      setInterestLoading(false);
    }
  }, [user, post._id, post.author?._id, showSuccess, showError, showInfo]);

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
      if (showEmotePopup && !event.target.closest('.emote-picker') && !event.target.closest('.emote-trigger')) {
        if (window.innerWidth < 768) {
          setShowEmotePopup(false);
        }
      }
      if (showCommentEmojiPicker && !event.target.closest('.comment-emoji-picker-container')) {
        setShowCommentEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showMainMenu, showEmotePopup, showCommentEmojiPicker]);

  // Get the emote the current user has left
  const getUserEmote = useMemo(() => {
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

  // Count each type of emote - Memoized
  const counts = useMemo(() => {
    const counts = {};
    for (const emo of emotes) counts[emo] = 0;
    for (const e of emotesState) {
      if (counts[e.type] !== undefined) counts[e.type]++;
    }
    return counts;
  }, [emotesState]);

  const totalEmotes = useMemo(() =>
    Object.values(counts).reduce((a, b) => a + b, 0),
    [counts]
  );

  // Add/remove emote for the post - Memoized with optimistic update
  const handleEmote = useCallback(async (emoteType) => {
    // Login gate for guest users
    if (!user) {
      navigate('/login');
      return;
    }
    if (emotingPost) return;

    const hadEmote = !!uiUserEmote;
    const previousEmotes = [...emotesState];
    const previousUserEmote = uiUserEmote;

    // Optimistic update
    setEmotingPost(true);
    if (hadEmote && previousUserEmote === emoteType) {
      // Remove emote
      const newEmotes = emotesState.filter(e => {
        const userId = e.user?._id || e.user;
        const currentUserId = user?._id || user?.id;
        return !(userId && currentUserId && String(userId) === String(currentUserId));
      });
      setEmotesState(newEmotes);
      setLocalUserEmote(null);
    } else {
      // Add/change emote
      const filteredEmotes = emotesState.filter(e => {
        const userId = e.user?._id || e.user;
        const currentUserId = user?._id || user?.id;
        return !(userId && currentUserId && String(userId) === String(currentUserId));
      });
      const newEmote = {
        type: emoteType,
        user: user?._id || user?.id || user,
        createdAt: new Date().toISOString()
      };
      setEmotesState([...filteredEmotes, newEmote]);
      setLocalUserEmote(emoteType);
    }

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
      }
    } catch (e) {
      // Revert optimistic update
      setEmotesState(previousEmotes);
      setLocalUserEmote(previousUserEmote);
      showError(e?.message || 'Không thể thêm cảm xúc. Vui lòng thử lại.');
    } finally {
      setEmotingPost(false);
    }
  }, [post._id, uiUserEmote, emotesState, user, emotingPost, showError]);

  // Handle save (toggle saved state) - Memoized with optimistic update
  const handleSave = useCallback(async (e) => {
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }

    if (savingPost) return;

    // Optimistic update
    const previousSaved = saved;
    setSavingPost(true);
    setSaved(!saved);
    if (onSavedChange) onSavedChange(post._id, !saved);

    try {
      const res = await api(`/api/posts/${post._id}/save`, {
        method: 'POST',
        body: {}
      });
      const actualSaved = !!res.saved;
      setSaved(actualSaved);
      if (onSavedChange) onSavedChange(post._id, actualSaved);

      if (actualSaved) {
        showSuccess("Đã lưu bài viết");
      } else {
        showSuccess("Đã bỏ lưu bài viết");
      }
    } catch (error) {
      // Revert optimistic update
      setSaved(previousSaved);
      if (onSavedChange) onSavedChange(post._id, previousSaved);
      showError(error?.message || "Không thể lưu bài viết");
    } finally {
      setSavingPost(false);
    }
  }, [user, navigate, post._id, onSavedChange, saved, savingPost, showSuccess, showError]);

  // Format time
  const timeAgo = post.createdAt
    ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: vi })
    : "";

  // Determine media to display (coverUrl preferred, then first file) - Memoized
  const displayMedia = useMemo(() => {
    if (post.coverUrl) {
      const found = Array.isArray(post.files)
        ? post.files.find(f => f.url === post.coverUrl)
        : null;
      if (found) return { url: post.coverUrl, type: found.type, thumbnail: found.thumbnail };
      return { url: post.coverUrl, type: "image" };
    }
    if (Array.isArray(post.files) && post.files.length > 0) {
      return post.files[0];
    }
    return null;
  }, [post.coverUrl, post.files]);

  const isPrivate = post.status === 'private';

  // Emoji list for comment input
  const emojiList = [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
    '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
    '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
    '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔',
    '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵',
    '🥶', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟',
    '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨',
    '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩',
    '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️',
    '💋', '💌', '💘', '💝', '💖', '💗', '💓', '💞', '💕', '💟',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '👍', '👎',
    '👏', '🙌', '🤝', '🙏', '💪', '👋', '✌️', '🤘', '🤙', '✨'
  ];

  // Render emoji picker for comment
  const renderCommentEmojiPicker = () => {
    if (!showCommentEmojiPicker) return null;

    return (
      <div className="absolute bottom-full right-0 mb-2 w-[calc(100vw-2rem)] sm:w-[320px] max-w-[320px] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-200 comment-emoji-picker-container">
        <div className="p-2 sm:p-3 max-h-[220px] sm:max-h-[260px] overflow-y-auto">
          <div className="grid grid-cols-8 gap-0.5 sm:gap-1">
            {emojiList.map((emoji, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  setCommentContent(prev => prev + emoji);
                  setShowCommentEmojiPicker(false);
                }}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-xl sm:text-2xl hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Handle submit comment - Memoized
  const handleSubmitComment = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if ((!commentContent.trim() && commentImages.length === 0) || !user) {
      if (!user) {
        navigate('/login');
      }
      return;
    }

    setSubmittingComment(true);
    try {
      let requestBody;

      if (commentImages.length > 0) {
        // Has images - use FormData
        const formData = new FormData();
        formData.append('content', commentContent);

        commentImages.forEach((image) => {
          formData.append('files', image.file);
        });

        requestBody = formData;
      } else {
        // No images - use JSON
        requestBody = { content: commentContent };
      }

      await api(`/api/comments/post/${post._id}`, {
        method: "POST",
        body: requestBody
      });

      // Reset form
      setCommentContent("");
      commentImages.forEach(img => img.preview && URL.revokeObjectURL(img.preview));
      setCommentImages([]);

      // Update post comment count
      if (onUpdate) {
        onUpdate();
      }

      // Show success message
      showSuccess("Bình luận đã được đăng thành công!");

      // Navigate to post to see the new comment
      navigate(`/post/${post.slug || post._id}`);
    } catch (error) {
      showError(error?.message || "Lỗi khi đăng bình luận");
    } finally {
      setSubmittingComment(false);
    }
  }, [commentContent, commentImages, user, navigate, post._id, post.slug, onUpdate, showSuccess, showError]);

  return (
    <div
      onClick={() => navigate(`/post/${post.slug || post._id}`)}
      className="group relative bg-white dark:bg-[#1a1a1a] rounded-xl sm:rounded-2xl md:rounded-3xl border border-gray-100 dark:border-neutral-800/80 shadow-sm hover:shadow-lg transition-all duration-300 my-3 sm:my-4 md:my-5 sm:mx-0 cursor-pointer"
    >
      {/* 1. Header */}
      <div className="px-3 sm:px-4 md:px-5 pt-3 sm:pt-4 md:pt-5 pb-2 flex justify-between items-start">
        <div className="flex items-center gap-2 sm:gap-3" onClick={e => e.stopPropagation()}>
          <Link to={`/user/${post.author?._id}`} className="relative group/avatar flex-shrink-0">
            <div className="ring-2 ring-transparent group-hover/avatar:ring-blue-100 dark:group-hover/avatar:ring-blue-900/50 rounded-full transition-all">
              {/* Mobile: 36px, Tablet: 40px, Desktop: 44px */}
              <UserAvatar
                user={post.author}
                size={36}
                showFrame={true}
                showBadge={true}
                className="sm:hidden rounded-full"
              />
              <UserAvatar
                user={post.author}
                size={40}
                showFrame={true}
                showBadge={true}
                className="hidden sm:block md:hidden rounded-full"
              />
              <UserAvatar
                user={post.author}
                size={44}
                showFrame={true}
                showBadge={true}
                className="hidden md:block rounded-full"
              />
            </div>
          </Link>
          <div className="flex flex-col min-w-0">
            <Link
              to={`/user/${post.author?._id}`}
              className="font-bold text-[16px] sm:text-[15px] md:text-base text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-1"
              onClick={e => e.stopPropagation()}
            >
              <UserName user={post.author} maxLength={20} />
            </Link>
            {/* Mobile: more compact metadata */}
            <div className="flex items-center gap-1 sm:gap-1.5 text-[12px] sm:text-[11px] md:text-xs text-gray-400 dark:text-gray-500 font-medium">
              <span>{timeAgo}</span>
              {isPrivate && (
                <span className="flex items-center gap-0.5 bg-gray-50 dark:bg-white/5 px-1 sm:px-1.5 py-0.5 rounded text-gray-500 text-[9px] sm:text-[10px]">
                  🔒 <span className="hidden sm:inline">Riêng tư</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Menu Button */}
        {!hideActionsMenu && user && user._id && user._id !== post.author?._id && (
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button
              ref={mainMenuButtonRef}
              onClick={(e) => {
                e.stopPropagation();
                setShowMainMenu(!showMainMenu);
              }}
              className="p-2.5 sm:p-2 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 rounded-full transition-colors"
            >
              <MoreHorizontal size={18} className="sm:w-5 sm:h-5" />
            </button>
            <AnimatePresence>
              {showMainMenu && (
                <motion.div
                  ref={mainMenuRef}
                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                  className="absolute right-0 top-full mt-1 bg-white dark:bg-neutral-800 shadow-xl border border-gray-100 dark:border-neutral-700 rounded-xl py-1 z-20 w-44 sm:w-48"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInterested(true);
                      setShowMainMenu(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2",
                      interestStatus === true && "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20"
                    )}
                  >
                    <Star size={14} className={cn("sm:w-4 sm:h-4", interestStatus === true && "fill-current")} />
                    <span>Quan tâm bài viết</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInterested(false);
                      setShowMainMenu(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2",
                      interestStatus === false && "text-red-600 bg-red-50 dark:bg-red-900/20"
                    )}
                  >
                    <X size={14} className="sm:w-4 sm:h-4" />
                    <span>Không quan tâm</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* 2. Content Body */}
      <div className="px-3 sm:px-4 md:px-5 pb-2 sm:pb-3">
        {/* Title - Mobile: smaller */}
        {post.title && (
          <h3 className="text-[18px] sm:text-lg md:text-xl font-bold text-gray-900 dark:text-gray-50 mb-1.5 sm:mb-2 leading-snug line-clamp-2">
            {post.title}
          </h3>
        )}
        {/* Content - Mobile: smaller font, better line-height */}
        {post.content && (
          <div className="prose dark:prose-invert max-w-none text-[15px] sm:text-[14px] md:text-[15px] leading-[1.65] sm:leading-relaxed text-gray-700 dark:text-gray-300 font-normal prose-p:mb-2 prose-headings:mb-2 prose-headings:mt-3 prose-p:line-clamp-4 sm:prose-p:line-clamp-3">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-base sm:text-lg md:text-xl font-bold mb-2 mt-3">{children}</h1>,
                h2: ({ children }) => <h2 className="text-sm sm:text-base md:text-lg font-bold mb-2 mt-3">{children}</h2>,
                h3: ({ children }) => <h3 className="text-[13px] sm:text-sm md:text-base font-bold mb-2 mt-2">{children}</h3>,
                p: ({ children }) => <p className="line-clamp-4 sm:line-clamp-3 break-words mb-2">{children}</p>,
                code: ({ node, inline, ...props }) => {
                  if (inline) {
                    return <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-xs sm:text-sm" {...props} />;
                  }
                  return <code className="block bg-gray-100 dark:bg-gray-800 p-2 sm:p-3 rounded-lg overflow-x-auto my-2 text-xs sm:text-sm" {...props} />;
                },
                a: ({ children, href }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                    {children}
                  </a>
                ),
              }}
            >
              {post.content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {/* 3. Media - Mobile: more breathing room */}
      {displayMedia && (
        <div className="mt-1 mb-2 sm:mb-3 px-2 sm:px-3">
          <div className={cn(
            "relative w-full overflow-hidden rounded-lg sm:rounded-xl md:rounded-2xl bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-neutral-800/50",
            displayMedia.type !== 'video' && 'group/media'
          )}>
            {displayMedia.type === 'video' ? (
              <video
                src={displayMedia.url}
                className="w-full max-h-[300px] sm:max-h-[400px] md:max-h-[500px] object-contain bg-black"
                controls
                controlsList="nodownload"
                playsInline
                preload="metadata"
                poster={displayMedia.thumbnail || undefined}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <LazyImage
                src={getOptimizedImageUrl(displayMedia.url, 800)}
                alt={post.title || "Post media"}
                priority={isFirst}
                className="w-full h-auto object-cover transition-transform duration-500 group-hover/media:scale-[1.02] max-h-[300px] sm:max-h-[450px] md:max-h-[550px]"
              />
            )}
          </div>
        </div>
      )}

      {/* Poll Section */}
      {post.hasPoll && (
        <div className="px-3 sm:px-4 mb-2 sm:mb-3" onClick={e => e.stopPropagation()}>
          <Poll post={post} user={user} />
        </div>
      )}

      {/* YouTube Music Player */}
      {post.youtubeUrl && (
        <div className="px-3 sm:px-4 mb-2 sm:mb-3" onClick={e => e.stopPropagation()}>
          <YouTubePlayer key={`yt-${post._id}`} url={post.youtubeUrl} variant="full" />
        </div>
      )}

      {/* 4. Action Bar - Mobile: larger touch targets, subtle counts */}
      <div
        className="px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 flex items-center justify-between border-t border-gray-50 dark:border-white/5 mt-1 sm:mt-2"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Emote Button */}
          <div
            className="relative emote-trigger"
            onMouseEnter={() => {
              if (window.innerWidth >= 768) {
                if (emotePopupTimeout.current) clearTimeout(emotePopupTimeout.current);
                setShowEmotePopup(true);
              }
            }}
            onMouseLeave={() => {
              if (window.innerWidth >= 768) {
                emotePopupTimeout.current = setTimeout(() => setShowEmotePopup(false), 500);
              }
            }}
          >
            {/* Heart Animation */}
            <AnimatePresence>
              {showHeartAnimation && (
                <motion.div
                  key={heartAnimationKey.current}
                  initial={{ scale: 0, opacity: 0, y: 0 }}
                  animate={{ scale: 1.5, opacity: 1, y: -40 }}
                  exit={{ opacity: 0, scale: 0 }}
                  className="absolute -top-6 left-2 pointer-events-none z-50 text-red-500"
                >
                  <Heart fill="currentColor" size={24} />
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

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
              className={cn(
                "flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-full transition-all duration-200 active:scale-95 group/btn touch-manipulation",
                uiUserEmote
                  ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                  : "hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-500 dark:text-gray-400"
              )}
            >
              {uiUserEmote ? (
                <>
                  <img
                    src={`/assets/${emoteMap[uiUserEmote]}`}
                    alt={uiUserEmote}
                    className="w-5 h-5 sm:w-6 sm:h-6"
                    loading="lazy"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.nextSibling) e.target.nextSibling.style.display = 'inline';
                    }}
                  />
                  <span className="hidden text-lg sm:text-xl">{uiUserEmote}</span>
                </>
              ) : (
                <ThumbsUpIcon className="w-5 h-5 sm:w-6 sm:h-6 group-hover/btn:scale-110 transition-transform" />
              )}
              {/* Mobile: subtle count; Desktop: full text */}
              <span className="hidden sm:inline text-[13px] sm:text-sm font-semibold">
                {totalEmotes > 0 ? totalEmotes.toLocaleString() : "Thích"}
              </span>
              <span className="sm:hidden text-[13px] font-semibold opacity-80">
                {totalEmotes > 0 ? totalEmotes.toLocaleString() : ""}
              </span>
            </button>

            {/* Emote Popup */}
            {showEmotePopup && (
              <div
                className="absolute bottom-full left-0 mb-2 emote-picker bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-lg md:shadow-xl z-20 border border-gray-200 dark:border-gray-700 p-1.5 md:p-2 flex gap-0.5 md:gap-1"
                onMouseEnter={() => {
                  if (window.innerWidth >= 768) {
                    if (emotePopupTimeout.current) clearTimeout(emotePopupTimeout.current);
                  }
                }}
                onMouseLeave={() => {
                  if (window.innerWidth >= 768) {
                    emotePopupTimeout.current = setTimeout(() => setShowEmotePopup(false), 500);
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
                        "emote-btn transition-all hover:scale-110 active:scale-95 p-1 md:p-0 touch-manipulation",
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
                        width={28}
                        height={28}
                        className="w-7 h-7 md:w-8 md:h-8"
                        loading="lazy"
                        onError={(ev) => {
                          // Fallback to emoji text if GIF fails
                          ev.target.style.display = 'none';
                          if (ev.target.nextSibling) ev.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <span className="hidden w-7 h-7 md:w-8 md:h-8 items-center justify-center text-xl md:text-2xl">{e}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Comment Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/post/${post.slug || post._id}`);
            }}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-500 dark:text-gray-400 transition-colors active:scale-95 touch-manipulation"
          >
            <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
            <span className="hidden sm:inline text-[13px] sm:text-sm font-semibold">
              {post.commentCount || "Bình luận"}
            </span>
            <span className="sm:hidden text-[11px] font-semibold opacity-80">
              {(post.commentCount || 0) > 0 ? post.commentCount : ""}
            </span>
          </button>

          {/* Share Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const url = `${window.location.origin}/post/${post.slug || post._id}`;
              navigator.clipboard.writeText(url).then(() => {
                showSuccess("Đã sao chép liên kết!");
              }).catch(() => {
                showError("Không thể sao chép liên kết");
              });
            }}
            className="p-2 sm:p-2.5 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors active:scale-95 touch-manipulation"
          >
            <Share2 className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className={cn(
            "p-2 sm:p-2.5 rounded-full transition-all duration-200 active:scale-90 touch-manipulation",
            saved
              ? "text-yellow-500 bg-yellow-50 dark:bg-yellow-500/10"
              : "text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800 hover:text-yellow-500"
          )}
        >
          <Bookmark className={cn("w-5 h-5", saved && "fill-current")} strokeWidth={2.5} />
        </button>
      </div>

      {/* 5. Comment Input Section */}
      {user && (
        <div
          className="px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 border-t border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900/30"
          onClick={e => e.stopPropagation()}
        >
          {/* Image Previews */}
          {commentImages.length > 0 && (
            <div className="mb-2 ml-9 sm:ml-10 grid grid-cols-3 gap-1.5 sm:gap-2">
              {commentImages.map((img, idx) => (
                <div key={idx} className="relative group">
                  <div className="w-full rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-800 aspect-square">
                    <img src={img.preview} className="w-full h-full object-cover" alt={`Preview ${idx + 1}`} />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(img.preview);
                      setCommentImages(prev => prev.filter((_, i) => i !== idx));
                    }}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 sm:p-0.5 min-w-[24px] min-h-[24px] sm:min-w-0 sm:min-h-0 flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmitComment} className="flex items-center gap-2 sm:gap-3">
            <Avatar
              src={user?.avatarUrl}
              name={user?.name || 'User'}
              size={28}
              className="border border-gray-200 dark:border-gray-700 flex-shrink-0 sm:hidden"
            />
            <Avatar
              src={user?.avatarUrl}
              name={user?.name || 'User'}
              size={32}
              className="border border-gray-200 dark:border-gray-700 flex-shrink-0 hidden sm:block"
            />
            <div className="flex-1 flex items-center gap-1.5 sm:gap-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-full px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/50 transition-all">
              <input
                ref={commentTextareaRef}
                type="text"
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="Viết bình luận..."
                disabled={submittingComment}
                className="flex-1 bg-transparent border-none outline-none text-xs sm:text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 disabled:opacity-50"
              />
              <div className="flex items-center gap-0.5 sm:gap-1 border-l border-gray-100 dark:border-neutral-700 pl-1.5 sm:pl-2">
                <label className="p-1 sm:p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors cursor-pointer" title="Thêm ảnh">
                  <ImageIcon size={16} className="sm:w-[18px] sm:h-[18px] text-gray-400 hover:text-blue-500" />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;

                      const newImages = files.slice(0, 3 - commentImages.length).map(file => ({
                        file,
                        preview: URL.createObjectURL(file),
                        id: Math.random().toString(36).substr(2, 9)
                      }));

                      setCommentImages(prev => [...prev, ...newImages]);
                      if (e.target) e.target.value = "";
                    }}
                    className="hidden"
                  />
                </label>
                <div className="comment-emoji-picker-container relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowCommentEmojiPicker(!showCommentEmojiPicker);
                    }}
                    className={cn(
                      "flex items-center justify-center p-2 sm:p-1.5 min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 sm:hover:bg-gray-100 dark:sm:hover:bg-gray-700 rounded-full sm:rounded-full transition-colors touch-manipulation",
                      showCommentEmojiPicker && "text-yellow-500"
                    )}
                    title="Thêm emoji"
                  >
                    <Smile size={18} className={cn("sm:w-[18px] sm:h-[18px] text-gray-400", showCommentEmojiPicker && "text-yellow-500")} />
                  </button>
                  {renderCommentEmojiPicker()}
                </div>
                <button
                  type="submit"
                  disabled={(!commentContent.trim() && commentImages.length === 0) || submittingComment}
                  className="p-2 sm:p-1.5 min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center touch-manipulation"
                  title="Gửi"
                >
                  {submittingComment ? (
                    <Loader2 size={16} className="sm:w-[18px] sm:h-[18px] text-blue-500 animate-spin" />
                  ) : (
                    <Send size={16} className="sm:w-[18px] sm:h-[18px] text-blue-500" />
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default memo(ModernPostCard);
