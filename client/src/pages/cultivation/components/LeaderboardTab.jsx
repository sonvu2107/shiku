/**
 * Leaderboard Tab - Display top cultivators ranking & World Events
 */
import { useState, useEffect, memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { GitCompare } from 'lucide-react';
import { useCultivation } from '../../../hooks/useCultivation.jsx';
import { api } from '../../../api';
import { getCombatStats } from '../utils/helpers.js';
import { getUserAvatarUrl } from '../../../utils/avatarUtils.js';
import LoadingSkeleton from './LoadingSkeleton.jsx';
import StatsComparisonModal from './StatsComparisonModal.jsx';

const LeaderboardTab = memo(function LeaderboardTab({ isAdmin = false }) {
  const { leaderboard, loadLeaderboard, loading, cultivation } = useCultivation();
  const [activeTab, setActiveTab] = useState('realm'); // 'realm', 'pk', or 'arena'
  const [fixing, setFixing] = useState(false);
  const [comparingUserId, setComparingUserId] = useState(null);
  const [compareStats, setCompareStats] = useState(null);
  const [loadingCompare, setLoadingCompare] = useState(false);

  // PK Ranking state
  const [pkRanking, setPkRanking] = useState([]);
  const [loadingPk, setLoadingPk] = useState(false);

  // Arena Ranking state
  const [arenaRanking, setArenaRanking] = useState([]);
  const [loadingArena, setLoadingArena] = useState(false);
  const [userArenaRank, setUserArenaRank] = useState(null);

  useEffect(() => {
    if (activeTab === 'realm') {
      loadLeaderboard('exp', 20);
    }
  }, [loadLeaderboard, activeTab]);

  // Load PK ranking
  const loadPkRanking = useCallback(async () => {
    setLoadingPk(true);
    try {
      const response = await api('/api/battle/ranking/list');
      if (response.success) {
        setPkRanking(response.data);
      }
    } catch (err) {
      console.error('Load PK ranking error:', err);
    } finally {
      setLoadingPk(false);
    }
  }, []);

  // Load Arena ranking
  const loadArenaRanking = useCallback(async () => {
    setLoadingArena(true);
    try {
      const response = await api('/api/arena/leaderboard');
      if (response.success) {
        setArenaRanking(response.data.leaderboard || []);
        setUserArenaRank(response.data.userRank);
      }
    } catch (err) {
      console.error('Load Arena ranking error:', err);
    } finally {
      setLoadingArena(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'pk') {
      loadPkRanking();
    } else if (activeTab === 'arena') {
      loadArenaRanking();
    }
  }, [activeTab, loadPkRanking, loadArenaRanking]);

  const handleFixRealms = async () => {
    if (!window.confirm('Bạn có chắc muốn fix lại tất cả cảnh giới dựa trên exp?')) return;
    setFixing(true);
    try {
      const data = await api('/api/cultivation/fix-realms', { method: 'POST' });
      alert(data.message || 'Đã fix xong!');
      loadLeaderboard('exp', 20);
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

  const isLoading = (activeTab === 'realm' && (loading || !leaderboard)) || (activeTab === 'pk' && loadingPk) || (activeTab === 'arena' && loadingArena);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-3 pb-2">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gold font-title tracking-wide text-xl lg:text-2xl">BẢNG XẾP HẠNG</h3>
        {isAdmin && activeTab === 'realm' && (
          <button
            onClick={handleFixRealms}
            disabled={fixing}
            className="text-xs px-3 py-1 bg-amber-600/20 border border-amber-500/30 rounded-lg text-amber-400 hover:bg-amber-600/30 disabled:opacity-50"
          >
            {fixing ? 'Đang fix...' : 'Fix BXH'}
          </button>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setActiveTab('realm')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'realm'
            ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/50 border border-amber-500/50'
            : 'bg-slate-800/30 text-slate-500 border border-slate-700/30 hover:text-slate-300 hover:bg-slate-800/50'
            }`}
        >
          Cảnh Giới
        </button>
        <button
          onClick={() => setActiveTab('pk')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'pk'
            ? 'bg-red-700 text-white shadow-lg shadow-red-900/50 border border-red-500/50'
            : 'bg-slate-800/30 text-slate-500 border border-slate-700/30 hover:text-slate-300 hover:bg-slate-800/50'
            }`}
        >
          Luận Võ
        </button>
        <button
          onClick={() => setActiveTab('arena')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'arena'
            ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50 border border-purple-500/50'
            : 'bg-slate-800/30 text-slate-500 border border-slate-700/30 hover:text-slate-300 hover:bg-slate-800/50'
            }`}
        >
          Võ Đài
        </button>
      </div>



      {/* Realm Ranking */}
      {activeTab === 'realm' && leaderboard?.leaderboard?.map((entry, idx) => {
        const userId = entry.user?._id || entry.user?.id;
        const isComparing = comparingUserId === userId;

        return (
          <motion.div
            key={userId || idx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className={`spirit-tablet rounded-lg p-3 flex items-center gap-3 ${entry.isCurrentUser ? 'border-amber-500/50 bg-amber-900/20' : ''
              }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-amber-500 text-black' :
              idx === 1 ? 'bg-slate-400 text-black' :
                idx === 2 ? 'bg-amber-700 text-white' :
                  'bg-slate-700 text-slate-300'
              }`}>
              {idx + 1}
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-amber-500/40 overflow-hidden">
              {entry.user?.avatarUrl ? (
                <img src={entry.user.avatarUrl || getUserAvatarUrl({ name: entry.user?.name })} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-amber-400 font-bold">
                  {entry.user?.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
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

      {/* PK Ranking */}
      {activeTab === 'pk' && (
        <div className="space-y-3">
          {pkRanking.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>Chưa có dữ liệu xếp hạng</p>
            </div>
          ) : (
            pkRanking.map((user, idx) => (
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

      {/* Arena Ranking */}
      {activeTab === 'arena' && (
        <div className="space-y-3">
          {userArenaRank && (
            <div className="text-sm text-center text-purple-300 mb-2">
              Bạn đang ở hạng #{userArenaRank}
            </div>
          )}
          {arenaRanking.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>Chưa có dữ liệu xếp hạng</p>
            </div>
          ) : (
            arenaRanking.slice(0, 20).map((player, idx) => (
              <motion.div
                key={player.userId || idx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`spirit-tablet rounded-xl p-4 flex items-center gap-4 ${player.userId === cultivation?.user ? 'border-purple-500/50 bg-purple-900/20' : ''
                  }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-amber-500 text-black' :
                  idx === 1 ? 'bg-slate-400 text-black' :
                    idx === 2 ? 'bg-amber-700 text-white' :
                      'bg-slate-700 text-slate-300'
                  }`}>
                  {player.rank || idx + 1}
                </div>
                <div
                  className="w-10 h-10 rounded-full bg-slate-800 border-2 overflow-hidden"
                  style={{ borderColor: player.tierColor || '#8B5CF6' }}
                >
                  {player.avatar ? (
                    <img src={player.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-purple-400 font-bold">
                      {player.username?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-100 truncate">{player.username}</p>
                  <p className="text-xs" style={{ color: player.tierColor || '#A78BFA' }}>
                    {player.tierName} • {player.mmr} MMR
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-purple-300">{player.winRate}%</p>
                  <p className="text-xs text-slate-500">{player.seasonWins}W/{player.seasonLosses}L</p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

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

export default LeaderboardTab;
