/**
 * TowerTab - Vạn Kiếp Tháp (Tower 100 Floors)
 * 
 * Design: Zone-based lobby similar to DungeonTab
 * - 5 Zones (20 floors each)
 * - Zone cards with lock mechanism
 * - Combat view like Dungeon (exploration + battle)
 * - Weekly chest + Materials for ascension
 */

import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    GiChest
} from 'react-icons/gi';
import { useCultivation } from '../../../hooks/useCultivation.jsx';
import {
    getTowerStatus,
    towerClimb,
    towerSweep,
    towerSweepAll,
    towerClaimChest
} from '../../../services/cultivationAPI.js';
import { formatNumber } from '../utils/dungeonHelpers.js';
import { debugError } from '../../../utils/debug.js';
import { getUserAvatarUrl } from '../../../utils/avatarUtils.js';
import { loadUser } from '../../../utils/userCache.js';

// ==================== CONSTANTS ====================

const FLOORS_PER_ZONE = 20;
const BOSS_FLOORS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const WEEKLY_CHEST_FLOOR = 60;
const DEFAULT_ATTEMPTS_MAX = 5;

// Monster images mapping
const TOWER_MONSTERS = {
    1: { name: 'Yêu Thú', image: '/assets/tower/yeuthu.jpg' },
    2: { name: 'Tà Linh', image: '/assets/tower/talinh.jpg' },
    3: { name: 'Ma Quỷ', image: '/assets/tower/maquy.jpg' },
    4: { name: 'Hung Thú', image: '/assets/tower/hungthu.jpg' },
    5: { name: 'Ám Hồn', image: '/assets/tower/amhon.jpg' },
    6: { name: 'Thái Cổ Hung Thú', image: '/assets/tower/thaicohungthu.jpg' },
    7: { name: 'Huyết Mang Đại Yêu', image: '/assets/tower/huyetmangdaiyeu.jpg' },
    8: { name: 'Hắc Ám Chi Tôn', image: '/assets/tower/hacamchiton.jpg' },
    9: { name: 'Cửu U Minh Quỷ', image: '/assets/tower/cuuuminhquy.jpg' },
    10: { name: 'Thiên Ma Vương', image: '/assets/tower/thienmavuong.jpg' }
};

// Get monster for floor
const getMonsterForFloor = (floor) => {
    const isBoss = BOSS_FLOORS.includes(floor);
    const zoneIndex = Math.floor((floor - 1) / 20);
    const floorInZone = ((floor - 1) % 20) + 1;

    // Calculate monster stats based on floor
    const baseMultiplier = 1 + (floor * 0.15);
    const zoneMultiplier = 1 + (zoneIndex * 0.5);
    const typeMultiplier = isBoss ? 3 : (floorInZone % 5 === 0 ? 1.5 : 1);

    const stats = {
        attack: Math.floor(500 * baseMultiplier * zoneMultiplier * typeMultiplier),
        defense: Math.floor(300 * baseMultiplier * zoneMultiplier * typeMultiplier),
        qiBlood: Math.floor(2000 * baseMultiplier * zoneMultiplier * typeMultiplier)
    };

    // Boss floors use special monsters
    if (isBoss) {
        const bossIndex = BOSS_FLOORS.indexOf(floor);
        return {
            ...TOWER_MONSTERS[bossIndex + 1] || TOWER_MONSTERS[10],
            type: 'boss',
            floor,
            stats
        };
    }

    // Elite every 5 floors
    if (floorInZone % 5 === 0) {
        return {
            ...TOWER_MONSTERS[(zoneIndex * 2 + 2) % 10 || 1],
            type: 'elite',
            floor,
            stats
        };
    }

    // Normal mobs
    return {
        ...TOWER_MONSTERS[(zoneIndex * 2 + 1) % 10 || 1],
        type: 'normal',
        floor,
        stats
    };
};

const getMonsterWithPreview = (floor, preview) => {
    const base = getMonsterForFloor(floor);
    if (preview?.floor === floor && preview?.stats) {
        return { ...base, stats: { ...base.stats, ...preview.stats } };
    }
    return base;
};

// Zone definitions
const TOWER_ZONES = [
    {
        id: 1,
        name: 'Hạ Giới',
        floors: [1, 20],
        requiredRealm: 1,
        requiredRealmName: 'Phàm Nhân',
        boss: 'Địa Ngục Quỷ Vương',
        color: '#4ade80',
        description: 'Nơi khởi đầu của mọi tu sĩ. Quái vật yếu ớt.'
    },
    {
        id: 2,
        name: 'Trung Giới',
        floors: [21, 40],
        requiredRealm: 3,
        requiredRealmName: 'Trúc Cơ',
        boss: 'Huyền Thiên Ma Tôn',
        color: '#60a5fa',
        description: 'Vùng đất của các tu sĩ trung cấp. Quái vật mạnh hơn.'
    },
    {
        id: 3,
        name: 'Thượng Giới',
        floors: [41, 60],
        requiredRealm: 5,
        requiredRealmName: 'Nguyên Anh',
        boss: 'Thiên Ma Đế Quân',
        color: '#a78bfa',
        description: 'Lãnh địa của cường giả. Boss tầng 60 mở Bảo Rương Tuần.'
    },
    {
        id: 4,
        name: 'Tiên Giới',
        floors: [61, 80],
        requiredRealm: 8,
        requiredRealmName: 'Hợp Thể',
        boss: 'Cửu U Ma Hoàng',
        color: '#fbbf24',
        description: 'Vùng đất thần tiên. Chỉ dành cho đại năng.'
    },
    {
        id: 5,
        name: 'Đế Giới',
        floors: [81, 100],
        requiredRealm: 10,
        requiredRealmName: 'Chân Tiên',
        boss: 'Hỗn Độn Ma Thần',
        color: '#f87171',
        description: 'Đỉnh cao của tháp. Nơi chỉ Đế Quân mới dám bước.'
    }
];

const pixelBorder = "border-4 border-slate-700 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]";

// ==================== SUB-COMPONENTS ====================

// Scanlines effect
const Scanlines = memo(() => (
    <div
        className="absolute inset-0 pointer-events-none z-50 overflow-hidden opacity-10"
        style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.2))', backgroundSize: '100% 4px' }}
    />
));

// Zone Card
const ZoneCard = memo(({ zone, highestFloor, currentRealm, onEnter, disabled }) => {
    const isUnlocked = currentRealm >= zone.requiredRealm;
    const zoneStart = zone.floors[0];
    const zoneEnd = zone.floors[1];
    const floorsCleared = Math.min(Math.max(highestFloor - zoneStart + 1, 0), FLOORS_PER_ZONE);
    const progressPercent = (floorsCleared / FLOORS_PER_ZONE) * 100;
    const isComplete = highestFloor >= zoneEnd;
    const isActive = highestFloor >= zoneStart - 1 && highestFloor < zoneEnd;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={isUnlocked && !disabled ? { scale: 1.02 } : {}}
            className={`spirit-tablet rounded-xl p-4 md:p-5 h-full flex flex-col border relative overflow-hidden
                ${isUnlocked ? 'border-amber-500/30 cursor-pointer' : 'border-slate-700/30 opacity-60 cursor-not-allowed'}
                ${isActive ? 'ring-2 ring-amber-400/50' : ''}
            `}
            onClick={() => isUnlocked && !disabled && onEnter(zone)}
        >
            {!isUnlocked && (
                <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-xs text-slate-400">Cần {zone.requiredRealmName}</p>
                    </div>
                </div>
            )}

            <div className="spirit-corner spirit-corner-tl border-amber-500/40"></div>
            <div className="spirit-corner spirit-corner-tr border-amber-500/40"></div>
            <div className="spirit-corner spirit-corner-bl border-amber-500/40"></div>
            <div className="spirit-corner spirit-corner-br border-amber-500/40"></div>

            <div className="flex justify-between items-start mb-3 z-10">
                <div className="flex items-center gap-3">
                    <div>
                        <h3 className="text-base font-bold text-amber-300 font-title tracking-wide">{zone.name}</h3>
                        <span className="text-xs px-2 py-0.5 bg-slate-800/50 border border-amber-500/20 text-slate-400 rounded">
                            Tầng {zoneStart}-{zoneEnd}
                        </span>
                    </div>
                </div>
                {isComplete && (
                    <div className="bg-emerald-900/50 border border-emerald-700/50 px-2 py-1 text-xs text-emerald-400 rounded">✓</div>
                )}
            </div>

            <p className="text-sm text-slate-400 mb-4 line-clamp-2">{zone.description}</p>

            {isUnlocked && (
                <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>Tiến độ</span>
                        <span className="text-emerald-400 font-medium">{floorsCleared}/{FLOORS_PER_ZONE}</span>
                    </div>
                    <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden border border-slate-700/50">
                        <div className="h-full transition-all" style={{ width: `${progressPercent}%`, background: `linear-gradient(to right, ${zone.color}, ${zone.color}80)` }} />
                    </div>
                </div>
            )}

            <div className="mt-auto pt-2 z-10">
                <button
                    disabled={!isUnlocked || disabled}
                    className={`w-full py-2.5 px-4 text-sm font-medium rounded-lg transition-all font-title
                        ${!isUnlocked ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
                            : isActive ? 'bg-amber-600/80 border border-amber-500/50 text-white hover:bg-amber-600'
                                : 'bg-emerald-600/80 border border-emerald-500/50 text-white hover:bg-emerald-600'}`}
                >
                    {!isUnlocked ? `CẦN ${zone.requiredRealmName.toUpperCase()}` : isActive ? 'VÀO THÁP' : 'QUÉT NHANH'}
                </button>
            </div>
        </motion.div>
    );
});

// Tower Exploration View (before battle)
const TowerExplorationView = memo(({ zone, floor, monster, onStartBattle, onExit, loading, playerName, playerAvatar }) => {
    return (
        <div className={`w-full max-w-4xl mx-auto bg-black ${pixelBorder} overflow-hidden relative flex flex-col`}>
            <Scanlines />

            {/* Game Screen */}
            <div className="relative min-h-[180px] sm:min-h-[220px] md:min-h-[280px] bg-slate-900 overflow-hidden">
                {/* Background */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
                <motion.div
                    className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-900"
                    animate={{ x: ['0%', '-100%'] }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                >
                    <div className="absolute bottom-0 w-[200%] h-1/2 bg-black/20" style={{ clipPath: 'polygon(0% 100%, 10% 60%, 25% 80%, 40% 50%, 55% 70%, 70% 40%, 85% 60%, 100% 30%, 100% 100%)' }}></div>
                </motion.div>

                {/* Ground */}
                <div className="absolute bottom-0 w-full h-10 sm:h-12 bg-[#2d3748] border-t-4 border-[#1a202c] z-10"></div>

                {/* Player */}
                <motion.div
                    className="absolute bottom-10 sm:bottom-12 left-4 sm:left-10 z-20 flex flex-col items-center"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
                >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                        {playerAvatar ? (
                            <img src={playerAvatar} alt={playerName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-slate-700 flex items-center justify-center text-lg font-bold text-emerald-400">
                                {playerName?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                        )}
                    </div>
                    <div className="text-[8px] text-emerald-400 mt-1 font-bold">{playerName}</div>
                </motion.div>

                {/* Monster */}
                <motion.div
                    className="absolute bottom-10 sm:bottom-12 right-4 sm:right-10 z-20 flex flex-col items-center"
                    initial={{ x: 100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                >
                    <motion.div animate={{ y: [0, -2, 0] }} transition={{ duration: 0.8, repeat: Infinity }}>
                        <img
                            src={monster?.image}
                            alt={monster?.name}
                            className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-full border-2 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                            onError={(e) => { e.target.src = '/assets/tower/yeuthu.jpg'; }}
                        />
                        {monster?.type === 'boss' && <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-red-500 text-xs font-bold animate-bounce">BOSS</div>}
                    </motion.div>
                    <div className="text-[8px] text-red-400 mt-1 font-bold">{monster?.name}</div>
                </motion.div>

                {/* Floor Indicator */}
                <div className="absolute top-2 right-2 bg-black/50 p-2 border-2 border-white/20 rounded z-30 font-mono text-[10px] text-white">
                    {zone?.name} - TẦNG {floor}
                </div>
            </div>

            {/* Text Box */}
            <div className="bg-black border-t-4 border-slate-700 p-3 sm:p-4">
                <div className="font-mono text-xs sm:text-sm text-white mb-3">
                    <span className="text-red-400 uppercase font-bold">YÊU KHÍ XUNG THIÊN!</span><br />
                    Phát hiện <span className="text-yellow-400">{monster?.name}</span> ({monster?.type === 'boss' ? 'YÊU VƯƠNG' : monster?.type === 'elite' ? 'TINH ANH' : 'YÊU THÚ'})!
                    <div className="mt-1.5 sm:mt-2 text-[9px] sm:text-[10px] text-slate-400">
                        CÔNG: {formatNumber(monster?.stats?.attack || 0)} | THỦ: {formatNumber(monster?.stats?.defense || 0)} | HUYẾT: {formatNumber(monster?.stats?.qiBlood || 0)}
                    </div>
                </div>

                <div className="flex gap-2 sm:gap-4">
                    <button
                        onClick={onStartBattle}
                        disabled={loading}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold font-mono py-2.5 px-4 text-xs sm:text-sm border-2 border-white/50 active:translate-y-1 transition-all disabled:opacity-50"
                    >
                        KHAI CHIẾN
                    </button>
                    <button
                        onClick={onExit}
                        className="w-14 sm:w-16 bg-red-900/50 hover:bg-red-900 text-red-200 font-bold font-mono text-xs border-2 border-red-800"
                    >
                        RÚT LUI
                    </button>
                </div>
            </div>
        </div>
    );
});

// Tower Battle View (animated combat)
const TowerBattleView = memo(({ monster, battleResult, onComplete, playerName, playerAvatar }) => {
    const [currentLogIndex, setCurrentLogIndex] = useState(0);
    const [playerHp, setPlayerHp] = useState(battleResult?.battle?.maxPlayerHp || 100);
    const [monsterHp, setMonsterHp] = useState(battleResult?.battle?.maxMonsterHp || 100);
    const [playerMana, setPlayerMana] = useState(battleResult?.battle?.playerStats?.zhenYuan || 0);
    const [monsterMana, setMonsterMana] = useState(battleResult?.battle?.monsterStats?.zhenYuan || 0);
    const [actionText, setActionText] = useState("Đang vận chuyển linh lực...");
    const [hitEffect, setHitEffect] = useState(null);
    const hasCompletedRef = useRef(false);

    const logs = battleResult?.battle?.logs || [];
    const maxPlayerHp = battleResult?.battle?.maxPlayerHp || 1;
    const maxMonsterHp = battleResult?.battle?.maxMonsterHp || 1;
    const maxPlayerMana = battleResult?.battle?.playerStats?.maxZhenYuan || battleResult?.battle?.playerStats?.zhenYuan || 0;
    const maxMonsterMana = battleResult?.battle?.monsterStats?.maxZhenYuan || battleResult?.battle?.monsterStats?.zhenYuan || 0;

    useEffect(() => {
        setCurrentLogIndex(0);
        setPlayerHp(battleResult?.battle?.maxPlayerHp || 100);
        setMonsterHp(battleResult?.battle?.maxMonsterHp || 100);
        setPlayerMana(battleResult?.battle?.playerStats?.zhenYuan || 0);
        setMonsterMana(battleResult?.battle?.monsterStats?.zhenYuan || 0);
        setActionText("Đang vận chuyển linh lực...");
        setHitEffect(null);
        hasCompletedRef.current = false;
    }, [battleResult]);

    useEffect(() => {
        if (!battleResult) return;
        if (logs.length === 0 && !hasCompletedRef.current) {
            hasCompletedRef.current = true;
            setTimeout(onComplete, 300);
        }
    }, [battleResult, logs.length, onComplete]);

    useEffect(() => {
        if (currentLogIndex === 0) hasCompletedRef.current = false;

        if (currentLogIndex >= logs.length) {
            if (logs.length > 0 && !hasCompletedRef.current) {
                hasCompletedRef.current = true;
                const won = battleResult?.result === 'win';
                setActionText(won ? "ĐẠI THẮNG!" : "BẠI TRẬN...");
                setTimeout(onComplete, 1500);
            }
            return;
        }

        const timer = setTimeout(() => {
            const log = logs[currentLogIndex];

            if (log.playerHpAfter !== undefined) {
                setPlayerHp(log.playerHpAfter);
            }
            if (log.monsterHpAfter !== undefined) {
                setMonsterHp(log.monsterHpAfter);
            }

            if (log.playerMana !== undefined) {
                setPlayerMana(log.playerMana);
            }
            if (log.monsterMana !== undefined) {
                setMonsterMana(log.monsterMana);
            }

            if (log.attacker === 'player' && !log.isDodged) {
                setMonsterHp(log.monsterHpAfter);
                const skillText = log.skillUsed ? `【${log.skillUsed}】` : '';
                const manaText = log.manaConsumed ? ` (-${log.manaConsumed} CHÂN NGUYÊN)` : '';
                setActionText(`${skillText} Đạo hữu xuất chiêu, gây ${formatNumber(log.damage)} thương tổn!${log.isCritical ? ' BẠO KÍCH!' : ''}${manaText}`);
                setHitEffect('monster');
            } else if (log.attacker === 'monster' && !log.isDodged) {
                setPlayerHp(log.playerHpAfter);
                const skillText = log.skillUsed ? `【${log.skillUsed}】` : '';
                const manaText = log.manaConsumed ? ` (-${log.manaConsumed} CHÂN NGUYÊN)` : '';
                setActionText(`${skillText} ${monster?.name} phản kích, gây ${formatNumber(log.damage)} thương tổn!${manaText}`);
                setHitEffect('player');
            } else {
                setActionText(`${log.attacker === 'player' ? 'Địch' : 'Đạo hữu'} đã thi triển thân pháp, tránh né thành công!`);
            }

            setTimeout(() => setHitEffect(null), 300);
            setCurrentLogIndex(prev => prev + 1);
        }, 800);

        return () => clearTimeout(timer);
    }, [currentLogIndex, logs, onComplete, monster, battleResult]);

    return (
        <div className={`w-full max-w-4xl mx-auto bg-[#202028] ${pixelBorder} overflow-hidden p-3 sm:p-6 font-mono`}>
            {/* Battle Scene */}
            <div className="relative h-48 sm:h-64 bg-slate-800 border-4 border-slate-900 mb-4 overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#000 20%, transparent 20%)', backgroundSize: '8px 8px' }}></div>

                {/* Monster */}
                <motion.div
                    className="absolute top-3 sm:top-6 right-3 sm:right-6 flex flex-col items-center"
                    animate={hitEffect === 'monster' ? { x: [-5, 5, -5, 5, 0] } : {}}
                >
                    <img src={monster?.image} alt={monster?.name} className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-full border-2 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                        onError={(e) => { e.target.src = '/assets/tower/yeuthu.jpg'; }} />
                    <div className="text-[8px] text-white mt-1 font-bold">{monster?.name}</div>
                    <div className="w-16 sm:w-20 bg-black h-2 mt-1 border border-white/20">
                        <motion.div className="h-full bg-red-500" animate={{ width: `${(monsterHp / maxMonsterHp) * 100}%` }} />
                    </div>
                    <div className="text-[6px] text-red-400">{formatNumber(Math.max(0, monsterHp))} HP</div>
                    <div className="w-16 sm:w-20 bg-black h-1.5 sm:h-2 border border-white/20">
                        <motion.div className="h-full bg-blue-500" animate={{ width: `${maxMonsterMana ? (monsterMana / maxMonsterMana) * 100 : 0}%` }} />
                    </div>
                    <div className="text-[6px] text-blue-400">{formatNumber(Math.max(0, monsterMana))} MP</div>
                </motion.div>

                {/* Player */}
                <motion.div
                    className="absolute bottom-3 sm:bottom-6 left-3 sm:left-6 flex flex-col items-center"
                    animate={hitEffect === 'player' ? { x: [5, -5, 5, -5, 0] } : {}}
                >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                        {playerAvatar ? (
                            <img src={playerAvatar} alt={playerName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-slate-700 flex items-center justify-center text-lg font-bold text-emerald-400">
                                {playerName?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                        )}
                    </div>
                    <div className="text-[8px] text-white mt-1 font-bold">{playerName || 'Tu Sĩ'}</div>
                    <div className="w-16 sm:w-20 bg-black h-2 mt-1 border border-white/20">
                        <motion.div className="h-full bg-emerald-500" animate={{ width: `${(playerHp / maxPlayerHp) * 100}%` }} />
                    </div>
                    <div className="text-[6px] text-emerald-400">{formatNumber(Math.max(0, playerHp))} HP</div>
                    <div className="w-16 sm:w-20 bg-black h-1.5 sm:h-2 border border-white/20">
                        <motion.div className="h-full bg-blue-500" animate={{ width: `${maxPlayerMana ? (playerMana / maxPlayerMana) * 100 : 0}%` }} />
                    </div>
                    <div className="text-[6px] text-blue-400">{formatNumber(Math.max(0, playerMana))} MP</div>
                </motion.div>
            </div>

            {/* Text Box */}
            <div className="bg-black border-4 border-white/80 p-4 min-h-[60px] text-white text-sm">
                <p className="mb-1 text-slate-400 text-[10px]">HIỆP {Math.min(currentLogIndex + 1, logs.length)} / {logs.length}</p>
                <div className="animate-pulse">{actionText}</div>
            </div>
        </div>
    );
});

// Battle Result Modal
const BattleResultModal = memo(({ result, onClose }) => {
    if (!result) return null;
    const isWin = result.result === 'win';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4">
            <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                className="bg-slate-900 border-4 border-white p-2 max-w-sm w-full shadow-[8px_8px_0px_#000]"
            >
                <div className="border-2 border-white/20 p-6 text-center font-mono">
                    <h2 className={`text-2xl font-bold uppercase mb-4 ${isWin ? 'text-emerald-400' : 'text-red-500'}`}>
                        {isWin ? 'ĐẠI THẮNG!' : 'BẠI TRẬN...'}
                    </h2>

                    <p className="text-slate-400 text-sm mb-4">
                        Tầng {result.floor} {result.isBoss ? '(BOSS)' : ''}
                    </p>

                    {isWin && result.rewards && (
                        <div className="bg-black p-4 border-2 border-slate-700 my-4 text-left">
                            <p className="text-white mb-2 underline decoration-dashed text-xs">CƠ DUYÊN:</p>
                            <div className="flex justify-between text-emerald-400 text-sm">
                                <span>TU VI:</span> <span>+{formatNumber(result.rewards.exp || 0)}</span>
                            </div>
                            <div className="flex justify-between text-yellow-400 text-sm">
                                <span>LINH THẠCH:</span> <span>+{formatNumber(result.rewards.spiritStones || 0)}</span>
                            </div>
                            {result.rewards.mat_heaven_shard > 0 && (
                                <div className="flex justify-between text-purple-400 text-sm">
                                    <span>THIÊN ĐẠO MẢNH:</span> <span>+{result.rewards.mat_heaven_shard}</span>
                                </div>
                            )}
                            {result.rewards.mat_root_crystal > 0 && (
                                <div className="flex justify-between text-cyan-400 text-sm">
                                    <span>LINH CĂN TINH:</span> <span>+{result.rewards.mat_root_crystal}</span>
                                </div>
                            )}
                        </div>
                    )}

                    <button onClick={onClose} className="w-full bg-white text-black font-bold py-3 hover:bg-slate-200 active:translate-y-1 transition-transform">
                        ĐÓNG
                    </button>
                </div>
            </motion.div>
        </div>
    );
});

// Materials Display
const MaterialsDisplay = memo(({ materials, required }) => {
    const items = [
        { id: 'mat_contract', name: 'Khế Ước', current: materials?.mat_contract || 0, required: required?.mat_contract || 4, color: '#f59e0b', image: '/assets/tower/mat_contract.jpg' },
        { id: 'mat_heaven_shard', name: 'Thiên Đạo Mảnh', current: materials?.mat_heaven_shard || 0, required: required?.mat_heaven_shard || 1200, color: '#a855f7', image: '/assets/tower/mat_heaven_shard.jpg' },
        { id: 'mat_root_crystal', name: 'Linh Căn Tinh', current: materials?.mat_root_crystal || 0, required: required?.mat_root_crystal || 2000, color: '#22d3ee', image: '/assets/tower/mat_root_crystal.jpg' }
    ];

    return (
        <div className="grid grid-cols-3 gap-2">
            {items.map(item => {
                const progress = Math.min((item.current / item.required) * 100, 100);
                const isComplete = item.current >= item.required;

                return (
                    <div key={item.id} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-2 text-center">
                        <img src={item.image} alt={item.name} className="w-8 h-8 mx-auto mb-1 rounded object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                        <div className="text-[10px] text-slate-400 truncate">{item.name}</div>
                        <div className="text-xs font-bold" style={{ color: isComplete ? '#4ade80' : item.color }}>
                            {formatNumber(item.current)}/{formatNumber(item.required)}
                        </div>
                        <div className="h-1 bg-slate-900 rounded-full mt-1 overflow-hidden">
                            <div className="h-full transition-all" style={{ width: `${progress}%`, backgroundColor: isComplete ? '#4ade80' : item.color }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
});

// Weekly Chest Modal
const WeeklyChestModal = memo(({ eligible, claimed, onClaim, onClose, loading }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-slate-900 border-4 border-amber-500 p-2 max-w-sm w-full shadow-[8px_8px_0px_#000]">
            <div className="border-2 border-amber-500/30 p-6 text-center font-mono">
                <GiChest className="w-16 h-16 mx-auto mb-4 text-amber-400" />
                <h2 className="text-xl font-bold text-amber-400 mb-2">BẢO RƯƠNG TUẦN</h2>
                <p className="text-slate-400 text-sm mb-4">
                    {claimed ? 'Đã thu thập tuần này. Tái lập vào thứ Hai.' : eligible ? 'Đã vượt tầng 60 - Nhận 1 Khế Ước Phi Thăng!' : `Vượt qua tầng ${WEEKLY_CHEST_FLOOR} để đoạt bảo`}
                </p>
                {eligible && !claimed && (
                    <button onClick={onClaim} disabled={loading} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 mb-4 transition-all disabled:opacity-50">
                        {loading ? 'Đang thu thập...' : 'THU THẬP'}
                    </button>
                )}
                <button onClick={onClose} className="w-full bg-slate-800 text-white font-bold py-2 hover:bg-slate-700">ĐÓNG</button>
            </div>
        </motion.div>
    </div>
));

// Floor Cell
const FloorCell = memo(({ floor, highestFloor, isBoss, isNext, disabled }) => {
    const isCleared = floor <= highestFloor;
    const isLocked = floor > highestFloor + 1;

    let bgColor = 'bg-slate-800/50';
    let borderColor = 'border-slate-700/50';
    let textColor = 'text-slate-500';

    if (isCleared) {
        bgColor = isBoss ? 'bg-amber-900/50' : 'bg-emerald-900/50';
        borderColor = isBoss ? 'border-amber-500/50' : 'border-emerald-500/50';
        textColor = isBoss ? 'text-amber-400' : 'text-emerald-400';
    } else if (isNext) {
        bgColor = 'bg-blue-900/50';
        borderColor = 'border-blue-400/50';
        textColor = 'text-blue-400';
    }

    return (
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg border ${bgColor} ${borderColor} flex items-center justify-center text-xs sm:text-sm font-bold ${textColor} transition-all relative ${isNext ? 'ring-2 ring-blue-400 animate-pulse' : ''} ${disabled ? 'opacity-60' : ''}`}>
            {floor}
            {floor === WEEKLY_CHEST_FLOOR && isCleared && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full flex items-center justify-center">
                    <GiChest className="w-2 h-2 text-yellow-900" />
                </div>
            )}
        </div>
    );
});

// ==================== MAIN COMPONENT ====================

export default function TowerTab() {
    const { refresh, cultivation } = useCultivation();
    const [user, setUser] = useState(null);

    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [view, setView] = useState('lobby'); // 'lobby' | 'zone' | 'exploring' | 'battle'
    const [activeZone, setActiveZone] = useState(null);
    const [currentMonster, setCurrentMonster] = useState(null);
    const [battleResult, setBattleResult] = useState(null);
    const [showChestModal, setShowChestModal] = useState(false);
    const [showRewardModal, setShowRewardModal] = useState(false);
    const [message, setMessage] = useState(null);

    const currentRealm = cultivation?.realm?.level || 1;
    const playerName = user?.nickname?.trim() || user?.name || 'Tu Sĩ';
    const playerAvatar = user ? getUserAvatarUrl(user, 64) : null;

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const userData = await loadUser();
                if (userData) {
                    setUser(userData);
                }
            } catch (err) {
                debugError('TowerTab', 'loadUser error', err);
            }
        };
        fetchUser();
    }, []);

    const fetchStatus = useCallback(async () => {
        try {
            const res = await getTowerStatus();
            if (res.success) setStatus(res.data);
        } catch (err) {
            debugError('TowerTab', 'fetchStatus error', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchStatus(); }, [fetchStatus]);

    const handleEnterZone = useCallback((zone) => {
        setActiveZone(zone);
        setView('zone');
    }, []);

    const handleBackToLobby = useCallback(() => {
        setView('lobby');
        setActiveZone(null);
        setCurrentMonster(null);
        setBattleResult(null);
    }, []);

    const handleStartExploring = useCallback(() => {
        const nextFloor = (status?.highestFloorEver || 0) + 1;
        const monster = getMonsterWithPreview(nextFloor, status?.nextMonsterPreview);
        setCurrentMonster(monster);
        setView('exploring');
    }, [status]);

    const handleStartBattle = useCallback(async () => {
        if (actionLoading) return;
        setActionLoading(true);
        setMessage(null);

        try {
            const res = await towerClimb();
            if (res.success) {
                setBattleResult(res.data);
                setView('battle');
                await fetchStatus();
                refresh(true); // Silent refresh to avoid unmounting
            } else {
                setMessage({ type: 'error', text: res.message });
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'Có lỗi xảy ra' });
        } finally {
            setActionLoading(false);
        }
    }, [actionLoading, fetchStatus, refresh]);

    const handleBattleComplete = useCallback(() => {
        setShowRewardModal(true);
    }, []);

    const handleCloseReward = useCallback(() => {
        setShowRewardModal(false);

        const lastResult = battleResult;
        setBattleResult(null);

        const won = lastResult?.result === 'win';
        const nextFloor = won ? (lastResult?.floor || 0) + 1 : (status?.highestFloorEver || 0) + 1;
        const inActiveZone = activeZone && nextFloor >= activeZone.floors[0] && nextFloor <= activeZone.floors[1];
        const canContinue = won && inActiveZone && (status?.attemptsLeft || 0) > 0 && status?.canEnterNextFloor !== false && nextFloor <= 100;

        if (canContinue) {
            const monster = getMonsterWithPreview(nextFloor, status?.nextMonsterPreview);
            setCurrentMonster(monster);
            setView('exploring');
            return;
        }

        if (inActiveZone) {
            setView('zone');
        } else {
            handleBackToLobby();
        }
    }, [battleResult, status, activeZone, handleBackToLobby]);

    const handleSweep = useCallback(async () => {
        if (actionLoading) return;
        setActionLoading(true);
        setMessage(null);

        try {
            const res = await towerSweepAll();
            if (res.success) {
                setMessage({ type: 'success', text: res.data.message || `Quét tháp thành công!` });
                await fetchStatus();
                refresh(true);
            } else {
                setMessage({ type: 'error', text: res.message });
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'Có lỗi xảy ra' });
        } finally {
            setActionLoading(false);
        }
    }, [actionLoading, fetchStatus, refresh]);

    const handleClaimChest = useCallback(async () => {
        if (actionLoading) return;
        setActionLoading(true);

        try {
            const res = await towerClaimChest();
            if (res.success) {
                setMessage({ type: 'success', text: res.data.message });
                await fetchStatus();
                refresh(true);
                setShowChestModal(false);
            } else {
                setMessage({ type: 'error', text: res.message });
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'Có lỗi xảy ra' });
        } finally {
            setActionLoading(false);
        }
    }, [actionLoading, fetchStatus, refresh]);

    // Render
    if (loading) {
        return <div className="flex items-center justify-center py-20"><div className="text-slate-400 animate-pulse">Đang tải Vạn Kiếp Tháp...</div></div>;
    }

    if (!status) {
        return <div className="text-center py-20 text-red-400">Không thể tải dữ liệu tháp</div>;
    }

    const { attemptsLeft = 0, attemptsMax, highestFloorEver = 0, weeklyEligible, weeklyContractClaimed, materials, ascensionCheck, canEnterNextFloor = true, nextRealmGate } = status;
    const attemptsMaxSafe = Number.isFinite(attemptsMax) ? attemptsMax : DEFAULT_ATTEMPTS_MAX;
    const highestFloorSafe = Number.isFinite(highestFloorEver) ? highestFloorEver : 0;
    const nextFloorSafe = highestFloorSafe + 1;

    // ==================== EXPLORING VIEW ====================
    if (view === 'exploring' && currentMonster) {
        return (
            <div className="space-y-4 pb-4">
                <TowerExplorationView
                    zone={activeZone}
                    floor={nextFloorSafe}
                    monster={currentMonster}
                    onStartBattle={handleStartBattle}
                    onExit={handleBackToLobby}
                    loading={actionLoading}
                    playerName={playerName}
                    playerAvatar={playerAvatar}
                />
                <AnimatePresence>
                    {message && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className={`p-3 rounded-lg text-sm text-center ${message.type === 'error' ? 'bg-red-900/50 text-red-300' : 'bg-emerald-900/50 text-emerald-300'}`}>
                            {message.text}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    // ==================== BATTLE VIEW ====================
    if (view === 'battle' && battleResult) {
        return (
            <div className="space-y-4 pb-4">
                <TowerBattleView
                    monster={currentMonster}
                    battleResult={battleResult}
                    onComplete={handleBattleComplete}
                    playerName={playerName}
                    playerAvatar={playerAvatar}
                />
                <AnimatePresence>
                    {showRewardModal && (
                        <BattleResultModal result={battleResult} onClose={handleCloseReward} />
                    )}
                </AnimatePresence>
            </div>
        );
    }

    // ==================== ZONE VIEW ====================
    if (view === 'zone' && activeZone) {
        const zoneStart = activeZone.floors[0];
        const zoneEnd = activeZone.floors[1];
        const isInThisZone = nextFloorSafe >= zoneStart && nextFloorSafe <= zoneEnd;

        return (
            <div className="space-y-4 pb-4">
                <div className="spirit-tablet rounded-xl p-4 flex items-center justify-between border border-amber-500/30">
                    <button onClick={handleBackToLobby} className="px-4 py-2 bg-slate-800/50 border border-slate-600/50 text-slate-300 text-sm font-medium hover:bg-slate-700/50 transition-all rounded-lg">← Trở Về</button>
                    <div className="text-center">
                        <h3 className="text-lg font-bold text-amber-300 font-title">{activeZone.name}</h3>
                        <p className="text-xs text-slate-400">Tầng {zoneStart} - {zoneEnd}</p>
                    </div>
                    <div className="px-4 py-2 bg-slate-800/50 border border-amber-500/30 flex items-center gap-2 text-amber-400 text-sm font-medium rounded-lg">{attemptsLeft}/{attemptsMaxSafe} lượt</div>
                </div>

                <AnimatePresence>
                    {message && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className={`p-3 rounded-lg text-sm text-center ${message.type === 'error' ? 'bg-red-900/50 text-red-300' : 'bg-emerald-900/50 text-emerald-300'}`}>
                            {message.text}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="spirit-tablet rounded-xl p-4 border border-slate-700/50">
                    <div className="grid grid-cols-10 gap-1">
                        {Array.from({ length: FLOORS_PER_ZONE }).map((_, i) => {
                            const floor = zoneStart + i;
                            return <FloorCell key={floor} floor={floor} highestFloor={highestFloorSafe} isBoss={BOSS_FLOORS.includes(floor)} isNext={floor === nextFloorSafe} disabled={actionLoading} />;
                        })}
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-3 text-xs text-slate-500">
                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-500/50 rounded" /> Đã Vượt</div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-amber-500/50 rounded" /> Thủ Lĩnh</div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500/50 rounded animate-pulse" /> Kế Tiếp</div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button onClick={handleStartExploring} disabled={actionLoading || attemptsLeft <= 0 || !canEnterNextFloor || !isInThisZone || highestFloorSafe >= 100}
                        className="spirit-tablet p-4 rounded-xl border border-emerald-500/30 text-center transition-all hover:border-emerald-400/50 hover:bg-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed">
                        <div className="text-sm font-bold text-emerald-300">{!isInThisZone ? 'VỰC KHÁC' : highestFloorSafe >= zoneEnd ? 'ĐÃ VƯỢT' : `KHIÊU CHIẾN TẦNG ${nextFloorSafe}`}</div>
                        {!canEnterNextFloor && nextRealmGate && <div className="text-xs text-red-400 mt-1">Yêu cầu: {nextRealmGate.realmName}</div>}
                    </button>

                    <button onClick={handleSweep} disabled={actionLoading || attemptsLeft <= 0 || highestFloorSafe < zoneStart}
                        className="spirit-tablet p-4 rounded-xl border border-blue-500/30 text-center transition-all hover:border-blue-400/50 hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed">
                        <div className="text-sm font-bold text-blue-300">CÀN QUÉT ({attemptsLeft} lượt)</div>
                        <div className="text-xs text-slate-500 mt-1">Thu thập tài nguyên</div>
                    </button>
                </div>
            </div>
        );
    }

    // ==================== LOBBY VIEW ====================
    return (
        <div className="space-y-6 md:space-y-8 pb-4">
            <div className="text-center">
                <h3 className="font-bold text-gold font-title tracking-wide text-xl lg:text-2xl mb-2">VẠN KIẾP THÁP</h3>
                <div className="h-[2px] w-24 mx-auto bg-gradient-to-r from-transparent via-amber-500/60 to-transparent"></div>
                <p className="text-sm text-slate-400 mt-2">Thành Tích: <span className="text-emerald-400 font-bold">Tầng {highestFloorSafe}/100</span></p>
            </div>

            <div className="spirit-tablet rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border border-amber-500/30">
                <div className="flex items-center gap-4">
                    <div>
                        <p className="text-sm text-slate-400">Số Lượt</p>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: attemptsMaxSafe }).map((_, i) => (
                                <div key={i} className={`w-3 h-3 rounded-full ${i < attemptsLeft ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                            ))}
                            <span className="text-sm text-slate-300 ml-2">{attemptsLeft}/{attemptsMaxSafe}</span>
                        </div>
                    </div>
                </div>

                <button onClick={() => setShowChestModal(true)}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all
                        ${weeklyEligible && !weeklyContractClaimed ? 'bg-amber-600/80 border border-amber-500/50 text-white animate-pulse' : 'bg-slate-800/50 border border-slate-600/50 text-slate-400'}`}>
                    <GiChest className="w-5 h-5" />
                    {weeklyContractClaimed ? 'Đã nhận' : weeklyEligible ? 'Nhận Rương!' : 'Bảo Rương Tuần'}
                </button>
            </div>

            <div className="spirit-tablet rounded-xl p-4 border border-slate-700/50">
                <h4 className="text-sm font-bold text-amber-300 mb-3">Vật Liệu Phi Thăng (14 → 15)</h4>
                <MaterialsDisplay materials={materials} required={ascensionCheck?.required} />
                {ascensionCheck?.eligible && (
                    <div className="mt-3 p-2 bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-purple-500/50 rounded-lg text-center">
                        <span className="text-purple-300 text-sm font-bold">Đủ điều kiện đột phá: Thiên Đế → Linh Giới</span>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {message && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className={`p-3 rounded-lg text-sm text-center ${message.type === 'error' ? 'bg-red-900/50 text-red-300' : 'bg-emerald-900/50 text-emerald-300'}`}>
                        {message.text}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {TOWER_ZONES.map(zone => (
                    <ZoneCard key={zone.id} zone={zone} highestFloor={highestFloorSafe} currentRealm={currentRealm} onEnter={handleEnterZone} disabled={loading || actionLoading} />
                ))}
            </div>

            <AnimatePresence>
                {showChestModal && (
                    <WeeklyChestModal eligible={weeklyEligible} claimed={weeklyContractClaimed} onClaim={handleClaimChest} onClose={() => setShowChestModal(false)} loading={actionLoading} />
                )}
            </AnimatePresence>
        </div>
    );
}
