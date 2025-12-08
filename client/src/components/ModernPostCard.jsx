import React, { useState, useRef, useEffect, memo, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, ThumbsUp, Plus, Minus, Star, X, Smile, Image as ImageIcon, Send, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getOptimizedImageUrl } from "../utils/imageOptimization";
import LazyImage from "./LazyImageSimple";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "../utils/cn";
import { api } from "../api";
import UserName from "./UserName";
import UserAvatar from "./UserAvatar";
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

const ModernPostCard = ({ post, user, onUpdate, isSaved: isSavedProp, onSavedChange, hideActionsMenu = false }) => {
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
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showMainMenu]);

  // Get the emote the current user has left
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
        // Không gọi onUpdate để tránh reload
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
      if (found) return { url: post.coverUrl, type: found.type };
      return { url: post.coverUrl, type: "image" };
    }
    if (Array.isArray(post.files) && post.files.length > 0) {
      return post.files[0];
    }
    return null;
  }, [post.coverUrl, post.files]);
  const statusLabel = post.status === 'private' ? 'Riêng tư' : 'Công khai';

  // Close emote popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showEmotePopup && !event.target.closest('.emote-picker') && !event.target.closest('.emote-trigger')) {
        if (window.innerWidth < 768) {
          setShowEmotePopup(false);
        }
      }
      if (showCommentEmojiPicker && !event.target.closest('.comment-emoji-picker-container')) {
        setShowCommentEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmotePopup, showCommentEmojiPicker]);

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
    '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸',
    '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '🙈', '🙉', '🙊',
    '💋', '💌', '💘', '💝', '💖', '💗', '💓', '💞', '💕', '💟',
    '❣️', '💔', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
    '🤎', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💣', '💬',
    '👁️‍🗨️', '🗨️', '🗯️', '💭', '💤', '👋', '🤚', '🖐️', '✋', '🖖',
    '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
    '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜',
    '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿',
    '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴',
    '👀', '👁️', '👅', '👄', '💋', '🩸'
  ];

  // Render emoji picker for comment
  const renderCommentEmojiPicker = () => {
    if (!showCommentEmojiPicker) return null;

    return (
      <div className="absolute bottom-full right-0 mb-2 w-[calc(100vw-2rem)] sm:w-[360px] max-w-[360px] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-200 comment-emoji-picker-container">
        <div className="p-3 max-h-[280px] overflow-y-auto">
          <div className="grid grid-cols-8 gap-1">
            {emojiList.map((emoji, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  setCommentContent(prev => prev + emoji);
                  setShowCommentEmojiPicker(false);
                }}
                className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
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
      className="group relative bg-white dark:bg-[#111] rounded-2xl md:rounded-[32px] px-3 md:px-5 pt-3 md:pt-4 pb-4 md:pb-6 mb-4 md:mb-6 cursor-pointer
      shadow-[0_4px_20px_rgb(0,0,0,0.04)] md:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgb(0,0,0,0.3)] dark:md:shadow-[0_8px_30px_rgb(0,0,0,0.4)]
      hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] md:hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)] dark:md:hover:shadow-[0_12px_40px_rgb(0,0,0,0.6)]
      transition-all duration-300 ease-out md:hover:-translate-y-1 md:hover:scale-[1.01] border border-transparent dark:border-white/5 active:scale-[0.99]"
    >
      {/* 1. Header: User Info */}
      <div className="flex justify-between items-start mb-2 md:mb-3">
        <div className="flex items-center gap-2 md:gap-3" onClick={e => e.stopPropagation()}>
          <Link to={`/user/${post.author?._id}`} className="relative flex-shrink-0">
            <UserAvatar
              user={post.author}
              size={36}
              showFrame={true}
              showBadge={true}
              className="md:hidden"
            />
            <UserAvatar
              user={post.author}
              size={40}
              showFrame={true}
              showBadge={true}
              className="hidden md:block"
            />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to={`/user/${post.author?._id}`}
                className="font-bold text-sm md:text-base text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5 truncate"
                onClick={e => e.stopPropagation()}
              >
                <UserName user={post.author} maxLength={20} />
              </Link>
            </div>
            <div className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1 md:gap-1.5 mt-0.5">
              {timeAgo && <span className="truncate max-w-[120px] md:max-w-none">{timeAgo}</span>}
              {timeAgo && <span>•</span>}
              <span className={cn(
                "px-1.5 md:px-2 py-0.5 rounded-full text-[9px] md:text-[10px] font-semibold flex-shrink-0",
                post.status === 'private'
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                  : "bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
              )}>
                {statusLabel}
              </span>
            </div>
          </div>
        </div>
        {!hideActionsMenu && user && user._id && user._id !== post.author?._id && (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleInterested(true);
              }}
              className={cn(
                "w-9 h-9 flex items-center justify-center rounded-full transition-colors",
                interestStatus === true
                  ? "text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
                  : "text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
              )}
              title="Quan tâm"
            >
              <Star size={18} className={cn(interestStatus === true && "fill-current")} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleInterested(false);
              }}
              className={cn(
                "w-9 h-9 flex items-center justify-center rounded-full transition-colors",
                interestStatus === false
                  ? "text-red-500 bg-red-50 dark:bg-red-900/20"
                  : "text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
              )}
              title="Không quan tâm"
            >
              <X size={18} />
            </button>
          </div>
        )}
      </div>

      {/* 2. Title */}
      {post.title && (
        <h3 className="mb-2 md:mb-3 text-base md:text-lg font-bold text-gray-900 dark:text-white leading-tight line-clamp-2 break-words">
          {post.title}
        </h3>
      )}

      {/* 3. Content */}
      {post.content && (
        <div className="mb-3 md:mb-4">
          <div className="prose dark:prose-invert max-w-none text-sm md:text-[15px] text-gray-700 dark:text-gray-300 leading-relaxed prose-p:mb-2 prose-headings:mb-2 prose-headings:mt-3 prose-headings:text-base md:prose-headings:text-lg prose-p:line-clamp-3 prose-p:break-words prose-strong:font-bold prose-em:italic prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800 prose-pre:p-3 prose-pre:rounded-lg prose-pre:overflow-x-auto prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-ul:list-disc prose-ol:list-decimal prose-li:ml-4 prose-blockquote:border-l-4 prose-blockquote:border-gray-300 dark:prose-blockquote:border-gray-700 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400">
            <ReactMarkdown
              components={{
                // Limit heading sizes for preview
                h1: ({ children }) => <h1 className="text-lg md:text-xl font-bold mb-2 mt-3">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base md:text-lg font-bold mb-2 mt-3">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm md:text-base font-bold mb-2 mt-2">{children}</h3>,
                // Limit paragraphs to 3 lines
                p: ({ children }) => <p className="line-clamp-3 break-words mb-2">{children}</p>,
                // Style code blocks
                code: ({ node, inline, ...props }) => {
                  if (inline) {
                    return <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm" {...props} />;
                  }
                  return <code className="block bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto my-2" {...props} />;
                },
                // Style links
                a: ({ children, href }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                    {children}
                  </a>
                ),
                // Limit list items
                li: ({ children }) => <li className="ml-4">{children}</li>,
                // Style blockquotes
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-gray-300 dark:border-gray-700 pl-4 my-2 italic text-gray-600 dark:text-gray-400">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {post.content}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* 4. Media */}
      {displayMedia && (
        <div className={`rounded-xl md:rounded-3xl overflow-hidden bg-gray-100 dark:bg-black mb-3 md:mb-4 relative ${displayMedia.type !== 'video' ? 'group/media' : ''}`}>
          {displayMedia.type === 'video' ? (
            <video
              src={displayMedia.url}
              className="w-full max-h-[500px] object-contain bg-black"
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
              alt={post.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover/media:scale-105"
              style={{ aspectRatio: '16/9', minHeight: '200px' }}
            />
          )}
        </div>
      )}

      {/* Poll Section */}
      {post.hasPoll && (
        <div className="mb-3 md:mb-4" onClick={e => e.stopPropagation()}>
          <Poll post={post} user={user} />
        </div>
      )}

      {/* YouTube Music Player */}
      {post.youtubeUrl && (
        <div className="mb-3 md:mb-4" onClick={e => e.stopPropagation()}>
          <YouTubePlayer key={`yt-${post._id}`} url={post.youtubeUrl} variant="full" />
        </div>
      )}

      {/* 5. Action Bar (Floating Style) */}
      <div className="flex items-center justify-between" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-0.5 md:gap-1">
          {/* Emote/Like Button with Popup */}
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
                "flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-2 md:py-2.5 rounded-full transition-all active:scale-90 touch-manipulation",
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
                    width={20}
                    height={20}
                    className="w-5 h-5 md:w-[22px] md:h-[22px]"
                    loading="lazy"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <span className="font-bold text-xs md:text-sm">
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
                  <ThumbsUp size={20} strokeWidth={2} className="md:w-[22px] md:h-[22px]" />
                  <span className="font-bold text-xs md:text-sm">
                    {totalEmotes > 0 ? totalEmotes.toLocaleString() : 'Thích'}
                  </span>
                </>
              )}
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
            className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-2 md:py-2.5 rounded-full hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/20 dark:hover:text-blue-400 text-gray-600 dark:text-gray-400 transition-all active:scale-90 touch-manipulation"
          >
            <MessageCircle size={20} className="md:w-[22px] md:h-[22px]" />
            <span className="font-bold text-xs md:text-sm">{post.commentCount || 0}</span>
          </button>

          {/* Share */}
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
            className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-2 md:py-2.5 rounded-full hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-500/20 dark:hover:text-green-400 text-gray-600 dark:text-gray-400 transition-all active:scale-90 touch-manipulation"
          >
            <Share2 size={20} className="md:w-[22px] md:h-[22px]" />
          </button>
        </div>

        <button
          onClick={handleSave}
          className={cn(
            "p-2 md:p-3 rounded-full transition-all active:scale-90 touch-manipulation",
            saved
              ? "bg-yellow-50 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-500"
              : "hover:bg-yellow-50 hover:text-yellow-600 dark:hover:bg-yellow-500/20 dark:hover:text-yellow-500 text-gray-400"
          )}
        >
          <Bookmark size={20} className={cn("md:w-[22px] md:h-[22px]", saved ? "fill-current" : "")} strokeWidth={saved ? 0 : 2} />
        </button>
      </div>

      {/* Comment Input Section */}
      {user && (
        <div className="mt-2 md:mt-3 pt-2 md:pt-3 px-3 md:px-0 border-t border-gray-100 dark:border-gray-800" onClick={e => e.stopPropagation()}>
          {/* Image Previews */}
          {commentImages.length > 0 && (
            <div className="mb-2 ml-10 grid grid-cols-3 gap-2">
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
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmitComment} className="flex items-center gap-2">
            <img
              src={getOptimizedImageUrl(user?.avatarUrl, 100) || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&length=2&background=cccccc&color=222222`}
              alt={user?.name}
              className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700 flex-shrink-0"
            />
            <div className="flex-1 flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full px-3 md:px-4 py-1.5 md:py-2 relative">
              <input
                ref={commentTextareaRef}
                type="text"
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="Nói lên suy nghĩ của bạn..."
                disabled={submittingComment}
                className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50"
              />
              <label className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors cursor-pointer" title="Thêm ảnh">
                <ImageIcon size={18} className="text-gray-500 dark:text-gray-400" />
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
                    "p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors",
                    showCommentEmojiPicker && "text-blue-500"
                  )}
                  title="Thêm emoji"
                >
                  <Smile size={18} className={cn("text-gray-500 dark:text-gray-400", showCommentEmojiPicker && "text-blue-500")} />
                </button>
                {renderCommentEmojiPicker()}
              </div>
              <button
                type="submit"
                disabled={(!commentContent.trim() && commentImages.length === 0) || submittingComment}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                title="Gửi"
              >
                {submittingComment ? (
                  <Loader2 size={18} className="text-blue-500 animate-spin" />
                ) : (
                  <Send size={18} className="text-blue-500" />
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default memo(ModernPostCard);
