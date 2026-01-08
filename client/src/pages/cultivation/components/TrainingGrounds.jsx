// TrainingGrounds.jsx - Luyện Công Trường Component
import { motion } from 'framer-motion';

const TrainingGrounds = ({ sect, membership, onUpgrade, actionLoading }) => {
    const buildingId = 'training_grounds';
    const level = (sect?.buildings || []).find((b) => b.buildingId === buildingId)?.level || 0;
    const maxLevel = 3;

    const EFFECTS = {
        0: { bonus: 0, description: 'Chưa xây dựng' },
        1: { bonus: 10, description: '+10% phần thưởng Võ Đài' },
        2: { bonus: 20, description: '+20% phần thưởng Võ Đài' },
        3: { bonus: 30, description: '+30% phần thưởng Võ Đài' },
    };

    const COSTS = { 1: 3000, 2: 8000, 3: 20000 };
    const nextLevel = level + 1;
    const canUpgrade = level < maxLevel && (membership?.role === 'owner' || membership?.role === 'elder');
    const upgradeCost = COSTS[nextLevel] || 0;

    return (
        <div className="spirit-tablet p-5 rounded-xl border border-red-900/30 hover:border-red-500/30 transition-colors relative group">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h4 className="text-lg font-title text-red-300">LUYỆN CÔNG TRƯỜNG</h4>
                    <p className="text-xs text-slate-500">Tăng phần thưởng từ chiến đấu</p>
                </div>
                <span className="px-2 py-0.5 bg-red-900/40 border border-red-700/50 text-red-200 text-[10px] rounded">
                    Cấp {level}/{maxLevel}
                </span>
            </div>

            <div className="h-24 bg-gradient-to-b from-red-900/20 to-transparent rounded border border-white/5 flex items-center justify-center mb-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.1)_0%,transparent_70%)]" />

                {/* Training ground visual - crossed swords */}
                <motion.div
                    className="relative w-16 h-16 flex items-center justify-center"
                    animate={{ rotate: level > 0 ? [0, 5, -5, 0] : 0 }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    <div className="absolute w-12 h-1 bg-gradient-to-r from-red-700 to-red-500 rounded transform rotate-45" />
                    <div className="absolute w-12 h-1 bg-gradient-to-r from-red-700 to-red-500 rounded transform -rotate-45" />
                    <div className="w-6 h-6 rounded-full bg-red-900/50 border border-red-500/40 flex items-center justify-center z-10">
                        <span className="text-red-400 text-[8px] font-title">戰</span>
                    </div>
                </motion.div>
            </div>

            <div className="bg-black/30 rounded p-2 mb-4 border border-slate-800/50">
                <div className="text-[10px] text-slate-500 uppercase mb-1">Hiệu ứng hiện tại</div>
                <div className="text-sm text-red-400">{EFFECTS[level]?.description}</div>
                {level < maxLevel && (
                    <div className="text-[10px] text-slate-600 mt-1">
                        Cấp tiếp: {EFFECTS[nextLevel]?.description}
                    </div>
                )}
            </div>

            {/* Arena bonus indicator */}
            {level > 0 && (
                <div className="flex items-center gap-2 mb-4">
                    <div className="flex gap-1">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className={`w-3 h-3 rounded-sm ${i <= level ? 'bg-red-500' : 'bg-slate-800'}`}
                            />
                        ))}
                    </div>
                    <span className="text-[10px] text-red-400 font-bold">+{EFFECTS[level].bonus}% Võ Đài</span>
                </div>
            )}

            <div className="flex justify-between items-end">
                {canUpgrade ? (
                    <div className="text-[10px] text-amber-500">
                        Chi phí: {upgradeCost.toLocaleString()} Linh Khí
                    </div>
                ) : (
                    <div className="text-[10px] text-slate-600">
                        {level >= maxLevel ? 'Đã tối đa' : level === 0 ? 'Chưa xây' : ''}
                    </div>
                )}
                <button
                    onClick={() => onUpgrade(buildingId)}
                    disabled={!canUpgrade || actionLoading === 'upgrade-' + buildingId}
                    className="text-xs bg-slate-800 hover:bg-red-900/50 text-red-400 px-3 py-1.5 rounded border border-slate-700 hover:border-red-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {actionLoading === 'upgrade-' + buildingId ? '...' : level >= maxLevel ? 'Tối Đa' : 'Nâng Cấp'}
                </button>
            </div>
        </div>
    );
};

export default TrainingGrounds;
