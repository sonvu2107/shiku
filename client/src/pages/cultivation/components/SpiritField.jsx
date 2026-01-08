// SpiritField.jsx - Linh Điền Component
import { useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Linh Điền - Spirit Field Building
 * - Displays building level and upgrade option
 * - Future: Harvest resources, show production rates
 */
const SpiritField = ({
    sect,
    membership,
    onUpgrade,
    actionLoading
}) => {
    const buildingId = 'spirit_field';
    const level = (sect?.buildings || []).find((b) => b.buildingId === buildingId)?.level || 0;
    const maxLevel = 3;

    // Effects by level
    const EFFECTS = {
        0: { dailyBonus: 0, description: 'Chưa xây dựng' },
        1: { dailyBonus: 10, description: '+10 Linh Khí/ngày' },
        2: { dailyBonus: 25, description: '+25 Linh Khí/ngày' },
        3: { dailyBonus: 50, description: '+50 Linh Khí/ngày' },
    };

    const COSTS = { 1: 1000, 2: 3000, 3: 8000 };
    const nextLevel = level + 1;
    const canUpgrade = level < maxLevel && (membership?.role === 'owner' || membership?.role === 'elder');
    const upgradeCost = COSTS[nextLevel] || 0;

    return (
        <div className="spirit-tablet p-5 rounded-xl border border-emerald-900/30 hover:border-emerald-500/30 transition-colors relative group">
            {/* Header */}
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h4 className="text-lg font-title text-emerald-300">LINH ĐIỀN</h4>
                    <p className="text-xs text-slate-500">Tăng Linh Khí khi điểm danh</p>
                </div>
                <span className="px-2 py-0.5 bg-emerald-900/40 border border-emerald-700/50 text-emerald-200 text-[10px] rounded">
                    Cấp {level}/{maxLevel}
                </span>
            </div>

            {/* Visual */}
            <div className="h-24 bg-gradient-to-b from-emerald-900/20 to-transparent rounded border border-white/5 flex items-center justify-center mb-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(16,185,129,0.15)_0%,transparent_70%)]" />
                <motion.div
                    className="w-16 h-16 rounded-full border-2 border-emerald-500/30 bg-gradient-to-b from-emerald-800/40 to-emerald-950/60 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                    animate={{ scale: level > 0 ? [1, 1.05, 1] : 1 }}
                    transition={{ duration: 3, repeat: Infinity }}
                >
                    <span className="text-emerald-400/80 text-xs font-title tracking-widest">ĐIỀN</span>
                </motion.div>
            </div>

            {/* Effect Info */}
            <div className="bg-black/30 rounded p-2 mb-4 border border-slate-800/50">
                <div className="text-[10px] text-slate-500 uppercase mb-1">Hiệu ứng hiện tại</div>
                <div className="text-sm text-emerald-400">{EFFECTS[level]?.description}</div>
                {level < maxLevel && (
                    <div className="text-[10px] text-slate-600 mt-1">
                        Cấp tiếp: {EFFECTS[nextLevel]?.description}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex justify-between items-end">
                {canUpgrade ? (
                    <div className="text-[10px] text-amber-500">
                        Chi phí: {upgradeCost.toLocaleString()} Linh Khí
                    </div>
                ) : (
                    <div className="text-[10px] text-slate-600">
                        {level >= maxLevel ? 'Đã tối đa' : 'Không có quyền'}
                    </div>
                )}
                <button
                    onClick={() => onUpgrade(buildingId)}
                    disabled={!canUpgrade || actionLoading === `upgrade-${buildingId}`}
                    className="text-xs bg-slate-800 hover:bg-emerald-900/50 text-emerald-400 px-3 py-1.5 rounded border border-slate-700 hover:border-emerald-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {actionLoading === `upgrade-${buildingId}` ? '...' : level >= maxLevel ? 'Tối Đa' : 'Nâng Cấp'}
                </button>
            </div>
        </div>
    );
};

export default SpiritField;
