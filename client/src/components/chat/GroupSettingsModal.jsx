import React, { useState, useEffect } from 'react';
import { X, UserPlus, UserMinus, Crown, Camera, Users, Edit3 } from 'lucide-react';
import { chatAPI } from '../../chatAPI';
import { uploadImage } from '../../api';
import GroupMembersModal from './GroupMembersModal';
import { useToast } from '../../contexts/ToastContext';

/**
 * GroupSettingsModal - Modal group chat settings
 * Manage group info, members, and permissions
 * @param {Object} props - Component props
 * @param {Object} props.conversation - Conversation data
 * @param {Object} props.currentUser - Current user
 * @param {boolean} props.isOpen - Modal open state
 * @param {Function} props.onClose - Callback to close modal
 * @param {Function} props.onUpdateConversation - Callback to update conversation
 * @returns {JSX.Element|null} Component modal or null if not visible
 */
const GroupSettingsModal = ({ 
  conversation, 
  currentUser, 
  isOpen, 
  onClose, 
  onUpdateConversation 
}) => {
  const { showError } = useToast();
  // ==================== STATE MANAGEMENT ====================
  
  // UI states
  const [activeTab, setActiveTab] = useState('info'); // Current tab: info, members, permissions
  const [loading, setLoading] = useState(false); // Loading state
  const [showMembersModal, setShowMembersModal] = useState(false); // Show members management modal
  
  // Data states
  const [conversationDetails, setConversationDetails] = useState(null); // Conversation details

  useEffect(() => {
    if (isOpen && conversation) {
      loadConversationDetails();
    }
  }, [isOpen, conversation]);

  const loadConversationDetails = async () => {
    try {
      setLoading(true);
      const response = await chatAPI.getConversationDetails(conversation._id);
      setConversationDetails(response);
    } catch (error) {
      // Error loading conversation details
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa thành viên này?')) {
      try {
        await chatAPI.removeParticipant(conversation._id, userId);
        await loadConversationDetails();
        // No need to call onUpdateConversation since the system message will update UI
        // onUpdateConversation?.(conversation._id);
      } catch (error) {
        showError('Có lỗi xảy ra khi xóa thành viên');
      }
    }
  };

  // Upload avatar to cloud and update group avatar
  const handleUpdateGroupAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const { url } = await uploadImage(file);
      if (!url) throw new Error('Upload thất bại hoặc server không trả về url.');
      await chatAPI.updateGroupAvatar(conversation._id, url);
      await loadConversationDetails();
      if (onUpdateConversation) onUpdateConversation(conversation._id);
    } catch (error) {
      showError('Lỗi khi cập nhật avatar nhóm: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      await chatAPI.changeParticipantRole(conversation._id, userId, newRole);
      await loadConversationDetails();
      // onUpdateConversation?.();
    } catch (error) {
      showError(`Có lỗi xảy ra: ${error.message}`);
    }
  };

  const handleToggleMemberManagement = async () => {
    try {
      const newValue = !conversationDetails.allowMemberManagement;
      await chatAPI.toggleMemberManagement(conversation._id, newValue);
      await loadConversationDetails();
      // onUpdateConversation?.();
    } catch (error) {
      showError(`Có lỗi xảy ra: ${error.message}`);
    }
  };

  const handleUpdateGroupName = async (newName) => {
    try {
      const res = await chatAPI.updateGroupName(conversation._id, newName);
      await loadConversationDetails();
      if (onUpdateConversation) {
        onUpdateConversation(conversation._id);
      }
    } catch (error) {
      showError(`Có lỗi xảy ra: ${error.message}`);
    }
  };

  const isGroupAdmin = () => {
    if (!conversationDetails?.participants) return false;
    const currentUserId = currentUser?.user?._id || currentUser?.user?.id || currentUser?._id || currentUser?.id;
    const userParticipant = conversationDetails.participants.find(p => 
      (p.user._id === currentUserId || p.user.id === currentUserId) && !p.leftAt
    );
    return userParticipant?.role === 'admin';
  };

  const canManageMembers = () => {
    return isGroupAdmin() || conversationDetails?.allowMemberManagement;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md h-3/4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Thông tin nhóm</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-3 px-4 text-sm font-medium ${
              activeTab === 'info' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Thông tin
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 py-3 px-4 text-sm font-medium ${
              activeTab === 'members' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Thành viên
          </button>
          {isGroupAdmin() && (
            <button
              onClick={() => setActiveTab('permissions')}
              className={`flex-1 py-3 px-4 text-sm font-medium ${
                activeTab === 'permissions' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Quyền
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          ) : (
            <>
              {/* Info Tab */}
              {activeTab === 'info' && (
                <div className="space-y-6">
                  {/* Group Avatar */}
                  <div className="text-center">
                    <div className="relative inline-block">
                      {conversation.groupAvatar ? (
                        <img
                          src={conversation.groupAvatar}
                          alt={conversation.groupName}
                          className="w-20 h-20 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                          <Users className="w-10 h-10 text-white" />
                        </div>
                      )}
                      
                      {isGroupAdmin() && (
                        <>
                          <label
                            htmlFor="group-avatar-upload"
                            className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-1.5 rounded-full hover:bg-blue-600 transition-colors cursor-pointer"
                          >
                            <Camera className="w-3 h-3" />
                          </label>
                          <input
                            id="group-avatar-upload"
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleUpdateGroupAvatar}
                          />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Group Name */}
                  <div>
                    <h3 className="font-semibold text-lg text-center">
                      {conversation.groupName || 'Nhóm chat'}
                    </h3>
                    <p className="text-gray-500 text-center text-sm">
                      {conversationDetails?.memberCount || 0} thành viên
                    </p>
                  </div>

                  {/* Group Description */}
                  {conversation.groupDescription && (
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Mô tả</h4>
                      <p className="text-gray-600 text-sm">
                        {conversation.groupDescription}
                      </p>
                    </div>
                  )}

                  {/* Created info */}
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Thông tin</h4>
                    <p className="text-gray-600 text-sm">
                      Tạo bởi: {conversationDetails?.createdBy?.name || 'Không rõ'}
                    </p>
                    <p className="text-gray-600 text-sm">
                      Ngày tạo: {new Date(conversationDetails?.createdAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>
              )}

              {/* Members Tab */}
              {activeTab === 'members' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-700">
                      Thành viên ({conversationDetails?.memberCount || 0})
                    </h4>
                    <button
                      onClick={() => setShowMembersModal(true)}
                      className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
                    >
                      <Edit3 size={16} />
                      <span>Quản lý biệt danh</span>
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {conversationDetails?.participants.map((participant) => (
                      <div key={participant.user._id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <img
                            src={participant.user.avatarUrl}
                            alt={participant.user.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div>
                            <p className="font-medium text-sm">{participant.user.name}</p>
                            {/* Do not display email here */}
                            {participant.role === 'admin' && (
                              <p className="text-xs text-orange-500 flex items-center">
                                <Crown className="w-3 h-3 mr-1" />
                                Quản trị viên
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {participant.role !== 'admin' && canManageMembers() && (
                          <button
                            onClick={() => handleRemoveMember(participant.user._id)}
                            className="text-red-500 hover:bg-red-50 p-1 rounded-full transition-colors"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Permissions Tab */}
              {activeTab === 'permissions' && isGroupAdmin() && (
                <div className="space-y-6">
                  {/* Member Management Toggle */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm text-gray-900">Cho phép thành viên quản lý nhóm</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Khi bật, tất cả thành viên có thể thêm/xóa người khác và đổi tên nhóm
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={conversationDetails?.allowMemberManagement || false}
                        onChange={handleToggleMemberManagement}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </label>
                  </div>

                  {/* Member Roles */}
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">Quyền thành viên</h4>
                    <div className="space-y-2">
                      {conversationDetails?.participants?.filter(p => !p.leftAt).map((participant) => (
                        <div key={participant.user._id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <img
                              src={participant.user.avatarUrl}
                              alt={participant.user.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <div>
                              <p className="font-medium text-sm">{participant.user.name}</p>
                              <p className="text-xs text-gray-500">
                                {participant.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}
                              </p>
                            </div>
                          </div>
                          
                          {participant.user._id !== (currentUser?.user?._id || currentUser?._id) && (
                            <select
                              value={participant.role}
                              onChange={(e) => handleChangeRole(participant.user._id, e.target.value)}
                              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="member">Thành viên</option>
                              <option value="admin">Quản trị viên</option>
                            </select>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Group Members Modal */}
      {showMembersModal && (
        <GroupMembersModal
          isOpen={showMembersModal}
          onClose={() => setShowMembersModal(false)}
          conversation={conversation}
          currentUser={currentUser}
          onMembersUpdated={() => {
            loadConversationDetails();
            onUpdateConversation?.(conversation._id);
          }}
        />
      )}
    </div>
  );
};

export default GroupSettingsModal;
