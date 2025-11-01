import { useState, useEffect } from "react";
import { X, Search, Users, User, Check, Plus } from "lucide-react";
import { chatAPI } from "../../chatAPI";

/**
 * NewConversationModal - Modal tạo cuộc trò chuyện mới
 * Hỗ trợ tạo private chat và group chat với multi-step wizard
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Trạng thái hiển thị modal
 * @param {Function} props.onClose - Callback đóng modal
 * @param {Function} props.onCreateConversation - Callback tạo conversation
 * @returns {JSX.Element|null} Component modal hoặc null nếu không hiển thị
 */
export default function NewConversationModal({ isOpen, onClose, onCreateConversation }) {
  // ==================== STATE MANAGEMENT ====================
  
  // Step management
  const [step, setStep] = useState(1); // 1: Choose type, 2: Select users, 3: Group settings
  const [conversationType, setConversationType] = useState('private'); // 'private' or 'group'
  
  // Search states
  const [searchTerm, setSearchTerm] = useState(''); // Từ khóa tìm kiếm
  const [searchResults, setSearchResults] = useState([]); // Kết quả tìm kiếm
  const [searchMode, setSearchMode] = useState('friends'); // 'friends' or 'all'
  const [isSearching, setIsSearching] = useState(false); // Trạng thái đang tìm kiếm
  
  // Data states
  const [friends, setFriends] = useState([]); // Danh sách bạn bè
  const [selectedUsers, setSelectedUsers] = useState([]); // Users đã chọn
  const [groupName, setGroupName] = useState(''); // Tên nhóm
  const [existingConversations, setExistingConversations] = useState({}); // Map user ID -> existing conversation
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false); // Loading state chung

  // Load friends when modal opens
  useEffect(() => {
    if (isOpen) {
      loadFriends();
    } else {
      // Reset state when modal closes
      setStep(1);
      setConversationType('private');
      setSearchTerm('');
      setSearchResults([]);
      setFriends([]);
      setSelectedUsers([]);
      setGroupName('');
      setSearchMode('friends');
    }
  }, [isOpen]);

  const loadFriends = async () => {
    try {
      setIsLoading(true);
      const response = await chatAPI.getFriends();
      const friendsList = response.friends || [];
      setFriends(friendsList);
      
      // Kiểm tra existing conversations cho từng bạn bè
      const existingMap = {};
      for (const friend of friendsList) {
        try {
          const existingConv = await chatAPI.checkPrivateConversation(friend._id);
          if (existingConv.exists) {
            existingMap[friend._id] = existingConv;
          }
        } catch (error) {
          // Silent fail for individual checks
        }
      }
      setExistingConversations(existingMap);
    } catch (error) {
      setFriends([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayedSearch = setTimeout(async () => {
      if (searchTerm.trim() && searchTerm.length >= 2) {
        setIsSearching(true);
        try {
          let results;
          if (searchMode === 'friends') {
            results = await chatAPI.searchFriends(searchTerm);
          } else {
            results = await chatAPI.searchUsers(searchTerm);
          }
          setSearchResults(results);
        } catch (error) {
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, searchMode]);

  const handleUserSelect = (user) => {
    if (conversationType === 'private') {
      // Cho private chat, chỉ cho phép chọn 1 người
      setSelectedUsers([user]);
    } else {
      // Cho group chat, cho phép chọn nhiều người
      setSelectedUsers(prev => {
        const isSelected = prev.some(u => u._id === user._id);
        if (isSelected) {
          return prev.filter(u => u._id !== user._id);
        } else {
          return [...prev, user];
        }
      });
    }
  };

  const handleCreateConversation = async (users = selectedUsers) => {
    if (users.length === 0) return;

    setIsLoading(true);
    try {
      if (conversationType === 'private') {
        // Kiểm tra xem cuộc trò chuyện đã tồn tại chưa
        const existingConversation = await chatAPI.checkPrivateConversation(users[0]._id);
        
        if (existingConversation.exists) {
          // Nếu đã tồn tại, mở cuộc trò chuyện hiện có
          await onCreateConversation({
            type: 'private',
            participants: [users[0]._id],
            existingConversation: existingConversation
          });
        } else {
          // Tạo cuộc trò chuyện mới
          await onCreateConversation({
            type: 'private',
            participants: [users[0]._id]
          });
        }
      } else {
        await onCreateConversation({
          type: 'group',
          name: groupName.trim() || `Nhóm ${users.length + 1} thành viên`,
          participants: users.map(u => u._id)
        });
      }
      onClose();
    } catch (error) {
      alert('Có lỗi xảy ra khi tạo cuộc trò chuyện');
    } finally {
      setIsLoading(false);
    }
  };

  const canCreateGroup = selectedUsers.length >= 1;
  const canProceedToGroupSettings = conversationType === 'group' && selectedUsers.length >= 1;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-60 flex items-center justify-center z-50 p-0">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-2 sm:mx-4 max-h-[90vh] sm:max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {step === 1 && 'Tạo cuộc trò chuyện mới'}
            {step === 2 && (
              <div className="flex items-center space-x-2">
                <span>Chọn {conversationType === 'private' ? 'người dùng' : 'thành viên nhóm'}</span>
                {selectedUsers.length > 0 && (
                  <span className="text-sm font-normal text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                    {selectedUsers.length} đã chọn
                  </span>
                )}
              </div>
            )}
            {step === 3 && 'Cài đặt nhóm'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Step 1: Choose conversation type */}
          {step === 1 && (
            <div className="p-4 sm:p-6 space-y-4">
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setConversationType('private');
                    setStep(2);
                  }}
                  className="w-full flex items-center space-x-3 p-4 sm:p-5 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 transition-colors touch-target"
                >
                  <div className="w-12 h-12 sm:w-10 sm:h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 text-base sm:text-sm">Tin nhắn riêng</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Nhắn tin với một người</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setConversationType('group');
                    setStep(2);
                  }}
                  className="w-full flex items-center space-x-3 p-4 sm:p-5 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 transition-colors touch-target"
                >
                  <div className="w-12 h-12 sm:w-10 sm:h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 text-base sm:text-sm">Nhóm chat</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Tạo nhóm với nhiều người</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Select users */}
          {step === 2 && (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Tabs */}
              <div className="flex-shrink-0 flex border-b border-gray-200 dark:border-gray-600">
                <button
                  onClick={() => setSearchMode('friends')}
                  className={`flex-1 px-3 sm:px-4 py-3 sm:py-4 text-sm font-medium transition-colors touch-target ${
                    searchMode === 'friends'
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 active:bg-gray-50 dark:active:bg-gray-700'
                  }`}
                >
                  <Users className="w-4 h-4 inline mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Bạn bè</span>
                  <span className="sm:hidden">Bạn bè</span>
                  <span className="ml-1">({friends.length})</span>
                </button>
                <button
                  onClick={() => setSearchMode('all')}
                  className={`flex-1 px-3 sm:px-4 py-3 sm:py-4 text-sm font-medium transition-colors touch-target ${
                    searchMode === 'all'
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 active:bg-gray-50 dark:active:bg-gray-700'
                  }`}
                >
                  <Search className="w-4 h-4 inline mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Tìm kiếm tất cả</span>
                  <span className="sm:hidden">Tìm kiếm</span>
                </button>
              </div>

              {/* Search */}
              <div className="flex-shrink-0 p-3 sm:p-4 border-b border-gray-200 dark:border-gray-600">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={searchMode === 'friends' ? 'Tìm kiếm trong bạn bè...' : 'Tìm kiếm tất cả người dùng...'}
                    className="w-full pl-10 pr-4 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-sm"
                  />
                </div>
              </div>

              {/* Selected users */}
              {selectedUsers.length > 0 && (
                <div className="flex-shrink-0 p-3 sm:p-4 border-b border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {conversationType === 'private' ? 'Người được chọn:' : 'Thành viên đã chọn:'}
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{selectedUsers.length} người</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map(user => (
                      <div
                        key={user._id}
                        className="flex items-center space-x-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-3 py-2 rounded-full text-sm"
                      >
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          className="w-6 h-6 sm:w-5 sm:h-5 rounded-full"
                        />
                        <span className="font-medium">{user.name}</span>
                        <button
                          onClick={() => setSelectedUsers(prev => prev.filter(u => u._id !== user._id))}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 active:text-blue-900 dark:active:text-blue-100 transition-colors touch-target p-1"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scrollable friend list */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-4 custom-scrollbar">
                {isSearching ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Đang tìm kiếm...</p>
                  </div>
                ) : searchTerm.trim() ? (
                  // Hiển thị kết quả tìm kiếm
                  searchResults.length > 0 ? (
                    <div className="space-y-2 pb-4">
                      {searchResults.map(user => {
                        const isSelected = selectedUsers.some(u => u._id === user._id);
                        return (
                          <button
                            key={user._id}
                            onClick={() => handleUserSelect(user)}
                            className={`w-full flex items-center space-x-3 p-4 sm:p-3 rounded-lg transition-colors touch-target ${
                              isSelected 
                                ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-600' 
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 border-2 border-transparent'
                            }`}
                          >
                            <img
                              src={user.avatarUrl}
                              alt={user.name}
                              className="w-12 h-12 sm:w-10 sm:h-10 rounded-full flex-shrink-0"
                            />
                            <div className="flex-1 text-left min-w-0">
                              <h4 className={`font-medium text-base sm:text-sm truncate ${
                                isSelected ? 'text-blue-900 dark:text-blue-200' : 'text-gray-900 dark:text-gray-100'
                              }`}>{user.name}</h4>
                              <div className="flex items-center mt-1 space-x-2">
                                {/* Online status */}
                                {user.isOnline !== undefined && (
                                  <div className="flex items-center">
                                    <div className={`w-2 h-2 rounded-full mr-1 ${user.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {user.isOnline ? 'Đang hoạt động' : 'Không hoạt động'}
                                    </span>
                                  </div>
                                )}
                                {/* Existing conversation indicator */}
                                {existingConversations[user._id] && (
                                  <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                                    Đã tạo
                                  </span>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <div className="flex-shrink-0">
                                <div className="w-6 h-6 sm:w-5 sm:h-5 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center">
                                  <Check className="w-4 h-4 sm:w-3 sm:h-3 text-white" />
                                </div>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500 dark:text-gray-400">Không tìm thấy người dùng nào</p>
                    </div>
                  )
                ) : searchMode === 'friends' ? (
                  // Hiển thị danh sách bạn bè khi không có từ khóa tìm kiếm
                  friends.length > 0 ? (
                    <div className="space-y-2 pb-4">
                      {friends.map(user => {
                        const isSelected = selectedUsers.some(u => u._id === user._id);
                        return (
                          <button
                            key={user._id}
                            onClick={() => handleUserSelect(user)}
                            className={`w-full flex items-center space-x-3 p-4 sm:p-3 rounded-lg transition-colors touch-target ${
                              isSelected 
                                ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-600' 
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 border-2 border-transparent'
                            }`}
                          >
                            <img
                              src={user.avatarUrl}
                              alt={user.name}
                              className="w-12 h-12 sm:w-10 sm:h-10 rounded-full flex-shrink-0"
                            />
                            <div className="flex-1 text-left min-w-0">
                              <h4 className={`font-medium text-base sm:text-sm truncate ${
                                isSelected ? 'text-blue-900 dark:text-blue-200' : 'text-gray-900 dark:text-gray-100'
                              }`}>{user.name}</h4>
                              <div className="flex items-center mt-1 space-x-2">
                                {/* Online status */}
                                <div className="flex items-center">
                                  <div className={`w-2 h-2 rounded-full mr-1 ${user.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {user.isOnline ? 'Đang hoạt động' : 'Không hoạt động'}
                                  </span>
                                </div>
                                {/* Existing conversation indicator */}
                                {existingConversations[user._id] && (
                                  <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                                    Đã tạo 
                                  </span>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <div className="flex-shrink-0">
                                <div className="w-6 h-6 sm:w-5 sm:h-5 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center">
                                  <Check className="w-4 h-4 sm:w-3 sm:h-3 text-white" />
                                </div>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
                      <p className="text-gray-500 dark:text-gray-400 mt-2">Đang tải danh sách bạn bè...</p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500 dark:text-gray-400">Bạn chưa có bạn bè nào</p>
                    </div>
                  )
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">Nhập tên để tìm kiếm người dùng</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Group settings */}
          {step === 3 && (
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tên nhóm
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Nhập tên nhóm..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Thành viên ({selectedUsers.length})
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedUsers.map(user => (
                    <div key={user._id} className="flex items-center space-x-3 p-2">
                      <img
                              src={user.avatarUrl}
                        alt={user.name}
                        className="w-8 h-8 rounded-full"
                      />
                      <span className="text-sm text-gray-900 dark:text-gray-100">{user.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-t border-gray-200 dark:border-gray-600">
          <div>
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 active:text-gray-900 dark:active:text-gray-100 transition-colors touch-target px-2 py-1"
              >
                Quay lại
              </button>
            )}
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-3 sm:px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 active:text-gray-900 dark:active:text-gray-100 transition-colors touch-target"
            >
              Hủy
            </button>
            
            {step === 2 && (
              <>
                {conversationType === 'private' ? (
                  <button
                    onClick={() => handleCreateConversation()}
                    disabled={selectedUsers.length === 0 || isLoading}
                    className={`px-3 sm:px-4 py-2 rounded-lg touch-target flex items-center space-x-2 ${
                      selectedUsers.length > 0 && !isLoading
                        ? 'bg-blue-500 dark:bg-blue-600 text-white hover:bg-blue-600 dark:hover:bg-blue-700 active:bg-blue-700 dark:active:bg-blue-800'
                        : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Đang tạo...</span>
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        <span>
                          {selectedUsers.length > 0 && existingConversations[selectedUsers[0]._id] 
                            ? 'Mở cuộc trò chuyện' 
                            : 'Xác nhận'
                          }
                        </span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => setStep(3)}
                    disabled={!canProceedToGroupSettings}
                    className={`px-3 sm:px-4 py-2 rounded-lg touch-target ${
                      canProceedToGroupSettings
                        ? 'bg-blue-500 dark:bg-blue-600 text-white hover:bg-blue-600 dark:hover:bg-blue-700 active:bg-blue-700 dark:active:bg-blue-800'
                        : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Tiếp tục
                  </button>
                )}
              </>
            )}
            
            {step === 3 && (
              <button
                onClick={() => handleCreateConversation()}
                disabled={!canCreateGroup || isLoading}
                className={`px-3 sm:px-4 py-2 rounded-lg flex items-center space-x-2 touch-target ${
                  canCreateGroup && !isLoading
                    ? 'bg-blue-500 dark:bg-blue-600 text-white hover:bg-blue-600 dark:hover:bg-blue-700 active:bg-blue-700 dark:active:bg-blue-800'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Đang tạo...</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    <span>Tạo nhóm</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
