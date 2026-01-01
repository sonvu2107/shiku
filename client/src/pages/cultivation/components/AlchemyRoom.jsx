// AlchemyRoom.jsx - Đan Phòng Component
import { motion } from 'framer-motion';

const AlchemyRoom = ({ sect, membership, onUpgrade, actionLoading }) => {
    const buildingId = 'alchemy_room';
    const level = sect?.buildings?.[buildingId]?.level || 0;
    const maxLevel = 3;

    const EFFECTS = {
        0: { discount: 0, description: 'Chưa xây dựng' },
        1: { discount: 5, description: 'Giảm 5% giá đan dược' },
        2: { discount: 10, description: 'Giảm 10% giá đan dược' },
        3: { discount: 15, description: 'Giảm 15% giá đan dược' },
    };

    const COSTS = { 1: 2000, 2: 6000, 3: 15000 };
    const nextLevel = level + 1;
    const canUpgrade = level < maxLevel && (membership?.role === 'owner' || membership?.role === 'elder');
    const upgradeCost = COSTS[nextLevel] || 0;

    return (
        <div className="spirit-tablet p-5 rounded-xl border border-orange-900/30 hover:border-orange-500/30 transition-colors relative group">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h4 className="text-lg font-title text-orange-300">ĐAN PHÒNG</h4>
                    <p className="text-xs text-slate-500">Luyện đan và giảm giá vật phẩm</p>
                </div>
                <span className="px-2 py-0.5 bg-orange-900/40 border border-orange-700/50 text-orange-200 text-[10px] rounded">
                    Cấp {level}/{maxLevel}
                </span>
            </div>

            <div className="h-24 bg-gradient-to-b from-orange-900/20 to-transparent rounded border border-white/5 flex items-center justify-center mb-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.15)_0%,transparent_70%)]" />
                <motion.div
                    className="w-14 h-16 rounded-lg border-2 border-orange-500/30 bg-gradient-to-b from-orange-800/40 to-orange-950/60 flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.2)] relative"
                    animate={{
                        boxShadow: level > 0
                            ? ['0 0 15px rgba(249,115,22,0.2)', '0 0 25px rgba(249,115,22,0.4)', '0 0 15px rgba(249,115,22,0.2)']
                            : '0 0 15px rgba(249,115,22,0.2)'
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    <span className="text-orange-400/80 text-xs font-title tracking-widest">ĐAN</span>
                    {level > 0 && (
                        <motion.div
                            className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-orange-400 rounded-full"
                            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        />
                    )}
                </motion.div>
            </div>

            <div className="bg-black/30 rounded p-2 mb-4 border border-slate-800/50">
                <div className="text-[10px] text-slate-500 uppercase mb-1">Hiệu ứng hiện tại</div>
                <div className="text-sm text-orange-400">{EFFECTS[level]?.description}</div>
                {level < maxLevel && (
                    <div className="text-[10px] text-slate-600 mt-1">
                        Cấp tiếp: {EFFECTS[nextLevel]?.description}
                    </div>
                )}
            </div>

            {/* Discount indicator */}
            {level > 0 && (
                <div className="flex items-center gap-2 mb-4">
                    <div className="flex-1 h-1.5 bg-slate-800 rounded overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all"
                            style={{ width: `${(EFFECTS[level].discount / 15) * 100}%` }}
                        />
                    </div>
                    <span className="text-[10px] text-orange-400 font-bold">-{EFFECTS[level].discount}%</span>
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
                    className="text-xs bg-slate-800 hover:bg-orange-900/50 text-orange-400 px-3 py-1.5 rounded border border-slate-700 hover:border-orange-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {actionLoading === 'upgrade-' + buildingId ? '...' : level >= maxLevel ? 'Tối Đa' : 'Nâng Cấp'}
                </button>
            </div>
        </div>
    );
};

export default AlchemyRoom;
