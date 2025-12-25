/**
 * Quest Item Component - Display individual quest
 */
import { memo } from 'react';
import { motion } from 'framer-motion';

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
            onClick={(e) => onClaim(quest.questId, e)}
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

export default QuestItem;

