import { useState, useEffect } from "react";
import { api } from "../api";
import { Heart, MessageCircle, MoreHorizontal, ChevronDown, ChevronUp, ThumbsUp, Smile, Frown, Laugh, Angry } from "lucide-react";
import BanNotification from "./BanNotification";
import UserName from "./UserName";

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
  
  // Reply system
  const [replyingTo, setReplyingTo] = useState(null); // ID comment đang reply
  const [replyContent, setReplyContent] = useState(""); // Nội dung reply
  const [expandedReplies, setExpandedReplies] = useState(new Set()); // Set các comment đã expand replies
  
  // UI states
  const [loading, setLoading] = useState(false); // Loading state
  const [showBanNotification, setShowBanNotification] = useState(false); // Hiện ban notification
  const [banInfo, setBanInfo] = useState(null); // Thông tin ban
  
  // Edit system
  const [editingComment, setEditingComment] = useState(null); // ID comment đang edit
  const [editContent, setEditContent] = useState(""); // Nội dung edit
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
        console.error("Lỗi load comments:", err);
      }
    };
    fetchComments();
  }, [postId]);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setLoading(true);
    try {
      const response = await api(`/api/comments/post/${postId}`, {
        method: "POST",
        body: { content: newComment }
      });

      // Add new comment to the top
      setComments((prev) => [
        { ...response.comment, replies: [] },
        ...prev
      ]);
      setNewComment("");
    } catch (error) {
      if (error.banInfo) {
        setBanInfo(error.banInfo);
        setShowBanNotification(true);
      } else {
        alert("Lỗi khi đăng bình luận: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReply = async (e, parentId, mentionUser = null) => {
    e.preventDefault();
    if (!replyContent.trim() || !user) return;

    setLoading(true);
    try {
      let content = replyContent;

      // Add mention if replying to someone
      if (mentionUser && !content.startsWith(`@${mentionUser.name}`)) {
        content = `@${mentionUser.name} ${content}`;
      }

      const response = await api(`/api/comments/post/${postId}`, {
        method: "POST",
        body: { content, parentId }
      });

      // Add reply to the specific comment
      setComments((prev) =>
        prev.map((comment) =>
          addReplyToComment(comment, parentId, {
            ...response.comment,
            replies: []
          })
        )
      );

      setReplyContent("");
      setReplyingTo(null);

      // Auto expand replies to show the new reply
      setExpandedReplies((prev) => new Set([...prev, parentId]));
    } catch (error) {
      alert("Lỗi khi trả lời: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditComment = (comment) => {
    setEditingComment(comment._id);
    setEditContent(comment.content);
    setShowDropdown(null);
  };

  const handleUpdateComment = async (commentId) => {
    if (!editContent.trim()) {
      alert("Vui lòng nhập nội dung!");
      return;
    }

    setLoading(true);
    try {
      const response = await api(`/api/comments/${commentId}`, {
        method: "PUT",
        body: { content: editContent }
      });

      // Update comment in state
      setComments((prev) =>
        prev.map((comment) =>
          updateCommentInTree(comment, commentId, response.comment)
        )
      );

      setEditingComment(null);
      setEditContent("");
    } catch (error) {
      alert("Lỗi khi cập nhật: " + error.message);
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
      alert("Lỗi khi xóa bình luận: " + error.message);
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
      console.error("Error liking comment:", error);
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
        body: { type: emoteType }
      });
      
      // Cập nhật comment trong state
      setComments(prev =>
        prev.map((comment) =>
          updateCommentInTree(comment, commentId, {
            emotes: res.comment.emotes,
            emoteCount: res.emoteCount
          })
        )
      );
      
      setShowEmotePicker(null);
    } catch (error) {
      console.error("Error adding emote:", error);
    } finally {
      setLoading(false);
    }
  }


  const renderComment = (comment, level = 0) => {
    const isExpanded = expandedReplies.has(comment._id);
    const hasReplies = comment.replies && comment.replies.length > 0;

    return (
      <div key={comment._id} className={`${level > 0 ? "ml-12" : ""}`}>
        {/* Main Comment */}
        <div className="flex gap-3 py-2">
          <img
            src={
              comment.author?.avatarUrl ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                comment.author?.name || "User"
              )}&background=3b82f6&color=ffffff&size=40`
            }
            alt={comment.author?.name}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="bg-gray-100 rounded-2xl px-4 py-2">
              <div className="font-semibold text-sm text-gray-900 flex items-center gap-1">
                  <UserName user={comment.author} />
              </div>
              {editingComment === comment._id ? (
                <div className="mt-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-2 border rounded text-sm resize-none"
                    rows="2"
                    placeholder="Chỉnh sửa bình luận..."
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleUpdateComment(comment._id)}
                      disabled={loading}
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      Lưu
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-gray-800 text-sm break-words">
                  {comment.content}
                </div>
              )}
            </div>

            {/* Comment Actions with Like and Emote */}
            <div className="flex items-center gap-4 mt-1 ml-4">
              <span className="text-xs text-gray-500">
                {new Date(comment.createdAt).toLocaleDateString("vi-VN")}
              </span>
              
              {/* Like Button */}
              <button
                onClick={() => handleLikeComment(comment._id)}
                className={`flex items-center gap-1 text-xs transition-colors ${
                  comment.likes?.some(like => like._id === user?._id) 
                    ? 'text-blue-600 font-medium' 
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                <ThumbsUp size={14} className={comment.likes?.some(like => like._id === user?._id) ? 'fill-current' : ''} />
                {comment.likeCount > 0 && <span>{comment.likeCount}</span>}
              </button>

              {/* Emote Button */}
              <div className="relative">
                <button
                  onClick={() => setShowEmotePicker(showEmotePicker === comment._id ? null : comment._id)}
                  className={`flex items-center gap-1 text-xs transition-colors ${
                    comment.emotes?.some(emote => emote.user._id === user?._id) 
                      ? 'text-red-600 font-medium' 
                      : 'text-gray-600 hover:text-red-600'
                  }`}
                >
                  <Smile size={14} />
                  {comment.emoteCount > 0 && <span>{comment.emoteCount}</span>}
                </button>

                {/* Emote Picker */}
                {showEmotePicker === comment._id && (
                  <div className="absolute top-6 left-0 bg-white border rounded-lg shadow-lg p-2 z-10 emote-picker">
                    <div className="flex gap-1">
                      {Object.entries(emoteConfig).map(([type, config]) => {
                        const Icon = config.icon;
                        const isActive = comment.emotes?.some(emote => emote.user._id === user?._id && emote.type === type);
                        return (
                          <button
                            key={type}
                            onClick={() => handleEmoteComment(comment._id, type)}
                            className={`p-1 rounded-full transition-colors ${
                              isActive 
                                ? `${config.bgColor} ${config.color}` 
                                : 'hover:bg-gray-100'
                            }`}
                            title={type}
                          >
                            <Icon size={16} />
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
                  className="text-xs text-gray-600 hover:text-blue-600 font-semibold"
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
                  className="text-xs text-gray-600 hover:text-gray-800"
                >
                  <MoreHorizontal size={14} />
                </button>

                {showDropdown === comment._id && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg z-10 min-w-24">
                    {user && user._id === comment.author._id && (
                      <button
                        onClick={() => handleEditComment(comment)}
                        className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Sửa
                      </button>
                    )}
                    {user &&
                      (user._id === comment.author._id ||
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
                          className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
                        >
                          Xóa
                        </button>
                      )}
                  </div>
                )}
              </div>
            </div>

            {/* Show Replies Toggle */}
            {hasReplies && (
              <button
                onClick={() => toggleReplies(comment._id)}
                className="flex items-center gap-2 mt-2 ml-4 text-sm font-semibold text-blue-600 hover:text-blue-800"
              >
                {isExpanded ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
                {isExpanded ? "Ẩn phản hồi" : `${comment.replies.length} phản hồi`}
              </button>
            )}

            {/* Reply Input */}
            {replyingTo === comment._id && user && (
              <form
                onSubmit={(e) =>
                  handleSubmitReply(e, comment._id, comment.author)
                }
                className="mt-3 ml-4"
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
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="flex-1">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Viết phản hồi..."
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                      autoFocus
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        type="submit"
                        disabled={!replyContent.trim() || loading}
                        className="px-4 py-1 text-sm bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50"
                      >
                        {loading ? "Đang gửi..." : "Phản hồi"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyContent("");
                        }}
                        className="px-4 py-1 text-sm text-gray-600 hover:text-gray-800"
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
              <div className="mt-3">
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
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Comment Input */}
      <form onSubmit={handleSubmitComment} className="space-y-3">
        <div className="flex gap-3">
          <img
            src={
              user?.avatarUrl ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                user?.name || "User"
              )}&background=3b82f6&color=ffffff&size=40`
            }
            alt={user?.name}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Viết bình luận..."
              className="w-full px-4 py-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="submit"
                disabled={!newComment.trim() || loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Đang đăng..." : "Bình luận"}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-2">
        {comments.length > 0 ? (
          comments.map((comment) => renderComment(comment))
        ) : (
          <div className="text-center py-8 text-gray-500">
            Chưa có bình luận nào. Hãy là người đầu tiên!
          </div>
        )}
      </div>

      {/* Ban Notification */}
      {showBanNotification && (
        <BanNotification
          banInfo={banInfo}
          onClose={() => setShowBanNotification(false)}
        />
      )}
    </div>
  );
}
