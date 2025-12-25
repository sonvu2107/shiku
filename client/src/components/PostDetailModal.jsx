import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api";
import MarkdownWithMentions from "./MarkdownWithMentions";
import CommentSection from "./CommentSection";
import MenuActions from "./MenuActions";
import UserName from "./UserName";
import UserAvatar from "./UserAvatar";
import VerifiedBadge from "./VerifiedBadge";
import Poll from "./Poll";
import YouTubePlayer from "./YouTubePlayer";
import LazyImage from "./LazyImageSimple";
import ContentWithSeeMore from "./ContentWithSeeMore";
import { getOptimizedImageUrl } from "../utils/imageOptimization";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "../utils/cn";
import { useToast } from "../contexts/ToastContext";
import { useSwipeGesture } from "../hooks/useSwipeGesture";
import { useUpdatePostUpvote } from "../hooks/usePosts";
import {
    X,
    Eye,
    ThumbsUp,
    Bookmark,
    MessageCircle,
    Share2,
    ChevronLeft,
    ChevronRight,
    Loader2
} from "lucide-react";

// Emote system removed - using upvote system instead

/**
 * PostDetailModal - Modal hiển thị chi tiết bài viết và comments
 * Bố cục giống hệt trang PostDetail.jsx
 */
export default function PostDetailModal({
    post,
    user,
    isOpen,
    onClose,
    onUpdate,
    isSaved: isSavedProp = false,
    onSavedChange
}) {
    const navigate = useNavigate();
    const { showSuccess, showError } = useToast();
    const updatePostUpvote = useUpdatePostUpvote();

    // States
    const [saved, setSaved] = useState(isSavedProp);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [togglingStatus, setTogglingStatus] = useState(false);
    const [postStatus, setPostStatus] = useState(post?.status || 'published');

    // Upvote system state
    const [upvoted, setUpvoted] = useState(() => {
        const userId = user?._id || user?.id;
        if (!userId || !Array.isArray(post?.upvotes) || post.upvotes.length === 0) return false;
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
    const [upvoteCount, setUpvoteCount] = useState(post?.upvoteCount ?? post?.emotes?.length ?? 0);
    const [upvoting, setUpvoting] = useState(false);
    const [showUpvoteAnimation, setShowUpvoteAnimation] = useState(false);
    const upvoteAnimationKey = useRef(0);

    // Media modal states
    const [showMediaModal, setShowMediaModal] = useState(false);
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

    // Fetch full post data when modal opens to get populated data
    useEffect(() => {
        if (isOpen && post?._id) {
            const fetchFullPostData = async () => {
                try {
                    const res = await api(`/api/posts/slug/${post.slug || post._id}`);
                    if (res?.post) {
                        // Upvote data
                        setUpvoteCount(res.post.upvoteCount ?? res.post.emotes?.length ?? 0);
                        const userId = user?._id || user?.id;
                        if (userId && Array.isArray(res.post.upvotes)) {
                            const userIdStr = String(userId);
                            const hasUpvoted = res.post.upvotes.some(id => {
                                let idStr = '';
                                if (typeof id === 'string') idStr = id;
                                else if (id?.$oid) idStr = id.$oid;
                                else if (id?._id) idStr = String(id._id);
                                else if (id?.toString) idStr = id.toString();
                                return idStr === userIdStr;
                            });
                            setUpvoted(hasUpvoted);
                        } else if (userId) {
                            setUpvoted(false);
                        }
                    }
                } catch (e) {
                    // Fallback to props data
                    setUpvoteCount(post?.upvoteCount ?? post?.emotes?.length ?? 0);
                }
            };
            fetchFullPostData();
        }
    }, [isOpen, post?._id, post?.slug, user?._id, user?.id]);


    useEffect(() => {
        setSaved(isSavedProp);
    }, [isSavedProp]);

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Handle ESC key to close modal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen && !showMediaModal) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, showMediaModal]);

    // Swipe gesture for closing modal (swipe down)
    const { handlers: swipeHandlers, swipeOffset } = useSwipeGesture({
        onSwipeDown: () => {
            if (!showMediaModal) onClose();
        },
        threshold: 80,
        velocityThreshold: 0.3
    });

    // Swipe gesture for media navigation
    const { handlers: mediaSwipeHandlers } = useSwipeGesture({
        onSwipeLeft: () => {
            if (allMedia.length > 1) {
                setCurrentMediaIndex(prev => (prev + 1) % allMedia.length);
            }
        },
        onSwipeRight: () => {
            if (allMedia.length > 1) {
                setCurrentMediaIndex(prev => (prev - 1 + allMedia.length) % allMedia.length);
            }
        },
        onSwipeDown: () => setShowMediaModal(false),
        threshold: 50
    });

    // Handle upvote
    const handleUpvote = useCallback(async () => {
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

        // Animation for new upvote
        if (!prevUpvoted) {
            upvoteAnimationKey.current += 1;
            setShowUpvoteAnimation(true);
            setTimeout(() => setShowUpvoteAnimation(false), 600);
        }

        try {
            const res = await api(`/api/posts/${post._id}/upvote`, { method: 'POST' });
            if (res) {
                setUpvoted(res.upvoted);
                setUpvoteCount(res.upvoteCount);
                // Sync with posts cache for ModernPostCard
                const userId = user?._id || user?.id;
                if (userId) {
                    updatePostUpvote(post._id, res.upvoted, res.upvoteCount, userId);
                }
            }
        } catch (error) {
            // Rollback on error
            setUpvoted(prevUpvoted);
            setUpvoteCount(prevCount);
            showError(error.message || 'Không thể upvote bài viết');
        } finally {
            setUpvoting(false);
        }
    }, [post?._id, user, upvoted, upvoteCount, upvoting, navigate, showError, updatePostUpvote]);

    // Handle save
    const handleSave = useCallback(async () => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (saving) return;

        const previousSaved = saved;
        setSaving(true);
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
            showSuccess(actualSaved ? "Đã lưu bài viết" : "Đã bỏ lưu bài viết");
        } catch (error) {
            setSaved(previousSaved);
            if (onSavedChange) onSavedChange(post._id, previousSaved);
            showError(error?.message || "Không thể lưu bài viết");
        } finally {
            setSaving(false);
        }
    }, [user, navigate, post?._id, onSavedChange, saved, saving, showSuccess, showError]);

    // Handle share
    const handleShare = useCallback(() => {
        const url = `${window.location.origin}/post/${post.slug || post._id}`;
        navigator.clipboard.writeText(url).then(() => {
            showSuccess("Đã sao chép liên kết!");
        }).catch(() => {
            showError("Không thể sao chép liên kết");
        });
    }, [post, showSuccess, showError]);

    // Handle delete post
    const handleDeletePost = useCallback(async () => {
        if (!window.confirm("Đảm bảo bạn muốn xóa bài viết này?")) return;
        setDeleting(true);
        try {
            await api(`/api/posts/${post._id}`, { method: 'DELETE' });
            showSuccess("Đã xóa bài viết");
            onClose();
            if (onUpdate) onUpdate();
        } catch (error) {
            showError(error.message || "Không thể xóa bài viết");
        } finally {
            setDeleting(false);
        }
    }, [post?._id, onClose, onUpdate, showSuccess, showError]);

    // Handle toggle post status
    const handleToggleStatus = useCallback(async () => {
        const newStatus = postStatus === 'private' ? 'published' : 'private';
        const confirmMsg = newStatus === 'private'
            ? "Bạn có chắc muốn chuyển bài viết thành riêng tư?"
            : "Bạn có chắc muốn công khai bài viết này?";
        if (!window.confirm(confirmMsg)) return;

        setTogglingStatus(true);
        const previousStatus = postStatus;
        setPostStatus(newStatus);

        try {
            await api(`/api/posts/${post._id}`, {
                method: 'PUT',
                body: { status: newStatus }
            });
            showSuccess(newStatus === 'private' ? "Đã chuyển thành riêng tư" : "Đã công khai bài viết");
            if (onUpdate) onUpdate();
        } catch (error) {
            setPostStatus(previousStatus);
            showError(error.message || "Không thể thay đổi trạng thái");
        } finally {
            setTogglingStatus(false);
        }
    }, [post?._id, postStatus, onUpdate, showSuccess, showError]);

    // Computed values
    const p = post;
    const timeAgo = p?.createdAt
        ? formatDistanceToNow(new Date(p.createdAt), { addSuffix: true, locale: vi })
        : "";

    const allMedia = useMemo(() => {
        if (!p) return [];
        return [
            ...(p.coverUrl
                ? (() => {
                    const found = Array.isArray(p.files)
                        ? p.files.find(f => f.url === p.coverUrl)
                        : null;
                    if (found) return [{ url: p.coverUrl, type: found.type }];
                    return [{ url: p.coverUrl, type: "image" }];
                })()
                : []),
            ...(Array.isArray(p.files) ? p.files.filter(f => f.url !== p.coverUrl) : [])
        ];
    }, [p]);

    if (!post) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    data-post-detail-modal
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] p-2 sm:p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) onClose();
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                        className="bg-white dark:bg-[#1a1a1a] rounded-xl sm:rounded-2xl md:rounded-3xl w-full max-w-3xl max-h-[95vh] overflow-hidden shadow-2xl border border-gray-100 dark:border-neutral-800/80 flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header - Simple close button */}
                        <div className="sticky top-0 z-10 bg-white dark:bg-[#1a1a1a] border-b border-gray-100 dark:border-neutral-800 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between">
                            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                                Bài viết
                            </h2>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
                                aria-label="Đóng"
                            >
                                <X size={20} className="text-gray-500 dark:text-gray-400" />
                            </button>
                        </div>

                        {/* Scrollable Content - Matches PostDetail.jsx layout */}
                        <div
                            className="flex-1 overflow-y-auto"
                            {...swipeHandlers}
                            style={{
                                transform: swipeOffset.y > 0 ? `translateY(${Math.min(swipeOffset.y * 0.5, 100)}px)` : 'none',
                                opacity: swipeOffset.y > 0 ? Math.max(1 - swipeOffset.y / 200, 0.5) : 1,
                                transition: swipeOffset.y === 0 ? 'all 0.2s ease-out' : 'none'
                            }}
                        >
                            <div className="px-3 sm:px-4 md:px-5 pt-3 sm:pt-4 md:pt-5 pb-3 sm:pb-5 md:pb-6">

                                {/* HEADER - Match PostDetail */}
                                <div className="flex items-center justify-between mb-3 sm:mb-4 px-0">
                                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                        <Link
                                            to={`/user/${p.author?._id}`}
                                            className="relative flex-shrink-0 group/avatar"
                                            onClick={onClose}
                                        >
                                            <div className="ring-2 ring-transparent group-hover/avatar:ring-blue-100 dark:group-hover/avatar:ring-blue-900/50 rounded-full transition-all">
                                                <UserAvatar
                                                    user={p.author}
                                                    size={36}
                                                    showFrame={true}
                                                    showBadge={true}
                                                    className="sm:hidden rounded-full"
                                                />
                                                <UserAvatar
                                                    user={p.author}
                                                    size={42}
                                                    showFrame={true}
                                                    showBadge={true}
                                                    className="hidden sm:block md:hidden rounded-full"
                                                />
                                                <UserAvatar
                                                    user={p.author}
                                                    size={48}
                                                    showFrame={true}
                                                    showBadge={true}
                                                    className="hidden md:block rounded-full"
                                                />
                                            </div>
                                        </Link>
                                        <div className="min-w-0 flex-1 flex flex-col">
                                            <Link
                                                to={`/user/${p.author?._id}`}
                                                className="font-bold text-[16px] sm:text-[15px] md:text-base text-gray-900 dark:text-gray-100 hover:text-black dark:hover:text-white transition-colors flex items-center gap-1.5 line-clamp-1"
                                                onClick={onClose}
                                            >
                                                <UserName user={p.author} maxLength={20} />
                                                {p.author?.role === 'admin' && <VerifiedBadge user={p.author} />}
                                            </Link>
                                            <div className="flex items-center gap-1 sm:gap-1.5 text-[12px] sm:text-[11px] md:text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5">
                                                <span>{timeAgo}</span>
                                                {p.status === 'private' && (
                                                    <span className="flex items-center gap-0.5 bg-gray-50 dark:bg-white/5 px-1 sm:px-1.5 py-0.5 rounded text-gray-500 text-[9px] sm:text-[10px]">
                                                        🔒 <span className="hidden sm:inline">Riêng tư</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Menu Actions for owner/admin */}
                                    {user && (() => {
                                        const currentUserId = user?.id || user?._id;
                                        const authorId = p.author?._id || p.author?.id;
                                        const isOwner = currentUserId && authorId && (
                                            currentUserId === authorId ||
                                            currentUserId?.toString() === authorId?.toString()
                                        );
                                        const isAdmin = user.role === "admin";
                                        return isOwner || isAdmin;
                                    })() && (
                                            <div className="relative flex-shrink-0 ml-2">
                                                <MenuActions
                                                    onToggleStatus={handleToggleStatus}
                                                    onEdit={() => {
                                                        onClose();
                                                        navigate(`/edit-post/${p._id}`);
                                                    }}
                                                    onDelete={handleDeletePost}
                                                    onSave={handleSave}
                                                    isPrivate={postStatus === 'private'}
                                                    saved={saved}
                                                />
                                            </div>
                                        )}
                                </div>

                                {/* TITLE - Match PostDetail */}
                                {p.title && !(p.content && p.content.trim().startsWith(p.title.replace(/…$/, '').trim())) && (
                                    <h1 className="mb-2 sm:mb-3 text-[18px] sm:text-lg md:text-2xl font-bold text-gray-900 dark:text-gray-50 leading-snug break-words">
                                        {p.title}
                                    </h1>
                                )}

                                {/* CONTENT - Match PostDetail */}
                                {p.content && (
                                    <div className="mb-3 sm:mb-4">
                                        <ContentWithSeeMore maxHeight={250}>
                                            <div className="prose dark:prose-invert max-w-none text-[16px] sm:text-base md:text-[17px] leading-[1.8] sm:leading-[1.75] text-neutral-800 dark:text-neutral-200 font-normal prose-p:mb-3 prose-headings:mb-3 prose-headings:mt-5">
                                                <MarkdownWithMentions
                                                    content={p.content}
                                                    mentionedUsers={p.mentions || []}
                                                />
                                            </div>
                                        </ContentWithSeeMore>
                                    </div>
                                )}

                                {/* Poll Component */}
                                {p.hasPoll && (
                                    <div className="px-0 sm:px-1 mb-3 sm:mb-4">
                                        <Poll post={p} user={user} />
                                    </div>
                                )}

                                {/* YouTube Music Player */}
                                {p.youtubeUrl && (
                                    <div className="px-0 sm:px-1 mb-3 sm:mb-4">
                                        <YouTubePlayer key={`yt-${p._id}`} url={p.youtubeUrl} variant="full" />
                                    </div>
                                )}

                                {/* Tags */}
                                {p.tags && p.tags.length > 0 && (
                                    <div className="px-0 sm:px-1 mb-3 sm:mb-4">
                                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                            {p.tags.map((tag, index) => (
                                                <span
                                                    key={index}
                                                    className="inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-neutral-200 dark:bg-neutral-800 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 active:bg-blue-300 dark:active:bg-blue-900/70 transition-colors cursor-pointer touch-manipulation"
                                                    onClick={() => {
                                                        onClose();
                                                        navigate(`/explore?q=${encodeURIComponent(tag)}`);
                                                    }}
                                                >
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Media - Match PostDetail layout */}
                                {allMedia.length === 1 && (
                                    <div className="mb-4 sm:mb-5 -mx-3 sm:mx-0">
                                        <div
                                            className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gray-100 dark:bg-black cursor-pointer group/media touch-manipulation"
                                            onClick={() => {
                                                setCurrentMediaIndex(0);
                                                setShowMediaModal(true);
                                            }}
                                        >
                                            {allMedia[0].type === "video" ? (
                                                <video
                                                    src={allMedia[0].url}
                                                    className="w-full max-h-[50vh] sm:max-h-[70vh] object-contain bg-black transition-transform duration-700 group-hover/media:scale-105"
                                                    controls
                                                    playsInline
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            ) : (
                                                <LazyImage
                                                    src={getOptimizedImageUrl(allMedia[0].url, 1200)}
                                                    alt={p.title}
                                                    className="w-full object-contain max-h-[50vh] sm:max-h-[70vh] transition-transform duration-700 group-hover/media:scale-105"
                                                />
                                            )}
                                        </div>
                                    </div>
                                )}
                                {allMedia.length > 1 && (
                                    <div className="mb-4 sm:mb-5 -mx-3 sm:mx-0">
                                        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                                            <div
                                                className="col-span-2 row-span-2 h-48 sm:h-64 rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer group/media touch-manipulation"
                                                onClick={() => {
                                                    setCurrentMediaIndex(0);
                                                    setShowMediaModal(true);
                                                }}
                                            >
                                                {allMedia[0].type === "video" ? (
                                                    <video
                                                        src={allMedia[0].url}
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover/media:scale-105"
                                                        controls
                                                        playsInline
                                                    />
                                                ) : (
                                                    <LazyImage
                                                        src={getOptimizedImageUrl(allMedia[0].url, 800)}
                                                        alt={p.title}
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover/media:scale-105"
                                                    />
                                                )}
                                            </div>
                                            {allMedia.slice(1, 3).map((m, idx) => (
                                                <div
                                                    key={idx + 1}
                                                    className="h-24 sm:h-36 rounded-2xl sm:rounded-3xl overflow-hidden relative cursor-pointer group/media touch-manipulation"
                                                    onClick={() => {
                                                        setCurrentMediaIndex(idx + 1);
                                                        setShowMediaModal(true);
                                                    }}
                                                >
                                                    {m.type === "video" ? (
                                                        <video
                                                            src={m.url}
                                                            className="w-full h-full object-cover transition-transform duration-700 group-hover/media:scale-105"
                                                            controls
                                                            playsInline
                                                        />
                                                    ) : (
                                                        <LazyImage
                                                            src={getOptimizedImageUrl(m.url, 400)}
                                                            alt={p.title}
                                                            className="w-full h-full object-cover transition-transform duration-700 group-hover/media:scale-105"
                                                        />
                                                    )}
                                                    {idx === 1 && allMedia.length > 3 && (
                                                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-2xl sm:rounded-3xl text-white text-lg sm:text-2xl font-bold">
                                                            +{allMedia.length - 3} ảnh
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Upvote count display (optional - can show if needed) */}
                                {upvoteCount > 0 && (
                                    <div className="relative px-2 sm:px-4 mb-2 sm:mb-3 pb-0.5 border-b border-gray-200 dark:border-gray-800">
                                        <div className="flex items-center justify-between text-sm sm:text-base text-gray-600 dark:text-gray-400 gap-2">
                                            <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-1">
                                                <span className="text-gray-500 dark:text-gray-400 font-semibold text-sm sm:text-base whitespace-nowrap">
                                                    {upvoteCount.toLocaleString()} upvote{upvoteCount !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                            {p.views !== undefined && p.views !== null && (
                                                <div className="flex items-center gap-1 sm:gap-1.5 text-gray-500 dark:text-gray-400 flex-shrink-0">
                                                    <Eye size={16} className="sm:w-[18px] sm:h-[18px] text-gray-500 dark:text-gray-400 flex-shrink-0" />
                                                    <span className="font-semibold text-xs sm:text-base whitespace-nowrap">
                                                        {p.views.toLocaleString()} lượt xem
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* ACTION BAR - Match PostDetail */}
                                <div className="px-2 sm:px-4 py-2 sm:py-3 mb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1 sm:gap-2">
                                            {/* NEW: Upvote Button */}
                                            <div className="relative">
                                                {/* Upvote Animation - Enhanced with particles */}
                                                <AnimatePresence>
                                                    {showUpvoteAnimation && (
                                                        <>
                                                            {/* Main arrow flying up */}
                                                            <motion.div
                                                                key={`main-${upvoteAnimationKey.current}`}
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
                                                                    key={`particle-${i}-${upvoteAnimationKey.current}`}
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
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleUpvote();
                                                    }}
                                                    disabled={upvoting}
                                                    aria-label={upvoted ? "Bỏ upvote" : "Upvote"}
                                                    title={upvoted ? "Bỏ upvote" : "Upvote bài viết"}
                                                    className={cn(
                                                        "flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-full transition-all active:scale-90 touch-manipulation min-h-[40px] sm:min-h-[44px]",
                                                        upvoting && "opacity-50 cursor-not-allowed",
                                                        upvoted
                                                            ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                                                            : "hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-100"
                                                    )}
                                                >
                                                    {upvoting ? (
                                                        <Loader2 size={20} className="sm:w-[22px] sm:h-[22px] flex-shrink-0 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <svg
                                                                viewBox="0 0 24 24"
                                                                className={cn(
                                                                    "w-5 h-5 sm:w-[22px] sm:h-[22px] flex-shrink-0 transition-transform",
                                                                    upvoted ? "fill-current" : "fill-none stroke-current stroke-2",
                                                                    !upvoting && "hover:scale-110 hover:-translate-y-0.5"
                                                                )}
                                                            >
                                                                <path d="M12 4l-8 8h5v8h6v-8h5l-8-8z" />
                                                            </svg>
                                                            <span className="font-bold text-xs sm:text-sm whitespace-nowrap">
                                                                {upvoteCount > 0 ? upvoteCount.toLocaleString() : ""}
                                                            </span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>

                                            {/* Comment */}
                                            <button
                                                className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-full hover:bg-neutral-100 dark:bg-neutral-800 hover:text-black dark:text-white dark:hover:bg-black dark:bg-white/20 dark:hover:text-blue-400 text-gray-600 dark:text-gray-400 transition-all duration-200 active:scale-90 touch-manipulation min-h-[40px] sm:min-h-[44px] group/comment"
                                                type="button"
                                                aria-label="Bình luận"
                                                title="Bình luận"
                                                onClick={() => {
                                                    const cmtEl = document.getElementById("modal-comments-section");
                                                    if (cmtEl) cmtEl.scrollIntoView({ behavior: "smooth" });
                                                }}
                                            >
                                                <span className="text-[22px] sm:text-2xl font-bold leading-none select-none transition-transform group-hover/comment:scale-110" aria-hidden="true">⌘</span>
                                                <span className="font-bold text-xs sm:text-sm whitespace-nowrap">{p.commentCount || 0}</span>
                                            </button>

                                            {/* Share */}
                                            <button
                                                className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-full hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-500/20 dark:hover:text-green-400 text-gray-600 dark:text-gray-400 transition-all active:scale-90 touch-manipulation min-h-[40px] sm:min-h-[44px]"
                                                type="button"
                                                onClick={handleShare}
                                                aria-label="Chia sẻ"
                                            >
                                                <Share2 size={20} className="sm:w-[22px] sm:h-[22px] flex-shrink-0" />
                                            </button>
                                        </div>

                                        {/* Save */}
                                        <button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className={cn(
                                                "p-2 sm:p-3 rounded-full transition-all active:scale-90 touch-manipulation min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center flex-shrink-0",
                                                saved
                                                    ? "bg-yellow-50 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-500"
                                                    : "hover:bg-yellow-50 hover:text-yellow-600 dark:hover:bg-yellow-500/20 dark:hover:text-yellow-500 text-gray-400",
                                                saving && "opacity-50 cursor-not-allowed"
                                            )}
                                            aria-label={saved ? "Bỏ lưu" : "Lưu bài viết"}
                                        >
                                            {saving ? (
                                                <Loader2 size={20} className="sm:w-[22px] sm:h-[22px] animate-spin" />
                                            ) : (
                                                <Bookmark size={20} className={cn("sm:w-[22px] sm:h-[22px]", saved ? "fill-current" : "")} strokeWidth={saved ? 0 : 2} />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Comments Section */}
                                <div id="modal-comments-section">
                                    <CommentSection
                                        postId={p._id}
                                        user={user}
                                        onCommentCountChange={(delta) => {
                                            if (onUpdate) onUpdate();
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Media Fullscreen Modal */}
                    <AnimatePresence>
                        {showMediaModal && allMedia.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/95 z-[210] flex items-center justify-center"
                                onClick={() => setShowMediaModal(false)}
                            >
                                <button
                                    onClick={() => setShowMediaModal(false)}
                                    className="absolute top-4 right-4 p-2 text-white/80 hover:text-white transition-colors z-10"
                                >
                                    <X size={28} />
                                </button>

                                {allMedia.length > 1 && (
                                    <>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setCurrentMediaIndex(prev => (prev - 1 + allMedia.length) % allMedia.length);
                                            }}
                                            className="absolute left-4 p-2 text-white/80 hover:text-white transition-colors z-10"
                                        >
                                            <ChevronLeft size={32} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setCurrentMediaIndex(prev => (prev + 1) % allMedia.length);
                                            }}
                                            className="absolute right-4 p-2 text-white/80 hover:text-white transition-colors z-10"
                                        >
                                            <ChevronRight size={32} />
                                        </button>
                                    </>
                                )}

                                <div
                                    className="max-w-[90vw] max-h-[90vh]"
                                    onClick={e => e.stopPropagation()}
                                    {...mediaSwipeHandlers}
                                >
                                    {allMedia[currentMediaIndex]?.type === "video" ? (
                                        <video
                                            src={allMedia[currentMediaIndex].url}
                                            className="max-w-full max-h-[90vh] object-contain"
                                            controls
                                            autoPlay
                                        />
                                    ) : (
                                        <img
                                            src={allMedia[currentMediaIndex]?.url}
                                            alt=""
                                            className="max-w-full max-h-[90vh] object-contain"
                                        />
                                    )}
                                </div>

                                {allMedia.length > 1 && (
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                                        {allMedia.map((_, idx) => (
                                            <button
                                                key={idx}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCurrentMediaIndex(idx);
                                                }}
                                                className={cn(
                                                    "w-2 h-2 rounded-full transition-colors",
                                                    idx === currentMediaIndex ? "bg-white" : "bg-white/40"
                                                )}
                                            />
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
