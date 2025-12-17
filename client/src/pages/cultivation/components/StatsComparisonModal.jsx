/**
 * Stats Comparison Modal - Compare combat stats between users
 */
import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

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
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative bg-[#0f172a] border-2 border-amber-600 p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto rounded-xl shadow-lg"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
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

export default StatsComparisonModal;

