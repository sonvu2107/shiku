import { useState, useEffect } from "react";
import { api } from "../api";
import { Heart, MessageCircle, MoreHorizontal, ChevronDown, ChevronUp, ThumbsUp, Smile, Frown, Laugh, Angry, Image, X } from "lucide-react";
import MediaViewer from "./MediaViewer";
import BanNotification from "./BanNotification";
import UserName from "./UserName";
import ComponentErrorBoundary from "./ComponentErrorBoundary";
import CommentImageUpload from "./CommentImageUpload";

/**
 * Mapping các role với icon tương ứng (hiện tại chưa sử dụng)
 */
const roleIcons = {
  solo: "/assets/Sung-tick.png",
  sybau: "/assets/Sybau-tick.png",
  keeper: "/assets/moxumxue.png"
};

/**
 * Mapping các emote types với icon và màu sắc
 */
const emoteConfig = {
  like: { icon: ThumbsUp, color: "text-blue-500", bgColor: "bg-blue-50" },
  love: { icon: Heart, color: "text-red-500", bgColor: "bg-red-50" },
  laugh: { icon: Laugh, color: "text-yellow-500", bgColor: "bg-yellow-50" },
  angry: { icon: Angry, color: "text-orange-500", bgColor: "bg-orange-50" },
  sad: { icon: Frown, color: "text-gray-500", bgColor: "bg-gray-50" }
};

/**
 * CommentSection - Component hiển thị và quản lý bình luận
 * Hỗ trợ nested comments, reply, edit, delete với tree structure
 * @param {string} postId - ID của bài viết
 * @param {Array} initialComments - Danh sách comments ban đầu (optional)
 * @param {Object} user - Thông tin user hiện tại
 */
export default function CommentSection({ postId, initialComments = [], user }) {
  // ==================== STATE MANAGEMENT ====================
  
  // Comments data
  const [comments, setComments] = useState([]); // Danh sách comments đã organize
  const [newComment, setNewComment] = useState(""); // Nội dung comment mới
  const [newCommentImages, setNewCommentImages] = useState([]); // Ảnh comment mới
  const [showCommentForm, setShowCommentForm] = useState(true); // Hiển thị form nhập bình luận
  
  // Reply system
  const [replyingTo, setReplyingTo] = useState(null); // ID comment đang reply
  const [replyContent, setReplyContent] = useState(""); // Nội dung reply
  const [replyImages, setReplyImages] = useState([]); // Ảnh reply
  const [expandedReplies, setExpandedReplies] = useState(new Set()); // Set các comment đã expand replies
  
  // UI states
  const [loading, setLoading] = useState(false); // Loading state
  const [showBanNotification, setShowBanNotification] = useState(false); // Hiện ban notification
  const [banInfo, setBanInfo] = useState(null); // Thông tin ban
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxGallery, setLightboxGallery] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  
  // Edit system
  const [editingComment, setEditingComment] = useState(null); // ID comment đang edit
  const [editContent, setEditContent] = useState(""); // Nội dung edit
  const [editImages, setEditImages] = useState([]); // Ảnh edit
  const [showDropdown, setShowDropdown] = useState(null); // ID comment đang hiện dropdown
  
  // Emote system
  const [showEmotePicker, setShowEmotePicker] = useState(null); // ID comment đang hiện emote picker

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest(".comment-dropdown")) {
        setShowDropdown(null);
      }
      if (showEmotePicker && !event.target.closest(".emote-picker")) {
        setShowEmotePicker(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown, showEmotePicker]);

  useEffect(() => {
    const organizeComments = (commentList) => {
      const commentMap = {};
      const rootComments = [];
      commentList.forEach((comment) => {
        commentMap[comment._id] = { ...comment, replies: [] };
      });
      commentList.forEach((comment) => {
        if (comment.parent) {
          if (commentMap[comment.parent._id || comment.parent]) {
            commentMap[comment.parent._id || comment.parent].replies.push(
              commentMap[comment._id]
            );
          }
        } else {
          rootComments.push(commentMap[comment._id]);
        }
      });
      return rootComments;
    };
    const fetchComments = async () => {
      try {
        const res = await api(`/api/comments/post/${postId}`);
        setComments(organizeComments(res.items));
      } catch (err) {
        // Silent handling for comments loading error
      }
    };
    fetchComments();
  }, [postId]);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if ((!newComment.trim() && newCommentImages.length === 0) || !user) return;

    setLoading(true);
    try {
      let requestBody;
      
      if (newCommentImages.length > 0) {
        // Có ảnh - sử dụng FormData
        const formData = new FormData();
        formData.append('content', newComment);
        
        // Add images to form data
        newCommentImages.forEach((image, index) => {
          formData.append('files', image.file);
        });
        
        requestBody = formData;
      } else {
        // Không có ảnh - sử dụng JSON
        requestBody = { content: newComment };
      }

      const response = await api(`/api/comments/post/${postId}`, {
        method: "POST",
        body: requestBody
      });

      // Add new comment to the top
      setComments((prev) => [
        { ...response.comment, replies: [] },
        ...prev
      ]);
      setNewComment("");
      // Reset ảnh và file input
      newCommentImages.forEach(img => img.preview && URL.revokeObjectURL(img.preview));
      setNewCommentImages([]);
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = "";
      // Ẩn form nhập bình luận
      setShowCommentForm(false);
    } catch (error) {
      const errorMessage = error?.message || "Lỗi hệ thống";
      alert("Lỗi khi đăng bình luận: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ==================== Reply Comment ====================
  const handleSubmitReply = async (e, parentId, parentAuthor) => {
    e.preventDefault();
    if ((!replyContent.trim() && replyImages.length === 0) || !user) return;

    setLoading(true);
    try {
      let requestBody;

      if (replyImages.length > 0) {
        const formData = new FormData();
        formData.append("content", replyContent);
        formData.append("parentId", parentId);
        replyImages.forEach((image) => {
          formData.append("files", image.file);
        });
        requestBody = formData;
      } else {
        requestBody = { content: replyContent, parentId };
      }

      const res = await api(`/api/comments/post/${postId}`, {
        method: "POST",
        body: requestBody,
      });

      const newReply = { ...res.comment, replies: [] };
      setComments((prev) =>
        prev.map((c) => addReplyToComment(c, parentId, newReply))
      );

      setReplyContent("");
      setReplyImages([]);
      setReplyingTo(null);

      // Auto expand replies để hiển thị luôn
      setExpandedReplies((prev) => new Set([...prev, parentId]));
    } catch (error) {
      const errorMessage = error?.message || "Lỗi hệ thống";
      alert("Lỗi khi trả lời: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEditComment = (comment) => {
    setEditingComment(comment._id);
    setEditContent(comment.content);
    setEditImages([]); // Reset edit images
    setShowDropdown(null);
  };

  const handleUpdateComment = async (commentId) => {
    if (!editContent.trim() && editImages.length === 0) {
      alert("Vui lòng nhập nội dung hoặc đính kèm ảnh!");
      return;
    }

    setLoading(true);
    try {
      let requestBody;
      
      if (editImages.length > 0) {
        // Có ảnh - sử dụng FormData
        const formData = new FormData();
        formData.append('content', editContent);
        
        // Add images to form data
        editImages.forEach((image, index) => {
          formData.append('files', image.file);
        });
        
        requestBody = formData;
      } else {
        // Không có ảnh - sử dụng JSON
        requestBody = { content: editContent };
      }

      const response = await api(`/api/comments/${commentId}`, {
        method: "PUT",
        body: requestBody
      });

      // Update comment in state
      setComments((prev) =>
        prev.map((comment) =>
          updateCommentInTree(comment, commentId, response.comment)
        )
      );

      setEditingComment(null);
      setEditContent("");
      setEditImages([]);
    } catch (error) {
      const errorMessage = error?.message || "Lỗi hệ thống";
      alert("Lỗi khi cập nhật: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateCommentInTree = (comment, commentId, updatedComment) => {
    if (comment._id === commentId) {
      return { ...comment, ...updatedComment };
    }
    if (comment.replies && comment.replies.length > 0) {
      return {
        ...comment,
        replies: comment.replies.map((reply) =>
          updateCommentInTree(reply, commentId, updatedComment)
        )
      };
    }
    return comment;
  };

  const cancelEdit = () => {
    setEditingComment(null);
    setEditContent("");
    setEditImages([]);
  };

  const openLightbox = (images, startIndex = 0) => {
    const gallery = images.map((img, idx) => ({
      url: img.url || img.preview,
      title: img.alt || `Ảnh ${idx + 1}`,
      type: 'image'
    })).filter(item => !!item.url);
    if (gallery.length === 0) return;
    setLightboxGallery(gallery);
    setLightboxIndex(Math.min(Math.max(startIndex, 0), gallery.length - 1));
    setLightboxOpen(true);
  };

  const addReplyToComment = (comment, parentId, newReply) => {
    if (comment._id === parentId) {
      return { ...comment, replies: [...comment.replies, newReply] };
    }
    return {
      ...comment,
      replies: comment.replies.map((reply) =>
        addReplyToComment(reply, parentId, newReply)
      )
    };
  };

  const toggleReplies = (commentId) => {
    setExpandedReplies((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  function removeCommentFromTree(commentList, commentId) {
    return commentList
      .filter((comment) => comment._id !== commentId)
      .map((comment) => ({
        ...comment,
        replies: comment.replies
          ? removeCommentFromTree(comment.replies, commentId)
          : []
      }));
  }

  async function handleDeleteComment(commentId) {
    setLoading(true);
    try {
      await api(`/api/comments/${commentId}`, {
        method: "DELETE"
      });
      setComments((prev) => removeCommentFromTree(prev, commentId));
    } catch (error) {
      const errorMessage = error?.message || "Lỗi hệ thống";
      alert("Lỗi khi xóa bình luận: " + errorMessage);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Xử lý like/unlike comment
   */
  async function handleLikeComment(commentId) {
    if (!user) return;
    
    setLoading(true);
    try {
      const res = await api(`/api/comments/${commentId}/like`, {
        method: "POST"
      });
      
      // Cập nhật comment trong state
      setComments(prev =>
        prev.map((comment) =>
          updateCommentInTree(comment, commentId, {
            likes: res.comment.likes,
            likeCount: res.likeCount
          })
        )
      );
    } catch (error) {
      const errorMessage = error?.message || "Lỗi hệ thống";
      console.error("Like comment error:", errorMessage);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Xử lý thêm/xóa emote cho comment
   */
  async function handleEmoteComment(commentId, emoteType) {
    if (!user) return;
    
    setLoading(true);
    try {
      const res = await api(`/api/comments/${commentId}/emote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: emoteType })
      });
      
      // Cập nhật comment trong state
      setComments(prev =>
        prev.map((comment) =>
          updateCommentInTree(comment, commentId, {
            emotes: res.comment.emotes || 
              // Fallback: xóa emote cũ của user và thêm emote mới
              comment.emotes
                .filter(emote => emote.user._id !== user._id)
                .concat([{ user: { _id: user._id }, type: emoteType }]),
            emoteCount: res.emoteCount || comment.emoteCount
          })
        )
      );
      
      setShowEmotePicker(null);
    } catch (error) {
      const errorMessage = error?.message || "Lỗi hệ thống";
      console.error('Emote error:', errorMessage);
      alert('Lỗi khi thêm cảm xúc: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  }


  const renderComment = (comment, level = 0) => {
    const isExpanded = expandedReplies.has(comment._id);
    const hasReplies = comment.replies && comment.replies.length > 0;

    return (
      <div key={comment._id} className={`${level > 0 ? "ml-2 sm:ml-4 md:ml-6 lg:ml-8" : ""}`}>
        {/* Main Comment */}
        <div className="flex gap-1.5 sm:gap-3 py-1 sm:py-2">
          <img
            src={
              comment.author?.avatarUrl ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                comment.author?.name || "User"
              )}&background=3b82f6&color=ffffff&size=40`
            }
            alt={comment.author?.name}
            className="w-7 h-7 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="bg-gray-100 rounded-xl sm:rounded-2xl px-2.5 sm:px-4 py-1.5 sm:py-2">
              <div className="font-semibold text-xs sm:text-sm text-gray-900 flex items-center gap-1">
                  <UserName user={comment.author} maxLength={20} />
              </div>
              {editingComment === comment._id ? (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-xs font-medium text-blue-700">Đang chỉnh sửa</span>
                  </div>
                  
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="3"
                    placeholder="Chỉnh sửa bình luận..."
                    autoFocus
                  />
                  
                  {/* Current Images Display */}
                  {comment.images && comment.images.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-gray-700 mb-2">Ảnh hiện tại:</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {comment.images.map((image, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={image.url}
                              alt={image.alt || `Ảnh ${index + 1}`}
                              className="w-full h-16 sm:h-20 object-cover rounded border border-gray-200"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Image Upload for Edit */}
                  <div className="mt-3">
                    <p className="text-xs font-medium text-gray-700 mb-2">Thêm ảnh mới (tùy chọn):</p>
                    <CommentImageUpload
                      onImagesChange={setEditImages}
                      maxImages={5}
                    />
                  </div>
                  
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleUpdateComment(comment._id)}
                      disabled={(!editContent.trim() && editImages.length === 0) || loading}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed touch-target flex items-center gap-2"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Đang lưu...
                        </>
                      ) : (
                        'Lưu thay đổi'
                      )}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 touch-target"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-gray-800 text-sm sm:text-sm comment-content whitespace-pre-wrap leading-relaxed">
                  {comment.content}
                  
                  {/* Display Images */}
                  {comment.images && comment.images.length > 0 && (
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 sm:gap-2">
                      {comment.images.map((image, index) => (
                        <div key={index} className="relative group">
                          <div className="w-full rounded-lg border border-gray-200 overflow-hidden bg-gray-50 aspect-[4/3] cursor-pointer">
                            <img
                              src={image.url}
                              alt={image.alt || `Ảnh ${index + 1}`}
                              className="w-full h-full object-contain hover:opacity-90 transition-opacity"
                              onClick={() => openLightbox(comment.images, index)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Comment Actions with Like and Emote */}
            <div className="flex items-center gap-1 sm:gap-2 mt-1 ml-1 sm:ml-2 flex-wrap comment-actions-mobile">
              <span className="text-xs text-gray-500">
                {new Date(comment.createdAt).toLocaleDateString("vi-VN")}
              </span>
              
              {/* Like Button */}
              <button
                onClick={() => handleLikeComment(comment._id)}
                className={`flex items-center gap-1 text-xs transition-colors min-h-[32px] min-w-[32px] px-1 py-1 rounded-md ${
                  comment.likes?.some(like => like._id === user?._id) 
                    ? 'text-blue-600 font-medium bg-blue-50' 
                    : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                }`}
              >
                <ThumbsUp size={14} className={`sm:w-3.5 sm:h-3.5 ${comment.likes?.some(like => like._id === user?._id) ? 'fill-current' : ''}`} />
                {comment.likeCount > 0 && <span className="text-xs">{comment.likeCount}</span>}
              </button>

              {/* Emote Button */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowEmotePicker(showEmotePicker === comment._id ? null : comment._id);
                  }}
                  className={`flex items-center gap-1 text-xs transition-colors min-h-[32px] min-w-[32px] px-1 py-1 rounded-md ${
                    (comment.emotes?.filter(emote => emote.user._id === user?._id) || []).length > 0
                      ? 'text-red-600 font-medium bg-red-50' 
                      : 'text-gray-600 hover:text-red-600 hover:bg-gray-50'
                  }`}
                >
                  <Smile size={14} className="sm:w-3.5 sm:h-3.5" />
                  {comment.emoteCount > 0 && <span className="text-xs">{comment.emoteCount}</span>}
                </button>

                {/* Emote Picker */}
                {showEmotePicker === comment._id && (
                  <div 
                    className="emote-picker"
                    style={{
                      position: 'absolute',
                      top: '2.5rem',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      zIndex: 9999,
                      background: 'white',
                      border: '2px solid #3b82f6',
                      borderRadius: '16px',
                      padding: '12px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                      minWidth: '240px'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      {Object.entries(emoteConfig).map(([type, config]) => {
                        const Icon = config.icon;
                      // Chỉ hiển thị active nếu user có emote này và không có emote khác
                      const userEmotes = comment.emotes?.filter(emote => emote.user._id === user?._id) || [];
                      const isActive = userEmotes.length === 1 && userEmotes[0]?.type === type;
                        return (
                          <button
                            key={type}
                            onClick={() => {
                              handleEmoteComment(comment._id, type);
                            }}
                            className={`comment-emote-btn ${config.color} ${
                              isActive 
                                ? `${config.bgColor} ring-2 ring-current ring-opacity-30` 
                                : 'hover:bg-gray-100 active:bg-gray-200'
                            }`}
                            title={type}
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: 'none',
                              cursor: 'pointer',
                              transition: 'transform 0.15s ease'
                            }}
                          >
                            <Icon size={18} className="sm:w-5 sm:h-5" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {user && (
                <button
                  onClick={() => {
                    setReplyingTo(comment._id);
                    setReplyContent(`@${comment.author?.name} `);
                  }}
                  className="text-xs text-gray-600 hover:text-blue-600 font-semibold min-h-[32px] px-2 py-1 rounded-md hover:bg-gray-50"
                >
                  Phản hồi
                </button>
              )}
              <div className="relative comment-dropdown">
                <button
                  onClick={() =>
                    setShowDropdown(
                      showDropdown === comment._id ? null : comment._id
                    )
                  }
                  className="text-xs text-gray-600 hover:text-gray-800 min-h-[32px] min-w-[32px] px-1 py-1 rounded-md hover:bg-gray-50 flex items-center justify-center"
                >
                  <MoreHorizontal size={14} className="sm:w-3.5 sm:h-3.5" />
                </button>

                {showDropdown === comment._id && (
                  <div 
                    className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl min-w-28 sm:min-w-32" 
                    style={{ 
                      zIndex: 9999
                    }}
                  >
                    {user && (user._id?.toString() === comment.author?._id?.toString() || user.id?.toString() === comment.author?._id?.toString()) && (
                      <button
                        onClick={() => handleEditComment(comment)}
                        className="block w-full px-3 sm:px-4 py-2 sm:py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100 min-h-[40px] flex items-center"
                      >
                        Sửa
                      </button>
                    )}
                    {user &&
                      ((user._id?.toString() === comment.author?._id?.toString() || user.id?.toString() === comment.author?._id?.toString()) ||
                        user.role === "admin") && (
                        <button
                          onClick={() => {
                            if (
                              window.confirm(
                                "Bạn có chắc muốn xóa bình luận này?"
                              )
                            ) {
                              handleDeleteComment(comment._id);
                            }
                            setShowDropdown(null);
                          }}
                          className="block w-full px-3 sm:px-4 py-2 sm:py-2.5 text-left text-sm text-red-600 hover:bg-gray-100 min-h-[40px] flex items-center"
                        >
                          Xóa
                        </button>
                      )}
                  </div>
                )}
              </div>
            </div>

            {/* Emote Display */}
            {comment.emotes && comment.emotes.length > 0 && (
              <div className={`mt-1 flex flex-wrap gap-1 emote-display ${level > 0 ? 'comment-nested' : ''}`}>
                {Object.entries(emoteConfig).map(([type, config]) => {
                  const typeEmotes = comment.emotes.filter(emote => emote.type === type);
                  if (typeEmotes.length === 0) return null;
                  
                  const Icon = config.icon;
                  return (
                    <span
                      key={type}
                      className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full ${config.bgColor} ${config.color}`}
                    >
                      <Icon size={12} />
                      <span>{typeEmotes.length}</span>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Show Replies Toggle */}
            {hasReplies && (
              <button
                onClick={() => toggleReplies(comment._id)}
                className="flex items-center gap-1 sm:gap-2 mt-1 ml-1 sm:ml-2 text-sm font-semibold text-blue-600 hover:text-blue-800 min-h-[36px] px-2 py-1 rounded-md hover:bg-blue-50 comment-reply-toggle"
              >
                {isExpanded ? (
                  <ChevronUp size={14} className="sm:w-4 sm:h-4" />
                ) : (
                  <ChevronDown size={14} className="sm:w-4 sm:h-4" />
                )}
                <span className="hidden sm:inline">
                  {isExpanded ? "Ẩn phản hồi" : `${comment.replies.length} phản hồi`}
                </span>
                <span className="sm:hidden">
                  {isExpanded ? "Ẩn" : `${comment.replies.length}`}
                </span>
              </button>
            )}

            {/* Reply Input */}
            {replyingTo === comment._id && user && (
              <form
                onSubmit={(e) =>
                  handleSubmitReply(e, comment._id, comment.author)
                }
                className="mt-2 ml-1 sm:ml-2"
              >
                <div className="flex gap-2">
                  <img
                    src={
                      user?.avatarUrl ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        user?.name || "User"
                      )}&background=3b82f6&color=ffffff&size=32`
                    }
                    alt={user?.name}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Viết phản hồi..."
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                      autoFocus
                    />
                    
                    {/* Image Upload for Reply */}
                    <CommentImageUpload
                      onImagesChange={setReplyImages}
                      maxImages={3}
                      className="mt-2"
                    />
                    
                    <div className="flex gap-2 mt-2">
                      <button
                        type="submit"
                        disabled={(!replyContent.trim() && replyImages.length === 0) || loading}
                        className="px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 min-h-[40px]"
                      >
                        {loading ? "Đang gửi..." : "Phản hồi"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyContent("");
                          setReplyImages([]);
                        }}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 min-h-[40px] rounded-lg hover:bg-gray-50"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            )}

            {/* Nested Replies */}
            {isExpanded && hasReplies && (
              <div className="mt-1">
                {comment.replies.map((reply) =>
                  renderComment(reply, level + 1)
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <div className="text-center py-8 text-gray-500">
        Đăng nhập để xem và viết bình luận
      </div>
    );
  }

  return (
    <ComponentErrorBoundary>
      <div className="max-w-4xl mx-auto space-y-2 sm:space-y-4 px-2 sm:px-0 comment-section-mobile" style={{ overflow: 'visible' }}>
      {/* Comment Input */}
      <form onSubmit={handleSubmitComment} className="space-y-3">
        <div className="flex gap-2 sm:gap-3">
          <img
            src={
              user?.avatarUrl ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                user?.name || "User"
              )}&background=3b82f6&color=ffffff&size=40`
            }
            alt={user?.name}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0"
          />
            <div className="flex-1 min-w-0">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Viết bình luận..."
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                rows={3}
              />
              
              {/* Image Upload */}
              <CommentImageUpload
                key={`comment-upload-${newCommentImages.length}`}
                onImagesChange={setNewCommentImages}
                maxImages={5}
                className="mt-2"
              />
              
              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="submit"
                  disabled={(!newComment.trim() && newCommentImages.length === 0) || loading}
                  className="px-4 sm:px-6 py-2 sm:py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 text-sm min-h-[40px]"
                >
                  {loading ? "Đang đăng..." : "Bình luận"}
                </button>
              </div>
            </div>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-1 sm:space-y-2">
        {comments.length > 0 ? (
          comments.map((comment) => renderComment(comment))
        ) : (
          <div className="text-center py-8 text-gray-500">
            Chưa có bình luận nào. Hãy là người đầu tiên!
          </div>
        )}
      </div>

      {lightboxOpen && (
        <MediaViewer
          media={lightboxGallery[lightboxIndex]}
          onClose={() => setLightboxOpen(false)}
          gallery={lightboxGallery}
          index={lightboxIndex}
          onNavigate={(idx) => setLightboxIndex(idx)}
        />
      )}

      {/* Ban Notification */}
      {showBanNotification && (
        <BanNotification
          banInfo={banInfo}
          onClose={() => setShowBanNotification(false)}
        />
      )}
      </div>
    </ComponentErrorBoundary>
  );
}
