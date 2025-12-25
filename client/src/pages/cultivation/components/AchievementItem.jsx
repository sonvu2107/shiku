/**
 * Achievement Item Component - Display individual achievement
 */
import { memo } from 'react';
import { motion } from 'framer-motion';

const AchievementItem = memo(function AchievementItem({ achievement, onClaim, claiming }) {
    const isCompleted = achievement.completed;
    const isClaimed = achievement.claimed;
    const canClaim = isCompleted && !isClaimed;

    // Calculate rarity based on requirement count for visual styling
    const getRarityStyle = () => {
        const count = achievement.requirement?.count || 1;
        if (count >= 100) return { border: 'border-yellow-500/50', glow: 'shadow-[0_0_15px_rgba(234,179,8,0.2)]', badge: 'bg-yellow-500/20 text-yellow-300' };
        if (count >= 30) return { border: 'border-purple-500/50', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.2)]', badge: 'bg-purple-500/20 text-purple-300' };
        if (count >= 10) return { border: 'border-blue-500/50', glow: 'shadow-[0_0_15px_rgba(59,130,246,0.2)]', badge: 'bg-blue-500/20 text-blue-300' };
        return { border: 'border-slate-600/50', glow: '', badge: 'bg-slate-500/20 text-slate-300' };
    };

    const rarityStyle = getRarityStyle();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`spirit-tablet rounded-xl p-4 transition-all ${rarityStyle.border} ${canClaim ? rarityStyle.glow : ''} ${isClaimed ? 'opacity-50' : ''}`}
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-100 font-title text-sm">{achievement.name}</span>
                    {isClaimed && (
                        <span className="text-[10px] bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded-full">
                            Đã nhận
                        </span>
                    )}
                </div>
                {canClaim && (
                    <span className="text-xs bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded-full animate-pulse">
                        Đạt được!
                    </span>
                )}
            </div>
            <p className="text-xs text-slate-400 mb-3">{achievement.description}</p>
            <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                    <div className="w-full bg-slate-900/80 rounded-full h-2 overflow-hidden">
                        <div
                            className={`h-full transition-all ${isCompleted
                                ? 'bg-gradient-to-r from-amber-600 to-yellow-400'
                                : 'bg-gradient-to-r from-slate-600 to-slate-500'
                                }`}
                            style={{ width: `${achievement.progressPercent || 0}%` }}
                        />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                        {achievement.progress || 0} / {achievement.requirement?.count || 1}
                    </p>
                </div>
                <div className="text-right text-xs flex-shrink-0">
                    {achievement.expReward > 0 && (
                        <div className="text-amber-400">+{achievement.expReward.toLocaleString()} Tu Vi</div>
                    )}
                    {achievement.spiritStoneReward > 0 && (
                        <div className="text-emerald-400">+{achievement.spiritStoneReward.toLocaleString()} Linh Thạch</div>
                    )}
                </div>
                {canClaim && (
                    <motion.button
                        onClick={(e) => onClaim(achievement.questId, e)}
                        disabled={claiming === achievement.questId}
                        className="px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-800 border border-amber-500/30 rounded-lg text-amber-100 text-xs font-bold uppercase tracking-wide shadow-lg hover:from-amber-600 hover:to-amber-700 transition-all"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        {claiming === achievement.questId ? '...' : 'Nhận'}
                    </motion.button>
                )}
            </div>
        </motion.div>
    );
});

export default AchievementItem;
