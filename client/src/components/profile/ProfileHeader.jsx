import { motion } from "framer-motion";
import { Edit3, Camera, Settings } from "lucide-react";
import { generateAvatarUrl, AVATAR_SIZES } from "../../utils/avatarUtils";
import { isVideoUrl, getAcceptedMediaTypes } from "../../utils/mediaUtils";
import { SpotlightCard } from "../ui/SpotlightCard";
import Button from "../ui/Button";
import { PROFILE_MESSAGES } from "../../constants/profile";
import UserAvatar, { UserTitle } from "../UserAvatar";
import ProfileEffect from "../ProfileEffect";
import CultivationBadge from "../CultivationBadge";
import StatusBadge from "../StatusBadge";

import { useRef, useMemo } from "react";

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

  // Check if cover URL is a video
  const isCoverVideo = useMemo(() => isVideoUrl(form.coverUrl), [form.coverUrl]);

  // Theme color configurations
  const themeColors = {
    default: { from: "#3b82f6", to: "#1e40af" },
    dark: { from: "#1f2937", to: "#111827" },
    blue: { from: "#2563eb", to: "#1d4ed8" },
    green: { from: "#059669", to: "#047857" },
    purple: { from: "#7c3aed", to: "#6d28d9" },
    pink: { from: "#db2777", to: "#be185d" },
    orange: { from: "#ea580c", to: "#c2410c" }
  };

  // Get current theme colors
  const currentTheme = themeColors[user?.profileTheme] || themeColors.default;

  return (
    <div className="relative">
      {/* Cover Image Container */}
      <div ref={coverRef} className="h-64 md:h-80 lg:h-96 w-full relative overflow-hidden group">
        {form.coverUrl && user.useCoverImage !== false ? (
          isCoverVideo ? (
            <video
              autoPlay
              loop
              muted
              playsInline
              src={form.coverUrl}
              className="w-full h-full object-cover"
            />
          ) : (
            <motion.img
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.5 }}
              src={form.coverUrl}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          )
        ) : (
          <div
            className="w-full h-full"
            style={{
              background: `linear-gradient(135deg, ${currentTheme.from} 0%, ${currentTheme.to} 100%)`
            }}
          />
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
            <Camera size={14} className="md:w-4 md:h-4" /> <span className="hidden sm:inline">Đổi ảnh/video bìa</span><span className="sm:hidden">Đổi bìa</span>
            <input
              type="file"
              accept={getAcceptedMediaTypes(true)}
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
              <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer backdrop-blur-sm rounded-full z-20">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex flex-col items-center gap-2"
                >
                  <Edit3 className="text-white w-8 h-8" />
                  <span className="text-white text-xs font-bold">Đổi ảnh</span>
                </motion.div>
                <input
                  type="file"
                  accept={getAcceptedMediaTypes(true)}
                  className="hidden"
                  onChange={onAvatarClick}
                />
              </label>
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
              {/* Role badge */}
              {(!user.displayBadgeType || user.displayBadgeType === 'none' || user.displayBadgeType === 'role') &&
                user.role && user.role !== "user" && (
                  <span className="px-3 py-1 bg-neutral-900 dark:bg-white text-white dark:text-black text-xs font-bold rounded-full uppercase tracking-wider">
                    {user.role}
                  </span>
                )}
              {/* Cultivation badge */}
              {(user.displayBadgeType === 'realm' || user.displayBadgeType === 'both' || user.displayBadgeType === 'cultivation') &&
                user.cultivationCache?.realmName && (
                  <CultivationBadge
                    cultivation={user.cultivationCache}
                    size="md"
                    variant="gradient"
                  />
                )}
              {/* User title */}
              {(user.displayBadgeType === 'title' || user.displayBadgeType === 'both') && (
                <UserTitle user={user} className="text-sm" />
              )}
            </div>
            <p className="text-neutral-500 dark:text-neutral-400 text-lg font-medium mb-2">
              {form.nickname || PROFILE_MESSAGES.NO_NICKNAME}
            </p>

            {/* Status Badge */}
            {user.statusUpdate?.text && (
              <div className="mb-4 flex justify-center md:justify-start">
                <StatusBadge status={user.statusUpdate} size="md" />
              </div>
            )}
            {!user.statusUpdate?.text && <div className="mb-4"></div>}



            {/* Stats Row (Mobile) */}
            <div className="grid grid-cols-2 md:hidden gap-4 mb-6 max-w-xs mx-auto md:mx-0">
              <div
                className="text-center p-3 bg-neutral-50 dark:bg-neutral-900 rounded-xl border-2 border-transparent"
              >
                <span className="block font-black text-black dark:text-white text-2xl">
                  {analyticsLoading ? '...' : (analytics?.totalPosts ?? 0)}
                </span>
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Bài viết</span>
              </div>
              <div
                className="text-center p-3 bg-neutral-50 dark:bg-neutral-900 rounded-xl border-2 border-transparent"
              >
                <span className="block font-black text-black dark:text-white text-2xl">
                  {friendsLoading ? '...' : friendsCount}
                </span>
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Bạn bè</span>
              </div>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-2 md:gap-3 w-full md:w-auto">
              <button
                onClick={onEditToggle}
                className="hover:scale-105 transition-all min-h-[44px] touch-manipulation flex-1 md:flex-initial px-6 py-2.5 rounded-xl font-bold text-white shadow-lg bg-neutral-900 dark:bg-white dark:text-black"
              >
                {editing ? "Xong" : "Chỉnh sửa hồ sơ"}
              </button>
              <Button
                onClick={onCustomizeClick}
                variant="outline"
                size="md"
                className="min-h-[44px] touch-manipulation flex-1 md:flex-initial"
              >
                Tùy chỉnh
              </Button>
            </div>


          </div>

          {/* Desktop Stats */}
          <div className="hidden md:flex gap-4 mb-2">
            <SpotlightCard
              className="py-4 px-6 min-w-[120px] text-center !rounded-2xl border-2 border-transparent"
            >
              <span className="block text-2xl font-black text-neutral-900 dark:text-white">
                {analyticsLoading ? '...' : (analytics?.totalPosts ?? 0)}
              </span>
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Bài viết</span>
            </SpotlightCard>
            <SpotlightCard
              className="py-4 px-6 min-w-[120px] text-center !rounded-2xl border-2 border-transparent"
            >
              <span className="block text-2xl font-black text-neutral-900 dark:text-white">
                {friendsLoading ? '...' : friendsCount}
              </span>
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Bạn bè</span>
            </SpotlightCard>
          </div>
        </div>

        {/* Spotify Embed Row - Outside the items-end container to prevent pushing content up */}

      </div>
    </div>

  );
}
