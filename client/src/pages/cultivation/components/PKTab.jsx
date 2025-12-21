/**
 * PK Tab - Battle Arena Component
 * 
 * Features:
 * - Opponents list with challenge functionality
 * - Battle history with stats summary
 * - Ranking leaderboard
 * - Full battle animation with effects (particles, slash, damage numbers)
 */
import { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GiBroadsword,
  GiShield,
  GiHeartBottle,
  GiLightningFrequency,
  GiFire,
  GiScrollUnfurled,
  GiTwoCoins,
  GiSparkles
} from 'react-icons/gi';
import { useCultivation } from '../../../hooks/useCultivation.jsx';
import { api } from '../../../api';
import { getUserAvatarUrl } from '../../../utils/avatarUtils.js';
import { getCombatStats } from '../utils/helpers.js';

// Character Animation Variants - Dash & Recoil Physics
const characterVariants = {
  idle: { x: 0, scale: 1, filter: "brightness(1)" },
  attackRight: { x: 60, scale: 1.1, transition: { duration: 0.1, ease: "easeIn" } }, // Lao lên phải
  attackLeft: { x: -60, scale: 1.1, transition: { duration: 0.1, ease: "easeIn" } }, // Lao lên trái
  hit: {
    x: [0, -10, 10, -5, 5, 0],
    filter: ["brightness(1)", "brightness(2)", "brightness(1)"],
    transition: { duration: 0.3 }
  }, // Bị đánh rung lắc + chớp sáng
  dodge: {
    opacity: [1, 0.5, 1],
    x: [0, -30, 0],
    transition: { duration: 0.4 }
  } // Tàn ảnh né tránh
};

const PKTab = memo(function PKTab({ onSwitchTab }) {
  const { cultivation } = useCultivation();
  const [activeView, setActiveView] = useState('opponents'); // 'opponents', 'history'
  const [opponents, setOpponents] = useState([]);
  const [bots, setBots] = useState([]);
  const [battleHistory, setBattleHistory] = useState([]);
  const [battleStats, setBattleStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [challenging, setChallenging] = useState(null);
  const [battleResult, setBattleResult] = useState(null);
  const [showBattleAnimation, setShowBattleAnimation] = useState(false);
  const [battleLogs, setBattleLogs] = useState([]);
  const [currentLogIndex, setCurrentLogIndex] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [showSlash, setShowSlash] = useState(null); // 'left' or 'right'
  const [hitEffect, setHitEffect] = useState(null); // { side: 'left'|'right', type: 'normal'|'crit'|'skill' }
  const [particles, setParticles] = useState([]);
  // HP tracking states - updated per log
  const [challengerCurrentHp, setChallengerCurrentHp] = useState(0);
  const [opponentCurrentHp, setOpponentCurrentHp] = useState(0);
  // Mana tracking states - updated per log
  const [challengerCurrentMana, setChallengerCurrentMana] = useState(0);
  const [opponentCurrentMana, setOpponentCurrentMana] = useState(0);
  const [showDamageNumber, setShowDamageNumber] = useState(null); // { side: 'left'|'right', damage: number, isCritical: boolean }
  const [battlePhase, setBattlePhase] = useState('intro'); // 'intro', 'fighting', 'result'

  // Character Animation States - NEW: Dash & Recoil
  const [challengerAction, setChallengerAction] = useState('idle'); // 'idle' | 'attackRight' | 'hit' | 'dodge'
  const [opponentAction, setOpponentAction] = useState('idle'); // 'idle' | 'attackLeft' | 'hit' | 'dodge'
  const [screenFlash, setScreenFlash] = useState(null); // 'white' | 'red' | 'dark' | null
  const [showSkillName, setShowSkillName] = useState(null); // { name: string, side: 'left' | 'right' } | null

  // --- MEMOIZED BACKGROUND DATA (Fix for jumping background) ---
  // Reduce particles on mobile for better performance
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  const starsData = useMemo(() => Array.from({ length: isMobile ? 15 : 50 }, () => ({
    top: Math.random() * 60,
    left: Math.random() * 100,
    opacity: Math.random(),
    duration: 2 + Math.random() * 4,
    delay: Math.random() * 5
  })), [isMobile]);

  const rocksData = useMemo(() => Array.from({ length: isMobile ? 3 : 7 }, () => ({
    width: Math.random() * 50 + 30,
    height: Math.random() * 50 + 30,
    borderRadius: `${Math.random() * 30 + 30}% ${Math.random() * 30 + 30}% ${Math.random() * 30 + 30}% ${Math.random() * 30 + 30}% / ${Math.random() * 30 + 30}% ${Math.random() * 30 + 30}% ${Math.random() * 30 + 30}% ${Math.random() * 30 + 30}%`,
    top: Math.random() * 70,
    left: Math.random() * 100,
    blur: Math.random() * 2,
    yAnim: Math.random() * -30 - 20,
    rotateAnim: Math.random() * 20 - 10,
    duration: 8 + Math.random() * 10
  })), [isMobile]);

  const dustData = useMemo(() => Array.from({ length: isMobile ? 15 : 60 }, () => ({
    top: Math.random() * 100,
    left: Math.random() * 100,
    yAnim: Math.random() * -100 - 50,
    xAnim: (Math.random() - 0.5) * 50,
    duration: 5 + Math.random() * 10,
    delay: Math.random() * 5
  })), [isMobile]);

  const spiritParticlesData = useMemo(() => Array.from({ length: isMobile ? 8 : 25 }, () => ({
    xStart: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
    delay: Math.random() * 3,
    duration: 4 + Math.random() * 5
  })), [isMobile]);

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

  // Load bots list
  const loadBots = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api('/api/battle/bots/list');
      if (response.success) {
        setBots(response.data.bots);
      }
    } catch (err) {
      console.error('Load bots error:', err);
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

  // Load data based on active view
  useEffect(() => {
    if (activeView === 'opponents') {
      loadOpponents();
      loadBots();
    } else if (activeView === 'history') {
      loadHistory();
    }
  }, [activeView, loadOpponents, loadBots, loadHistory]);

  // Check for ranked battle data from ArenaTab
  useEffect(() => {
    const rankedBattleStr = sessionStorage.getItem('rankedBattle');
    if (rankedBattleStr) {
      try {
        const rankedBattle = JSON.parse(rankedBattleStr);
        // Clear sessionStorage immediately to prevent re-triggering
        sessionStorage.removeItem('rankedBattle');

        if (rankedBattle.battleData) {
          const data = rankedBattle.battleData;
          const logs = data.battleLogs || [];

          // For Arena API, extract initial HP from first log (before any damage)
          // If logs exist, first log has initial HP values
          // Otherwise use reasonable defaults based on realm
          let initialChallengerHp = 1000;
          let initialOpponentHp = 1000;
          let initialChallengerMana = 100;
          let initialOpponentMana = 100;

          if (logs.length > 0) {
            // Get max HP from battle logs (first log before any damage)
            const firstLog = logs[0];
            // HP at turn 1 before damage is applied = current HP + damage dealt
            if (firstLog.attacker === 'challenger') {
              initialOpponentHp = (firstLog.opponentHp || 0) + (firstLog.damage || 0);
              initialChallengerHp = firstLog.challengerHp || firstLog.opponentHp || 1000;
            } else {
              initialChallengerHp = (firstLog.challengerHp || 0) + (firstLog.damage || 0);
              initialOpponentHp = firstLog.opponentHp || firstLog.challengerHp || 1000;
            }
          }

          // Build compatible result format for PKTab
          // Use stats from API response if available, otherwise use calculated from logs
          const challengerHp = data.challenger?.stats?.qiBlood || initialChallengerHp;
          const challengerMana = data.challenger?.stats?.zhenYuan || initialChallengerMana;
          const opponentHp = data.opponent?.stats?.qiBlood || initialOpponentHp;
          const opponentMana = data.opponent?.stats?.zhenYuan || initialOpponentMana;

          const compatibleResult = {
            ...data,
            challenger: {
              ...data.challenger,
              stats: {
                qiBlood: challengerHp,
                zhenYuan: challengerMana
              }
            },
            opponent: {
              ...data.opponent,
              stats: {
                qiBlood: opponentHp,
                zhenYuan: opponentMana
              }
            }
          };

          // Start battle animation with the data from ranked match
          setBattleResult(compatibleResult);
          setBattleLogs(logs);
          setCurrentLogIndex(0);
          // Initialize HP and Mana
          setChallengerCurrentHp(challengerHp);
          setOpponentCurrentHp(opponentHp);
          setChallengerCurrentMana(challengerMana);
          setOpponentCurrentMana(opponentMana);
          setBattlePhase('intro');
          setShowBattleAnimation(true);
          // Start battle after intro delay
          setTimeout(() => setBattlePhase('fighting'), 1500);
        }
      } catch (e) {
        console.error('Failed to parse ranked battle data:', e);
        sessionStorage.removeItem('rankedBattle');
      }
    }
  }, []);

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
        // Initialize HP and Mana to max
        setChallengerCurrentHp(response.data.challenger.stats.qiBlood);
        setOpponentCurrentHp(response.data.opponent.stats.qiBlood);
        setChallengerCurrentMana(response.data.challenger.stats.zhenYuan);
        setOpponentCurrentMana(response.data.opponent.stats.zhenYuan);
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

  // Challenge bot
  const handleChallengeBot = async (botId, botName) => {
    if (challenging) return;

    setChallenging(botId);
    try {
      const response = await api('/api/battle/challenge/bot', {
        method: 'POST',
        body: { botId }
      });

      if (response.success) {
        setBattleResult(response.data);
        setBattleLogs(response.data.battleLogs || []);
        setCurrentLogIndex(0);
        // Initialize HP and Mana to max
        setChallengerCurrentHp(response.data.challenger.stats.qiBlood);
        setOpponentCurrentHp(response.data.opponent.stats.qiBlood);
        setChallengerCurrentMana(response.data.challenger.stats.zhenYuan);
        setOpponentCurrentMana(response.data.opponent.stats.zhenYuan);
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

  // Skip to result (khi đang fighting)
  const skipToResult = () => {
    // Dừng animation và chuyển sang hiển thị kết quả
    if (battleLogs.length > 0) {
      // Lấy log cuối cùng để cập nhật HP/Mana cuối cùng
      const lastLog = battleLogs[battleLogs.length - 1];
      setChallengerCurrentHp(lastLog.challengerHp || 0);
      setOpponentCurrentHp(lastLog.opponentHp || 0);
      if (lastLog.challengerMana !== undefined) setChallengerCurrentMana(lastLog.challengerMana);
      if (lastLog.opponentMana !== undefined) setOpponentCurrentMana(lastLog.opponentMana);
      setCurrentLogIndex(battleLogs.length);
    }
    // Reset animation states
    setShowDamageNumber(null);
    setChallengerAction('idle');
    setOpponentAction('idle');
    setScreenFlash(null);
    setShowSlash(null);
    setHitEffect(null);
    setShowSkillName(null);
    setParticles([]);
    // Chuyển sang phase result
    setBattlePhase('result');
  };

  // Close battle result modal
  const closeBattleResult = () => {
    const wasRankedBattle = battleResult?.challenger?.mmrChange !== undefined;

    setShowBattleAnimation(false);
    setBattleResult(null);
    setBattleLogs([]);
    setCurrentLogIndex(0);
    setChallengerCurrentHp(0);
    setOpponentCurrentHp(0);
    setChallengerCurrentMana(0);
    setOpponentCurrentMana(0);
    setBattlePhase('intro');
    setShowDamageNumber(null);
    setChallengerAction('idle');
    setOpponentAction('idle');
    setScreenFlash(null);
    // Reload history if on history tab
    if (activeView === 'history') {
      loadHistory();
    }

    // Switch back to Arena tab if this was a ranked battle
    if (wasRankedBattle && onSwitchTab) {
      onSwitchTab('arena');
    }
  };

  // Auto-play battle logs with effects - ENHANCED WITH PHYSICS (Dash & Recoil)
  useEffect(() => {
    if (battlePhase !== 'fighting' || !showBattleAnimation || battleLogs.length === 0) return;

    if (currentLogIndex < battleLogs.length) {
      const currentLog = battleLogs[currentLogIndex];
      const isAttackerChallenger = currentLog.attacker === 'challenger';
      const isCrit = currentLog.isCritical;
      const isSkill = currentLog.skillUsed;

      // ========== PHASE 1: WIND UP (Lao lên) ==========
      // Người tấn công lao lên về phía đối thủ
      if (isAttackerChallenger) {
        setChallengerAction('attackRight');
      } else {
        setOpponentAction('attackLeft');
      }

      // ========== PHASE 2: IMPACT (Va chạm) - Sau 200ms ==========
      const impactTimer = setTimeout(() => {
        // Reset vị trí người đánh về idle
        setChallengerAction('idle');
        setOpponentAction('idle');

        // Nếu né được
        if (currentLog.isDodged) {
          if (isAttackerChallenger) {
            setOpponentAction('dodge');
          } else {
            setChallengerAction('dodge');
          }

          setShowDamageNumber({
            side: isAttackerChallenger ? 'right' : 'left',
            damage: 0,
            isDodged: true
          });

          // Update HP/Mana
          setChallengerCurrentHp(currentLog.challengerHp);
          setOpponentCurrentHp(currentLog.opponentHp);
          if (currentLog.challengerMana !== undefined) setChallengerCurrentMana(currentLog.challengerMana);
          if (currentLog.opponentMana !== undefined) setOpponentCurrentMana(currentLog.opponentMana);
        }
        // Nếu trúng đòn
        else {
          // Hiển thị tên công pháp nếu có skill
          if (isSkill && currentLog.skillUsed) {
            setShowSkillName({
              name: currentLog.skillUsed,
              side: isAttackerChallenger ? 'left' : 'right'
            });
            // Tự động ẩn sau 2 giây
            setTimeout(() => setShowSkillName(null), 2000);
          }

          // Người bị đánh giật lùi (Recoil) và rung lắc
          if (isAttackerChallenger) {
            setOpponentAction('hit');
          } else {
            setChallengerAction('hit');
          }

          // Screen Flash Effect
          if (isCrit) {
            setScreenFlash('red'); // Bạo kích nháy đỏ
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 600);
          } else if (isSkill) {
            setScreenFlash('dark'); // Skill làm tối màn hình
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 400);
          } else {
            setScreenFlash('white'); // Đánh thường nháy trắng nhẹ
          }

          // Hiệu ứng chém (Slash)
          setShowSlash(isAttackerChallenger ? 'right' : 'left');

          // Hit Effect (Nổ tại vị trí người bị đánh)
          setHitEffect({
            side: isAttackerChallenger ? 'right' : 'left',
            type: isCrit ? 'crit' : isSkill ? 'skill' : 'normal'
          });

          // Hiển thị số dame
          setShowDamageNumber({
            side: isAttackerChallenger ? 'right' : 'left',
            damage: currentLog.damage,
            isCritical: isCrit,
            isSkill: isSkill
          });

          // Tạo particles nổ ra với velocity
          const particleCount = isCrit ? 30 : isSkill ? 20 : 12;
          const newParticles = Array.from({ length: particleCount }, (_, i) => ({
            id: Date.now() + i,
            x: isAttackerChallenger ? 75 : 25, // Vị trí nổ phía người bị đánh
            y: 40 + (Math.random() - 0.5) * 20,
            color: isCrit ? '#fbbf24' : isSkill ? '#38bdf8' : '#ef4444',
            type: isCrit ? 'crit' : isSkill ? 'skill' : 'normal',
            size: isCrit ? 3 : isSkill ? 2 : 1.5,
            vx: (Math.random() - 0.5) * 200, // Velocity X
            vy: (Math.random() - 0.5) * 200  // Velocity Y
          }));
          setParticles(prev => [...prev, ...newParticles]);

          // Update HP/Mana
          setChallengerCurrentHp(currentLog.challengerHp);
          setOpponentCurrentHp(currentLog.opponentHp);
          if (currentLog.challengerMana !== undefined) setChallengerCurrentMana(currentLog.challengerMana);
          if (currentLog.opponentMana !== undefined) setOpponentCurrentMana(currentLog.opponentMana);
        }
      }, 200); // Delay impact để khớp với animation lao lên

      // ========== PHASE 3: CLEANUP (Dọn dẹp hiệu ứng) ==========
      const cleanupTimer = setTimeout(() => {
        setShowSlash(null);
        setScreenFlash(null);
        setHitEffect(null);
        setShowDamageNumber(null);
        setChallengerAction('idle');
        setOpponentAction('idle');
      }, 700);

      // ========== PHASE 4: NEXT STEP ==========
      const isFinished = currentLog.challengerHp <= 0 || currentLog.opponentHp <= 0;
      const nextStepTimer = setTimeout(() => {
        if (isFinished) {
          setBattlePhase('result');
        } else {
          setCurrentLogIndex(prev => prev + 1);
        }
      }, isFinished ? 1500 : 1200); // Delay giữa các lượt

      return () => {
        clearTimeout(impactTimer);
        clearTimeout(cleanupTimer);
        clearTimeout(nextStepTimer);
      };
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

  // Backend đã merge equipment stats vào combatStats rồi
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
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { id: 'opponents', label: 'Đối Thủ' },
          { id: 'history', label: 'Lịch Sử' }
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveView(id)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeView === id
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
        <h4 className="text-sm font-bold text-amber-400 mb-3">Thông Số</h4>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="text-center p-2 bg-slate-800/50 rounded">
            <GiBroadsword size={14} className="mx-auto text-red-400 mb-1" />
            <p className="text-slate-400">Tấn Công</p>
            <p className="text-amber-300 font-bold">{currentUserStats.attack}</p>
          </div>
          <div className="text-center p-2 bg-slate-800/50 rounded">
            <GiShield size={14} className="mx-auto text-blue-400 mb-1" />
            <p className="text-slate-400">Phòng Thủ</p>
            <p className="text-amber-300 font-bold">{currentUserStats.defense}</p>
          </div>
          <div className="text-center p-2 bg-slate-800/50 rounded">
            <GiHeartBottle size={14} className="mx-auto text-pink-400 mb-1" />
            <p className="text-slate-400">Khí Huyết</p>
            <p className="text-amber-300 font-bold">{currentUserStats.qiBlood}</p>
          </div>
          <div className="text-center p-2 bg-slate-800/50 rounded">
            <GiLightningFrequency size={14} className="mx-auto text-yellow-400 mb-1" />
            <p className="text-slate-400">Tốc Độ</p>
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
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${challenging === opponent.userId
                    ? 'bg-slate-700 text-slate-400'
                    : 'bg-gradient-to-r from-red-700 to-red-900 text-red-100 hover:from-red-600 hover:to-red-800'
                    }`}
                  whileHover={{ scale: challenging ? 1 : 1.05 }}
                  whileTap={{ scale: challenging ? 1 : 0.95 }}
                >
                  {challenging === opponent.userId ? 'Đang đấu...' : 'Thách Đấu'}
                </motion.button>
              </motion.div>
            ))
          )}

          {/* Tiên Ma Section */}
          {bots.length > 0 && (
            <>
              <h4 className="text-lg font-bold text-purple-400 mt-6 mb-3 font-title">TIÊN MA</h4>
              <div className="spirit-tablet rounded-xl p-3 border border-purple-500/30 mb-4">
                <p className="text-xs text-purple-300 text-center">
                  Chú ý: Tiên Ma có <span className="text-amber-400 font-bold">chỉ số cao hơn</span> người chơi thường.
                  <span className="text-emerald-400 ml-1">Phần thưởng gấp nhiều lần</span> khi chiến thắng!
                </p>
              </div>

              {bots.map((bot, idx) => (
                <motion.div
                  key={bot.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`spirit-tablet rounded-xl p-4 border-l-4 mb-3 ${bot.isHarder ? 'border-red-500' : bot.isEasier ? 'border-green-500' : 'border-purple-500'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-900 to-slate-900 border-2 border-purple-500/60 overflow-hidden">
                      {bot.avatar ? (
                        <img src={bot.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl font-bold text-purple-300">
                          {bot.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-slate-100 truncate">{bot.name}</p>
                        {bot.isHarder && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-red-900/50 text-red-300 rounded">KHÓ</span>
                        )}
                        {bot.isEasier && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-green-900/50 text-green-300 rounded">DỄ</span>
                        )}
                      </div>
                      <p className="text-xs" style={{ color: bot.realmColor }}>
                        {bot.realmName}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-amber-400">x{bot.statMultiplier} Chỉ số</span>
                        <span className="text-[10px] text-emerald-400">x{bot.rewardMultiplier} Phần thưởng</span>
                      </div>
                    </div>
                    <motion.button
                      onClick={() => handleChallengeBot(bot.id, bot.name)}
                      disabled={challenging === bot.id}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${challenging === bot.id
                        ? 'bg-slate-700 text-slate-400'
                        : 'bg-gradient-to-r from-purple-700 to-purple-900 text-purple-100 hover:from-purple-600 hover:to-purple-800'
                        }`}
                      whileHover={{ scale: challenging ? 1 : 1.05 }}
                      whileTap={{ scale: challenging ? 1 : 0.95 }}
                    >
                      {challenging === bot.id ? 'Đang đấu...' : 'Diệt Ma'}
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </>
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
                className={`spirit-tablet rounded-xl p-4 ${battle.isDraw
                  ? 'border-l-4 border-slate-500'
                  : battle.isUserWinner
                    ? 'border-l-4 border-green-500'
                    : 'border-l-4 border-red-500'
                  }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${battle.isDraw ? 'text-slate-400' : battle.isUserWinner ? 'text-green-400' : 'text-red-400'
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
                        <GiFire size={12} />
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

      {/* Battle Animation Modal - Full featured with effects */}
      <AnimatePresence>
        {showBattleAnimation && battleResult && (
          <motion.div
            className={`fixed inset-0 z-[100] flex items-center justify-center bg-black ${isShaking ? 'animate-shake' : ''}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Screen Flash Effects - Enhanced with Physics */}
            <AnimatePresence>
              {screenFlash === 'white' && (
                <motion.div
                  className="absolute inset-0 pointer-events-none z-[150] bg-white/20"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                />
              )}
              {screenFlash === 'red' && (
                <motion.div
                  className="absolute inset-0 pointer-events-none z-[150] bg-red-500/30 mix-blend-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                />
              )}
              {screenFlash === 'dark' && (
                <motion.div
                  className="absolute inset-0 pointer-events-none z-[150] bg-black/60"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                />
              )}
            </AnimatePresence>

            {/* Background Atmosphere - Enhanced Tiên Hiệp Style (FIXED: Using useMemo) */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
              {/* Deep Sky Gradient with Nebula */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#0a0118] via-[#1a0b2e] to-[#2d1b4e]"></div>
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/40 via-transparent to-transparent"></div>

              {/* Giant Spirit Moon - Optimized for mobile */}
              {!isMobile && (
                <>
                  <motion.div
                    className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-purple-500/20 rounded-full blur-[120px] mix-blend-screen"
                    animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.7, 0.5] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.div
                    className="absolute top-[0%] left-1/2 -translate-x-1/2 w-[250px] h-[250px] bg-gradient-to-b from-purple-200 to-purple-400/0 rounded-full opacity-60 blur-3xl mix-blend-overlay"
                    animate={{ scale: [1, 1.1, 1], opacity: [0.6, 0.8, 0.6] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  />
                </>
              )}
              {/* Simplified moon for mobile */}
              {isMobile && (
                <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[200px] h-[200px] bg-purple-500/30 rounded-full blur-[40px]" />
              )}

              {/* Stars - using memoized data */}
              {starsData.map((star, i) => (
                <motion.div
                  key={`star-${i}`}
                  className="absolute w-0.5 h-0.5 bg-white rounded-full"
                  style={{ top: `${star.top}%`, left: `${star.left}%`, opacity: star.opacity }}
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: star.duration, repeat: Infinity, delay: star.delay }}
                />
              ))}

              {/* Parallax Mountains */}
              <motion.div
                className="absolute bottom-[10%] left-0 right-0 h-[50%] opacity-40"
                animate={{ x: [-20, 0] }}
                transition={{ duration: 40, repeat: Infinity, repeatType: "mirror", ease: "linear" }}
              >
                <svg viewBox="0 0 1440 320" className="w-full h-full preserve-3d scale-[1.2] origin-bottom">
                  <path fill="#130a29" fillOpacity="1" d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,224C672,245,768,267,864,261.3C960,256,1056,224,1152,197.3C1248,171,1344,149,1392,138.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                </svg>
              </motion.div>
              {!isMobile && (
                <>
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-[40%] opacity-70"
                    animate={{ x: [-40, 0] }}
                    transition={{ duration: 30, repeat: Infinity, repeatType: "mirror", ease: "linear" }}
                  >
                    <svg viewBox="0 0 1440 320" className="w-full h-full preserve-3d scale-[1.1] origin-bottom">
                      <path fill="#1e1b4b" fillOpacity="1" d="M0,192L48,202.7C96,213,192,235,288,229.3C384,224,480,192,576,176C672,160,768,160,864,181.3C960,203,1056,245,1152,250.7C1248,256,1344,224,1392,208L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                    </svg>
                  </motion.div>
                  <motion.div
                    className="absolute bottom-[-5%] left-0 right-0 h-[35%] opacity-90"
                    animate={{ x: [-60, 0] }}
                    transition={{ duration: 20, repeat: Infinity, repeatType: "mirror", ease: "linear" }}
                  >
                    <svg viewBox="0 0 1440 320" className="w-full h-full preserve-3d">
                      <path fill="#0f0518" fillOpacity="1" d="M0,128L48,154.7C96,181,192,235,288,240C384,245,480,203,576,192C672,181,768,203,864,224C960,245,1056,267,1152,261.3C1248,256,1344,224,1392,208L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                    </svg>
                  </motion.div>

                  {/* Moving Fog - Desktop only */}
                  <motion.div
                    className="absolute bottom-0 left-0 w-[200%] h-[60%] bg-gradient-to-t from-purple-900/40 via-purple-800/20 to-transparent mix-blend-screen"
                    animate={{ x: [-200, 0] }}
                    transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
                  />
                </>
              )}
              {/* Static simple gradient for mobile */}
              {isMobile && (
                <div className="absolute bottom-0 left-0 right-0 h-[50%] bg-gradient-to-t from-[#0f0518] via-[#1e1b4b]/80 to-transparent" />
              )}

              {/* Floating Rocks - using memoized data */}
              {rocksData.map((rock, i) => (
                <motion.div
                  key={`rock-${i}`}
                  className="absolute bg-slate-900/70 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                  style={{
                    width: `${rock.width}px`,
                    height: `${rock.height}px`,
                    borderRadius: rock.borderRadius,
                    top: `${rock.top}%`,
                    left: `${rock.left}%`,
                    filter: `blur(${rock.blur}px)`
                  }}
                  animate={{
                    y: [0, rock.yAnim, 0],
                    rotate: [0, rock.rotateAnim, 0],
                    scale: [1, 1.05, 1]
                  }}
                  transition={{ duration: rock.duration, repeat: Infinity, ease: "easeInOut" }}
                />
              ))}

              {/* Dust - using memoized data */}
              {dustData.map((dust, i) => (
                <motion.div
                  key={`dust-${i}`}
                  className="absolute w-0.5 h-0.5 bg-amber-200/60 rounded-full"
                  style={{ top: `${dust.top}%`, left: `${dust.left}%` }}
                  animate={{
                    y: [0, dust.yAnim],
                    x: [0, dust.xAnim],
                    opacity: [0, 0.8, 0]
                  }}
                  transition={{ duration: dust.duration, repeat: Infinity, ease: "linear", delay: dust.delay }}
                />
              ))}

              {/* Spirit Particles - using memoized data */}
              {spiritParticlesData.map((p, i) => (
                <motion.div
                  key={`spirit-${i}`}
                  className="absolute w-1 h-1 bg-amber-400/50 rounded-full blur-[1px] shadow-[0_0_5px_rgba(251,191,36,0.5)]"
                  initial={{ x: p.xStart, y: typeof window !== 'undefined' ? window.innerHeight + 50 : 800 }}
                  animate={{ y: -100, opacity: [0, 1, 0], scale: [0.5, 1.5, 0.5] }}
                  transition={{ duration: p.duration, repeat: Infinity, ease: "linear", delay: p.delay }}
                />
              ))}
            </div>

            {/* Battle Particles - Enhanced with Velocity Physics */}
            {particles.map(particle => (
              <motion.div
                key={particle.id}
                className="absolute rounded-full pointer-events-none z-40"
                style={{
                  width: `${particle.size || 2}px`,
                  height: `${particle.size || 2}px`,
                  backgroundColor: particle.color,
                  left: `${particle.x}%`,
                  top: `${particle.y}%`,
                  boxShadow: particle.type === 'crit'
                    ? `0 0 12px ${particle.color}, 0 0 24px ${particle.color}, 0 0 36px ${particle.color}`
                    : particle.type === 'skill'
                      ? `0 0 10px ${particle.color}, 0 0 20px ${particle.color}`
                      : `0 0 6px ${particle.color}, 0 0 12px ${particle.color}`
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  x: particle.vx || (Math.random() - 0.5) * 200, // Use velocity if available
                  y: particle.vy || (Math.random() - 0.5) * 200 - 100,
                  scale: [0, particle.type === 'crit' ? 2.5 : particle.type === 'skill' ? 2 : 1.5, 0],
                  opacity: [1, 0.8, 0]
                }}
                transition={{
                  duration: 0.6,
                  ease: "easeOut"
                }}
              />
            ))}

            {/* Hit Effects - Enhanced Tiên Hiệp Shockwaves */}
            <AnimatePresence>
              {hitEffect && (
                <motion.div
                  className={`absolute pointer-events-none z-[60] ${hitEffect.side === 'right' ? 'right-[20%]' : 'left-[20%]'
                    }`}
                  style={{ top: '35%' }}
                  initial={{ opacity: 1, scale: 0, rotate: 0 }}
                  animate={{
                    opacity: [1, 0.8, 0],
                    scale: hitEffect.type === 'crit' ? [0, 3, 3.5] : hitEffect.type === 'skill' ? [0, 2.5, 3] : [0, 1.8, 2],
                    rotate: [0, 180, 360]
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: hitEffect.type === 'crit' ? 0.6 : 0.5 }}
                  onAnimationComplete={() => setHitEffect(null)}
                >
                  {/* Core Energy Burst - Multiple Layers */}
                  <motion.div
                    className={`rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 blur-xl ${hitEffect.type === 'crit'
                      ? 'bg-gradient-radial from-yellow-300 via-yellow-500 to-yellow-700'
                      : hitEffect.type === 'skill'
                        ? 'bg-gradient-radial from-amber-300 via-amber-500 to-amber-700'
                        : 'bg-gradient-radial from-cyan-200 via-cyan-400 to-blue-500'
                      }`}
                    style={{
                      width: hitEffect.type === 'crit' ? '120px' : hitEffect.type === 'skill' ? '100px' : '80px',
                      height: hitEffect.type === 'crit' ? '120px' : hitEffect.type === 'skill' ? '100px' : '80px',
                      opacity: 0.9
                    }}
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.9, 1, 0.7]
                    }}
                    transition={{ duration: 0.3, repeat: 2 }}
                  />

                  {/* Shockwave Rings - Multiple Expanding Rings */}
                  {[1, 2, 3].map((ring, idx) => (
                    <motion.div
                      key={ring}
                      className={`rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-2 ${hitEffect.type === 'crit'
                        ? 'border-yellow-400'
                        : hitEffect.type === 'skill'
                          ? 'border-amber-400'
                          : 'border-cyan-300'
                        }`}
                      style={{
                        width: `${80 + ring * 40}px`,
                        height: `${80 + ring * 40}px`,
                        opacity: 0.7 - idx * 0.2
                      }}
                      initial={{ scale: 0, opacity: 0.7 - idx * 0.2 }}
                      animate={{
                        scale: [0, 1.5 + ring * 0.3],
                        opacity: [0.7 - idx * 0.2, 0]
                      }}
                      transition={{
                        duration: 0.5 + idx * 0.1,
                        delay: idx * 0.05
                      }}
                    />
                  ))}

                  {/* Energy Rays - Spiral Effect for Crit/Skill */}
                  {(hitEffect.type === 'crit' || hitEffect.type === 'skill') && (
                    <>
                      {[...Array(8)].map((_, i) => (
                        <motion.div
                          key={`ray-${i}`}
                          className={`absolute top-1/2 left-1/2 origin-bottom ${hitEffect.type === 'crit' ? 'bg-yellow-400' : 'bg-amber-400'
                            }`}
                          style={{
                            width: '4px',
                            height: hitEffect.type === 'crit' ? '120px' : '100px',
                            transformOrigin: 'bottom center',
                            opacity: 0.8,
                            rotate: i * 45,
                            filter: 'blur(2px)'
                          }}
                          initial={{ scaleY: 0, opacity: 0 }}
                          animate={{
                            scaleY: [0, 1, 0],
                            opacity: [0, 0.8, 0]
                          }}
                          transition={{
                            duration: 0.6,
                            delay: i * 0.05
                          }}
                        />
                      ))}
                      {/* Radial Glow */}
                      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-radial ${hitEffect.type === 'crit'
                        ? 'from-yellow-500/40 via-yellow-400/20 to-transparent'
                        : 'from-amber-500/40 via-amber-400/20 to-transparent'
                        } blur-2xl`} />
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Damage Number Floating - Enhanced with Physics Bounce */}
            <AnimatePresence>
              {showDamageNumber && (
                <motion.div
                  className={`absolute z-[200] pointer-events-none font-black text-4xl sm:text-6xl font-title tracking-wider ${showDamageNumber.side === 'right' ? 'right-[20%] text-right' : 'left-[20%] text-left'
                    }`}
                  style={{ top: '25%' }}
                  initial={{ opacity: 0, y: 0, scale: 0.5 }}
                  animate={{
                    opacity: 1,
                    y: -100, // Nảy lên
                    scale: showDamageNumber.isCritical ? 1.5 : showDamageNumber.isSkill ? 1.3 : 1.2
                  }}
                  exit={{ opacity: 0, y: -150 }}
                  transition={{
                    opacity: {
                      duration: 0.3,
                      ease: "easeOut"
                    },
                    y: {
                      type: "spring",
                      bounce: 0.5, // Physics bounce effect
                      stiffness: 200,
                      duration: 0.8
                    },
                    scale: {
                      type: "spring",
                      bounce: 0.4,
                      stiffness: 300,
                      duration: 0.6
                    }
                  }}
                >
                  {showDamageNumber.isDodged ? (
                    <div className="flex flex-col items-center gap-2">
                      <motion.span
                        className="text-2xl sm:text-3xl md:text-4xl font-bold text-cyan-400 font-title tracking-wider"
                        style={{
                          textShadow: '0 0 20px rgba(34,211,238,1), 0 0 40px rgba(34,211,238,0.8), 0 0 60px rgba(34,211,238,0.6)',
                          filter: 'drop-shadow(0 0 10px rgba(34,211,238,0.9))'
                        }}
                        animate={{
                          scale: [1, 1.2, 1],
                          opacity: [1, 0.9, 1]
                        }}
                        transition={{ duration: 0.5, repeat: 2 }}
                      >
                        NÉ TRÁNH!
                      </motion.span>
                      <motion.div
                        className="h-1 w-16 sm:w-20 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: [0, 1, 0] }}
                        transition={{ duration: 0.6 }}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <motion.span
                        className={`text-3xl sm:text-4xl md:text-5xl font-bold font-mono ${showDamageNumber.isCritical
                          ? 'text-yellow-200'
                          : showDamageNumber.isSkill
                            ? 'text-amber-200'
                            : 'text-red-200'
                          }`}
                        style={{
                          textShadow: showDamageNumber.isCritical
                            ? '0 0 25px rgba(250,204,21,1), 0 0 50px rgba(250,204,21,0.8), 0 0 75px rgba(250,204,21,0.6)'
                            : showDamageNumber.isSkill
                              ? '0 0 20px rgba(251,191,36,1), 0 0 40px rgba(251,191,36,0.8)'
                              : '0 0 15px rgba(248,113,113,1), 0 0 30px rgba(248,113,113,0.8)',
                          filter: 'drop-shadow(0 0 8px currentColor)'
                        }}
                        animate={{
                          scale: showDamageNumber.isCritical ? [1, 1.3, 1.1] : [1, 1.2, 1],
                          y: [0, -5, 0]
                        }}
                        transition={{ duration: 0.6, repeat: showDamageNumber.isCritical ? 3 : 1 }}
                      >
                        -{showDamageNumber.damage}
                      </motion.span>
                      {showDamageNumber.isCritical && (
                        <motion.span
                          className="text-xs sm:text-sm font-bold text-yellow-300 bg-gradient-to-r from-yellow-500/40 via-yellow-400/50 to-yellow-500/40 px-3 py-1 rounded-full border-2 border-yellow-400/70 backdrop-blur-sm"
                          style={{
                            boxShadow: '0 0 15px rgba(250,204,21,0.6), inset 0 0 10px rgba(250,204,21,0.3)'
                          }}
                          animate={{
                            scale: [1, 1.1, 1],
                            opacity: [1, 0.9, 1]
                          }}
                          transition={{ duration: 0.4, repeat: Infinity }}
                        >
                          CHÍ MẠNG!
                        </motion.span>
                      )}
                      {showDamageNumber.isSkill && !showDamageNumber.isCritical && (
                        <motion.span
                          className="text-xs sm:text-sm font-bold text-amber-300 bg-gradient-to-r from-amber-500/40 via-amber-400/50 to-amber-500/40 px-3 py-1 rounded-full border-2 border-amber-400/70 backdrop-blur-sm"
                          style={{
                            boxShadow: '0 0 12px rgba(251,191,36,0.5), inset 0 0 8px rgba(251,191,36,0.3)'
                          }}
                        >
                          CÔNG PHÁP
                        </motion.span>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Slash Effects - Enhanced Kiếm Khí (Sword Qi) with SVG Arc */}
            <AnimatePresence>
              {showSlash && (
                <motion.div
                  className={`absolute top-1/2 -translate-y-1/2 pointer-events-none z-50 ${showSlash === 'right' ? 'right-[20%]' : 'left-[20%]'
                    }`}
                  initial={{ opacity: 0, scale: 0.5, x: showSlash === 'right' ? -100 : 100 }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0.5, 1.5, 2],
                    x: 0
                  }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  {/* SVG Arc - Vết chém hình bán nguyệt sắc bén */}
                  <svg
                    width="300"
                    height="300"
                    viewBox="0 0 100 100"
                    className={`transform ${showSlash === 'right' ? '' : 'scale-x-[-1]'}`}
                  >
                    {/* Outer Arc - Main Slash */}
                    <path
                      d="M 20 20 Q 80 50 20 80"
                      fill="none"
                      stroke={screenFlash === 'red' ? '#fbbf24' : '#38bdf8'}
                      strokeWidth="3"
                      className="drop-shadow-[0_0_10px_rgba(56,189,248,0.8)]"
                      style={{ filter: 'drop-shadow(0 0 8px currentColor)' }}
                    />
                    {/* Inner Arc - Bright Core */}
                    <path
                      d="M 25 25 Q 75 50 25 75"
                      fill="none"
                      stroke="white"
                      strokeWidth="4"
                      className="blur-[1px]"
                      opacity="0.9"
                    />
                    {/* Glow Effect */}
                    <path
                      d="M 20 20 Q 80 50 20 80"
                      fill="none"
                      stroke={screenFlash === 'red' ? '#fbbf24' : '#38bdf8'}
                      strokeWidth="1"
                      opacity="0.5"
                      className="blur-[3px]"
                    />
                  </svg>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Battle Content - No Card, Full Background */}
            <motion.div
              className="relative w-full max-w-5xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8"
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Battle Header */}
              <motion.div
                className="text-center mb-4 sm:mb-6"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {battlePhase === 'fighting' && (
                  <p className="text-sm sm:text-base text-slate-300 mb-2 animate-pulse">
                    Đang giao chiến...
                  </p>
                )}
                <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-amber-400 to-red-400 font-title tracking-wide sm:tracking-wider">
                  {battlePhase === 'intro' ? 'LUẬN KIẾM ĐÀI' :
                    battlePhase === 'fighting' ? `HIỆP ${currentLogIndex + 1}` :
                      'KẾT QUẢ'}
                </h3>
              </motion.div>

              {/* Main Content - New Layout: 2 Characters Facing Each Other */}
              <div className="relative flex justify-between items-center px-4 sm:px-8 md:px-12 lg:px-16 min-h-[400px] sm:min-h-[500px]">
                {/* Left Side - Challenger */}
                <div className="relative flex flex-col items-center z-10">
                  {/* HP Bar - Above Avatar */}
                  <div className="w-32 sm:w-40 md:w-48 mb-2">
                    <div className="relative bg-slate-900/80 h-3 sm:h-4 rounded-full overflow-hidden border-2 border-slate-700 shadow-lg">
                      <motion.div
                        className="h-full bg-gradient-to-r from-green-600 to-green-400"
                        initial={{ width: '100%' }}
                        animate={{
                          width: `${Math.max(0, (challengerCurrentHp / battleResult.challenger.stats.qiBlood) * 100)}%`
                        }}
                        transition={{ duration: 0.3 }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[8px] sm:text-[10px] font-bold text-white drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]">
                          {Math.round(challengerCurrentHp)}/{battleResult.challenger.stats.qiBlood}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mana Bar - Below HP */}
                  <div className="w-32 sm:w-40 md:w-48 mb-3">
                    <div className="relative bg-slate-900/80 h-2 sm:h-3 rounded-full overflow-hidden border-2 border-slate-700 shadow-lg">
                      <motion.div
                        className="h-full bg-gradient-to-r from-blue-600 to-cyan-400"
                        initial={{ width: '100%' }}
                        animate={{
                          width: `${Math.max(0, (challengerCurrentMana / battleResult.challenger.stats.zhenYuan) * 100)}%`
                        }}
                        transition={{ duration: 0.3 }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[7px] sm:text-[9px] font-bold text-white drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]">
                          {Math.round(challengerCurrentMana)}/{battleResult.challenger.stats.zhenYuan}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Avatar with Glow */}
                  <motion.div
                    variants={characterVariants}
                    animate={challengerAction}
                    className={`relative w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full border-4 overflow-hidden shadow-[0_0_30px_rgba(59,130,246,0.5)] ${battlePhase === 'result' && battleResult.winner === 'challenger'
                      ? 'border-green-400 ring-4 ring-green-400/50'
                      : 'border-blue-400'
                      }`}
                  >
                    {/* Outer Glow Effect */}
                    <div className="absolute inset-0 bg-black dark:bg-white/30 blur-2xl -z-10 rounded-full" />

                    {/* Aura effect when attacking */}
                    {challengerAction.toString().includes('attack') && (
                      <div className="absolute inset-0 bg-black dark:bg-white/60 blur-xl rounded-full scale-150 animate-pulse -z-10" />
                    )}

                    {battleResult.challenger.avatar ? (
                      <img
                        src={battleResult.challenger.avatar || getUserAvatarUrl({ name: battleResult.challenger.username })}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-3xl sm:text-4xl md:text-5xl text-black font-bold">
                        {battleResult.challenger.username?.charAt(0)?.toUpperCase()}
                        {battleResult.challenger.username?.charAt(1)?.toUpperCase()}
                      </div>
                    )}
                  </motion.div>

                  {/* Name Below Avatar */}
                  <p className="mt-4 font-bold text-white text-lg sm:text-xl md:text-2xl drop-shadow-lg">
                    {battleResult.challenger.username}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    {battleResult.challenger.stats.realmName}
                  </p>
                </div>

                {/* Right Side - Opponent */}
                <div className="relative flex flex-col items-center z-10">
                  {/* HP Bar - Above Avatar */}
                  <div className="w-32 sm:w-40 md:w-48 mb-2">
                    <div className="relative bg-slate-900/80 h-3 sm:h-4 rounded-full overflow-hidden border-2 border-slate-700 shadow-lg">
                      <motion.div
                        className="h-full bg-gradient-to-r from-red-600 to-red-400"
                        initial={{ width: '100%' }}
                        animate={{
                          width: `${Math.max(0, (opponentCurrentHp / battleResult.opponent.stats.qiBlood) * 100)}%`
                        }}
                        transition={{ duration: 0.3 }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[8px] sm:text-[10px] font-bold text-white drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]">
                          {Math.round(opponentCurrentHp)}/{battleResult.opponent.stats.qiBlood}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mana Bar - Below HP */}
                  <div className="w-32 sm:w-40 md:w-48 mb-3">
                    <div className="relative bg-slate-900/80 h-2 sm:h-3 rounded-full overflow-hidden border-2 border-slate-700 shadow-lg">
                      <motion.div
                        className="h-full bg-gradient-to-r from-blue-600 to-cyan-400"
                        initial={{ width: '100%' }}
                        animate={{
                          width: `${Math.max(0, (opponentCurrentMana / battleResult.opponent.stats.zhenYuan) * 100)}%`
                        }}
                        transition={{ duration: 0.3 }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[7px] sm:text-[9px] font-bold text-white drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]">
                          {Math.round(opponentCurrentMana)}/{battleResult.opponent.stats.zhenYuan}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Avatar with Glow */}
                  <motion.div
                    variants={characterVariants}
                    animate={opponentAction}
                    className={`relative w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full border-4 overflow-hidden shadow-[0_0_30px_rgba(239,68,68,0.5)] ${battlePhase === 'result' && battleResult.winner === 'opponent'
                      ? 'border-green-400 ring-4 ring-green-400/50'
                      : 'border-red-400'
                      }`}
                  >
                    {/* Outer Glow Effect */}
                    <div className="absolute inset-0 bg-red-500/30 blur-2xl -z-10 rounded-full" />

                    {/* Aura effect when attacking */}
                    {opponentAction.toString().includes('attack') && (
                      <div className="absolute inset-0 bg-red-500/60 blur-xl rounded-full scale-150 animate-pulse -z-10" />
                    )}

                    {battleResult.opponent.avatar ? (
                      <img
                        src={battleResult.opponent.avatar || getUserAvatarUrl({ name: battleResult.opponent.username })}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-3xl sm:text-4xl md:text-5xl text-black font-bold">
                        {battleResult.opponent.username?.charAt(0)?.toUpperCase()}
                        {battleResult.opponent.username?.charAt(1)?.toUpperCase()}
                      </div>
                    )}
                  </motion.div>

                  {/* Name Below Avatar */}
                  <p className="mt-4 font-bold text-white text-lg sm:text-xl md:text-2xl drop-shadow-lg">
                    {battleResult.opponent.username}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    {battleResult.opponent.stats.realmName}
                  </p>
                </div>
              </div>

              {/* Result Overlay - Tiên Hiệp Style (Thánh Chỉ/Bảng Vàng) */}
              <AnimatePresence>
                {battlePhase === 'result' && (
                  <motion.div
                    className="absolute inset-0 z-[70] flex flex-col items-center justify-center bg-black/95"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Scroll Container - Thánh Chỉ Style */}
                    <motion.div
                      className="relative w-full max-w-sm mx-4 bg-[#1a103c] border-2 border-amber-600/50 rounded-xl shadow-xl overflow-hidden"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* Decorative Header */}
                      <div className="bg-gradient-to-r from-amber-900/80 via-amber-700/80 to-amber-900/80 p-3 text-center border-b-2 border-amber-500/50">
                        <h3 className="text-amber-100 font-bold font-title tracking-widest text-base sm:text-lg">KẾT QUẢ TỶ THÍ</h3>
                      </div>

                      {/* Main Body */}
                      <div className="p-6 flex flex-col items-center gap-6 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDAgTCA0MCAwIEwgNDAgNDAgTCAwIDQwIFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIwLjUiIG9wYWNpdHk9IjAuMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')]">

                        {/* Stamp Animation - Đóng Dấu */}
                        <motion.div
                          initial={{ scale: 3, opacity: 0, rotate: -20 }}
                          animate={{ scale: 1, opacity: 1, rotate: -5 }}
                          transition={{ type: 'spring', bounce: 0.5, duration: 0.8 }}
                          className={`border-4 rounded-lg p-4 sm:p-5 rotate-[-5deg] backdrop-blur-sm shadow-xl
                            ${battleResult.isDraw
                              ? 'border-slate-500 bg-slate-900/20'
                              : battleResult.winner === 'challenger'
                                ? 'border-red-500 bg-red-900/20'
                                : 'border-red-500 bg-red-900/20'}
                          `}
                        >
                          <h2 className={`text-3xl sm:text-4xl md:text-5xl font-black font-title uppercase tracking-widest text-center
                            ${battleResult.isDraw
                              ? 'text-slate-300 drop-shadow-[0_0_15px_rgba(148,163,184,0.8)]'
                              : 'text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]'}
                          `}>
                            {battleResult.isDraw ? 'HÒA' : battleResult.winner === 'challenger' ? 'ĐẠI THẮNG' : 'BẠI TRẬN'}
                          </h2>
                        </motion.div>

                        {/* Rewards Section - Chiến Lợi Phẩm (only for normal battles with rewards) */}
                        {battleResult.rewards && (
                          <div className="w-full bg-black/40 rounded-lg p-3 sm:p-4 border border-white/10">
                            <p className="text-center text-amber-200/80 text-xs uppercase mb-3 tracking-widest">
                              Chiến Lợi Phẩm
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="flex flex-col items-center p-2 sm:p-3 bg-slate-800/50 rounded border border-slate-700/50">
                                <span className="text-xs text-slate-400 mb-1">Tu Vi</span>
                                <span className="font-bold text-purple-300 text-sm sm:text-base">
                                  +{battleResult.winner === 'challenger' || battleResult.isDraw
                                    ? battleResult.rewards.winnerExp
                                    : battleResult.rewards.loserExp}
                                </span>
                              </div>
                              {(battleResult.winner === 'challenger' || battleResult.isDraw) && battleResult.rewards.winnerSpiritStones > 0 && (
                                <div className="flex flex-col items-center p-2 sm:p-3 bg-slate-800/50 rounded border border-slate-700/50">
                                  <span className="text-xs text-slate-400 mb-1">Linh Thạch</span>
                                  <span className="font-bold text-yellow-300 text-sm sm:text-base">
                                    +{battleResult.rewards.winnerSpiritStones}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* MMR Change Section - For ranked Arena battles */}
                        {battleResult.challenger?.mmrChange !== undefined && (
                          <div className="w-full bg-black/40 rounded-lg p-3 sm:p-4 border border-white/10">
                            <p className="text-center text-amber-200/80 text-xs uppercase mb-3 tracking-widest">
                              Xếp Hạng
                            </p>
                            <div className="flex justify-center items-center gap-4">
                              <div className="flex flex-col items-center">
                                <span className="text-xs text-slate-400 mb-1">MMR</span>
                                <span className={`font-bold text-lg ${battleResult.challenger.mmrChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {battleResult.challenger.mmrChange >= 0 ? '+' : ''}{battleResult.challenger.mmrChange}
                                </span>
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="text-xs text-slate-400 mb-1">MMR Mới</span>
                                <span className="font-bold text-lg text-amber-300">
                                  {battleResult.challenger.newMmr}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Action Button */}
                        <motion.button
                          onClick={closeBattleResult}
                          className="w-full py-3 bg-gradient-to-r from-amber-700 to-amber-900 text-amber-100 font-bold rounded-lg border border-amber-500/30 shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {battleResult.winner === 'challenger' ? 'Thu Thập & Rời Đi' : 'Rời Khỏi'}
                        </motion.button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Skill Name Display - Anime Style */}
              <AnimatePresence>
                {showSkillName && (
                  <motion.div
                    className={`absolute top-1/2 -translate-y-1/2 z-[80] pointer-events-none ${showSkillName.side === 'left' ? 'left-[10%]' : 'right-[10%]'
                      }`}
                    initial={{ opacity: 0, scale: 0.3, y: 50, rotateX: -90 }}
                    animate={{
                      opacity: [0, 1, 1, 0],
                      scale: [0.3, 1.2, 1, 0.9],
                      y: [50, 0, 0, -30],
                      rotateX: [-90, 0, 0, 0]
                    }}
                    exit={{ opacity: 0, scale: 0.5, y: -50 }}
                    transition={{
                      duration: 2,
                      times: [0, 0.2, 0.8, 1],
                      ease: [0.34, 1.56, 0.64, 1] // Bounce effect
                    }}
                  >
                    {/* Outer Glow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 blur-3xl opacity-60 scale-150 animate-pulse" />

                    {/* Main Text Container */}
                    <div className="relative">
                      {/* Background with gradient border */}
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-600/90 via-yellow-500/90 to-amber-600/90 blur-sm scale-110" />
                      <div className="relative bg-gradient-to-r from-amber-800/95 via-yellow-700/95 to-amber-800/95 px-8 sm:px-12 md:px-16 py-4 sm:py-6 md:py-8 rounded-lg sm:rounded-xl border-4 border-amber-300/80 shadow-[0_0_40px_rgba(251,191,36,0.8),inset_0_0_20px_rgba(251,191,36,0.3)]">
                        {/* Decorative lines */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-200 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-200 to-transparent" />

                        {/* Skill Name Text */}
                        <motion.h2
                          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black font-title text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-white to-yellow-200 text-center tracking-wider drop-shadow-[0_0_20px_rgba(251,191,36,1)]"
                          animate={{
                            textShadow: [
                              '0 0 20px rgba(251,191,36,1), 0 0 40px rgba(251,191,36,0.8)',
                              '0 0 30px rgba(251,191,36,1), 0 0 60px rgba(251,191,36,1)',
                              '0 0 20px rgba(251,191,36,1), 0 0 40px rgba(251,191,36,0.8)'
                            ]
                          }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          {showSkillName.name}
                        </motion.h2>

                        {/* Subtitle */}
                        <motion.p
                          className="text-xs sm:text-sm md:text-base text-amber-200 text-center mt-2 font-bold uppercase tracking-[0.3em]"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0, 1, 1, 0] }}
                          transition={{ delay: 0.3, duration: 1.7 }}
                        >
                          CÔNG PHÁP
                        </motion.p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Close/Skip Button */}
              <motion.button
                onClick={battlePhase === 'result' ? closeBattleResult : skipToResult}
                className="w-full py-3 mt-4 sm:mt-6 bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white rounded-lg sm:rounded-xl font-bold text-sm sm:text-base hover:from-red-600 hover:via-red-500 hover:to-red-600 transition-all shadow-lg active:scale-95"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: battlePhase === 'result' ? 0.8 : 0 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {battlePhase === 'result' ? 'Đóng' : 'Bỏ qua'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div >
  );
});

export default PKTab;
