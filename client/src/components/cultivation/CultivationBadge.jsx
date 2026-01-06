/**
 * CultivationBadge - Hiển thị badge cảnh giới tu tiên
 * Có thể dùng inline với tên user hoặc standalone
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import { CULTIVATION_REALMS, getRealmByLevel } from '../../services/cultivationAPI.js';

/**
 * Badge nhỏ hiển thị cạnh tên user
 */
export const CultivationBadgeInline = memo(function CultivationBadgeInline({
  realmLevel = 1,
  realmName,
  showIcon = true,
  showName = false,
  className = ''
}) {
  const realm = getRealmByLevel(realmLevel);

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs ${className}`}
      title={`${realm.name} - Cảnh giới ${realmLevel}`}
      style={{ color: realm.color }}
    >
      {showIcon && <span className="text-sm">{realm.icon}</span>}
      {showName && <span className="font-medium">{realmName || realm.name}</span>}
    </span>
  );
});

/**
 * Badge lớn với animation
 */
export const CultivationBadgeLarge = memo(function CultivationBadgeLarge({
  realmLevel = 1,
  realmName,
  exp = 0,
  progress = 0,
  showProgress = true,
  className = ''
}) {
  const realm = getRealmByLevel(realmLevel);

  return (
    <motion.div
      className={`relative inline-flex flex-col items-center ${className}`}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Icon with glow effect */}
      <div
        className="relative text-4xl mb-1"
        style={{
          filter: `drop-shadow(0 0 8px ${realm.color})`,
          textShadow: `0 0 20px ${realm.color}`
        }}
      >
        {realm.icon}

        {/* Animated ring for high realms */}
        {realmLevel >= 5 && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 opacity-50"
            style={{ borderColor: realm.color }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.2, 0.5]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}
      </div>

      {/* Realm name */}
      <div
        className="font-bold text-lg"
        style={{ color: realm.color }}
      >
        {realmName || realm.name}
      </div>

      {/* Progress bar */}
      {showProgress && (
        <div className="w-full mt-2">
          <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: realm.color }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 text-center">
            {progress}% đến cảnh giới tiếp theo
          </div>
        </div>
      )}
    </motion.div>
  );
});

/**
 * Card hiển thị thông tin tu tiên đầy đủ
 */
export const CultivationCard = memo(function CultivationCard({
  cultivation,
  compact = false,
  className = ''
}) {
  if (!cultivation) return null;

  const realm = cultivation.realm || getRealmByLevel(cultivation.realmLevel || 1);

  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-900 ${className}`}>
        <span
          className="text-2xl"
          style={{ filter: `drop-shadow(0 0 4px ${realm.color})` }}
        >
          {realm.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="font-bold"
              style={{ color: realm.color }}
            >
              {realm.name}
            </span>
            <span className="text-xs text-neutral-500">
              Tầng {cultivation.subLevel || 1}
            </span>
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            Tu vi: {cultivation.exp?.toLocaleString() || 0}
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-amber-500">
            <span></span>
            <span className="font-medium">{cultivation.spiritStones?.toLocaleString() || 0}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-2xl bg-gradient-to-br from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-900 border border-neutral-200 dark:border-neutral-700 ${className}`}>
      <div className="flex items-start gap-4">
        {/* Realm icon */}
        <div className="flex-shrink-0">
          <CultivationBadgeLarge
            realmLevel={realm.level}
            realmName={realm.name}
            exp={cultivation.exp}
            progress={cultivation.progress || 0}
            showProgress={false}
          />
        </div>

        {/* Stats */}
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-2 gap-3">
            <StatItem
              icon=""
              label="Tu Vi"
              value={cultivation.exp?.toLocaleString() || 0}
            />
            <StatItem
              icon=""
              label="Linh Thạch"
              value={cultivation.spiritStones?.toLocaleString() || 0}
            />
            <StatItem
              icon=""
              label="Streak"
              value={`${cultivation.loginStreak || 0} ngày`}
            />
            <StatItem
              icon=""
              label="Tiểu cấp"
              value={`Tầng ${cultivation.subLevel || 1}`}
            />
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-neutral-500 mb-1">
              <span>Tiến độ tu luyện</span>
              <span>{cultivation.progress || 0}%</span>
            </div>
            <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: realm.color }}
                initial={{ width: 0 }}
                animate={{ width: `${cultivation.progress || 0}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

/**
 * Stat item component
 */
const StatItem = memo(function StatItem({ icon, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-lg">{icon}</span>
      <div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400">{label}</div>
        <div className="font-medium text-neutral-900 dark:text-white">{value}</div>
      </div>
    </div>
  );
});

/**
 * Level Up Notification Component
 */
export const LevelUpNotification = memo(function LevelUpNotification({
  realm,
  onClose,
  show = false
}) {
  if (!show || !realm) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative p-8 rounded-3xl bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 text-center max-w-sm mx-4"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.5 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Particles effect */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                backgroundColor: realm.color,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`
              }}
              animate={{
                y: [0, -100],
                opacity: [1, 0],
                scale: [1, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: Math.random() * 2
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10">
          <motion.div
            className="text-6xl mb-4"
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ duration: 0.5, repeat: 3 }}
            style={{ filter: `drop-shadow(0 0 20px ${realm.color})` }}
          >
            {realm.icon}
          </motion.div>

          <h2 className="text-2xl font-bold text-white mb-2">
            Đột Phá Thành Công!
          </h2>

          <p
            className="text-xl font-bold mb-2"
            style={{ color: realm.color }}
          >
            {realm.name}
          </p>

          <p className="text-neutral-400 text-sm mb-4">
            {realm.description}
          </p>

          <button
            onClick={onClose}
            className="px-6 py-2 rounded-full text-white font-medium transition-all hover:scale-105"
            style={{ backgroundColor: realm.color }}
          >
            Tiếp tục tu luyện
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
});

export default CultivationCard;
