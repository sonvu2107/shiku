/**
 * Identity Header Component - Display user info and cultivation stats
 */
import { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreVertical, X } from 'lucide-react';
import { getUserAvatarUrl } from '../../../utils/avatarUtils.js';
import { loadUser } from '../../../utils/userCache.js';
import { getCombatStats } from '../utils/helpers.js';
import Avatar from '../../../components/Avatar';

const IdentityHeader = memo(function IdentityHeader({ cultivation, currentRealm }) {
  const [user, setUser] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await loadUser();
        if (userData) {
          setUser(userData);
        }
      } catch (err) {
        console.error('Error loading user:', err);
      }
    };
    fetchUser();
  }, []);

  const displayName = user?.nickname?.trim() || user?.name || cultivation.user?.name || cultivation.user?.nickname || 'Đạo Hữu Vô Danh';
  const avatarUrl = user ? getUserAvatarUrl(user, 80) : null;
  const stats = getCombatStats(cultivation);

  // Đóng menu khi click outside
  useEffect(() => {
    if (!showDetails) return;
    const handleClickOutside = (e) => {
      if (!e.target.closest('.stats-details-menu')) {
        setShowDetails(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showDetails]);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 border-b-2 border-amber-500/20 pb-4 sm:pb-5 mb-5 sm:mb-6 relative">
      {/* Decorative line */}
      <div className="absolute bottom-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-amber-500/30 to-transparent"></div>

      {/* Avatar */}
      <div className="flex items-center gap-4 sm:gap-0 sm:block">
        <div className="relative">
          <div className="w-14 h-14 sm:w-[4.5rem] sm:h-[4.5rem] lg:w-20 lg:h-20 rounded-full bg-slate-800 border-2 border-amber-500/50 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.2)] overflow-hidden ring-2 ring-amber-500/20">
            {user?.avatarUrl ? (
              <Avatar
                src={user.avatarUrl}
                name={displayName}
                size={72}
                className=""
              />
            ) : (
              <span className="text-3xl lg:text-4xl">{currentRealm?.icon || '👤'}</span>
            )}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 bg-slate-950 border sm:border-2 border-amber-500/60 text-[7px] sm:text-[9px] lg:text-[10px] text-amber-500 px-1 sm:px-1.5 lg:px-2 py-0.5 sm:py-0.5 lg:py-1 rounded font-bold uppercase tracking-[0.05em] sm:tracking-[0.1em] shadow-lg">
            Lv.{currentRealm?.level || 1}
          </div>
        </div>

        {/* Mobile: Tên & Cảnh Giới inline with avatar */}
        <div className="sm:hidden flex-1 min-w-0">
          <h3 className="text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-200 to-amber-100 font-title tracking-[0.05em] mb-1 leading-tight truncate">
            {displayName}
          </h3>
          <p className="text-xs text-slate-400 font-cultivation italic flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_4px_rgba(16,185,129,0.6)]"></span>
            <span className="tracking-wide">{currentRealm?.name || 'Phàm Nhân'}</span>
          </p>
        </div>
      </div>

      {/* Tên & Cảnh Giới - Desktop only */}
      <div className="hidden sm:block flex-1 min-w-0">
        <h3 className="text-lg lg:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-200 to-amber-100 font-title tracking-[0.05em] mb-2 leading-tight">
          {displayName}
        </h3>
        <p className="text-xs lg:text-sm text-slate-400 font-cultivation italic flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_4px_rgba(16,185,129,0.6)]"></span>
          <span className="tracking-wide">{currentRealm?.name || 'Phàm Nhân'}</span>
        </p>
      </div>

      {/* Thông Số Tu Vi & Linh Thạch */}
      <div className="flex justify-between sm:justify-end sm:flex-col sm:gap-3 sm:text-right w-full sm:w-auto">
        <div className="flex items-center gap-2 sm:gap-3 sm:justify-end">
          <p className="text-[10px] sm:text-[11px] text-emerald-300/80 uppercase tracking-[0.1em] sm:tracking-[0.15em] font-semibold">Tu Vi:</p>
          <h3 className="text-sm sm:text-base lg:text-lg font-bold text-emerald-100 font-mono tabular-nums">
            {cultivation.exp?.toLocaleString() || 0}
          </h3>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 sm:justify-end">
          <p className="text-[10px] sm:text-[11px] text-amber-300/80 uppercase tracking-[0.1em] sm:tracking-[0.15em] font-semibold">Linh Thạch:</p>
          <h3 className="text-sm sm:text-base lg:text-lg font-bold text-amber-100 font-mono tabular-nums">
            {cultivation.spiritStones?.toLocaleString() || 0}
          </h3>
        </div>
      </div>

      {/* Nút Menu Chi Tiết - Góc phải trên mobile, inline trên desktop */}
      <div className="absolute top-0 right-0 sm:relative sm:top-auto sm:right-auto stats-details-menu">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowDetails(!showDetails);
          }}
          className="p-2 rounded-lg hover:bg-slate-800/50 transition-colors text-slate-400 hover:text-amber-400"
          title="Xem chi tiết thông số"
        >
          <MoreVertical size={18} />
        </button>

        {/* Dropdown Menu Chi Tiết */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-amber-500/30 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] z-50 overflow-hidden"
            >
              <div className="p-3 border-b border-white/5 flex items-center justify-between">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Thông Số Chi Tiết</h4>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="p-3 space-y-2 max-h-96 overflow-y-auto scrollbar-cultivation">
                {/* Advanced Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tốc Độ:</span>
                    <span className="text-cyan-300 font-mono font-bold">{Math.round(stats.speed || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Chí Mạng:</span>
                    <span className="text-purple-300 font-mono font-bold">{Math.round(stats.criticalRate || 0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sát Thương Chí Mạng:</span>
                    <span className="text-red-300 font-mono font-bold">{Math.round(stats.criticalDamage || 0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Chính Xác:</span>
                    <span className="text-blue-300 font-mono font-bold">{Math.round(stats.accuracy || 0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Né Tránh:</span>
                    <span className="text-green-300 font-mono font-bold">{Math.round(stats.dodge || 0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Xuyên Thấu:</span>
                    <span className="text-orange-300 font-mono font-bold">{Math.round(stats.penetration || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Kháng Cự:</span>
                    <span className="text-yellow-300 font-mono font-bold">{Math.round(stats.resistance || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Hấp Huyết:</span>
                    <span className="text-pink-300 font-mono font-bold">{Math.round(stats.lifesteal || 0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Hồi Phục:</span>
                    <span className="text-teal-300 font-mono font-bold">{Math.round(stats.regeneration || 0)}/s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Vận Khí:</span>
                    <span className="text-indigo-300 font-mono font-bold">{stats.luck}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

export default IdentityHeader;

