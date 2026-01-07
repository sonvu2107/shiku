/**
 * Combat Slots Section - Manage combat technique slots
 */
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { RARITY_COLORS } from '../utils/constants.js';
import useCultivation from '../../../hooks/useCultivation.jsx';

const CombatSlotsSection = ({ cultivationTechniques = [] }) => {
    const { cultivation, loadCombatSlots, equipCombatSlot, unequipCombatSlot } = useCultivation();
    const [loadingSlots, setLoadingSlots] = useState(true);
    const [slotsData, setSlotsData] = useState(null);
    const [showTechniqueModal, setShowTechniqueModal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Load slots data
    useEffect(() => {
        loadSlotsData();
    }, []);

    const loadSlotsData = async () => {
        try {
            setLoadingSlots(true);
            const data = await loadCombatSlots();
            setSlotsData(data);
        } catch (e) {
            console.error('Failed to load combat slots:', e);
        } finally {
            setLoadingSlots(false);
        }
    };

    const handleEquipToSlot = async (slotIndex, techniqueId) => {
        try {
            setActionLoading(true);
            await equipCombatSlot(slotIndex, techniqueId);
            await loadSlotsData();
            setShowTechniqueModal(false);
            setSelectedSlot(null);
        } catch (e) {
            console.error('Failed to equip technique:', e);
        } finally {
            setActionLoading(false);
        }
    };

    const handleUnequipFromSlot = async (slotIndex) => {
        try {
            setActionLoading(true);
            await unequipCombatSlot(slotIndex);
            await loadSlotsData();
        } catch (e) {
            console.error('Failed to unequip technique:', e);
        } finally {
            setActionLoading(false);
        }
    };

    const openTechniqueSelector = (slotIndex) => {
        setSelectedSlot(slotIndex);
        setShowTechniqueModal(true);
    };

    if (loadingSlots || !slotsData) {
        return (
            <div className="spirit-tablet rounded-xl p-6 animate-pulse">
                <div className="h-6 bg-slate-700 rounded w-48 mb-4"></div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {[0, 1, 2, 3, 4].map(i => (
                        <div key={i} className="h-32 bg-slate-700 rounded-lg"></div>
                    ))}
                </div>
            </div>
        );
    }

    const { maxSlots, equippedSlots, availableTechniques, currentRealmLevel } = slotsData;

    // Helper: Get requirement text for locked slots
    const getSlotRequirement = (slotIndex) => {
        if (slotIndex <= 1) return { realm: 1, name: 'Phàm Nhân' };
        if (slotIndex === 2) return { realm: 3, name: 'Trúc Cơ' };
        if (slotIndex === 3) return { realm: 5, name: 'Nguyên Anh' };
        return { realm: 7, name: 'Luyện Hư' };
    };

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h4 className="text-lg font-bold text-red-400 font-title">CÔNG PHÁP CHIẾN ĐẤU</h4>
                <span className="text-xs text-slate-500">
                    ({equippedSlots?.length || 0}/{maxSlots} vị trí)
                </span>
            </div>

            <p className="text-xs text-slate-500">
                Chọn tối đa {maxSlots} công pháp để sử dụng trong PK và Bí Cảnh
            </p>

            {/* Slots Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {[0, 1, 2, 3, 4].map(slotIndex => {
                    const isUnlocked = slotIndex < maxSlots;
                    const requirement = getSlotRequirement(slotIndex);
                    const equippedTechnique = equippedSlots?.find(s => s.slotIndex === slotIndex);

                    // Find technique details
                    let techniqueInfo = null;
                    if (equippedTechnique) {
                        techniqueInfo = availableTechniques?.find(t => t.techniqueId === equippedTechnique.techniqueId);
                    }

                    return (
                        <div
                            key={slotIndex}
                            className={`spirit-tablet rounded-lg p-4 min-h-[140px] flex flex-col ${isUnlocked
                                ? equippedTechnique
                                    ? 'bg-red-900/20 border border-red-500/40'
                                    : 'bg-slate-800/50 border border-slate-600/30'
                                : 'bg-slate-900/30 border border-slate-700/20 opacity-60'
                                }`}
                        >
                            {/* Slot Header */}
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-slate-500 font-bold">Vị trí {slotIndex + 1}</span>
                            </div>

                            {/* Locked Slot */}
                            {!isUnlocked && (
                                <div className="flex-1 flex flex-col items-center justify-center text-center">
                                    <div className="w-8 h-8 rounded-full bg-slate-800/50 border border-slate-600 flex items-center justify-center mb-2">
                                        <span className="text-slate-500 text-lg">🔒</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500">
                                        Cần đạt
                                    </p>
                                    <p className="text-xs text-slate-400 font-bold">
                                        {requirement.name}
                                    </p>
                                </div>
                            )}

                            {/* Empty Unlocked Slot */}
                            {isUnlocked && !equippedTechnique && (
                                <div className="flex-1 flex flex-col items-center justify-center">
                                    <button
                                        onClick={() => openTechniqueSelector(slotIndex)}
                                        disabled={!availableTechniques || availableTechniques.length === 0}
                                        className="w-full py-2 rounded-lg text-xs font-bold uppercase bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        Chọn Công Pháp
                                    </button>
                                </div>
                            )}

                            {/* Equipped Technique */}
                            {isUnlocked && equippedTechnique && techniqueInfo && (
                                <div className="flex-1 flex flex-col">
                                    <div className="flex-1 mb-2">
                                        <p className="text-sm font-bold text-red-300 truncate" title={techniqueInfo.name}>
                                            {techniqueInfo.name}
                                        </p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                            Cấp {techniqueInfo.level}/10
                                        </p>
                                        {techniqueInfo.skillName && (
                                            <p className="text-[10px] text-cyan-400 mt-1 truncate" title={techniqueInfo.skillName}>
                                                {techniqueInfo.skillName}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleUnequipFromSlot(slotIndex)}
                                        disabled={actionLoading}
                                        className="w-full py-1.5 rounded text-[10px] font-bold uppercase bg-slate-700 text-slate-400 border border-slate-600 hover:bg-slate-600 disabled:opacity-50 transition-all"
                                    >
                                        Tháo
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Technique Selection Modal */}
            {showTechniqueModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-amber-400">
                                Chọn Công Pháp - Vị trí {selectedSlot + 1}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowTechniqueModal(false);
                                    setSelectedSlot(null);
                                }}
                                className="p-1 hover:bg-slate-800 rounded transition-colors"
                            >
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        {/* Available Techniques List */}
                        <div className="p-4 overflow-y-auto flex-1">
                            {availableTechniques && availableTechniques.length > 0 ? (
                                <div className="grid grid-cols-1 gap-2">
                                    {availableTechniques.map(tech => {
                                        const rarity = RARITY_COLORS[tech.rarity] || RARITY_COLORS.common;
                                        const alreadyEquipped = equippedSlots?.some(s => s.techniqueId === tech.techniqueId);

                                        return (
                                            <div
                                                key={tech.techniqueId}
                                                className={`p-3 rounded-lg border ${rarity.bg} ${rarity.border}`}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <h5 className={`font-bold text-sm ${rarity.text} truncate`}>
                                                            {tech.name}
                                                        </h5>
                                                        <p className="text-[10px] text-slate-400">
                                                            Cấp {tech.level}/10
                                                        </p>
                                                        {tech.skillName && (
                                                            <p className="text-[10px] text-cyan-400 mt-1">
                                                                {tech.skillName}
                                                            </p>
                                                        )}
                                                        {tech.skillDescription && (
                                                            <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">
                                                                {tech.skillDescription}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => handleEquipToSlot(selectedSlot, tech.techniqueId)}
                                                        disabled={actionLoading || alreadyEquipped}
                                                        className="px-3 py-1.5 rounded text-xs font-bold uppercase bg-red-700 text-red-100 border border-red-500/50 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0"
                                                    >
                                                        {alreadyEquipped ? 'Đã trang bị' : actionLoading ? 'Đang...' : 'Trang bị'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-center text-slate-500 text-sm py-8">
                                    Chưa có công pháp chiến đấu. Hãy học công pháp có kỹ năng chiến đấu trước.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CombatSlotsSection;
