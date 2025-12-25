/**
 * Quests Tab - Display daily and weekly quests with check-in calendar
 */
import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { useCultivation } from '../../../hooks/useCultivation.jsx';
import LoadingSkeleton from './LoadingSkeleton.jsx';
import StatBox from './StatBox.jsx';
import QuestItem from './QuestItem.jsx';
import AchievementItem from './AchievementItem.jsx';
import FlyingReward from './FlyingReward.jsx';

const QuestsTab = memo(function QuestsTab({ onCheckIn, checkingIn }) {
  const { cultivation, claimReward, loading } = useCultivation();
  const [claiming, setClaiming] = useState(null);
  const [claimingAll, setClaimingAll] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('quests');
  const [rewardsAnimation, setRewardsAnimation] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');

  const FILTERS = [
    { id: 'all', label: 'Tất cả' },
    { id: 'cultivation', label: 'Tu Luyện', actions: ['login_streak', 'realm'] },
    { id: 'social', label: 'Xã Hội', actions: ['friend', 'post', 'upvote', 'comment'] },
    { id: 'dungeon', label: 'Bí Cảnh', actions: ['dungeon_clear'] }
  ];

  const handleClaim = async (questId, event) => {
    // Lấy thông tin quest để biết reward
    const allQuests = [
      ...(cultivation.dailyQuests || []),
      ...(cultivation.weeklyQuests || []),
      ...(cultivation.achievements || [])
    ];
    const quest = allQuests.find(q => q.questId === questId);

    // Lưu vị trí click để chạy animation
    let startPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    if (event && event.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect();
      startPos = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }

    setClaiming(questId);
    try {
      await claimReward(questId);

      // Trigger animation nếu claim thành công
      if (quest) {
        setRewardsAnimation(prev => [...prev, {
          id: Date.now(),
          startPos,
          rewards: [
            { type: 'exp', amount: quest.expReward || 0 },
            { type: 'stone', amount: quest.spiritStoneReward || 0 }
          ].filter(r => r.amount > 0)
        }]);
      }
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
  const achievements = cultivation.achievements || [];
  const hasNoQuests = dailyQuests.length === 0 && weeklyQuests.length === 0 && achievements.length === 0;

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

      {/* Sub Tab Toggle */}
      <div className="sticky top-0 z-30 flex gap-2 mb-4 bg-[#0B0B15]/95 backdrop-blur-md py-3 -mx-4 px-4 border-b border-white/5">
        <button
          onClick={() => setActiveSubTab('quests')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold uppercase tracking-wide transition-all ${activeSubTab === 'quests'
            ? 'bg-gradient-to-r from-cyan-600/30 to-cyan-700/30 border border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
            : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-slate-300 hover:border-slate-600'
            }`}
        >
          Nhiệm Vụ
          {pendingRewards.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-amber-500/30 text-amber-300 text-xs rounded-full">
              {pendingRewards.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveSubTab('achievements')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold uppercase tracking-wide transition-all ${activeSubTab === 'achievements'
            ? 'bg-gradient-to-r from-amber-600/30 to-amber-700/30 border border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
            : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-slate-300 hover:border-slate-600'
            }`}
        >
          Thành Tựu
          <span className="ml-2 text-xs text-slate-500">
            ({achievements.filter(a => a.completed).length}/{achievements.length})
          </span>
        </button>
      </div>

      {/* Tổng phần thưởng chờ nhận - chỉ hiện khi ở tab quests */}
      {activeSubTab === 'quests' && pendingRewards.length > 0 && (
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

      {/* Nội dung dựa trên sub tab */}
      {activeSubTab === 'quests' ? (
        <>
          {dailyQuests.length === 0 && weeklyQuests.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-500 opacity-50">
              <p className="text-xs uppercase tracking-widest text-center">
                "Đường tu tiên còn dài,<br />hôm nay đạo hữu hãy nghỉ ngơi"
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Nhiệm vụ hàng ngày */}
              <div className="space-y-3 p-3 lg:p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="flex items-center gap-2">
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"></div>
                  <h4 className="text-sm font-bold text-jade uppercase tracking-wider whitespace-nowrap">Hàng Ngày</h4>
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"></div>
                </div>
                {dailyQuests.length > 0 ? (
                  dailyQuests.map((quest) => (
                    <QuestItem
                      key={quest.questId}
                      quest={quest}
                      onClaim={handleClaim}
                      claiming={claiming}
                    />
                  ))
                ) : (
                  <div className="h-24 flex items-center justify-center text-slate-500 opacity-50 spirit-tablet rounded-xl">
                    <p className="text-xs">Không có nhiệm vụ</p>
                  </div>
                )}
              </div>

              {/* Nhiệm vụ hàng tuần */}
              <div className="space-y-3 p-3 lg:p-4 rounded-xl bg-purple-950/20 border border-purple-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="flex items-center gap-2">
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"></div>
                  <h4 className="text-sm font-bold text-purple-400 uppercase tracking-wider whitespace-nowrap">Hàng Tuần</h4>
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"></div>
                </div>
                {weeklyQuests.length > 0 ? (
                  weeklyQuests.map((quest) => (
                    <QuestItem
                      key={quest.questId}
                      quest={quest}
                      onClaim={handleClaim}
                      claiming={claiming}
                    />
                  ))
                ) : (
                  <div className="h-24 flex items-center justify-center text-slate-500 opacity-50 spirit-tablet rounded-xl">
                    <p className="text-xs">Không có nhiệm vụ</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Tab Thành Tựu */}
          {/* Tab Thành Tựu */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-cultivation">
            {FILTERS.map(filter => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeFilter === filter.id
                  ? 'bg-purple-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {achievements.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-500 opacity-50">
              <p className="text-xs uppercase tracking-widest">Chưa có thành tựu</p>
            </div>
          ) : (
            <div className="space-y-3">
              {achievements
                .filter(achievement => {
                  if (activeFilter === 'all') return true;
                  const filter = FILTERS.find(f => f.id === activeFilter);
                  return filter?.actions.includes(achievement.requirement?.action);
                })
                .map((achievement) => (
                  <AchievementItem
                    key={achievement.questId}
                    achievement={achievement}
                    onClaim={handleClaim}
                    claiming={claiming}
                  />
                ))}
            </div>
          )}
        </>
      )}
      {/* Rewards Animation */}
      {rewardsAnimation.map(anim => (
        <FlyingReward
          key={anim.id}
          startPos={anim.startPos}
          rewards={anim.rewards}
          onComplete={() => setRewardsAnimation(prev => prev.filter(p => p.id !== anim.id))}
        />
      ))}
    </div>
  );
});

export default QuestsTab;

