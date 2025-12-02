/**
 * Cultivation Page - Trang Tu Tiên chính
 * Giao diện Vũ Trụ Hư Không với hiệu ứng sấm sét khi đột phá
 */

import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  MoreVertical, X, GitCompare, Sword, Shield, Zap, Flame, Droplet, Wind, BookOpen,
  Scroll, Medal, Frame, Sparkles, Pill, Package, PawPrint, Bird, CircleDot, Feather, Ghost, Crown, Gem,
  Mountain, Wand2, Skull, FlaskConical, Cloud, Moon, Snowflake, Sun, Tornado, Coins, Clover, RefreshCw,
  Cat, Rabbit, Flower2, Ticket, Key
} from 'lucide-react';
import { CultivationProvider, useCultivation } from '../hooks/useCultivation.jsx';
import { CULTIVATION_REALMS, formatNumber } from '../services/cultivationAPI.js';
import { getCSRFToken } from '../utils/csrfToken.js';
import { api } from '../api';
import { getUserAvatarUrl } from '../utils/avatarUtils.js';
import { loadUser } from '../utils/userCache.js';

// ==================== GET COMBAT STATS ====================
/**
 * Lấy thông số chiến đấu từ cultivation data (từ API)
 * Ưu tiên dùng từ BE, fallback về giá trị mặc định nếu chưa có
 */
function getCombatStats(cultivation) {
  // Ưu tiên dùng từ API (server-side calculated)
  if (cultivation?.combatStats) {
    return cultivation.combatStats;
  }

  // Fallback: giá trị mặc định (chỉ khi BE chưa trả về)
  return {
    attack: 0,
    defense: 0,
    qiBlood: 0,
    zhenYuan: 0,
    speed: 0,
    criticalRate: 0,
    criticalDamage: 150,
    accuracy: 80,
    dodge: 0,
    penetration: 0,
    resistance: 0,
    lifesteal: 0,
    regeneration: 1,
    luck: 5
  };
}

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

    /* Battle Shake Animation */
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
      20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    .animate-shake {
      animation: shake 0.3s ease-in-out;
    }

    /* Sword Slash Effect */
    @keyframes slashRight {
      0% { transform: translateX(-50px) rotate(-60deg) scale(0.5); opacity: 0; }
      50% { transform: translateX(0) rotate(15deg) scale(1.2); opacity: 1; }
      100% { transform: translateX(50px) rotate(30deg) scale(0.8); opacity: 0; }
    }
    @keyframes slashLeft {
      0% { transform: translateX(50px) rotate(60deg) scale(0.5); opacity: 0; }
      50% { transform: translateX(0) rotate(-15deg) scale(1.2); opacity: 1; }
      100% { transform: translateX(-50px) rotate(-30deg) scale(0.8); opacity: 0; }
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

// ==================== IDENTITY HEADER ====================
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
    <div className="flex items-center gap-4 border-b border-white/5 pb-4 mb-4 relative">
      {/* Avatar */}
      <div className="relative">
        <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-slate-800 border-2 border-amber-500/50 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.2)] overflow-hidden">
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-3xl lg:text-4xl">{currentRealm?.icon || '👤'}</span>
          )}
        </div>
        <div className="absolute -bottom-1 -right-1 bg-slate-950 border border-amber-500 text-[9px] lg:text-[10px] text-amber-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shadow-sm">
          Lv.{currentRealm?.level || 1}
        </div>
      </div>

      {/* Tên & Cảnh Giới */}
      <div className="flex-1">
        <h3 className="text-lg lg:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-100 to-amber-300 font-title tracking-wide mb-1">
          {displayName}
        </h3>
        <p className="text-xs lg:text-sm text-slate-400 font-cultivation italic flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          {currentRealm?.name || 'Phàm Nhân'}
        </p>
      </div>

      {/* Thông Số Tu Vi & Linh Thạch - Bên phải, không có ô */}
      <div className="flex flex-col gap-2 text-right">
        <div className="flex items-center gap-2 justify-end">
          <p className="text-xs text-emerald-300/70 uppercase tracking-widest">Tu Vi:</p>
          <h3 className="text-base lg:text-lg font-bold text-emerald-100 font-mono">
            {cultivation.exp?.toLocaleString() || 0}
          </h3>
        </div>
        <div className="flex items-center gap-2 justify-end">
          <p className="text-xs text-amber-300/70 uppercase tracking-widest">Linh Thạch:</p>
          <h3 className="text-base lg:text-lg font-bold text-amber-100 font-mono">
            {cultivation.spiritStones?.toLocaleString() || 0}
          </h3>
        </div>
      </div>

      {/* Nút Menu Chi Tiết */}
      <div className="relative stats-details-menu">
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
              <div className="p-3 space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                {/* Advanced Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tốc Độ:</span>
                    <span className="text-cyan-300 font-mono font-bold">{stats.speed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Chí Mạng:</span>
                    <span className="text-purple-300 font-mono font-bold">{stats.criticalRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sát Thương Chí Mạng:</span>
                    <span className="text-red-300 font-mono font-bold">{stats.criticalDamage}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Chính Xác:</span>
                    <span className="text-blue-300 font-mono font-bold">{stats.accuracy}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Né Tránh:</span>
                    <span className="text-green-300 font-mono font-bold">{stats.dodge}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Xuyên Thấu:</span>
                    <span className="text-orange-300 font-mono font-bold">{stats.penetration}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Kháng Cự:</span>
                    <span className="text-yellow-300 font-mono font-bold">{stats.resistance}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Hấp Huyết:</span>
                    <span className="text-pink-300 font-mono font-bold">{stats.lifesteal}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Hồi Phục:</span>
                    <span className="text-teal-300 font-mono font-bold">{stats.regeneration}/s</span>
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

        {/* Ngọc Giản Định Danh - Thông Số Chiến Đấu */}
        <div className="relative mb-6">
          {/* Background với gradient và viền ánh kim */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-[#1e293b]/80 to-slate-900/80 rounded-xl border border-amber-500/30 shadow-[0_0_15px_rgba(0,0,0,0.5)]"></div>

          {/* Họa tiết viền rồng/mây - Decorative Corners */}
          <div className="absolute -top-[1px] -left-[1px] w-4 h-4 border-t-2 border-l-2 border-amber-500 rounded-tl-lg"></div>
          <div className="absolute -top-[1px] -right-[1px] w-4 h-4 border-t-2 border-r-2 border-amber-500 rounded-tr-lg"></div>
          <div className="absolute -bottom-[1px] -left-[1px] w-4 h-4 border-b-2 border-l-2 border-amber-500 rounded-bl-lg"></div>
          <div className="absolute -bottom-[1px] -right-[1px] w-4 h-4 border-b-2 border-r-2 border-amber-500 rounded-br-lg"></div>

          {/* Hiệu ứng ánh kim trên nền */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-amber-500/5 rounded-xl pointer-events-none"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.1),transparent_70%)] rounded-xl pointer-events-none"></div>

          <div className="relative p-4 lg:p-5">
            {/* Header */}
            <div className="text-center mb-4">
              <h3 className="text-sm lg:text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-400 font-title tracking-wider mb-2">
                NGỌC GIẢN ĐỊNH DANH
              </h3>
              <div className="h-[1px] w-32 mx-auto bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>
          </div>
          
            {/* Avatar & Tên Người Dùng */}
            <IdentityHeader cultivation={cultivation} currentRealm={currentRealm} />

            {/* Thông Số Chiến Đấu - Grid 2x2 */}
            <div className="grid grid-cols-2 gap-3 lg:gap-4">
              {/* Tấn Công */}
              <div className="bg-black/40 border border-red-500/20 p-3 lg:p-4 rounded-xl text-center group/stat hover:border-red-500/40 transition-all">
                <p className="text-xs text-red-300/70 uppercase tracking-widest mb-2">Tấn Công</p>
                <h3 className="text-lg lg:text-xl font-bold text-red-100 font-mono">
                  {getCombatStats(cultivation).attack.toLocaleString()}
                </h3>
          </div>
          
              {/* Phòng Thủ */}
              <div className="bg-black/40 border border-blue-500/20 p-3 lg:p-4 rounded-xl text-center group/stat hover:border-blue-500/40 transition-all">
                <p className="text-xs text-blue-300/70 uppercase tracking-widest mb-2">Phòng Thủ</p>
                <h3 className="text-lg lg:text-xl font-bold text-blue-100 font-mono">
                  {getCombatStats(cultivation).defense.toLocaleString()}
                </h3>
              </div>

              {/* Khí Huyết */}
              <div className="bg-black/40 border border-pink-500/20 p-3 lg:p-4 rounded-xl text-center group/stat hover:border-pink-500/40 transition-all">
                <p className="text-xs text-pink-300/70 uppercase tracking-widest mb-2">Khí Huyết</p>
                <h3 className="text-lg lg:text-xl font-bold text-pink-100 font-mono">
                  {getCombatStats(cultivation).qiBlood.toLocaleString()}
                </h3>
              </div>

              {/* Chân Nguyên */}
              <div className="bg-black/40 border border-purple-500/20 p-3 lg:p-4 rounded-xl text-center group/stat hover:border-purple-500/40 transition-all">
                <p className="text-xs text-purple-300/70 uppercase tracking-widest mb-2">Chân Nguyên</p>
                <h3 className="text-lg lg:text-xl font-bold text-purple-100 font-mono">
                  {getCombatStats(cultivation).zhenYuan.toLocaleString()}
                </h3>
              </div>
            </div>
          </div>
        </div>

        {/* Yin Yang Click for Tu Vi */}
        <div className="flex flex-col items-center justify-center py-12 lg:py-12">
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
                opacity: clickCooldown ? 0.1 : 1,
                outline: 'none'
              }}
            />
          </div>
          <p className="mt-4 text-slate-400/80 text-xs uppercase tracking-wider animate-pulse text-center">
            Hấp thu thiên địa linh khí <br />
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
        <div className="mb-6">
          <div className="flex justify-between text-xs text-slate-500 mb-3 uppercase tracking-wider font-semibold">
            <span>Tiến độ đột phá</span>
            <span className="font-mono">
              {cultivation.exp?.toLocaleString()} / {nextRealm?.minExp?.toLocaleString() || '∞'}
            </span>
          </div>
          <div className="w-full bg-slate-900/80 rounded-full h-4 lg:h-5 border border-slate-700/50 relative overflow-hidden shadow-inner">
            <motion.div 
              className={`absolute top-0 left-0 h-full transition-all duration-500 ease-out ${isBreakthroughReady
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
        <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-2">
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

// ==================== QUEST ITEM COMPONENT ====================
const QuestItem = memo(function QuestItem({ quest, onClaim, claiming }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`spirit-tablet rounded-xl p-4 transition-all ${quest.completed && !quest.claimed
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
              className={`h-full transition-all ${quest.completed
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

// ==================== ICON MAPS ====================
const TECHNIQUE_ICON_MAP = {
  technique_basic_qi: CircleDot,
  technique_sword_heart: Sword,
  technique_iron_body: Shield,
  technique_lightning_step: Zap,
  technique_dragon_breath: Flame,
  technique_phoenix_rebirth: Feather,
  technique_void_walk: Ghost,
  technique_blood_drain: Droplet
};

const SHOP_ICON_MAP = {
  // Titles & badges
  title: Scroll,
  badge: Medal,
  avatar_frame: Frame,
  profile_effect: Sparkles,
  exp_boost: Pill,
  consumable: Package,
  pet: PawPrint,
  mount: Bird,
  technique: BookOpen
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

const getItemIcon = (item) => {
  // Check by specific ID first
  if (item.type === 'technique' && TECHNIQUE_ICON_MAP[item.itemId || item.id]) {
    return TECHNIQUE_ICON_MAP[item.itemId || item.id];
  }
  
  // Check by name (case insensitive partial match)
  const name = (item.name || '').toLowerCase();
  
  // Weapons & Combat
  if (name.includes('kiếm')) return Sword;
  if (name.includes('đao')) return Sword;
  if (name.includes('giáp') || name.includes('áo')) return Shield;
  if (name.includes('hộ mệnh')) return Shield;
  
  // Elements
  if (name.includes('lôi') || name.includes('sấm') || name.includes('điện')) return Zap;
  if (name.includes('hỏa') || name.includes('lửa') || name.includes('viêm') || name.includes('nhiệt')) return Flame;
  if (name.includes('thủy') || name.includes('nước') || name.includes('băng') || name.includes('tuyết')) return Snowflake;
  if (name.includes('phong') || name.includes('gió')) return Wind;
  if (name.includes('thổ') || name.includes('đất') || name.includes('địa')) return Mountain;
  if (name.includes('mộc') || name.includes('cây') || name.includes('hoa') || name.includes('liên')) return Flower2;
  if (name.includes('kim') || name.includes('vàng')) return Coins;
  
  // Celestial / Mystical
  if (name.includes('nhật') || name.includes('dương') || name.includes('mặt trời')) return Sun;
  if (name.includes('nguyệt') || name.includes('trăng') || name.includes('âm')) return Moon;
  if (name.includes('tinh') || name.includes('sao')) return Sparkles;
  if (name.includes('thiên') || name.includes('trời') || name.includes('vân') || name.includes('mây')) return Cloud;
  if (name.includes('hư không') || name.includes('không gian')) return Tornado;
  if (name.includes('hỗn độn')) return Ghost;
  if (name.includes('tiên') || name.includes('thần')) return Crown;
  if (name.includes('ma') || name.includes('quỷ') || name.includes('diệt')) return Skull;
  
  // Items
  if (name.includes('đan') || name.includes('thuốc')) return Pill;
  if (name.includes('thư') || name.includes('bí kíp') || name.includes('quyển') || name.includes('pháp')) return BookOpen;
  if (name.includes('lệnh') || name.includes('bài')) return Ticket;
  if (name.includes('nhẫn')) return CircleDot;
  if (name.includes('ngọc') || name.includes('đá')) return Gem;
  if (name.includes('bùa') || name.includes('phù')) return Scroll;
  if (name.includes('hương')) return Flame;
  if (name.includes('túi')) return Package;
  if (name.includes('chìa')) return Key;
  
  // Creatures
  if (name.includes('long') || name.includes('rồng')) return Flame; // Dragon fallback
  if (name.includes('phượng') || name.includes('chim') || name.includes('hạc') || name.includes('điểu')) return Bird;
  if (name.includes('hổ') || name.includes('mèo') || name.includes('miêu')) return Cat;
  if (name.includes('thố') || name.includes('thỏ')) return Rabbit;
  if (name.includes('hồ') || name.includes('cáo')) return PawPrint;
  if (name.includes('quy') || name.includes('rùa')) return Shield;
  
  // Roles
  if (name.includes('sư') || name.includes('giả') || name.includes('khách')) return Medal;
  if (name.includes('luyện đan')) return FlaskConical;
  if (name.includes('ẩn sĩ')) return Mountain;
  if (name.includes('hiền giả')) return Wand2;
  
  // Fallback to type
  return SHOP_ICON_MAP[item.type] || Package;
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
    { id: 'technique', label: 'Công Pháp', icon: '' },
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
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeCategory === cat.id
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
          const ItemIcon = getItemIcon(item);

          return (
            <div 
              key={item.id} 
              className={`rounded-xl p-4 flex justify-between items-center group transition-all border ${rarity.bg} ${rarity.border} hover:scale-[1.02]`}
            >
              <div className="flex items-start gap-3 flex-1 mr-3">
                <div className="w-10 h-10 rounded-full bg-slate-900/70 border border-amber-500/40 flex items-center justify-center shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                  <ItemIcon size={20} className="text-amber-300" />
                </div>
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
                className={`flex flex-col items-center justify-center border rounded-lg px-4 py-2 min-w-[85px] transition-all ${item.owned
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
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeCategory === cat.id
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
            const ItemIcon = getItemIcon(item);
            
            return (
              <div 
                key={item.itemId} 
                className={`rounded-xl p-4 flex justify-between items-center transition-all border ${equipped
                    ? 'bg-emerald-900/30 border-emerald-500/50 ring-1 ring-emerald-500/30' 
                    : `${rarity.bg} ${rarity.border}`
                } hover:scale-[1.02]`}
              >
                <div className="flex items-start gap-3 flex-1 mr-3">
                  <div className="relative w-10 h-10 rounded-full bg-slate-900/70 border border-amber-500/40 flex items-center justify-center shadow-[0_0_8px_rgba(245,158,11,0.25)]">
                    <ItemIcon size={20} className="text-amber-300" />
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
                  className={`rounded-lg px-4 py-2 text-xs font-bold uppercase transition-all min-w-[70px] ${consumable
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

// ==================== STATS COMPARISON MODAL ====================
const StatsComparisonModal = memo(function StatsComparisonModal({ 
  isOpen, 
  onClose, 
  currentUserStats, 
  compareUserStats, 
  currentUserName, 
  compareUserName 
}) {
  if (!isOpen) return null;

  const statsList = [
    { key: 'attack', label: 'Tấn Công', color: 'text-red-300' },
    { key: 'defense', label: 'Phòng Thủ', color: 'text-blue-300' },
    { key: 'qiBlood', label: 'Khí Huyết', color: 'text-pink-300' },
    { key: 'zhenYuan', label: 'Chân Nguyên', color: 'text-purple-300' },
    { key: 'speed', label: 'Tốc Độ', color: 'text-cyan-300' },
    { key: 'criticalRate', label: 'Chí Mạng', color: 'text-purple-300', suffix: '%' },
    { key: 'criticalDamage', label: 'Sát Thương Chí Mạng', color: 'text-red-300', suffix: '%' },
    { key: 'accuracy', label: 'Chính Xác', color: 'text-blue-300', suffix: '%' },
    { key: 'dodge', label: 'Né Tránh', color: 'text-green-300', suffix: '%' },
    { key: 'penetration', label: 'Xuyên Thấu', color: 'text-orange-300' },
    { key: 'resistance', label: 'Kháng Cự', color: 'text-yellow-300' },
    { key: 'lifesteal', label: 'Hấp Huyết', color: 'text-pink-300', suffix: '%' },
    { key: 'regeneration', label: 'Hồi Phục', color: 'text-teal-300', suffix: '/s' },
    { key: 'luck', label: 'Vận Khí', color: 'text-indigo-300' }
  ];

  const getDiff = (current, compare) => {
    const diff = current - compare;
    if (diff === 0) return { value: 0, color: 'text-slate-400', icon: '=' };
    if (diff > 0) return { value: diff, color: 'text-emerald-400', icon: '↑' };
    return { value: Math.abs(diff), color: 'text-red-400', icon: '↓' };
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative bg-[#0f172a] border-2 border-amber-600 p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto rounded-xl shadow-[0_0_50px_rgba(217,119,6,0.5)]"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-amber-500/30">
              <h3 className="text-2xl font-bold text-amber-500 font-title tracking-wider">SO SÁNH THÔNG SỐ</h3>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Comparison Table */}
            <div className="space-y-3">
              {/* Header Row */}
              <div className="grid grid-cols-4 gap-4 text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-white/5">
                <div>Thông Số</div>
                <div className="text-center">{currentUserName}</div>
                <div className="text-center">{compareUserName}</div>
                <div className="text-center">Chênh Lệch</div>
              </div>

              {/* Stats Rows */}
              {statsList.map((stat) => {
                const current = currentUserStats[stat.key] || 0;
                const compare = compareUserStats[stat.key] || 0;
                const diff = getDiff(current, compare);
                const suffix = stat.suffix || '';

                return (
                  <div
                    key={stat.key}
                    className="grid grid-cols-4 gap-4 items-center py-2 border-b border-white/5 hover:bg-slate-800/30 rounded transition-colors"
                  >
                    <div className={`${stat.color} font-medium`}>{stat.label}</div>
                    <div className="text-center font-mono font-bold text-slate-200">
                      {current.toLocaleString()}{suffix}
                    </div>
                    <div className="text-center font-mono font-bold text-slate-200">
                      {compare.toLocaleString()}{suffix}
                    </div>
                    <div className={`text-center font-mono font-bold ${diff.color} flex items-center justify-center gap-1`}>
                      <span>{diff.icon}</span>
                      <span>{diff.value.toLocaleString()}{suffix}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

// ==================== TECHNIQUES TAB ====================
const TechniquesTab = memo(function TechniquesTab({ practiceTechnique }) {
  const { cultivation, shop, loading } = useCultivation();
  const [practicing, setPracticing] = useState(null);
  const [expGain] = useState(10); // Exp mỗi lần luyện
  const [cooldowns, setCooldowns] = useState({}); // techniqueId -> remaining seconds

  useEffect(() => {
    if (!Object.keys(cooldowns).length) return;

    const timer = setInterval(() => {
      setCooldowns(prev => {
        const next = {};
        let hasAny = false;
        for (const [id, value] of Object.entries(prev)) {
          if (value > 1) {
            next[id] = value - 1;
            hasAny = true;
          } else if (value === 1) {
            // hết cooldown, bỏ khỏi map
          }
        }
        return hasAny ? next : {};
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldowns]);

  if (loading || !cultivation) {
    return <LoadingSkeleton />;
  }

  // Lấy danh sách công pháp từ shop
  const allTechniques = shop?.items?.filter(item => item.type === 'technique') || [];
  const learnedTechniques = cultivation.learnedTechniques || [];
  const skills = cultivation.skills || [];

  // Tách công pháp đã học và chưa học
  const learned = learnedTechniques.map(learned => {
    const technique = allTechniques.find(t => t.id === learned.techniqueId);
    return { ...learned, technique };
  }).filter(t => t.technique);

  const notLearned = allTechniques.filter(t => 
    !learnedTechniques.some(l => l.techniqueId === t.id)
  );

  const getPracticeCooldown = (technique) => {
    // Ưu tiên dùng cooldown của skill nếu có (đơn vị giây, rút gọn để luyện)
    if (technique.skill?.cooldown) {
      // Ví dụ: luyện công = skillCooldown / 3, tối thiểu 3s
      return Math.max(3, Math.round(technique.skill.cooldown / 3));
    }

    // Fallback theo độ hiếm
    const byRarity = {
      common: 3,
      uncommon: 5,
      rare: 8,
      epic: 12,
      legendary: 15
    };
    return byRarity[technique.rarity] || 5;
  };

  const handlePractice = async (techniqueId, technique, e) => {
    e?.preventDefault();
    e?.stopPropagation();

    // Đang cooldown thì bỏ qua
    if (cooldowns[techniqueId] > 0) return;

    setPracticing(techniqueId);
    try {
      await practiceTechnique(techniqueId, expGain);

      const cd = getPracticeCooldown(technique);
      setCooldowns(prev => ({
        ...prev,
        [techniqueId]: cd
      }));
    } finally {
      setPracticing(null);
    }
  };

  const getExpNeeded = (level) => level * 100;

  return (
    <div className="space-y-6 pb-2">
      <h3 className="font-bold text-gold font-title tracking-wide text-xl lg:text-2xl">LUYỆN CÔNG PHÁP</h3>

      {/* Kỹ Năng Đã Học */}
      {skills.length > 0 && (
        <div className="spirit-tablet rounded-xl p-5">
          <h4 className="text-lg font-bold text-amber-400 mb-4 font-title">KỸ NĂNG ĐÃ HỌC</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {skills.map((skill, idx) => (
              <div key={idx} className="bg-black/40 border border-purple-500/20 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-bold text-purple-300">{skill.skillName}</h5>
                  <span className="text-xs bg-purple-900/30 text-purple-400 px-2 py-1 rounded">Lv.{skill.level}</span>
                </div>
                <p className="text-xs text-slate-400 mb-2">{skill.skillDescription}</p>
                <p className="text-xs text-slate-500">Từ: {skill.techniqueName}</p>
                <p className="text-xs text-cyan-400 mt-1">Cooldown: {skill.cooldown}s</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Công Pháp Đã Học */}
      {learned.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-lg font-bold text-emerald-400 font-title">CÔNG PHÁP ĐÃ HỌC</h4>
          {learned.map((learnedItem) => {
            const { technique, level, exp } = learnedItem;
            const expNeeded = getExpNeeded(level);
            const progress = level >= 10 ? 100 : (exp / expNeeded) * 100;
            const rarity = RARITY_COLORS[technique.rarity] || RARITY_COLORS.common;
            const TechniqueIcon = getItemIcon(technique);
            const remainingCd = cooldowns[learnedItem.techniqueId] || 0;

            return (
              <motion.div
                key={learnedItem.techniqueId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`spirit-tablet rounded-xl p-4 ${rarity.bg} ${rarity.border}`}
              >
                <div className="flex items-start gap-4 mb-3">
                  <div className="w-12 h-12 rounded-full bg-slate-900/70 border border-amber-500/40 flex items-center justify-center shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                    <TechniqueIcon size={24} className="text-amber-300" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h5 className={`font-bold text-lg ${rarity.text}`}>{technique.name}</h5>
                      <span className="text-xs bg-amber-900/30 text-amber-400 px-2 py-1 rounded font-bold">
                        Cấp {level}/10
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">{technique.description}</p>
                    
                    {/* Progress Bar */}
                    {level < 10 && (
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>Tiến độ luyện</span>
                          <span className="font-mono">{exp} / {expNeeded}</span>
                        </div>
                        <div className="w-full bg-slate-900/80 rounded-full h-2 border border-slate-700/50 overflow-hidden">
                          <motion.div
                            className="bg-gradient-to-r from-purple-600 to-violet-400 h-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Stats Bonus */}
                    {technique.stats && (
                      <div className="mb-3">
                        <p className="text-xs text-slate-500 mb-1">Bonus thông số:</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(technique.stats).map(([stat, value]) => {
                            const statLabels = {
                              attack: 'Tấn Công',
                              defense: 'Phòng Thủ',
                              qiBlood: 'Khí Huyết',
                              zhenYuan: 'Chân Nguyên',
                              speed: 'Tốc Độ',
                              criticalRate: 'Chí Mạng',
                              dodge: 'Né Tránh',
                              penetration: 'Xuyên Thấu',
                              resistance: 'Kháng Cự',
                              lifesteal: 'Hấp Huyết',
                              regeneration: 'Hồi Phục',
                              luck: 'Vận Khí'
                            };
                            const actualBonus = value * (1 + (level - 1) * 0.1) * 100;
                            return (
                              <span key={stat} className="text-xs bg-slate-800/50 text-emerald-300 px-2 py-1 rounded">
                                {statLabels[stat]}: +{actualBonus.toFixed(1)}%
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Skill Info */}
                    {technique.skill && (
                      <div className="mb-3 p-2 bg-purple-900/20 border border-purple-500/30 rounded">
                        <p className="text-xs text-purple-300 font-bold mb-1">Kỹ Năng: {technique.skill.name}</p>
                        <p className="text-xs text-slate-400">{technique.skill.description}</p>
                        <p className="text-xs text-cyan-400 mt-1">Cooldown: {technique.skill.cooldown}s</p>
                      </div>
                    )}

                    {/* Practice Button */}
                    <motion.button
                      onClick={(e) => handlePractice(learnedItem.techniqueId, technique, e)}
                      type="button"
                      disabled={practicing === learnedItem.techniqueId || level >= 10 || remainingCd > 0}
                      className={`w-full py-2 px-4 rounded-lg text-sm font-bold uppercase transition-all ${
                        level >= 10
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : remainingCd > 0
                            ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                            : practicing === learnedItem.techniqueId
                              ? 'bg-purple-800 text-purple-300'
                              : 'bg-gradient-to-r from-purple-700 to-purple-900 text-purple-100 hover:from-purple-600 hover:to-purple-800'
                      }`}
                      whileHover={level < 10 && practicing !== learnedItem.techniqueId && remainingCd <= 0 ? { scale: 1.02 } : {}}
                      whileTap={level < 10 && practicing !== learnedItem.techniqueId && remainingCd <= 0 ? { scale: 0.98 } : {}}
                    >
                      {level >= 10
                        ? 'Đã đạt cấp tối đa'
                        : remainingCd > 0
                          ? `Hồi ${remainingCd}s`
                          : practicing === learnedItem.techniqueId
                            ? 'Đang luyện...'
                            : `Luyện (+${expGain} exp)`}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Công Pháp Chưa Học */}
      {notLearned.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-lg font-bold text-slate-400 font-title">CÔNG PHÁP CHƯA HỌC</h4>
          <p className="text-xs text-slate-500 mb-3">Mua công pháp trong cửa hàng để bắt đầu luyện</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {notLearned.map((technique) => {
              const rarity = RARITY_COLORS[technique.rarity] || RARITY_COLORS.common;
              const TechniqueIcon = getItemIcon(technique);
              return (
                <div
                  key={technique.id}
                  className={`spirit-tablet rounded-xl p-4 opacity-60 ${rarity.bg} ${rarity.border}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-slate-900/70 border border-amber-500/40 flex items-center justify-center">
                      <TechniqueIcon size={20} className="text-amber-300" />
                    </div>
                    <div className="flex-1">
                      <h5 className={`font-bold ${rarity.text}`}>{technique.name}</h5>
                      <p className="text-xs text-slate-500">{technique.price} Linh Thạch</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">{technique.description}</p>
                  {technique.stats && (
                    <div className="text-xs text-slate-500">
                      Bonus: {Object.keys(technique.stats).length} thông số
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {learned.length === 0 && notLearned.length === 0 && (
        <div className="text-center text-slate-500 py-10">
          <p className="text-sm">Chưa có công pháp nào</p>
        </div>
      )}
    </div>
  );
});

// ==================== PK TAB - BATTLE ARENA ====================
const PKTab = memo(function PKTab() {
  const { cultivation } = useCultivation();
  const [activeView, setActiveView] = useState('opponents'); // 'opponents', 'history', 'ranking'
  const [opponents, setOpponents] = useState([]);
  const [battleHistory, setBattleHistory] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [battleStats, setBattleStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [challenging, setChallenging] = useState(null);
  const [battleResult, setBattleResult] = useState(null);
  const [showBattleAnimation, setShowBattleAnimation] = useState(false);
  const [battleLogs, setBattleLogs] = useState([]);
  const [currentLogIndex, setCurrentLogIndex] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [showSlash, setShowSlash] = useState(null); // 'left' or 'right'
  const [particles, setParticles] = useState([]);
  // HP tracking states - updated per log
  const [challengerCurrentHp, setChallengerCurrentHp] = useState(0);
  const [opponentCurrentHp, setOpponentCurrentHp] = useState(0);
  const [showDamageNumber, setShowDamageNumber] = useState(null); // { side: 'left'|'right', damage: number, isCritical: boolean }
  const [battlePhase, setBattlePhase] = useState('intro'); // 'intro', 'fighting', 'result'

  // Load opponents list
  const loadOpponents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api('/api/battle/opponents/list');
      if (response.success) {
        setOpponents(response.data.opponents);
      }
    } catch (err) {
      console.error('Load opponents error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load battle history
  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api('/api/battle/history');
      if (response.success) {
        setBattleHistory(response.data.battles);
        setBattleStats(response.data.stats);
      }
    } catch (err) {
      console.error('Load history error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load ranking
  const loadRanking = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api('/api/battle/ranking/list');
      if (response.success) {
        setRanking(response.data);
      }
    } catch (err) {
      console.error('Load ranking error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data based on active view
  useEffect(() => {
    if (activeView === 'opponents') {
      loadOpponents();
    } else if (activeView === 'history') {
      loadHistory();
    } else if (activeView === 'ranking') {
      loadRanking();
    }
  }, [activeView, loadOpponents, loadHistory, loadRanking]);

  // Challenge opponent
  const handleChallenge = async (opponentId, opponentName) => {
    if (challenging) return;
    
    setChallenging(opponentId);
    try {
      const response = await api('/api/battle/challenge', {
        method: 'POST',
        body: { opponentId }
      });
      
      if (response.success) {
        setBattleResult(response.data);
        setBattleLogs(response.data.battleLogs || []);
        setCurrentLogIndex(0);
        // Initialize HP to max
        setChallengerCurrentHp(response.data.challenger.stats.qiBlood);
        setOpponentCurrentHp(response.data.opponent.stats.qiBlood);
        setBattlePhase('intro');
        setShowBattleAnimation(true);
        // Start battle after intro delay
        setTimeout(() => setBattlePhase('fighting'), 1500);
      }
    } catch (err) {
      alert(err.message || 'Thách đấu thất bại');
    } finally {
      setChallenging(null);
    }
  };

  // Close battle result modal
  const closeBattleResult = () => {
    setShowBattleAnimation(false);
    setBattleResult(null);
    setBattleLogs([]);
    setCurrentLogIndex(0);
    setChallengerCurrentHp(0);
    setOpponentCurrentHp(0);
    setBattlePhase('intro');
    setShowDamageNumber(null);
    // Reload history if on history tab
    if (activeView === 'history') {
      loadHistory();
    }
  };

  // Auto-play battle logs with effects - NEW IMPROVED VERSION
  useEffect(() => {
    if (battlePhase !== 'fighting' || !showBattleAnimation || battleLogs.length === 0) return;
    
    if (currentLogIndex < battleLogs.length) {
      const currentLog = battleLogs[currentLogIndex];
      const isAttackerChallenger = currentLog.attacker === 'challenger';
      
      // Show slash effect
      if (!currentLog.isDodged && currentLog.damage > 0) {
        setShowSlash(isAttackerChallenger ? 'right' : 'left');
        
        // Show damage number on the target side
        setTimeout(() => {
          setShowDamageNumber({
            side: isAttackerChallenger ? 'right' : 'left',
            damage: currentLog.damage,
            isCritical: currentLog.isCritical,
            isSkill: currentLog.skillUsed
          });
          
          // Update HP based on who got hit
          if (isAttackerChallenger) {
            // Challenger attacks -> Opponent loses HP
            setOpponentCurrentHp(prev => Math.max(0, prev - currentLog.damage));
          } else {
            // Opponent attacks -> Challenger loses HP
            setChallengerCurrentHp(prev => Math.max(0, prev - currentLog.damage));
          }
        }, 200);
        
        // Shake on critical
        if (currentLog.isCritical) {
          setIsShaking(true);
          // Create particles on critical hit
          const newParticles = Array.from({ length: 10 }, (_, i) => ({
            id: Date.now() + i,
            x: isAttackerChallenger ? 70 : 30,
            y: 40 + Math.random() * 20,
            color: currentLog.skillUsed ? '#f59e0b' : currentLog.isCritical ? '#fbbf24' : '#ef4444'
          }));
          setParticles(prev => [...prev, ...newParticles]);
          setTimeout(() => setIsShaking(false), 300);
        }
        
        setTimeout(() => setShowSlash(null), 400);
        setTimeout(() => setShowDamageNumber(null), 800);
      } else if (currentLog.isDodged) {
        // Show dodge effect
        setShowDamageNumber({
          side: isAttackerChallenger ? 'right' : 'left',
          damage: 0,
          isDodged: true
        });
        setTimeout(() => setShowDamageNumber(null), 800);
      }
      
      const timer = setTimeout(() => {
        setCurrentLogIndex(prev => prev + 1);
      }, 1000); // Slower for better viewing
      return () => clearTimeout(timer);
    } else {
      // All logs finished -> show result
      setTimeout(() => setBattlePhase('result'), 500);
    }
  }, [battlePhase, showBattleAnimation, battleLogs, currentLogIndex]);

  // Clean up particles
  useEffect(() => {
    if (particles.length > 0) {
      const timer = setTimeout(() => {
        setParticles([]);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [particles]);

  const currentUserStats = cultivation?.combatStats || getCombatStats(cultivation);

  if (!cultivation) {
    return (
      <div className="text-center py-10">
        <p className="text-slate-400">Đang tải thông tin tu luyện...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gold font-title tracking-wide text-xl lg:text-2xl">
          LUẬN KIẾM ĐÀI
        </h3>
      </div>

      {/* Sub Navigation */}
      <div className="flex gap-2 mb-4">
        {[
          { id: 'opponents', label: 'Đối Thủ' },
          { id: 'history', label: 'Lịch Sử' },
          { id: 'ranking', label: 'Xếp Hạng' }
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveView(id)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeView === id
                ? 'bg-red-900/50 text-red-300 border border-red-500/50'
                : 'bg-slate-800/30 text-slate-500 border border-slate-700/30 hover:text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* User Combat Stats Preview */}
      <div className="spirit-tablet rounded-xl p-4 mb-4 border border-amber-500/30">
        <h4 className="text-sm font-bold text-amber-400 mb-3">Thông Số Chiến Đấu Của Bạn</h4>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="text-center p-2 bg-slate-800/50 rounded">
            <Sword size={14} className="mx-auto text-red-400 mb-1" />
            <p className="text-slate-400">Công</p>
            <p className="text-amber-300 font-bold">{currentUserStats.attack}</p>
          </div>
          <div className="text-center p-2 bg-slate-800/50 rounded">
            <Shield size={14} className="mx-auto text-blue-400 mb-1" />
            <p className="text-slate-400">Thủ</p>
            <p className="text-amber-300 font-bold">{currentUserStats.defense}</p>
          </div>
          <div className="text-center p-2 bg-slate-800/50 rounded">
            <Droplet size={14} className="mx-auto text-pink-400 mb-1" />
            <p className="text-slate-400">HP</p>
            <p className="text-amber-300 font-bold">{currentUserStats.qiBlood}</p>
          </div>
          <div className="text-center p-2 bg-slate-800/50 rounded">
            <Zap size={14} className="mx-auto text-yellow-400 mb-1" />
            <p className="text-slate-400">Tốc</p>
            <p className="text-amber-300 font-bold">{currentUserStats.speed}</p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Opponents List */}
      {!loading && activeView === 'opponents' && (
        <div className="space-y-3">
          {opponents.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>Cảnh giới quá cao, không tìm thấy đối thủ xứng tầm</p>
              <p className="text-xs mt-2">Hệ thống sẽ tìm đối thủ trong khoảng ±2 cảnh giới</p>
            </div>
          ) : (
            opponents.map((opponent) => (
              <motion.div
                key={opponent.userId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="spirit-tablet rounded-xl p-4 flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-amber-500/40 overflow-hidden">
                  {opponent.avatar ? (
                    <img src={opponent.avatar || getUserAvatarUrl({ name: opponent.username })} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-amber-400 font-bold">
                      {opponent.username?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-100 truncate">{opponent.username}</p>
                  <p className="text-xs" style={{ color: opponent.realmColor }}>
                    {opponent.realmName}
                  </p>
                  <p className="text-xs text-slate-500">{opponent.exp?.toLocaleString()} Tu Vi</p>
                </div>
                <motion.button
                  onClick={() => handleChallenge(opponent.userId, opponent.username)}
                  disabled={challenging === opponent.userId}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                    challenging === opponent.userId
                      ? 'bg-slate-700 text-slate-400'
                      : 'bg-gradient-to-r from-red-700 to-red-900 text-red-100 hover:from-red-600 hover:to-red-800'
                  }`}
                  whileHover={{ scale: challenging ? 1 : 1.05 }}
                  whileTap={{ scale: challenging ? 1 : 0.95 }}
                >
                  <Sword size={16} />
                  {challenging === opponent.userId ? 'Đang đấu...' : 'Thách Đấu'}
                </motion.button>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Battle History */}
      {!loading && activeView === 'history' && (
        <div className="space-y-4">
          {/* Stats Summary */}
          {battleStats && (
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="spirit-tablet rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-amber-400">{battleStats.totalBattles}</p>
                <p className="text-xs text-slate-400">Tổng Trận</p>
              </div>
              <div className="spirit-tablet rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-400">{battleStats.wins}</p>
                <p className="text-xs text-slate-400">Thắng</p>
              </div>
              <div className="spirit-tablet rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-400">{battleStats.losses}</p>
                <p className="text-xs text-slate-400">Thua</p>
              </div>
              <div className="spirit-tablet rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-slate-400">{battleStats.draws}</p>
                <p className="text-xs text-slate-400">Hòa</p>
              </div>
            </div>
          )}

          {battleHistory.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>Chưa có trận đấu nào</p>
              <p className="text-xs mt-2">Hãy thách đấu để bắt đầu!</p>
            </div>
          ) : (
            battleHistory.map((battle, idx) => (
              <motion.div
                key={battle._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`spirit-tablet rounded-xl p-4 ${
                  battle.isDraw
                    ? 'border-l-4 border-slate-500'
                    : battle.isUserWinner
                      ? 'border-l-4 border-green-500'
                      : 'border-l-4 border-red-500'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${
                      battle.isDraw ? 'text-slate-400' : battle.isUserWinner ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {battle.isDraw ? 'HÒA' : battle.isUserWinner ? 'THẮNG' : 'THUA'}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(battle.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">{battle.totalTurns} lượt</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex-1 text-center">
                    <p className={`font-bold text-sm ${battle.isUserChallenger ? 'text-amber-300' : 'text-slate-300'}`}>
                      {battle.challenger.username}
                    </p>
                    <p className="text-xs text-slate-500">{battle.challenger.realmName}</p>
                  </div>
                  <div className="text-xl font-bold text-slate-500">VS</div>
                  <div className="flex-1 text-center">
                    <p className={`font-bold text-sm ${!battle.isUserChallenger ? 'text-amber-300' : 'text-slate-300'}`}>
                      {battle.opponent.username}
                    </p>
                    <p className="text-xs text-slate-500">{battle.opponent.realmName}</p>
                  </div>
                </div>

                {battle.rewards && (
                  <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Phần thưởng: +{battle.isUserWinner ? battle.rewards.winnerExp : battle.rewards.loserExp} exp, 
                      +{battle.isUserWinner ? battle.rewards.winnerSpiritStones : battle.rewards.loserSpiritStones} linh thạch
                    </span>
                    {/* Revenge Button - Only show if user lost */}
                    {!battle.isUserWinner && !battle.isDraw && (
                      <motion.button
                        onClick={() => {
                          const opponentId = battle.isUserChallenger ? battle.opponent._id : battle.challenger._id;
                          const opponentName = battle.isUserChallenger ? battle.opponent.username : battle.challenger.username;
                          handleChallenge(opponentId, opponentName);
                        }}
                        disabled={challenging}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-orange-700 to-red-800 text-orange-100 hover:from-orange-600 hover:to-red-700 transition-all disabled:opacity-50"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Flame size={12} />
                        Rửa Hận
                      </motion.button>
                    )}
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Ranking */}
      {!loading && activeView === 'ranking' && (
        <div className="space-y-3">
          {ranking.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>Chưa có dữ liệu xếp hạng</p>
            </div>
          ) : (
            ranking.map((user, idx) => (
              <motion.div
                key={user.userId}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="spirit-tablet rounded-xl p-4 flex items-center gap-4"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  idx === 0 ? 'bg-amber-500 text-black' :
                  idx === 1 ? 'bg-slate-400 text-black' :
                  idx === 2 ? 'bg-amber-700 text-white' :
                  'bg-slate-700 text-slate-300'
                }`}>
                  {user.rank}
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-amber-500/40 overflow-hidden">
                  {user.avatar ? (
                    <img src={user.avatar || getUserAvatarUrl({ name: user.username })} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-amber-400 font-bold">
                      {user.username?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-100 truncate">{user.username}</p>
                  <p className="text-xs text-slate-500">{user.realmName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-400">{user.wins} Thắng</p>
                  <p className="text-xs text-slate-500">{user.winRate}% tỷ lệ</p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Battle Animation Modal */}
      <AnimatePresence>
        {showBattleAnimation && battleResult && (
          <motion.div
            className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md ${isShaking ? 'animate-shake' : ''}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Background Battle Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {/* Animated background lines */}
              <div className="absolute inset-0 opacity-10">
                {[...Array(10)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute h-px bg-gradient-to-r from-transparent via-red-500 to-transparent"
                    style={{ top: `${10 + i * 10}%`, width: '100%' }}
                    animate={{ x: [-1000, 1000] }}
                    transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'linear' }}
                  />
                ))}
              </div>
            </div>

            {/* Battle Particles */}
            {particles.map(particle => (
              <motion.div
                key={particle.id}
                className="absolute w-3 h-3 rounded-full pointer-events-none"
                style={{ backgroundColor: particle.color, left: `${particle.x}%`, top: `${particle.y}%` }}
                initial={{ scale: 1, opacity: 1 }}
                animate={{
                  x: (Math.random() - 0.5) * 300,
                  y: (Math.random() - 0.5) * 300,
                  scale: 0,
                  opacity: 0
                }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            ))}

            {/* Damage Number Floating */}
            <AnimatePresence>
              {showDamageNumber && (
                <motion.div
                  className={`absolute z-[200] pointer-events-none ${
                    showDamageNumber.side === 'right' ? 'right-[20%]' : 'left-[20%]'
                  }`}
                  style={{ top: '35%' }}
                  initial={{ opacity: 0, y: 0, scale: 0.5 }}
                  animate={{ opacity: 1, y: -30, scale: showDamageNumber.isCritical ? 1.5 : 1.2 }}
                  exit={{ opacity: 0, y: -60 }}
                  transition={{ duration: 0.5 }}
                >
                  {showDamageNumber.isDodged ? (
                    <span className="text-2xl font-bold text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">
                      MISS!
                    </span>
                  ) : (
                    <span className={`text-3xl font-bold drop-shadow-lg ${
                      showDamageNumber.isCritical 
                        ? 'text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]' 
                        : showDamageNumber.isSkill
                          ? 'text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]'
                          : 'text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.8)]'
                    }`}>
                      {showDamageNumber.isCritical && '💥'}-{showDamageNumber.damage}
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Slash Effects - Enhanced */}
            <AnimatePresence>
              {showSlash === 'right' && (
                <motion.div
                  className="absolute right-[25%] top-1/2 -translate-y-1/2 pointer-events-none z-50"
                  initial={{ opacity: 0, scale: 0.3, rotate: -60, x: -100 }}
                  animate={{ opacity: 1, scale: 1.8, rotate: 30, x: 0 }}
                  exit={{ opacity: 0, scale: 2.5, x: 100 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  <Sword size={100} className="text-blue-400 drop-shadow-[0_0_30px_rgba(96,165,250,0.9)]" />
                </motion.div>
              )}
              {showSlash === 'left' && (
                <motion.div
                  className="absolute left-[25%] top-1/2 -translate-y-1/2 pointer-events-none z-50"
                  initial={{ opacity: 0, scale: 0.3, rotate: 60, x: 100 }}
                  animate={{ opacity: 1, scale: 1.8, rotate: -30, x: 0 }}
                  exit={{ opacity: 0, scale: 2.5, x: -100 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  <Sword size={100} className="text-red-400 drop-shadow-[0_0_30px_rgba(248,113,113,0.9)]" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Battle Card - Wider Layout */}
            <motion.div
              className="relative w-full max-w-5xl mx-4 bg-gradient-to-b from-[#0f172a] to-[#1e1b4b] border-2 border-red-600/50 rounded-2xl p-5 shadow-[0_0_100px_rgba(220,38,38,0.3)] max-h-[85vh] overflow-hidden"
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Battle Header */}
              <motion.div 
                className="text-center mb-4"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-amber-400 to-red-400 font-title tracking-wider">
                  {battlePhase === 'intro' ? 'LUẬN KIẾM ĐÀI' : 
                   battlePhase === 'fighting' ? `LƯỢT ${currentLogIndex + 1}/${battleLogs.length}` :
                   'KẾT QUẢ'}
                </h3>
              </motion.div>

              {/* Main Content - Horizontal Layout */}
              <div className="flex gap-4">
                {/* Left Side - Combatants */}
                <div className="flex-shrink-0 w-72">
                  {/* Combatants Arena - Vertical Stack */}
                  <div className="flex flex-col gap-2">
                    {/* Challenger */}
                    <motion.div 
                      className={`p-3 rounded-xl bg-gradient-to-br from-blue-900/40 to-slate-900/40 border ${
                        battlePhase === 'result' && battleResult.winner === 'challenger' 
                          ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]' 
                          : 'border-blue-500/30'
                      }`}
                      animate={battlePhase === 'fighting' && battleLogs[currentLogIndex]?.attacker === 'challenger' ? {
                        scale: [1, 1.02, 1],
                        boxShadow: ['0 0 0px rgba(59,130,246,0)', '0 0 20px rgba(59,130,246,0.5)', '0 0 0px rgba(59,130,246,0)']
                      } : {}}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex items-center gap-3">
                        <motion.div 
                          className={`w-12 h-12 rounded-full border-2 overflow-hidden flex-shrink-0 ${
                            battlePhase === 'result' && battleResult.winner === 'challenger' 
                              ? 'border-green-400 ring-2 ring-green-400/30' 
                              : 'border-blue-400'
                          }`}
                          animate={battlePhase === 'intro' ? { scale: [0.8, 1.1, 1] } : {}}
                          transition={{ duration: 0.5, delay: 0.5 }}
                        >
                          {battleResult.challenger.avatar ? (
                            <img src={battleResult.challenger.avatar || getUserAvatarUrl({ name: battleResult.challenger.username })} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-slate-800 flex items-center justify-center text-lg text-amber-400 font-bold">
                              {battleResult.challenger.username?.charAt(0)?.toUpperCase()}
                            </div>
                          )}
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-blue-200 text-sm truncate">{battleResult.challenger.username}</p>
                            {battlePhase === 'result' && battleResult.winner === 'challenger' && (
                              <span className="text-green-400 text-[10px] font-bold bg-green-500/20 px-1.5 py-0.5 rounded">THẮNG</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400">{battleResult.challenger.stats.realmName}</p>
                          <div className="relative h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-600 mt-1">
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-green-600 to-green-400"
                              initial={{ width: '100%' }}
                              animate={{ 
                                width: `${Math.max(0, (challengerCurrentHp / battleResult.challenger.stats.qiBlood) * 100)}%`,
                                backgroundColor: challengerCurrentHp / battleResult.challenger.stats.qiBlood > 0.5 
                                  ? ['#22c55e', '#22c55e'] 
                                  : challengerCurrentHp / battleResult.challenger.stats.qiBlood > 0.25 
                                    ? ['#eab308', '#eab308'] 
                                    : ['#ef4444', '#ef4444']
                              }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                          <p className="text-[9px] text-slate-500 mt-0.5">{Math.round(challengerCurrentHp)} / {battleResult.challenger.stats.qiBlood}</p>
                        </div>
                      </div>
                    </motion.div>

                    {/* VS Divider */}
                    <div className="flex items-center justify-center py-1">
                      <motion.div
                        className="text-xl font-bold text-red-500"
                        animate={battlePhase === 'fighting' ? { 
                          scale: [1, 1.2, 1],
                          textShadow: ['0 0 0px #ef4444', '0 0 20px #ef4444', '0 0 0px #ef4444']
                        } : {}}
                        transition={{ duration: 0.5, repeat: battlePhase === 'fighting' ? Infinity : 0, repeatDelay: 0.5 }}
                      >
                        VS
                      </motion.div>
                    </div>

                    {/* Opponent */}
                    <motion.div 
                      className={`p-3 rounded-xl bg-gradient-to-br from-red-900/40 to-slate-900/40 border ${
                        battlePhase === 'result' && battleResult.winner === 'opponent' 
                          ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]' 
                          : 'border-red-500/30'
                      }`}
                      animate={battlePhase === 'fighting' && battleLogs[currentLogIndex]?.attacker === 'opponent' ? {
                        scale: [1, 1.02, 1],
                        boxShadow: ['0 0 0px rgba(239,68,68,0)', '0 0 20px rgba(239,68,68,0.5)', '0 0 0px rgba(239,68,68,0)']
                      } : {}}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex items-center gap-3">
                        <motion.div 
                          className={`w-12 h-12 rounded-full border-2 overflow-hidden flex-shrink-0 ${
                            battlePhase === 'result' && battleResult.winner === 'opponent' 
                              ? 'border-green-400 ring-2 ring-green-400/30' 
                              : 'border-red-400'
                          }`}
                          animate={battlePhase === 'intro' ? { scale: [0.8, 1.1, 1] } : {}}
                          transition={{ duration: 0.5, delay: 0.7 }}
                        >
                          {battleResult.opponent.avatar ? (
                            <img src={battleResult.opponent.avatar || getUserAvatarUrl({ name: battleResult.opponent.username })} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-slate-800 flex items-center justify-center text-lg text-amber-400 font-bold">
                              {battleResult.opponent.username?.charAt(0)?.toUpperCase()}
                            </div>
                          )}
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-red-200 text-sm truncate">{battleResult.opponent.username}</p>
                            {battlePhase === 'result' && battleResult.winner === 'opponent' && (
                              <span className="text-green-400 text-[10px] font-bold bg-green-500/20 px-1.5 py-0.5 rounded">THẮNG</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400">{battleResult.opponent.stats.realmName}</p>
                          <div className="relative h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-600 mt-1">
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-green-600 to-green-400"
                              initial={{ width: '100%' }}
                              animate={{ 
                                width: `${Math.max(0, (opponentCurrentHp / battleResult.opponent.stats.qiBlood) * 100)}%`,
                                backgroundColor: opponentCurrentHp / battleResult.opponent.stats.qiBlood > 0.5 
                                  ? ['#22c55e', '#22c55e'] 
                                  : opponentCurrentHp / battleResult.opponent.stats.qiBlood > 0.25 
                                    ? ['#eab308', '#eab308'] 
                                    : ['#ef4444', '#ef4444']
                              }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                          <p className="text-[9px] text-slate-500 mt-0.5">{Math.round(opponentCurrentHp)} / {battleResult.opponent.stats.qiBlood}</p>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Result Banner */}
                  <AnimatePresence>
                    {battlePhase === 'result' && (
                      <motion.div
                        className={`text-center py-2 rounded-xl mt-3 ${
                          battleResult.isDraw 
                            ? 'bg-gradient-to-r from-slate-700/50 to-slate-700/50 border border-slate-500/50' 
                            : battleResult.winner === 'challenger'
                              ? 'bg-gradient-to-r from-green-900/50 to-green-900/50 border border-green-500/50'
                              : 'bg-gradient-to-r from-red-900/50 to-red-900/50 border border-red-500/50'
                        }`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', duration: 0.5 }}
                      >
                        <motion.p 
                          className={`text-lg font-bold font-title ${
                            battleResult.isDraw ? 'text-slate-300' : battleResult.winner === 'challenger' ? 'text-green-400' : 'text-red-400'
                          }`}
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 0.5, repeat: 2 }}
                        >
                          {battleResult.isDraw ? 'HÒA' : battleResult.winner === 'challenger' ? 'CHIẾN THẮNG!' : 'THẤT BẠI'}
                        </motion.p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Rewards */}
                  <AnimatePresence>
                    {battlePhase === 'result' && (
                      <motion.div
                        className="text-center py-2 bg-slate-800/50 rounded-xl border border-amber-500/30 mt-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <p className="text-[10px] text-slate-400 mb-1">Phần thưởng:</p>
                        <div className="flex items-center justify-center gap-2 text-xs">
                          <span className="text-amber-400 font-bold">
                            +{battleResult.winner === 'challenger' || battleResult.isDraw 
                              ? battleResult.rewards.winnerExp 
                              : battleResult.rewards.loserExp} EXP
                          </span>
                          {(battleResult.winner === 'challenger' || battleResult.isDraw) && battleResult.rewards.winnerSpiritStones > 0 && (
                            <span className="text-cyan-400 font-bold">
                              +{battleResult.rewards.winnerSpiritStones} Linh Thạch
                            </span>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Right Side - Battle Log */}
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="bg-slate-900/70 rounded-xl p-3 flex-1 overflow-hidden border border-slate-700/50 flex flex-col">
                    <div className="flex items-center justify-between mb-2 flex-shrink-0">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Diễn Biến Trận Đấu</p>
                      <p className="text-xs text-amber-400">{currentLogIndex}/{battleLogs.length} lượt</p>
                    </div>
                    <div className="space-y-1.5 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-600 pr-1" style={{ maxHeight: '260px' }}>
                      {battleLogs.slice(0, currentLogIndex).map((log, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: log.attacker === 'challenger' ? -15 : 15, scale: 0.95 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          className={`text-[11px] p-2 rounded-lg flex items-center gap-1.5 ${
                            log.isDodged 
                              ? 'bg-cyan-900/30 text-cyan-300 border border-cyan-500/30'
                              : log.skillUsed 
                                ? 'bg-amber-900/40 text-amber-200 border border-amber-500/40'
                                : log.isCritical 
                                  ? 'bg-yellow-900/40 text-yellow-200 border border-yellow-500/40'
                                  : log.attacker === 'challenger' 
                                    ? 'bg-blue-900/30 text-blue-200 border border-blue-500/20' 
                                    : 'bg-red-900/30 text-red-200 border border-red-500/20'
                          }`}
                        >
                          <span className="text-slate-500 font-mono w-5 flex-shrink-0 text-[10px]">#{idx + 1}</span>
                          <span className={`font-bold flex-shrink-0 ${log.attacker === 'challenger' ? 'text-blue-300' : 'text-red-300'}`}>
                            {log.attacker === 'challenger' ? battleResult.challenger.username : battleResult.opponent.username}:
                          </span>
                          <span className="flex-1 truncate">{log.description}</span>
                          {log.isCritical && !log.isDodged && (
                            <span className="text-yellow-400 text-[9px] font-bold flex-shrink-0 bg-yellow-500/20 px-1 rounded">CRT</span>
                          )}
                          {log.skillUsed && (
                            <span className="text-amber-400 text-[9px] font-bold flex-shrink-0 bg-amber-500/20 px-1 rounded">SKILL</span>
                          )}
                          {!log.isDodged ? (
                            <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${
                              log.isCritical ? 'bg-yellow-500/40 text-yellow-200' : 'bg-slate-700/70 text-slate-300'
                            }`}>
                              -{log.damage}
                            </span>
                          ) : (
                            <span className="text-cyan-400 text-[10px] font-bold flex-shrink-0 bg-cyan-500/20 px-1 rounded">MISS</span>
                          )}
                        </motion.div>
                      ))}
                      
                      {battlePhase === 'fighting' && currentLogIndex < battleLogs.length && (
                        <div className="flex items-center justify-center gap-2 py-2 text-slate-400">
                          <motion.div
                            className="w-1.5 h-1.5 bg-red-500 rounded-full"
                            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                            transition={{ duration: 0.5, repeat: Infinity }}
                          />
                          <span className="text-[10px]">Đang chiến đấu...</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Close Button */}
                  <motion.button
                    onClick={closeBattleResult}
                    className="w-full py-2 mt-3 bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white rounded-xl font-bold text-sm hover:from-red-600 hover:via-red-500 hover:to-red-600 transition-all shadow-lg"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: battlePhase === 'result' ? 0.8 : 0 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {battlePhase === 'result' ? 'Đóng' : 'Bỏ qua'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ==================== LEADERBOARD TAB ====================
const LeaderboardTab = memo(function LeaderboardTab({ isAdmin = false }) {
  const { leaderboard, loadLeaderboard, loading, cultivation } = useCultivation();
  const [fixing, setFixing] = useState(false);
  const [comparingUserId, setComparingUserId] = useState(null);
  const [compareStats, setCompareStats] = useState(null);
  const [loadingCompare, setLoadingCompare] = useState(false);

  useEffect(() => {
    loadLeaderboard('exp', 20);
  }, [loadLeaderboard]);

  const handleFixRealms = async () => {
    if (!window.confirm('Bạn có chắc muốn fix lại tất cả cảnh giới dựa trên exp?')) return;
    setFixing(true);
    try {
      const data = await api('/api/cultivation/fix-realms', { method: 'POST' });
      alert(data.message || 'Đã fix xong!');
      loadLeaderboard('exp', 20); // Reload leaderboard
    } catch (err) {
      alert('Lỗi: ' + err.message);
    } finally {
      setFixing(false);
    }
  };

  const handleCompare = async (userId, userName) => {
    if (!cultivation) return;
    
    setComparingUserId(userId);
    setLoadingCompare(true);
    
    try {
      const response = await api(`/api/cultivation/combat-stats/${userId}`);
      if (response.success && response.data) {
        setCompareStats({
          stats: response.data,
          userName: userName
        });
      }
    } catch (err) {
      alert('Không thể lấy thông số: ' + err.message);
      setComparingUserId(null);
    } finally {
      setLoadingCompare(false);
    }
  };

  const currentUserStats = cultivation?.combatStats || getCombatStats(cultivation);
  const currentUserName = cultivation?.user?.name || cultivation?.user?.nickname || 'Bạn';

  if (loading || !leaderboard) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-3 pb-2">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gold font-title tracking-wide text-xl lg:text-2xl">BẢNG XẾP HẠNG</h3>
        {isAdmin && (
          <button
            onClick={handleFixRealms}
            disabled={fixing}
            className="text-xs px-3 py-1 bg-amber-600/20 border border-amber-500/30 rounded-lg text-amber-400 hover:bg-amber-600/30 disabled:opacity-50"
          >
            {fixing ? 'Đang fix...' : 'Fix BXH'}
          </button>
        )}
      </div>

      {leaderboard.leaderboard?.map((entry, idx) => {
        const userId = entry.user?._id || entry.user?.id;
        const isComparing = comparingUserId === userId;
        
        return (
          <motion.div
            key={userId || idx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.03 }}
            className={`spirit-tablet rounded-lg p-3 flex items-center gap-3 ${entry.isCurrentUser ? 'border-amber-500/50 bg-amber-900/20' : ''
              }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-amber-500 text-black' :
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
            <div className="flex items-center gap-2">
              {entry.isCurrentUser && (
                <span className="text-xs text-amber-400 font-bold">← Bạn</span>
              )}
              {!entry.isCurrentUser && userId && (
                <button
                  onClick={() => handleCompare(userId, entry.user?.name || 'Tu sĩ ẩn danh')}
                  disabled={loadingCompare}
                  className="p-1.5 rounded-lg hover:bg-slate-800/50 transition-colors text-slate-400 hover:text-amber-400 disabled:opacity-50"
                  title="So sánh thông số"
                >
                  <GitCompare size={16} />
                </button>
              )}
            </div>
          </motion.div>
        );
      })}

      {/* Comparison Modal */}
      {compareStats && (
        <StatsComparisonModal
          isOpen={!!compareStats}
          onClose={() => {
            setCompareStats(null);
            setComparingUserId(null);
          }}
          currentUserStats={currentUserStats}
          compareUserStats={compareStats.stats}
          currentUserName={currentUserName}
          compareUserName={compareStats.userName}
        />
      )}
    </div>
  );
});

// ==================== MAIN CULTIVATION CONTENT ====================
const CultivationContent = memo(function CultivationContent() {
  const { cultivation, checkIn, loading, addExp, collectPassiveExp, loadPassiveExpStatus, notification, clearNotification, practiceTechnique } = useCultivation();
  
  // Get user from API to check admin
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const data = await api('/api/auth/me');
        if (data.user) {
          setIsAdmin(data.user.role === 'admin');
        }
      } catch (e) {
        // Silent fail
      }
    };
    checkAdmin();
  }, []);
  
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
        // Silent fail
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
    spawnParticle(rect.left + rect.width / 2, rect.top, `+${expGain} Tu Vi`, 'cyan');
    
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
        addLog(`Chân nguyên đã cạn kiệt, hãy chờ một lát...`, 'danger');
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
    { id: 'techniques', label: 'Công Pháp' },
    { id: 'pk', label: 'PK' },
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
              className={`px-5 py-3 rounded-xl text-sm font-bold uppercase tracking-wide transition-all ${activeTab === tab.id
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
          {activeTab === 'techniques' && <TechniquesTab practiceTechnique={practiceTechnique} />}
          {activeTab === 'pk' && <PKTab />}
          {activeTab === 'leaderboard' && <LeaderboardTab isAdmin={isAdmin} />}
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
