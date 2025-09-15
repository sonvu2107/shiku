import React, { useState, useEffect } from 'react';
import { X, UserPlus } from 'lucide-react';
import { chatAPI } from '../../chatAPI';

/**
 * AddMembersModal - Modal thêm thành viên vào nhóm chat
 * Cho phép tìm kiếm và thêm người dùng mới vào cuộc trò chuyện nhóm
 * @param {Object} props - Component props
 * @param {Object} props.conversation - Dữ liệu cuộc trò chuyện
 * @param {boolean} props.isOpen - Trạng thái hiển thị modal
 * @param {Function} props.onClose - Callback đóng modal
 * @param {Function} props.onUpdateConversation - Callback cập nhật conversation
 * @returns {JSX.Element|null} Component modal hoặc null nếu không hiển thị
 */
const AddMembersModal = ({ 
  conversation, 
  isOpen, 
  onClose, 
  onUpdateConversation 
}) => {
  // ==================== STATE MANAGEMENT ====================
  
  // UI states
  const [loading, setLoading] = useState(false); // Loading state
  const [isSearching, setIsSearching] = useState(false); // Search loading state
  
  // Search states
  const [searchQuery, setSearchQuery] = useState(''); // Từ khóa tìm kiếm
  const [searchResults, setSearchResults] = useState([]); // Kết quả tìm kiếm

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
      
      console.log('🔥 Existing user IDs:', existingUserIds);
      console.log('🔥 Search results:', response.map(u => u._id));
      
      const filteredResults = response.filter(user => !existingUserIds.includes(user._id));
      console.log('🔥 Filtered results:', filteredResults.map(u => u._id));
      
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddMember = async (userId) => {
    try {
      console.log('🔥 Adding member:', userId);
      await chatAPI.addParticipants(conversation._id, [userId]);
      console.log('🔥 Member added successfully');
      setSearchQuery('');
      setSearchResults([]);
      
      // Refresh conversation data
      if (onUpdateConversation) {
        await onUpdateConversation();
      }
      
      onClose();
    } catch (error) {
      console.error('Error adding member:', error);
      alert(`Có lỗi xảy ra khi thêm thành viên: ${error.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
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
                      <img
                        src={user.avatarUrl || '/default-avatar.png'}
                        alt={user.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-medium text-sm">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
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
        <div className="flex justify-end p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMembersModal;
