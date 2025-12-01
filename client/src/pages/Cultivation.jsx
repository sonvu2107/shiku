/**
 * Cultivation Page - Trang Tu Tiên chính
 * Giao diện Vũ Trụ Hư Không với hiệu ứng sấm sét khi đột phá
 */

import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { CultivationProvider, useCultivation } from '../hooks/useCultivation.jsx';
import { CULTIVATION_REALMS, formatNumber } from '../services/cultivationAPI.js';

// ==================== LOG MESSAGES ====================
const LOG_MESSAGES = [
  "Hấp thu tinh hoa nhật nguyệt...",
  "Vận chuyển một vòng đại chu thiên...",
  "Cảm ngộ thiên đạo...",
  "Linh khí tụ về đan điền...",
  "Tâm cảnh bình ổn, tu vi tăng tiến...",
  "Luyện hóa trọc khí...",
  "Ngộ ra một chút chân lý...",
  "Phát hiện một luồng linh khí lạ...",
  "Nghe thấy tiếng đại đạo thì thầm..."
];

// ==================== CUSTOM STYLES ====================
const CustomStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Noto+Serif+SC:wght@300;400;700&display=swap');
    
    .font-title { font-family: 'Cinzel', serif; }
    .font-cultivation { font-family: 'Noto Serif SC', serif; }

    /* Cosmic Background Animation */
    .stars {
      background-image: 
        radial-gradient(1px 1px at 25px 5px, white, transparent), 
        radial-gradient(1px 1px at 50px 25px, white, transparent), 
        radial-gradient(1px 1px at 125px 20px, white, transparent), 
        radial-gradient(1.5px 1.5px at 50px 75px, white, transparent), 
        radial-gradient(2px 2px at 15px 125px, rgba(255,255,255,0.5), transparent), 
        radial-gradient(2.5px 2.5px at 110px 80px, white, transparent),
        radial-gradient(1px 1px at 200px 150px, white, transparent),
        radial-gradient(1.5px 1.5px at 180px 50px, white, transparent);
      background-size: 250px 250px;
      animation: moveStars 100s linear infinite;
    }
    @keyframes moveStars {
      from { background-position: 0 0; }
      to { background-position: 0 1000px; }
    }

    /* Mist Animation - Ethereal Qi */
    .mist {
      position: absolute;
      background: radial-gradient(ellipse at center, rgba(88, 28, 135, 0.2) 0%, rgba(0,0,0,0) 70%);
      border-radius: 50%;
      filter: blur(50px);
      animation: floatMist 25s infinite ease-in-out alternate;
    }
    .mist-2 {
      background: radial-gradient(ellipse at center, rgba(6, 182, 212, 0.12) 0%, rgba(0,0,0,0) 70%);
      animation-duration: 35s;
      animation-delay: -10s;
    }
    .mist-3 {
      background: radial-gradient(ellipse at center, rgba(245, 158, 11, 0.1) 0%, rgba(0,0,0,0) 70%);
      animation-duration: 30s;
      animation-delay: -5s;
    }
    
    @keyframes floatMist {
      0% { transform: translate(0, 0) scale(1); opacity: 0.3; }
      50% { transform: translate(30px, -20px) scale(1.2); opacity: 0.6; }
      100% { transform: translate(-20px, 40px) scale(1.1); opacity: 0.3; }
    }

    /* Spirit Tablet Glass Panel */
    .spirit-tablet {
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(245, 158, 11, 0.15);
      box-shadow: 
        0 4px 30px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.05),
        0 0 40px rgba(168, 85, 247, 0.1);
    }

    .spirit-tablet-jade {
      background: rgba(15, 35, 42, 0.75);
      border: 1px solid rgba(6, 182, 212, 0.2);
      box-shadow: 
        0 4px 30px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(6, 182, 212, 0.1),
        0 0 30px rgba(6, 182, 212, 0.08);
    }

    /* Golden Text Gradient */
    .text-gold {
      background: linear-gradient(to bottom, #fcd34d, #d97706);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    /* Jade Text */
    .text-jade {
      background: linear-gradient(to bottom, #67e8f9, #0891b2);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    /* Yin Yang Spinner */
    .yinyang-container {
      position: relative;
      width: 180px; height: 180px;
      display: flex; justify-content: center; align-items: center;
    }
    .yinyang-glow {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 100%; height: 100%;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(245, 158, 11, 0.2) 0%, transparent 70%);
      animation: pulseGlow 3s infinite;
    }
    
    .yinyang {
      width: 160px;
      height: 160px;
      background: linear-gradient(to bottom, #f1f5f9 50%, #0f172a 50%);
      border-radius: 50%;
      border: 2px solid #475569;
      position: relative;
      animation: spin 12s linear infinite;
      box-shadow: 0 0 15px rgba(255,255,255,0.1);
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.3s;
      z-index: 10;
    }
    .yinyang:active { transform: scale(0.95); }
    .yinyang:hover { 
      box-shadow: 0 0 30px rgba(168, 85, 247, 0.5); 
      border-color: #a855f7; 
    }
    .yinyang::before, .yinyang::after {
      content: ''; position: absolute; left: 50%; transform: translateX(-50%);
      width: 80px; height: 80px; border-radius: 50%;
    }
    .yinyang::before { top: 0; background: #f1f5f9; border: 24px solid #0f172a; box-sizing: border-box; }
    .yinyang::after { bottom: 0; background: #0f172a; border: 24px solid #f1f5f9; box-sizing: border-box; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
    @keyframes pulseGlow {
      0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
      50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.8; }
    }

    /* Floating Particle */
    .particle {
      position: fixed;
      pointer-events: none;
      animation: floatUp 2s cubic-bezier(0, 0.55, 0.45, 1) forwards;
      font-weight: 700;
      text-shadow: 0 0 10px currentColor;
      z-index: 100;
    }
    @keyframes floatUp {
      0% { opacity: 0; transform: translateY(0) scale(0.5); }
      20% { opacity: 1; transform: translateY(-20px) scale(1.2); }
      100% { opacity: 0; transform: translateY(-100px) scale(1); }
    }

    /* Shake Animation for Breakthrough */
    .shake {
      animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both infinite;
    }
    @keyframes shake {
      10%, 90% { transform: translate3d(-4px, 0, 0); }
      20%, 80% { transform: translate3d(8px, 0, 0); }
      30%, 50%, 70% { transform: translate3d(-16px, 0, 0); }
      40%, 60% { transform: translate3d(16px, 0, 0); }
    }

    /* Progress Bar Shimmer */
    @keyframes shimmer {
      100% { transform: translateX(200%); }
    }

    /* Scrollbar Styling */
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

    .custom-scrollbar::-webkit-scrollbar {
      width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 2px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(168, 85, 247, 0.4);
      border-radius: 2px;
    }

    /* Decorative Corner */
    .spirit-corner {
      position: absolute;
      width: 40px;
      height: 40px;
      pointer-events: none;
    }
    .spirit-corner-tl { top: 0; left: 0; border-top: 2px solid; border-left: 2px solid; border-radius: 8px 0 0 0; }
    .spirit-corner-tr { top: 0; right: 0; border-top: 2px solid; border-right: 2px solid; border-radius: 0 8px 0 0; }
    .spirit-corner-bl { bottom: 0; left: 0; border-bottom: 2px solid; border-left: 2px solid; border-radius: 0 0 0 8px; }
    .spirit-corner-br { bottom: 0; right: 0; border-bottom: 2px solid; border-right: 2px solid; border-radius: 0 0 8px 0; }
  `}</style>
);

// ==================== LOADING SKELETON ====================
const LoadingSkeleton = () => (
  <div className="space-y-4 animate-pulse p-6">
    <div className="h-48 bg-slate-800/50 rounded-xl"></div>
    <div className="grid grid-cols-2 gap-3">
      <div className="h-20 bg-slate-800/50 rounded-lg"></div>
      <div className="h-20 bg-slate-800/50 rounded-lg"></div>
    </div>
    <div className="h-32 bg-slate-800/50 rounded-xl"></div>
  </div>
);

// ==================== STAT BOX ====================
const StatBox = memo(function StatBox({ label, value }) {
  return (
    <div className="bg-black/40 border border-white/10 p-4 lg:p-5 rounded-xl text-center relative overflow-hidden group hover:border-purple-500/30 transition-all">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent opacity-50"></div>
      <p className="text-xs lg:text-sm text-slate-400 uppercase tracking-widest mb-2">{label}</p>
      <h3 className="text-xl lg:text-2xl font-bold text-slate-100 font-mono">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </h3>
    </div>
  );
});

// ==================== DASHBOARD TAB ====================
const DashboardTab = memo(function DashboardTab({ 
  cultivation, 
  currentRealm, 
  nextRealm, 
  progressPercent, 
  isBreakthroughReady,
  onYinYangClick,
  onCheckIn,
  onBreakthrough,
  onCollectPassiveExp,
  passiveExpStatus,
  collectingPassiveExp,
  checkingIn,
  clickCooldown,
  isBreakingThrough,
  particles,
  logs,
  logExpanded,
  setLogExpanded,
  logEndRef
}) {
  return (
    <div className="space-y-6 font-cultivation">
      {/* Particles */}
      {particles.map(p => (
        <div 
          key={p.id} 
          className={`particle text-xl font-title tracking-wider ${
            p.color === 'gold' ? 'text-amber-400' : 
            p.color === 'red' ? 'text-red-400' : 
            'text-emerald-400'
          }`}
          style={{ left: p.x, top: p.y }}
        >
          {p.text}
        </div>
      ))}

      {/* Main Cultivation Card - Spirit Tablet Design */}
      <div className="spirit-tablet rounded-2xl p-6 lg:p-10 relative overflow-hidden">
        {/* Decorative Corners */}
        <div className="spirit-corner spirit-corner-tl border-amber-500/40"></div>
        <div className="spirit-corner spirit-corner-tr border-amber-500/40"></div>
        <div className="spirit-corner spirit-corner-bl border-amber-500/40"></div>
        <div className="spirit-corner spirit-corner-br border-amber-500/40"></div>

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-4xl lg:text-5xl font-title text-gold tracking-widest mb-3">
            {currentRealm.name.toUpperCase()}
          </h2>
          <div className="h-[1px] w-48 mx-auto bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>
          <p className="text-slate-400 text-sm uppercase tracking-widest mt-3">
            Cảnh Giới Hiện Tại
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 lg:gap-6 mb-8">
          <div className="bg-black/40 border border-cyan-500/20 p-4 lg:p-5 rounded-xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-50"></div>
            <p className="text-xs text-cyan-300/70 uppercase tracking-widest mb-2">Cảnh Giới</p>
            <h3 className="text-base lg:text-lg font-bold text-cyan-100 font-title truncate">{currentRealm.name}</h3>
          </div>
          
          <div className="bg-black/40 border border-emerald-500/20 p-4 lg:p-5 rounded-xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-50"></div>
            <p className="text-xs text-emerald-300/70 uppercase tracking-widest mb-2">Tu Vi</p>
            <h3 className="text-base lg:text-lg font-bold text-emerald-100 font-mono">{cultivation.exp?.toLocaleString() || 0}</h3>
          </div>
          
          <div className="bg-black/40 border border-amber-500/20 p-4 lg:p-5 rounded-xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent opacity-50"></div>
            <p className="text-xs text-amber-300/70 uppercase tracking-widest mb-2">Linh Thạch</p>
            <h3 className="text-base lg:text-lg font-bold text-amber-100 font-mono">{cultivation.spiritStones?.toLocaleString() || 0}</h3>
          </div>
        </div>

        {/* Yin Yang Click for Tu Vi */}
        <div className="flex flex-col items-center justify-center py-8 lg:py-12">
          <div className="yinyang-container">
            <div className="yinyang-glow"></div>
            <motion.div 
              className="yinyang"
              onClick={onYinYangClick}
              onMouseDown={(e) => e.preventDefault()}
              tabIndex={-1}
              whileTap={{ scale: 0.9 }}
              style={{ 
                animationPlayState: checkingIn || isBreakingThrough ? 'paused' : 'running',
                opacity: clickCooldown ? 0.7 : 1,
                outline: 'none'
              }}
            />
          </div>
          <p className="mt-4 text-slate-400/80 text-xs uppercase tracking-wider animate-pulse text-center">
            Hấp thu thiên địa linh khí <br/>
            <span className="text-[10px] text-amber-500/70">(Có xác suất nhận Linh Thạch)</span>
          </p>
        </div>

        {/* Log Panel inside Spirit Tablet */}
        <div className="mb-6">
          <button 
            onClick={() => setLogExpanded(!logExpanded)}
            className="flex items-center gap-2 w-full text-left mb-2 group"
          >
            <span className={`text-slate-400 text-xs transition-transform duration-200 ${logExpanded ? 'rotate-180' : ''}`}>
              ▼
            </span>
            <h4 className="text-xs font-bold text-jade uppercase tracking-wider group-hover:text-cyan-300 transition-colors">Nhật Ký Tu Luyện</h4>
          </button>
          <div 
            className={`bg-black/50 rounded-xl border border-cyan-500/10 p-3 overflow-y-auto custom-scrollbar font-mono text-[11px] leading-5 transition-all duration-300 ${logExpanded ? 'h-40' : 'h-16'}`}
          >
            {logs.map((log) => (
              <div 
                key={log.id} 
                className={`mb-0.5 ${
                  log.type === 'gain' ? 'text-emerald-400' : 
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
        <div className="mb-6">
          <div className="flex justify-between text-xs text-slate-500 mb-3 uppercase tracking-wider font-semibold">
            <span>Tiến độ đột phá</span>
            <span className="font-mono">
              {cultivation.exp?.toLocaleString()} / {nextRealm?.minExp?.toLocaleString() || '∞'}
            </span>
          </div>
          <div className="w-full bg-slate-900/80 rounded-full h-4 lg:h-5 border border-slate-700/50 relative overflow-hidden shadow-inner">
            <motion.div 
              className={`absolute top-0 left-0 h-full transition-all duration-500 ease-out ${
                isBreakthroughReady 
                  ? 'bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-200 shadow-[0_0_15px_rgba(251,191,36,0.5)]' 
                  : 'bg-gradient-to-r from-purple-900 via-purple-600 to-violet-400'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            >
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" 
                style={{ transform: 'translateX(-100%)' }}
              ></div>
            </motion.div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 lg:gap-6 mb-6">
          <motion.button
            onClick={onCheckIn}
            disabled={checkingIn || isBreakingThrough}
            className="flex items-center justify-center gap-2 py-4 px-6 bg-slate-800/40 border border-slate-700 rounded-xl text-slate-300 text-sm font-bold uppercase tracking-wide hover:bg-slate-800 hover:text-slate-100 transition-all disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {checkingIn ? 'Đang điểm danh...' : 'Điểm Danh'}
          </motion.button>

          {isBreakthroughReady ? (
            <motion.button 
              onClick={onBreakthrough}
              disabled={isBreakingThrough}
              className="flex items-center justify-center gap-2 py-4 px-6 bg-gradient-to-br from-amber-700 to-amber-900 border border-amber-500/50 rounded-xl text-amber-100 text-sm font-bold uppercase tracking-wide shadow-[0_0_20px_rgba(245,158,11,0.4)] animate-pulse hover:scale-[1.02] active:scale-95 transition-transform"
              whileHover={{ scale: 1.02 }}
            >
              ĐỘ KIẾP
            </motion.button>
          ) : (
            <button 
              disabled 
              className="flex items-center justify-center gap-2 py-4 px-6 bg-slate-900/50 border border-slate-800 rounded-xl text-slate-600 text-sm font-bold uppercase tracking-wide cursor-not-allowed"
            >
              Bình Cảnh
            </button>
          )}
        </div>

        {/* Streak Info */}
        <div className="text-center text-base text-slate-400">
          <span className="text-amber-400">Streak: {cultivation.loginStreak || 0} ngày</span>
          <span className="mx-3">|</span>
          <span>Kỷ lục: {cultivation.longestStreak || 0} ngày</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-4">
        <StatBox label="Bài viết" value={cultivation.stats?.totalPostsCreated || 0} />
        <StatBox label="Bình luận" value={cultivation.stats?.totalCommentsCreated || 0} />
        <StatBox label="Đã thích" value={cultivation.stats?.totalLikesGiven || 0} />
        <StatBox label="Nhiệm vụ" value={cultivation.stats?.totalQuestsCompleted || 0} />
      </div>

      {/* Active Boosts */}
      {cultivation.activeBoosts?.length > 0 && (
        <div className="spirit-tablet-jade rounded-xl p-5 lg:p-6">
          <h3 className="font-bold text-jade mb-4 font-title tracking-wide text-lg">
            BUFF ĐANG HOẠT ĐỘNG
          </h3>
          <div className="space-y-3">
            {cultivation.activeBoosts.map((boost, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm text-slate-300">
                <span>Tu Luyện x{boost.multiplier}</span>
                <span className="text-cyan-400/70">
                  Hết hạn: {new Date(boost.expiresAt).toLocaleTimeString()}
                </span>
              </div>
            ))}
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
          className={`w-full py-3 px-4 rounded-xl font-bold uppercase tracking-wide transition-all ${
            (passiveExpStatus?.pendingExp || 0) >= 1
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
        <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-2">
          {CULTIVATION_REALMS.map((realm) => {
            const isCurrent = cultivation.realm?.level === realm.level;
            const isUnlocked = cultivation.exp >= realm.minExp;
            
            return (
              <motion.div 
                key={realm.level}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  isCurrent 
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

// ==================== QUEST ITEM COMPONENT ====================
const QuestItem = memo(function QuestItem({ quest, onClaim, claiming }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`spirit-tablet rounded-xl p-4 transition-all ${
        quest.completed && !quest.claimed
          ? 'border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
          : quest.claimed ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-100 font-title text-sm">{quest.name}</span>
          {quest.claimed && (
            <span className="text-[10px] bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded-full">
              Đã nhận
            </span>
          )}
        </div>
        {quest.completed && !quest.claimed && (
          <span className="text-xs bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded-full animate-pulse">
            Hoàn thành!
          </span>
        )}
      </div>
      <p className="text-xs text-slate-400 mb-3">{quest.description}</p>
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <div className="w-full bg-slate-900/80 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full transition-all ${
                quest.completed 
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' 
                  : 'bg-gradient-to-r from-purple-600 to-violet-400'
              }`}
              style={{ width: `${quest.progressPercent || 0}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            {quest.progress || 0} / {quest.requirement?.count || 1}
          </p>
        </div>
        <div className="text-right text-xs flex-shrink-0">
          <div className="text-amber-400">+{quest.expReward || 0} Tu Vi</div>
          {quest.spiritStoneReward > 0 && (
            <div className="text-emerald-400">+{quest.spiritStoneReward} Linh Thạch</div>
          )}
        </div>
        {quest.completed && !quest.claimed && (
          <motion.button
            onClick={() => onClaim(quest.questId)}
            disabled={claiming === quest.questId}
            className="px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-800 border border-amber-500/30 rounded-lg text-amber-100 text-xs font-bold uppercase tracking-wide shadow-lg hover:from-amber-600 hover:to-amber-700 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {claiming === quest.questId ? '...' : 'Nhận'}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
});

// ==================== QUESTS TAB ====================
const QuestsTab = memo(function QuestsTab() {
  const { cultivation, claimReward, loading } = useCultivation();
  const [claiming, setClaiming] = useState(null);

  const handleClaim = async (questId) => {
    setClaiming(questId);
    try {
      await claimReward(questId);
    } finally {
      setClaiming(null);
    }
  };

  if (loading || !cultivation) {
    return <LoadingSkeleton />;
  }

  const dailyQuests = cultivation.dailyQuests || [];
  const weeklyQuests = cultivation.weeklyQuests || [];
  const hasNoQuests = dailyQuests.length === 0 && weeklyQuests.length === 0;

  // Tính tổng phần thưởng có thể nhận
  const pendingRewards = [...dailyQuests, ...weeklyQuests].filter(q => q.completed && !q.claimed);
  const totalPendingExp = pendingRewards.reduce((sum, q) => sum + (q.expReward || 0), 0);
  const totalPendingStones = pendingRewards.reduce((sum, q) => sum + (q.spiritStoneReward || 0), 0);

  return (
    <div className="space-y-6 pb-2">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gold font-title tracking-wide text-xl lg:text-2xl">NHIỆM VỤ TU LUYỆN</h3>
        {pendingRewards.length > 0 && (
          <div className="text-xs bg-amber-500/20 text-amber-300 px-3 py-1.5 rounded-full border border-amber-500/30">
            {pendingRewards.length} nhiệm vụ chờ nhận thưởng
          </div>
        )}
      </div>

      {/* Tổng phần thưởng chờ nhận */}
      {pendingRewards.length > 0 && (
        <div className="spirit-tablet-jade rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Phần thưởng chờ nhận</p>
            <div className="flex items-center gap-4">
              <span className="text-amber-400 font-bold">+{totalPendingExp.toLocaleString()} Tu Vi</span>
              <span className="text-emerald-400 font-bold">+{totalPendingStones.toLocaleString()} Linh Thạch</span>
            </div>
          </div>
        </div>
      )}
      
      {hasNoQuests ? (
        <div className="h-48 flex flex-col items-center justify-center text-slate-500 opacity-50">
          <p className="text-xs uppercase tracking-widest">Chưa có nhiệm vụ</p>
        </div>
      ) : (
        <>
          {/* Nhiệm vụ hàng ngày */}
          {dailyQuests.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"></div>
                <h4 className="text-sm font-bold text-jade uppercase tracking-wider">Nhiệm Vụ Hàng Ngày</h4>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"></div>
              </div>
              {dailyQuests.map((quest) => (
                <QuestItem 
                  key={quest.questId} 
                  quest={quest} 
                  onClaim={handleClaim} 
                  claiming={claiming} 
                />
              ))}
            </div>
          )}

          {/* Nhiệm vụ hàng tuần */}
          {weeklyQuests.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"></div>
                <h4 className="text-sm font-bold text-purple-400 uppercase tracking-wider">Nhiệm Vụ Hàng Tuần</h4>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"></div>
              </div>
              {weeklyQuests.map((quest) => (
                <QuestItem 
                  key={quest.questId} 
                  quest={quest} 
                  onClaim={handleClaim} 
                  claiming={claiming} 
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
});

// ==================== RARITY COLORS ====================
const RARITY_COLORS = {
  common: { bg: 'bg-slate-700/50', border: 'border-slate-600', text: 'text-slate-300', label: 'Thường' },
  uncommon: { bg: 'bg-emerald-900/30', border: 'border-emerald-600/50', text: 'text-emerald-400', label: 'Tinh' },
  rare: { bg: 'bg-blue-900/30', border: 'border-blue-500/50', text: 'text-blue-400', label: 'Hiếm' },
  epic: { bg: 'bg-purple-900/30', border: 'border-purple-500/50', text: 'text-purple-400', label: 'Sử Thi' },
  legendary: { bg: 'bg-amber-900/30', border: 'border-amber-500/50', text: 'text-amber-400', label: 'Huyền Thoại' }
};

const ITEM_TYPE_LABELS = {
  title: { label: ' Danh Hiệu', color: 'text-amber-300' },
  badge: { label: ' Huy Hiệu', color: 'text-cyan-300' },
  avatar_frame: { label: ' Khung Avatar', color: 'text-purple-300' },
  profile_effect: { label: ' Hiệu Ứng', color: 'text-pink-300' },
  exp_boost: { label: ' Đan Dược', color: 'text-green-300' },
  consumable: { label: ' Vật Phẩm', color: 'text-orange-300' },
  pet: { label: ' Linh Thú', color: 'text-rose-300' },
  mount: { label: ' Tọa Kỵ', color: 'text-yellow-300' }
};

// ==================== SHOP TAB ====================
const ShopTab = memo(function ShopTab() {
  const { shop, loadShop, purchaseItem, loading } = useCultivation();
  const [buying, setBuying] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    loadShop();
  }, [loadShop]);

  const handleBuy = async (itemId) => {
    setBuying(itemId);
    try {
      await purchaseItem(itemId);
    } finally {
      setBuying(null);
    }
  };

  if (loading || !shop) {
    return <LoadingSkeleton />;
  }

  // Group items by type
  const categories = [
    { id: 'all', label: 'Tất cả', icon: '' },
    { id: 'title', label: 'Danh Hiệu', icon: '' },
    { id: 'badge', label: 'Huy Hiệu', icon: '' },
    { id: 'avatar_frame', label: 'Khung Avatar', icon: '' },
    { id: 'profile_effect', label: 'Hiệu Ứng', icon: '' },
    { id: 'exp_boost', label: 'Đan Dược', icon: '' },
    { id: 'consumable', label: 'Vật Phẩm', icon: '' },
    { id: 'pet', label: 'Linh Thú', icon: '' },
    { id: 'mount', label: 'Tọa Kỵ', icon: '' }
  ];

  const filteredItems = activeCategory === 'all' 
    ? shop.items 
    : shop.items?.filter(item => item.type === activeCategory);

  return (
    <div className="space-y-3 pb-2">
      <h3 className="font-bold text-gold font-title tracking-wide text-xl lg:text-2xl">VẠN BẢO CÁC</h3>
      
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 pb-2">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeCategory === cat.id
                ? 'bg-amber-600/30 border border-amber-500/50 text-amber-300'
                : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-slate-300'
            }`}
          >
            <span className="mr-1">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>
      
      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredItems?.map((item) => {
          const rarity = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;
          return (
            <div 
              key={item.id} 
              className={`rounded-xl p-4 flex justify-between items-center group transition-all border ${rarity.bg} ${rarity.border} hover:scale-[1.02]`}
            >
              <div className="flex items-start gap-3 flex-1 mr-3">
                <span className="text-2xl">{item.icon || '📦'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className={`font-bold text-sm group-hover:text-amber-400 transition-colors ${rarity.text}`}>
                      {item.name}
                    </h4>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${rarity.bg} ${rarity.text} border ${rarity.border}`}>
                      {rarity.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-tight">{item.description}</p>
                </div>
              </div>
              <button 
                onClick={() => handleBuy(item.id)}
                disabled={buying === item.id || !item.canAfford || item.owned}
                className={`flex flex-col items-center justify-center border rounded-lg px-4 py-2 min-w-[85px] transition-all ${
                  item.owned 
                    ? 'bg-slate-800 border-slate-600 text-slate-500 cursor-not-allowed'
                    : item.canAfford 
                      ? 'bg-gradient-to-b from-amber-600/30 to-amber-800/30 hover:from-amber-500/40 hover:to-amber-700/40 border-amber-500/50' 
                      : 'bg-slate-900 border-slate-700 opacity-50 cursor-not-allowed'
                }`}
              >
                <span className="text-amber-400 font-mono text-sm font-bold flex items-center gap-1">
                  💎 {item.price}
                </span>
                <span className="text-[10px] text-slate-300 uppercase mt-1">
                  {item.owned ? '✓ Đã có' : buying === item.id ? '...' : 'Mua'}
                </span>
              </button>
            </div>
          );
        })}
      </div>
      
      {filteredItems?.length === 0 && (
        <div className="h-48 flex flex-col items-center justify-center text-slate-500">
          <p className="text-xs uppercase tracking-widest">Không có vật phẩm</p>
        </div>
      )}
    </div>
  );
});

// ==================== INVENTORY TAB ====================
const InventoryTab = memo(function InventoryTab() {
  const { cultivation, equip, unequip, useItem, loading } = useCultivation();
  const [equipping, setEquipping] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');

  const handleEquip = async (itemId, isEquipped) => {
    setEquipping(itemId);
    try {
      if (isEquipped) {
        await unequip(itemId);
      } else {
        await equip(itemId);
      }
    } finally {
      setEquipping(null);
    }
  };

  const handleUse = async (itemId) => {
    setEquipping(itemId);
    try {
      if (useItem) {
        await useItem(itemId);
      }
    } finally {
      setEquipping(null);
    }
  };

  if (loading || !cultivation) {
    return <LoadingSkeleton />;
  }

  const inventory = cultivation.inventory || [];
  const equipped = cultivation.equipped || {};
  
  // Group items by type
  const categories = [
    { id: 'all', label: 'Tất cả', icon: '' },
    { id: 'title', label: 'Danh Hiệu', icon: '' },
    { id: 'badge', label: 'Huy Hiệu', icon: '' },
    { id: 'avatar_frame', label: 'Khung Avatar', icon: '' },
    { id: 'profile_effect', label: 'Hiệu Ứng', icon: '' },
    { id: 'exp_boost', label: 'Đan Dược', icon: '' },
    { id: 'consumable', label: 'Vật Phẩm', icon: '' },
    { id: 'pet', label: 'Linh Thú', icon: '' },
    { id: 'mount', label: 'Tọa Kỵ', icon: '' }
  ];

  const filteredItems = activeCategory === 'all' 
    ? inventory 
    : inventory.filter(item => item.type === activeCategory);

  // Check if item is equipped
  const isItemEquipped = (item) => {
    if (item.type === 'title') return equipped.title === item.itemId;
    if (item.type === 'badge') return equipped.badge === item.itemId;
    if (item.type === 'avatar_frame') return equipped.avatarFrame === item.itemId;
    if (item.type === 'profile_effect') return equipped.profileEffect === item.itemId;
    return item.equipped;
  };

  // Check if item is consumable (can be used)
  const isConsumable = (type) => ['exp_boost', 'consumable'].includes(type);

  return (
    <div className="space-y-3 pb-2">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gold font-title tracking-wide text-xl lg:text-2xl">TÚI ĐỒ</h3>
        <span className="text-sm text-slate-400">
          {inventory.length} vật phẩm
        </span>
      </div>
      
      {/* Equipped Items Summary */}
      {(equipped.title || equipped.badge || equipped.avatarFrame || equipped.profileEffect) && (
        <div className="bg-gradient-to-r from-emerald-900/20 to-teal-900/20 border border-emerald-500/30 rounded-xl p-3">
          <p className="text-xs text-emerald-400 mb-2 uppercase tracking-wider">Đang trang bị</p>
          <div className="flex flex-wrap gap-2">
            {equipped.title && (
              <span className="px-2 py-1 bg-amber-900/30 border border-amber-500/30 rounded text-xs text-amber-300">
                 {inventory.find(i => i.itemId === equipped.title)?.name || equipped.title}
              </span>
            )}
            {equipped.badge && (
              <span className="px-2 py-1 bg-cyan-900/30 border border-cyan-500/30 rounded text-xs text-cyan-300">
                 {inventory.find(i => i.itemId === equipped.badge)?.name || equipped.badge}
              </span>
            )}
            {equipped.avatarFrame && (
              <span className="px-2 py-1 bg-purple-900/30 border border-purple-500/30 rounded text-xs text-purple-300">
                 {inventory.find(i => i.itemId === equipped.avatarFrame)?.name || equipped.avatarFrame}
              </span>
            )}
            {equipped.profileEffect && (
              <span className="px-2 py-1 bg-pink-900/30 border border-pink-500/30 rounded text-xs text-pink-300">
                 {inventory.find(i => i.itemId === equipped.profileEffect)?.name || equipped.profileEffect}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 pb-2">
        {categories.map(cat => {
          const count = cat.id === 'all' ? inventory.length : inventory.filter(i => i.type === cat.id).length;
          if (count === 0 && cat.id !== 'all') return null;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeCategory === cat.id
                  ? 'bg-emerald-600/30 border border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-slate-300'
              }`}
            >
              <span className="mr-1">{cat.icon}</span>
              {cat.label}
              {count > 0 && <span className="ml-1 opacity-60">({count})</span>}
            </button>
          );
        })}
      </div>
      
      {filteredItems.length === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center text-slate-500 opacity-50">
          <span className="text-4xl mb-2"></span>
          <p className="text-xs uppercase tracking-widest">
            {activeCategory === 'all' ? 'Túi trống rỗng' : 'Không có vật phẩm loại này'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredItems.map((item) => {
            const rarity = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;
            const typeInfo = ITEM_TYPE_LABELS[item.type] || { label: '📦 Khác', color: 'text-slate-300' };
            const equipped = isItemEquipped(item);
            const consumable = isConsumable(item.type);
            
            return (
              <div 
                key={item.itemId} 
                className={`rounded-xl p-4 flex justify-between items-center transition-all border ${
                  equipped 
                    ? 'bg-emerald-900/30 border-emerald-500/50 ring-1 ring-emerald-500/30' 
                    : `${rarity.bg} ${rarity.border}`
                } hover:scale-[1.02]`}
              >
                <div className="flex items-start gap-3 flex-1 mr-3">
                  <div className="relative">
                    <span className="text-2xl">{item.icon || '📦'}</span>
                    {equipped && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center text-[8px]">✓</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className={`font-bold text-sm ${equipped ? 'text-emerald-300' : rarity.text}`}>
                        {item.name}
                      </h4>
                      <span className="bg-slate-700/50 text-slate-300 text-[10px] px-1.5 py-0.5 rounded font-mono">
                        x{item.quantity || 1}
                      </span>
                      {equipped && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Đang dùng
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-tight">{item.description}</p>
                    <p className={`text-[10px] mt-1 ${typeInfo.color}`}>{typeInfo.label}</p>
                  </div>
                </div>
                <motion.button 
                  onClick={() => consumable ? handleUse(item.itemId) : handleEquip(item.itemId, equipped)}
                  disabled={equipping === item.itemId}
                  className={`rounded-lg px-4 py-2 text-xs font-bold uppercase transition-all min-w-[70px] ${
                    consumable
                      ? 'bg-orange-900/30 hover:bg-orange-800/50 border border-orange-500/30 text-orange-300'
                      : equipped
                        ? 'bg-red-900/30 hover:bg-red-800/50 border border-red-500/30 text-red-300'
                        : 'bg-emerald-900/30 hover:bg-emerald-800/50 border border-emerald-500/30 text-emerald-300'
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  {equipping === item.itemId ? '...' : consumable ? 'Dùng' : equipped ? 'Tháo' : 'Trang bị'}
                </motion.button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

// ==================== LEADERBOARD TAB ====================
const LeaderboardTab = memo(function LeaderboardTab() {
  const { leaderboard, loadLeaderboard, loading } = useCultivation();

  useEffect(() => {
    loadLeaderboard('exp', 20);
  }, [loadLeaderboard]);

  if (loading || !leaderboard) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-3 pb-2">
      <h3 className="font-bold text-gold font-title tracking-wide text-xl lg:text-2xl">BẢNG XẾP HẠNG</h3>
      
      {leaderboard.leaderboard?.map((entry, idx) => (
        <motion.div
          key={entry.user?._id || idx}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.03 }}
          className={`spirit-tablet rounded-lg p-3 flex items-center gap-3 ${
            entry.isCurrentUser ? 'border-amber-500/50 bg-amber-900/20' : ''
          }`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
            idx === 0 ? 'bg-amber-500 text-black' :
            idx === 1 ? 'bg-slate-400 text-black' :
            idx === 2 ? 'bg-amber-700 text-white' :
            'bg-slate-700 text-slate-300'
          }`}>
            {idx + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-slate-100 truncate">
              {entry.user?.name || 'Tu sĩ ẩn danh'}
            </p>
            <p className="text-xs text-slate-500">
              {entry.realm?.name} • {entry.exp?.toLocaleString()} Tu Vi
            </p>
          </div>
          {entry.isCurrentUser && (
            <span className="text-xs text-amber-400 font-bold">← Bạn</span>
          )}
        </motion.div>
      ))}
    </div>
  );
});

// ==================== MAIN CULTIVATION CONTENT ====================
const CultivationContent = memo(function CultivationContent() {
  const { cultivation, checkIn, loading, addExp, collectPassiveExp, loadPassiveExpStatus, notification, clearNotification } = useCultivation();
  
  // States
  const [activeTab, setActiveTab] = useState('dashboard');
  const [logs, setLogs] = useState([{ id: 0, text: "-- Bắt đầu bước vào con đường tu tiên --", type: 'normal' }]);
  const [particles, setParticles] = useState([]);
  const [clickCooldown, setClickCooldown] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  
  // Passive Exp States
  const [passiveExpStatus, setPassiveExpStatus] = useState({ pendingExp: 0, multiplier: 1, minutesElapsed: 0 });
  const [collectingPassiveExp, setCollectingPassiveExp] = useState(false);
  
  // Breakthrough States
  const [isShaking, setIsShaking] = useState(false);
  const [flashOpacity, setFlashOpacity] = useState(0);
  const [isBreakingThrough, setIsBreakingThrough] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMsg, setModalMsg] = useState("");
  const [logExpanded, setLogExpanded] = useState(false);
  
  // Refs
  const logEndRef = useRef(null);

  // Load passive exp status
  useEffect(() => {
    const fetchPassiveStatus = async () => {
      try {
        const status = await loadPassiveExpStatus();
        if (status) {
          setPassiveExpStatus(status);
        }
      } catch (err) {
        console.error('[Cultivation] Error loading passive exp status:', err);
      }
    };

    fetchPassiveStatus();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchPassiveStatus, 30000);
    return () => clearInterval(interval);
  }, [loadPassiveExpStatus]);

  // Auto-scroll logs - chỉ scroll trong container log, không scroll page
  useEffect(() => {
    if (logExpanded && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [logs, logExpanded]);

  // Show notification from context
  useEffect(() => {
    if (notification) {
      if (notification.levelUp) {
        triggerBreakthroughEffect(notification.newRealm?.name || "Cảnh giới mới");
      }
      addLog(notification.message, notification.type === 'success' ? 'success' : notification.type === 'error' ? 'danger' : 'normal');
      clearNotification();
    }
  }, [notification, clearNotification]);

  // Helpers
  const addLog = (text, type = 'normal') => {
    setLogs(prev => [...prev.slice(-29), { id: Date.now() + Math.random(), text, type }]);
  };

  const spawnParticle = (x, y, text, color = 'cyan') => {
    const id = Date.now() + Math.random();
    setParticles(prev => [...prev, { id, x, y, text, color }]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== id));
    }, 2000);
  };

  // Breakthrough effect with lightning
  const triggerBreakthroughEffect = (realmName) => {
    setIsBreakingThrough(true);
    addLog("⚡ BẮT ĐẦU ĐỘ KIẾP!", 'danger');
    addLog("Thiên lôi đang tụ lại...", 'danger');
    setIsShaking(true);

    let count = 0;
    const flashInterval = setInterval(() => {
      setFlashOpacity(Math.random() > 0.5 ? 0.8 : 0);
      count++;
      if (count > 10) {
        clearInterval(flashInterval);
        setFlashOpacity(0);
        setIsShaking(false);
        setIsBreakingThrough(false);
        
        setModalMsg(`Thiên địa chúc phúc! Đạo hữu đã bước chân vào cảnh giới ${realmName}!`);
        setModalOpen(true);
        addLog(`ĐỘT PHÁ THÀNH CÔNG! Đạt ${realmName}!`, 'success');
      }
    }, 100);
  };

  // Handle yin-yang click for exp gain
  const handleYinYangClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (clickCooldown || checkingIn || isBreakingThrough) return;
    
    setClickCooldown(true);
    const expGain = Math.floor(Math.random() * 5) + 1;
    
    const rect = e.currentTarget.getBoundingClientRect();
    spawnParticle(rect.left + rect.width / 2, rect.top, `+${expGain} Linh Khí`, 'cyan');
    
    if (Math.random() < 0.1) {
      const stoneDrop = Math.floor(Math.random() * 3) + 1;
      setTimeout(() => {
        spawnParticle(rect.left + rect.width / 2, rect.top - 30, `+${stoneDrop} Linh Thạch`, 'gold');
      }, 200);
      addLog(`Nhặt được ${stoneDrop} Linh Thạch!`, 'gain');
    }
    
    try {
      await addExp(expGain, 'yinyang_click');
      
      if (Math.random() < 0.2) {
        addLog(LOG_MESSAGES[Math.floor(Math.random() * LOG_MESSAGES.length)]);
      }
    } catch (err) {
      if (err.message?.includes('cạn kiệt')) {
        addLog(`Linh khí đã cạn kiệt, hãy chờ một lát...`, 'danger');
      } else {
        addLog(` ${err.message}`, 'danger');
      }
    }
    
    setTimeout(() => setClickCooldown(false), 500);
  };

  const handleCheckIn = async () => {
    if (checkingIn || isBreakingThrough) return;
    
    setCheckingIn(true);
    addLog('Đang điểm danh tu luyện...');
    
    try {
      await checkIn();
    } catch (err) {
      addLog(`Điểm danh thất bại: ${err.message}`, 'danger');
    } finally {
      setCheckingIn(false);
    }
  };

  // Handle collect passive exp
  const handleCollectPassiveExp = async () => {
    if (collectingPassiveExp || isBreakingThrough) return;
    
    setCollectingPassiveExp(true);
    addLog('Đang thu thập tu vi tích lũy...');
    
    try {
      const result = await collectPassiveExp();
      
      if (result?.collected) {
        const { expEarned, multiplier, minutesElapsed } = result;
        addLog(
          multiplier > 1 
            ? `Thu thập ${expEarned} Tu Vi (x${multiplier} đan dược, ${minutesElapsed} phút)`
            : `Thu thập ${expEarned} Tu Vi (${minutesElapsed} phút tu luyện)`,
          'gain'
        );
        
        // Reset passive exp status
        setPassiveExpStatus({ pendingExp: 0, multiplier: 1, minutesElapsed: 0, baseExp: 0 });
      } else if (result?.nextCollectIn) {
        addLog(`Chưa đủ thời gian. Chờ thêm ${result.nextCollectIn}s`, 'normal');
      }
    } catch (err) {
      addLog(`Thu thập thất bại: ${err.message}`, 'danger');
    } finally {
      setCollectingPassiveExp(false);
    }
  };

  if (loading || !cultivation) {
    return (
      <div className="min-h-screen bg-[#050511] flex items-center justify-center">
        <CustomStyles />
        <LoadingSkeleton />
      </div>
    );
  }

  const currentRealm = CULTIVATION_REALMS.find(r => r.level === cultivation.realm?.level) || CULTIVATION_REALMS[0];
  const nextRealm = CULTIVATION_REALMS.find(r => r.level === (cultivation.realm?.level || 0) + 1);
  const progressPercent = nextRealm 
    ? Math.min(((cultivation.exp - currentRealm.minExp) / (nextRealm.minExp - currentRealm.minExp)) * 100, 100)
    : 100;
  const isBreakthroughReady = progressPercent >= 100 && nextRealm;

  const tabs = [
    { id: 'dashboard', label: 'Tổng Quan' },
    { id: 'quests', label: 'Nhiệm Vụ' },
    { id: 'shop', label: 'Cửa Hàng' },
    { id: 'inventory', label: 'Túi Đồ' },
    { id: 'leaderboard', label: 'Xếp Hạng' }
  ];

  return (
    <div className={`min-h-screen bg-[#050511] font-cultivation text-slate-200 overflow-x-hidden relative select-none ${isShaking ? 'shake' : ''}`}>
      <CustomStyles />
      
      {/* Background */}
      <div className="fixed inset-0 -z-30 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#2e1065] via-[#0b051d] to-[#000000]"></div>
      <div className="fixed inset-0 -z-20 stars opacity-40"></div>
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="mist w-[600px] h-[600px] top-[-100px] left-[-100px]"></div>
        <div className="mist mist-2 w-[500px] h-[500px] bottom-[-50px] right-[-100px]"></div>
        <div className="mist mist-3 w-[400px] h-[400px] top-[30%] right-[10%]"></div>
      </div>
      
      {/* Lightning Flash Overlay */}
      <div 
        className="fixed inset-0 bg-white pointer-events-none z-50 transition-opacity duration-100 mix-blend-overlay" 
        style={{ opacity: flashOpacity }}
      ></div>

      {/* Main Content */}
      <div className="relative z-10 w-full px-4 md:px-8 lg:px-12 py-6">
        {/* Back Button & Header */}
        <div className="flex items-center justify-between mb-6">
          <Link 
            to="/"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-amber-400 transition-colors text-sm"
          >
            <span>←</span>
            <span>Trở về</span>
          </Link>
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-title text-transparent bg-clip-text bg-gradient-to-b from-amber-200 to-amber-600 tracking-[0.15em] drop-shadow-sm">
            THIÊN ĐẠO CÁC
          </h1>
          
          <div className="w-16"></div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex justify-center gap-3 mb-8 flex-wrap">
          {tabs.map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 rounded-xl text-sm font-bold uppercase tracking-wide transition-all ${
                activeTab === tab.id 
                  ? 'bg-purple-900/50 text-purple-300 border border-purple-500/50' 
                  : 'bg-slate-800/30 text-slate-500 border border-slate-700/30 hover:text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[60vh]">
          {activeTab === 'dashboard' && (
            <DashboardTab 
              cultivation={cultivation}
              currentRealm={currentRealm}
              nextRealm={nextRealm}
              progressPercent={progressPercent}
              isBreakthroughReady={isBreakthroughReady}
              onYinYangClick={handleYinYangClick}
              onCheckIn={handleCheckIn}
              onBreakthrough={() => triggerBreakthroughEffect(nextRealm?.name || "Cảnh giới mới")}
              onCollectPassiveExp={handleCollectPassiveExp}
              passiveExpStatus={passiveExpStatus}
              collectingPassiveExp={collectingPassiveExp}
              checkingIn={checkingIn}
              clickCooldown={clickCooldown}
              isBreakingThrough={isBreakingThrough}
              particles={particles}
              logs={logs}
              logExpanded={logExpanded}
              setLogExpanded={setLogExpanded}
              logEndRef={logEndRef}
            />
          )}
          {activeTab === 'quests' && <QuestsTab />}
          {activeTab === 'shop' && <ShopTab />}
          {activeTab === 'inventory' && <InventoryTab />}
          {activeTab === 'leaderboard' && <LeaderboardTab />}
        </div>
      </div>

      {/* Breakthrough Success Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="relative bg-[#0f172a] border-y-2 border-amber-600 p-8 max-w-sm text-center shadow-[0_0_100px_rgba(217,119,6,0.3)]"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-[#0f172a] border-2 border-amber-600 rotate-45 flex items-center justify-center z-10">
                <span className="text-xl font-bold text-amber-500 -rotate-45">✓</span>
              </div>
              <h3 className="text-2xl font-bold text-amber-500 mb-4 font-title mt-4 tracking-wider">ĐỘ KIẾP THÀNH CÔNG</h3>
              <p className="text-slate-300 mb-8 font-serif text-sm leading-relaxed">{modalMsg}</p>
              <motion.button 
                onClick={() => setModalOpen(false)} 
                className="px-8 py-3 bg-gradient-to-r from-amber-800 to-amber-700 hover:from-amber-700 hover:to-amber-600 text-amber-100 rounded-lg border border-amber-600 font-bold uppercase text-xs tracking-wider shadow-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Tiếp tục tu luyện
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ==================== MAIN PAGE ====================
export default function CultivationPage() {
  return (
    <CultivationProvider>
      <CultivationContent />
    </CultivationProvider>
  );
}
