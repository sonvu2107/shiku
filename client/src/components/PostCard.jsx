import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Calendar, MessageCircle, Lock, Globe, ThumbsUp, Users, Bookmark, BookmarkCheck, MoreHorizontal, Edit, Trash2, BarChart3, Eye } from "lucide-react";
import { api } from "../api";
import { deduplicatedApi } from "../utils/requestDeduplication.js";
import UserName from "./UserName";
import VerifiedBadge from "./VerifiedBadge";
import ComponentErrorBoundary from "./ComponentErrorBoundary";
import LazyImage from "./LazyImageSimple";
import Poll from "./Poll";

/**
 * PostCard - Component hiển thị preview của một blog post
 * Bao gồm media, title, metadata, emotes và action buttons
 * @param {Object} post - Dữ liệu bài viết
 * @param {string} post._id - ID của post
 * @param {string} post.title - Tiêu đề
 * @param {string} post.slug - URL slug
 * @param {Object} post.author - Thông tin tác giả
 * @param {Array} post.emotes - Danh sách emotes
 * @param {Array} post.files - Media files đính kèm
 * @param {string} post.status - Trạng thái (công khai/riêng tư)
 */
export default function PostCard({
  post,
  user,
  hidePublicIcon = false,
  hideActionsMenu = false,
  isSaved: isSavedProp,
  onSavedChange,
  skipSavedStatusFetch = false
}) {
  // ==================== STATE & REFS ====================
  const navigate = useNavigate();
  // Note: User data should be passed as prop or obtained from context
  // const user = JSON.parse(localStorage.getItem("user") || "null"); // Deprecated
  const [showEmotePopup, setShowEmotePopup] = useState(false); // Hiện popup emotes
  const [showActionsMenu, setShowActionsMenu] = useState(false); // Hiện menu actions
  const emotePopupTimeout = useRef(); // Timeout cho hover emote popup
  const actionsMenuTimeout = useRef(); // Timeout cho actions menu

  // ==================== CONSTANTS ====================
  
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

  // ==================== HELPER FUNCTIONS ====================
  
  /**
   * Lấy media để hiển thị (ưu tiên coverUrl → file đầu tiên)
   * @returns {Object|null} Media object với url và type
   */
  const getDisplayMedia = () => {
    if (post.coverUrl) {
      // Tìm type của coverUrl trong files
      const found = Array.isArray(post.files)
        ? post.files.find(f => f.url === post.coverUrl)
        : null;
      if (found) return { url: post.coverUrl, type: found.type };
      // Nếu không tìm thấy, mặc định là image
      return { url: post.coverUrl, type: "image" };
    }
    // Fallback về file đầu tiên nếu có
    if (Array.isArray(post.files) && post.files.length > 0) {
      return post.files[0];
    }
    return null;
  };

  // ==================== EVENT HANDLERS ====================
  
  /**
   * Xóa bài viết (chỉ owner hoặc admin)
   */
  async function deletePost() {
    if (!window.confirm("Bạn có chắc muốn xóa bài này?")) return;
    try {
      await api(`/api/posts/${post._id}`, {
      method: "DELETE"
    });
      alert("Đã xóa bài viết.");
      navigate(0); // Reload page
    } catch (e) { 
      alert("Lỗi xóa bài: " + e.message); 
    }
  }

  /**
   * Toggle trạng thái public/private của bài viết
   */
  async function togglePostStatus() {
    const newStatus = post.status === 'private' ? 'published' : 'private';
    const confirmMessage = newStatus === 'private'
      ? "Bạn có chắc muốn chuyển bài viết này thành riêng tư?"
      : "Bạn có chắc muốn công khai bài viết này?";
    
    if (!window.confirm(confirmMessage)) return;
    
    try {
      await api(`/api/posts/${post._id}`, {
      method: "PUT",
      body: { status: newStatus }
    });
      alert(newStatus === 'private' ? "Đã chuyển thành riêng tư" : "Đã công khai bài viết");
      navigate(0); // Reload page
    } catch (e) { 
      alert("Lỗi: " + e.message); 
    }
  }

  // ==================== EMOTE SYSTEM ====================
  
  const [emotesState, setEmotesState] = useState(post.emotes || []); // Local emote state
  const savedPropProvided = typeof isSavedProp === "boolean";
  const [saved, setSaved] = useState(() => (savedPropProvided ? isSavedProp : false));

  // Sync saved state when prop provided via batch hook
  React.useEffect(() => {
    if (savedPropProvided) {
      setSaved(isSavedProp);
    }
  }, [isSavedProp, savedPropProvided]);

  // Fallback: fetch saved status only when prop not provided and fetching is allowed
  React.useEffect(() => {
    if (savedPropProvided || skipSavedStatusFetch) {
      return undefined;
    }

    let active = true;
    (async () => {
      try {
        const res = await api(`/api/posts/${post._id}/is-saved`);
        if (active) setSaved(!!res.saved);
      } catch (_) {}
    })();
    return () => {
      active = false;
    };
  }, [post._id, savedPropProvided, skipSavedStatusFetch]);

  /**
   * Thêm/xóa emote cho bài viết
   * @param {string} emote - Loại emote (emoji)
   */
  async function emote(emote) {
    try {
      const res = await api(`/api/posts/${post._id}/emote`, {
      method: "POST",
      body: { emote }
    });
      if (res.emotes) {
        setEmotesState(res.emotes); // Cập nhật local state
      }
    } catch (e) {
      alert(e.message);
    }
  }

  async function toggleSave() {
    try {
      const res = await api(`/api/posts/${post._id}/save`, {
        method: "POST",
        body: {}
      });
      const nextState = !!res.saved;
      setSaved(nextState);
      if (typeof onSavedChange === "function") {
        onSavedChange(post._id, nextState);
      }
    } catch (e) {
      alert(e.message || "Không thể lưu bài viết");
    }
  }

  /**
   * Đếm số lượng từng loại emote
   * @returns {Object} Object với key là emote và value là số lượng
   */
  function countEmotes() {
    const counts = {};
    if (!emotesState) return counts;
    
    // Khởi tạo counts cho tất cả emotes
    for (const emo of emotes) counts[emo] = 0;
    
    // Đếm emotes từ state
    for (const e of emotesState) {
      if (counts[e.type] !== undefined) counts[e.type]++;
    }
    return counts;
  }
  
  const counts = countEmotes();
  const totalEmotes = Object.values(counts).reduce((a, b) => a + b, 0);

  const displayMedia = getDisplayMedia();

  return (
    <ComponentErrorBoundary>
      <div className="bg-white dark:bg-[#18191A] border border-gray-200 dark:border-[#3A3B3C] rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-visible">
      {/* HEADER */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link to={`/user/${post.author?._id}`} className="flex-shrink-0">
            <img
              src={post.author?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author?.name || '')}&length=2&background=cccccc&color=222222&size=40`}
              alt={post.author?.name}
              className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700"
            />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-1 font-semibold text-gray-900 dark:text-gray-100 leading-tight">
              <UserName user={post.author} maxLength={20} />
              <VerifiedBadge user={post.author} />
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
              <span>{new Date(post.createdAt).toLocaleDateString('vi-VN')}</span>
              {post.status === 'private' ? (
                <Lock size={12} className="text-gray-400" />
              ) : (
                !hidePublicIcon && <Globe size={12} className="text-green-500" />
              )}
            </div>
          </div>
        </div>
        <button
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
          onClick={() => setShowActionsMenu(!showActionsMenu)}
          title="Tùy chọn"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>
      {/* CAPTION */}
      <div className="px-4 pb-1 text-gray-800 dark:text-gray-300">
        <Link to={`/post/${post.slug}`} className="hover:underline">
          <p className="text-[15px] leading-snug font-medium mb-1">
            {post.title}
          </p>
        </Link>
        {post.caption && (
          <p className="text-[14px] text-gray-700 dark:text-gray-400 leading-relaxed line-clamp-4">
            {post.caption}
          </p>
        )}
      </div>

      {displayMedia && (
        <div className="w-full relative rounded-xl overflow-hidden">
          {displayMedia.type === "video" ? (
            <video
              src={displayMedia.url}
              controls
              className="w-full max-h-[600px] object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                const placeholder = document.createElement('div');
                placeholder.className = 'w-full h-64 bg-gray-200 dark:bg-gray-700 flex items-center justify-center';
                placeholder.innerHTML = '<div class="text-gray-500 dark:text-gray-400 text-sm">Video không thể tải</div>';
                e.target.parentNode.appendChild(placeholder);
              }}
            />
          ) : (
            <LazyImage
              src={displayMedia.url}
              alt={post.title}
              className="w-full max-h-[600px] object-cover"
            />
          )}
        </div>
      )}

      {/* Emote bar */}
      <div className="flex justify-between items-center px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-[#3A3B3C]">
        <div className="flex items-center gap-1">
          {Object.entries(counts)
            .filter(([_, count]) => count > 0)
            .slice(0, 3)
              .map(([emo]) => (
              <img 
                key={emo} 
                src={`/assets/${emoteMap[emo]}`} 
                alt={emo} 
                className="w-6 h-6 sm:w-7 sm:h-7 inline-block"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            ))}
          {totalEmotes > 0 && (
            <span className="ml-1 font-bold text-[15px] sm:text-[16px]">{totalEmotes.toLocaleString()}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Eye size={16} />
          <span>{(post.views || 0).toLocaleString()} lượt xem</span>
        </div>
      </div>

      {/* Poll display - show poll above action buttons */}
      {post.hasPoll && (
        <div className="py-2 border-b border-gray-200">
          <Poll post={post} user={user} />
        </div>
      )}

      {/* ACTION BAR */}
      <div className="flex justify-around py-2 border-t border-gray-200 dark:border-[#3A3B3C]">
        <div
          className="relative w-full flex justify-center"
          onMouseEnter={() => {
            if (emotePopupTimeout.current) clearTimeout(emotePopupTimeout.current);
            setShowEmotePopup(true);
          }}
          onMouseLeave={() => {
            emotePopupTimeout.current = setTimeout(() => setShowEmotePopup(false), 1500);
          }}
        >
          <button
            type="button"
            onClick={() => setShowEmotePopup(true)}
            className="flex items-center gap-2 w-full justify-center py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition text-gray-700 dark:text-gray-300"
          >
            <ThumbsUp size={20} />
            <span>Thích</span>
          </button>
          {showEmotePopup && (
            <div
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 emote-picker bg-white rounded-xl shadow z-10 border border-gray-200"
              style={{ justifyContent: "center" }}
              onMouseEnter={() => {
                if (emotePopupTimeout.current) clearTimeout(emotePopupTimeout.current);
                setShowEmotePopup(true);
              }}
              onMouseLeave={() => {
                emotePopupTimeout.current = setTimeout(() => setShowEmotePopup(false), 1500);
              }}
            >
              {emotes.map(e => (
                <button key={e} className="emote-btn" type="button" onClick={() => { emote(e); setShowEmotePopup(false); }}>
                  <img 
                    src={`/assets/${emoteMap[e]}`} 
                    alt={e} 
                    className="emote"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          className="flex items-center gap-2 w-full justify-center py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition text-gray-700 dark:text-gray-300"
          type="button"
          onClick={() => navigate(`/post/${post.slug}`)}
        >
          <MessageCircle size={20} />
          <span>Bình luận</span>
        </button>
        <button
          className="flex items-center gap-2 w-full justify-center py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition text-gray-700 dark:text-gray-300"
          type="button"
          onClick={toggleSave}
        >
          {saved ? (
            <BookmarkCheck size={20} className="text-blue-500" />
          ) : (
            <Bookmark size={20} />
          )}
          <span>{saved ? "Đã lưu" : "Lưu"}</span>
        </button>
      </div>

      {/* Actions menu for post owner and admin */}
      {!hideActionsMenu && user && (user._id === post.author?._id || user.role === "admin") && (
        <div className="mt-2 pt-2 border-t border-gray-200 flex justify-end">
          <div className="relative">
            <button
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              onMouseEnter={() => {
                if (actionsMenuTimeout.current) clearTimeout(actionsMenuTimeout.current);
                setShowActionsMenu(true);
              }}
              onMouseLeave={() => {
                actionsMenuTimeout.current = setTimeout(() => setShowActionsMenu(false), 200);
              }}
            >
              <MoreHorizontal size={16} />
            </button>
            
            {showActionsMenu && (
              <div
                className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[160px]"
                onMouseEnter={() => {
                  if (actionsMenuTimeout.current) clearTimeout(actionsMenuTimeout.current);
                  setShowActionsMenu(true);
                }}
                onMouseLeave={() => {
                  actionsMenuTimeout.current = setTimeout(() => setShowActionsMenu(false), 200);
                }}
              >
                <div className="py-1">
                  <button
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowActionsMenu(false);
                      navigate(`/edit-post/${post.slug}`);
                    }}
                  >
                    <Edit size={14} />
                    Chỉnh sửa
                  </button>
                  
                  <button
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowActionsMenu(false);
                      togglePostStatus();
                    }}
                  >
                    {post.status === 'private' ? (
                      <>
                        <Globe size={14} />
                        Công khai
                      </>
                    ) : (
                      <>
                        <Lock size={14} />
                        Riêng tư
                      </>
                    )}
                  </button>
                  
                  <button
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowActionsMenu(false);
                      deletePost();
                    }}
                  >
                    <Trash2 size={14} />
                    Xóa
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </ComponentErrorBoundary>
  );
}


