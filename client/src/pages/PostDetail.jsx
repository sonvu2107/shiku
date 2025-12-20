import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import MenuActions from "../components/MenuActions";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api } from "../api";
import ReactMarkdown from "react-markdown";
import MarkdownWithMentions from "../components/MarkdownWithMentions";
import CommentSection from "../components/CommentSection";
import { Expand, X, Eye, Lock, Globe, Bookmark, BookmarkCheck, MessageCircle, Share2, MoreHorizontal, Loader2 } from "lucide-react";
import UserName from "../components/UserName";
import UserAvatar from "../components/UserAvatar";
import VerifiedBadge from "../components/VerifiedBadge";
import Poll from "../components/Poll";
import YouTubePlayer from "../components/YouTubePlayer";
import { useSEO } from "../utils/useSEO";
import { getOptimizedImageUrl } from "../utils/imageOptimization";
import LazyImage from "../components/LazyImageSimple";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "../utils/cn";
import { useToast } from "../contexts/ToastContext";
import { useUpdatePostCommentCount } from "../hooks/usePosts";
import ContentWithSeeMore from "../components/ContentWithSeeMore";
import { motion, AnimatePresence } from "framer-motion";


/**
 * PostDetail - Trang chi tiết bài viết
 * Hiển thị nội dung bài viết, media, upvotes, comments và các actions
 * Hỗ trợ media modal carousel và upvote system
 */
export default function PostDetail() {
  // ==================== UTILITY FUNCTIONS ====================

  /**
   * Format thời gian chi tiết cho tooltip
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date string
   */
  function formatFullDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Format thời gian dạng relative (x giờ trước, x ngày trước, etc.)
   * @param {string} dateString - ISO date string
   * @returns {string} Relative time string
   */
  function formatTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffMonth = Math.floor(diffDay / 30);

    if (diffMonth >= 1) return `${diffMonth} tháng trước`;
    if (diffDay >= 1) return `${diffDay} ngày trước`;
    if (diffHour >= 1) return `${diffHour} giờ trước`;
    if (diffMin >= 1) return `${diffMin} phút trước`;
    return 'Vừa xong';
  }
  const { slug } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const updatePostCommentCount = useUpdatePostCommentCount();
  const [data, setDataRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Upvote system state
  const [upvoted, setUpvoted] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(0);
  const [upvoting, setUpvoting] = useState(false);
  const [showUpvoteAnimation, setShowUpvoteAnimation] = useState(false);
  const upvoteAnimationKey = useRef(0);

  // ==================== SEO ====================
  // Trang chi tiết bài viết là public → index, follow
  useSEO({
    title: data?.post ? `${data.post.title} - Shiku` : "Bài viết - Shiku",
    description: data?.post?.content
      ? `${data.post.content.substring(0, 160).replace(/\n/g, ' ')}...`
      : "Xem bài viết trên Shiku",
    robots: "index, follow",
    canonical: data?.post?.slug ? `https://shiku.click/post/${data.post.slug}` : undefined
  });

  const setData = (updater) => {
    setDataRaw(updater);
    setLoading(false);
  };

  const [user, setUser] = useState(null);
  const [groupCtx, setGroupCtx] = useState(null); // { userRole, settings }

  // Modal media
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [saved, setSaved] = useState(false);

  // Sync upvote state when post data changes
  useEffect(() => {
    if (data?.post) {
      setUpvoteCount(data.post.upvoteCount ?? data.post.emotes?.length ?? 0);
      if (user?._id && data.post.upvotes) {
        const hasUpvoted = data.post.upvotes.some(id =>
          (typeof id === 'string' ? id : id?.toString?.()) === user._id.toString()
        );
        setUpvoted(hasUpvoted);
      }
    }
  }, [data?.post, user?._id]);

  useEffect(() => {
    if (!data || data.post?.slug !== slug) {
      load();
    }
  }, [slug]);

  // Tải người dùng từ bộ nhớ đệm
  useEffect(() => {
    (async () => {
      try {
        const { loadUser } = await import("../utils/userCache");
        const cachedUser = await loadUser();
        setUser(cachedUser);
      } catch (_) {
        setUser(null);
      }
    })();
  }, []);

  // Lấy ngữ cảnh nhóm nếu bài viết thuộc về nhóm
  useEffect(() => {
    const fetchGroupCtx = async () => {
      try {
        const groupId = data?.post?.group?._id || data?.post?.group?.id;
        if (!groupId) { setGroupCtx(null); return; }
        const res = await api(`/api/groups/${groupId}?t=${Date.now()}`);
        if (res?.success && res?.data) {
          setGroupCtx({ userRole: res.data.userRole || null, settings: res.data.settings || {} });
        } else {
          setGroupCtx(null);
        }
      } catch (_) {
        // Nếu lỗi, đặt ngữ cảnh nhóm là null
        setGroupCtx(null);
      }
    };
    fetchGroupCtx();
  }, [data?.post?.group?._id, data?.post?.group?.id]);

  const commentTree = useMemo(() => {
    return data?.comments || [];
  }, [data?.comments]);

  async function load() {
    setLoading(true);
    try {
      const res = await api(`/api/posts/slug/${slug}`);
      setData(res);
      // Load saved status
      if (user) {
        try {
          const savedRes = await api(`/api/posts/${res.post._id}/save`);
          setSaved(!!savedRes.saved);
        } catch (_) { }
      }
    } catch (e) {
      showError("Không thể tải bài viết. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  async function deletePost() {
    if (!window.confirm("Bạn có chắc muốn xóa bài này?")) return;
    setDeleting(true);
    try {
      await api(`/api/posts/${data.post._id}`, { method: "DELETE" });
      showSuccess("Đã xóa bài viết.");
      setTimeout(() => navigate("/"), 500);
    } catch (e) {
      showError(e.message || "Không thể xóa bài viết.");
      setDeleting(false);
    }
  }

  // Handle upvote
  async function handleUpvote() {
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
      const res = await api(`/api/posts/${data.post._id}/upvote`, { method: 'POST' });
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
  }

  async function toggleSave() {
    if (saving) return;
    setSaving(true);
    const previousSaved = saved;
    // Optimistic update
    setSaved(!saved);

    try {
      const res = await api(`/api/posts/${data.post._id}/save`, { method: "POST" });
      setSaved(!!res.saved);
      if (res.saved) {
        showSuccess("Đã lưu bài viết.");
      } else {
        showSuccess("Đã bỏ lưu bài viết.");
      }
    } catch (e) {
      // Rollback on error
      setSaved(previousSaved);
      showError(e.message || "Không thể lưu bài viết");
    } finally {
      setSaving(false);
    }
  }

  async function togglePostStatus() {
    const currentStatus = data.post.status;
    const newStatus = currentStatus === "private" ? "published" : "private";
    const confirmMessage =
      newStatus === "private"
        ? "Bạn có chắc muốn chuyển bài viết này thành riêng tư?"
        : "Bạn có chắc muốn công khai bài viết này?";
    if (!window.confirm(confirmMessage)) return;

    setTogglingStatus(true);
    // Optimistic update
    setData((prev) => ({
      ...prev,
      post: { ...prev.post, status: newStatus }
    }));

    try {
      await api(`/api/posts/${data.post._id}`, {
        method: "PUT",
        body: { status: newStatus }
      });

      showSuccess(
        newStatus === "private"
          ? "Đã chuyển trạng thái thành riêng tư"
          : "Đã chuyển thành trạng thái công khai"
      );
    } catch (e) {
      // Rollback on error
      setData((prev) => ({
        ...prev,
        post: { ...prev.post, status: currentStatus }
      }));
      showError(e.message || "Không thể thay đổi trạng thái");
    } finally {
      setTogglingStatus(false);
    }
  }


  // Handle comment count change (delta: +1 for add, -1 for delete)
  const handleCommentCountChange = useCallback((delta) => {
    setDataRaw((prev) => {
      if (!prev) return prev;
      // Also update posts cache directly with the postId
      updatePostCommentCount(prev.post._id, delta);
      return {
        ...prev,
        post: {
          ...prev.post,
          commentCount: Math.max(0, (prev.post.commentCount || 0) + delta)
        }
      };
    });
  }, [updatePostCommentCount]);

  // Loading skeleton
  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] dark:bg-black transition-colors duration-300 pt-16 sm:pt-20 pb-20 sm:pb-32">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="bg-white dark:bg-[#111] rounded-2xl sm:rounded-[32px] px-3 sm:px-5 pt-3 sm:pt-4 pb-4 sm:pb-6 mb-4 sm:mb-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-transparent dark:border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-32"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-24"></div>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
              <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-4/5"></div>
            </div>
            <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-3xl animate-pulse mb-4"></div>
            <div className="flex items-center gap-2">
              <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse w-20"></div>
              <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse w-20"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  const p = data.post;

  // Tất cả phương tiện = bìa + tệp
  const allMedia = [
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

  const timeAgo = p.createdAt
    ? formatDistanceToNow(new Date(p.createdAt), { addSuffix: true, locale: vi })
    : "";
  const statusLabel = p.status === 'private' ? 'Riêng tư' : 'Công khai';

  return (
    <div className="min-h-screen bg-[#F5F7FA] dark:bg-black transition-colors duration-300 pt-16 sm:pt-20 pb-16 sm:pb-32">
      <div className="max-w-3xl mx-auto px-2 sm:px-4 py-3 sm:py-6">
        {/* Back to Home Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-3 sm:mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          Quay lại
        </button>
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl sm:rounded-2xl md:rounded-3xl px-3 sm:px-4 md:px-5 pt-3 sm:pt-4 md:pt-5 pb-3 sm:pb-5 md:pb-6 mb-3 sm:mb-5
            shadow-sm hover:shadow-lg transition-all duration-300
            border border-gray-100 dark:border-neutral-800/80 relative">
          {/* HEADER */}
          {/* HEADER - Match ModernPostCard */}
          <div className="flex items-center justify-between mb-3 sm:mb-4 px-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <Link to={`/user/${p.author?._id}`} className="relative flex-shrink-0 group/avatar">
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
                  className="font-bold text-[16px] sm:text-[15px] md:text-base text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5 line-clamp-1"
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
            {user && (() => {
              const currentUserId = user?.id || user?._id;
              const authorId = p.author?._id || p.author?.id;
              const isOwner = currentUserId && authorId && (
                currentUserId === authorId ||
                currentUserId?.toString() === authorId?.toString()
              );
              const isAdmin = user.role === "admin";
              return isOwner || isAdmin;
            })() ? (
              <div className="relative flex-shrink-0 ml-2">
                <MenuActions
                  onToggleStatus={togglePostStatus}
                  onEdit={() => navigate(`/edit-post/${p._id}`)}
                  onDelete={deletePost}
                  onSave={toggleSave}
                  isPrivate={p.status === "private"}
                  saved={saved}
                />
              </div>
            ) : null}
          </div>

          {/* TITLE - Match ModernPostCard */}
          {/* Hide title if it's auto-generated (title is prefix of content) */}
          {p.title && !(p.content && p.content.trim().startsWith(p.title.replace(/…$/, '').trim())) && (
            <h1 className="mb-2 sm:mb-3 text-[18px] sm:text-lg md:text-2xl font-bold text-gray-900 dark:text-gray-50 leading-snug break-words">
              {p.title}
            </h1>
          )}

          {/* CONTENT - Match ModernPostCard */}
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
                    className="inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 active:bg-blue-300 dark:active:bg-blue-900/70 transition-colors cursor-pointer touch-manipulation"
                    onClick={() => navigate(`/explore?q=${encodeURIComponent(tag)}`)}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Hiển thị preview media trong bài */}
          {allMedia.length === 1 && (
            <div className="mb-4 sm:mb-5 -mx-3 sm:mx-0">
              <div
                className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gray-100 dark:bg-black cursor-pointer group/media touch-manipulation"
                onClick={() => {
                  setCurrentIndex(0);
                  setShowMediaModal(true);
                }}
              >
                {allMedia[0].type === "video" ? (
                  <video
                    src={allMedia[0].url}
                    className="w-full max-h-[50vh] sm:max-h-[70vh] object-contain bg-black transition-transform duration-700 group-hover/media:scale-105"
                    controls
                    playsInline
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
                    setCurrentIndex(0);
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
                      setCurrentIndex(idx + 1);
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
                    {/* Nếu là ảnh cuối và còn nhiều hơn 3 ảnh, overlay số lượng */}
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

          {/* Upvote count display (optional) */}
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

          {/* ACTION BAR - Match ModernPostCard */}
          <div className="flex items-center justify-between pt-2 sm:pt-2.5 border-t border-gray-50 dark:border-white/5 mt-1 sm:mt-2">
            <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
              {/* Upvote Button */}
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
                  type="button"
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
                      ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                      : "hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400"
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
                className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-full hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/20 dark:hover:text-blue-400 text-gray-600 dark:text-gray-400 transition-all duration-200 active:scale-90 touch-manipulation min-h-[40px] sm:min-h-[44px] group/comment"
                type="button"
                aria-label="Bình luận"
                title="Bình luận"
                onClick={() => {
                  const cmtEl = document.getElementById("comments-section");
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
                onClick={() => {
                  const url = window.location.href;
                  navigator.clipboard.writeText(url).then(() => {
                    showSuccess("Đã sao chép liên kết!");
                  }).catch(() => {
                    showError("Không thể sao chép liên kết");
                  });
                }}
                aria-label="Chia sẻ"
              >
                <Share2 size={20} className="sm:w-[22px] sm:h-[22px] flex-shrink-0" />
              </button>
            </div>

            {/* Save */}
            <button
              onClick={toggleSave}
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

        {/* Comments */}
        {/* Comments - Match ModernPostCard card style */}
        <div id="comments-section">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl sm:rounded-2xl md:rounded-3xl p-3 sm:p-4 md:p-5 mb-3 sm:mb-5
            shadow-sm border border-gray-100 dark:border-neutral-800/80">
            <h2 className="text-base sm:text-xl font-bold mb-2.5 sm:mb-4 text-gray-900 dark:text-white">Bình luận</h2>
            {(() => {
              // Xác định quyền bình luận nếu bài đăng thuộc về một nhóm
              const groupInfo = p.group || null;
              if (!groupInfo) {
                return (
                  <CommentSection
                    postId={p._id}
                    initialComments={data.comments || []}
                    user={user}
                    onCommentCountChange={handleCommentCountChange}
                  />
                );
              }

              // Ưu tiên ngữ cảnh nhóm được tìm nạp; nếu không có sẵn, hãy cho phép bình luận để tránh chặn UX
              const setting = groupCtx?.settings?.commentPermissions || 'all_members';
              const role = groupCtx?.userRole || null;
              const userIsAdmin = role === 'owner' || role === 'admin';
              const userIsMember = !!role;

              let canComment = true;
              if (setting === 'admins_only') canComment = userIsAdmin;
              else if (setting === 'members_only') canComment = userIsMember;
              else canComment = userIsMember || true; // 'all_members'

              if (canComment) {
                return (
                  <CommentSection
                    postId={p._id}
                    initialComments={data.comments || []}
                    user={user}
                    onCommentCountChange={handleCommentCountChange}
                  />
                );
              }
              return (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
                  Chỉ quản trị viên được phép bình luận trong nhóm này.
                </div>
              );
            })()}
          </div>
        </div>

        {/* Media modal carousel */}
        {showMediaModal && allMedia.length > 0 && (
          <div
            className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-2 sm:p-4"
            onClick={() => setShowMediaModal(false)}
            data-media-viewer
          >
            <div className="relative max-w-full max-h-full flex items-center w-full h-full">
              {/* Close */}
              <button
                onClick={() => setShowMediaModal(false)}
                className="absolute top-2 sm:top-4 right-2 sm:right-4 bg-black bg-opacity-70 hover:bg-opacity-90 text-white p-2.5 sm:p-2 rounded-full z-10 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Đóng"
              >
                <X size={20} className="sm:w-5 sm:h-5" />
              </button>

              {/* Prev */}
              {currentIndex > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex((i) => i - 1);
                  }}
                  className="absolute left-2 sm:left-4 bg-black bg-opacity-70 hover:bg-opacity-90 text-white p-3 sm:p-3 rounded-full z-10 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center text-2xl sm:text-3xl"
                  aria-label="Ảnh trước"
                >
                  ‹
                </button>
              )}

              {/* Content */}
              <div className="max-w-full max-h-full w-full h-full flex items-center justify-center">
                {allMedia[currentIndex].type === "video" ? (
                  <video
                    src={allMedia[currentIndex].url}
                    controls
                    autoPlay
                    playsInline
                    className="max-w-full max-h-[90vh] sm:max-h-[80vh] object-contain rounded-lg"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <img
                    src={allMedia[currentIndex].url}
                    alt={`media-${currentIndex}`}
                    className="max-w-full max-h-[90vh] sm:max-h-[80vh] object-contain rounded-lg"
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
              </div>

              {/* Next */}
              {currentIndex < allMedia.length - 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex((i) => i + 1);
                  }}
                  className="absolute right-2 sm:right-4 bg-black bg-opacity-70 hover:bg-opacity-90 text-white p-3 sm:p-3 rounded-full z-10 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center text-2xl sm:text-3xl"
                  aria-label="Ảnh sau"
                >
                  ›
                </button>
              )}

              {/* Indicator dots for mobile */}
              {allMedia.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                  {allMedia.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentIndex(idx);
                      }}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all touch-manipulation",
                        idx === currentIndex
                          ? "bg-white w-6"
                          : "bg-white/50 hover:bg-white/75"
                      )}
                      aria-label={`Xem ảnh ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div >
  );
}
