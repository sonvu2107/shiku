import React, { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../api";
import { Heart, MessageCircle, MoreHorizontal, ChevronDown, ChevronUp, ThumbsUp, Smile, Frown, Laugh, Angry, Image, X, Loader2 } from "lucide-react";
import MediaViewer from "./MediaViewer";
import BanNotification from "./BanNotification";
import UserName from "./UserName";
import UserAvatar from "./UserAvatar";
import { Link } from "react-router-dom";
import ComponentErrorBoundary from "./ComponentErrorBoundary";
import CommentImageUpload from "./CommentImageUpload";
import MentionText from "./MentionText";
import MentionAutocomplete from "./MentionAutocomplete";
import { useToast } from "../contexts/ToastContext";

/**
 * Mapping roles with their respective icons (currently unused)
 */
const roleIcons = {
  solo: "/assets/Sung-tick.png",
  sybau: "/assets/Sybau-tick.png",
  keeper: "/assets/moxumxue.png"
};

/**
 * Mapping emote types with their respective icons and colors
 */
const emoteConfig = {
  like: { icon: ThumbsUp, color: "text-blue-500", bgColor: "bg-blue-50" },
  love: { icon: Heart, color: "text-red-500", bgColor: "bg-red-50" },
  laugh: { icon: Laugh, color: "text-yellow-500", bgColor: "bg-yellow-50" },
  angry: { icon: Angry, color: "text-orange-500", bgColor: "bg-orange-50" },
  sad: { icon: Frown, color: "text-gray-500", bgColor: "bg-gray-50" }
};

/**
 * List of popular emojis
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
 * CommentSection - Component to display and manage comments
 * Supports nested comments, reply, edit, delete with tree structure
 * @param {string} postId - ID of the post
 * @param {Array} initialComments - Initial list of comments (optional)
 * @param {Object} user - Current user information
 */
function CommentSection({ postId, initialComments = [], user }) {
  // ==================== STATE MANAGEMENT ====================

  // Toast notifications
  const { showSuccess, showError } = useToast();

  // Comments data
  const [comments, setComments] = useState([]); // Organized list of comments
  const [newComment, setNewComment] = useState(""); // New comment content
  const [newCommentImages, setNewCommentImages] = useState([]); // New comment images
  const [showCommentForm, setShowCommentForm] = useState(true); // Show comment input form
  const [newCommentCursorPosition, setNewCommentCursorPosition] = useState(0); // Cursor position in newComment
  const [showMentionAutocomplete, setShowMentionAutocomplete] = useState(false); // Show mention autocomplete
  const newCommentTextareaRef = useRef(null); // Ref for newComment textarea
  const commentsContainerRef = useRef(null); // Ref for comments container (for scrolling)

  // Reply system
  const [replyingTo, setReplyingTo] = useState(null); // ID comment being replied to
  const [replyContent, setReplyContent] = useState(""); // Reply content
  const [replyImages, setReplyImages] = useState([]); // Reply images
  const [expandedReplies, setExpandedReplies] = useState(new Set()); // Set of comments with expanded replies
  const [replyCursorPosition, setReplyCursorPosition] = useState(0); // Cursor position in reply
  const [showReplyMentionAutocomplete, setShowReplyMentionAutocomplete] = useState(false); // Show mention autocomplete for reply
  const replyTextareaRef = useRef(null); // Ref for reply textarea

  // UI states - Separate loading states for better UX
  const [loading, setLoading] = useState(false); // General loading state
  const [submittingComment, setSubmittingComment] = useState(false); // Submitting new comment
  const [submittingReply, setSubmittingReply] = useState(new Map()); // Submitting replies (Map<commentId, boolean>)
  const [updatingComment, setUpdatingComment] = useState(new Map()); // Updating comments (Map<commentId, boolean>)
  const [likingComments, setLikingComments] = useState(new Set()); // Liking comments (Set<commentId>)
  const [deletingComments, setDeletingComments] = useState(new Set()); // Deleting comments (Set<commentId>)
  const [showBanNotification, setShowBanNotification] = useState(false); // Show ban notification
  const [banInfo, setBanInfo] = useState(null); // Ban information
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxGallery, setLightboxGallery] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [fetchingComments, setFetchingComments] = useState(true); // Fetching comments

  // Edit system
  const [editingComment, setEditingComment] = useState(null); // ID comment being edited
  const [editContent, setEditContent] = useState(""); // Edit content
  const [editImages, setEditImages] = useState([]); // Edit images
  const [showDropdown, setShowDropdown] = useState(null); // ID comment showing dropdown

  // Emote system
  const [showEmotePicker, setShowEmotePicker] = useState(null); // ID comment showing emote picker

  // Emoji picker system
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); // Show emoji picker for new comment
  const [showReplyEmojiPicker, setShowReplyEmojiPicker] = useState(null); // ID comment showing emoji picker for reply
  const [showEditEmojiPicker, setShowEditEmojiPicker] = useState(null); // ID comment showing emoji picker for edit

  // Debounce timer for mention autocomplete
  const mentionDebounceTimer = useRef(null);

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

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (mentionDebounceTimer.current) {
        clearTimeout(mentionDebounceTimer.current);
      }
    };
  }, []);

  // Organize comments into tree structure - Memoized
  const organizeComments = useCallback((commentList) => {
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
  }, []);

  useEffect(() => {
    const fetchComments = async () => {
      setFetchingComments(true);
      try {
        const res = await api(`/api/comments/post/${postId}`);
        setComments(organizeComments(res.items));
      } catch (err) {
        // Silent handling for comments loading error
        console.error("Error fetching comments:", err);
      } finally {
        setFetchingComments(false);
      }
    };
    fetchComments();
  }, [postId, organizeComments]);

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

  // Handle textarea change and cursor position with debouncing
  const handleNewCommentChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;

    setNewComment(value);
    setNewCommentCursorPosition(cursorPos);

    // Clear previous debounce timer
    if (mentionDebounceTimer.current) {
      clearTimeout(mentionDebounceTimer.current);
    }

    // Debounce mention autocomplete check
    mentionDebounceTimer.current = setTimeout(() => {
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
    }, 150); // 150ms debounce
  };

  // Handle textarea key events
  const handleNewCommentKeyDown = (e) => {
    if (showMentionAutocomplete && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === "Tab" || e.key === "Escape")) {
      // Let MentionAutocomplete handle these keys
      return;
    }

    // Keyboard shortcut: Cmd/Ctrl + Enter to submit
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (!submittingComment && (newComment.trim() || newCommentImages.length > 0)) {
        handleSubmitComment(e);
      }
      return;
    }

    // Close autocomplete on Escape
    if (e.key === "Escape") {
      setShowMentionAutocomplete(false);
    }
  };

  // ==================== Reply Mention Handlers ====================

  // Handle mention select for reply
  const handleReplyMentionSelect = (user, startPosition, endPosition) => {
    const before = replyContent.substring(0, startPosition);
    const after = replyContent.substring(endPosition);
    const mention = `@${user.name} `;

    const newContent = before + mention + after;
    setReplyContent(newContent);

    // Set cursor position after mention
    setTimeout(() => {
      if (replyTextareaRef.current) {
        const newCursorPos = startPosition + mention.length;
        replyTextareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        replyTextareaRef.current.focus();
        setReplyCursorPosition(newCursorPos);
      }
    }, 0);

    setShowReplyMentionAutocomplete(false);
  };

  // Handle reply textarea change and cursor position
  const handleReplyContentChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;

    setReplyContent(value);
    setReplyCursorPosition(cursorPos);

    // Check if we should show autocomplete (user typed @)
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Show autocomplete if @ is followed by valid characters or empty
      if (textAfterAt.length === 0 || /^[\p{L}\p{N}_\s]*$/u.test(textAfterAt)) {
        const spaceAfter = textAfterAt.includes(' ');
        if (!spaceAfter || textAfterAt.match(/^[\p{L}\p{N}_]+\s+[\p{L}\p{N}_]*$/u)) {
          setShowReplyMentionAutocomplete(true);
          return;
        }
      }
    }

    setShowReplyMentionAutocomplete(false);
  };

  // Handle reply textarea key events
  const handleReplyKeyDown = (e) => {
    if (showReplyMentionAutocomplete && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === "Tab" || e.key === "Escape")) {
      // Let MentionAutocomplete handle these keys
      return;
    }

    // Keyboard shortcut: Cmd/Ctrl + Enter to submit
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && replyingTo) {
      e.preventDefault();
      const parentComment = comments.find(c => c._id === replyingTo) ||
        comments.reduce((found, c) => {
          if (found) return found;
          const reply = c.replies?.find(r => r._id === replyingTo);
          return reply ? c : null;
        }, null);
      if (parentComment && !submittingReply.get(replyingTo) && (replyContent.trim() || replyImages.length > 0)) {
        handleSubmitReply(e, replyingTo, parentComment.author);
      }
      return;
    }

    // Close autocomplete on Escape
    if (e.key === "Escape") {
      setShowReplyMentionAutocomplete(false);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if ((!newComment.trim() && newCommentImages.length === 0) || !user || submittingComment) return;

    setShowMentionAutocomplete(false); // Close autocomplete when submitting
    setSubmittingComment(true);

    // Store content for optimistic update
    const commentContent = newComment;
    const commentImages = [...newCommentImages];

    try {
      let requestBody;

      if (newCommentImages.length > 0) {
        // With image - use FormData
        const formData = new FormData();
        formData.append('content', newComment);

        // Add images to form data
        newCommentImages.forEach((image, index) => {
          formData.append('files', image.file);
        });

        requestBody = formData;
      } else {
        // Without image - use JSON
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

      // Clear form
      setNewComment("");
      setNewCommentCursorPosition(0);
      setShowMentionAutocomplete(false);
      // Reset images and file input
      commentImages.forEach(img => img.preview && URL.revokeObjectURL(img.preview));
      setNewCommentImages([]);
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = "";

      // Show success message
      showSuccess("Bình luận đã được đăng thành công!");

      // Scroll to new comment after a short delay
      setTimeout(() => {
        if (commentsContainerRef.current) {
          const firstComment = commentsContainerRef.current.querySelector('[data-comment-id]');
          if (firstComment) {
            firstComment.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      }, 100);

      // Focus back to textarea
      setTimeout(() => {
        if (newCommentTextareaRef.current) {
          newCommentTextareaRef.current.focus();
        }
      }, 200);
    } catch (error) {
      const errorMessage = error?.message || "Lỗi hệ thống";
      showError("Lỗi khi đăng bình luận: " + errorMessage);
    } finally {
      setSubmittingComment(false);
    }
  };

  // ==================== Reply Comment ====================
  const handleSubmitReply = async (e, parentId, parentAuthor) => {
    e.preventDefault();
    if ((!replyContent.trim() && replyImages.length === 0) || !user || submittingReply.get(parentId)) return;

    setSubmittingReply(prev => new Map(prev).set(parentId, true));
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
      setReplyCursorPosition(0);
      setShowReplyMentionAutocomplete(false);

      // Auto expand replies to show them immediately
      setExpandedReplies((prev) => new Set([...prev, parentId]));

      // Show success message
      showSuccess("Phản hồi đã được đăng thành công!");
    } catch (error) {
      const errorMessage = error?.message || "Lỗi hệ thống";
      showError("Lỗi khi trả lời: " + errorMessage);
    } finally {
      setSubmittingReply(prev => {
        const newMap = new Map(prev);
        newMap.delete(parentId);
        return newMap;
      });
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
      showError("Vui lòng nhập nội dung hoặc đính kèm ảnh!");
      return;
    }

    if (updatingComment.get(commentId)) return;

    setUpdatingComment(prev => new Map(prev).set(commentId, true));
    try {
      let requestBody;

      if (editImages.length > 0) {
        // With image - use FormData
        const formData = new FormData();
        formData.append('content', editContent);

        // Add images to form data
        editImages.forEach((image, index) => {
          formData.append('files', image.file);
        });

        requestBody = formData;
      } else {
        // Without image - use JSON
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

      showSuccess("Bình luận đã được cập nhật!");
    } catch (error) {
      const errorMessage = error?.message || "Lỗi hệ thống";
      showError("Lỗi khi cập nhật: " + errorMessage);
    } finally {
      setUpdatingComment(prev => {
        const newMap = new Map(prev);
        newMap.delete(commentId);
        return newMap;
      });
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
    if (deletingComments.has(commentId)) return;

    setDeletingComments(prev => new Set([...prev, commentId]));
    try {
      await api(`/api/comments/${commentId}`, {
        method: "DELETE"
      });
      setComments((prev) => removeCommentFromTree(prev, commentId));
      showSuccess("Bình luận đã được xóa!");
    } catch (error) {
      const errorMessage = error?.message || "Lỗi hệ thống";
      showError("Lỗi khi xóa bình luận: " + errorMessage);
    } finally {
      setDeletingComments(prev => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });
    }
  }

  /**
   * Handle like/unlike comment with optimistic update
   */
  async function handleLikeComment(commentId) {
    if (!user || likingComments.has(commentId)) return;

    // Find current comment for optimistic update
    const findComment = (comments) => {
      for (const comment of comments) {
        if (comment._id === commentId) return comment;
        if (comment.replies?.length > 0) {
          const found = findComment(comment.replies);
          if (found) return found;
        }
      }
      return null;
    };

    const currentComment = findComment(comments);
    if (!currentComment) return;

    const isLiked = currentComment.likes?.some(like => like._id === user._id || like.user?._id === user._id);
    const currentLikeCount = currentComment.likeCount || 0;

    // Optimistic update
    setLikingComments(prev => new Set([...prev, commentId]));
    setComments(prev =>
      prev.map((comment) =>
        updateCommentInTree(comment, commentId, {
          likes: isLiked
            ? (currentComment.likes || []).filter(like => like._id !== user._id && like.user?._id !== user._id)
            : [...(currentComment.likes || []), { _id: user._id, user: { _id: user._id } }],
          likeCount: isLiked ? Math.max(0, currentLikeCount - 1) : currentLikeCount + 1
        })
      )
    );

    try {
      const res = await api(`/api/comments/${commentId}/like`, {
        method: "POST"
      });

      // Update with server response
      setComments(prev =>
        prev.map((comment) =>
          updateCommentInTree(comment, commentId, {
            likes: res.comment.likes,
            likeCount: res.likeCount
          })
        )
      );
    } catch (error) {
      // Revert optimistic update on error
      setComments(prev =>
        prev.map((comment) =>
          updateCommentInTree(comment, commentId, {
            likes: currentComment.likes,
            likeCount: currentLikeCount
          })
        )
      );
      const errorMessage = error?.message || "Lỗi hệ thống";
      console.error("Like comment error:", errorMessage);
      showError("Lỗi khi thích bình luận");
    } finally {
      setLikingComments(prev => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });
    }
  }

  /**
   * Handle adding/removing emote for comment
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

      // Update comment in state
      setComments(prev =>
        prev.map((comment) =>
          updateCommentInTree(comment, commentId, {
            emotes: res.comment.emotes ||
              // Fallback: remove old emote of user and add new emote
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
      showError('Lỗi khi thêm cảm xúc: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  }


  /**
   * Render emoji picker component
   */
  const renderEmojiPicker = (onSelect, isOpen, onClose, position = "left") => {
    if (!isOpen) return null;

    const positionClass = position === "right" ? "right-0 sm:right-0" : "left-0 sm:left-0";

    return (
      <div className={`fixed sm:absolute bottom-0 sm:bottom-full left-0 right-0 sm:right-auto sm:mb-2 sm:w-[320px] sm:max-w-[360px] bg-white dark:bg-neutral-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border-t sm:border border-neutral-200 dark:border-neutral-800 z-50 overflow-hidden animate-in fade-in slide-in-from-bottom sm:zoom-in-95 duration-200`}>
        <div className="p-3 sm:p-3 max-h-[50vh] sm:max-h-[280px] overflow-y-auto">
          <div className="grid grid-cols-10 sm:grid-cols-8 gap-1.5 sm:gap-1">
            {emojiList.map((emoji, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  onSelect(emoji);
                  onClose();
                }}
                className="w-11 h-11 sm:w-10 sm:h-10 flex items-center justify-center text-2xl active:bg-neutral-100 dark:active:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors touch-manipulation"
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
    const isLiking = likingComments.has(comment._id);
    const isDeleting = deletingComments.has(comment._id);
    const isUpdating = updatingComment.get(comment._id);
    const isSubmittingReply = submittingReply.get(comment._id);

    // Giới hạn indent tối đa 3 cấp để tránh tràn màn hình
    const effectiveLevel = Math.min(level, 3);
    // Mobile: indent nhỏ hơn, Desktop: indent lớn hơn
    const indentClass = effectiveLevel > 0
      ? `ml-2 sm:ml-3 md:ml-4 pl-2 sm:pl-3 border-l-2 border-neutral-200 dark:border-neutral-800`
      : "";

    return (
      <div key={comment._id} data-comment-id={comment._id} className={indentClass}>
        {/* Main Comment */}
        <div className="flex gap-2 sm:gap-3 py-1.5 sm:py-1.5 group/comment">
          <Link to={comment.author?._id ? `/user/${comment.author._id}` : '#'} className="focus:outline-none flex-shrink-0 touch-manipulation">
            <UserAvatar
              user={comment.author}
              size={40}
              showFrame={true}
              showBadge={true}
              className="hidden sm:block"
            />
            <UserAvatar
              user={comment.author}
              size={32}
              showFrame={true}
              showBadge={true}
              className="sm:hidden"
            />
          </Link>
          <div className="flex-1 min-w-0">
            <div className={`${editingComment === comment._id ? 'w-full' : 'w-fit max-w-full'} bg-neutral-100/80 dark:bg-neutral-900/80 backdrop-blur-sm rounded-xl sm:rounded-2xl rounded-tl-none px-2.5 sm:px-4 py-2 sm:py-3 border border-transparent dark:border-neutral-800`}>
              <div className="flex items-center justify-between mb-1 sm:mb-1 gap-2">
                <Link to={comment.author?._id ? `/user/${comment.author._id}` : '#'} className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-white hover:underline truncate touch-manipulation">
                  <UserName user={comment.author} maxLength={18} />
                </Link>
              </div>

              {editingComment === comment._id ? (
                <div className="mt-2">
                  <div className="relative emoji-picker-container">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full p-3 sm:p-3 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm sm:text-sm resize-none focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
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
                        className="p-2 sm:p-1.5 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 rounded-lg active:bg-neutral-100 dark:active:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition-colors touch-manipulation"
                        title="Thêm emoji"
                      >
                        <Smile size={18} className="sm:w-4 sm:h-4" />
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

                  <div className="flex gap-2 sm:gap-2 mt-3 justify-end">
                    <button
                      onClick={cancelEdit}
                      className="px-5 py-2.5 sm:px-4 sm:py-1.5 min-h-[44px] sm:min-h-0 text-xs sm:text-xs font-bold text-neutral-600 dark:text-neutral-400 active:bg-neutral-200 dark:active:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full transition-colors touch-manipulation"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={() => handleUpdateComment(comment._id)}
                      disabled={(!editContent.trim() && editImages.length === 0) || isUpdating}
                      className="px-5 py-2.5 sm:px-4 sm:py-1.5 min-h-[44px] sm:min-h-0 bg-black dark:bg-white text-white dark:text-black text-xs sm:text-xs font-bold rounded-full active:opacity-80 hover:opacity-80 disabled:opacity-50 transition-all touch-manipulation flex items-center gap-2"
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Đang lưu...</span>
                        </>
                      ) : (
                        'Lưu'
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-neutral-800 dark:text-neutral-200 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                  <MentionText
                    text={comment.content}
                    mentionedUsers={comment.mentions || []}
                  />

                  {/* Display Images */}
                  {comment.images && comment.images.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2">
                      {comment.images.map((image, index) => (
                        <div key={index} className="relative group rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 aspect-square cursor-pointer touch-manipulation" onClick={() => openLightbox(comment.images, index)}>
                          <img
                            src={image.url}
                            alt={image.alt || `Ảnh ${index + 1}`}
                            className="w-full h-full object-cover active:scale-105 hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Comment Actions */}
            <div className="flex items-center gap-2 sm:gap-4 mt-1.5 sm:mt-1.5 ml-0.5 sm:ml-2 flex-wrap">
              <span className="text-[10px] sm:text-xs text-neutral-400 font-medium flex-shrink-0 whitespace-nowrap">
                {new Date(comment.createdAt).toLocaleDateString("vi-VN")}
              </span>

              {/* Like Button */}
              <button
                onClick={() => handleLikeComment(comment._id)}
                disabled={isLiking}
                className={`flex items-center gap-1.5 sm:gap-1.5 text-xs font-bold transition-colors min-h-[44px] sm:min-h-0 px-2 sm:px-0 -ml-2 sm:ml-0 touch-manipulation disabled:opacity-50 ${comment.likes?.some(like => like._id === user?._id || like.user?._id === user?._id)
                  ? 'text-red-600 dark:text-red-500'
                  : 'text-neutral-500 active:text-neutral-900 dark:active:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-300'
                  }`}
              >
                {isLiking ? (
                  <Loader2 size={16} className="sm:w-3.5 sm:h-3.5 animate-spin" />
                ) : (
                  <Heart
                    size={16}
                    className={`sm:w-3.5 sm:h-3.5 ${comment.likes?.some(like => like._id === user?._id || like.user?._id === user?._id) ? 'fill-current' : ''}`}
                  />
                )}
                {comment.likeCount > 0 && <span className="text-xs sm:text-xs">{comment.likeCount}</span>}
                <span className="hidden sm:inline ml-0.5">{comment.likes?.some(like => like._id === user?._id || like.user?._id === user?._id) ? 'Đã thích' : 'Thích'}</span>
              </button>

              {/* Reply Button */}
              {user && (
                <button
                  onClick={() => {
                    setReplyingTo(comment._id);
                    setReplyContent(`@${comment.author?.name} `);
                  }}
                  className="text-xs font-bold text-neutral-500 active:text-neutral-900 dark:active:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-300 transition-colors min-h-[44px] sm:min-h-0 px-2 sm:px-0 -ml-2 sm:ml-0 touch-manipulation"
                >
                  Phản hồi
                </button>
              )}

              {/* More Actions */}
              <div className="relative comment-dropdown">
                <button
                  onClick={() => setShowDropdown(showDropdown === comment._id ? null : comment._id)}
                  className="text-neutral-400 active:text-neutral-900 dark:active:text-neutral-200 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors opacity-100 sm:opacity-0 sm:group-hover/comment:opacity-100 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center touch-manipulation"
                >
                  <MoreHorizontal size={18} className="sm:w-3.5 sm:h-3.5" />
                </button>

                {showDropdown === comment._id && (
                  <div className="absolute right-0 bottom-full mb-1 min-w-[140px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-[9999] overflow-hidden">
                    {user && (user._id?.toString() === comment.author?._id?.toString() || user.id?.toString() === comment.author?._id?.toString()) && (
                      <button
                        onClick={() => handleEditComment(comment)}
                        className="w-full px-5 py-4 sm:px-4 sm:py-2.5 text-left text-sm sm:text-xs font-bold text-neutral-700 dark:text-neutral-300 active:bg-neutral-50 dark:active:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors touch-manipulation min-h-[56px] sm:min-h-0"
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
                              setShowDropdown(null);
                            }
                          }}
                          className="w-full px-5 py-4 sm:px-4 sm:py-2.5 text-left text-sm sm:text-xs font-bold text-red-600 active:bg-red-50 dark:active:bg-red-900/20 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors touch-manipulation min-h-[56px] sm:min-h-0"
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
              <div className="mt-3 sm:mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <form onSubmit={(e) => handleSubmitReply(e, comment._id, comment.author)} className="flex gap-2 sm:gap-3">
                  <UserAvatar
                    user={user}
                    size={36}
                    showFrame={true}
                    showBadge={false}
                    className="sm:hidden"
                  />
                  <UserAvatar
                    user={user}
                    size={32}
                    showFrame={true}
                    showBadge={false}
                    className="hidden sm:block"
                  />
                  <div className="flex-1">
                    <div className="relative">
                      <textarea
                        ref={replyTextareaRef}
                        value={replyContent}
                        onChange={handleReplyContentChange}
                        onKeyDown={handleReplyKeyDown}
                        onSelect={(e) => setReplyCursorPosition(e.target.selectionStart)}
                        onClick={(e) => setReplyCursorPosition(e.target.selectionStart)}
                        placeholder={`Phản hồi ${comment.author?.name}... (Gõ @ để tag bạn bè)`}
                        className="w-full px-4 py-3 sm:py-3 bg-neutral-100 dark:bg-neutral-900 border-none rounded-2xl text-sm focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 transition-all resize-none"
                        rows={1}
                        autoFocus
                        style={{ minHeight: '48px' }}
                      />

                      {/* Mention Autocomplete for Reply */}
                      {showReplyMentionAutocomplete && (
                        <div className="absolute bottom-full left-0 mb-2" style={{ zIndex: 100 }}>
                          <MentionAutocomplete
                            value={replyContent}
                            cursorPosition={replyCursorPosition}
                            onSelect={handleReplyMentionSelect}
                            onClose={() => setShowReplyMentionAutocomplete(false)}
                          />
                        </div>
                      )}

                      <div className="absolute right-2 bottom-2 flex items-center gap-1.5 sm:gap-1 emoji-picker-container relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setShowReplyEmojiPicker(showReplyEmojiPicker === comment._id ? null : comment._id);
                          }}
                          className="p-2 sm:p-1.5 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 rounded-lg active:bg-neutral-200 dark:active:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition-colors touch-manipulation"
                          title="Thêm emoji"
                        >
                          <Smile size={18} className="sm:w-4 sm:h-4" />
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
                      <div className="mt-2 grid grid-cols-4 gap-2 sm:gap-2">
                        {replyImages.map((img, idx) => (
                          <div key={idx} className="relative aspect-square rounded-lg overflow-hidden">
                            <img src={img.preview} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-end gap-2 sm:gap-2 mt-3 sm:mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyContent("");
                          setReplyImages([]);
                          setReplyCursorPosition(0);
                          setShowReplyMentionAutocomplete(false);
                        }}
                        className="px-4 py-2.5 sm:px-3 sm:py-1.5 min-h-[44px] sm:min-h-0 text-xs sm:text-xs font-bold text-neutral-500 active:text-neutral-900 dark:active:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-300 transition-colors touch-manipulation"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={(!replyContent.trim() && replyImages.length === 0) || isSubmittingReply}
                        className="px-5 py-2.5 sm:px-4 sm:py-1.5 min-h-[44px] sm:min-h-0 bg-black dark:bg-white text-white dark:text-black text-xs sm:text-xs font-bold rounded-full active:opacity-90 hover:opacity-90 disabled:opacity-50 transition-all touch-manipulation flex items-center gap-2"
                      >
                        {isSubmittingReply ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Đang gửi...</span>
                          </>
                        ) : (
                          "Gửi"
                        )}
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
                className="flex items-center gap-2 sm:gap-2 mt-2 sm:mt-1.5 text-xs sm:text-xs font-bold text-neutral-500 active:text-neutral-900 dark:active:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-300 transition-colors group/toggle min-h-[44px] sm:min-h-0 -ml-2 sm:ml-0 px-2 sm:px-0 touch-manipulation"
              >
                <div className="w-6 sm:w-6 h-[1px] bg-neutral-300 dark:bg-neutral-700 group-active/toggle:bg-neutral-500 group-hover/toggle:bg-neutral-500 transition-colors"></div>
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
      <div className="text-center py-10 sm:py-12 px-4 sm:px-0">
        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-400">
          <MessageCircle size={20} className="sm:w-6 sm:h-6" />
        </div>
        <h3 className="text-neutral-900 dark:text-white font-bold mb-2 text-base sm:text-lg">Đăng nhập để bình luận</h3>
        <p className="text-neutral-500 text-xs sm:text-sm mb-5 sm:mb-4">Tham gia thảo luận cùng cộng đồng</p>
        <Link to="/login" className="inline-block px-6 py-3 sm:py-2 min-h-[44px] sm:min-h-0 bg-black dark:bg-white text-white dark:text-black font-bold rounded-full text-sm hover:opacity-90 active:opacity-90 transition-opacity touch-manipulation">
          Đăng nhập ngay
        </Link>
      </div>
    );
  }

  return (
    <ComponentErrorBoundary>
      <div className="max-w-4xl mx-auto px-2 sm:px-0 overflow-x-hidden">

        {/* Comment Input */}
        <div className="mb-4 sm:mb-8 flex gap-2 sm:gap-4">
          <UserAvatar
            user={user}
            size={40}
            showFrame={true}
            showBadge={true}
            className="hidden sm:block"
          />
          <UserAvatar
            user={user}
            size={32}
            showFrame={true}
            showBadge={true}
            className="sm:hidden flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <form onSubmit={handleSubmitComment} className="relative group/input">
              <div className="relative bg-neutral-100 dark:bg-neutral-900 rounded-xl sm:rounded-2xl transition-all focus-within:ring-2 focus-within:ring-black/5 dark:focus-within:ring-white/10 focus-within:bg-white dark:focus-within:bg-black border border-transparent focus-within:border-neutral-200 dark:focus-within:border-neutral-800">
                <textarea
                  ref={newCommentTextareaRef}
                  value={newComment}
                  onChange={handleNewCommentChange}
                  onKeyDown={handleNewCommentKeyDown}
                  onSelect={(e) => setNewCommentCursorPosition(e.target.selectionStart)}
                  onClick={(e) => setNewCommentCursorPosition(e.target.selectionStart)}
                  placeholder="Viết bình luận..."
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-transparent border-none text-xs sm:text-base text-neutral-900 dark:text-white placeholder-neutral-500 focus:ring-0 resize-none rounded-xl sm:rounded-2xl"
                  rows={Math.max(2, newComment.split('\n').length)}
                  style={{ minHeight: '48px', maxHeight: '200px' }}
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

                <div className="px-2 sm:px-2 pb-2 sm:pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1 sm:gap-1 emoji-picker-container relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowEmojiPicker(!showEmojiPicker);
                      }}
                      className="p-1.5 sm:p-1.5 min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 rounded-lg active:bg-neutral-200 dark:active:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition-colors touch-manipulation"
                      title="Thêm emoji"
                    >
                      <Smile size={16} className="sm:w-[18px] sm:h-[18px]" />
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
                    disabled={(!newComment.trim() && newCommentImages.length === 0) || submittingComment}
                    className="px-4 py-2 sm:px-4 sm:py-1.5 min-h-[36px] sm:min-h-0 bg-black dark:bg-white text-white dark:text-black text-xs sm:text-sm font-bold rounded-full active:opacity-90 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm touch-manipulation flex items-center gap-1.5 sm:gap-2"
                  >
                    {submittingComment ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Đang gửi...</span>
                      </>
                    ) : (
                      "Gửi"
                    )}
                  </button>
                </div>
              </div>
            </form>

            {newCommentImages.length > 0 && (
              <div className="mt-3 grid grid-cols-4 sm:grid-cols-5 gap-2 sm:gap-2 animate-in fade-in zoom-in-95 duration-200">
                {newCommentImages.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 group">
                    <img src={img.preview} className="w-full h-full object-cover" />
                    <button
                      onClick={() => setNewCommentImages(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 p-1.5 sm:p-1 min-w-[32px] min-h-[32px] sm:min-w-0 sm:min-h-0 bg-black/50 text-white rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity touch-manipulation"
                    >
                      <X size={14} className="sm:w-3 sm:h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Comments List */}
        <div ref={commentsContainerRef} className="space-y-2.5 sm:space-y-2">
          {fetchingComments ? (
            <div className="text-center py-12">
              <Loader2 size={24} className="animate-spin text-neutral-400 mx-auto" />
              <p className="text-neutral-500 text-sm mt-2">Đang tải bình luận...</p>
            </div>
          ) : comments.length > 0 ? (
            comments.map((comment) => renderComment(comment))
          ) : (
            <div className="text-center py-10 sm:py-12 bg-neutral-50 dark:bg-neutral-900/30 rounded-2xl sm:rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-800 px-4 sm:px-0">
              <div className="text-neutral-400 mb-2 text-sm sm:text-base">Chưa có bình luận nào</div>
              <div className="text-xs sm:text-sm text-neutral-500">Hãy là người đầu tiên chia sẻ suy nghĩ của bạn!</div>
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

// Memoize component để tối ưu performance
export default React.memo(CommentSection, (prevProps, nextProps) => {
  // Re-render khi postId hoặc user status thay đổi
  // Kiểm tra cả sự tồn tại của user (null -> có user) và user id thay đổi
  const prevUserId = prevProps.user?._id || prevProps.user?.id || null;
  const nextUserId = nextProps.user?._id || nextProps.user?.id || null;

  return prevProps.postId === nextProps.postId &&
    prevUserId === nextUserId;
});
