import { useState, useEffect } from "react";
import { X, User, Edit3, Trash2, Users } from "lucide-react";
import { chatAPI } from "../../chatAPI";
import { getUserAvatarUrl, AVATAR_SIZES } from "../../utils/avatarUtils";

/**
 * GroupMembersModal - Modal để quản lý thành viên và biệt danh trong nhóm chat
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Trạng thái mở/đóng modal
 * @param {Function} props.onClose - Callback đóng modal
 * @param {Object} props.conversation - Dữ liệu cuộc trò chuyện
 * @param {Object} props.currentUser - User hiện tại
 * @param {Function} props.onMembersUpdated - Callback khi thành viên được cập nhật
 * @returns {JSX.Element} Component group members modal
 */
export default function GroupMembersModal({ 
  isOpen, 
  onClose, 
  conversation, 
  currentUser,
  onMembersUpdated 
}) {
  // ==================== STATE MANAGEMENT ====================
  
  const [members, setMembers] = useState([]); // Danh sách thành viên
  const [editingMember, setEditingMember] = useState(null); // Thành viên đang chỉnh sửa biệt danh
  const [newNickname, setNewNickname] = useState(""); // Biệt danh mới
  const [loading, setLoading] = useState(false); // Loading state
  const [error, setError] = useState(""); // Error message

  // ==================== EFFECTS ====================

  // Load members when modal opens
  useEffect(() => {
    if (isOpen && conversation) {
      loadMembers();
    }
  }, [isOpen, conversation]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setMembers([]);
      setEditingMember(null);
      setNewNickname("");
      setError("");
    }
  }, [isOpen]);

  // ==================== FUNCTIONS ====================

  const loadMembers = () => {
    if (!conversation?.participants) return;
    
    const activeMembers = conversation.participants.filter(p => !p.leftAt);
    setMembers(activeMembers);
  };

  const isCurrentUser = (member) => {
    const currentUserId = currentUser?.user?._id || currentUser?.user?.id || currentUser?._id || currentUser?.id;
    const memberId = member.user?._id || member.user?.id || member._id || member.id;
    return memberId === currentUserId;
  };

  const isGroupAdmin = (member) => {
    return member.role === 'admin';
  };

  const canEditNickname = (member) => {
    // Chỉ có thể đặt biệt danh cho người khác, không phải chính mình
    return !isCurrentUser(member);
  };

  const handleEditNickname = (member) => {
    setEditingMember(member);
    setNewNickname(member.nickname || "");
    setError("");
  };

  const handleSaveNickname = async () => {
    if (!editingMember) return;

    if (!newNickname.trim()) {
      setError("Biệt danh không được để trống");
      return;
    }

    if (newNickname.trim().length > 30) {
      setError("Biệt danh không được quá 30 ký tự");
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      await chatAPI.setNickname(conversation._id, editingMember.user._id, newNickname.trim());
      
      // Update local state
      setMembers(prev => prev.map(member => 
        member.user._id === editingMember.user._id 
          ? { ...member, nickname: newNickname.trim() }
          : member
      ));
      
      setEditingMember(null);
      setNewNickname("");
      onMembersUpdated?.();
    } catch (error) {
      setError(error.message || "Không thể đặt biệt danh");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveNickname = async (member) => {
    if (!window.confirm("Bạn có chắc muốn xóa biệt danh này?")) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      await chatAPI.removeNickname(conversation._id, member.user._id);
      
      // Update local state
      setMembers(prev => prev.map(m => 
        m.user._id === member.user._id 
          ? { ...m, nickname: null }
          : m
      ));
      
      onMembersUpdated?.();
    } catch (error) {
      console.error("Error removing nickname:", error);
      setError(error.message || "Không thể xóa biệt danh");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingMember(null);
    setNewNickname("");
    setError("");
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSaveNickname();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const getDisplayName = (member) => {
    return member.nickname || member.user?.name || "Không tên";
  };

  // ==================== RENDER ====================

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <Users size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Thành viên nhóm
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {conversation?.groupName} • {members.length} thành viên
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}

          {!loading && (
            <div className="space-y-4">
              {members.map((member) => (
                <div key={member.user._id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {/* Avatar */}
                    <div className="relative">
                      <img
                        src={getUserAvatarUrl(member.user, AVATAR_SIZES.MEDIUM)}
                        alt={getDisplayName(member)}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      {member.user?.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                      )}
                    </div>

                    {/* User info */}
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {getDisplayName(member)}
                        </h4>
                        {isGroupAdmin(member) && (
                          <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full">
                            Admin
                          </span>
                        )}
                        {isCurrentUser(member) && (
                          <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-full">
                            Bạn
                          </span>
                        )}
                      </div>
                      {member.nickname && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Tên thật: {member.user?.name}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {canEditNickname(member) && (
                    <div className="flex items-center space-x-2">
                      {editingMember?.user._id === member.user._id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={newNickname}
                            onChange={(e) => setNewNickname(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder="Nhập biệt danh..."
                            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-600 dark:text-white"
                            maxLength={30}
                            autoFocus
                          />
                          <button
                            onClick={handleSaveNickname}
                            className="px-3 py-1 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
                          >
                            Lưu
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleEditNickname(member)}
                            className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                            title="Chỉnh sửa biệt danh"
                          >
                            <Edit3 size={16} />
                          </button>
                          {member.nickname && (
                            <button
                              onClick={() => handleRemoveNickname(member)}
                              className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                              title="Xóa biệt danh"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Info */}
          <div className="mt-6 text-xs text-gray-500 dark:text-gray-400">
            <p>• Biệt danh chỉ hiển thị trong nhóm này</p>
            <p>• Tối đa 30 ký tự</p>
            <p>• Biệt danh sẽ được ưu tiên hiển thị thay vì tên thật</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
