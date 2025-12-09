import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus } from 'lucide-react';
import { chatAPI } from '../../chatAPI';
import { getUserAvatarUrl, AVATAR_SIZES } from '../../utils/avatarUtils';
import { useToast } from '../../contexts/ToastContext';
import Avatar from '../Avatar';

/**
 * AddMembersModal - Modal add member to group chat
 * Allows searching and adding new users to the group chat
 * @param {Object} props - Component props
 * @param {Object} props.conversation - Conversation data
 * @param {boolean} props.isOpen - Modal visibility state
 * @param {Function} props.onClose - Callback to close modal
 * @param {Function} props.onUpdateConversation - Callback to update conversation
 * @returns {JSX.Element|null} Modal component or null if not visible
 */
const AddMembersModal = ({
  conversation,
  isOpen,
  onClose,
  onUpdateConversation
}) => {
  const { showError } = useToast();
  // ==================== STATE MANAGEMENT ====================

  // UI states
  const [loading, setLoading] = useState(false); // Loading state
  const [isSearching, setIsSearching] = useState(false); // Search loading state

  // Search states
  const [searchQuery, setSearchQuery] = useState(''); // Search query
  const [searchResults, setSearchResults] = useState([]); // Search results

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isOpen]);

  const searchUsers = async (query) => {
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);

      // Get latest conversation details to ensure accurate filtering
      const latestConversation = await chatAPI.getConversationDetails(conversation._id);

      const response = await chatAPI.searchUsers(query);
      // Filter out users already in the conversation
      const existingUserIds = latestConversation?.participants
        .filter(p => !p.leftAt) // Only check active participants
        .map(p => p.user._id) || [];

      const filteredResults = response.filter(user => !existingUserIds.includes(user._id));

      setSearchResults(filteredResults);
    } catch (error) {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddMember = async (userId) => {
    try {
      await chatAPI.addParticipants(conversation._id, [userId]);
      setSearchQuery('');
      setSearchResults([]);

      // Refresh conversation data
      if (onUpdateConversation) {
        await onUpdateConversation();
      }

      onClose();
    } catch (error) {
      showError(`Có lỗi xảy ra khi thêm thành viên: ${error.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Thêm thành viên</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tìm kiếm người dùng
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchUsers(e.target.value);
                  }}
                  placeholder="Nhập tên hoặc email..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              {isSearching && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                </div>
              )}

              {searchQuery.trim() && searchQuery.trim().length < 2 && (
                <div className="text-sm text-gray-500 py-2">
                  Nhập ít nhất 2 ký tự để tìm kiếm...
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <h4 className="font-medium text-gray-700">Kết quả tìm kiếm</h4>
                  {searchResults.map((user) => (
                    <div key={user._id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center space-x-3">
                        <Avatar
                          src={user.avatarUrl}
                          name={user.name}
                          size={40}
                          className=""
                        />
                        <div>
                          <p className="font-medium text-sm">{user.name}</p>
                          {user.nickname && <p className="text-xs text-gray-500">@{user.nickname}</p>}
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddMember(user._id)}
                        className="text-blue-500 hover:bg-blue-50 p-2 rounded-full transition-colors"
                        title="Thêm vào nhóm"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery.trim().length >= 2 && !isSearching && searchResults.length === 0 && (
                <div className="text-sm text-gray-500 py-4 text-center">
                  Không tìm thấy người dùng nào. Tất cả người dùng có thể đã có trong nhóm.
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Đóng
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AddMembersModal;
