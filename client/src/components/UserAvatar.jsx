/**
 * UserAvatar Component - Hiển thị avatar với khung và hiệu ứng
 * Hỗ trợ các trang bị từ hệ thống tu tiên
 * Hỗ trợ GIF và video avatar
 */

import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { isVideoUrl } from '../utils/mediaUtils';
import { getOptimizedAvatarUrl } from '../utils/imageOptimization';
import {
  GiFlame,
  GiSnowflake2,
  GiLightningTrio,
  GiTornado,
  GiMountainCave,
  GiWaterDrop,
  GiYinYang,
  GiSpikedDragonHead,
  GiPolarStar,
  GiMoonBats,
  GiSunRadiations,
  GiVortex
} from 'react-icons/gi';

// Cấu hình khung avatar với hiệu ứng viền xung quanh
const AVATAR_FRAMES = {
  frame_gold: {
    name: 'Kim Sắc Khung',
    borderColor: '#FFD700',
    glowColor: 'rgba(255, 215, 0, 0.6)',
    gradient: 'linear-gradient(135deg, #FFD700, #FFA500, #FFD700)',
    animated: false
  },
  frame_purple: {
    name: 'Tử Sắc Khung',
    borderColor: '#8B5CF6',
    glowColor: 'rgba(139, 92, 246, 0.6)',
    gradient: 'linear-gradient(135deg, #8B5CF6, #A78BFA, #8B5CF6)',
    animated: false
  },
  frame_jade: {
    name: 'Ngọc Bích Khung',
    borderColor: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.6)',
    gradient: 'linear-gradient(135deg, #10B981, #34D399, #10B981)',
    animated: false
  },
  frame_ruby: {
    name: 'Hồng Ngọc Khung',
    borderColor: '#EF4444',
    glowColor: 'rgba(239, 68, 68, 0.6)',
    gradient: 'linear-gradient(135deg, #EF4444, #F87171, #EF4444)',
    animated: false
  },
  frame_sapphire: {
    name: 'Thanh Ngọc Khung',
    borderColor: '#3B82F6',
    glowColor: 'rgba(59, 130, 246, 0.6)',
    gradient: 'linear-gradient(135deg, #3B82F6, #60A5FA, #3B82F6)',
    animated: false
  },
  frame_rainbow: {
    name: 'Thất Sắc Khung',
    borderColor: 'transparent',
    glowColor: 'rgba(255, 255, 255, 0.4)',
    gradient: 'linear-gradient(135deg, #FF6B6B, #FFE66D, #4ECDC4, #45B7D1, #96C93D, #DDA0DD, #FF6B6B)',
    animated: true,
    animationType: 'rainbow'
  },
  frame_flames: {
    name: 'Hỏa Viêm Khung',
    borderColor: '#F97316',
    glowColor: 'rgba(249, 115, 22, 0.8)',
    gradient: 'linear-gradient(0deg, #FF4500, #FF6347, #FFA500, #FF4500)',
    animated: true,
    animationType: 'flames'
  },
  frame_ice: {
    name: 'Băng Tinh Khung',
    borderColor: '#06B6D4',
    glowColor: 'rgba(6, 182, 212, 0.7)',
    gradient: 'linear-gradient(180deg, #E0FFFF, #87CEEB, #00CED1, #87CEEB, #E0FFFF)',
    animated: true,
    animationType: 'ice'
  },
  frame_celestial: {
    name: 'Thiên Giới Khung',
    borderColor: '#FBBF24',
    glowColor: 'rgba(251, 191, 36, 0.9)',
    gradient: 'linear-gradient(135deg, #FFD700, #FFF8DC, #FBBF24, #FFF8DC, #FFD700)',
    animated: true,
    animationType: 'celestial',
    legendary: true
  }
};

// Cấu hình huy hiệu với Game Icons
const BADGES = {
  badge_fire: { icon: GiFlame, name: 'Hỏa Diễm', color: '#EF4444' },
  badge_ice: { icon: GiSnowflake2, name: 'Băng Tuyết', color: '#06B6D4' },
  badge_thunder: { icon: GiLightningTrio, name: 'Lôi Điện', color: '#FBBF24' },
  badge_wind: { icon: GiTornado, name: 'Cuồng Phong', color: '#6B7280' },
  badge_earth: { icon: GiMountainCave, name: 'Đại Địa', color: '#92400E' },
  badge_water: { icon: GiWaterDrop, name: 'Thủy Nguyên', color: '#3B82F6' },
  badge_yin_yang: { icon: GiYinYang, name: 'Âm Dương', color: '#1F2937' },
  badge_dragon: { icon: GiSpikedDragonHead, name: 'Long Văn', color: '#DC2626' },
  badge_star: { icon: GiPolarStar, name: 'Tinh Thần', color: '#FBBF24' },
  badge_moon: { icon: GiMoonBats, name: 'Nguyệt Quang', color: '#6366F1' },
  badge_sun: { icon: GiSunRadiations, name: 'Thái Dương', color: '#F59E0B' },
  badge_chaos: { icon: GiVortex, name: 'Hỗn Độn', color: '#7C3AED' }
};

// Cấu hình danh hiệu
const TITLES = {
  title_swordsman: { icon: '⚔️', name: 'Kiếm Khách', color: '#6B7280' },
  title_scholar: { icon: '📚', name: 'Thư Sinh', color: '#3B82F6' },
  title_hermit: { icon: '🏔️', name: 'Ẩn Sĩ', color: '#10B981' },
  title_sage: { icon: '🧙', name: 'Hiền Giả', color: '#8B5CF6' },
  title_demon_slayer: { icon: '👹', name: 'Diệt Ma Giả', color: '#DC2626' },
  title_alchemist: { icon: '⚗️', name: 'Luyện Đan Sư', color: '#F59E0B' },
  title_immortal: { icon: '✨', name: 'Tiên Nhân', color: '#FFD700' },
  title_dragon_rider: { icon: '🐲', name: 'Long Kỵ Sĩ', color: '#EF4444' },
  title_night_walker: { icon: '🌙', name: 'Dạ Du Thần', color: '#6366F1' },
  title_phoenix: { icon: '🔥', name: 'Phượng Hoàng Sứ Giả', color: '#F97316' }
};

/**
 * Component hiển thị avatar với khung và trang bị
 */
const UserAvatar = memo(function UserAvatar({
  user,
  size = 40,
  className = '',
  showFrame = true,
  showBadge = true,
  showTitle = false,
  onClick,
  cultivation // Có thể pass cultivation data riêng
}) {
  // Lấy thông tin trang bị từ cultivation hoặc user.cultivationCache
  const equipped = useMemo(() => {
    if (cultivation?.equipped) return cultivation.equipped;
    if (user?.cultivationCache?.equipped) return user.cultivationCache.equipped;
    if (user?.equipped) return user.equipped;
    return {};
  }, [cultivation, user]);

  // Lấy thông tin khung
  const frameConfig = useMemo(() => {
    if (!showFrame || !equipped.avatarFrame) return null;
    return AVATAR_FRAMES[equipped.avatarFrame];
  }, [showFrame, equipped.avatarFrame]);

  // Lấy thông tin huy hiệu
  const badgeConfig = useMemo(() => {
    if (!showBadge || !equipped.badge) return null;
    return BADGES[equipped.badge];
  }, [showBadge, equipped.badge]);

  // Lấy thông tin danh hiệu
  const titleConfig = useMemo(() => {
    if (!showTitle || !equipped.title) return null;
    return TITLES[equipped.title];
  }, [showTitle, equipped.title]);

  // Tạo avatar URL với optimization cho Cloudinary
  const avatarUrl = useMemo(() => {
    if (user?.avatarUrl && user.avatarUrl.trim() !== '') {
      // Optimize Cloudinary URLs với size phù hợp
      return getOptimizedAvatarUrl(user.avatarUrl, size);
    }
    const name = user?.name || user?.nickname || 'User';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&length=2&background=cccccc&color=222222&size=${size * 2}`;
  }, [user?.avatarUrl, user?.name, user?.nickname, size]);

  // Check if avatar is a video
  const isVideo = useMemo(() => isVideoUrl(avatarUrl), [avatarUrl]);

  // Frame border sizes - tính toán dựa trên size
  const borderWidth = Math.max(3, Math.floor(size / 10));
  const containerSize = size + borderWidth * 2 + 4;
  const glowSize = Math.max(4, Math.floor(size / 8));

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      {/* Container chính - căn giữa hoàn hảo */}
      <div
        className="relative flex items-center justify-center cursor-pointer"
        style={{ width: containerSize, height: containerSize }}
        onClick={onClick}
        title={frameConfig?.name}
      >
        {/* Lớp glow bên ngoài (cho khung animated) */}
        {frameConfig?.animated && (
          <motion.div
            className="absolute rounded-full"
            style={{
              width: containerSize + glowSize,
              height: containerSize + glowSize,
              top: -glowSize / 2,
              left: -glowSize / 2,
              background: frameConfig.gradient,
              backgroundSize: frameConfig.animationType === 'rainbow' ? '400% 400%' : '200% 200%',
              filter: `blur(${glowSize}px)`,
              opacity: 0.7
            }}
            animate={{
              backgroundPosition: frameConfig.animationType === 'rainbow'
                ? ['0% 50%', '100% 50%', '0% 50%']
                : frameConfig.animationType === 'flames'
                  ? ['50% 0%', '50% 100%', '50% 0%']
                  : frameConfig.animationType === 'ice'
                    ? ['50% 100%', '50% 0%', '50% 100%']
                    : ['0% 0%', '100% 100%', '0% 0%'],
              scale: [1, 1.1, 1]
            }}
            transition={{
              backgroundPosition: {
                duration: frameConfig.animationType === 'flames' ? 1 : 3,
                repeat: Infinity,
                ease: 'linear'
              },
              scale: {
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }
            }}
          />
        )}

        {/* Lớp khung viền chính */}
        {frameConfig && (
          <motion.div
            className="absolute rounded-full"
            style={{
              width: containerSize,
              height: containerSize,
              top: 0,
              left: 0,
              background: frameConfig.gradient,
              backgroundSize: frameConfig.animationType === 'rainbow' ? '400% 400%' : '200% 200%',
              boxShadow: `0 0 ${glowSize * 2}px ${frameConfig.glowColor}, inset 0 0 ${glowSize}px ${frameConfig.glowColor}`
            }}
            animate={frameConfig.animated ? {
              backgroundPosition: frameConfig.animationType === 'rainbow'
                ? ['0% 50%', '100% 50%', '0% 50%']
                : frameConfig.animationType === 'flames'
                  ? ['50% 0%', '50% 100%', '50% 0%']
                  : frameConfig.animationType === 'ice'
                    ? ['50% 100%', '50% 0%', '50% 100%']
                    : ['0% 0%', '100% 100%', '0% 0%']
            } : {}}
            transition={frameConfig.animated ? {
              backgroundPosition: {
                duration: frameConfig.animationType === 'flames' ? 0.8 :
                  frameConfig.animationType === 'celestial' ? 2 : 3,
                repeat: Infinity,
                ease: frameConfig.animationType === 'flames' ? 'easeInOut' : 'linear'
              }
            } : {}}
          />
        )}

        {/* Vòng tròn tối bên trong (tạo viền) */}
        {frameConfig && (
          <div
            className="absolute rounded-full bg-slate-100 dark:bg-slate-800"
            style={{
              width: size + 4,
              height: size + 4,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          />
        )}

        {/* Avatar - căn giữa chính xác */}
        <div
          className="absolute rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700"
          style={{
            width: size,
            height: size,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1
          }}
        >
          {isVideo ? (
            <video
              src={avatarUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={avatarUrl}
              alt={user?.name || 'User'}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )}
        </div>

        {/* Hiệu ứng lấp lánh cho legendary frame */}
        {frameConfig?.legendary && (
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: containerSize,
              height: containerSize,
              top: 0,
              left: 0,
              background: 'linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.8) 50%, transparent 60%)',
              backgroundSize: '200% 200%'
            }}
            animate={{
              backgroundPosition: ['200% 200%', '-100% -100%']
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 1,
              ease: 'easeInOut'
            }}
          />
        )}

        {/* Huy hiệu (góc dưới phải) */}
        {badgeConfig && (
          <motion.div
            className="absolute flex items-center justify-center rounded-full shadow-lg border-2 border-white dark:border-slate-800"
            style={{
              bottom: 0,
              right: 0,
              width: Math.max(18, size / 2.2),
              height: Math.max(18, size / 2.2),
              backgroundColor: badgeConfig.color,
              zIndex: 10
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.2 }}
            title={badgeConfig.name}
          >
            <badgeConfig.icon size={Math.max(10, size / 3.5)} color="white" />
          </motion.div>
        )}
      </div>

      {/* Danh hiệu (dưới avatar) */}
      {titleConfig && showTitle && (
        <motion.div
          className="mt-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
          style={{
            backgroundColor: `${titleConfig.color}20`,
            color: titleConfig.color,
            border: `1px solid ${titleConfig.color}40`,
            fontSize: Math.max(10, size / 4)
          }}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {titleConfig.name}
        </motion.div>
      )}
    </div>
  );
});

/**
 * Component hiển thị chỉ danh hiệu (inline) - không icon
 */
export const UserTitle = memo(function UserTitle({ user, cultivation, className = '' }) {
  const equipped = useMemo(() => {
    if (cultivation?.equipped) return cultivation.equipped;
    if (user?.cultivationCache?.equipped) return user.cultivationCache.equipped;
    if (user?.equipped) return user.equipped;
    return {};
  }, [cultivation, user]);

  const titleConfig = equipped.title ? TITLES[equipped.title] : null;

  if (!titleConfig) return null;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${className}`}
      style={{
        backgroundColor: `${titleConfig.color}15`,
        color: titleConfig.color,
        border: `1px solid ${titleConfig.color}25`
      }}
      title={titleConfig.name}
    >
      {titleConfig.name}
    </span>
  );
});

/**
 * Component hiển thị chỉ huy hiệu (inline)
 */
export const UserBadge = memo(function UserBadge({ user, cultivation, size = 16, className = '' }) {
  const equipped = useMemo(() => {
    if (cultivation?.equipped) return cultivation.equipped;
    if (user?.cultivationCache?.equipped) return user.cultivationCache.equipped;
    if (user?.equipped) return user.equipped;
    return {};
  }, [cultivation, user]);

  const badgeConfig = equipped.badge ? BADGES[equipped.badge] : null;

  if (!badgeConfig) return null;

  const IconComponent = badgeConfig.icon;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: badgeConfig.color
      }}
      title={badgeConfig.name}
    >
      <IconComponent size={size * 0.6} color="white" />
    </span>
  );
});

export default UserAvatar;
export { AVATAR_FRAMES, BADGES, TITLES };
