import React, { useState, useRef, useEffect, memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Calendar, MessageCircle, Lock, Globe, ThumbsUp, Heart, Users, Bookmark, BookmarkCheck, MoreHorizontal, Edit, Trash2, BarChart3, Eye, Share2, Smile, Send, Paperclip, X, Plus, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api";
import { deduplicatedApi } from "../utils/requestDeduplication.js";
import { getOptimizedImageUrl } from "../utils/imageOptimization";
import UserName from "./UserName";
import VerifiedBadge from "./VerifiedBadge";
import ComponentErrorBoundary from "./ComponentErrorBoundary";
import LazyImage from "./LazyImageSimple";
import Poll from "./Poll";
import { useToast } from "./Toast";

/**
 * Danh sách emoji để chọn trong comment
 */
const EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
  '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
  '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
  '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
  '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
  '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯',
  '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
  '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
  '👆', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌',
  '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '💔',
  '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'
];

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
function PostCard({
  post,
  user,
  hidePublicIcon = false,
  hideActionsMenu = false,
  isSaved: isSavedProp,
  onSavedChange,
  onPostUpdate,
  skipSavedStatusFetch = false
}) {
  const { showSuccess, showError } = useToast();
  // ==================== STATE & REFS ====================
  const navigate = useNavigate();
  // Note: User data should be passed as prop or obtained from context
  // const user = JSON.parse(localStorage.getItem("user") || "null"); // Deprecated
  const [showEmotePopup, setShowEmotePopup] = useState(false); // Hiện popup emotes
  const [showMainMenu, setShowMainMenu] = useState(false); // Hiện menu actions ở header
  const [showOwnerMenu, setShowOwnerMenu] = useState(false); // Hiện menu actions cho owner/admin
  const emotePopupTimeout = useRef(); // Timeout cho hover emote popup
  const actionsMenuTimeout = useRef(); // Timeout cho actions menu
  const mainMenuRef = useRef(null); // Ref cho menu dropdown ở header
  const ownerMenuRef = useRef(null); // Ref cho menu dropdown ở cuối (owner/admin)
  const mainMenuButtonRef = useRef(null); // Ref cho button mở menu ở header
  const [commentInput, setCommentInput] = useState(""); // Comment input text
  const [commentImages, setCommentImages] = useState([]); // Comment images
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); // Show emoji picker
  const [commentLoading, setCommentLoading] = useState(false); // Comment loading state
  const commentInputRef = useRef(null); // Ref for comment input
  const emojiPickerRef = useRef(null); // Ref for emoji picker
  const fileInputRef = useRef(null); // Ref for file input

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
  const [savedCount, setSavedCount] = useState(post.savedCount || 0); // Số lượng đã lưu
  const savedPropProvided = typeof isSavedProp === "boolean";
  const [saved, setSaved] = useState(() => (savedPropProvided ? isSavedProp : false));

  // Sync saved state when prop provided via batch hook
  React.useEffect(() => {
    if (savedPropProvided) {
      setSaved(isSavedProp);
    }
  }, [isSavedProp, savedPropProvided]);

  // Sync emotesState when post.emotes changes (from parent updates)
  React.useEffect(() => {
    if (post.emotes) {
      // Đảm bảo emotes là array và có cấu trúc đúng
      const normalizedEmotes = Array.isArray(post.emotes) 
        ? post.emotes.map(e => {
            // Normalize emote structure - đảm bảo user có thể là object hoặc ID
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

  // Sync savedCount when post.savedCount changes (from parent updates)
  React.useEffect(() => {
    if (typeof post.savedCount === 'number') {
      setSavedCount(post.savedCount);
    } else if (post.savedCount === undefined || post.savedCount === null) {
      // Nếu không có savedCount từ server, chỉ set về 0 khi post mới được load (post._id thay đổi)
      // Giữ nguyên giá trị hiện tại khi toggle để tránh flicker
      setSavedCount(prev => prev === undefined ? 0 : prev);
    }
  }, [post.savedCount, post._id]); // Thêm post._id để sync khi post object thay đổi

  // Lấy cảm xúc user đã thả
  const getUserEmote = React.useMemo(() => {
    // Kiểm tra user và user._id một cách chặt chẽ
    if (!user || typeof user !== 'object') return null;
    // Hỗ trợ cả _id và id
    const currentUserRawId = user._id ?? user.id;
    if (!currentUserRawId) return null;
    if (!emotesState || !Array.isArray(emotesState) || emotesState.length === 0) return null;
    
    // Normalize currentUserId - có thể là string hoặc ObjectId
    let currentUserId;
    if (typeof currentUserRawId === 'string') {
      currentUserId = currentUserRawId;
    } else if (currentUserRawId && currentUserRawId.toString) {
      currentUserId = currentUserRawId.toString();
    } else {
      return null;
    }
    
    // Tìm emote của user hiện tại
    const userEmote = emotesState.find(e => {
      if (!e || !e.user || !e.type) return false;
      
      // Lấy userId từ emote.user - xử lý nhiều trường hợp
      let userId = null;
      
      if (typeof e.user === 'string') {
        // Trường hợp 1: user là string ID
        userId = e.user;
      } else if (typeof e.user === 'object' && e.user !== null) {
        // Trường hợp 2: user là object
        if (e.user._id) {
          // Đã được populate - có _id
          if (typeof e.user._id === 'string') {
            userId = e.user._id;
          } else if (e.user._id.toString) {
            userId = e.user._id.toString();
          }
        } else if (e.user.toString && typeof e.user.toString === 'function') {
          // Mongoose ObjectId chưa populate - có method toString()
          userId = e.user.toString();
        } else {
          // Thử các cách khác
          userId = e.user.id || (e.user.toString ? e.user.toString() : null);
        }
      }
      
      // So sánh userId với currentUserId
      if (!userId) return false;
      
      try {
        // Convert cả hai về string để so sánh
        const userIdStr = String(userId);
        const currentUserIdStr = String(currentUserId);
        return userIdStr === currentUserIdStr;
      } catch (error) {
        return false;
      }
    });
    
    return userEmote && userEmote.type ? userEmote.type : null;
  }, [user, emotesState]);
  
  const userEmote = getUserEmote;
  // Local UI emote to reflect selection immediately even if `user` prop is missing
  const [localUserEmote, setLocalUserEmote] = useState(null);
  const uiUserEmote = localUserEmote !== null ? localUserEmote : userEmote;
  
  // Heart animation state
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const heartAnimationKey = useRef(0);

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
   * Logic: 
   * - Nếu user đã có emote với type này -> xóa (toggle off)
   * - Nếu user chưa có emote với type này -> xóa tất cả emotes cũ và thêm emote mới
   * @param {string} emoteType - Loại emote (emoji: 👍, ❤️, 😂, 😮, 😢, 😡)
   */
  async function emote(emoteType) {
    // Trigger heart animation if liking (👍) or loving (❤️) and user didn't have this emote before
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
        // Cập nhật local state với cảm xúc mới từ server
        setEmotesState(res.emotes);
        
        // Đóng popup sau khi thả cảm xúc
        setShowEmotePopup(false);
        if (emotePopupTimeout.current) {
          clearTimeout(emotePopupTimeout.current);
        }
      }
    } catch (e) {
      // Hiển thị lỗi nếu có
      const errorMessage = e?.message || 'Không thể thêm cảm xúc. Vui lòng thử lại.';
      alert(errorMessage);
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
      
      // Update số lượng saved từ API response
      if (typeof res.savedCount === 'number') {
        setSavedCount(res.savedCount);
        // Cập nhật savedCount trong post object từ parent nếu có callback
        if (typeof onPostUpdate === "function") {
          onPostUpdate(post._id, { savedCount: res.savedCount });
        }
      } else {
        // Fallback: update local state nếu API không trả về savedCount
        const newCount = nextState ? savedCount + 1 : Math.max(0, savedCount - 1);
        setSavedCount(newCount);
        // Cập nhật savedCount trong post object từ parent nếu có callback
        if (typeof onPostUpdate === "function") {
          onPostUpdate(post._id, { savedCount: newCount });
        }
      }
      
      if (typeof onSavedChange === "function") {
        onSavedChange(post._id, nextState);
      }
    } catch (e) {
      alert(e.message || "Không thể lưu bài viết");
    }
  }

  /**
   * Xử lý submit comment - tái sử dụng logic từ CommentSection
   */
  async function handleCommentSubmit(e) {
    e.preventDefault();
    if ((!commentInput.trim() && commentImages.length === 0) || !user) return;
    
    setCommentLoading(true);
    try {
      let requestBody;
      
      if (commentImages.length > 0) {
        // Có ảnh - sử dụng FormData (giống CommentSection)
        const formData = new FormData();
        formData.append('content', commentInput.trim());
        
        // Add images to form data
        commentImages.forEach((image) => {
          formData.append('files', image.file);
        });
        
        requestBody = formData;
      } else {
        // Không có ảnh - sử dụng JSON
        requestBody = { content: commentInput.trim() };
      }

      await api(`/api/comments/post/${post._id}`, {
        method: "POST",
        body: requestBody
      });
      
      // Reset form
      setCommentInput("");
      commentImages.forEach(img => img.preview && URL.revokeObjectURL(img.preview));
      setCommentImages([]);
      setShowEmojiPicker(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      // Navigate to post detail to see the comment
      navigate(`/post/${post.slug}`);
    } catch (e) {
      alert(e.message || "Không thể gửi bình luận");
    } finally {
      setCommentLoading(false);
    }
  }

  /**
   * Chèn emoji vào comment input
   */
  function insertEmoji(emoji) {
    const input = commentInputRef.current;
    if (input) {
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const text = commentInput;
      const newText = text.substring(0, start) + emoji + text.substring(end);
      setCommentInput(newText);
      
      // Set cursor position after emoji
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      setCommentInput(prev => prev + emoji);
    }
  }

  /**
   * Xử lý chọn file ảnh - tái sử dụng logic từ CommentImageUpload
   */
  function handleImageSelect(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const maxImages = 5;
    const newFiles = Array.from(files).slice(0, maxImages - commentImages.length);
    
    // Validate files (logic từ CommentImageUpload)
    const validFiles = newFiles.filter(file => {
      if (!file.type.startsWith('image/')) {
        alert(`File ${file.name} không phải là hình ảnh`);
        return false;
      }
      
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        alert(`File ${file.name} quá lớn. Kích thước tối đa là 5MB`);
        return false;
      }
      
      return true;
    });

    if (validFiles.length === 0) return;

    // Create preview URLs (logic từ CommentImageUpload)
    const newImages = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substr(2, 9)
    }));

    setCommentImages(prev => [...prev, ...newImages]);
  }

  /**
   * Xóa ảnh khỏi preview - tái sử dụng logic từ CommentImageUpload
   */
  function removeImage(id) {
    const imageToRemove = commentImages.find(img => img.id === id);
    if (imageToRemove) {
      URL.revokeObjectURL(imageToRemove.preview);
    }
    
    const newImages = commentImages.filter(img => img.id !== id);
    setCommentImages(newImages);
  }

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showEmojiPicker && emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        if (!event.target.closest('.emoji-picker-button')) {
          setShowEmojiPicker(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  // Close actions menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Xử lý menu header
      if (showMainMenu && mainMenuRef.current) {
        const insideMain = mainMenuRef.current.contains(event.target);
        const onMainButton = mainMenuButtonRef.current && mainMenuButtonRef.current.contains(event.target);
        if (!insideMain && !onMainButton) {
          setShowMainMenu(false);
        }
      }

      // Xử lý menu owner/admin
      if (showOwnerMenu && ownerMenuRef.current) {
        const insideOwner = ownerMenuRef.current.contains(event.target);
        const onOwnerButton = event.target.closest('button[aria-label="Tùy chọn bài viết"]');
        if (!insideOwner && !onOwnerButton) {
          setShowOwnerMenu(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showMainMenu, showOwnerMenu]);

  // Close emote popup when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Chỉ áp dụng trên mobile
      if (window.innerWidth < 768 && showEmotePopup) {
        // Kiểm tra nếu click bên ngoài cả button và popup
        const isClickInsideButton = event.target.closest('[role="button"][aria-label="Thả cảm xúc"]');
        const isClickInsidePopup = event.target.closest('.emote-picker');
        if (!isClickInsideButton && !isClickInsidePopup) {
          setShowEmotePopup(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showEmotePopup]);

  // State for interest status
  const [interestStatus, setInterestStatus] = useState(null); // null = chưa biết, true = quan tâm, false = không quan tâm
  const [interestLoading, setInterestLoading] = useState(false);

  // Fetch interest status on mount
  React.useEffect(() => {
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

  /**
   * Handle "Quan tâm" / "Không quan tâm" functionality
   */
  const handleInterested = async (interested) => {
    if (!user || !user._id) {
      showError('Vui lòng đăng nhập để sử dụng tính năng này');
      return;
    }

    // Không cho phép đánh dấu bài viết của chính mình
    if (user._id === post.author?._id) {
      showError('Bạn không thể đánh dấu quan tâm/không quan tâm bài viết của chính mình');
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
      const errorMessage = error.message || 'Có lỗi xảy ra khi cập nhật';
      showError(errorMessage);
    } finally {
      setInterestLoading(false);
    }
  };

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      commentImages.forEach(img => {
        if (img.preview) URL.revokeObjectURL(img.preview);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Lấy role/title để hiển thị dưới username
   */
  function getAuthorRole() {
    const author = post.author;
    if (!author) return null;
    
    // Ưu tiên bio nếu có
    if (author.bio && author.bio.trim()) {
      return author.bio.trim();
    }
    
    // Nếu có role object với displayName
    if (author.role && typeof author.role === 'object' && author.role.displayName) {
      return author.role.displayName;
    }
    
    // Nếu có role string và không phải là "user" hoặc "admin"
    if (author.role && typeof author.role === 'string' && author.role !== 'user' && author.role !== 'admin') {
      return author.role;
    }
    
    return null;
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
              width={40}
              height={40}
              className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700"
              loading="lazy"
            />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-1 font-semibold text-gray-900 dark:text-gray-100 leading-tight">
              <UserName user={post.author} maxLength={20} />
              <VerifiedBadge user={post.author} />
            </div>
            {/* Hiển thị thời gian + icon privacy ngoài Home, role trong group */}
            {!post.groupId ? (
              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                {post.createdAt && (
                  <span title={formatFullDate(post.createdAt)}>
                    {formatTimeAgo(post.createdAt)}
                  </span>
                )}
                {!hidePublicIcon && post.status && (
                  post.status === "private" ? (
                    <Lock size={14} className="text-gray-400" />
                  ) : (
                    <Globe size={14} className="text-green-500" />
                  )
                )}
              </div>
            ) : (
              getAuthorRole() && (
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {getAuthorRole()}
                </div>
              )
            )}
          </div>
        </div>
        <div className="relative z-10">
          <button
            ref={mainMenuButtonRef}
            type="button"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 relative z-10"
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
            <MoreHorizontal size={18} />
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
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors flex items-start gap-3 group ${interestStatus === true ? 'bg-blue-50 dark:bg-blue-900/20' : ''} ${interestLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
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
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
                        interestStatus === true 
                          ? 'bg-blue-100 dark:bg-blue-800 border-blue-300 dark:border-blue-600' 
                          : 'bg-gray-100 dark:bg-neutral-700 border-gray-200 dark:border-neutral-600 group-hover:bg-gray-200 dark:group-hover:bg-neutral-600'
                      }`}>
                        <Plus size={16} className={interestStatus === true ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-semibold text-sm mb-0.5 ${
                          interestStatus === true 
                            ? 'text-blue-600 dark:text-blue-400' 
                            : 'text-gray-900 dark:text-white'
                        }`}>
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
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors flex items-start gap-3 group border-t border-gray-100 dark:border-neutral-700 ${interestStatus === false ? 'bg-red-50 dark:bg-red-900/20' : ''} ${interestLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
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
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
                        interestStatus === false 
                          ? 'bg-red-100 dark:bg-red-800 border-red-300 dark:border-red-600' 
                          : 'bg-gray-100 dark:bg-neutral-700 border-gray-200 dark:border-neutral-600 group-hover:bg-gray-200 dark:group-hover:bg-neutral-600'
                      }`}>
                        <Minus size={16} className={interestStatus === false ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-semibold text-sm mb-0.5 ${
                          interestStatus === false 
                            ? 'text-red-600 dark:text-red-400' 
                            : 'text-gray-900 dark:text-white'
                        }`}>
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
      {/* CAPTION */}
      <div className="px-4 pb-2 text-gray-800 dark:text-gray-300">
        <Link to={`/post/${post.slug}`} className="hover:underline">
          <p className="text-[15px] leading-snug font-medium mb-1">
            {post.title}
          </p>
        </Link>
        {post.caption && (
          <p className="text-[14px] text-gray-700 dark:text-gray-400 leading-relaxed mb-2">
            {post.caption}
          </p>
        )}
        {/* Hashtags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {post.tags.map((tag, index) => (
              <Link
                key={index}
                to={`/explore?q=${encodeURIComponent(tag)}`}
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}
      </div>

      {displayMedia && (
        <div className="px-4 pb-2">
          <div className="w-full relative rounded-lg overflow-hidden">
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
              src={getOptimizedImageUrl(displayMedia.url, 600)}
              alt={post.title}
              className="w-full max-h-[600px] object-cover"
            />
          )}
          </div>
        </div>
      )}

      {/* Poll display - show poll above metrics */}
      {post.hasPoll && (
        <div className="px-4 py-2 border-b border-gray-200 dark:border-[#3A3B3C]">
          <Poll post={post} user={user} />
        </div>
      )}

      {/* METRICS ROW */}
      <div className="relative px-3 md:px-4 py-2.5 md:py-3 border-b border-gray-200 dark:border-[#3A3B3C]">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 gap-2 md:gap-0">
          <div
            className={`relative flex items-center gap-1 md:gap-1.5 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200 transition-colors ${uiUserEmote ? 'font-semibold text-blue-600 dark:text-blue-400' : ''}`}
            role="button"
            tabIndex={0}
            aria-label="Thả cảm xúc"
            title={uiUserEmote ? "Bỏ cảm xúc" : "Thả cảm xúc"}
            onMouseEnter={() => {
              // Chỉ chạy trên desktop (hover)
              if (window.innerWidth >= 768) {
                if (emotePopupTimeout.current) clearTimeout(emotePopupTimeout.current);
                setShowEmotePopup(true);
              }
            }}
            onMouseLeave={() => {
              // Chỉ chạy trên desktop (hover)
              if (window.innerWidth >= 768) {
                emotePopupTimeout.current = setTimeout(() => setShowEmotePopup(false), 1200);
              }
            }}
            onClick={(e) => {
              // Ngăn chặn bubble hoặc điều hướng của parent wrappers/links
              try {
                e.preventDefault();
                e.stopPropagation();
              } catch (_) {}
              // Ngăn click event khi click vào popup hoặc các phần tử bên trong popup
              if (e.target.closest('.emote-picker')) {
                return;
              }
              
              // MOBILE: toggle popup
              if (window.innerWidth < 768) {
                setShowEmotePopup(prev => !prev);
                return;
              }

              // DESKTOP: logic thả emoji như cũ
              if (uiUserEmote) {
                // Nếu đã có cảm xúc, click sẽ bỏ cảm xúc đó (toggle off)
                setLocalUserEmote(null);
                emote(uiUserEmote);
              } else {
                // Nếu chưa có cảm xúc, click sẽ mặc định thả 👍
                setLocalUserEmote('👍');
                emote('👍');
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (uiUserEmote) {
                  setLocalUserEmote(null);
                  emote(uiUserEmote);
                } else {
                  setLocalUserEmote('👍');
                  emote('👍');
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
                  style={{ originX: 0.5, originY: 0.5 }}
                >
                  <Heart 
                    size={32} 
                    className="text-red-500 fill-red-500 drop-shadow-lg"
                  />
                </motion.div>
              )}
            </AnimatePresence>
            {/* Hiển thị cảm xúc user đã thả hoặc icon ThumbsUp mặc định */}
            {uiUserEmote ? (
              <>
                <img 
                  src={`/assets/${emoteMap[uiUserEmote]}`} 
                  alt={uiUserEmote} 
                  width={16}
                  height={16}
                  className="w-5 h-5 md:w-4 md:h-4"
                  loading="lazy"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <span className="hidden md:inline">
                  {uiUserEmote === '👍' && 'Đã thích'}
                  {uiUserEmote === '❤️' && 'Yêu thích'}
                  {uiUserEmote === '😂' && 'Haha'}
                  {uiUserEmote === '😮' && 'Wow'}
                  {uiUserEmote === '😢' && 'Buồn'}
                  {uiUserEmote === '😡' && 'Phẫn nộ'}
                </span>
                {/* Hiển thị số lượng reactions nếu có */}
                {totalEmotes > 0 && (
                  <span className="ml-1 text-gray-500 dark:text-gray-400">
                    {totalEmotes.toLocaleString()}
                  </span>
                )}
              </>
            ) : (
              <>
                <ThumbsUp size={20} className="md:w-4 md:h-4 w-5 h-5 stroke-2" />
                <span className="text-gray-500 dark:text-gray-400">{totalEmotes > 0 ? totalEmotes.toLocaleString() : '0'}</span>
                <span className="hidden md:inline ml-1">Thích</span>
              </>
            )}
            {/* Emote popup - shown when hovering over Likes */}
            {showEmotePopup && (
              <div
                className="absolute bottom-full left-0 mb-2 emote-picker bg-white dark:bg-gray-800 rounded-xl shadow-lg z-20 border border-gray-200 dark:border-gray-700"
                onMouseEnter={() => {
                  // Chỉ chạy trên desktop (hover)
                  if (window.innerWidth >= 768) {
                    if (emotePopupTimeout.current) clearTimeout(emotePopupTimeout.current);
                  }
                }}
                onMouseLeave={() => {
                  // Chỉ chạy trên desktop (hover)
                  if (window.innerWidth >= 768) {
                    emotePopupTimeout.current = setTimeout(() => setShowEmotePopup(false), 1200);
                  }
                }}
                onClick={(e) => e.stopPropagation()} // Ngăn click event bubble lên parent
              >
                {emotes.map(e => {
                  const isActive = uiUserEmote === e;
                  return (
                    <button 
                      key={e} 
                      className={`emote-btn ${isActive ? 'active' : ''}`}
                      type="button" 
                      onClick={(event) => { 
                        event.stopPropagation(); // Ngăn event bubble lên parent
                        // Gọi emote - API sẽ tự động toggle (nếu đã có sẽ xóa, chưa có sẽ thêm)
                        setLocalUserEmote(prev => prev === e ? null : e);
                        emote(e);
                        // Đóng popup sau khi chọn trên mobile
                        if (window.innerWidth < 768) {
                          setTimeout(() => setShowEmotePopup(false), 100);
                        }
                      }}
                      onMouseDown={(e) => e.preventDefault()} // Ngăn blur event
                      title={isActive ? `Bỏ cảm xúc ${e}` : `Thả cảm xúc ${e}`}
                    >
                      <img 
                        src={`/assets/${emoteMap[e]}`} 
                        alt={e} 
                        width={32}
                        height={32}
                        className={`emote ${isActive ? 'opacity-100 ring-2 ring-blue-500 rounded-full' : ''}`}
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
          <div
            className="flex items-center gap-1 md:gap-1.5 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            onClick={() => navigate(`/post/${post.slug}`)}
          >
            <MessageCircle size={20} className="md:w-4 md:h-4 w-5 h-5 stroke-2" />
            <span className="text-gray-500 dark:text-gray-400">{(post.commentCount || 0).toLocaleString()}</span>
            <span className="hidden md:inline ml-1">Bình luận</span>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 md:gap-1.5 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200 transition-colors relative z-10"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const url = `${window.location.origin}/post/${post.slug}`;
              navigator.clipboard.writeText(url).then(() => {
                alert("Đã sao chép liên kết!");
              }).catch(() => {
                alert("Không thể sao chép liên kết");
              });
            }}
            title="Chia sẻ"
          >
            <Share2 size={20} className="md:w-4 md:h-4 w-5 h-5 stroke-2" />
            <span className="hidden md:inline">Chia sẻ</span>
          </button>
          <div 
            className={`flex items-center gap-1 md:gap-1.5 transition-colors ${user ? 'cursor-pointer hover:text-gray-800 dark:hover:text-gray-200' : ''}`}
            onClick={user ? toggleSave : undefined}
          >
            {saved ? (
              <BookmarkCheck size={20} className="md:w-4 md:h-4 w-5 h-5 text-blue-500 fill-current" />
            ) : (
              <Bookmark size={20} className="md:w-4 md:h-4 w-5 h-5 stroke-2" />
            )}
            <span className="text-gray-500 dark:text-gray-400">{savedCount > 0 ? savedCount.toLocaleString() : '0'}</span>
            <span className="hidden md:inline ml-1">Đã lưu</span>
          </div>
        </div>
      </div>

      {/* COMMENT INPUT */}
      {user && (
        <div className="px-4 py-3 relative">
          {/* Image Previews - hiển thị trên input */}
          {commentImages.length > 0 && (
            <div className="mb-2 ml-10 grid grid-cols-3 gap-2">
              {commentImages.map((image) => (
                <div key={image.id} className="relative group">
                  <div className="w-full rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-800 aspect-square">
                    <img
                      src={image.preview}
                      alt="Preview"
                      width={100}
                      height={100}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImage(image.id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              className="absolute bottom-full left-4 right-4 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-3 max-h-48 overflow-y-auto z-30"
            >
              <div className="grid grid-cols-8 gap-1">
                {EMOJIS.map((emoji, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      insertEmoji(emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="p-2 text-lg hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleCommentSubmit} className="flex items-center gap-2">
            <img
              src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || '')}&length=2&background=cccccc&color=222222&size=32`}
              alt={user.name}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700 flex-shrink-0"
              loading="lazy"
            />
            <div className="flex-1 flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2">
              <input
                ref={commentInputRef}
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Nói lên suy nghĩ của bạn..."
                disabled={commentLoading}
                className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={commentImages.length >= 5}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Attachment"
              >
                <Paperclip size={18} className="text-gray-500 dark:text-gray-400" />
              </button>
              <button
                type="button"
                className="emoji-picker-button p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                title="Emoji"
              >
                <Smile size={18} className={`text-gray-500 dark:text-gray-400 ${showEmojiPicker ? 'text-blue-500' : ''}`} />
              </button>
              <button
                type="submit"
                disabled={(!commentInput.trim() && commentImages.length === 0) || commentLoading}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Send"
              >
                <Send size={18} className="text-blue-500" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Actions menu for post owner and admin */}
      {!hideActionsMenu && user && user._id && (user._id === post.author?._id || user.role === "admin") && (
        <div className="mt-2 pt-2 border-t border-gray-200 flex justify-end">
          <div className="relative">
            <button
              type="button"
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowOwnerMenu(prev => !prev);
              }}
              onMouseEnter={() => {
                if (actionsMenuTimeout.current) clearTimeout(actionsMenuTimeout.current);
                setShowOwnerMenu(true);
              }}
              onMouseLeave={() => {
                actionsMenuTimeout.current = setTimeout(() => setShowOwnerMenu(false), 200);
              }}
              aria-label="Tùy chọn bài viết"
              aria-expanded={showOwnerMenu}
              aria-haspopup="true"
              tabIndex={0}
            >
              <MoreHorizontal size={16} />
            </button>
            
            {showOwnerMenu && (
              <div
                ref={ownerMenuRef}
                className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[160px]"
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={() => {
                  if (actionsMenuTimeout.current) clearTimeout(actionsMenuTimeout.current);
                  setShowOwnerMenu(true);
                }}
                onMouseLeave={() => {
                  actionsMenuTimeout.current = setTimeout(() => setShowOwnerMenu(false), 200);
                }}
              >
                <div className="py-1">
                  <button
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowOwnerMenu(false);
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
                      setShowOwnerMenu(false);
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
                      setShowOwnerMenu(false);
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

export default memo(PostCard);


