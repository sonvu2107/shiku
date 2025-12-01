import { motion } from "framer-motion";
import { Edit3, Camera, Settings, MapPin, Phone, Calendar, Heart, Link as LinkIcon, Sparkles } from "lucide-react";
import { generateAvatarUrl, AVATAR_SIZES } from "../../utils/avatarUtils";
import { SpotlightCard } from "../ui/SpotlightCard";
import Button from "../ui/Button";
import { PROFILE_MESSAGES } from "../../constants/profile";
import UserAvatar, { UserTitle } from "../UserAvatar";
import ProfileEffect from "../ProfileEffect";
import CultivationBadge from "../CultivationBadge";
import { useRef } from "react";

/**
 * ProfileHeader - Component display profile header with cover, avatar, name, and stats
 */
export default function ProfileHeader({
  user,
  form,
  editing,
  avatarUploading,
  analytics = null,
  analyticsLoading = false,
  friendsCount = 0,
  friendsLoading = false,
  onEditToggle,
  onCustomizeClick,
  onCoverChange,
  onAvatarClick,
}) {
  const coverRef = useRef(null);
  const profileEffect = user?.cultivationCache?.equipped?.profileEffect;
  
  const formatGender = (gender) => {
    if (gender === 'male') return 'Nam';
    if (gender === 'female') return 'Nữ';
    if (gender === 'other') return 'Khác';
    return '';
  };

  return (
    <div className="relative">
      {/* Cover Image Container */}
      <div ref={coverRef} className="h-64 md:h-80 lg:h-96 w-full relative overflow-hidden group">
        {form.coverUrl && user.useCoverImage !== false ? (
          <motion.img
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.5 }}
            src={form.coverUrl}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-neutral-200 to-neutral-400 dark:from-neutral-800 dark:to-neutral-900" />
        )}
        
        {/* Profile Effect Overlay */}
        {profileEffect && (
          <ProfileEffect 
            effectId={profileEffect} 
            containerRef={coverRef}
          />
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent dark:from-black dark:via-transparent dark:to-transparent opacity-90" />
        
        {/* Edit Cover Button */}
        {editing && (
          <label className="absolute top-3 right-3 md:top-4 md:right-4 px-3 py-2 md:px-4 md:py-2 bg-black/50 backdrop-blur-md border border-white/10 rounded-full text-white text-xs md:text-sm font-medium cursor-pointer hover:bg-black/70 active:bg-black/80 transition-all flex items-center gap-1.5 md:gap-2 min-h-[44px] touch-manipulation">
            <Camera size={14} className="md:w-4 md:h-4" /> <span className="hidden sm:inline">Đổi ảnh bìa</span><span className="sm:hidden">Đổi bìa</span>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={onCoverChange}
              disabled={avatarUploading}
            />
          </label>
        )}
      </div>

      {/* Profile Info Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10">
        <div className="flex flex-col md:flex-row items-end md:items-end gap-6 mb-8">
          
          {/* Avatar */}
          <div className="relative group mx-auto md:mx-0">
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="relative z-10"
            >
              <UserAvatar 
                user={user}
                size={160}
                showFrame={true}
                showBadge={true}
                showTitle={false}
                className="hidden md:block border-4 md:border-[6px] border-white dark:border-black rounded-full shadow-2xl"
              />
              <UserAvatar 
                user={user}
                size={128}
                showFrame={true}
                showBadge={true}
                showTitle={false}
                className="hidden sm:block md:hidden border-4 border-white dark:border-black rounded-full shadow-2xl"
              />
              <UserAvatar 
                user={user}
                size={112}
                showFrame={true}
                showBadge={true}
                showTitle={false}
                className="sm:hidden border-4 border-white dark:border-black rounded-full shadow-2xl"
              />
              {editing && (
                <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer backdrop-blur-sm rounded-full z-20">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <Edit3 className="text-white w-8 h-8" />
                    <span className="text-white text-xs font-bold">Chỉnh sửa</span>
                  </motion.div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={onAvatarClick}
                  />
                </label>
              )}
            </motion.div>
          </div>

          {/* Name & Actions */}
          <div className="flex-1 mb-2 w-full md:w-auto text-center md:text-left">
            <div className="flex items-center gap-3 mb-1 flex-wrap justify-center md:justify-start">
              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl md:text-5xl font-black text-neutral-900 dark:text-white tracking-tight"
              >
                {form.name}
              </motion.h1>
              {/* Role badge - chỉ hiển thị khi displayBadgeType = 'none' hoặc 'role' */}
              {(!user.displayBadgeType || user.displayBadgeType === 'none' || user.displayBadgeType === 'role') && 
               user.role && user.role !== "user" && (
                <span className="px-3 py-1 bg-neutral-900 dark:bg-white text-white dark:text-black text-xs font-bold rounded-full uppercase tracking-wider">
                  {user.role}
                </span>
              )}
              {/* Hiển thị cảnh giới tu tiên - nếu chọn realm hoặc both */}
              {(user.displayBadgeType === 'realm' || user.displayBadgeType === 'both' || user.displayBadgeType === 'cultivation') && 
               user.cultivationCache?.realmName && (
                <CultivationBadge 
                  cultivation={user.cultivationCache} 
                  size="md" 
                  variant="gradient" 
                />
              )}
              {/* Danh hiệu tu tiên - nếu chọn title hoặc both */}
              {(user.displayBadgeType === 'title' || user.displayBadgeType === 'both') && (
                <UserTitle user={user} className="text-sm" />
              )}
            </div>
            <p className="text-neutral-500 dark:text-neutral-400 text-lg font-medium mb-4">
              {form.nickname || PROFILE_MESSAGES.NO_NICKNAME}
            </p>
            
            {/* Stats Row (Mobile - Grid 2 columns) */}
            <div className="grid grid-cols-2 md:hidden gap-4 mb-6 max-w-xs mx-auto md:mx-0">
              <div className="text-center p-3 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                <span className="block font-black text-black dark:text-white text-2xl">
                  {analyticsLoading ? '...' : (analytics?.totalPosts ?? 0)}
                </span>
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Bài viết</span>
              </div>
              <div className="text-center p-3 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                <span className="block font-black text-black dark:text-white text-2xl">
                  {friendsLoading ? '...' : friendsCount}
                </span>
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Bạn bè</span>
              </div>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-2 md:gap-3 w-full md:w-auto">
              <Button 
                onClick={onEditToggle}
                variant="primary"
                size="md"
                className="hover:scale-105 transition-transform min-h-[44px] touch-manipulation flex-1 md:flex-initial"
              >
                {editing ? "Xong" : "Chỉnh sửa hồ sơ"}
              </Button>
              <Button 
                onClick={onCustomizeClick}
                variant="outline"
                size="md"
                className="flex items-center gap-2 min-h-[44px] touch-manipulation flex-1 md:flex-initial"
              >
                <Settings size={18} /> <span className="hidden sm:inline">Tùy chỉnh</span><span className="sm:hidden">Tùy chỉnh</span>
              </Button>
            </div>
          </div>

          {/* Desktop Stats (Spotlight Cards) */}
          <div className="hidden md:flex gap-4 mb-2">
            <SpotlightCard className="py-4 px-6 min-w-[120px] text-center !rounded-2xl">
              <span className="block text-2xl font-black text-black dark:text-white">
                {analyticsLoading ? '...' : (analytics?.totalPosts ?? 0)}
              </span>
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Bài viết</span>
            </SpotlightCard>
            <SpotlightCard className="py-4 px-6 min-w-[120px] text-center !rounded-2xl">
              <span className="block text-2xl font-black text-black dark:text-white">
                {friendsLoading ? '...' : friendsCount}
              </span>
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Bạn bè</span>
            </SpotlightCard>
          </div>
        </div>

        {/* Details */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-3xl mb-12 mx-auto"
        >
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-neutral-500 dark:text-neutral-500 justify-center md:justify-start">
            {form.location && (
              <div className="flex items-center gap-1.5">
                <MapPin size={16} /> {form.location}
              </div>
            )}
            {form.phone && (
              <div className="flex items-center gap-1.5">
                <Phone size={16} /> {form.phone}
              </div>
            )}
            {form.birthday && (
              <div className="flex items-center gap-1.5">
                <Calendar size={16} /> {new Date(form.birthday).toLocaleDateString('vi-VN')}
              </div>
            )}
            {form.gender && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs">Giới tính:</span> {formatGender(form.gender)}
              </div>
            )}
            {form.hobbies && (
              <div className="flex items-center gap-1.5">
                <Heart size={16} /> {form.hobbies}
              </div>
            )}
            {form.website && (
              <a 
                href={form.website} 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center gap-1.5 hover:text-blue-500 transition-colors"
              >
                <LinkIcon size={16} /> {form.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

