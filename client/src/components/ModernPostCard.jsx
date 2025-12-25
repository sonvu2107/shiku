import React, { useState, useRef, useEffect, memo, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Star, X, Smile, Image as ImageIcon, Send, Loader2, Play, Pin, Flag } from "lucide-react";
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
import MarkdownWithMentions from "./MarkdownWithMentions";
import Poll from "./Poll";
import YouTubePlayer from "./YouTubePlayer";
import { useToast } from "../contexts/ToastContext";
import ContentWithSeeMore from "./ContentWithSeeMore";
import PostDetailModal from "./PostDetailModal";
import ReportModal from "./ReportModal";

// Emote system removed - using upvote system instead

const ModernPostCard = ({ post, user, onUpdate, isSaved: isSavedProp, onSavedChange, hideActionsMenu = false, isFirst = false }) => {
  const navigate = useNavigate();
  const { showSuccess, showError, showInfo } = useToast();

  // ==================== STATE & REFS ====================
  const [showMainMenu, setShowMainMenu] = useState(false);
  const mainMenuRef = useRef(null);
  const mainMenuButtonRef = useRef(null);
  const [interestStatus, setInterestStatus] = useState(null);
  const [interestLoading, setInterestLoading] = useState(false);
  const [savingPost, setSavingPost] = useState(false);
  const [saved, setSaved] = useState(isSavedProp || false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const heartAnimationKey = useRef(0);

  // Upvote system state
  const [upvoted, setUpvoted] = useState(() => {
    const userId = user?._id || user?.id;
    if (!userId || !Array.isArray(post.upvotes) || post.upvotes.length === 0) return false;
    const userIdStr = String(userId);
    return post.upvotes.some(id => {
      let idStr = '';
      if (typeof id === 'string') idStr = id;
      else if (id?.$oid) idStr = id.$oid;
      else if (id?._id) idStr = String(id._id);
      else if (id?.toString) idStr = id.toString();
      return idStr === userIdStr;
    });
  });
  const [upvoteCount, setUpvoteCount] = useState(post.upvoteCount ?? post.emotes?.length ?? 0);
  const [upvoting, setUpvoting] = useState(false);

  // Comment input states
  const [commentContent, setCommentContent] = useState("");
  const [commentImages, setCommentImages] = useState([]);
  const [showCommentEmojiPicker, setShowCommentEmojiPicker] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const commentTextareaRef = useRef(null);

  // Post Detail Modal state
  const [showPostModal, setShowPostModal] = useState(false);
  // Report Modal state
  const [showReportModal, setShowReportModal] = useState(false);

  // Sync upvote state when post changes
  useEffect(() => {
    setUpvoteCount(post.upvoteCount ?? post.emotes?.length ?? 0);
    const userId = user?._id || user?.id;
    if (userId && Array.isArray(post.upvotes)) {
      const userIdStr = String(userId);
      const hasUpvoted = post.upvotes.some(id => {
        let idStr = '';
        if (typeof id === 'string') idStr = id;
        else if (id?.$oid) idStr = id.$oid;
        else if (id?._id) idStr = String(id._id);
        else if (id?.toString) idStr = id.toString();
        return idStr === userIdStr;
      });
      setUpvoted(hasUpvoted);
    } else if (userId) {
      // User is logged in but upvotes array is empty
      setUpvoted(false);
    }
  }, [post.upvoteCount, post.upvotes, post.emotes, user?._id, user?.id]);

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
  }, [showMainMenu, showCommentEmojiPicker]);

  // Handle upvote (toggle upvote state)
  const handleUpvote = useCallback(async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    // Login gate
    if (!user) {
      navigate('/login');
      return;
    }
    if (upvoting) return;

    // Optimistic update
    const prevUpvoted = upvoted;
    const prevCount = upvoteCount;

    setUpvoting(true);
    setUpvoted(!prevUpvoted);
    setUpvoteCount(prev => prevUpvoted ? Math.max(0, prev - 1) : prev + 1);

    // Heart animation for new upvote
    if (!prevUpvoted) {
      heartAnimationKey.current += 1;
      setShowHeartAnimation(true);
      setTimeout(() => setShowHeartAnimation(false), 600);
    }

    try {
      const res = await api(`/api/posts/${post._id}/upvote`, { method: 'POST' });
      if (res) {
        setUpvoted(res.upvoted);
        setUpvoteCount(res.upvoteCount);
      }
    } catch (error) {
      // Rollback on error
      setUpvoted(prevUpvoted);
      setUpvoteCount(prevCount);
      showError(error.message || 'Không thể upvote bài viết');
    } finally {
      setUpvoting(false);
    }
  }, [post._id, user, upvoted, upvoteCount, upvoting, navigate, showError]);

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
    } catch (error) {
      showError(error?.message || "Lỗi khi đăng bình luận");
    } finally {
      setSubmittingComment(false);
    }
  }, [commentContent, commentImages, user, post._id, onUpdate, showSuccess, showError]);

  return (
    <div
      onClick={() => {
        if (showPostModal) return;
        // Mobile: navigate to post detail, Desktop: open modal
        if (window.innerWidth < 768) {
          navigate(`/post/${post.slug || post._id}`);
        } else {
          setShowPostModal(true);
        }
      }}
      className="group relative bg-white dark:bg-neutral-900 rounded-xl sm:rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-lg transition-all duration-300 my-2.5 sm:my-3 md:my-4 sm:mx-0 cursor-pointer"
    >
      {/* 1. Header */}
      <div className="px-3 sm:px-4 pt-3 sm:pt-3.5 pb-2 flex justify-between items-start">
        <div className="flex items-center gap-2 sm:gap-3" onClick={e => e.stopPropagation()}>
          <Link to={`/user/${post.author?._id}`} className="relative group/avatar flex-shrink-0">
            <div className="rounded-full">
              <UserAvatar
                user={post.author}
                size={44}
                showFrame={true}
                showBadge={true}
                className="rounded-full"
              />
            </div>
          </Link>
          <div className="flex flex-col min-w-0">
            <Link
              to={`/user/${post.author?._id}`}
              className="font-bold text-base text-gray-900 dark:text-gray-100 hover:text-black dark:hover:text-white transition-colors line-clamp-1"
              onClick={e => e.stopPropagation()}
            >
              <UserName user={post.author} maxLength={20} />
            </Link>
            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 font-medium">
              <span
                className="hover:underline cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/post/${post.slug || post._id}`);
                }}
              >
                {timeAgo}
              </span>
              {isPrivate && (
                <span className="flex items-center gap-0.5 bg-gray-50 dark:bg-white/5 px-1.5 py-0.5 rounded text-gray-500 text-[10px]">
                  🔒 <span>Riêng tư</span>
                </span>
              )}
              {post.isPinned && (
                <span className="inline-flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-600 dark:text-neutral-400 text-[10px]">
                  <Pin size={10} />
                  <span>Ghim</span>
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
                  className="absolute right-0 top-full mt-1 bg-white dark:bg-neutral-800 shadow-xl border border-gray-100 dark:border-neutral-700 rounded-xl py-1 z-20 w-auto min-w-max"
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
                  <div className="h-px bg-gray-100 dark:bg-neutral-700 my-1" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMainMenu(false);
                      setShowReportModal(true);
                    }}
                    className="w-full text-left px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-red-600 dark:text-red-400"
                  >
                    <Flag size={14} className="sm:w-4 sm:h-4" />
                    <span>Báo cáo bài viết</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* 2. Content Body */}
      <div className="px-3 sm:px-4 pb-2 sm:pb-2.5">
        {/* Title - Mobile: smaller */}
        {/* Hide title if it's auto-generated (title is prefix of content) */}
        {post.title && !(post.content && post.content.trim().startsWith(post.title.replace(/…$/, '').trim())) && (
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-50 mb-2 leading-snug line-clamp-2">
            {post.title}
          </h3>
        )}
        {/* Content - Mobile: smaller font, better line-height */}
        {post.content && (
          <ContentWithSeeMore maxHeight={250}>
            <div className="prose dark:prose-invert max-w-none text-[15px] leading-[1.6] text-neutral-800 dark:text-neutral-200 font-normal prose-p:mb-2 prose-headings:mb-2 prose-headings:mt-3">
              <MarkdownWithMentions
                content={post.content}
                mentionedUsers={post.mentions || []}
              />
            </div>
          </ContentWithSeeMore>
        )}
      </div>

      {/* 3. Media - Facebook/Twitter style: constrained aspect ratio */}
      {displayMedia && (
        <div className="mt-1 mb-2 px-2 sm:px-3">
          <div className={cn(
            "relative w-full overflow-hidden rounded-lg sm:rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-neutral-800/50",
            displayMedia.type !== 'video' && 'group/media'
          )}>
            {displayMedia.type === 'video' ? (
              <video
                src={displayMedia.url}
                className="w-full max-h-[280px] sm:max-h-[320px] md:max-h-[380px] object-contain bg-black"
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
                className="w-full h-auto object-cover transition-transform duration-300 group-hover/media:scale-[1.01] max-h-[320px] sm:max-h-[380px] md:max-h-[420px]"
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
        className="px-3 sm:px-4 py-2 sm:py-2 flex items-center justify-between border-t border-gray-50 dark:border-white/5 mt-1"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-1 sm:gap-2">
          {/* NEW: Upvote Button (replaces Emote) */}
          <div className="relative">
            {/* Upvote Animation - Enhanced with particles */}
            <AnimatePresence>
              {showHeartAnimation && (
                <>
                  {/* Main arrow flying up */}
                  <motion.div
                    key={`main-${heartAnimationKey.current}`}
                    initial={{ scale: 0.5, opacity: 0, y: 0 }}
                    animate={{ scale: 1.2, opacity: 1, y: -35 }}
                    exit={{ opacity: 0, y: -50, scale: 0.8 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="absolute -top-4 left-3 pointer-events-none z-50"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-neutral-900 dark:text-white">
                      <path d="M12 4l-8 8h5v8h6v-8h5l-8-8z" />
                    </svg>
                  </motion.div>
                  {/* Sparkle particles */}
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={`particle-${i}-${heartAnimationKey.current}`}
                      initial={{ scale: 0, opacity: 1, x: 0, y: 0 }}
                      animate={{
                        scale: [0, 1, 0],
                        opacity: [1, 1, 0],
                        x: Math.cos((i * 60) * Math.PI / 180) * 20,
                        y: Math.sin((i * 60) * Math.PI / 180) * 20 - 15
                      }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="absolute top-0 left-4 pointer-events-none z-50"
                    >
                      <div className="w-1 h-1 rounded-full bg-neutral-700 dark:bg-neutral-300" />
                    </motion.div>
                  ))}
                </>
              )}
            </AnimatePresence>

            <button
              onClick={handleUpvote}
              disabled={upvoting}
              aria-label={upvoted ? "Bỏ upvote" : "Upvote"}
              title={upvoted ? "Bỏ upvote" : "Upvote bài viết"}
              className={cn(
                "flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-full transition-all duration-200 group/btn touch-manipulation",
                upvoting ? "opacity-50 cursor-not-allowed" : "active:scale-95",
                upvoted
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                  : "hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-600 dark:text-gray-100"
              )}
            >
              {/* Upvote Arrow Icon */}
              <svg
                viewBox="0 0 24 24"
                className={cn(
                  "w-5 h-5 sm:w-6 sm:h-6 transition-transform",
                  upvoted ? "fill-current" : "fill-none stroke-current stroke-2",
                  !upvoting && "group-hover/btn:scale-110 group-hover/btn:-translate-y-0.5"
                )}
              >
                <path d="M12 4l-8 8h5v8h6v-8h5l-8-8z" />
              </svg>
              <span className="text-sm font-semibold">
                {upvoteCount > 0 ? upvoteCount.toLocaleString() : ""}
              </span>
            </button>
          </div>

          {/* Comment Button with Hot Discussion indicator */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Desktop: open modal, Mobile: navigate to post detail
              if (window.innerWidth >= 768) {
                setShowPostModal(true);
              } else {
                navigate(`/post/${post.slug || post._id}`);
              }
            }}
            aria-label="Bình luận"
            title="Bình luận"
            className={cn(
              "flex items-center gap-2 px-3 py-2.5 rounded-full transition-all duration-200 active:scale-95 touch-manipulation group/comment",
              post.commentCount >= 5
                ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30"
                : "hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-black dark:hover:text-white text-gray-600 dark:text-gray-300"
            )}
          >
            {post.commentCount >= 5 ? (
              <span className="text-base leading-none select-none" aria-hidden="true">🔥</span>
            ) : (
              <span className="text-[22px] sm:text-2xl font-bold leading-none select-none transition-transform group-hover/comment:scale-110" aria-hidden="true">⌘</span>
            )}
            <span className="text-sm font-semibold">
              {post.commentCount || "Bình luận"}
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
            aria-label="Chia sẻ bài viết"
            title="Chia sẻ"
            className="p-2 sm:p-2.5 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors active:scale-95 touch-manipulation"
          >
            <Share2 className="w-5 h-5" strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          aria-label={saved ? "Bỏ lưu bài viết" : "Lưu bài viết"}
          title={saved ? "Bỏ lưu" : "Lưu bài viết"}
          className={cn(
            "p-2 sm:p-2.5 rounded-full transition-all duration-200 active:scale-90 touch-manipulation",
            saved
              ? "text-yellow-500 bg-yellow-50 dark:bg-yellow-500/10"
              : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 hover:text-yellow-500"
          )}
        >
          <Bookmark className={cn("w-5 h-5", saved && "fill-current")} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>

      {/* Comment Input Section with dynamic placeholder */}
      {user && (
        <div
          className="px-3 sm:px-4 py-2 sm:py-2.5 border-t border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900/30"
          onClick={e => e.stopPropagation()}
        >
          {/* Image Previews */}
          {commentImages.length > 0 && (
            <div className="mb-2 ml-9 sm:ml-10 grid grid-cols-3 gap-1.5 sm:gap-2">
              {commentImages.map((img, idx) => (
                <div key={idx} className="relative group">
                  <div className="w-full rounded-lg border border-gray-200 dark:border-neutral-800 overflow-hidden bg-gray-50 dark:bg-neutral-900 aspect-square">
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
              className="border border-gray-200 dark:border-neutral-800 flex-shrink-0 sm:hidden"
            />
            <Avatar
              src={user?.avatarUrl}
              name={user?.name || 'User'}
              size={32}
              className="border border-gray-200 dark:border-neutral-800 flex-shrink-0 hidden sm:block"
            />
            <div className="flex-1 flex items-center gap-1.5 sm:gap-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-full px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/50 transition-all">
              <input
                ref={commentTextareaRef}
                type="text"
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder={post.commentCount === 0
                  ? "Hãy là người bình luận đầu tiên..."
                  : "Tham gia thảo luận..."}
                disabled={submittingComment}
                className="flex-1 bg-transparent border-none outline-none text-xs sm:text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 disabled:opacity-50"
              />
              <div className="flex items-center gap-0.5 sm:gap-1 border-l border-gray-100 dark:border-neutral-700 pl-1.5 sm:pl-2">
                <label className="p-1 sm:p-1.5 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition-colors cursor-pointer" title="Thêm ảnh">
                  <ImageIcon size={16} className="sm:w-[18px] sm:h-[18px] text-gray-400 hover:text-black dark:text-white" />
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
                  className="p-2 sm:p-1.5 min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-blue-900/30 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center touch-manipulation"
                  title="Gửi"
                >
                  {submittingComment ? (
                    <Loader2 size={16} className="sm:w-[18px] sm:h-[18px] text-black dark:text-white animate-spin" />
                  ) : (
                    <Send size={16} className="sm:w-[18px] sm:h-[18px] text-black dark:text-white" />
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Post Detail Modal */}
      <PostDetailModal
        post={post}
        user={user}
        isOpen={showPostModal}
        onClose={() => setShowPostModal(false)}
        onUpdate={onUpdate}
        isSaved={saved}
        onSavedChange={onSavedChange}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetType="post"
        targetId={post._id}
        targetInfo={{ name: post.title || post.content?.slice(0, 50) }}
      />
    </div>
  );
};

export default memo(ModernPostCard);
