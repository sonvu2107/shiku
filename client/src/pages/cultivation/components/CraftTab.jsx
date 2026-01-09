/**
 * Craft Tab - Equipment Crafting UI
 * Luyện chế trang bị từ nguyên liệu
 */

import { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCultivation } from '../../../hooks/useCultivation.jsx';
import { api } from '../../../api';
import LoadingSkeleton from './LoadingSkeleton.jsx';
import Furnace from './Furnace.jsx';

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
    attack: 'Tấn Công',
    defense: 'Phòng Thủ',
    hp: 'Khí Huyết',
    qiBlood: 'Khí Huyết',
    zhenYuan: 'Chân Nguyên',
    crit_rate: 'Chí Mạng',
    criticalRate: 'Chí Mạng',
    crit_damage: 'Sát Thương Chí Mạng',
    criticalDamage: 'Sát Thương Chí Mạng',
    penetration: 'Xuyên Thấu',
    speed: 'Tốc Độ',
    evasion: 'Né Tránh',
    dodge: 'Né Tránh',
    hit_rate: 'Chính Xác',
    accuracy: 'Chính Xác',
    lifesteal: 'Hấp Huyết',
    energy_regen: 'Hồi Linh Lực',
    regeneration: 'Hồi Phục',
    resistance: 'Kháng Cự',
    luck: 'Vận Khí',
    true_damage: 'Sát Thương Chuẩn'
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
    const [useCatalyst, setUseCatalyst] = useState(false);

    // Check for catalyst in inventory
    const catalystCount = cultivation?.inventory?.find(i => i.itemId === 'craft_catalyst_luck')?.quantity || 0;

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
                        body: {
                            materialIds: selectedMaterials.map(m => m.id),
                            useCatalyst // Send catalyst flag
                        }
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
    }, [selectedMaterials, useCatalyst]);

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
                    targetSubtype: selectedSubtype,
                    useCatalyst
                }
            });

            setCraftResult(res?.data);
            setSelectedMaterials([]);
            setPreview(null);

            // Chỉ refresh local materials ngay, còn cultivation context sẽ refresh khi đóng dialog
            await loadData();
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
        <div className="space-y-4 pb-4">
            <h3 className="font-bold text-gold font-title tracking-wide text-xl lg:text-2xl text-center mb-6">
                LUYỆN KHÍ ĐÀI
            </h3>

            {/* Error Message */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-red-900/90 border border-red-500/50 rounded-lg p-3 text-red-300 shadow-xl backdrop-blur-md"
                    >
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Craft Result Modal - Keep existing logic */}
            <AnimatePresence>
                {craftResult && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                        onClick={() => setCraftResult(null)}
                    >
                        {/* ... Existing Result Modal Content ... */}
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
                                    ✦
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
                                <div className="grid grid-cols-2 gap-2 text-sm text-left bg-black/40 rounded-lg p-3 border border-white/5">
                                    {Object.entries(craftResult.equipment?.stats || {}).map(([key, value]) => {
                                        const IGNORED = ['price', 'qiBlood', 'criticalRate', 'criticalDamage', 'dodge', 'accuracy', 'elemental_damage'];
                                        if (IGNORED.includes(key) || value === 0 || typeof value !== 'number' || !Number.isFinite(value)) return null;

                                        const PERCENT_STATS = ['crit_rate', 'crit_damage', 'evasion', 'hit_rate', 'lifesteal', 'resistance'];
                                        const isPercent = PERCENT_STATS.includes(key);
                                        const formattedValue = isPercent ? `${(value * 100).toFixed(2)}%` : Math.floor(value);

                                        return (
                                            <div key={key} className="flex justify-between items-center">
                                                <span className="text-slate-400 capitalize">{STAT_LABELS[key] || key}</span>
                                                <span className="text-emerald-400 font-medium">+{formattedValue}</span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Durability */}
                                {craftResult.equipment?.durability && (
                                    <div className="bg-black/40 rounded-lg p-3 mt-2 border border-white/5">
                                        <div className="flex justify-between items-center text-sm mb-1">
                                            <span className="text-slate-400">Độ Bền</span>
                                            <span className="text-emerald-400">
                                                {craftResult.equipment.durability.current}/{craftResult.equipment.durability.max}
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-500 transition-all"
                                                style={{ width: '100%' }}
                                            />
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={async () => {
                                        setCraftResult(null);
                                        await refresh();
                                    }}
                                    className="w-full px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-amber-900/30"
                                >
                                    Thu Nhận
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* CENTER AREA: FURNACE (Mobile: Top, Desktop: Left-Center) */}
                <div className="lg:col-span-4 order-1 lg:order-2 flex flex-col">
                    <div className="bg-black/40 rounded-2xl p-4 border border-white/5 shadow-xl relative overflow-hidden min-h-[400px] flex items-center justify-center">
                        {/* Decorative Background */}
                        <div className="absolute inset-0 bg-[url('/assets/bg_pattern.png')] opacity-5"></div>

                        <Furnace
                            selectedMaterials={selectedMaterials}
                            onRemoveMaterial={(m) => toggleMaterial(m)}
                            crafting={crafting}
                        />

                        {/* Quick Action Hint */}
                        {selectedMaterials.length === 0 && (
                            <div className="absolute bottom-4 text-center w-full text-slate-500 text-sm animate-pulse">
                                Chọn nguyên liệu từ túi bên dưới
                            </div>
                        )}
                    </div>

                    {/* Craft Button Area */}
                    <div className="mt-4 space-y-3">
                        {/* Catalyst Checkbox */}
                        {catalystCount > 0 && (
                            <div
                                onClick={() => setUseCatalyst(!useCatalyst)}
                                className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${useCatalyst
                                    ? 'bg-purple-900/30 border-purple-500/50'
                                    : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-slate-900 border border-slate-700 flex items-center justify-center">
                                        <img src="/assets/danduoc.jpg" alt="Catalyst" className="w-6 h-6 object-cover" />
                                    </div>
                                    <div className="text-left">
                                        <div className={`font-bold text-sm ${useCatalyst ? 'text-purple-400' : 'text-slate-300'}`}>
                                            Thiên Địa Tạo Hóa Đan
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            Gia tăng 20% (x1.2) cơ hội ra đồ xịn nhất
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-white bg-slate-700 px-2 py-0.5 rounded-full">
                                        Còn: {catalystCount}
                                    </span>
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${useCatalyst ? 'bg-purple-500 border-purple-400' : 'border-slate-500'
                                        }`}>
                                        {useCatalyst && <span className="text-white text-xs">✓</span>}
                                    </div>
                                </div>
                            </div>
                        )}
                        <button
                            onClick={executeCraft}
                            disabled={crafting || selectedMaterials.length < 3 || !selectedType || !selectedSubtype}
                            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all relative overflow-hidden group ${crafting || selectedMaterials.length < 3 || !selectedType || !selectedSubtype
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                : 'bg-gradient-to-r from-amber-700 via-orange-600 to-red-700 text-white shadow-lg shadow-orange-900/40 hover:brightness-110 active:scale-95'
                                }`}
                        >
                            {crafting ? (
                                <>
                                    <motion.span
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                        className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                                    />
                                    Đang Vận Công...
                                </>
                            ) : (
                                <>
                                    <span className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></span>
                                    KHAI LÒ LUYỆN KHÍ
                                </>
                            )}
                        </button>
                        {selectedMaterials.length < 3 && !crafting && (
                            <div className="text-center text-xs text-slate-500 mt-2">
                                Cần tối thiểu 3 nguyên liệu
                            </div>
                        )}
                    </div>
                </div>

                {/* LEFT SIDE: CONTROLS (Desktop: Left) */}
                <div className="lg:col-span-3 order-2 lg:order-1 space-y-4">
                    <div className="spirit-tablet rounded-xl p-4 h-full max-h-[600px] overflow-y-auto custom-scrollbar">
                        <h4 className="font-bold text-purple-400 mb-4 border-b border-white/10 pb-2">
                            CÔNG THỨC
                        </h4>

                        <div className="space-y-2">
                            {Object.entries(groupedTypes).map(([type, subtypes]) => {
                                const isExpanded = expandedType === type;
                                const hasSelection = selectedType === type;

                                return (
                                    <div key={type} className={`border rounded-xl overflow-hidden transition-all ${hasSelection ? 'border-amber-500/50 bg-amber-900/10' : 'border-slate-700 bg-slate-800/30'}`}>
                                        <button
                                            onClick={() => setExpandedType(isExpanded ? null : type)}
                                            className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className={`font-bold ${hasSelection ? 'text-amber-400' : 'text-slate-300'}`}>
                                                    {TYPE_NAMES[type] || type}
                                                </span>
                                            </div>
                                            <span className="text-xs text-slate-500">{isExpanded ? '▼' : '▶'}</span>
                                        </button>

                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height: 'auto' }}
                                                    exit={{ height: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="grid grid-cols-1 gap-1 p-2 bg-black/20">
                                                        {subtypes.map(sub => (
                                                            <button
                                                                key={sub.subtype}
                                                                onClick={() => {
                                                                    setSelectedType(type);
                                                                    setSelectedSubtype(sub.subtype);
                                                                }}
                                                                className={`p-2 rounded-lg text-left text-sm transition-all flex items-center justify-between ${selectedType === type && selectedSubtype === sub.subtype
                                                                    ? 'bg-amber-600 text-white shadow-md'
                                                                    : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'
                                                                    }`}
                                                            >
                                                                <span>{sub.name}</span>
                                                                {selectedType === type && selectedSubtype === sub.subtype && (
                                                                    <span className="text-[10px] opacity-80">Đã chọn</span>
                                                                )}
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
                </div>

                {/* RIGHT SIDE: PREVIEW & INFO (Desktop: Right) */}
                <div className="lg:col-span-5 order-3 space-y-4">
                    {/* Preview Panel */}
                    {preview && preview.valid ? (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="spirit-tablet rounded-xl p-5 bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50"
                        >
                            <h4 className="font-bold text-emerald-400 mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                DỰ ĐOÁN KẾT QUẢ
                            </h4>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg">
                                    <span className="text-slate-400 text-sm">Phẩm chất dự kiến</span>
                                    <span className={`font-bold ${RARITY_COLORS[preview.probabilityTable]?.text} text-lg`}>
                                        {RARITY_COLORS[preview.probabilityTable]?.label || 'Không xác định'}
                                    </span>
                                </div>

                                {preview.dominantElement && (
                                    <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg">
                                        <span className="text-slate-400 text-sm">Hệ chủ đạo (Buff)</span>
                                        <span className={`px-2 py-0.5 rounded text-sm ${ELEMENT_COLORS[preview.dominantElement]?.bg} ${ELEMENT_COLORS[preview.dominantElement]?.text}`}>
                                            {ELEMENT_COLORS[preview.dominantElement]?.name}
                                        </span>
                                    </div>
                                )}

                                <div className="pt-2">
                                    <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Tỷ lệ thành công</span>
                                    <div className="mt-3 space-y-2">
                                        {Object.entries(preview.probabilities || {})
                                            .filter(([_, pct]) => pct > 0)
                                            .map(([rarity, pct]) => (
                                                <div key={rarity} className="space-y-1">
                                                    <div className="flex justify-between text-xs">
                                                        <span className={RARITY_COLORS[rarity]?.text}>{RARITY_COLORS[rarity]?.label}</span>
                                                        <span className="text-slate-400">{pct}%</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full opacity-80 ${rarity === 'mythic' ? 'bg-rose-500' : rarity === 'legendary' ? 'bg-amber-500' : rarity === 'epic' ? 'bg-purple-500' : rarity === 'rare' ? 'bg-blue-500' : rarity === 'uncommon' ? 'bg-emerald-500' : 'bg-slate-500'}`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="spirit-tablet rounded-xl p-6 text-center h-full flex flex-col items-center justify-center text-slate-500 border-dashed border-2 border-slate-700/50 bg-transparent min-h-[200px]">
                            <div className="text-4xl mb-3 opacity-20">?</div>
                            <p>Hãy chọn ít nhất 3 nguyên liệu<br />để xem dự đoán kết quả</p>
                        </div>
                    )}
                </div>

            </div>

            {/* BOTTOM: INVENTORY (Spans full width) */}
            <div className="mt-6">
                <div className="spirit-tablet rounded-xl p-4 bg-slate-900/80 border border-slate-700/50">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                        <div className="flex items-center gap-3">
                            <h4 className="font-bold text-blue-400">TÚI CÀN KHÔN</h4>
                            <span className="text-xs px-2 py-0.5 bg-slate-800 rounded-full text-slate-400">{filteredMaterials.length} vật phẩm</span>
                        </div>

                        {/* Filters */}
                        <div className="flex gap-2 w-full sm:w-auto">
                            <select
                                value={filterTier}
                                onChange={e => setFilterTier(e.target.value)}
                                className="flex-1 sm:w-32 px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                            >
                                <option value="all">Tất cả phẩm</option>
                                {uniqueTiers.map(t => (
                                    <option key={t} value={t}>Phẩm {t}</option>
                                ))}
                            </select>

                            <select
                                value={filterElement}
                                onChange={e => setFilterElement(e.target.value)}
                                className="flex-1 sm:w-32 px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                            >
                                <option value="all">Tất cả hệ</option>
                                {uniqueElements.map(el => (
                                    <option key={el} value={el}>{ELEMENT_COLORS[el]?.name || el}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Check if full */}
                    {selectedMaterials.length >= 5 && (
                        <div className="mb-2 text-center text-xs text-orange-400 animate-pulse">
                            Lò luyện đã đầy (Tối đa 5)
                        </div>
                    )}

                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                        {filteredMaterials.length === 0 ? (
                            <div className="col-span-full text-center text-slate-500 py-8 text-sm">
                                Không có nguyên liệu phù hợp
                            </div>
                        ) : (
                            filteredMaterials.map((mat, idx) => {
                                const matId = `${mat.templateId}_${mat.rarity}`;
                                const isSelected = selectedMaterials.find(sm => sm.id === matId);
                                const rarity = RARITY_COLORS[mat.rarity] || RARITY_COLORS.common;
                                const element = ELEMENT_COLORS[mat.element];
                                const isFull = selectedMaterials.length >= 5;

                                return (
                                    <motion.button
                                        key={`${matId}-${idx}`}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => toggleMaterial(mat)}
                                        disabled={mat.qty <= 0 || (isFull && !isSelected)}
                                        className={`relative p-2 rounded-xl border transition-all flex flex-col items-center min-h-[100px]
                                            ${rarity.bg} ${rarity.border} 
                                            ${isSelected
                                                ? 'ring-2 ring-amber-400 shadow-lg shadow-amber-500/20'
                                                : isFull
                                                    ? 'opacity-50 cursor-not-allowed'
                                                    : 'hover:brightness-110 cursor-pointer'
                                            }
                                            ${mat.qty <= 0 ? 'opacity-50 cursor-not-allowed' : ''}
                                        `}
                                    >
                                        {/* Element badge */}
                                        {element && (
                                            <span className={`absolute top-1 left-1 text-[8px] px-1 rounded ${element.bg} ${element.text}`}>
                                                {element.name}
                                            </span>
                                        )}

                                        {/* Tier badge */}
                                        <span className="absolute top-1 right-1 text-[10px] bg-slate-900/80 px-1 rounded text-white">
                                            P{mat.tier}
                                        </span>

                                        {/* Material image with rarity overlay */}
                                        <div className="w-12 h-12 mb-1 rounded-lg overflow-hidden relative shadow-sm">
                                            <img
                                                src={getMaterialImage(mat.templateId)}
                                                alt={mat.name}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                                onError={(e) => { e.target.src = '/assets/materials/mat_iron_ore.jpg'; }}
                                            />
                                            {/* Rarity label overlay */}
                                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-center text-white py-0.5 backdrop-blur-[1px]">
                                                {rarity.label}
                                            </div>
                                        </div>

                                        {/* Material name */}
                                        <div className={`text-xs font-medium truncate w-full text-center ${rarity.text}`}>
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
                                                ✓
                                            </motion.div>
                                        )}
                                    </motion.button>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
});

export default CraftTab;
