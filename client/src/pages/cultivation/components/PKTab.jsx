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
import { useCultivation } from '../../../hooks/useCultivation.jsx';
import BattleScene from './BattleScene.jsx';
import { api } from '../../../api';
import { getUserAvatarUrl } from '../../../utils/avatarUtils.js';
import { getCombatStats } from '../utils/helpers.js';
import { GiBroadsword, GiShield, GiHeartBottle, GiLightningFrequency, GiFire } from 'react-icons/gi';

const PKTab = memo(function PKTab({ onSwitchTab }) {
  const { cultivation, refresh } = useCultivation();
  const [activeView, setActiveView] = useState('opponents'); // 'opponents', 'history'
  const [opponents, setOpponents] = useState([]);
  const [bots, setBots] = useState([]);
  const [battleHistory, setBattleHistory] = useState([]);
  const [battleStats, setBattleStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [challenging, setChallenging] = useState(null);
  const [battleResult, setBattleResult] = useState(null);
  const [showBattleAnimation, setShowBattleAnimation] = useState(false);
  const [battleBackground, setBattleBackground] = useState('luanvo'); // 'luanvo' or 'vodai'

  // Nghịch Thiên Modal States
  const [nghichThienModal, setNghichThienModal] = useState(null); // { opponentId, opponentName, canNghichThien, tierName, isBot }

  // Load opponents list
  const loadOpponents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api('/api/battle/opponents/list');
      if (response.success) {
        setOpponents(response.data.opponents);
      }
    } catch (err) {
      // Silent error handling
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
      // Silent error handling
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
      // Silent error handling
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data based on active view
  useEffect(() => {
    if (activeView === 'opponents') {
      loadOpponents();
    } else if (activeView === 'bots') {
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
          setBattleBackground('vodai');
          setShowBattleAnimation(true);
        }
      } catch (e) {
        // Silent error handling
        sessionStorage.removeItem('rankedBattle');
      }
    }
  }, []);

  // Challenge opponent
  const handleChallenge = async (opponentId, opponentName, mode = 'normal') => {
    if (challenging) return;

    setChallenging(opponentId);
    try {
      const response = await api('/api/battle/challenge', {
        method: 'POST',
        body: { opponentId, mode }
      });

      if (response.success) {
        setBattleResult(response.data);
        setBattleBackground('luanvo'); // Default background for normal challenges
        setShowBattleAnimation(true);
      }
    } catch (err) {
      // Check if requires nghịch thiên
      if (err.requiresNghichThien) {
        setNghichThienModal({
          opponentId,
          opponentName,
          canNghichThien: err.canNghichThien,
          tierName: err.tierName,
          isBot: false
        });
      } else {
        alert(err.message || 'Thách đấu thất bại');
      }
    } finally {
      setChallenging(null);
    }
  };

  // Challenge bot
  const handleChallengeBot = async (botId, botName, mode = 'normal') => {
    if (challenging) return;

    setChallenging(botId);
    try {
      const response = await api('/api/battle/challenge/bot', {
        method: 'POST',
        body: { botId, mode }
      });

      if (response.success) {
        setBattleResult(response.data);
        setBattleBackground('luanvo'); // Default background for normal challenges
        setShowBattleAnimation(true);
      }
    } catch (err) {
      // Check if requires nghịch thiên
      if (err.requiresNghichThien) {
        setNghichThienModal({
          opponentId: botId,
          opponentName: botName,
          canNghichThien: err.canNghichThien,
          tierName: err.tierName,
          isBot: true
        });
      } else {
        alert(err.message || 'Thách đấu thất bại');
      }
    } finally {
      setChallenging(null);
    }
  };

  // Confirm nghịch thiên and retry challenge
  const confirmNghichThien = () => {
    if (!nghichThienModal) return;
    const { opponentId, opponentName, isBot } = nghichThienModal;
    setNghichThienModal(null);
    if (isBot) {
      handleChallengeBot(opponentId, opponentName, 'nghich_thien');
    } else {
      handleChallenge(opponentId, opponentName, 'nghich_thien');
    }
  };

  // Close battle result modal
  const closeBattleResult = (result) => {
    setShowBattleAnimation(false);
    setBattleResult(null);

    // Reload history if on history tab
    if (activeView === 'history') {
      loadHistory();
    }
  };

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
          { id: 'bots', label: 'Tiên Ma' },
          { id: 'history', label: 'Lịch Sử' }
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveView(id)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeView === id
              ? 'bg-red-700 text-white shadow-lg shadow-red-900/50 border border-red-500/50'
              : 'bg-slate-800/30 text-slate-500 border border-slate-700/30 hover:text-slate-300 hover:bg-slate-800/50'
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
        </div>
      )}

      {/* Bots / Tiên Ma List */}
      {!loading && activeView === 'bots' && (
        <div className="space-y-3">
          {bots.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>Chưa phát hiện Tiên Ma nào dám lảng vảng gần đây...</p>
            </div>
          ) : (
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
                      Phần thưởng: +{battle.isUserWinner ? battle.rewards.winnerExp : battle.rewards.loserExp} tu vi,
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

      {/* Battle Scene Animation */}
      {showBattleAnimation && battleResult && (
        <BattleScene
          battleResult={battleResult}
          backgroundImage={battleBackground}
          onComplete={() => closeBattleResult(battleResult)}
        />
      )}

      {/* Nghịch Thiên Confirm Modal */}
      <AnimatePresence>
        {nghichThienModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4"
            onClick={() => setNghichThienModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="spirit-tablet rounded-xl p-6 max-w-md w-full border border-purple-500/50"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-purple-400 text-center mb-4 font-title">
                NGHỊCH THIÊN
              </h3>

              <p className="text-slate-300 text-center mb-4">
                Đối thủ <span className="text-amber-400 font-bold">{nghichThienModal.opponentName}</span> có cảnh giới cao hơn.
              </p>

              {nghichThienModal.canNghichThien ? (
                <>
                  <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 mb-4">
                    <p className="text-red-300 text-sm text-center">
                      <strong>Cảnh báo:</strong> Nếu thua, bạn sẽ bị trạng thái <span className="text-red-400 font-bold">Trọng Thương</span> (-20% tấn công) trong 3 trận tiếp theo!
                    </p>
                  </div>

                  <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-lg p-3 mb-4">
                    <p className="text-emerald-300 text-sm text-center">
                      <strong>Bonus:</strong> +25% Bạo Kích, giảm 30% sát thương nhận, x1.2 phần thưởng
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setNghichThienModal(null)}
                      className="flex-1 py-3 bg-slate-700 text-slate-300 rounded-lg font-bold hover:bg-slate-600 transition-all"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={confirmNghichThien}
                      className="flex-1 py-3 bg-gradient-to-r from-red-700 to-red-600 text-white rounded-lg font-bold hover:from-red-600 hover:to-red-500 transition-all"
                    >
                      Nghịch Thiên!
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-slate-800/50 border border-slate-600/30 rounded-lg p-4 mb-4">
                    <p className="text-slate-400 text-center">
                      Cảnh giới hiện tại: <span className="text-slate-300 font-bold">{nghichThienModal.tierName}</span>
                    </p>
                    <p className="text-amber-400 text-center mt-2 text-sm">
                      Cần đạt <span className="text-purple-400 font-bold">Đại Thành</span> mới có thể nghịch thiên!
                    </p>
                  </div>

                  <button
                    onClick={() => setNghichThienModal(null)}
                    className="w-full py-3 bg-slate-700 text-slate-300 rounded-lg font-bold hover:bg-slate-600 transition-all"
                  >
                    Đã hiểu
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div >
  );
});

export default PKTab;
