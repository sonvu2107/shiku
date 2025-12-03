/**
 * PK Tab - Battle Arena Component
 * ~940 lines - Complex battle system with animations
 * 
 * Features:
 * - Opponents list with challenge functionality
 * - Battle history with stats summary
 * - Ranking leaderboard
 * - Full battle animation with effects (particles, slash, damage numbers)
 */
import { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sword, Shield, Droplet, Zap, Flame } from 'lucide-react';
import { useCultivation } from '../../../hooks/useCultivation.jsx';
import { api } from '../../../api';
import { getUserAvatarUrl } from '../../../utils/avatarUtils.js';
import { getCombatStats } from '../utils/helpers.js';

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
  const [hitEffect, setHitEffect] = useState(null); // { side: 'left'|'right', type: 'normal'|'crit'|'skill' }
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

        // Trigger Hit Effect on target (opposite side of attacker)
        setTimeout(() => {
          setHitEffect({
            side: isAttackerChallenger ? 'right' : 'left',
            type: currentLog.isCritical ? 'crit' : currentLog.skillUsed ? 'skill' : 'normal'
          });
        }, 150); // Sync with slash impact

        // Show damage number on the target side
        setTimeout(() => {
          setShowDamageNumber({
            side: isAttackerChallenger ? 'right' : 'left',
            damage: currentLog.damage,
            isCritical: currentLog.isCritical,
            isSkill: currentLog.skillUsed
          });

          // Update HP dựa trên log từ server (chính xác hơn)
          setChallengerCurrentHp(currentLog.challengerHp);
          setOpponentCurrentHp(currentLog.opponentHp);
        }, 200);

        // Shake on critical
        if (currentLog.isCritical) {
          setIsShaking(true);
          // Create particles on critical hit
          const newParticles = Array.from({ length: 15 }, (_, i) => ({
            id: Date.now() + i,
            x: isAttackerChallenger ? 75 : 25,
            y: 40 + Math.random() * 20,
            color: currentLog.skillUsed ? '#f59e0b' : currentLog.isCritical ? '#fbbf24' : '#ef4444'
          }));
          setParticles(prev => [...prev, ...newParticles]);
          setTimeout(() => setIsShaking(false), 400); // Longer shake
        }

        setTimeout(() => setShowSlash(null), 400);
        setTimeout(() => setShowDamageNumber(null), 800);
        setTimeout(() => setHitEffect(null), 500);
      } else if (currentLog.isDodged) {
        // Show dodge effect
        setShowDamageNumber({
          side: isAttackerChallenger ? 'right' : 'left',
          damage: 0,
          isDodged: true
        });

        // Update HP ngay cả khi dodge (HP không đổi nhưng cần sync với server)
        setChallengerCurrentHp(currentLog.challengerHp);
        setOpponentCurrentHp(currentLog.opponentHp);

        setTimeout(() => setShowDamageNumber(null), 800);
      }

      // Kiểm tra xem có ai hết máu không - dừng animation ngay
      const shouldStop = currentLog.challengerHp <= 0 || currentLog.opponentHp <= 0;

      const timer = setTimeout(() => {
        if (shouldStop) {
          // Nếu có người hết máu, chuyển sang result ngay
          setBattlePhase('result');
        } else {
          // Tiếp tục log tiếp theo
          setCurrentLogIndex(prev => prev + 1);
        }
      }, shouldStop ? 1500 : 1000); // Dừng lâu hơn nếu kết thúc
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
        <h4 className="text-sm font-bold text-amber-400 mb-3">Thông Số Chiến Đấu</h4>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="text-center p-2 bg-slate-800/50 rounded">
            <Sword size={14} className="mx-auto text-red-400 mb-1" />
            <p className="text-slate-400">Tấn Công</p>
            <p className="text-amber-300 font-bold">{currentUserStats.attack}</p>
          </div>
          <div className="text-center p-2 bg-slate-800/50 rounded">
            <Shield size={14} className="mx-auto text-blue-400 mb-1" />
            <p className="text-slate-400">Phòng Thủ</p>
            <p className="text-amber-300 font-bold">{currentUserStats.defense}</p>
          </div>
          <div className="text-center p-2 bg-slate-800/50 rounded">
            <Droplet size={14} className="mx-auto text-pink-400 mb-1" />
            <p className="text-slate-400">Khí Huyết</p>
            <p className="text-amber-300 font-bold">{currentUserStats.qiBlood}</p>
          </div>
          <div className="text-center p-2 bg-slate-800/50 rounded">
            <Zap size={14} className="mx-auto text-yellow-400 mb-1" />
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
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-amber-500 text-black' :
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

      {/* Battle Animation Modal - Full featured with effects */}
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

            {/* Battle Particles - Enhanced (Mystical Sparks) */}
            {particles.map(particle => (
              <motion.div
                key={particle.id}
                className="absolute w-1.5 h-1.5 rounded-full pointer-events-none"
                style={{
                  backgroundColor: particle.color,
                  left: `${particle.x}%`,
                  top: `${particle.y}%`,
                  boxShadow: `0 0 8px ${particle.color}, 0 0 15px ${particle.color}`
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  x: (Math.random() - 0.5) * 200,
                  y: (Math.random() - 0.5) * 200 - 100, // Float up slightly
                  scale: [0, 1.5, 0],
                  opacity: [0, 1, 0]
                }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              />
            ))}

            {/* Hit Effects - Shockwaves/Bursts (Tu Tien Style) */}
            <AnimatePresence>
              {hitEffect && (
                <motion.div
                  className={`absolute pointer-events-none z-[60] ${hitEffect.side === 'right' ? 'right-[20%]' : 'left-[20%]'
                    }`}
                  style={{ top: '35%' }}
                  initial={{ opacity: 1, scale: 0 }}
                  animate={{ opacity: 0, scale: hitEffect.type === 'crit' ? 2.5 : 1.5 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  onAnimationComplete={() => setHitEffect(null)}
                >
                  {/* Core Burst */}
                  <div className={`rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${hitEffect.type === 'crit' ? 'bg-yellow-400' : hitEffect.type === 'skill' ? 'bg-amber-400' : 'bg-cyan-100'
                    } blur-md w-20 h-20 opacity-80`} />

                  {/* Shockwave Ring */}
                  <div className={`rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-4 ${hitEffect.type === 'crit' ? 'border-yellow-500' : hitEffect.type === 'skill' ? 'border-amber-500' : 'border-cyan-400'
                    } w-32 h-32 opacity-60`} />

                  {/* Energy Rays for Crit/Skill */}
                  {(hitEffect.type === 'crit' || hitEffect.type === 'skill') && (
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-radial ${hitEffect.type === 'crit' ? 'from-yellow-500/50' : 'from-amber-500/50'
                      } to-transparent blur-xl`} />
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Damage Number Floating */}
            <AnimatePresence>
              {showDamageNumber && (
                <motion.div
                  className={`absolute z-[200] pointer-events-none ${showDamageNumber.side === 'right' ? 'right-[20%]' : 'left-[20%]'
                    }`}
                  style={{ top: '35%' }}
                  initial={{ opacity: 0, y: 0, scale: 0.5 }}
                  animate={{ opacity: 1, y: -30, scale: showDamageNumber.isCritical ? 1.5 : 1.2 }}
                  exit={{ opacity: 0, y: -60 }}
                  transition={{ duration: 0.5 }}
                >
                  {showDamageNumber.isDodged ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xl sm:text-2xl md:text-3xl font-bold text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.9)] font-title tracking-wider">
                        NÉ TRÁNH!
                      </span>
                      <div className="h-0.5 w-12 sm:w-16 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <span className={`text-2xl sm:text-3xl md:text-4xl font-bold drop-shadow-lg font-mono ${showDamageNumber.isCritical
                        ? 'text-yellow-300 drop-shadow-[0_0_20px_rgba(250,204,21,1)] animate-pulse'
                        : showDamageNumber.isSkill
                          ? 'text-amber-300 drop-shadow-[0_0_15px_rgba(251,191,36,0.9)]'
                          : 'text-red-300 drop-shadow-[0_0_12px_rgba(248,113,113,0.9)]'
                        }`}>
                        -{showDamageNumber.damage}
                      </span>
                      {showDamageNumber.isCritical && (
                        <span className="text-xs font-bold text-yellow-400 bg-yellow-500/30 px-2 py-0.5 rounded-full border border-yellow-400/50 animate-pulse">
                          CHÍ MẠNG!
                        </span>
                      )}
                      {showDamageNumber.isSkill && !showDamageNumber.isCritical && (
                        <span className="text-xs font-bold text-amber-400 bg-amber-500/30 px-2 py-0.5 rounded-full border border-amber-400/50">
                          CÔNG PHÁP
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Slash Effects - Sword Qi (Kiem Khi) */}
            <AnimatePresence>
              {showSlash === 'right' && (
                <motion.div
                  className="absolute right-[25%] top-1/2 -translate-y-1/2 pointer-events-none z-50"
                  initial={{ opacity: 0, scale: 0.5, rotate: -45, x: -50 }}
                  animate={{ opacity: [0, 1, 0], scale: 2, x: 50 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  {/* Sword Beam */}
                  <div className="relative w-64 h-3 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_rgba(34,211,238,0.8)] rounded-full blur-[1px]"></div>
                  <div className="absolute top-0 left-0 w-64 h-3 bg-white/60 rounded-full blur-[0.5px] mix-blend-overlay"></div>
                </motion.div>
              )}
              {showSlash === 'left' && (
                <motion.div
                  className="absolute left-[25%] top-1/2 -translate-y-1/2 pointer-events-none z-50"
                  initial={{ opacity: 0, scale: 0.5, rotate: 45, x: 50 }}
                  animate={{ opacity: [0, 1, 0], scale: 2, x: -50 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  {/* Sword Beam */}
                  <div className="relative w-64 h-3 bg-gradient-to-l from-transparent via-red-500 to-transparent shadow-[0_0_15px_rgba(239,68,68,0.8)] rounded-full blur-[1px]"></div>
                  <div className="absolute top-0 left-0 w-64 h-3 bg-white/60 rounded-full blur-[0.5px] mix-blend-overlay"></div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Battle Card - Optimized for Mobile */}
            <motion.div
              className="relative w-full max-w-5xl mx-1 sm:mx-2 md:mx-4 bg-gradient-to-b from-[#0f172a] to-[#1e1b4b] border-2 border-red-600/50 rounded-lg sm:rounded-xl md:rounded-2xl p-2 sm:p-3 md:p-4 lg:p-5 shadow-[0_0_100px_rgba(220,38,38,0.3)] max-h-[95vh] sm:max-h-[90vh] md:max-h-[85vh] overflow-hidden"
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Battle Header */}
              <motion.div
                className="text-center mb-2 sm:mb-3 md:mb-4"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-amber-400 to-red-400 font-title tracking-wide sm:tracking-wider">
                  {battlePhase === 'intro' ? 'LUẬN KIẾM ĐÀI' :
                    battlePhase === 'fighting' ? `LƯỢT ${currentLogIndex + 1}/${battleLogs.length}` :
                      'KẾT QUẢ'}
                </h3>
              </motion.div>

              {/* Main Content - Optimized Layout */}
              <div className="flex flex-col md:flex-row gap-2 sm:gap-3 md:gap-4">
                {/* Left Side - Combatants */}
                <div className="flex-shrink-0 w-full md:w-72 order-2 md:order-1">
                  {/* Combatants Arena - Compact on Mobile */}
                  <div className="flex flex-col gap-1.5 sm:gap-2">
                    {/* Challenger */}
                    <motion.div
                      className={`p-1.5 sm:p-2 md:p-3 rounded-md sm:rounded-lg md:rounded-xl bg-gradient-to-br from-blue-900/40 to-slate-900/40 border ${battlePhase === 'result' && battleResult.winner === 'challenger'
                        ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                        : 'border-blue-500/30'
                        }`}
                      animate={battlePhase === 'fighting' && battleLogs[currentLogIndex]?.attacker === 'challenger' ? {
                        scale: [1, 1.02, 1],
                        boxShadow: ['0 0 0px rgba(59,130,246,0)', '0 0 20px rgba(59,130,246,0.5)', '0 0 0px rgba(59,130,246,0)']
                      } : {}}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
                        <motion.div
                          className={`w-9 h-9 sm:w-10 md:w-12 sm:h-10 md:h-12 rounded-full border-2 overflow-hidden flex-shrink-0 ${battlePhase === 'result' && battleResult.winner === 'challenger'
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
                          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 flex-wrap">
                            <p className="font-bold text-blue-200 text-[10px] sm:text-xs md:text-sm truncate">{battleResult.challenger.username}</p>
                            {battlePhase === 'result' && battleResult.winner === 'challenger' && (
                              <span className="text-green-400 text-[8px] sm:text-[9px] md:text-[10px] font-bold bg-green-500/20 px-1 py-0.5 rounded">THẮNG</span>
                            )}
                          </div>
                          <p className="text-[8px] sm:text-[9px] md:text-[10px] text-slate-400 truncate">{battleResult.challenger.stats.realmName}</p>
                          <div className="relative h-2 sm:h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-600 mt-0.5 sm:mt-1">
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
                          <p className="text-[7px] sm:text-[8px] md:text-[9px] text-slate-500 mt-0.5 font-mono">{Math.round(challengerCurrentHp)} / {battleResult.challenger.stats.qiBlood}</p>
                        </div>
                      </div>
                    </motion.div>

                    {/* VS Divider */}
                    <div className="flex items-center justify-center py-0.5 sm:py-1">
                      <motion.div
                        className="text-base sm:text-lg md:text-xl font-bold text-red-500"
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
                      className={`p-3 rounded-xl bg-gradient-to-br from-red-900/40 to-slate-900/40 border ${battlePhase === 'result' && battleResult.winner === 'opponent'
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
                          className={`w-12 h-12 rounded-full border-2 overflow-hidden flex-shrink-0 ${battlePhase === 'result' && battleResult.winner === 'opponent'
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

                  {/* Result Banner - Mobile Optimized */}
                  <AnimatePresence>
                    {battlePhase === 'result' && (
                      <motion.div
                        className={`text-center py-1.5 sm:py-2 rounded-lg sm:rounded-xl mt-2 sm:mt-3 ${battleResult.isDraw
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
                          className={`text-sm sm:text-base md:text-lg font-bold font-title ${battleResult.isDraw ? 'text-slate-300' : battleResult.winner === 'challenger' ? 'text-green-400' : 'text-red-400'
                            }`}
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 0.5, repeat: 2 }}
                        >
                          {battleResult.isDraw ? 'HÒA' : battleResult.winner === 'challenger' ? 'CHIẾN THẮNG!' : 'THẤT BẠI'}
                        </motion.p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Rewards - Mobile Optimized */}
                  <AnimatePresence>
                    {battlePhase === 'result' && (
                      <motion.div
                        className="text-center py-1.5 sm:py-2 bg-slate-800/50 rounded-lg sm:rounded-xl border border-amber-500/30 mt-1.5 sm:mt-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <p className="text-[9px] sm:text-[10px] text-slate-400 mb-0.5 sm:mb-1">Phần thưởng:</p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-[10px] sm:text-xs">
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

                {/* Right Side - Battle Log - Optimized */}
                <div className="flex-1 flex flex-col min-w-0 order-1 md:order-2">
                  <div className="bg-slate-900/70 rounded-md sm:rounded-lg md:rounded-xl p-1.5 sm:p-2 md:p-3 flex-1 overflow-hidden border border-slate-700/50 flex flex-col">
                    <div className="flex items-center justify-between mb-1.5 sm:mb-2 flex-shrink-0">
                      <p className="text-[9px] sm:text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-tight sm:tracking-wider">Diễn Biến</p>
                      <p className="text-[9px] sm:text-[10px] md:text-xs text-amber-400 font-mono">{currentLogIndex}/{battleLogs.length}</p>
                    </div>
                    <div className="space-y-1 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-600 pr-0.5 sm:pr-1" style={{ maxHeight: '180px' }}>
                      {battleLogs.slice(0, currentLogIndex).map((log, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: log.attacker === 'challenger' ? -15 : 15, scale: 0.95 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          className={`text-[10px] sm:text-[11px] p-1.5 sm:p-2 rounded-md sm:rounded-lg flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1.5 ${log.isDodged
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
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <span className="text-slate-500 font-mono w-4 sm:w-5 flex-shrink-0 text-[9px] sm:text-[10px]">#{idx + 1}</span>
                            <span className={`font-bold flex-shrink-0 text-[10px] sm:text-xs ${log.attacker === 'challenger' ? 'text-blue-300' : 'text-red-300'}`}>
                              {log.attacker === 'challenger' ? battleResult.challenger.username : battleResult.opponent.username}:
                            </span>
                            <span className="flex-1 truncate text-[10px] sm:text-[11px]">{log.description}</span>
                          </div>
                          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                            {log.isCritical && !log.isDodged && (
                              <span className="text-yellow-400 text-[8px] sm:text-[9px] font-bold flex-shrink-0 bg-yellow-500/20 px-1 rounded">CRT</span>
                            )}
                            {log.skillUsed && (
                              <span className="text-amber-400 text-[8px] sm:text-[9px] font-bold flex-shrink-0 bg-amber-500/20 px-1 rounded">SKILL</span>
                            )}
                            {!log.isDodged ? (
                              <span className={`font-mono text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded flex-shrink-0 ${log.isCritical ? 'bg-yellow-500/40 text-yellow-200' : 'bg-slate-700/70 text-slate-300'
                                }`}>
                                -{log.damage}
                              </span>
                            ) : (
                              <span className="text-cyan-400 text-[9px] sm:text-[10px] font-bold flex-shrink-0 bg-cyan-500/20 px-1 rounded">MISS</span>
                            )}
                          </div>
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

                  {/* Close Button - Mobile Optimized */}
                  <motion.button
                    onClick={closeBattleResult}
                    className="w-full py-2 sm:py-2.5 md:py-3 mt-2 sm:mt-3 bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm hover:from-red-600 hover:via-red-500 hover:to-red-600 transition-all shadow-lg active:scale-95"
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

export default PKTab;
