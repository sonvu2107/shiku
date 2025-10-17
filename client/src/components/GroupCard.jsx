import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  MapPin, 
  Calendar, 
  MoreVertical, 
  Settings, 
  UserPlus, 
  UserMinus,
  Shield,
  Eye,
  EyeOff,
  Lock,
  Unlock
} from 'lucide-react';
import UserName from './UserName';

/**
 * GroupCard Component - Hiển thị thông tin nhóm trong dạng card
 * Bao gồm ảnh đại diện, thông tin cơ bản, số thành viên và các action buttons
 * 
 * @param {Object} group - Thông tin nhóm
 * @param {Function} onJoin - Callback khi join group
 * @param {Function} onLeave - Callback khi leave group
 * @param {Function} onEdit - Callback khi edit group
 * @param {boolean} showActions - Hiển thị action buttons hay không
 * @param {string} userRole - Vai trò của user trong nhóm (owner, admin, member, null)
 */
const GroupCard = ({ 
  group, 
  onJoin, 
  onLeave, 
  onEdit, 
  showActions = true, 
  userRole = null 
}) => {
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Xử lý join group
  const handleJoin = async () => {
    if (!onJoin) return;
    
    setIsJoining(true);
    try {
      await onJoin(group._id);
    } catch (error) {
      // Error joining group
    } finally {
      setIsJoining(false);
    }
  };

  // Xử lý leave group
  const handleLeave = async () => {
    if (!onLeave) return;
    
    setIsLeaving(true);
    try {
      await onLeave(group._id);
    } catch (error) {
      // Error leaving group
    } finally {
      setIsLeaving(false);
    }
  };

  // Xử lý edit group
  const handleEdit = () => {
    if (onEdit) {
      onEdit(group);
    }
    setShowMenu(false);
  };

  // Lấy icon theo loại nhóm
  const getGroupTypeIcon = () => {
    switch (group.settings?.type) {
      case 'public':
        return <Unlock className="w-4 h-4 text-green-500" />;
      case 'private':
        return <Lock className="w-4 h-4 text-yellow-500" />;
      case 'secret':
        return <EyeOff className="w-4 h-4 text-red-500" />;
      default:
        return <Unlock className="w-4 h-4 text-green-500" />;
    }
  };

  // Lấy text theo loại nhóm
  const getGroupTypeText = () => {
    switch (group.settings?.type) {
      case 'public':
        return 'Công khai';
      case 'private':
        return 'Riêng tư';
      case 'secret':
        return 'Bí mật';
      default:
        return 'Công khai';
    }
  };

  // Kiểm tra xem có thể join không
  const canJoin = !userRole && group.settings?.type === 'public' && group.settings?.joinApproval === 'anyone';
  
  // Kiểm tra xem có thể leave không
  const canLeave = userRole && userRole !== 'owner';
  
  // Kiểm tra xem có thể edit không
  const canEdit = userRole === 'owner' || userRole === 'admin';

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
      {/* Cover Image */}
      <div className="relative h-32 sm:h-40 md:h-48 lg:h-56 bg-gradient-to-r from-blue-500 to-purple-600">
        {group.coverImage ? (
          <img 
            src={group.coverImage} 
            alt={`Cover của ${group.name}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
            <Users className="w-12 h-12 text-white opacity-50" />
          </div>
        )}
        
        {/* Group Type Badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-xs">
          {getGroupTypeIcon()}
          <span>{getGroupTypeText()}</span>
        </div>

        {/* Avatar */}
        <div className="absolute -bottom-8 left-4">
          <div className="w-16 h-16 rounded-full border-4 border-white overflow-hidden bg-gray-200">
            {group.avatar ? (
              <img 
                src={group.avatar} 
                alt={`Avatar của ${group.name}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                <Users className="w-8 h-8 text-gray-500" />
              </div>
            )}
          </div>
        </div>

        {/* Action Menu */}
        {showActions && (canEdit || canLeave) && (
          <div className="absolute top-2 right-2">
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 top-10 bg-white rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                  {canEdit && (
                    <button
                      onClick={handleEdit}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      Chỉnh sửa
                    </button>
                  )}
                  {canLeave && (
                    <button
                      onClick={handleLeave}
                      disabled={isLeaving}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50"
                    >
                      <UserMinus className="w-4 h-4" />
                      {isLeaving ? 'Đang rời...' : 'Rời nhóm'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="pt-10 p-4">
        {/* Group Name */}
        <Link 
          to={`/groups/${group._id}`}
          className="block"
        >
          <h3 className="font-semibold text-lg text-gray-900 hover:text-blue-600 transition-colors line-clamp-1">
            {group.name}
          </h3>
        </Link>

        {/* Description */}
        {group.description && (
          <p className="text-gray-600 text-sm mt-1 line-clamp-2">
            {group.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{group.stats?.memberCount || 0} thành viên</span>
          </div>
          
          {group.stats?.postCount > 0 && (
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{group.stats.postCount} bài viết</span>
            </div>
          )}
        </div>

        {/* Location */}
        {group.location?.name && (
          <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
            <MapPin className="w-4 h-4" />
            <span className="line-clamp-1">{group.location.name}</span>
          </div>
        )}

        {/* Tags */}
        {group.tags && group.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {group.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
              >
                #{tag}
              </span>
            ))}
            {group.tags.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                +{group.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Owner Info */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200">
                {group.owner?.avatarUrl ? (
                  <img 
                    src={group.owner.avatarUrl} 
                    alt={group.owner?.name || group.owner?.fullName || group.owner?.username || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                    <span className="text-xs text-gray-500">
                      {(group.owner?.name || group.owner?.fullName || group.owner?.username || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500">Tạo bởi</p>
                <p className="text-sm font-medium text-gray-900">
                  <UserName user={group.owner} />
                </p>
              </div>
            </div>

            {/* User Role Badge */}
            {userRole && (
              <div className="flex items-center gap-1">
                {userRole === 'owner' && (
                  <Shield className="w-4 h-4 text-yellow-500" />
                )}
                <span className="text-xs font-medium text-gray-600 capitalize">
                  {userRole === 'owner' ? 'Chủ sở hữu' : 
                   userRole === 'admin' ? 'Quản trị viên' : 
                   userRole === 'moderator' ? 'Điều hành viên' : 'Thành viên'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className="mt-4 flex gap-2">
            {canJoin && (
              <button
                onClick={handleJoin}
                disabled={isJoining}
                className="flex-1 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                {isJoining ? 'Đang tham gia...' : 'Tham gia'}
              </button>
            )}
            
            {canLeave && (
              <button
                onClick={handleLeave}
                disabled={isLeaving}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <UserMinus className="w-4 h-4" />
                {isLeaving ? 'Đang rời...' : 'Rời nhóm'}
              </button>
            )}

            {userRole && !canLeave && (
              <Link
                to={`/groups/${group._id}`}
                className="flex-1 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors text-center"
              >
                Xem nhóm
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupCard;


