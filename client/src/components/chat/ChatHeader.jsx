import { useState } from "react";
import { MoreVertical, Users, Settings, UserPlus, Edit3, LogOut, Trash2, Phone, Video } from "lucide-react";
import GroupSettingsModal from "./GroupSettingsModal";

/**
 * ChatHeader - Header của cuộc trò chuyện
 * Hiển thị thông tin cuộc trò chuyện, avatar, tên và các nút hành động
 * @param {Object} props - Component props
 * @param {Object} props.conversation - Dữ liệu cuộc trò chuyện
 * @param {Object} props.currentUser - Thông tin user hiện tại
 * @param {Function} props.onUpdateConversation - Callback cập nhật conversation
 * @param {Function} props.onLeaveConversation - Callback rời khỏi conversation
 * @param {Function} props.onDeleteConversation - Callback xóa conversation
 * @param {Function} props.onAddMembers - Callback thêm thành viên
 * @param {Function} props.onVideoCall - Callback gọi video
 * @param {Function} props.onVoiceCall - Callback gọi thoại
 * @returns {JSX.Element} Component chat header
 */
export default function ChatHeader({ 
  conversation, 
  currentUser,
  onUpdateConversation, 
  onLeaveConversation, 
  onDeleteConversation,
  onAddMembers,
  onVideoCall,
  onVoiceCall 
}) {
  // ==================== STATE MANAGEMENT ====================
  
  // UI states
  const [showMenu, setShowMenu] = useState(false); // Trạng thái hiển thị menu dropdown
  const [showEditName, setShowEditName] = useState(false); // Trạng thái edit tên nhóm
  const [showGroupSettings, setShowGroupSettings] = useState(false); // Trạng thái hiển thị group settings
  
  // Form states
  const [newName, setNewName] = useState(conversation?.name || ''); // Tên mới của nhóm

  const isGroup = conversation?.conversationType === 'group';
  const activeParticipants = conversation?.participants?.filter(p => !p.leftAt) || [];
  const memberCount = activeParticipants.length;

  const handleUpdateName = async () => {
    if (newName.trim() && newName.trim() !== (conversation.groupName || conversation.name)) {
      await onUpdateConversation?.(conversation._id, { groupName: newName.trim() });
    }
    setShowEditName(false);
    setShowMenu(false);
  };

  const handleLeave = async () => {
    if (window.confirm(isGroup ? 'Bạn có chắc muốn rời khỏi nhóm?' : 'Bạn có chắc muốn xóa cuộc trò chuyện?')) {
      await onLeaveConversation?.(conversation._id);
      setShowMenu(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Bạn có chắc muốn xóa cuộc trò chuyện này? Hành động này không thể hoàn tác.')) {
      await onDeleteConversation?.(conversation._id);
      setShowMenu(false);
    }
  };

  const handleGroupInfo = () => {
    setShowGroupSettings(true);
    setShowMenu(false);
  };

  const isGroupAdmin = () => {
    if (!isGroup || !conversation?.participants) return false;
    const currentUserId = currentUser?.user?._id || currentUser?.user?.id || currentUser?._id || currentUser?.id;
    const userParticipant = conversation.participants.find(p => 
      (p.user._id === currentUserId || p.user.id === currentUserId) && !p.leftAt
    );
    return userParticipant?.role === 'admin';
  };

  const canManageMembers = () => {
    return isGroupAdmin() || conversation?.allowMemberManagement;
  };

  const getDisplayName = () => {
    if (isGroup) {
          return conversation.groupName || conversation.name || 'Nhóm chat';
    }
    
    const currentUserId = currentUser?.user?._id || currentUser?.user?.id || currentUser?._id || currentUser?.id;
    
    const otherParticipant = conversation.participants?.find(p => {
      const participantId = p.user?._id || p.user?.id || p._id || p.id;
      return participantId !== currentUserId;
    });
    
    return otherParticipant?.nickname || otherParticipant?.user?.name || otherParticipant?.name || 'Unknown User';
  };

const getAvatarUrl = () => {
  if (isGroup) return null;

  const currentUserId =
    currentUser?.user?._id ||
    currentUser?.user?.id ||
    currentUser?._id ||
    currentUser?.id;

  const otherParticipant = conversation.participants?.find((p) => {
    const participantId = p.user?._id || p.user?.id || p._id || p.id;
    return participantId !== currentUserId;
  });

  const user = otherParticipant?.user || otherParticipant;

  if (user?.avatarUrl && user.avatarUrl.trim() !== "") {
    return user.avatarUrl;
  }
  if (user?.name) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      user.name
    )}&background=3b82f6&color=ffffff&size=40`;
  }
  return "/default-avatar.png";
};

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-14 border-b border-gray-100 bg-white">
        <p className="text-gray-500">Chọn một cuộc trò chuyện để bắt đầu</p>
      </div>
    );
  }

  return (
    <div className="relative w-full bg-white border-b border-gray-100 flex items-center justify-between h-14 px-4">
      {/* Left side - Avatar and info */}
      <div className="flex items-center space-x-3">
        <div className="relative">
          {isGroup ? (
            conversation.groupAvatar ? (
              <img
                src={conversation.groupAvatar}
                alt={getDisplayName()}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100"
                onError={e => { e.target.src = '/default-avatar.png'; }}
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                <Users size={20} className="text-white" />
              </div>
            )
          ) : (
            <>
              <img
                src={getAvatarUrl()}
                alt={getDisplayName()}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100"
                onError={(e) => {
                  e.target.src = '/default-avatar.png';
                }}
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            </>
          )}
        </div>
        
        <div>
          {showEditName ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleUpdateName()}
                onBlur={handleUpdateName}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
          ) : (
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">{getDisplayName()}</h3>
              {isGroup && (
                <p className="text-xs text-gray-500">{memberCount} thành viên</p>
              )}
              {!isGroup && (
                <p className="text-xs text-green-500">Đang hoạt động</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right side - Action buttons */}
      <div className="flex items-center space-x-2">
        {/* Call buttons */}
        {!isGroup && (
          <>
            <button
              onClick={() => {
                alert('Chức năng đang phát triển');
                onVoiceCall?.(conversation._id);
              }}
              className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
              title="Gọi thoại"
            >
              <Phone size={18} />
            </button>
            
            <button
              onClick={() => {
                alert('Chức năng đang phát triển');
                onVideoCall?.(conversation._id);
              }}
              className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
              title="Gọi video"
            >
              <Video size={18} />
            </button>
          </>
        )}

        {/* Menu button */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
            title="Tùy chọn"
          >
            <MoreVertical size={18} />
          </button>

          {/* Dropdown menu */}
          {showMenu && (
            <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              <div className="py-1">
                {isGroup && (
                  <>
                    <button
                      onClick={handleGroupInfo}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Users size={16} className="mr-3" />
                      Thông tin nhóm
                    </button>
                    
                    {canManageMembers() && (
                      <button
                        onClick={() => {
                          setShowEditName(true);
                          setShowMenu(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Edit3 size={16} className="mr-3" />
                        Đổi tên nhóm
                      </button>
                    )}
                    
                    {canManageMembers() && (
                      <button
                        onClick={() => {
                          onAddMembers?.(conversation._id);
                          setShowMenu(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <UserPlus size={16} className="mr-3" />
                        Thêm thành viên
                      </button>
                    )}
                    
                    <div className="border-t border-gray-100"></div>
                  </>
                )}
                
                <button
                  onClick={handleLeave}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut size={16} className="mr-3" />
                  {isGroup ? 'Rời nhóm' : 'Xóa cuộc trò chuyện'}
                </button>
                
                {isGroup && (
                  <button
                    onClick={handleDelete}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={16} className="mr-3" />
                    Xóa nhóm
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Group Settings Modal */}
      {showGroupSettings && (
        <GroupSettingsModal
          conversation={conversation}
          currentUser={currentUser}
          isOpen={showGroupSettings}
          onClose={() => setShowGroupSettings(false)}
          onUpdateConversation={onUpdateConversation}
        />
      )}
    </div>
  );
}