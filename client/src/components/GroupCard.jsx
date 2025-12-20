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
  Unlock,
  UserCheck
} from 'lucide-react';
import UserName from './UserName';

/**
 * GroupCard Component - Display group information in card form
 * Includes avatar, basic info, member count, and action buttons
 * 
 * @param {Object} group - Group information
 * @param {Function} onJoin - Callback when joining group
 * @param {Function} onLeave - Callback when leaving group
 * @param {Function} onEdit - Callback when editing group
 * @param {boolean} showActions - Whether to show action buttons
 * @param {string} userRole - User's role in the group (owner, admin, member, null)
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

  // Handle join group
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

  // Handle leave group
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

  // Handle edit group
  const handleEdit = () => {
    if (onEdit) {
      onEdit(group);
    }
    setShowMenu(false);
  };

  // Get icon based on group type
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

  // Get text based on group type
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

  // Check participation status
  const isMember = !!userRole; // Already a member (has userRole)
  const isOwner = userRole === 'owner';

  // Check if can join (not a member yet)
  const canJoin = !userRole;

  // Check if can leave (already a member but not owner)
  const canLeave = userRole && userRole !== 'owner';

  // Check if can edit (owner or admin)
  const canEdit = userRole === 'owner' || userRole === 'admin';

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md dark:shadow-gray-900/20 hover:shadow-lg transition-shadow duration-200 overflow-hidden border border-gray-200 dark:border-neutral-800">
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
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 dark:bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs font-medium">
          {getGroupTypeIcon()}
          <span>{getGroupTypeText()}</span>
        </div>

        {/* Avatar */}
        <div className="absolute -bottom-8 left-4">
          <div className="w-16 h-16 rounded-full border-4 border-white dark:border-gray-800 overflow-hidden bg-gray-200 dark:bg-neutral-800 shadow-lg">
            {group.avatar ? (
              <img
                src={group.avatar}
                alt={`Avatar của ${group.name}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-300 dark:bg-neutral-700 flex items-center justify-center">
                <Users className="w-8 h-8 text-gray-500 dark:text-gray-400" />
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
                className="p-2 rounded-full bg-black/60 dark:bg-black/70 backdrop-blur-sm text-white hover:bg-opacity-80 transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-10 bg-white dark:bg-neutral-900 rounded-lg shadow-lg dark:shadow-gray-900/50 py-1 z-10 min-w-[120px] border border-gray-200 dark:border-neutral-800">
                  {canEdit && (
                    <button
                      onClick={handleEdit}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 flex items-center gap-2 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Chỉnh sửa
                    </button>
                  )}
                  {canLeave && (
                    <button
                      onClick={handleLeave}
                      disabled={isLeaving}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 disabled:opacity-50 transition-colors"
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
          <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 hover:text-black dark:hover:text-white transition-colors line-clamp-1">
            {group.name}
          </h3>
        </Link>

        {/* Description */}
        {group.description && (
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1 line-clamp-2">
            {group.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
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
          <div className="flex items-center gap-1 mt-2 text-sm text-gray-500 dark:text-gray-400">
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
                className="px-2 py-1 bg-neutral-200 dark:bg-neutral-800 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full font-medium"
              >
                #{tag}
              </span>
            ))}
            {group.tags.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                +{group.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Owner Info */}
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200 dark:bg-neutral-800">
                {group.owner?.avatarUrl ? (
                  <img
                    src={group.owner.avatarUrl}
                    alt={group.owner?.name || group.owner?.fullName || group.owner?.username || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-300 dark:bg-neutral-700 flex items-center justify-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {(group.owner?.name || group.owner?.fullName || group.owner?.username || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Tạo bởi</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  <UserName user={group.owner} maxLength={15} />
                </p>
              </div>
            </div>

            {/* User Role Badge */}
            {userRole && (
              <div className="flex items-center gap-1">
                {userRole === 'owner' && (
                  <Shield className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />
                )}
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 capitalize">
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
                className="flex-1 bg-gray-900 dark:bg-neutral-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                {isJoining ? 'Đang tham gia...' : 'Tham gia nhóm'}
              </button>
            )}

            {isMember && !isOwner && (
              <div className="flex gap-2 flex-1">
                <Link
                  to={`/groups/${group._id}`}
                  className="flex-1 bg-green-600 dark:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-center flex items-center justify-center gap-2"
                >
                  <UserCheck className="w-4 h-4" />
                  Đã tham gia
                </Link>
                {canLeave && (
                  <button
                    onClick={handleLeave}
                    disabled={isLeaving}
                    className="px-3 py-2 bg-gray-200 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    title="Rời nhóm"
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {isOwner && (
              <Link
                to={`/groups/${group._id}`}
                className="flex-1 bg-gray-900 dark:bg-neutral-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors text-center flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4" />
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


