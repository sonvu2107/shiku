/**
 * Craft Tab - Equipment Crafting UI
 * Luyện chế trang bị từ nguyên liệu
 */

import { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCultivation } from '../../../hooks/useCultivation.jsx';
import { api } from '../../../api';
import LoadingSkeleton from './LoadingSkeleton.jsx';

// ==================== RARITY CONFIG ====================
const RARITY_COLORS = {
    common: { text: 'text-slate-300', bg: 'bg-slate-800/50', border: 'border-slate-600/40', label: 'Phàm Phẩm', glow: '' },
    uncommon: { text: 'text-emerald-400', bg: 'bg-emerald-900/20', border: 'border-emerald-500/30', label: 'Tinh Phẩm', glow: 'shadow-emerald-500/20' },
    rare: { text: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-500/30', label: 'Hiếm Có', glow: 'shadow-blue-500/20' },
    epic: { text: 'text-purple-400', bg: 'bg-purple-900/20', border: 'border-purple-500/30', label: 'Cực Phẩm', glow: 'shadow-purple-500/20' },
    legendary: { text: 'text-amber-400', bg: 'bg-amber-900/20', border: 'border-amber-500/30', label: 'Thần Bảo', glow: 'shadow-amber-500/20' },
    mythic: { text: 'text-rose-400', bg: 'bg-rose-900/20', border: 'border-rose-500/30', label: 'Thần Thoại', glow: 'shadow-rose-500/30' }
};

const ELEMENT_COLORS = {
    metal: { text: 'text-yellow-300', bg: 'bg-yellow-900/30', name: 'Kim' },
    wood: { text: 'text-green-400', bg: 'bg-green-900/30', name: 'Mộc' },
    water: { text: 'text-cyan-400', bg: 'bg-cyan-900/30', name: 'Thủy' },
    fire: { text: 'text-orange-400', bg: 'bg-orange-900/30', name: 'Hỏa' },
    earth: { text: 'text-amber-600', bg: 'bg-amber-900/30', name: 'Thổ' }
};

const TYPE_NAMES = {
    weapon: 'Vũ Khí',
    armor: 'Giáp',
    accessory: 'Trang Sức',
    magic_treasure: 'Pháp Bảo'
};

// Helper to get material image path
const getMaterialImage = (templateId) => {
    return `/assets/materials/${templateId}.jpg`;
};

// Việt hóa tên stats
const STAT_LABELS = {
    attack: 'Công kích',
    defense: 'Phòng thủ',
    hp: 'Khí huyết',
    crit_rate: 'Tỷ lệ chí mạng',
    crit_damage: 'Sát thương chí mạng',
    penetration: 'Xuyên thấu',
    speed: 'Tốc độ',
    evasion: 'Né tránh',
    hit_rate: 'Độ chính xác',
    lifesteal: 'Hấp huyết',
    energy_regen: 'Hồi phục'
};

const CraftTab = memo(function CraftTab() {
    const { cultivation, refresh } = useCultivation();

    // State
    const [materials, setMaterials] = useState([]);
    const [craftableTypes, setCraftableTypes] = useState([]);
    const [selectedMaterials, setSelectedMaterials] = useState([]);
    const [selectedType, setSelectedType] = useState(null);
    const [selectedSubtype, setSelectedSubtype] = useState(null);
    const [preview, setPreview] = useState(null);
    const [crafting, setCrafting] = useState(false);
    const [craftResult, setCraftResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedType, setExpandedType] = useState(null);
    const [filterTier, setFilterTier] = useState('all');
    const [filterElement, setFilterElement] = useState('all');

    // Load data on mount
    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [materialsRes, typesRes] = await Promise.all([
                api('/api/cultivation/materials/inventory'),
                api('/api/cultivation/craft/types')
            ]);

            setMaterials(materialsRes?.data?.materials || []);
            setCraftableTypes(typesRes?.data?.types || []);
        } catch (err) {
            console.error('[CraftTab] Load error:', err);
            setError(err.message || 'Lỗi tải dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    // Group types by category
    const groupedTypes = craftableTypes.reduce((acc, t) => {
        if (!acc[t.type]) acc[t.type] = [];
        acc[t.type].push(t);
        return acc;
    }, {});

    // Filter materials
    const filteredMaterials = materials.filter(m => {
        if (filterTier !== 'all' && m.tier !== parseInt(filterTier)) return false;
        if (filterElement !== 'all' && m.element !== filterElement) return false;
        return true;
    });

    // Get unique tiers and elements for filters
    const uniqueTiers = [...new Set(materials.map(m => m.tier))].sort((a, b) => a - b);
    const uniqueElements = [...new Set(materials.map(m => m.element).filter(Boolean))];

    // Toggle material selection
    const toggleMaterial = (material) => {
        const matId = `${material.templateId}_${material.rarity}`;

        if (selectedMaterials.find(sm => sm.id === matId)) {
            setSelectedMaterials(prev => prev.filter(sm => sm.id !== matId));
        } else if (selectedMaterials.length < 5) {
            // Check tier consistency
            if (selectedMaterials.length > 0 && selectedMaterials[0].tier !== material.tier) {
                setError('Thiên tài địa bảo phải cùng phẩm chất');
                setTimeout(() => setError(null), 3000);
                return;
            }
            setSelectedMaterials(prev => [...prev, { id: matId, ...material }]);
        }
    };

    // Preview craft when materials change
    useEffect(() => {
        if (selectedMaterials.length >= 3) {
            const doPreview = async () => {
                try {
                    const res = await api('/api/cultivation/craft/preview', {
                        method: 'POST',
                        body: { materialIds: selectedMaterials.map(m => m.id) }
                    });
                    setPreview(res?.data);
                } catch (err) {
                    console.error('Preview error:', err);
                }
            };
            doPreview();
        } else {
            setPreview(null);
        }
    }, [selectedMaterials]);

    // Execute craft
    const executeCraft = async () => {
        if (!selectedType || !selectedSubtype || selectedMaterials.length < 3) return;

        try {
            setCrafting(true);
            setCraftResult(null);

            const res = await api('/api/cultivation/craft/execute', {
                method: 'POST',
                body: {
                    materialIds: selectedMaterials.map(m => m.id),
                    targetType: selectedType,
                    targetSubtype: selectedSubtype
                }
            });

            setCraftResult(res?.data);
            setSelectedMaterials([]);
            setPreview(null);

            // Refresh data
            await loadData();
            refresh();
        } catch (err) {
            console.error('[CraftTab] Craft error:', err);
            setError(err.message || 'Lỗi luyện chế');
            setTimeout(() => setError(null), 5000);
        } finally {
            setCrafting(false);
        }
    };

    if (loading) {
        return <LoadingSkeleton />;
    }

    return (
        <div className="space-y-6 pb-4">
            <h3 className="font-bold text-gold font-title tracking-wide text-xl lg:text-2xl">
                LUYỆN KHÍ - TRANG BỊ
            </h3>

            {/* Error Message */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="bg-red-900/30 border border-red-500/50 rounded-lg p-3 text-red-300"
                    >
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Craft Result Modal */}
            <AnimatePresence>
                {craftResult && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
                        onClick={() => setCraftResult(null)}
                    >
                        <motion.div
                            initial={{ y: 50 }}
                            animate={{ y: 0 }}
                            className={`spirit-tablet rounded-2xl p-6 max-w-md w-full ${RARITY_COLORS[craftResult.equipment?.rarity]?.bg} ${RARITY_COLORS[craftResult.equipment?.rarity]?.border} shadow-xl ${RARITY_COLORS[craftResult.equipment?.rarity]?.glow}`}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="text-center space-y-4">
                                <motion.div
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ duration: 0.5 }}
                                    className={`text-4xl font-bold mx-auto ${RARITY_COLORS[craftResult.equipment?.rarity]?.text}`}
                                >
                                    +
                                </motion.div>

                                <h4 className="text-xl font-bold text-gold font-title">LUYỆN CHẾ THÀNH CÔNG!</h4>

                                <div className={`text-2xl font-bold ${RARITY_COLORS[craftResult.equipment?.rarity]?.text}`}>
                                    {craftResult.equipment?.name}
                                </div>

                                <div className="flex justify-center gap-2 flex-wrap">
                                    <span className={`px-2 py-1 rounded text-xs ${RARITY_COLORS[craftResult.equipment?.rarity]?.bg} ${RARITY_COLORS[craftResult.equipment?.rarity]?.text}`}>
                                        {RARITY_COLORS[craftResult.equipment?.rarity]?.label}
                                    </span>
                                    {craftResult.equipment?.element && (
                                        <span className={`px-2 py-1 rounded text-xs ${ELEMENT_COLORS[craftResult.equipment.element]?.bg} ${ELEMENT_COLORS[craftResult.equipment.element]?.text}`}>
                                            {ELEMENT_COLORS[craftResult.equipment.element]?.name}
                                        </span>
                                    )}
                                    <span className="px-2 py-1 rounded text-xs bg-slate-700 text-slate-300">
                                        Phẩm {craftResult.equipment?.tier}
                                    </span>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-2 gap-2 text-sm text-left bg-slate-900/50 rounded-lg p-3">
                                    {Object.entries(craftResult.equipment?.stats || {}).map(([key, value]) => (
                                        value > 0 && (
                                            <div key={key} className="flex justify-between">
                                                <span className="text-slate-400">{STAT_LABELS[key] || key}</span>
                                                <span className="text-emerald-400">+{value}</span>
                                            </div>
                                        )
                                    ))}
                                </div>

                                <button
                                    onClick={() => setCraftResult(null)}
                                    className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold transition-colors"
                                >
                                    Đóng
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Materials Selection */}
                <div className="space-y-4">
                    <div className="spirit-tablet rounded-xl p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-blue-400">
                                KHO THIÊN TÀI ĐỊA BẢO
                            </h4>
                            <span className="text-xs text-slate-500">{materials.length} loại</span>
                        </div>

                        {/* Filters */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <select
                                value={filterTier}
                                onChange={e => setFilterTier(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-600 text-sm text-slate-300 focus:outline-none focus:border-amber-500 hover:border-slate-500 transition-colors cursor-pointer"
                            >
                                <option value="all">Phẩm chất: Tất cả</option>
                                {uniqueTiers.map(t => (
                                    <option key={t} value={t}>Phẩm {t}</option>
                                ))}
                            </select>

                            <select
                                value={filterElement}
                                onChange={e => setFilterElement(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-600 text-sm text-slate-300 focus:outline-none focus:border-amber-500 hover:border-slate-500 transition-colors cursor-pointer"
                            >
                                <option value="all">Ngũ hành: Tất cả</option>
                                {uniqueElements.map(el => (
                                    <option key={el} value={el}>{ELEMENT_COLORS[el]?.name || el}</option>
                                ))}
                            </select>
                        </div>

                        {/* Materials Grid */}
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                            {filteredMaterials.length === 0 ? (
                                <div className="col-span-full text-center text-slate-500 py-8">
                                    Không có thiên tài địa bảo
                                </div>
                            ) : (
                                filteredMaterials.map((mat, idx) => {
                                    const matId = `${mat.templateId}_${mat.rarity}`;
                                    const isSelected = selectedMaterials.find(sm => sm.id === matId);
                                    const rarity = RARITY_COLORS[mat.rarity] || RARITY_COLORS.common;
                                    const element = ELEMENT_COLORS[mat.element];

                                    return (
                                        <motion.button
                                            key={`${matId}-${idx}`}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => toggleMaterial(mat)}
                                            disabled={mat.qty <= 0}
                                            className={`relative p-3 rounded-xl border transition-all flex flex-col items-center min-h-[110px] ${rarity.bg} ${rarity.border} ${isSelected ? 'ring-2 ring-amber-400 shadow-lg shadow-amber-500/20' : ''} ${mat.qty <= 0 ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-110'}`}
                                        >
                                            {/* Element badge */}
                                            {element && (
                                                <span className={`absolute top-1 left-1 text-[8px] px-1 rounded ${element.bg} ${element.text}`}>
                                                    {element.name}
                                                </span>
                                            )}

                                            {/* Phẩm chất badge */}
                                            <span className="absolute top-1 right-1 text-[10px] bg-slate-900/80 px-1 rounded">
                                                P{mat.tier}
                                            </span>

                                            {/* Material image */}
                                            <div className="w-12 h-12 mb-2 rounded-lg overflow-hidden shrink-0 shadow-sm mt-1">
                                                <img
                                                    src={getMaterialImage(mat.templateId)}
                                                    alt={mat.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { e.target.src = '/assets/materials/mat_iron_ore.jpg'; }}
                                                />
                                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[9px] text-center text-white py-0.5 backdrop-blur-[1px]">
                                                    {rarity.label}
                                                </div>
                                            </div>

                                            <div className={`text-xs font-medium truncate w-full text-center text-ellipsis ${rarity.text}`}>
                                                {mat.name}
                                            </div>

                                            {/* Quantity */}
                                            <div className="text-xs text-amber-400 font-bold">
                                                x{mat.qty}
                                            </div>

                                            {/* Selected indicator */}
                                            {isSelected && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center text-xs text-white font-bold"
                                                >
                                                    +
                                                </motion.div>
                                            )}
                                        </motion.button>
                                    );
                                })
                            )}
                        </div>

                        {/* Selected Materials */}
                        {selectedMaterials.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-700">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-slate-400">Đã chọn ({selectedMaterials.length}/5)</span>
                                    <button
                                        onClick={() => setSelectedMaterials([])}
                                        className="text-xs text-red-400 hover:text-red-300"
                                    >
                                        Xóa tất cả
                                    </button>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    {selectedMaterials.map(mat => (
                                        <span
                                            key={mat.id}
                                            className={`px-2 py-1 rounded text-xs ${RARITY_COLORS[mat.rarity]?.bg} ${RARITY_COLORS[mat.rarity]?.text} cursor-pointer hover:line-through`}
                                            onClick={() => toggleMaterial(mat)}
                                        >
                                            {mat.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Crafting Panel */}
                <div className="space-y-4">
                    {/* Equipment Type Selection */}
                    <div className="spirit-tablet rounded-xl p-4">
                        <h4 className="font-bold text-purple-400 mb-4">
                            CHỌN LOẠI TRANG BỊ
                        </h4>

                        <div className="space-y-2">
                            {Object.entries(groupedTypes).map(([type, subtypes]) => {
                                const isExpanded = expandedType === type;

                                return (
                                    <div key={type} className="border border-slate-700 rounded-xl overflow-hidden mb-2">
                                        <button
                                            onClick={() => setExpandedType(isExpanded ? null : type)}
                                            className="w-full flex items-center justify-between p-4 bg-slate-800/80 hover:bg-slate-700/80 transition-all active:bg-slate-700"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-200">
                                                    {TYPE_NAMES[type] || type}
                                                </span>
                                                <span className="text-xs text-slate-500">({subtypes.length})</span>
                                            </div>
                                            <span>{isExpanded ? '▼' : '▶'}</span>
                                        </button>

                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height: 'auto' }}
                                                    exit={{ height: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-900/50 border-t border-slate-700/50">
                                                        {subtypes.map(sub => (
                                                            <button
                                                                key={sub.subtype}
                                                                onClick={() => {
                                                                    setSelectedType(type);
                                                                    setSelectedSubtype(sub.subtype);
                                                                }}
                                                                className={`p-3 rounded-xl border text-sm transition-all flex flex-col justify-center min-h-[70px] ${selectedType === type && selectedSubtype === sub.subtype
                                                                    ? 'bg-amber-600 border-amber-400 text-white shadow-lg shadow-amber-900/50'
                                                                    : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500'
                                                                    }`}
                                                            >
                                                                <div className="font-bold mb-1 text-base">{sub.name}</div>
                                                                <div className={`text-[11px] leading-tight ${selectedType === type && selectedSubtype === sub.subtype ? 'text-amber-100' : 'text-slate-400'}`}>{sub.description}</div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Preview Panel */}
                    {preview && preview.valid && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="spirit-tablet rounded-xl p-4 bg-gradient-to-br from-purple-900/30 to-slate-900/50"
                        >
                            <h4 className="font-bold text-emerald-400 mb-3">
                                XEM TRƯỚC
                            </h4>

                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Phẩm chất kết quả:</span>
                                    <span className="text-amber-400 font-bold">Phẩm {preview.tier}</span>
                                </div>

                                {preview.dominantElement && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Nguyên tố:</span>
                                        <span className={ELEMENT_COLORS[preview.dominantElement]?.text}>
                                            {ELEMENT_COLORS[preview.dominantElement]?.name}
                                        </span>
                                    </div>
                                )}

                                <div className="border-t border-slate-700 pt-3">
                                    <span className="text-xs text-slate-500 uppercase">Tỷ lệ kết quả</span>
                                    <div className="mt-2 space-y-1">
                                        {Object.entries(preview.probabilities || {})
                                            .filter(([_, pct]) => pct > 0)
                                            .map(([rarity, pct]) => (
                                                <div key={rarity} className="flex items-center gap-2">
                                                    <div className="w-20 h-2 bg-slate-700 rounded overflow-hidden">
                                                        <div
                                                            className={`h-full ${rarity === 'mythic' ? 'bg-rose-500' : rarity === 'legendary' ? 'bg-amber-500' : rarity === 'epic' ? 'bg-purple-500' : rarity === 'rare' ? 'bg-blue-500' : rarity === 'uncommon' ? 'bg-emerald-500' : 'bg-slate-500'}`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-xs ${RARITY_COLORS[rarity]?.text}`}>
                                                        {RARITY_COLORS[rarity]?.label}: {pct}%
                                                    </span>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Craft Button */}
                    <button
                        onClick={executeCraft}
                        disabled={crafting || selectedMaterials.length < 3 || !selectedType || !selectedSubtype}
                        className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${crafting || selectedMaterials.length < 3 || !selectedType || !selectedSubtype
                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50'
                            }`}
                    >
                        {crafting ? (
                            <>
                                <motion.span
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                    className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                                />
                                Đang luyện chế...
                            </>
                        ) : (
                            <>
                                LUYỆN CHẾ
                                {selectedMaterials.length < 3 && <span className="text-sm font-normal ml-2">(Cần {3 - selectedMaterials.length} nguyên liệu nữa)</span>}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div >
    );
});

export default CraftTab;
