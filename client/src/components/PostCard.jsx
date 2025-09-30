import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Calendar, Eye, MessageCircle, Lock, Globe, ThumbsUp, Users, Bookmark, BookmarkCheck } from "lucide-react";
import { api } from "../api";
import { deduplicatedApi } from "../utils/requestDeduplication.js";
import UserName from "./UserName";
import ComponentErrorBoundary from "./ComponentErrorBoundary";
import LazyImage from "./LazyImage";

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
 * @param {string} post.status - Trạng thái (published/private)
 */
export default function PostCard({ post, user, hidePublicIcon = false }) {
  // ==================== STATE & REFS ====================
  const navigate = useNavigate();
  // Note: User data should be passed as prop or obtained from context
  // const user = JSON.parse(localStorage.getItem("user") || "null"); // Deprecated
  const [showEmotePopup, setShowEmotePopup] = useState(false); // Hiện popup emotes
  const emotePopupTimeout = useRef(); // Timeout cho hover emote popup

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
      await deduplicatedApi(`/api/posts/${post._id}`, { method: "DELETE" });
      alert("Đã xóa bài viết.");
      navigate(0); // Reload page
    } catch (e) { 
      alert("Lỗi xóa bài"); 
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
      await deduplicatedApi(`/api/posts/${post._id}`, { 
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
  const [saved, setSaved] = useState(false);

  // Load saved state
  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api(`/api/posts/${post._id}/is-saved`);
        if (active) setSaved(!!res.saved);
      } catch (_) {}
    })();
    return () => { active = false; };
  }, [post._id]);

  /**
   * Thêm/xóa emote cho bài viết
   * @param {string} emote - Loại emote (emoji)
   */
  async function emote(emote) {
    try {
      const res = await deduplicatedApi(`/api/posts/${post._id}/emote`, { 
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
      const res = await api(`/api/posts/${post._id}/save`, { method: "POST" });
      setSaved(!!res.saved);
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
      <div className="card relative flex flex-col gap-2 post-card-mobile">
      {/* Save icon button (top-right) */}
      <button
        className="group absolute z-10 top-2 right-2 sm:top-3 sm:right-3 w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-white/90 hover:bg-white border border-gray-200 shadow active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-300 touch-manipulation dark:bg-gray-800/80 dark:hover:bg-gray-800 dark:border-gray-700"
        type="button"
        onClick={toggleSave}
        title={saved ? "Bỏ lưu" : "Lưu bài"}
        aria-label={saved ? "Bỏ lưu" : "Lưu bài"}
        aria-pressed={saved}
      >
        {saved ? (
          <BookmarkCheck size={20} className="text-blue-600 dark:text-blue-400 transition-colors group-hover:text-blue-700 dark:group-hover:text-blue-300" />
        ) : (
          <Bookmark size={20} className="text-gray-700 dark:text-gray-200 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-300" />
        )}
      </button>
      {displayMedia && (
        <div className="w-full aspect-[16/10] sm:aspect-[16/10] aspect-ratio overflow-hidden rounded-xl">
          {displayMedia.type === "video" ? (
            <video 
              src={displayMedia.url} 
              className="w-full h-full object-cover"
              controls
            />
          ) : (
            <LazyImage 
              src={displayMedia.url} 
              alt="" 
              className="w-full h-full hover:scale-105 transition-transform duration-300" 
            />
          )}
        </div>
      )}
      <Link to={`/post/${post.slug}`} className="post-title-mobile text-xl font-semibold hover:underline flex items-center gap-2 pr-14 sm:pr-16">
        {post.title}
        {post.status === 'private' ? (
          <Lock size={16} className="text-gray-500" title="Bài viết riêng tư - chỉ bạn xem được" />
        ) : !hidePublicIcon && (
          <Globe size={16} className="text-green-500" title="Bài viết công khai" />
        )}
      </Link>
      <div className="post-meta-mobile flex items-center gap-4 text-sm text-gray-600 pr-14 sm:pr-16">
        <Link 
          to={`/user/${post.author?._id}`}
          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
        >
          <User size={14} />
          <UserName user={post.author} />
        </Link>
        {post.group && (
          <Link 
            to={`/groups/${post.group._id}`}
            className="flex items-center gap-1 hover:text-blue-600 transition-colors"
          >
            <Users size={14} />
            <span>{post.group.name}</span>
          </Link>
        )}
        <span className="flex items-center gap-1">
          <Calendar size={14} />
          {new Date(post.createdAt).toLocaleDateString()}
        </span>
        <span className="flex items-center gap-1">
          <Eye size={14} />
          {post.views || 0}
        </span>
      </div>

      {/* Emote bar */}
      <div className="flex items-center justify-between py-2 border-b border-gray-200">
        <div className="flex items-center gap-1">
          {Object.entries(counts)
            .filter(([_, count]) => count > 0)
            .slice(0, 2)
              .map(([emo]) => (
              <img key={emo} src={`/assets/${emoteMap[emo]}`} alt={emo} className="emote inline-block align-middle" />
            ))}
          {totalEmotes > 0 && (
            <span className="ml-1 font-semibold text-gray-800 ">{totalEmotes.toLocaleString()}</span>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between py-2">
        <div
          className="relative inline-block"
          onMouseEnter={() => {
            if (emotePopupTimeout.current) clearTimeout(emotePopupTimeout.current);
            setShowEmotePopup(true);
          }}
          onMouseLeave={() => {
            emotePopupTimeout.current = setTimeout(() => setShowEmotePopup(false), 400);
          }}
        >
          <button className="btn-outline flex items-center gap-2" type="button" onClick={() => setShowEmotePopup(true)}> 
            <ThumbsUp size={18} />
            <span>Thích</span>
          </button>
          {showEmotePopup && (
            <div
              className="absolute bottom-full left-0 mb-2 emote-picker bg-white rounded-xl shadow z-10 border border-gray-200"
              style={{ justifyContent: "center" }}
            >
              {emotes.map(e => (
                <button key={e} className="emote-btn" type="button" onClick={() => { emote(e); setShowEmotePopup(false); }}>
                  <img src={`/assets/${emoteMap[e]}`} alt={e} className="emote" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-outline flex items-center gap-2"
            type="button"
            onClick={() => navigate(`/post/${post.slug}`)}
          >
            <MessageCircle size={18} />
            <span>Bình luận</span>
          </button>
        </div>
      </div>

      {/* Action buttons for post owner and admin */}
      {user && (user._id === post.author?._id || user.role === "admin") && (
        <div className="mt-2 pt-2 border-t border-gray-200 flex gap-2">
          <button 
            className="text-xs bg-gray-100 hover:bg-gray-200 rounded px-2 py-1 flex items-center gap-1 transition-colors"
            onClick={(e) => {
              e.preventDefault();
              togglePostStatus();
            }}
          >
            {post.status === 'private' ? (
              <>
                <Globe size={12} />
                Công khai
              </>
            ) : (
              <>
                <Lock size={12} />
                Riêng tư
              </>
            )}
          </button>
          <button 
            className="text-xs bg-red-100 hover:bg-red-200 text-red-600 rounded px-2 py-1 transition-colors"
            onClick={(e) => {
              e.preventDefault();
              deletePost();
            }}
          >
            Xóa
          </button>
        </div>
      )}
      </div>
    </ComponentErrorBoundary>
  );
}
