// Library.jsx - Tàng Kinh Các Component
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../../api';
import { useToast } from '../../../contexts/ToastContext';
import { RARITY_COLORS } from '../utils/constants.js';

const Library = ({ sect, membership, onUpgrade, actionLoading }) => {
    const { showSuccess, showError } = useToast();
    const buildingId = 'library';
    const level = (sect?.buildings || []).find((b) => b.buildingId === buildingId)?.level || 0;
    const maxLevel = 3;

    const [showTechniques, setShowTechniques] = useState(false);
    const [techniques, setTechniques] = useState([]);
    const [weeklyContribution, setWeeklyContribution] = useState(0);
    const [loadingTech, setLoadingTech] = useState(false);
    const [learningId, setLearningId] = useState(null);

    const EFFECTS = {
        0: { slots: 0, description: 'Chưa xây dựng' },
        1: { slots: 1, description: 'Phàm Phẩm + Tinh Phẩm' },
        2: { slots: 2, description: '+ Hiếm Có' },
        3: { slots: 3, description: '+ Cực Phẩm + Thần Bảo' },
    };

    const COSTS = { 1: 1500, 2: 4500, 3: 12000 };
    const nextLevel = level + 1;
    const canUpgrade = level < maxLevel && (membership?.role === 'owner' || membership?.role === 'elder');
    const upgradeCost = COSTS[nextLevel] || 0;

    const fetchTechniques = async () => {
        if (!sect?._id || level < 1) return;
        setLoadingTech(true);
        try {
            const res = await api('/api/sects/' + sect._id + '/library/techniques');
            if (res.success) {
                setTechniques(res.data.techniques || []);
                setWeeklyContribution(res.data.weeklyContribution || 0);
            }
        } catch (err) {
            showError(err.message || 'Không thể tải công pháp');
        } finally {
            setLoadingTech(false);
        }
    };

    const handleLearnTechnique = async (techniqueId) => {
        if (!sect?._id || learningId) return;
        setLearningId(techniqueId);
        try {
            const res = await api('/api/sects/' + sect._id + '/library/learn/' + techniqueId, { method: 'POST' });
            if (res.success) {
                showSuccess(res.message);
                fetchTechniques();
            }
        } catch (err) {
            showError(err.message || 'Không thể học công pháp');
        } finally {
            setLearningId(null);
        }
    };

    useEffect(() => {
        if (showTechniques && techniques.length === 0) {
            fetchTechniques();
        }
    }, [showTechniques]);

    return (
        <div className="spirit-tablet p-5 rounded-xl border border-blue-900/30 hover:border-blue-500/30 transition-colors relative group">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h4 className="text-lg font-title text-blue-300">TÀNG KINH CÁC</h4>
                    <p className="text-xs text-slate-500">Lưu giữ bí tịch và công pháp</p>
                </div>
                <span className="px-2 py-0.5 bg-blue-900/40 border border-blue-700/50 text-blue-200 text-[10px] rounded">
                    Cấp {level}/{maxLevel}
                </span>
            </div>

            <div className="h-24 bg-gradient-to-b from-blue-900/20 to-transparent rounded border border-white/5 flex items-center justify-center mb-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1)_0%,transparent_60%)]" />
                <motion.div
                    className="w-16 h-20 border-2 border-blue-500/30 bg-gradient-to-b from-blue-800/30 to-blue-950/50 rounded-sm flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.15)] relative"
                    animate={{ y: level > 0 ? [0, -2, 0] : 0 }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    <div className="absolute top-1 left-1 right-1 h-0.5 bg-blue-400/30" />
                    <div className="absolute top-2.5 left-1 right-1 h-0.5 bg-blue-400/20" />
                    <div className="absolute top-4 left-1 right-1 h-0.5 bg-blue-400/10" />
                    <span className="text-blue-400/80 text-[10px] font-title tracking-widest">CÁC</span>
                </motion.div>
            </div>

            <div className="bg-black/30 rounded p-2 mb-4 border border-slate-800/50">
                <div className="text-[10px] text-slate-500 uppercase mb-1">Công pháp mở khóa</div>
                <div className="text-sm text-blue-400">{EFFECTS[level]?.description}</div>
                {level < maxLevel && (
                    <div className="text-[10px] text-slate-600 mt-1">
                        Cấp tiếp: {EFFECTS[nextLevel]?.description}
                    </div>
                )}
            </div>

            <div className="flex justify-between items-end mb-3">
                {canUpgrade ? (
                    <div className="text-[10px] text-amber-500">
                        Chi phí: {upgradeCost.toLocaleString()} Linh Khí
                    </div>
                ) : (
                    <div className="text-[10px] text-slate-600">
                        {level >= maxLevel ? 'Đã tối đa' : level === 0 ? 'Chưa xây' : ''}
                    </div>
                )}
                <div className="flex gap-2">
                    {level > 0 && (
                        <button
                            onClick={() => setShowTechniques(!showTechniques)}
                            className="text-xs bg-blue-900/30 hover:bg-blue-800/50 text-blue-300 px-3 py-1.5 rounded border border-blue-500/30 transition-all"
                        >
                            {showTechniques ? 'Đóng' : 'Xem Công Pháp'}
                        </button>
                    )}
                    <button
                        onClick={() => onUpgrade(buildingId)}
                        disabled={!canUpgrade || actionLoading === 'upgrade-' + buildingId}
                        className="text-xs bg-slate-800 hover:bg-blue-900/50 text-blue-400 px-3 py-1.5 rounded border border-slate-700 hover:border-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {actionLoading === 'upgrade-' + buildingId ? '...' : level >= maxLevel ? 'Tối Đa' : 'Nâng Cấp'}
                    </button>
                </div>
            </div>

            {showTechniques && (
                <div className="border-t border-slate-800 pt-3 mt-3 space-y-2 max-h-64 overflow-y-auto scrollbar-cultivation">
                    <div className="flex justify-between items-center mb-2">
                        <div className="text-[10px] text-slate-500 uppercase">Công pháp Tông Môn</div>
                        <div className="text-[10px] text-emerald-400">Điểm tuần: {weeklyContribution}</div>
                    </div>

                    {loadingTech ? (
                        <div className="text-center text-slate-500 text-sm py-4">Đang tải...</div>
                    ) : techniques.length === 0 ? (
                        <div className="text-center text-slate-500 text-sm py-4">Chưa có công pháp</div>
                    ) : (
                        techniques.map((tech) => (
                            <div
                                key={tech.id}
                                className={'p-3 rounded border ' + (RARITY_COLORS[tech.rarity]?.border || RARITY_COLORS.common.border) + ' ' + (RARITY_COLORS[tech.rarity]?.bg || RARITY_COLORS.common.bg)}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <div className={'font-title text-sm ' + (RARITY_COLORS[tech.rarity]?.text || RARITY_COLORS.common.text)}>{tech.name}</div>
                                    <span className="text-[10px] uppercase opacity-70">{RARITY_COLORS[tech.rarity]?.label || 'Phàm Phẩm'}</span>
                                </div>
                                <p className="text-[10px] text-slate-400 mb-2">{tech.description}</p>

                                {/* Lock Status */}
                                {tech.isUnlocked === false && tech.unlockRequirement && (
                                    <div className="mb-2 px-2 py-1 bg-red-900/20 border border-red-500/30 rounded">
                                        <div className="text-[10px] text-red-400">
                                            {tech.unlockRequirement}
                                        </div>
                                    </div>
                                )}

                                {tech.stats && (
                                    <div className="flex flex-wrap gap-1 mb-2">
                                        {Object.entries(tech.stats).map(([stat, val]) => (
                                            <span key={stat} className="text-[9px] bg-black/30 px-1.5 py-0.5 rounded">
                                                {stat}: +{Math.round(val * 100)}%
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-amber-500">
                                        {tech.contributionCost} điểm
                                    </span>
                                    {tech.learned ? (
                                        <span className="text-[10px] text-emerald-400">Đã học</span>
                                    ) : (
                                        <button
                                            onClick={() => handleLearnTechnique(tech.id)}
                                            disabled={!tech.canAfford || learningId === tech.id || tech.isUnlocked === false}
                                            className="text-[10px] bg-blue-800/50 hover:bg-blue-700 text-blue-200 px-2 py-1 rounded border border-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {learningId === tech.id ? '...' : tech.isUnlocked === false ? 'Khóa' : 'Học'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default Library;
