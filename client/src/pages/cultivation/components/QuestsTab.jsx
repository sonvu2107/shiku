/**
 * Quests Tab - Display daily and weekly quests with check-in calendar
 */
import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { useCultivation } from '../../../hooks/useCultivation.jsx';
import LoadingSkeleton from './LoadingSkeleton.jsx';
import StatBox from './StatBox.jsx';
import QuestItem from './QuestItem.jsx';

const QuestsTab = memo(function QuestsTab({ onCheckIn, checkingIn }) {
  const { cultivation, claimReward, loading } = useCultivation();
  const [claiming, setClaiming] = useState(null);
  const [claimingAll, setClaimingAll] = useState(false);

  const handleClaim = async (questId) => {
    setClaiming(questId);
    try {
      await claimReward(questId);
    } finally {
      setClaiming(null);
    }
  };

  const handleClaimAll = async () => {
    const pendingRewards = [...(cultivation.dailyQuests || []), ...(cultivation.weeklyQuests || [])]
      .filter(q => q.completed && !q.claimed);

    if (pendingRewards.length === 0) return;

    setClaimingAll(true);
    try {
      // Claim từng nhiệm vụ một, có delay nhỏ để animation mượt
      for (const quest of pendingRewards) {
        await claimReward(quest.questId);
        await new Promise(resolve => setTimeout(resolve, 200)); // Delay 200ms giữa mỗi claim
      }
    } finally {
      setClaimingAll(false);
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

  // Tính toán lịch điểm danh 7 ngày
  const getCheckInCalendar = () => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset về đầu ngày

    const lastLoginDate = cultivation.lastLoginDate ? new Date(cultivation.lastLoginDate) : null;
    if (lastLoginDate) {
      lastLoginDate.setHours(0, 0, 0, 0);
    }

    const loginStreak = cultivation.loginStreak || 0;

    // Tên các ngày trong tuần
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    // Tính 7 ngày gần nhất (từ 6 ngày trước đến hôm nay)
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

      // Kiểm tra xem ngày này đã điểm danh chưa
      let isChecked = false;
      if (lastLoginDate && loginStreak > 0) {
        const lastLoginStr = lastLoginDate.toISOString().split('T')[0];

        // Tính số ngày từ ngày này đến lastLoginDate
        const daysFromDate = Math.floor((lastLoginDate - date) / (1000 * 60 * 60 * 24));

        // Nếu lastLoginDate >= ngày này và nằm trong streak
        // Ví dụ: streak = 5, lastLoginDate = hôm nay
        // -> các ngày: hôm nay (0 ngày), hôm qua (1 ngày), ... đến 4 ngày trước (4 ngày) đều đã điểm danh
        if (daysFromDate >= 0 && daysFromDate < loginStreak) {
          isChecked = true;
        }
      }

      // Kiểm tra xem có phải hôm nay không
      const isToday = i === 0;

      days.push({
        date,
        dateStr,
        dayName: dayNames[date.getDay()],
        dayNumber: date.getDate(),
        isChecked,
        isToday
      });
    }

    return days;
  };

  const checkInDays = getCheckInCalendar();
  const todayChecked = checkInDays[6]?.isChecked || false; // Ngày cuối cùng là hôm nay

  return (
    <div className="space-y-6 pb-2">
      {/* Stats Grid - Hiển thị số bài viết, bình luận, upvote, nhiệm vụ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatBox label="Bài viết" value={cultivation.stats?.totalPostsCreated || 0} />
        <StatBox label="Bình luận" value={cultivation.stats?.totalCommentsCreated || 0} />
        <StatBox label="Upvote" value={cultivation.stats?.totalUpvotesGiven || 0} />
        <StatBox label="Nhiệm vụ" value={cultivation.stats?.totalQuestsCompleted || 0} />
      </div>

      {/* Lịch Điểm Danh 7 Ngày */}
      <div className="spirit-tablet rounded-xl p-5 lg:p-6 border border-amber-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="font-bold text-gold font-title tracking-wide text-lg lg:text-xl">ĐIỂM DANH HÀNG NGÀY</h3>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-amber-400">Streak: {cultivation.loginStreak || 0} ngày</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">Kỷ lục: {cultivation.longestStreak || 0} ngày</span>
          </div>
        </div>

        {/* Lịch 7 ngày */}
        <div className="grid grid-cols-7 gap-2 md:gap-3 mb-4">
          {checkInDays.map((day, idx) => (
            <div
              key={idx}
              className={`flex flex-col items-center p-2 md:p-3 rounded-lg border-2 transition-all ${day.isChecked
                ? 'bg-gradient-to-br from-amber-600/30 to-amber-800/30 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                : day.isToday
                  ? 'bg-slate-800/50 border-amber-500/30'
                  : 'bg-slate-900/30 border-slate-700/30 opacity-60'
                }`}
            >
              <p className={`text-xs mb-1 ${day.isChecked ? 'text-amber-300' : 'text-slate-400'}`}>
                {day.dayName}
              </p>
              <p className={`text-lg font-bold ${day.isChecked ? 'text-amber-200' : day.isToday ? 'text-slate-200' : 'text-slate-500'}`}>
                {day.dayNumber}
              </p>
              {day.isChecked && (
                <div className="mt-1 w-2 h-2 bg-amber-400 rounded-full"></div>
              )}
              {day.isToday && !day.isChecked && (
                <div className="mt-1 w-2 h-2 bg-amber-500/50 rounded-full animate-pulse"></div>
              )}
            </div>
          ))}
        </div>

        {/* Nút Điểm Danh */}
        <motion.button
          onClick={onCheckIn}
          disabled={checkingIn || todayChecked}
          className={`w-full py-3 px-4 rounded-xl font-bold uppercase tracking-wide transition-all ${todayChecked
            ? 'bg-slate-800/50 text-slate-600 border border-slate-700 cursor-not-allowed'
            : 'bg-gradient-to-r from-amber-700 to-amber-900 text-amber-100 border border-amber-500/30 hover:from-amber-600 hover:to-amber-800 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
            }`}
          whileHover={!todayChecked && !checkingIn ? { scale: 1.02 } : {}}
          whileTap={!todayChecked && !checkingIn ? { scale: 0.98 } : {}}
        >
          {checkingIn ? 'Đang điểm danh...' : todayChecked ? 'Đã điểm danh hôm nay' : 'Điểm Danh'}
        </motion.button>

        {/* Thông tin phần thưởng */}
        {!todayChecked && (
          <div className="mt-3 text-center text-xs text-slate-400">
            <p>Phần thưởng: +{20 + Math.min((cultivation.loginStreak || 0) * 5, 50)} Tu Vi, +{10 + Math.min((cultivation.loginStreak || 0) * 2, 20)} Linh Thạch</p>
          </div>
        )}
      </div>

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
          <motion.button
            onClick={handleClaimAll}
            disabled={claimingAll}
            className="px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-800 border border-amber-500/30 rounded-lg text-amber-100 text-xs font-bold uppercase tracking-wide shadow-lg hover:from-amber-600 hover:to-amber-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={!claimingAll ? { scale: 1.05 } : {}}
            whileTap={!claimingAll ? { scale: 0.95 } : {}}
          >
            {claimingAll ? 'Đang nhận...' : 'Nhận Tất Cả'}
          </motion.button>
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

export default QuestsTab;

