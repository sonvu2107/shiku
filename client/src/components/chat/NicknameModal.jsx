import { useState, useEffect } from "react";
import { X, User, Edit3, Trash2 } from "lucide-react";
import { chatAPI } from "../../chatAPI";

/**
 * NicknameModal - Modal để quản lý biệt danh của người dùng trong cuộc trò chuyện
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Trạng thái mở/đóng modal
 * @param {Function} props.onClose - Callback đóng modal
 * @param {Object} props.conversation - Dữ liệu cuộc trò chuyện
 * @param {Object} props.targetUser - Người dùng cần đặt biệt danh
 * @param {Function} props.onNicknameUpdated - Callback khi biệt danh được cập nhật
 * @returns {JSX.Element} Component nickname modal
 */
export default function NicknameModal({ 
  isOpen, 
  onClose, 
  conversation, 
  targetUser, 
  onNicknameUpdated 
}) {
  // ==================== STATE MANAGEMENT ====================
  
  const [nickname, setNickname] = useState(""); // Biệt danh hiện tại
  const [newNickname, setNewNickname] = useState(""); // Biệt danh mới đang nhập
  const [isEditing, setIsEditing] = useState(false); // Trạng thái đang chỉnh sửa
  const [loading, setLoading] = useState(false); // Loading state
  const [error, setError] = useState(""); // Error message

  // ==================== EFFECTS ====================

  // Load current nickname when modal opens
  useEffect(() => {
    if (isOpen && conversation && targetUser) {
      loadCurrentNickname();
    }
  }, [isOpen, conversation, targetUser]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setNickname("");
      setNewNickname("");
      setIsEditing(false);
      setError("");
    }
  }, [isOpen]);

  // ==================== FUNCTIONS ====================

  const loadCurrentNickname = async () => {
    try {
      setLoading(true);
      const response = await chatAPI.getNickname(conversation._id, targetUser._id);
      setNickname(response.nickname || "");
      setNewNickname(response.nickname || "");
    } catch (error) {
      console.error("Error loading nickname:", error);
      setError("Không thể tải biệt danh hiện tại");
    } finally {
      setLoading(false);
    }
  };

  const handleSetNickname = async () => {
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
      
      await chatAPI.setNickname(conversation._id, targetUser._id, newNickname.trim());
      
      setNickname(newNickname.trim());
      setIsEditing(false);
      onNicknameUpdated?.();
    } catch (error) {
      console.error("Error setting nickname:", error);
      setError(error.message || "Không thể đặt biệt danh");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveNickname = async () => {
    if (!window.confirm("Bạn có chắc muốn xóa biệt danh này?")) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      await chatAPI.removeNickname(conversation._id, targetUser._id);
      
      setNickname("");
      setNewNickname("");
      setIsEditing(false);
      onNicknameUpdated?.();
    } catch (error) {
      console.error("Error removing nickname:", error);
      setError(error.message || "Không thể xóa biệt danh");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setNewNickname(nickname);
    setIsEditing(false);
    setError("");
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSetNickname();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // ==================== RENDER ====================

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <User size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Quản lý biệt danh
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {targetUser?.name}
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
        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          )}

          {!loading && (
            <>
              {/* Current nickname display */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Biệt danh hiện tại
                </label>
                {isEditing ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={newNickname}
                      onChange={(e) => setNewNickname(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Nhập biệt danh mới..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      maxLength={30}
                      autoFocus
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={handleCancel}
                        className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={handleSetNickname}
                        disabled={!newNickname.trim() || newNickname.trim() === nickname}
                        className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Lưu
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-gray-900 dark:text-white">
                      {nickname || "Chưa có biệt danh"}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setIsEditing(true)}
                        className="p-1.5 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                        title="Chỉnh sửa biệt danh"
                      >
                        <Edit3 size={16} />
                      </button>
                      {nickname && (
                        <button
                          onClick={handleRemoveNickname}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                          title="Xóa biệt danh"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Error message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Info */}
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <p>• Biệt danh chỉ hiển thị trong cuộc trò chuyện này</p>
                <p>• Tối đa 30 ký tự</p>
                <p>• Biệt danh sẽ được ưu tiên hiển thị thay vì tên thật</p>
              </div>
            </>
          )}
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
