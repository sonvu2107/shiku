/**
 * DungeonTab - Bí Cảnh Chi Môn (Pixel RPG Style)
 * 
 * Theme: Retro 8-bit/16-bit RPG (GameBoy/SNES vibes).
 * - Exploration View: Side-scrolling pixel game look
 * - Battle View: Turn-based RPG interface with retro menus
 * - Fonts: Monospace for that retro terminal feel
 * - Visuals: CSS-based pixel art rendering and scanlines
 */

import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GiTreasureMap, GiCutDiamond, GiPadlock, GiAlarmClock } from 'react-icons/gi';
import { useCultivation } from '../../../hooks/useCultivation.jsx';
import { api } from '../../../api';
import {
    DIFFICULTY_COLORS,
    DIFFICULTY_LABELS,
    formatNumber,
    getRarityColor
} from '../utils/dungeonHelpers';
import { RARITY_COLORS } from '../utils/constants.js';
import { getItemIcon, ITEM_TYPE_LABELS, IMAGE_COMPONENTS } from '../utils/iconHelpers.js';
import debug from '../../../utils/debug';
import { getUserAvatarUrl } from '../../../utils/avatarUtils.js';
import { loadUser } from '../../../utils/userCache.js';

// Pixel Art Helper Styles
const pixelBorder = "border-4 border-slate-700 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]";
const pixelText = "font-mono tracking-tighter";

const getMonsterTypeConfig = (type) => {
    switch (type) {
        case 'boss': return { label: 'BOSS', color: '#ef4444' };
        case 'elite': return { label: 'ELITE', color: '#f59e0b' };
        default: return { label: 'MOB', color: '#94a3b8' };
    }
};

// Difficulty Config for pixel style
const PIXEL_DIFFICULTY = {
    easy: { label: 'DỄ', color: '#4ade80', bg: '#14532d' },
    normal: { label: 'THƯỜNG', color: '#60a5fa', bg: '#1e3a8a' },
    hard: { label: 'KHÓ', color: '#a78bfa', bg: '#4c1d95' },
    nightmare: { label: 'ÁC MỘNG', color: '#fbbf24', bg: '#78350f' },
    hell: { label: 'ĐỊA NGỤC', color: '#f87171', bg: '#7f1d1d' },
    chaos: { label: 'HỖN ĐỘN', color: '#ec4899', bg: '#831843' }
};

// ==================== SUB-COMPONENTS ====================

// Retro Scanline Effect
const Scanlines = memo(() => (
    <div
        className="absolute inset-0 pointer-events-none z-50 overflow-hidden opacity-10"
        style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.2))', backgroundSize: '100% 4px' }}
    />
));

// Dungeon Card - Synchronized with other tabs
const DungeonCard = memo(({ dungeon, onEnter, disabled }) => {
    const config = PIXEL_DIFFICULTY[dungeon.difficulty] || PIXEL_DIFFICULTY.easy;
    const isOnCooldown = dungeon.progress?.isOnCooldown;
    const [cooldownRemaining, setCooldownRemaining] = useState(null);

    // Calculate and update cooldown remaining time
    useEffect(() => {
        if (!isOnCooldown || !dungeon.progress?.cooldownUntil) {
            setCooldownRemaining(null);
            return;
        }

        const updateCooldown = () => {
            const now = new Date();
            const cooldownEnd = new Date(dungeon.progress.cooldownUntil);
            const remaining = Math.max(0, cooldownEnd - now);

            if (remaining <= 0) {
                setCooldownRemaining(null);
                return;
            }

            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

            let timeString = '';
            if (hours > 0) {
                timeString = `${hours}h ${minutes}m`;
            } else if (minutes > 0) {
                timeString = `${minutes}m ${seconds}s`;
            } else {
                timeString = `${seconds}s`;
            }

            setCooldownRemaining(timeString);
        };

        updateCooldown();
        const interval = setInterval(updateCooldown, 1000);

        return () => clearInterval(interval);
    }, [isOnCooldown, dungeon.progress?.cooldownUntil]);

    // Format cooldown text for button
    const getCooldownText = () => {
        if (!isOnCooldown) return 'Đang hồi...';
        if (cooldownRemaining) return `Hồi: ${cooldownRemaining}`;
        return 'Đang hồi...';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={!disabled && !isOnCooldown && dungeon.meetsRequirement ? { scale: 1.02 } : {}}
            className="spirit-tablet rounded-xl p-4 md:p-5 h-full flex flex-col border border-amber-500/30 relative overflow-hidden"
        >
            {/* Decorative Corners */}
            <div className="spirit-corner spirit-corner-tl border-amber-500/40"></div>
            <div className="spirit-corner spirit-corner-tr border-amber-500/40"></div>
            <div className="spirit-corner spirit-corner-bl border-amber-500/40"></div>
            <div className="spirit-corner spirit-corner-br border-amber-500/40"></div>

            {/* Header */}
            <div className="flex justify-between items-start mb-3 z-10">
                <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-amber-300 font-title tracking-wide truncate">{dungeon.name}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs px-2 py-0.5 bg-slate-800/50 border border-amber-500/20 text-slate-400 rounded">
                            LV.{dungeon.requiredRealm || 1}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ backgroundColor: `${config.color}20`, color: config.color, border: `1px solid ${config.color}40` }}>
                            {config.label}
                        </span>
                    </div>
                </div>
                {/* Clear Badge */}
                {dungeon.progress?.totalClears > 0 && (
                    <div className="bg-emerald-900/50 border border-emerald-700/50 px-2 py-1 text-xs text-emerald-400 rounded">
                        ×{dungeon.progress.totalClears}
                    </div>
                )}
            </div>

            {/* Description */}
            <p className="text-sm text-slate-400 mb-4 line-clamp-2 leading-relaxed">
                {dungeon.description}
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-2 bg-slate-800/30 rounded-lg border border-slate-700/50">
                    <div className="text-xs text-slate-500 mb-1">Tầng</div>
                    <div className="text-sm font-bold text-amber-400">{dungeon.floors}</div>
                </div>
                <div className="text-center p-2 bg-slate-800/30 rounded-lg border border-slate-700/50">
                    <div className="text-xs text-slate-500 mb-1">EXP</div>
                    <div className="text-sm font-bold text-emerald-400">×{dungeon.expMultiplier}</div>
                </div>
                <div className="text-center p-2 bg-slate-800/30 rounded-lg border border-slate-700/50">
                    <div className="text-xs text-slate-500 mb-1">Chi phí</div>
                    <div className="text-sm font-bold text-yellow-400 flex items-center justify-center gap-1"><GiCutDiamond size={14} />{dungeon.entryCost}</div>
                </div>
            </div>

            {/* Progress */}
            {dungeon.progress?.highestFloor > 0 && (
                <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>Tiến độ cao nhất</span>
                        <span className="text-emerald-400 font-medium">{dungeon.progress.highestFloor}/{dungeon.floors}</span>
                    </div>
                    <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden border border-slate-700/50">
                        <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300"
                            style={{ width: `${(dungeon.progress.highestFloor / dungeon.floors) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Action Button */}
            <div className="mt-auto pt-2 z-10">
                {dungeon.progress?.inProgress ? (
                    <button
                        onClick={() => onEnter(dungeon)}
                        disabled={disabled}
                        className="w-full py-2.5 px-4 text-sm font-medium rounded-lg bg-amber-600/80 border border-amber-500/50 text-white hover:bg-amber-600 transition-all font-title"
                    >
                        Tiếp Tục
                    </button>
                ) : (
                    <button
                        onClick={() => onEnter(dungeon)}
                        disabled={disabled || !dungeon.meetsRequirement || isOnCooldown || !dungeon.hasEnoughStones}
                        className={`w-full py-2.5 px-4 text-sm font-medium rounded-lg transition-all font-title
                            ${!dungeon.meetsRequirement
                                ? 'bg-slate-800/50 border border-slate-700/50 text-slate-500 cursor-not-allowed'
                                : isOnCooldown
                                    ? 'bg-slate-800/50 border border-amber-500/30 text-amber-400 cursor-wait'
                                    : !dungeon.hasEnoughStones
                                        ? 'bg-slate-800/50 border border-red-500/30 text-red-400 cursor-not-allowed'
                                        : 'bg-emerald-600/80 border border-emerald-500/50 text-white hover:bg-emerald-600'
                            }`}
                    >
                        {!dungeon.meetsRequirement ? `🔒 ${dungeon.requiredRealmName}` : isOnCooldown ? getCooldownText() : !dungeon.hasEnoughStones ? 'Thiếu 💎' : 'Vào Bí Cảnh'}
                    </button>
                )}
            </div>
        </motion.div>
    );
});

// Pixel Inventory Modal
const InventoryModal = memo(({ inventory, onClose, onUseItem }) => {
    const isClosingRef = useRef(false);
    const [usingItem, setUsingItem] = useState(null);

    const handleClose = useCallback((e) => {
        if (e) {
            e.stopPropagation();
        }
        if (isClosingRef.current) {
            return;
        }
        isClosingRef.current = true;
        onClose();
    }, [onClose]);

    const handleBackgroundClick = (e) => {
        if (e.target === e.currentTarget) {
            handleClose(e);
        }
    };

    const handleUse = async (itemId) => {
        if (usingItem) return;
        setUsingItem(itemId);
        try {
            if (onUseItem) {
                await onUseItem(itemId);
            }
        } finally {
            setUsingItem(null);
        }
    };

    // Filter only consumable items (exp_boost, consumable)
    const consumableItems = inventory.filter(item =>
        ['exp_boost', 'consumable'].includes(item.type)
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 font-mono" onClick={handleBackgroundClick}>
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="bg-slate-900 border-4 border-white p-2 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-[8px_8px_0px_#000]"
                onClick={e => e.stopPropagation()}
            >
                <div className="border-2 border-white/20 p-6">
                    <h2 className="text-2xl font-bold uppercase mb-4 text-amber-400 text-center">
                        TÚI ĐỒ
                    </h2>

                    {consumableItems.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            <p className="text-sm">Không có vật phẩm có thể sử dụng</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {consumableItems.map((item, index) => {
                                const rarity = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;
                                const typeInfo = ITEM_TYPE_LABELS[item.type] || { label: 'Vật Phẩm', color: 'text-slate-300' };
                                const ItemIcon = getItemIcon(item);

                                return (
                                    <div
                                        key={item._id || `${item.itemId}-${index}`}
                                        className="bg-black border-2 p-3 text-center"
                                        style={{ borderColor: rarity.color }}
                                    >
                                        <div className="flex justify-center mb-2">
                                            {ItemIcon && <ItemIcon className="w-8 h-8" style={{ color: rarity.color }} />}
                                        </div>
                                        <p className="text-xs font-bold mb-1 text-white truncate" style={{ color: rarity.color }}>
                                            {item.name || item.itemId}
                                        </p>
                                        <p className="text-[10px] text-slate-400 mb-2">{typeInfo.label}</p>
                                        {item.description && (
                                            <p className="text-[9px] text-slate-500 mb-2 line-clamp-2">{item.description}</p>
                                        )}
                                        <button
                                            onClick={() => handleUse(item.itemId)}
                                            disabled={usingItem === item.itemId}
                                            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-3 text-xs uppercase transition-all disabled:opacity-50"
                                        >
                                            {usingItem === item.itemId ? 'Đang dùng...' : 'Dùng'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <button
                        onClick={handleClose}
                        className="w-full bg-white text-black font-bold py-3 mt-4 hover:bg-slate-200 active:translate-y-1 transition-transform"
                    >
                        ĐÓNG X
                    </button>
                </div>
            </motion.div>
        </div>
    );
});

// Pixel Exploration View (The "Game" Part)
const PixelExplorationView = memo(({ dungeon, monster, currentFloor, totalFloors, onStartBattle, onExit, onOpenInventory, loading, playerName, playerAvatar, isHandlingRewardsClose }) => {
    return (
        <div className={`w-full max-w-4xl mx-auto bg-black ${pixelBorder} overflow-hidden relative aspect-video flex flex-col`}>
            <Scanlines />

            {/* --- GAME SCREEN --- */}
            <div className="relative flex-1 bg-slate-900 overflow-hidden">
                {/* Starfield Background */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>

                {/* Scrolling Backgrounds */}
                <motion.div
                    className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-900"
                    animate={{ x: ['0%', '-100%'] }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                >
                    <div className="absolute bottom-0 w-[200%] h-1/2 bg-black/20" style={{ clipPath: 'polygon(0% 100%, 10% 60%, 25% 80%, 40% 50%, 55% 70%, 70% 40%, 85% 60%, 100% 30%, 100% 100%)' }}></div>
                </motion.div>

                {/* Ground */}
                <div className="absolute bottom-0 w-full h-12 bg-[#2d3748] border-t-4 border-[#1a202c] z-10">
                    <motion.div
                        className="w-full h-full opacity-20"
                        style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 40px, #000 40px, #000 44px)' }}
                        animate={{ x: ['0%', '-20%'] }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                </div>

                {/* Player Sprite */}
                <motion.div
                    className="absolute bottom-12 left-10 z-20 flex flex-col items-center"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
                >
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                        {playerAvatar ? (
                            <img src={playerAvatar} alt={playerName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-slate-700 flex items-center justify-center text-lg font-bold text-emerald-400">
                                {playerName?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                        )}
                    </div>
                    <div className="text-[8px] text-emerald-400 mt-1 font-bold truncate max-w-16">{playerName}</div>
                    <div className="w-8 h-2 bg-black/50 rounded-full blur-sm mt-[-2px]"></div>
                </motion.div>

                {/* Monster Sprite */}
                <motion.div
                    className="absolute bottom-12 right-10 z-20 flex flex-col items-center"
                    initial={{ x: 100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                >
                    <motion.div
                        className="relative"
                        animate={{ y: [0, -2, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        {monster?.image ? (
                            <img
                                src={monster.image}
                                alt={monster.name}
                                className="w-16 h-16 object-cover rounded-full border-2 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] filter drop-shadow-md"
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                        ) : (
                            <div className="w-16 h-16 text-xl font-bold filter drop-shadow-md grayscale-[0.2] contrast-125 flex items-center justify-center rounded-full bg-slate-800 border-2 border-red-500 text-red-400">
                                {monster?.name?.charAt(0) || '?'}
                            </div>
                        )}
                        {monster?.type === 'boss' && <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-red-500 animate-bounce"><GiAlarmClock size={24} /></div>}
                    </motion.div>
                    <div className="w-12 h-2 bg-black/50 rounded-full blur-sm mt-[-4px]"></div>
                </motion.div>

                {/* Floor Indicator */}
                <div className="absolute top-4 right-4 bg-black/50 p-2 border-2 border-white/20 rounded z-30 font-mono text-[10px] text-white">
                    TẦNG {currentFloor + 1}
                    <div className="flex gap-1 mt-1">
                        {Array.from({ length: Math.min(10, totalFloors) }).map((_, i) => (
                            <div key={i} className={`w-2 h-2 ${i <= currentFloor ? 'bg-emerald-500' : 'bg-slate-600'} ${i === currentFloor ? 'animate-pulse' : ''}`}></div>
                        ))}
                    </div>
                </div>

                {/* Dungeon Name */}
                <div className="absolute top-4 left-4 bg-black/50 p-2 border-2 border-white/20 rounded z-30">
                    <div className="font-mono text-xs text-amber-400 uppercase">{dungeon?.name}</div>
                </div>
            </div>

            {/* --- TEXT BOX / UI --- */}
            <div className="bg-black border-t-4 border-slate-700 p-4 min-h-[140px] flex flex-col justify-between">
                <div className="font-mono text-sm text-white mb-4">
                    <span className="text-red-400 uppercase font-bold">CẢNH BÁO!</span><br />
                    Một con <span className="text-yellow-400">{monster?.name}</span> ({getMonsterTypeConfig(monster?.type).label}) đã xuất hiện!
                    <div className="mt-2 text-[10px] text-slate-400">
                        TẤN CÔNG: {formatNumber(monster?.stats?.attack)} | PHÒNG THỦ: {formatNumber(monster?.stats?.defense)} | KHÍ HUYẾT: {formatNumber(monster?.stats?.qiBlood)}
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={onStartBattle}
                        disabled={loading || isHandlingRewardsClose}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold font-mono py-3 px-4 border-2 border-white/50 active:translate-y-1 active:border-white/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                    >
                        <span>CHIẾN ĐẤU</span>
                    </button>
                    <button
                        onClick={() => {
                            if (onOpenInventory) {
                                onOpenInventory();
                            }
                        }}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold font-mono py-3 px-4 border-2 border-white/50 active:translate-y-1 active:border-white/20 transition-all flex items-center justify-center gap-2"
                    >
                        <span>TÚI ĐỒ</span>
                    </button>
                    <button
                        onClick={onExit}
                        className="w-16 bg-red-900/50 hover:bg-red-900 text-red-200 font-bold font-mono border-2 border-red-800 flex items-center justify-center"
                    >
                        <span>THOÁT</span>
                    </button>
                </div>
            </div>
        </div>
    );
});

// Pixel Battle View (Turn Based)
const PixelBattleView = memo(({ monster, battleResult, onComplete, isAnimating, playerName, playerAvatar }) => {
    const [currentLogIndex, setCurrentLogIndex] = useState(0);
    const [playerHp, setPlayerHp] = useState(battleResult?.maxPlayerHp || 100);
    const [monsterHp, setMonsterHp] = useState(battleResult?.maxMonsterHp || 100);
    const [playerMana, setPlayerMana] = useState(battleResult?.maxPlayerMana || 100);
    const [monsterMana, setMonsterMana] = useState(battleResult?.maxMonsterMana || 50);
    const [actionText, setActionText] = useState("Đang chuẩn bị chiến đấu...");
    const [hitEffect, setHitEffect] = useState(null);
    const hasCompletedRef = useRef(false);

    const logs = battleResult?.logs || [];

    useEffect(() => {
        // Reset completion flag when a new battle starts
        if (isAnimating && currentLogIndex === 0) {
            hasCompletedRef.current = false;
        }

        if (!isAnimating || currentLogIndex >= logs.length) {
            // Only call onComplete ONCE when animation finishes
            if (currentLogIndex >= logs.length && logs.length > 0 && !hasCompletedRef.current) {
                hasCompletedRef.current = true; // Mark as completed to prevent duplicate calls
                const won = battleResult?.finalMonsterHp <= 0;
                setActionText(won ? " CHIẾN THẮNG! " : " THẤT BẠI... ");
                setTimeout(onComplete, 1500);
            }
            return;
        }

        const timer = setTimeout(() => {
            const log = logs[currentLogIndex];

            // Update mana from logs
            if (log.playerMana !== undefined) setPlayerMana(log.playerMana);
            if (log.monsterMana !== undefined) setMonsterMana(log.monsterMana);

            // Build action text with skill info
            if (log.attacker === 'player' && !log.isDodged) {
                setMonsterHp(log.monsterHpAfter);
                const skillText = log.skillUsed ? `【${log.skillUsed}】` : '';
                const manaText = log.manaConsumed ? ` (-${log.manaConsumed} CHÂN NGUYÊN)` : '';
                setActionText(` ${skillText} Bạn tấn công gây ${formatNumber(log.damage)} sát thương!${log.isCritical ? 'CHÍ MẠNG!' : ''}${manaText}`);
                setHitEffect('monster');
            } else if (log.attacker === 'monster' && !log.isDodged) {
                setPlayerHp(log.playerHpAfter);
                const skillText = log.skillUsed ? `【${log.skillUsed}】` : '';
                const manaText = log.manaConsumed ? ` (-${log.manaConsumed} CHÂN NGUYÊN)` : '';
                setActionText(` ${skillText} ${monster?.name} phản công gây ${formatNumber(log.damage)} sát thương!${manaText}`);
                setHitEffect('player');
            } else {
                setActionText(` ${log.attacker === 'player' ? 'Địch' : 'Bạn'} đã né thành công!`);
            }
            setTimeout(() => setHitEffect(null), 300);
            setCurrentLogIndex(prev => prev + 1);
        }, 800);

        return () => clearTimeout(timer);
    }, [currentLogIndex, isAnimating, logs, onComplete, monster, battleResult]);

    return (
        <div className={`w-full max-w-4xl mx-auto bg-[#202028] ${pixelBorder} overflow-hidden p-6 font-mono`}>
            {/* Battle Scene */}
            <div className="relative h-64 bg-slate-800 border-4 border-slate-900 mb-4 overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#000 20%, transparent 20%)', backgroundSize: '8px 8px' }}></div>

                {/* Monster (Top Right) */}
                <motion.div
                    className="absolute top-6 right-6 flex flex-col items-center"
                    animate={hitEffect === 'monster' ? { x: [-5, 5, -5, 5, 0] } : {}}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                    {monster?.image ? (
                        <img src={monster.image} alt={monster.name} className="w-16 h-16 object-cover rounded-full border-2 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] filter drop-shadow-md" />
                    ) : (
                        <div className="w-16 h-16 text-xl font-bold filter grayscale-[0.2] drop-shadow-md flex items-center justify-center rounded-full bg-slate-800 border-2 border-red-500 text-red-400">{monster?.name?.charAt(0) || '?'}</div>
                    )}
                    <div className="text-[10px] text-white mt-1 font-bold">{monster?.name}</div>
                    {/* HP Bar */}
                    <div className="w-20 bg-black h-2.5 mt-1 border border-white/20">
                        <motion.div
                            className="h-full bg-red-500"
                            animate={{ width: `${(monsterHp / battleResult?.maxMonsterHp) * 100}%` }}
                        />
                    </div>
                    <div className="text-[7px] text-red-400">{formatNumber(Math.max(0, monsterHp))} HP</div>
                    {/* Mana Bar */}
                    <div className="w-20 bg-black h-2 border border-white/20">
                        <motion.div
                            className="h-full bg-blue-500"
                            animate={{ width: `${battleResult?.maxMonsterMana ? (monsterMana / battleResult.maxMonsterMana) * 100 : 0}%` }}
                        />
                    </div>
                    <div className="text-[7px] text-blue-400">{formatNumber(Math.max(0, monsterMana))} CHÂN NGUYÊN</div>
                </motion.div>

                {/* Player (Bottom Left) */}
                <motion.div
                    className="absolute bottom-6 left-6 flex flex-col items-center"
                    animate={hitEffect === 'player' ? { x: [5, -5, 5, -5, 0] } : {}}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                        {playerAvatar ? (
                            <img src={playerAvatar} alt={playerName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-slate-700 flex items-center justify-center text-lg font-bold text-emerald-400">
                                {playerName?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                        )}
                    </div>
                    <div className="text-[10px] text-white mt-1 font-bold">{playerName || 'Tu Sĩ'}</div>
                    {/* HP Bar */}
                    <div className="w-20 bg-black h-2.5 mt-1 border border-white/20">
                        <motion.div
                            className="h-full bg-emerald-500"
                            animate={{ width: `${(playerHp / battleResult?.maxPlayerHp) * 100}%` }}
                        />
                    </div>
                    <div className="text-[7px] text-emerald-400">{formatNumber(Math.max(0, playerHp))} HP</div>
                    {/* Mana Bar */}
                    <div className="w-20 bg-black h-2 border border-white/20">
                        <motion.div
                            className="h-full bg-blue-500"
                            animate={{ width: `${battleResult?.maxPlayerMana ? (playerMana / battleResult.maxPlayerMana) * 100 : 0}%` }}
                        />
                    </div>
                    <div className="text-[7px] text-blue-400">{formatNumber(Math.max(0, playerMana))} CHÂN NGUYÊN</div>
                </motion.div>

                {/* Hit Effects */}
                <AnimatePresence>
                    {hitEffect && (
                        <motion.div
                            key={currentLogIndex}
                            initial={{ scale: 0, rotate: 45 }}
                            animate={{ scale: 1.5, opacity: 0 }}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl font-bold text-yellow-400 z-10"
                        >

                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Retro Text Box */}
            <div className="bg-black border-4 border-white/80 p-4 min-h-[80px] text-white text-sm leading-relaxed">
                <p className="mb-1 text-slate-400 text-[10px]">ROUND {Math.min(currentLogIndex + 1, logs.length)} / {logs.length}</p>
                <div className="animate-pulse">
                    {actionText}
                </div>
            </div>
        </div>
    );
});

// Pixel Rewards Modal
const RewardsModal = memo(({ rewards, isVictory, onClose, dungeonName, floorInfo }) => {
    const isClosingRef = useRef(false);

    const handleClose = useCallback((e) => {
        if (e) {
            e.stopPropagation();
        }
        // Prevent multiple calls
        if (isClosingRef.current) {
            return;
        }
        isClosingRef.current = true;
        onClose();
    }, [onClose]);

    const handleBackgroundClick = (e) => {
        // Only close if clicking directly on background, not on modal content
        if (e.target === e.currentTarget) {
            handleClose(e);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 font-mono" onClick={handleBackgroundClick}>
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="bg-slate-900 border-4 border-white p-2 max-w-sm w-full shadow-[8px_8px_0px_#000]"
                onClick={e => e.stopPropagation()}
            >
                <div className="border-2 border-white/20 p-6 text-center">
                    <div className="text-5xl mb-4">{isVictory ? '' : ''}</div>
                    <h2 className={`text-2xl font-bold uppercase mb-2 ${isVictory ? 'text-emerald-400' : 'text-red-500'}`}>
                        {isVictory ? 'CHIẾN THẮNG!' : 'BẠI TRẬN...'}
                    </h2>

                    <p className="text-slate-400 text-sm mb-4">{dungeonName} - Tầng {floorInfo?.currentFloor}/{floorInfo?.totalFloors}</p>

                    {isVictory && (
                        <div className="bg-black p-4 border-2 border-slate-700 my-4 text-left">
                            <p className="text-white mb-2 underline decoration-dashed text-xs">NHẬN ĐƯỢC:</p>
                            <div className="flex justify-between text-emerald-400 text-sm">
                                <span>EXP:</span> <span>+{formatNumber(rewards?.exp || 0)}</span>
                            </div>
                            <div className="flex justify-between text-yellow-400 text-sm">
                                <span>LINH THẠCH:</span> <span>+{formatNumber(rewards?.spiritStones || 0)}</span>
                            </div>
                            {rewards?.item && (() => {
                                const item = rewards.item;
                                const rarity = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;
                                const ItemIcon = getItemIcon(item);
                                return (
                                    <div className="mt-2 pt-2 border-t border-slate-800 text-sm">
                                        <div className="flex items-center gap-2 mb-1" style={{ color: rarity.color }}>
                                            <span>VẬT PHẨM:</span>
                                            {ItemIcon && <ItemIcon className="w-4 h-4" style={{ color: rarity.color }} />}
                                            <span className="font-bold">{item.name}</span>
                                        </div>
                                        {item.description && (
                                            <p className="text-xs text-slate-400 mt-1">{item.description}</p>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    <button
                        onClick={handleClose}
                        className="w-full bg-white text-black font-bold py-3 hover:bg-slate-200 active:translate-y-1 transition-transform"
                    >
                        {isVictory && floorInfo?.canContinue ? 'TIẾP TỤC ▶' : 'ĐÓNG X'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
});

// ==================== MAIN COMPONENT ====================
const DungeonTab = memo(function DungeonTab() {
    const { cultivation, refresh, useItem } = useCultivation();

    // User state for avatar and name
    const [user, setUser] = useState(null);

    // Load user data
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const userData = await loadUser();
                if (userData) {
                    setUser(userData);
                }
            } catch (err) {
                debug.error('[DungeonTab] Error loading user:', err);
            }
        };
        fetchUser();
    }, []);

    // Player display info
    const playerName = user?.nickname?.trim() || user?.name || 'Tu Sĩ';
    const playerAvatar = user ? getUserAvatarUrl(user, 64) : null;

    // States
    const [dungeons, setDungeons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [playerSpiritStones, setPlayerSpiritStones] = useState(0);

    // Exploration states
    const [view, setView] = useState('list');
    const [activeDungeon, setActiveDungeon] = useState(null);
    const [currentFloor, setCurrentFloor] = useState(0);
    const [totalFloors, setTotalFloors] = useState(0);
    const [currentMonster, setCurrentMonster] = useState(null);

    // Battle states
    const [battleResult, setBattleResult] = useState(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [rewards, setRewards] = useState(null);
    const [showRewardsModal, setShowRewardsModal] = useState(false);
    const [showInventoryModal, setShowInventoryModal] = useState(false);

    // Use refs to avoid stale closure issues in callbacks
    const nextMonsterRef = useRef(null);
    const battleProgressRef = useRef({ currentFloor: 0, totalFloors: 0, isCompleted: false, canContinue: false });
    const battleResultRef = useRef(null);
    const isHandlingRewardsCloseRef = useRef(false); // Guard to prevent double execution
    const [isHandlingRewardsClose, setIsHandlingRewardsClose] = useState(false); // State for UI updates

    // Load dungeons
    const loadDungeons = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api('/api/cultivation/dungeons');
            if (response.success) {
                setDungeons(response.data.dungeons);
                setPlayerSpiritStones(response.data.playerSpiritStones);
            }
        } catch (err) {
            debug.error('[DungeonTab] Failed to load dungeons:', err);
            setError('Lỗi tải dữ liệu');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDungeons();
    }, [loadDungeons]);

    // Enter dungeon
    const handleEnterDungeon = useCallback(async (dungeon) => {
        try {
            setLoading(true);
            const response = await api(`/api/cultivation/dungeons/${dungeon.id}/enter`, { method: 'POST' });

            if (response.success) {
                setActiveDungeon(response.data.dungeon);
                setCurrentFloor(response.data.currentFloor);
                setTotalFloors(response.data.dungeon.totalFloors);
                setCurrentMonster(response.data.nextMonster);
                setPlayerSpiritStones(response.data.remainingSpiritStones || playerSpiritStones - dungeon.entryCost);
                setView('exploring');
            }
        } catch (err) {
            debug.error('[DungeonTab] Failed to enter dungeon:', err);
            setError(err.message || 'Không thể vào bí cảnh');
        } finally {
            setLoading(false);
        }
    }, [playerSpiritStones]);

    // Start battle
    const handleStartBattle = useCallback(async () => {
        // Guard: Prevent battle if we're still handling rewards close or already loading
        if (isHandlingRewardsCloseRef.current || isHandlingRewardsClose) {
            return;
        }

        if (!activeDungeon) {
            return;
        }

        try {
            setLoading(true);
            const response = await api(`/api/cultivation/dungeons/${activeDungeon.id}/battle`, { method: 'POST' });

            if (response.success) {
                setBattleResult(response.data.battleResult);
                battleResultRef.current = response.data.battleResult; // Store in ref for callbacks
                setRewards(response.data.rewards);
                setIsAnimating(true);
                setView('battle');

                if (response.data.progress) {
                    setCurrentFloor(response.data.progress.currentFloor);
                    setTotalFloors(response.data.progress.totalFloors);
                    // Store in ref for immediate access in callbacks
                    battleProgressRef.current = {
                        currentFloor: response.data.progress.currentFloor,
                        totalFloors: response.data.progress.totalFloors,
                        isCompleted: response.data.progress.isCompleted,
                        canContinue: response.data.progress.canContinue || false
                    };
                }

                // Store next monster in ref for seamless floor transition
                nextMonsterRef.current = response.data.nextMonster || null;
            }
        } catch (err) {
            debug.error('[DungeonTab] Battle failed:', err);
            setError(err.message || 'Lỗi khi chiến đấu');
        } finally {
            setLoading(false);
        }
    }, [activeDungeon, isHandlingRewardsClose]);

    // Handle battle complete
    const handleBattleComplete = useCallback(() => {
        setIsAnimating(false);
        setShowRewardsModal(true);
    }, []);

    // Handle rewards modal close
    const handleRewardsClose = useCallback(async () => {
        // Guard: Prevent double execution
        if (isHandlingRewardsCloseRef.current) {
            return;
        }

        isHandlingRewardsCloseRef.current = true;
        setIsHandlingRewardsClose(true);
        setShowRewardsModal(false);

        // Read from refs for up-to-date values (avoid stale closure)
        const progress = battleProgressRef.current;
        const nextMonster = nextMonsterRef.current;
        const currentBattleResult = battleResultRef.current;

        // Helper function to reset and exit to list
        const exitToList = () => {
            setView('list');
            setActiveDungeon(null);
            nextMonsterRef.current = null;
            battleResultRef.current = null;
            isHandlingRewardsCloseRef.current = false;
            setIsHandlingRewardsClose(false);
            loadDungeons();
            refresh();
        };

        // Validate progress exists
        if (!progress || !progress.totalFloors || progress.totalFloors === 0) {
            exitToList();
            return;
        }

        // If player lost (monster HP > 0), exit to list
        if (!currentBattleResult || (currentBattleResult.finalMonsterHp > 0)) {
            exitToList();
            return;
        }

        // Check if dungeon was fully completed
        const isDungeonCompleted = progress.isCompleted ||
            (progress.currentFloor >= progress.totalFloors);

        if (isDungeonCompleted) {
            exitToList();
            return;
        }

        // If nextMonster is null, try to get it from backend API
        if (!nextMonster) {
            if (progress.currentFloor < progress.totalFloors && activeDungeon) {
                try {
                    const response = await api(`/api/cultivation/dungeons/${activeDungeon.id}/current-floor`);
                    if (response.success && response.data.monster) {
                        setCurrentMonster(response.data.monster);
                        setCurrentFloor(response.data.currentFloor);
                        setTotalFloors(response.data.totalFloors);
                        battleProgressRef.current = {
                            ...battleProgressRef.current,
                            currentFloor: response.data.currentFloor,
                            totalFloors: response.data.totalFloors
                        };
                        battleResultRef.current = null;
                        setBattleResult(null);
                        setView('exploring');
                        setTimeout(() => {
                            isHandlingRewardsCloseRef.current = false;
                            setIsHandlingRewardsClose(false);
                        }, 500);
                        return;
                    } else if (response.data?.completed) {
                        exitToList();
                        return;
                    }
                } catch (err) {
                    debug.error('[DungeonTab] Failed to fetch next monster:', err);
                }
            }
            exitToList();
            return;
        }

        // Validate nextMonster has required fields
        if (!nextMonster.name || !nextMonster.stats) {
            if (activeDungeon && progress.currentFloor < progress.totalFloors) {
                try {
                    const response = await api(`/api/cultivation/dungeons/${activeDungeon.id}/current-floor`);
                    if (response.success && response.data.monster) {
                        setCurrentMonster(response.data.monster);
                        setCurrentFloor(response.data.currentFloor);
                        setTotalFloors(response.data.totalFloors);
                        battleProgressRef.current = {
                            ...battleProgressRef.current,
                            currentFloor: response.data.currentFloor,
                            totalFloors: response.data.totalFloors
                        };
                        battleResultRef.current = null;
                        setBattleResult(null);
                        setView('exploring');
                        setTimeout(() => {
                            isHandlingRewardsCloseRef.current = false;
                            setIsHandlingRewardsClose(false);
                        }, 500);
                        return;
                    }
                } catch (err) {
                    debug.error('[DungeonTab] Failed to fetch next monster as fallback:', err);
                }
            }
            exitToList();
            return;
        }

        // Validate activeDungeon is still set
        if (!activeDungeon) {
            exitToList();
            return;
        }

        // Clear refs first
        nextMonsterRef.current = null;
        battleResultRef.current = null;

        // Update state for next floor
        setCurrentMonster(nextMonster);
        setCurrentFloor(progress.currentFloor);
        setTotalFloors(progress.totalFloors);
        setBattleResult(null);
        setIsAnimating(false);
        setRewards(null);
        setView('exploring');

        // Reset guard after short delay to allow React to finish state updates
        setTimeout(() => {
            isHandlingRewardsCloseRef.current = false;
            setIsHandlingRewardsClose(false);
        }, 500);
    }, [loadDungeons, refresh, activeDungeon]);

    // Exit dungeon early
    const handleExitDungeon = useCallback(async () => {
        if (!activeDungeon) return;

        try {
            await api(`/api/cultivation/dungeons/${activeDungeon.id}/claim-exit`, { method: 'POST' });
        } catch (err) {
            debug.error('[DungeonTab] Exit failed:', err);
        }

        setView('list');
        setActiveDungeon(null);
        loadDungeons();
        refresh();
    }, [activeDungeon, loadDungeons, refresh]);

    // ==================== RENDER ====================

    return (
        <div className="space-y-6 md:space-y-8 pb-4">
            {/* Header */}
            <div className="text-center">
                <h3 className="font-bold text-gold font-title tracking-wide text-xl lg:text-2xl mb-2">
                    {view === 'list' ? 'BÍ CẢNH' : activeDungeon?.name}
                </h3>
                <div className="h-[2px] w-24 mx-auto bg-gradient-to-r from-transparent via-amber-500/60 to-transparent"></div>
            </div>

            {/* Header Bar with Actions */}
            {view !== 'list' && (
                <div className="spirit-tablet rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border border-amber-500/30">
                    <div className="flex items-center gap-4">
                        <div>
                            <p className="text-sm text-slate-400 font-title">Đang khám phá: <span className="text-amber-400">{activeDungeon?.name}</span></p>
                            <p className="text-xs text-slate-500">Tầng {currentFloor + 1}/{totalFloors}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleExitDungeon}
                            className="px-4 py-2 bg-red-900/50 border border-red-700/50 text-red-200 text-sm font-medium hover:bg-red-900/70 hover:border-red-600 transition-all rounded-lg"
                        >
                            Rút Lui
                        </button>
                        <div className="px-4 py-2 bg-slate-800/50 border border-amber-500/30 flex items-center gap-2 text-amber-400 text-sm font-medium rounded-lg">
                            <GiCutDiamond size={16} /> {formatNumber(playerSpiritStones)}
                        </div>
                    </div>
                </div>
            )}

            {/* Main Display Area */}
            <div className="min-h-[400px]">
                <AnimatePresence mode="wait">
                    {loading && dungeons.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4"
                        >
                            <div className="w-16 h-16 border-4 border-slate-700 border-t-amber-500 rounded-full animate-spin"></div>
                            <p className="animate-pulse font-title">Đang tải dữ liệu...</p>
                        </motion.div>
                    ) : view === 'list' ? (
                        <motion.div
                            key="list"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
                        >
                            {dungeons.map(dungeon => (
                                <DungeonCard
                                    key={dungeon.id}
                                    dungeon={{ ...dungeon, playerSpiritStones }}
                                    onEnter={handleEnterDungeon}
                                    disabled={loading}
                                />
                            ))}
                        </motion.div>
                    ) : view === 'exploring' && currentMonster ? (
                        <motion.div
                            key="exploring"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <PixelExplorationView
                                dungeon={activeDungeon}
                                monster={currentMonster}
                                currentFloor={currentFloor}
                                totalFloors={totalFloors}
                                onStartBattle={handleStartBattle}
                                onExit={handleExitDungeon}
                                onOpenInventory={() => {
                                    setShowInventoryModal(true);
                                }}
                                loading={loading}
                                playerName={playerName}
                                playerAvatar={playerAvatar}
                                isHandlingRewardsClose={isHandlingRewardsClose}
                            />
                        </motion.div>
                    ) : view === 'battle' && battleResult ? (
                        <motion.div
                            key="battle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <PixelBattleView
                                monster={currentMonster}
                                battleResult={battleResult}
                                onComplete={handleBattleComplete}
                                isAnimating={isAnimating}
                                playerName={playerName}
                                playerAvatar={playerAvatar}
                            />
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>

            {/* Rewards Modal */}
            <AnimatePresence>
                {showRewardsModal && (
                    <RewardsModal
                        rewards={rewards}
                        isVictory={battleResult?.finalMonsterHp <= 0}
                        onClose={handleRewardsClose}
                        dungeonName={activeDungeon?.name}
                        floorInfo={{
                            currentFloor,
                            totalFloors,
                            canContinue: currentFloor < totalFloors && battleResult?.finalMonsterHp <= 0
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Inventory Modal */}
            <AnimatePresence>
                {showInventoryModal && (
                    <InventoryModal
                        inventory={cultivation?.inventory || []}
                        onClose={() => setShowInventoryModal(false)}
                        onUseItem={async (itemId) => {
                            if (useItem) {
                                try {
                                    const result = await useItem(itemId);
                                    // Only update inventory locally without full refresh
                                    // This prevents losing dungeon state
                                } catch (err) {
                                    // Error handling - item use failed
                                }
                            }
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
});

export default DungeonTab;