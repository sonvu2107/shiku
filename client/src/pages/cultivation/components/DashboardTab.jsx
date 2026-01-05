/**
 * Dashboard Tab - Main cultivation interface
 */
import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CULTIVATION_REALMS } from '../../../services/cultivationAPI.js';

const DashboardTab = memo(function DashboardTab({
  cultivation,
  currentRealm,
  nextRealm,
  progressPercent,
  isBreakthroughReady,
  onYinYangClick,
  onBreakthrough,
  onCollectPassiveExp,
  passiveExpStatus,
  collectingPassiveExp,
  clickCooldown,
  isBreakingThrough,
  particles,
  logs,
  logExpanded,
  setLogExpanded,
  logEndRef,
  equippedTechnique // Công pháp đang trang bị
}) {
  // Tính tỷ lệ thành công cho độ kiếp dựa trên cảnh giới
  const baseSuccessRatesByRealm = {
    1: 90,  // Phàm Nhân -> Luyện Khí: 90%
    2: 80,  // Luyện Khí -> Trúc Cơ: 80%
    3: 70,  // Trúc Cơ -> Kim Đan: 70%
    4: 60,  // Kim Đan -> Nguyên Anh: 60%
    5: 50,  // Nguyên Anh -> Hóa Thần: 50%
    6: 40,  // Hóa Thần -> Luyện Hư: 40%
    7: 30,  // Luyện Hư -> Đại Thừa: 30%
    8: 20,  // Đại Thừa -> Độ Kiếp: 20%
    9: 15,  // Độ Kiếp -> Tiên Nhân: 15%
    10: 10, // Tiên Nhân -> Thiên Đế: 10%
    11: 5   // Thiên Đế (max level)
  };

  const bonusPerFailureByRealm = {
    1: 15, 2: 15, 3: 12, 4: 10, 5: 8, 6: 7, 7: 6, 8: 5, 9: 5, 10: 5, 11: 5
  };

  const realmLevel = cultivation?.realm?.level || 1;
  const baseSuccessRate = baseSuccessRatesByRealm[realmLevel] || 30;
  const bonusPerFailure = bonusPerFailureByRealm[realmLevel] || 10;
  const failureCount = cultivation.breakthroughFailureCount || 0;

  // Kiểm tra cooldown
  const now = new Date();

  // Kiểm tra đan dược tăng tỷ lệ độ kiếp trong inventory
  const breakthroughPills = (cultivation?.inventory || []).filter(item =>
    item.type === 'breakthrough_boost' &&
    !item.used &&
    (!item.expiresAt || new Date(item.expiresAt) > now)
  );

  // Tìm đan dược có bonus cao nhất
  let breakthroughBonus = 0;
  let bestPill = null;
  if (breakthroughPills.length > 0) {
    // Lấy bonus từ metadata.breakthroughBonus (được lưu khi mua item)
    breakthroughPills.forEach(pill => {
      const bonus = pill.metadata?.breakthroughBonus ||
        (pill.itemId?.includes('perfect') ? 50 :
          pill.itemId?.includes('large') ? 30 :
            pill.itemId?.includes('medium') ? 20 :
              pill.itemId?.includes('small') ? 10 : 0);

      if (bonus > breakthroughBonus) {
        breakthroughBonus = bonus;
        bestPill = pill;
      }
    });
  }

  // Tính tỷ lệ thành công: base rate + bonus từ số lần thất bại + bonus từ đan dược
  const currentSuccessRate = Math.min(100,
    baseSuccessRate + failureCount * bonusPerFailure + breakthroughBonus
  );
  const cooldownUntil = cultivation.breakthroughCooldownUntil ? new Date(cultivation.breakthroughCooldownUntil) : null;
  const isOnCooldown = cooldownUntil && cooldownUntil > now;
  const cooldownRemaining = isOnCooldown ? Math.ceil((cooldownUntil - now) / (1000 * 60)) : 0;

  // Có thể độ kiếp không? (đủ exp và không trong cooldown)
  const canBreakthrough = isBreakthroughReady && !isOnCooldown;

  return (
    <div className="space-y-6 md:space-y-8 font-cultivation">
      {/* Particles */}
      {particles.map(p => (
        <div
          key={p.id}
          className={`particle text-xl font-title tracking-wider ${p.color === 'gold' ? 'text-amber-400' :
            p.color === 'red' ? 'text-red-400' :
              'text-emerald-400'
            }`}
          style={{ left: p.x, top: p.y }}
        >
          {p.text}
        </div>
      ))}

      {/* Main Cultivation Card - Spirit Tablet Design */}
      <div className="spirit-tablet rounded-3xl p-6 md:p-8 lg:p-10 relative overflow-hidden">
        {/* Decorative Corners */}
        <div className="spirit-corner spirit-corner-tl border-amber-500/40"></div>
        <div className="spirit-corner spirit-corner-tr border-amber-500/40"></div>
        <div className="spirit-corner spirit-corner-bl border-amber-500/40"></div>
        <div className="spirit-corner spirit-corner-br border-amber-500/40"></div>

        {/* Header - Enhanced with Tiên Hiệp Effects */}
        <div className="text-center mb-8 relative">
          {/* Giữ 2 qi-particle cho header */}
          <div className="qi-particle" style={{ top: '10%', left: '15%', animationDelay: '0s' }}></div>
          <div className="qi-particle" style={{ top: '20%', right: '20%', animationDelay: '1s' }}></div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-title text-gold tracking-widest mb-3 realm-name-glow relative">
            {currentRealm.name.toUpperCase()}
          </h2>

          <div className="h-[1px] w-32 sm:w-40 md:w-48 mx-auto bg-gradient-to-r from-transparent via-amber-500/50 to-transparent relative">
            {/* Animated dots on line */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
          </div>

          <p className="text-slate-400 text-sm uppercase tracking-widest mt-3 relative">
            <span className="floating-char" style={{ left: '10%', top: '-10px', animationDelay: '0s' }}>道</span>
            <span className="floating-char" style={{ right: '15%', top: '-15px', animationDelay: '1s' }}>仙</span>
            Cảnh Giới Hiện Tại
          </p>
        </div>


        {/* Yin Yang Click for Tu Vi - Enhanced Tiên Hiệp */}
        <div className="flex flex-col items-center justify-center py-12 lg:py-12 relative">
          {/* Giữ 2 qi-particle quanh yin yang */}
          <div className="qi-particle" style={{ top: '20%', left: '20%', animationDelay: '0s' }}></div>
          <div className="qi-particle" style={{ bottom: '20%', right: '20%', animationDelay: '1.5s' }}></div>

          <div className="yinyang-container relative">
            {/* Giữ 1 Qi flow ring */}
            <div className="absolute inset-0 border-2 border-amber-500/20 rounded-full animate-spin" style={{ animationDuration: '20s' }}></div>

            <div className="yinyang-glow"></div>
            <motion.img
              src="/assets/yinyang.png"
              alt="Âm Dương"
              className="yinyang"
              onClick={onYinYangClick}
              onMouseDown={(e) => e.preventDefault()}
              tabIndex={-1}
              whileTap={{ scale: 0.9 }}
              style={{
                animationPlayState: isBreakingThrough ? 'paused' : 'running',
                opacity: clickCooldown ? 0.1 : 1,
                outline: 'none'
              }}
            />
          </div>

          {/* Floating Chinese characters */}
          <span className="floating-char" style={{ left: '15%', top: '30%', animationDelay: '0s' }}>氣</span>
          <span className="floating-char" style={{ right: '18%', top: '35%', animationDelay: '1s' }}>靈</span>
          <span className="floating-char" style={{ left: '20%', bottom: '25%', animationDelay: '2s' }}>元</span>
          <span className="floating-char" style={{ right: '22%', bottom: '30%', animationDelay: '1.5s' }}>精</span>

          <p className="mt-4 text-slate-400/80 text-xs uppercase tracking-wider animate-pulse text-center relative">
            Hấp thu thiên địa linh khí <br />
            <span className="text-[10px] text-amber-500/70">(Có xác suất nhận Linh Thạch)</span>
          </p>
        </div>

        {/* Log Panel inside Spirit Tablet */}
        <div className="mb-6 relative">

          <button
            onClick={() => setLogExpanded(!logExpanded)}
            className="flex items-center gap-2 w-full text-left mb-2 group relative"
          >
            <span className={`text-slate-400 text-xs transition-transform duration-200 ${logExpanded ? 'rotate-180' : ''}`}>
              ▼
            </span>
            <h4 className="text-xs font-bold text-jade uppercase tracking-wider group-hover:text-cyan-300 transition-colors flex items-center gap-2">
              <span className="floating-char" style={{ position: 'relative', left: '0', top: '0', animation: 'none', opacity: '0.6', fontSize: '10px' }}>錄</span>
              Nhật Ký Tu Luyện
            </h4>
          </button>
          <div
            className={`bg-black/50 rounded-xl border-2 border-cyan-500/10 p-3 overflow-y-auto scrollbar-cultivation font-cultivation text-[11px] leading-5 transition-all duration-300 relative ${logExpanded ? 'h-40' : 'h-16'}`}
            style={{
              backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(6, 182, 212, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(245, 158, 11, 0.05) 0%, transparent 50%)'
            }}
          >
            {logs.map((log) => (
              <div
                key={log.id}
                className={`mb-0.5 ${log.type === 'gain' ? 'text-emerald-400' :
                  log.type === 'danger' ? 'text-red-400 font-bold' :
                    log.type === 'success' ? 'text-amber-300 font-bold' :
                      'text-slate-500'
                  }`}
              >
                &gt; {log.text}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>

        {/* Progress Bar (Spirit Vein Style) */}
        <div className="mb-6 md:mb-8 relative">
          <div className="flex justify-between text-xs text-slate-500 mb-3 uppercase tracking-wider font-semibold">
            <span className="flex items-center gap-2">
              <span className="floating-char" style={{ position: 'relative', left: '0', top: '0', animation: 'none', opacity: '0.5', fontSize: '12px' }}>修</span>
              Tiến độ đột phá
            </span>
            <span className="font-mono">
              {cultivation.exp?.toLocaleString()} / {nextRealm?.minExp?.toLocaleString() || '∞'}
            </span>
          </div>
          <div className="w-full bg-slate-900/80 rounded-full h-4 lg:h-5 border-2 border-slate-700/50 relative overflow-hidden shadow-inner">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 via-violet-900/20 to-purple-900/20 rounded-full"></div>

            <motion.div
              className={`absolute top-0 left-0 h-full transition-all duration-500 ease-out relative ${isBreakthroughReady
                ? 'bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-200 shadow-[0_0_15px_rgba(251,191,36,0.5)]'
                : 'bg-gradient-to-r from-purple-900 via-purple-600 to-violet-400'
                }`}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            >
              {/* Shimmer effect */}
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]"
                style={{ transform: 'translateX(-100%)' }}
              ></div>
            </motion.div>

            {/* Glow effect when ready */}
            {isBreakthroughReady && (
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-400/30 via-yellow-400/30 to-amber-400/30 animate-pulse"></div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 gap-4 md:gap-5 lg:gap-6 mb-6 md:mb-8">
          {isBreakthroughReady ? (
            <div className="flex flex-col gap-2">
              <motion.button
                onClick={onBreakthrough}
                disabled={isBreakingThrough || isOnCooldown}
                className={`flex flex-col items-center justify-center gap-1 py-3 sm:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wide transition-transform ${isOnCooldown
                  ? 'bg-slate-900/50 border border-slate-800 text-slate-600 cursor-not-allowed'
                  : 'bg-gradient-to-br from-amber-700 to-amber-900 border border-amber-500/50 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.4)] animate-pulse hover:scale-[1.02] active:scale-95'
                  }`}
                whileHover={!isOnCooldown ? { scale: 1.02 } : {}}
              >
                <span>ĐỘ KIẾP</span>
                {!isOnCooldown && (
                  <span className="text-xs font-normal opacity-80">
                    Tỷ lệ: {currentSuccessRate}%
                    {breakthroughBonus > 0 && (
                      <span className="text-emerald-400 ml-1">
                        (+{breakthroughBonus}% từ {bestPill?.name || 'Đan Dược'})
                      </span>
                    )}
                  </span>
                )}
                {isOnCooldown && (
                  <span className="text-xs font-normal">
                    Chờ {cooldownRemaining} phút
                  </span>
                )}
              </motion.button>
              {failureCount > 0 && !isOnCooldown && (
                <p className="text-xs text-center text-amber-400/70">
                  Đã thất bại {failureCount} lần (+{failureCount * bonusPerFailure}% tỷ lệ)
                </p>
              )}
              {breakthroughBonus > 0 && !isOnCooldown && (
                <p className="text-xs text-center text-emerald-400/70">
                  Có {breakthroughPills.length} đan dược độ kiếp trong túi đồ
                </p>
              )}
            </div>
          ) : (
            <button
              disabled
              className="flex items-center justify-center gap-2 py-4 px-6 bg-slate-900/50 border border-slate-800 rounded-xl text-slate-600 text-sm font-bold uppercase tracking-wide cursor-not-allowed"
            >
              Bình Cảnh
            </button>
          )}
        </div>
      </div>

      {/* Active Boosts & Equipped Technique */}
      {(cultivation.activeBoosts?.length > 0 || equippedTechnique) && (
        <div className="spirit-tablet-jade rounded-xl p-5 lg:p-6">
          <h3 className="font-bold text-jade mb-4 font-title tracking-wide text-lg">
            BUFF ĐANG HOẠT ĐỘNG
          </h3>
          <div className="space-y-3">
            {/* Công pháp equipped (permanent buff) */}
            {equippedTechnique && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-amber-900/20 rounded-lg border border-amber-500/30">
                <div className="flex items-center gap-2">
                  <span className="text-lg text-amber-400 font-title">法</span>
                  <div>
                    <span className="text-sm font-medium text-amber-300">{equippedTechnique.name}</span>
                    <p className="text-[10px] text-amber-500/70">Công pháp tu luyện</p>
                  </div>
                </div>
                <div className="flex flex-col items-end text-right">
                  <span className="text-sm font-bold text-amber-400">
                    +{equippedTechnique.bonusPercent}% Tu Vi
                  </span>
                  <span className="text-[10px] text-emerald-400">
                    ∞ Vĩnh viễn
                  </span>
                </div>
              </div>
            )}

            {/* Active boosts (temporary) */}
            {cultivation.activeBoosts?.map((boost, idx) => {
              const expiresAt = new Date(boost.expiresAt);
              const now = new Date();
              const remainingMs = expiresAt - now;
              const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
              const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
              const isExpiringSoon = remainingMs < 60 * 60 * 1000; // < 1 giờ

              return (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-black/30 rounded-lg border border-cyan-500/20">
                  <span className="text-sm font-medium text-slate-200">Tu Luyện x{boost.multiplier}</span>
                  <div className="flex flex-col items-end text-right">
                    <span className={`text-xs font-mono ${isExpiringSoon ? 'text-orange-400' : 'text-cyan-400'}`}>
                      Còn {remainingHours > 0 ? `${remainingHours}h ` : ''}{remainingMinutes}p
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Hết hạn: {expiresAt.toLocaleDateString('vi-VN')} {expiresAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Passive Exp - Tu Vi Tích Lũy */}
      <div className="spirit-tablet rounded-xl p-5 lg:p-6 border border-emerald-500/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-emerald-400 font-title tracking-wide text-lg flex items-center gap-2">
            <span className="text-2xl"></span>
            TU VI TÍCH LŨY
          </h3>
          {passiveExpStatus?.multiplier > 1 && (
            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full border border-amber-500/30">
              x{passiveExpStatus.multiplier} Đan Dược
            </span>
          )}
        </div>

        <div className="mb-4">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold text-emerald-400 font-mono">
              +{passiveExpStatus?.pendingExp || 0}
            </span>
            <span className="text-slate-400 text-sm">Tu Vi</span>
          </div>
          <p className="text-slate-500 text-sm">
            {passiveExpStatus?.minutesElapsed || 0} phút tu luyện
            {passiveExpStatus?.multiplier > 1 && (
              <span className="text-amber-400 ml-1">
                (Base: {passiveExpStatus?.baseExp || 0} × {passiveExpStatus?.multiplier})
              </span>
            )}
          </p>
        </div>

        <motion.button
          onClick={onCollectPassiveExp}
          disabled={collectingPassiveExp || (passiveExpStatus?.pendingExp || 0) < 1}
          className={`w-full py-3 px-4 rounded-xl font-bold uppercase tracking-wide transition-all ${(passiveExpStatus?.pendingExp || 0) >= 1
            ? 'bg-gradient-to-r from-emerald-700 to-emerald-900 text-emerald-100 border border-emerald-500/30 hover:from-emerald-600 hover:to-emerald-800 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
            : 'bg-slate-900/50 text-slate-600 border border-slate-800 cursor-not-allowed'
            }`}
          whileHover={!collectingPassiveExp && (passiveExpStatus?.pendingExp || 0) >= 1 ? { scale: 1.02 } : {}}
          whileTap={!collectingPassiveExp && (passiveExpStatus?.pendingExp || 0) >= 1 ? { scale: 0.98 } : {}}
        >
          {collectingPassiveExp ? ' Đang thu thập...' : ' Thu Thập Tu Vi'}
        </motion.button>

        <p className="text-center text-xs text-slate-500 mt-3">
          Tu vi tăng <span className="text-emerald-400 font-bold">{passiveExpStatus?.expPerMinute || 2} exp/phút</span> • Tối đa 24h • Đan dược có hiệu lực
        </p>
      </div>

      {/* Realms Progress */}
      <div className="spirit-tablet rounded-xl p-5 lg:p-6">
        <h3 className="font-bold text-gold mb-5 font-title tracking-wide text-lg">
          CỬU TRỌNG CẢNH GIỚI
        </h3>
        <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-cultivation pr-2">
          {CULTIVATION_REALMS.map((realm) => {
            const isCurrent = cultivation.realm?.level === realm.level;
            const isUnlocked = cultivation.exp >= realm.minExp;

            return (
              <motion.div
                key={realm.level}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${isCurrent
                  ? 'bg-purple-900/30 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                  : isUnlocked
                    ? 'bg-black/20 border-white/10 opacity-80'
                    : 'bg-black/10 border-white/5 opacity-40'
                  }`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: isCurrent ? 1 : isUnlocked ? 0.8 : 0.4, x: 0 }}
              >

                <div className="flex-1">
                  <div
                    className="font-medium font-title tracking-wide"
                    style={{ color: isUnlocked ? realm.color : '#6b7280' }}
                  >
                    {realm.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {realm.minExp.toLocaleString()} Tu Vi
                  </div>
                </div>
                {isCurrent && (
                  <span className="text-xs bg-purple-500/30 text-purple-300 px-2 py-1 rounded-full border border-purple-500/30">
                    Hiện tại
                  </span>
                )}

              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default DashboardTab;

