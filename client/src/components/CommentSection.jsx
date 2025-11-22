import { useState, useEffect, useRef } from "react";
import { api } from "../api";
import { Heart, MessageCircle, MoreHorizontal, ChevronDown, ChevronUp, ThumbsUp, Smile, Frown, Laugh, Angry, Image, X } from "lucide-react";
import MediaViewer from "./MediaViewer";
import BanNotification from "./BanNotification";
import UserName from "./UserName";
import { Link } from "react-router-dom";
import ComponentErrorBoundary from "./ComponentErrorBoundary";
import CommentImageUpload from "./CommentImageUpload";
import MentionText from "./MentionText";
import MentionAutocomplete from "./MentionAutocomplete";

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
 * Danh sách emoji phổ biến
 */
const emojiList = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
  '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
  '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
  '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
  '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
  '🤧', '🥵', '🥶', '😶‍🌫️', '😵', '😵‍💫', '🤯', '🤠', '🥳', '😎',
  '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳',
  '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖',
  '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬',
  '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽',
  '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿',
  '😾', '🙈', '🙉', '🙊', '💋', '💌', '💘', '💝', '💖', '💗',
  '💓', '💞', '💕', '💟', '❣️', '💔', '❤️', '🧡', '💛', '💚',
  '💙', '💜', '🖤', '🤍', '🤎', '💯', '💢', '💥', '💫', '💦',
  '💨', '🕳️', '💣', '💬', '👁️‍🗨️', '🗨️', '🗯️', '💭', '💤', '👋',
  '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟',
  '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎',
  '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏',
  '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠',
  '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋', '🩸'
];

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
  const [newCommentCursorPosition, setNewCommentCursorPosition] = useState(0); // Vị trí cursor trong newComment
  const [showMentionAutocomplete, setShowMentionAutocomplete] = useState(false); // Hiển thị mention autocomplete
  const newCommentTextareaRef = useRef(null); // Ref cho textarea newComment
  
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
  
  // Emoji picker system
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); // Hiển thị emoji picker cho comment mới
  const [showReplyEmojiPicker, setShowReplyEmojiPicker] = useState(null); // ID comment đang hiện emoji picker cho reply
  const [showEditEmojiPicker, setShowEditEmojiPicker] = useState(null); // ID comment đang hiện emoji picker cho edit

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest(".comment-dropdown")) {
        setShowDropdown(null);
      }
      if (showEmotePicker && !event.target.closest(".emote-picker")) {
        setShowEmotePicker(null);
      }
      if (showEmojiPicker && !event.target.closest(".emoji-picker-container")) {
        setShowEmojiPicker(false);
      }
      if (showReplyEmojiPicker && !event.target.closest(".emoji-picker-container")) {
        setShowReplyEmojiPicker(null);
      }
      if (showEditEmojiPicker && !event.target.closest(".emoji-picker-container")) {
        setShowEditEmojiPicker(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown, showEmotePicker, showEmojiPicker, showReplyEmojiPicker, showEditEmojiPicker]);

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

  // Handle mention autocomplete
  const handleMentionSelect = (user, startPosition, endPosition) => {
    if (!newCommentTextareaRef.current) return;
    
    const before = newComment.substring(0, startPosition);
    const after = newComment.substring(endPosition);
    const mention = `@${user.name} `;
    
    const newContent = before + mention + after;
    setNewComment(newContent);
    
    // Set cursor position after mention
    setTimeout(() => {
      if (newCommentTextareaRef.current) {
        const newCursorPos = startPosition + mention.length;
        newCommentTextareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        newCommentTextareaRef.current.focus();
        setNewCommentCursorPosition(newCursorPos);
      }
    }, 0);
    
    setShowMentionAutocomplete(false);
  };

  // Handle textarea change and cursor position
  const handleNewCommentChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    setNewComment(value);
    setNewCommentCursorPosition(cursorPos);
    
    // Check if we should show autocomplete (user typed @)
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Show autocomplete if @ is followed by valid characters or empty
      if (textAfterAt.length === 0 || /^[\p{L}\p{N}_\s]*$/u.test(textAfterAt)) {
        const spaceAfter = textAfterAt.includes(' ');
        if (!spaceAfter || textAfterAt.match(/^[\p{L}\p{N}_]+\s+[\p{L}\p{N}_]*$/u)) {
          setShowMentionAutocomplete(true);
          return;
        }
      }
    }
    
    setShowMentionAutocomplete(false);
  };

  // Handle textarea key events
  const handleNewCommentKeyDown = (e) => {
    if (showMentionAutocomplete && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === "Tab" || e.key === "Escape")) {
      // Let MentionAutocomplete handle these keys
      return;
    }
    
    // Close autocomplete on Escape or when typing space after non-mention text
    if (e.key === "Escape") {
      setShowMentionAutocomplete(false);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if ((!newComment.trim() && newCommentImages.length === 0) || !user) return;

    setShowMentionAutocomplete(false); // Close autocomplete when submitting
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
      setNewCommentCursorPosition(0);
      setShowMentionAutocomplete(false);
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


  /**
   * Render emoji picker component
   */
  const renderEmojiPicker = (onSelect, isOpen, onClose, position = "left") => {
    if (!isOpen) return null;
    
    const positionClass = position === "right" ? "right-0" : "left-0";
    
    return (
      <div className={`absolute bottom-full ${positionClass} mb-2 w-[320px] sm:w-[360px] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200`}>
        <div className="p-3 max-h-[280px] overflow-y-auto">
          <div className="grid grid-cols-8 gap-1">
            {emojiList.map((emoji, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  onSelect(emoji);
                  onClose();
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

  const renderComment = (comment, level = 0) => {
    const isExpanded = expandedReplies.has(comment._id);
    const hasReplies = comment.replies && comment.replies.length > 0;

    return (
      <div key={comment._id} className={`${level > 0 ? "ml-2 sm:ml-4 md:ml-6 lg:ml-8 pl-2 sm:pl-4 border-l-2 border-neutral-100 dark:border-neutral-800" : ""}`}>
        {/* Main Comment */}
        <div className="flex gap-2 sm:gap-3 py-1.5 group/comment">
          <Link to={comment.author?._id ? `/user/${comment.author._id}` : '#'} className="focus:outline-none flex-shrink-0">
            <img
              src={
                comment.author?.avatarUrl ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  comment.author?.name || "User"
                )}&background=000000&color=ffffff&size=40`
              }
              alt={comment.author?.name}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border border-neutral-200 dark:border-neutral-800"
            />
          </Link>
          <div className="flex-1 min-w-0">
            <div className={`${editingComment === comment._id ? 'w-full' : 'w-fit max-w-full'} bg-neutral-100/80 dark:bg-neutral-900/80 backdrop-blur-sm rounded-2xl rounded-tl-none px-3 sm:px-4 py-2 sm:py-3 border border-transparent dark:border-neutral-800`}>
              <div className="flex items-center justify-between mb-1 gap-2">
                <Link to={comment.author?._id ? `/user/${comment.author._id}` : '#'} className="font-bold text-sm text-neutral-900 dark:text-white hover:underline truncate">
                  <UserName user={comment.author} maxLength={20} />
                </Link>
              </div>
              
              {editingComment === comment._id ? (
                <div className="mt-2">
                  <div className="relative emoji-picker-container">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full p-3 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
                      rows="3"
                      placeholder="Chỉnh sửa bình luận..."
                      autoFocus
                    />
                    <div className="absolute right-2 bottom-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setShowEditEmojiPicker(showEditEmojiPicker === comment._id ? null : comment._id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition-colors"
                        title="Thêm emoji"
                      >
                        <Smile size={16} />
                      </button>
                      {renderEmojiPicker(
                        (emoji) => setEditContent(prev => prev + emoji),
                        showEditEmojiPicker === comment._id,
                        () => setShowEditEmojiPicker(null),
                        "right"
                      )}
                    </div>
                  </div>
                  
                  {/* Current Images Display */}
                  {comment.images && comment.images.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wider">Ảnh hiện tại</p>
                      <div className="grid grid-cols-3 gap-2">
                        {comment.images.map((image, index) => (
                          <div key={index} className="relative group rounded-lg overflow-hidden">
                            <img
                              src={image.url}
                              alt={image.alt || `Ảnh ${index + 1}`}
                              className="w-full h-16 object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Image Upload for Edit */}
                  <div className="mt-3">
                    <CommentImageUpload
                      onImagesChange={setEditImages}
                      maxImages={5}
                    />
                  </div>
                  
                  <div className="flex gap-2 mt-3 justify-end">
                    <button
                      onClick={cancelEdit}
                      className="px-4 py-1.5 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={() => handleUpdateComment(comment._id)}
                      disabled={(!editContent.trim() && editImages.length === 0) || loading}
                      className="px-4 py-1.5 bg-black dark:bg-white text-white dark:text-black text-xs font-bold rounded-full hover:opacity-80 disabled:opacity-50 transition-all"
                    >
                      {loading ? 'Đang lưu...' : 'Lưu'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-neutral-800 dark:text-neutral-200 text-sm leading-relaxed whitespace-pre-wrap break-words">
                  <MentionText 
                    text={comment.content} 
                    mentionedUsers={comment.mentions || []}
                  />
                  
                  {/* Display Images */}
                  {comment.images && comment.images.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {comment.images.map((image, index) => (
                        <div key={index} className="relative group rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 aspect-square cursor-pointer" onClick={() => openLightbox(comment.images, index)}>
                          <img
                            src={image.url}
                            alt={image.alt || `Ảnh ${index + 1}`}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Comment Actions */}
            <div className="flex items-center gap-3 sm:gap-4 mt-1.5 ml-1 sm:ml-2">
              <span className="text-[10px] sm:text-xs text-neutral-400 font-medium flex-shrink-0 whitespace-nowrap">
                {new Date(comment.createdAt).toLocaleDateString("vi-VN")}
              </span>

              {/* Like Button */}
              <button
                onClick={() => handleLikeComment(comment._id)}
                className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${
                  comment.likes?.some(like => like._id === user?._id) 
                    ? 'text-red-600 dark:text-red-500' 
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300'
                }`}
              >
                <Heart 
                  size={14} 
                  className={comment.likes?.some(like => like._id === user?._id) ? 'fill-current' : ''} 
                />
                {comment.likeCount > 0 && <span>{comment.likeCount}</span>}
                <span className="hidden sm:inline">{comment.likes?.some(like => like._id === user?._id) ? 'Đã thích' : 'Thích'}</span>
              </button>

              {/* Reply Button */}
              {user && (
                <button
                  onClick={() => {
                    setReplyingTo(comment._id);
                    setReplyContent(`@${comment.author?.name} `);
                  }}
                  className="text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300 transition-colors"
                >
                  Phản hồi
                </button>
              )}

              {/* More Actions */}
              <div className="relative comment-dropdown">
                <button
                  onClick={() => setShowDropdown(showDropdown === comment._id ? null : comment._id)}
                  className="text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors opacity-100 sm:opacity-0 sm:group-hover/comment:opacity-100"
                >
                  <MoreHorizontal size={14} />
                </button>

                {showDropdown === comment._id && (
                  <div className="absolute left-0 top-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-xl shadow-xl z-50 overflow-hidden min-w-[120px] animate-in fade-in zoom-in-95 duration-200">
                    {user && (user._id?.toString() === comment.author?._id?.toString() || user.id?.toString() === comment.author?._id?.toString()) && (
                      <button
                        onClick={() => handleEditComment(comment)}
                        className="w-full px-4 py-2.5 text-left text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                      >
                        Chỉnh sửa
                      </button>
                    )}
                    {user &&
                      ((user._id?.toString() === comment.author?._id?.toString() || user.id?.toString() === comment.author?._id?.toString()) ||
                        user.role === "admin") && (
                        <button
                          onClick={() => {
                            if (window.confirm("Bạn có chắc muốn xóa bình luận này?")) {
                              handleDeleteComment(comment._id);
                            }
                            setShowDropdown(null);
                          }}
                          className="w-full px-4 py-2.5 text-left text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          Xóa
                        </button>
                      )}
                  </div>
                )}
              </div>
            </div>

            {/* Reply Input */}
            {replyingTo === comment._id && user && (
              <div className="mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <form onSubmit={(e) => handleSubmitReply(e, comment._id, comment.author)} className="flex gap-3">
                  <img
                    src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || "User")}&background=000000&color=ffffff&size=32`}
                    alt={user?.name}
                    className="w-8 h-8 rounded-full object-cover border border-neutral-200 dark:border-neutral-800"
                  />
                  <div className="flex-1">
                    <div className="relative">
                      <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder={`Phản hồi ${comment.author?.name}...`}
                        className="w-full px-4 py-3 bg-neutral-100 dark:bg-neutral-900 border-none rounded-2xl text-sm focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 transition-all resize-none"
                        rows={1}
                        autoFocus
                        style={{ minHeight: '44px' }}
                      />
                      <div className="absolute right-2 bottom-2 flex items-center gap-1 emoji-picker-container relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setShowReplyEmojiPicker(showReplyEmojiPicker === comment._id ? null : comment._id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition-colors"
                          title="Thêm emoji"
                        >
                          <Smile size={16} />
                        </button>
                        {renderEmojiPicker(
                          (emoji) => setReplyContent(prev => prev + emoji),
                          showReplyEmojiPicker === comment._id,
                          () => setShowReplyEmojiPicker(null),
                          "right"
                        )}
                        <CommentImageUpload
                          onImagesChange={setReplyImages}
                          maxImages={3}
                          minimal={true}
                        />
                      </div>
                    </div>
                    
                    {replyImages.length > 0 && (
                      <div className="mt-2 grid grid-cols-4 gap-2">
                        {replyImages.map((img, idx) => (
                          <div key={idx} className="relative aspect-square rounded-lg overflow-hidden">
                            <img src={img.preview} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyContent("");
                          setReplyImages([]);
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300 transition-colors"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={(!replyContent.trim() && replyImages.length === 0) || loading}
                        className="px-4 py-1.5 bg-black dark:bg-white text-white dark:text-black text-xs font-bold rounded-full hover:opacity-90 disabled:opacity-50 transition-all"
                      >
                        {loading ? "..." : "Gửi"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* Show Replies Toggle */}
            {hasReplies && (
              <button
                onClick={() => toggleReplies(comment._id)}
                className="flex items-center gap-2 mt-1.5 text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300 transition-colors group/toggle"
              >
                <div className="w-6 h-[1px] bg-neutral-300 dark:bg-neutral-700 group-hover/toggle:bg-neutral-500 transition-colors"></div>
                {isExpanded ? "Ẩn phản hồi" : `Xem ${comment.replies.length} phản hồi`}
              </button>
            )}

            {/* Nested Replies */}
            {isExpanded && hasReplies && (
              <div className="mt-1.5 space-y-1.5">
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
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-400">
          <MessageCircle size={24} />
        </div>
        <h3 className="text-neutral-900 dark:text-white font-bold mb-2">Đăng nhập để bình luận</h3>
        <p className="text-neutral-500 text-sm mb-4">Tham gia thảo luận cùng cộng đồng</p>
        <Link to="/login" className="inline-block px-6 py-2 bg-black dark:bg-white text-white dark:text-black font-bold rounded-full text-sm hover:opacity-90 transition-opacity">
          Đăng nhập ngay
        </Link>
      </div>
    );
  }

  return (
    <ComponentErrorBoundary>
      <div className="max-w-4xl mx-auto" style={{ overflow: 'visible' }}>
        
        {/* Comment Input */}
        <div className="mb-8 flex gap-4">
          <img
            src={
              user?.avatarUrl ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                user?.name || "User"
              )}&background=000000&color=ffffff&size=40`
            }
            alt={user?.name}
            className="w-10 h-10 rounded-full object-cover border border-neutral-200 dark:border-neutral-800 flex-shrink-0"
          />
          <div className="flex-1">
            <form onSubmit={handleSubmitComment} className="relative group/input">
              <div className="relative bg-neutral-100 dark:bg-neutral-900 rounded-2xl transition-all focus-within:ring-2 focus-within:ring-black/5 dark:focus-within:ring-white/10 focus-within:bg-white dark:focus-within:bg-black border border-transparent focus-within:border-neutral-200 dark:focus-within:border-neutral-800">
                <textarea
                  ref={newCommentTextareaRef}
                  value={newComment}
                  onChange={handleNewCommentChange}
                  onKeyDown={handleNewCommentKeyDown}
                  onSelect={(e) => setNewCommentCursorPosition(e.target.selectionStart)}
                  onClick={(e) => setNewCommentCursorPosition(e.target.selectionStart)}
                  placeholder="Viết bình luận của bạn..."
                  className="w-full px-4 py-3 bg-transparent border-none text-sm sm:text-base text-neutral-900 dark:text-white placeholder-neutral-500 focus:ring-0 resize-none rounded-2xl"
                  rows={Math.max(2, newComment.split('\n').length)}
                  style={{ minHeight: '60px', maxHeight: '200px' }}
                />
                
                {/* Mention Autocomplete */}
                {showMentionAutocomplete && (
                  <div className="absolute bottom-full left-0 mb-2" style={{ zIndex: 100 }}>
                    <MentionAutocomplete
                      value={newComment}
                      cursorPosition={newCommentCursorPosition}
                      onSelect={handleMentionSelect}
                      onClose={() => setShowMentionAutocomplete(false)}
                    />
                  </div>
                )}
                
                <div className="px-2 pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1 emoji-picker-container relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowEmojiPicker(!showEmojiPicker);
                      }}
                      className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition-colors"
                      title="Thêm emoji"
                    >
                      <Smile size={18} />
                    </button>
                    {renderEmojiPicker(
                      (emoji) => setNewComment(prev => prev + emoji),
                      showEmojiPicker,
                      () => setShowEmojiPicker(false)
                    )}
                    <CommentImageUpload
                      key={`comment-upload-${newCommentImages.length}`}
                      onImagesChange={setNewCommentImages}
                      maxImages={5}
                      minimal={true}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={(!newComment.trim() && newCommentImages.length === 0) || loading}
                    className="px-4 py-1.5 bg-black dark:bg-white text-white dark:text-black text-sm font-bold rounded-full hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    {loading ? "..." : "Gửi"}
                  </button>
                </div>
              </div>
            </form>
            
            {newCommentImages.length > 0 && (
              <div className="mt-3 grid grid-cols-4 sm:grid-cols-5 gap-2 animate-in fade-in zoom-in-95 duration-200">
                {newCommentImages.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 group">
                    <img src={img.preview} className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setNewCommentImages(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Comments List */}
        <div className="space-y-2">
          {comments.length > 0 ? (
            comments.map((comment) => renderComment(comment))
          ) : (
            <div className="text-center py-12 bg-neutral-50 dark:bg-neutral-900/30 rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-800">
              <div className="text-neutral-400 mb-2">Chưa có bình luận nào</div>
              <div className="text-sm text-neutral-500">Hãy là người đầu tiên chia sẻ suy nghĩ của bạn!</div>
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
