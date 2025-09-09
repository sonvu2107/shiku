import { useState, useEffect } from "react";
import { X, Search, Users, User, Check, Plus } from "lucide-react";
import { chatAPI } from "../../chatAPI";

export default function NewConversationModal({ isOpen, onClose, onCreateConversation }) {
  const [step, setStep] = useState(1); // 1: Choose type, 2: Select users, 3: Group settings
  const [conversationType, setConversationType] = useState('private'); // 'private' or 'group'
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState('friends'); // 'friends' or 'all'

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
      setFriends(response.friends || []);
    } catch (error) {
      console.error('Lỗi tải danh sách bạn bè:', error);
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
          console.error('Lỗi tìm kiếm người dùng:', error);
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
      setSelectedUsers([user]);
      handleCreateConversation([user]);
    } else {
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
        await onCreateConversation({
          type: 'private',
          participants: [users[0]._id]
        });
      } else {
        await onCreateConversation({
          type: 'group',
          name: groupName.trim() || `Nhóm ${users.length + 1} thành viên`,
          participants: users.map(u => u._id)
        });
      }
      onClose();
    } catch (error) {
      console.error('Lỗi tạo cuộc trò chuyện:', error);
      alert('Có lỗi xảy ra khi tạo cuộc trò chuyện');
    } finally {
      setIsLoading(false);
    }
  };

  const canCreateGroup = selectedUsers.length >= 1;
  const canProceedToGroupSettings = conversationType === 'group' && selectedUsers.length >= 1;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {step === 1 && 'Tạo cuộc trò chuyện mới'}
            {step === 2 && `Chọn ${conversationType === 'private' ? 'người dùng' : 'thành viên nhóm'}`}
            {step === 3 && 'Cài đặt nhóm'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {/* Step 1: Choose conversation type */}
          {step === 1 && (
            <div className="p-4 space-y-4">
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setConversationType('private');
                    setStep(2);
                  }}
                  className="w-full flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium text-gray-900">Tin nhắn riêng</h3>
                    <p className="text-sm text-gray-500">Nhắn tin với một người</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setConversationType('group');
                    setStep(2);
                  }}
                  className="w-full flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium text-gray-900">Nhóm chat</h3>
                    <p className="text-sm text-gray-500">Tạo nhóm với nhiều người</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Select users */}
          {step === 2 && (
            <div className="flex flex-col h-full">
              {/* Tabs */}
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setSearchMode('friends')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    searchMode === 'friends'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Users className="w-4 h-4 inline mr-2" />
                  Bạn bè ({friends.length})
                </button>
                <button
                  onClick={() => setSearchMode('all')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    searchMode === 'all'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Search className="w-4 h-4 inline mr-2" />
                  Tìm kiếm tất cả
                </button>
              </div>

              {/* Search */}
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={searchMode === 'friends' ? 'Tìm kiếm trong bạn bè...' : 'Tìm kiếm tất cả người dùng...'}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Selected users (for group) */}
              {conversationType === 'group' && selectedUsers.length > 0 && (
                <div className="p-4 border-b border-gray-200">
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map(user => (
                      <div
                        key={user._id}
                        className="flex items-center space-x-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                      >
                        <img
                          src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3b82f6&color=ffffff`}
                          alt={user.name}
                          className="w-5 h-5 rounded-full"
                        />
                        <span>{user.name}</span>
                        <button
                          onClick={() => setSelectedUsers(prev => prev.filter(u => u._id !== user._id))}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Search results */}
              <div className="flex-1 overflow-y-auto p-4">
                {isSearching ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-500 mt-2">Đang tìm kiếm...</p>
                  </div>
                ) : searchTerm.trim() ? (
                  // Hiển thị kết quả tìm kiếm
                  searchResults.length > 0 ? (
                    <div className="space-y-2">
                      {searchResults.map(user => {
                        const isSelected = selectedUsers.some(u => u._id === user._id);
                        return (
                          <button
                            key={user._id}
                            onClick={() => handleUserSelect(user)}
                            className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                              isSelected 
                                ? 'bg-blue-50 border-2 border-blue-200' 
                                : 'hover:bg-gray-50 border-2 border-transparent'
                            }`}
                          >
                            <img
                              src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3b82f6&color=ffffff`}
                              alt={user.name}
                              className="w-10 h-10 rounded-full"
                            />
                            <div className="flex-1 text-left">
                              <h4 className="font-medium text-gray-900">{user.name}</h4>
                              {/* Ẩn email của user */}
                              {user.isOnline !== undefined && (
                                <div className="flex items-center mt-1">
                                  <div className={`w-2 h-2 rounded-full mr-1 ${user.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                  <span className="text-xs text-gray-500">
                                    {user.isOnline ? 'Đang hoạt động' : 'Không hoạt động'}
                                  </span>
                                </div>
                              )}
                            </div>
                            {isSelected && (
                              <Check className="w-5 h-5 text-blue-600" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Không tìm thấy người dùng nào</p>
                    </div>
                  )
                ) : searchMode === 'friends' ? (
                  // Hiển thị danh sách bạn bè khi không có từ khóa tìm kiếm
                  friends.length > 0 ? (
                    <div className="space-y-2">
                      {friends.map(user => {
                        const isSelected = selectedUsers.some(u => u._id === user._id);
                        return (
                          <button
                            key={user._id}
                            onClick={() => handleUserSelect(user)}
                            className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                              isSelected 
                                ? 'bg-blue-50 border-2 border-blue-200' 
                                : 'hover:bg-gray-50 border-2 border-transparent'
                            }`}
                          >
                            <img
                              src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3b82f6&color=ffffff`}
                              alt={user.name}
                              className="w-10 h-10 rounded-full"
                            />
                            <div className="flex-1 text-left">
                              <h4 className="font-medium text-gray-900">{user.name}</h4>
                              {/* Ẩn email của user ở friend list */}
                              <div className="flex items-center mt-1">
                                <div className={`w-2 h-2 rounded-full mr-1 ${user.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                <span className="text-xs text-gray-500">
                                  {user.isOnline ? 'Đang hoạt động' : 'Không hoạt động'}
                                </span>
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="w-5 h-5 text-blue-600" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-gray-500 mt-2">Đang tải danh sách bạn bè...</p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Bạn chưa có bạn bè nào</p>
                    </div>
                  )
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Nhập tên để tìm kiếm người dùng</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Group settings */}
          {step === 3 && (
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tên nhóm
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Nhập tên nhóm..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Thành viên ({selectedUsers.length})
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedUsers.map(user => (
                    <div key={user._id} className="flex items-center space-x-3 p-2">
                      <img
                        src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3b82f6&color=ffffff`}
                        alt={user.name}
                        className="w-8 h-8 rounded-full"
                      />
                      <span className="text-sm text-gray-900">{user.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200">
          <div>
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="text-gray-600 hover:text-gray-800"
              >
                Quay lại
              </button>
            )}
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Hủy
            </button>
            
            {step === 2 && (
              <>
                {conversationType === 'private' ? (
                  <button
                    disabled={selectedUsers.length === 0}
                    className="px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
                  >
                    Chọn người dùng để tạo chat
                  </button>
                ) : (
                  <button
                    onClick={() => setStep(3)}
                    disabled={!canProceedToGroupSettings}
                    className={`px-4 py-2 rounded-lg ${
                      canProceedToGroupSettings
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
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
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                  canCreateGroup && !isLoading
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
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
