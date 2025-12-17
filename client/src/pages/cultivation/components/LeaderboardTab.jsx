/**
 * Leaderboard Tab - Display top cultivators ranking
 */
import { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { GitCompare } from 'lucide-react';
import { useCultivation } from '../../../hooks/useCultivation.jsx';
import { api } from '../../../api';
import { getCombatStats } from '../utils/helpers.js';
import LoadingSkeleton from './LoadingSkeleton.jsx';
import StatsComparisonModal from './StatsComparisonModal.jsx';

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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
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

export default LeaderboardTab;

