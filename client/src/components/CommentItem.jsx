import { useState } from "react";
import { api } from "../api";
import { 
  Heart, 
  MessageCircle, 
  MoreHorizontal, 
  ThumbsUp, 
  Smile, 
  Frown, 
  Laugh, 
  Angry,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import UserName from "./UserName";

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
 * CommentItem - Component hiển thị một comment với like và emote
 * @param {Object} comment - Dữ liệu comment
 * @param {Object} user - User hiện tại
 * @param {Function} onReply - Callback khi reply
 * @param {Function} onEdit - Callback khi edit
 * @param {Function} onDelete - Callback khi delete
 * @param {boolean} isReply - Có phải là reply không
 * @param {boolean} showReplies - Có hiển thị replies không
 * @param {Function} onToggleReplies - Callback toggle replies
 */
export default function CommentItem({ 
  comment, 
  user, 
  onReply, 
  onEdit, 
  onDelete, 
  isReply = false,
  showReplies = false,
  onToggleReplies
}) {
  // ==================== STATE MANAGEMENT ====================
  
  const [isLiked, setIsLiked] = useState(comment.likes?.some(like => like._id === user?._id) || false);
  const [likeCount, setLikeCount] = useState(comment.likeCount || 0);
  const [emoteCount, setEmoteCount] = useState(comment.emoteCount || 0);
  const [showEmotePicker, setShowEmotePicker] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  // ==================== EVENT HANDLERS ====================

  /**
   * Xử lý like/unlike comment
   */
  const handleLike = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const res = await api(`/api/comments/${comment._id}/like`, {
        method: "POST"
      });
      
      setIsLiked(res.isLiked);
      setLikeCount(res.likeCount);
    } catch (error) {
      console.error("Like error:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Xử lý thêm/xóa emote
   */
  const handleEmote = async (emoteType) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const res = await api(`/api/comments/${comment._id}/emote`, {
        method: "POST",
        body: { type: emoteType }
      });
      
      setEmoteCount(res.emoteCount);
      setShowEmotePicker(false);
    } catch (error) {
      console.error("Emote error:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Kiểm tra user đã emote loại nào
   */
  const getUserEmote = () => {
    if (!user || !comment.emotes) return null;
    return comment.emotes.find(emote => emote.user._id === user._id);
  };

  const userEmote = getUserEmote();

  return (
    <div className={`${isReply ? 'ml-8 mt-2' : ''} border-b border-gray-100 pb-3 relative overflow-visible`}>
      {/* Comment Content */}
      <div className="flex gap-3">
        {/* Avatar */}
        <img
          src={comment.author?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author?.name || 'User')}&background=cccccc&color=222222&size=32`}
          alt="avatar"
          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
        />
        
        {/* Comment Body */}
        <div className="flex-1 min-w-0">
          {/* Author & Time */}
          <div className="flex items-center gap-2 mb-1">
            <UserName 
              user={comment.author}
              className="font-medium text-gray-900"
            />
            <span className="text-xs text-gray-500">
              {new Date(comment.createdAt).toLocaleString('vi-VN')}
            </span>
            {comment.edited && (
              <span className="text-xs text-gray-400">(đã chỉnh sửa)</span>
            )}
          </div>
          
          {/* Comment Text */}
          <div className="text-gray-800 mb-2 whitespace-pre-wrap">
            {comment.content}
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-4">
            {/* Like Button */}
            <button
              onClick={handleLike}
              disabled={loading || !user}
              className={`flex items-center gap-1 text-sm transition-colors ${
                isLiked 
                  ? 'text-blue-600 font-medium' 
                  : 'text-gray-500 hover:text-blue-600'
              }`}
            >
              <ThumbsUp size={16} className={isLiked ? 'fill-current' : ''} />
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>

            {/* Emote Button */}
            <div className="relative">
              <button
                onClick={() => setShowEmotePicker(!showEmotePicker)}
                disabled={loading || !user}
                className={`flex items-center gap-1 text-sm transition-colors ${
                  userEmote 
                    ? 'text-red-600 font-medium' 
                    : 'text-gray-500 hover:text-red-600'
                }`}
              >
                <Smile size={16} />
                {emoteCount > 0 && <span>{emoteCount}</span>}
              </button>

              {/* Emote Picker */}
              {showEmotePicker && (
                <div className="absolute top-8 left-0 bg-white border rounded-lg shadow-lg p-2 z-20">
                  <div className="flex gap-2">
                    {Object.entries(emoteConfig).map(([type, config]) => {
                      const Icon = config.icon;
                      const isActive = userEmote?.type === type;
                      return (
                        <button
                          key={type}
                          onClick={() => handleEmote(type)}
                          className={`p-2 rounded-full transition-colors ${
                            isActive 
                              ? `${config.bgColor} ${config.color}` 
                              : 'hover:bg-gray-100'
                          }`}
                          title={type}
                        >
                          <Icon size={20} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Reply Button */}
            {!isReply && (
              <button
                onClick={() => onReply(comment._id)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 transition-colors"
              >
                <MessageCircle size={16} />
                Trả lời
              </button>
            )}

            {/* More Actions */}
            {user && (user._id === comment.author?._id || user.role === 'admin') && (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <MoreHorizontal size={16} />
                </button>

                {showDropdown && (
                  <div className="absolute right-0 top-8 bg-white border rounded-lg shadow-lg py-1 z-[2000] min-w-[120px]">
                    <button
                      onClick={() => {
                        onEdit(comment._id, comment.content);
                        setShowDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Chỉnh sửa
                    </button>
                    <button
                      onClick={() => {
                        onDelete(comment._id);
                        setShowDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
                    >
                      Xóa
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Emote Display */}
          {comment.emotes && comment.emotes.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(emoteConfig).map(([type, config]) => {
                const typeEmotes = comment.emotes.filter(emote => emote.type === type);
                if (typeEmotes.length === 0) return null;
                
                const Icon = config.icon;
                return (
                  <div
                    key={type}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${config.bgColor} ${config.color}`}
                  >
                    <Icon size={12} />
                    <span>{typeEmotes.length}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



