/**
 * BattleScene - Shared Battle Animation Component
 * 
 * Based on DungeonTab's PixelBattleView - lightweight, no lag
 * Used by PKTab (Luận Võ) and ArenaTab (Võ Đài)
 * 
 * Features:
 * - Custom background image (luanvo.jpg, vodai.jpg)
 * - Simple shake hit effects (no particles/fog/rocks)
 * - HP/Mana bars with smooth animation
 * - Action text box with round indicator
 * - Skip button & Result display
 */

import { useState, useEffect, useCallback, memo, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getUserAvatarUrl } from '../../../utils/avatarUtils.js';

// Helper to format numbers
const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return Math.floor(num).toLocaleString();
};

/**
 * BattleScene Component
 * 
 * @param {Object} battleResult - Combat result data
 * @param {string} backgroundImage - Background image name ('luanvo' or 'vodai')
 * @param {Function} onComplete - Callback when battle animation finishes
 * @param {Function} onSkip - Optional callback for skip button
 */
const BattleScene = memo(function BattleScene({
    battleResult,
    backgroundImage = 'luanvo',
    onComplete,
    onSkip
}) {
    // State
    const [phase, setPhase] = useState('intro'); // 'intro', 'fighting', 'result'
    const [currentLogIndex, setCurrentLogIndex] = useState(0);
    const [challengerHp, setChallengerHp] = useState(0);
    const [opponentHp, setOpponentHp] = useState(0);
    const [challengerMana, setChallengerMana] = useState(0);
    const [opponentMana, setOpponentMana] = useState(0);
    const [hitEffect, setHitEffect] = useState(null); // 'challenger' | 'opponent' | null
    const [actionText, setActionText] = useState('Chuẩn bị giao đấu...');
    const hasCompletedRef = useRef(false);

    // Extract data
    const challenger = battleResult?.challenger || {};
    const opponent = battleResult?.opponent || {};
    const battleLogs = battleResult?.battleLogs || [];
    const maxChallengerHp = challenger.stats?.qiBlood || 100;
    const maxOpponentHp = opponent.stats?.qiBlood || 100;
    const maxChallengerMana = challenger.stats?.zhenYuan || 100;
    const maxOpponentMana = opponent.stats?.zhenYuan || 100;

    // Name handling
    const challengerName = challenger.name || challenger.username || 'Challenger';
    const opponentName = opponent.name || opponent.username || 'Opponent';

    // Lock body scroll
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    // Initialize
    useEffect(() => {
        if (battleResult) {
            setChallengerHp(maxChallengerHp);
            setOpponentHp(maxOpponentHp);
            setChallengerMana(maxChallengerMana);
            setOpponentMana(maxOpponentMana);
            hasCompletedRef.current = false;
            setCurrentLogIndex(0);
            setPhase('intro');

            // Start fighting after intro
            const timer = setTimeout(() => setPhase('fighting'), 1500);
            return () => clearTimeout(timer);
        }
    }, [battleResult, maxChallengerHp, maxOpponentHp, maxChallengerMana, maxOpponentMana]);

    // Handle skip
    const handleSkip = useCallback(() => {
        if (phase !== 'fighting' || currentLogIndex >= battleLogs.length) return;

        // Fast forward to final state
        if (battleLogs.length > 0) {
            const lastLog = battleLogs[battleLogs.length - 1];
            setChallengerHp(lastLog.challengerHp || 0);
            setOpponentHp(lastLog.opponentHp || 0);
            if (lastLog.challengerMana !== undefined) setChallengerMana(lastLog.challengerMana);
            if (lastLog.opponentMana !== undefined) setOpponentMana(lastLog.opponentMana);
        }
        setCurrentLogIndex(battleLogs.length);
        setActionText('ĐANG TÍNH KẾT QUẢ...');
        setTimeout(() => setPhase('result'), 500);

        if (onSkip) onSkip();
    }, [phase, currentLogIndex, battleLogs, onSkip]);

    // Auto-play battle logs
    useEffect(() => {
        if (phase !== 'fighting' || battleLogs.length === 0) return;

        if (currentLogIndex >= battleLogs.length) {
            // Battle finished
            if (!hasCompletedRef.current) {
                hasCompletedRef.current = true;
                const isWin = battleResult?.winner === 'challenger';
                const isDraw = battleResult?.isDraw;
                setActionText(isDraw ? 'HÒA!' : isWin ? 'CHIẾN THẮNG!' : 'THẤT BẠI...');
                setTimeout(() => setPhase('result'), 1000);
            }
            return;
        }

        const timer = setTimeout(() => {
            const log = battleLogs[currentLogIndex];
            const isAttackerChallenger = log.attacker === 'challenger';

            // Update HP/Mana
            setChallengerHp(log.challengerHp);
            setOpponentHp(log.opponentHp);
            if (log.challengerMana !== undefined) setChallengerMana(log.challengerMana);
            if (log.opponentMana !== undefined) setOpponentMana(log.opponentMana);

            // Build action text
            if (log.isDodged) {
                setActionText(`${isAttackerChallenger ? opponentName : challengerName} đã né tránh thành công!`);
            } else {
                const skillText = log.skillUsed ? `【${log.skillUsed}】` : '';
                const critText = log.isCritical ? ' BẠO KÍCH!' : '';
                const attackerName = isAttackerChallenger ? challengerName : opponentName;
                setActionText(`${skillText} ${attackerName} xuất chiêu, gây ${formatNumber(log.damage)} thương tổn!${critText}`);
            }

            // Hit effect
            setHitEffect(isAttackerChallenger ? 'opponent' : 'challenger');
            setTimeout(() => setHitEffect(null), 300);

            // Next log
            setCurrentLogIndex(prev => prev + 1);
        }, 800);

        return () => clearTimeout(timer);
    }, [phase, currentLogIndex, battleLogs, battleResult, challengerName, opponentName]);

    // Calculate Detailed Stats for Both Sides
    const stats = useMemo(() => {
        const createStats = () => ({
            damageDealt: 0,
            damageTaken: 0,
            healing: 0,
            critCount: 0,
            dodgeCount: 0,
            skills: {} // { skillName: { count, damage, heal, max } }
        });

        const challengerStats = createStats();
        const opponentStats = createStats();

        if (!battleLogs) return { challenger: challengerStats, opponent: opponentStats };

        battleLogs.forEach(log => {
            const isChallenger = log.attacker === 'challenger';
            const attackerStats = isChallenger ? challengerStats : opponentStats;
            const defenderStats = isChallenger ? opponentStats : challengerStats;

            if (log.isDodged) {
                defenderStats.dodgeCount++;
                return;
            }

            // Determine Skill Name
            let skillName = log.skillUsed;
            const dmg = Number(log.damage) || 0;
            const heal = Number(log.heal) || 0;

            if (!skillName) {
                if (dmg > 0) skillName = 'Đánh thường';
                else if (heal > 0) skillName = 'Hồi phục chung';
                else skillName = 'Hành động khác'; // Buff only or miscellaneous
            }

            // Init Skill Entry
            if (!attackerStats.skills[skillName]) {
                attackerStats.skills[skillName] = { count: 0, damage: 0, max: 0, heal: 0 };
            }

            // Update Stats
            attackerStats.skills[skillName].count++;

            if (dmg > 0) {
                attackerStats.damageDealt += dmg;
                defenderStats.damageTaken += dmg;
                attackerStats.skills[skillName].damage += dmg;
                if (dmg > attackerStats.skills[skillName].max) attackerStats.skills[skillName].max = dmg;
                if (log.isCritical) attackerStats.critCount++;
            }

            if (heal > 0) {
                attackerStats.healing += heal;
                attackerStats.skills[skillName].heal += heal;
            }
        });

        return { challenger: challengerStats, opponent: opponentStats };
    }, [battleLogs]);

    const [viewStatsMode, setViewStatsMode] = useState('challenger'); // 'challenger' | 'opponent'
    const currentStats = viewStatsMode === 'challenger' ? stats.challenger : stats.opponent;

    // Result display
    const isWin = battleResult?.winner === 'challenger';
    const isDraw = battleResult?.isDraw;
    const rewards = battleResult?.rewards;

    // Use Portal to escape parent stacking contexts
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black overflow-hidden touch-none overscroll-none h-[100dvh] w-[100dvw]">
            {/* Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                    backgroundImage: `url('/assets/${backgroundImage}.jpg')`,
                    filter: 'brightness(0.4)'
                }}
            />
            {/* Overlay gradient for better readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60" />

            {/* Intro Phase */}
            <AnimatePresence>
                {phase === 'intro' && (
                    <motion.div
                        className="absolute inset-0 flex items-center justify-center z-20"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.h2
                            className="text-4xl md:text-6xl font-bold text-gold font-title"
                            initial={{ scale: 0 }}
                            animate={{ scale: [0, 1.2, 1] }}
                            transition={{ duration: 0.5 }}
                            style={{ textShadow: '0 0 30px rgba(245,158,11,0.8)' }}
                        >
                            GIAO ĐẤU!
                        </motion.h2>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Battle Arena */}
            {(phase === 'fighting' || phase === 'result') && (
                <div className="relative w-full max-w-4xl mx-auto p-4 z-10 h-full flex flex-col justify-center">
                    {/* Skip Button */}
                    {phase === 'fighting' && currentLogIndex < battleLogs.length && (
                        <button
                            onClick={handleSkip}
                            className="fixed top-4 right-4 z-[110] bg-slate-800/80 hover:bg-slate-700 text-white font-bold py-2 px-4 text-xs rounded-lg border border-white/30 transition-all"
                        >
                            BỎ QUA
                        </button>
                    )}

                    {/* Battle Scene Container */}
                    <div className="w-full">
                        {/* Fighters Row */}
                        <div className="flex items-center justify-between gap-4 mb-6">
                            {/* Challenger (Left) */}
                            <motion.div
                                className="flex-1 flex flex-col items-center"
                                animate={hitEffect === 'challenger' ? { x: [5, -5, 5, -5, 0] } : {}}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="w-16 h-16 md:w-24 md:h-24 rounded-full overflow-hidden border-3 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                                    <img
                                        src={challenger.avatar || getUserAvatarUrl({ name: challengerName })}
                                        alt={challengerName}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = '/assets/default-avatar.png';
                                        }}
                                    />
                                </div>
                                <p className="text-emerald-400 font-bold text-sm md:text-base mt-2 truncate max-w-[100px] md:max-w-[150px]">
                                    {challengerName}
                                </p>
                                {/* HP Bar */}
                                <div className="w-full max-w-[120px] md:max-w-[180px] mt-2">
                                    <div className="flex justify-between text-[10px] text-emerald-400 mb-1">
                                        <span>Khí Huyết</span>
                                        <span>{formatNumber(Math.max(0, challengerHp))}</span>
                                    </div>
                                    <div className="h-3 bg-black/60 rounded-full overflow-hidden border border-emerald-500/50">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                                            animate={{ width: `${Math.max(0, (challengerHp / maxChallengerHp) * 100)}%` }}
                                            transition={{ duration: 0.3 }}
                                        />
                                    </div>
                                </div>
                                {/* Mana Bar */}
                                <div className="w-full max-w-[120px] md:max-w-[180px] mt-1">
                                    <div className="flex justify-between text-[10px] text-blue-400 mb-1">
                                        <span>Chân Nguyên</span>
                                        <span>{formatNumber(Math.max(0, challengerMana))}</span>
                                    </div>
                                    <div className="h-2 bg-black/60 rounded-full overflow-hidden border border-blue-500/50">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-blue-600 to-blue-400"
                                            animate={{ width: `${Math.max(0, (challengerMana / maxChallengerMana) * 100)}%` }}
                                            transition={{ duration: 0.3 }}
                                        />
                                    </div>
                                </div>
                            </motion.div>

                            {/* VS */}
                            <div className="text-3xl md:text-5xl font-bold text-amber-500 font-title" style={{ textShadow: '0 0 20px rgba(245,158,11,0.5)' }}>
                                VS
                            </div>

                            {/* Opponent (Right) */}
                            <motion.div
                                className="flex-1 flex flex-col items-center"
                                animate={hitEffect === 'opponent' ? { x: [-5, 5, -5, 5, 0] } : {}}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="w-16 h-16 md:w-24 md:h-24 rounded-full overflow-hidden border-3 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]">
                                    <img
                                        src={opponent.avatar || getUserAvatarUrl({ name: opponentName })}
                                        alt={opponentName}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = '/assets/default-avatar.png';
                                        }}
                                    />
                                </div>
                                <p className="text-red-400 font-bold text-sm md:text-base mt-2 truncate max-w-[100px] md:max-w-[150px]">
                                    {opponentName}
                                </p>
                                {/* HP Bar */}
                                <div className="w-full max-w-[120px] md:max-w-[180px] mt-2">
                                    <div className="flex justify-between text-[10px] text-red-400 mb-1">
                                        <span>HP</span>
                                        <span>{formatNumber(Math.max(0, opponentHp))}</span>
                                    </div>
                                    <div className="h-3 bg-black/60 rounded-full overflow-hidden border border-red-500/50">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-red-600 to-red-400"
                                            animate={{ width: `${Math.max(0, (opponentHp / maxOpponentHp) * 100)}%` }}
                                            transition={{ duration: 0.3 }}
                                        />
                                    </div>
                                </div>
                                {/* Mana Bar */}
                                <div className="w-full max-w-[120px] md:max-w-[180px] mt-1">
                                    <div className="flex justify-between text-[10px] text-blue-400 mb-1">
                                        <span>MP</span>
                                        <span>{formatNumber(Math.max(0, opponentMana))}</span>
                                    </div>
                                    <div className="h-2 bg-black/60 rounded-full overflow-hidden border border-blue-500/50">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-blue-600 to-blue-400"
                                            animate={{ width: `${Math.max(0, (opponentMana / maxOpponentMana) * 100)}%` }}
                                            transition={{ duration: 0.3 }}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        {/* Action Text Box */}
                        <div className="bg-black/40 rounded-lg p-2 min-h-[60px] text-center">
                            <p className="text-amber-400/70 text-xs mb-1">
                                ROUND {Math.min(currentLogIndex + 1, battleLogs.length)} / {battleLogs.length}
                            </p>
                            <p className="text-white text-sm md:text-base leading-relaxed">
                                {actionText}
                            </p>
                        </div>
                    </div>

                    {/* Result Phase */}
                    <AnimatePresence>
                        {phase === 'result' && (
                            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-2 sm:p-4 font-mono select-none" onClick={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="bg-slate-900 border-4 border-white w-full max-w-[95%] sm:max-w-md md:max-w-lg shadow-[8px_8px_0px_#000] max-h-[90vh] flex flex-col"
                                >
                                    <div className="p-1.5 sm:p-2 flex-1 flex flex-col min-h-0">
                                        <div className="border-2 border-white/20 flex flex-col flex-1 min-h-0 relative bg-black/10">
                                            <div className="overflow-y-auto custom-scrollbar p-3 sm:p-6 text-center">
                                                {/* Result Title */}
                                                <h2 className={`text-2xl sm:text-3xl md:text-4xl font-bold uppercase mb-2 ${isDraw ? 'text-slate-400' : isWin ? 'text-emerald-400' : 'text-red-500'}`}>
                                                    {isDraw ? 'HÒA!' : isWin ? 'CHIẾN THẮNG!' : 'THẤT BẠI...'}
                                                </h2>

                                                {/* Opponent Info */}
                                                <p className="text-slate-400 text-xs sm:text-sm mb-4">
                                                    VS: <span className="text-white font-bold">{opponentName}</span>
                                                </p>

                                                {/* MMR Change (if ranked) */}
                                                {challenger.mmrChange !== undefined && (
                                                    <div className="mb-4 bg-slate-800/50 p-2 border border-white/10">
                                                        <p className={`text-xl font-bold ${challenger.mmrChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                            {challenger.mmrChange >= 0 ? '+' : ''}{challenger.mmrChange} MMR
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Tab Switcher */}
                                                <div className="flex border-b-2 border-slate-700 mb-4">
                                                    <button
                                                        onClick={() => setViewStatsMode('challenger')}
                                                        className={`flex-1 py-2 text-xs sm:text-sm font-bold uppercase transition-colors ${viewStatsMode === 'challenger'
                                                            ? 'bg-emerald-900/50 text-emerald-400 border-b-2 border-emerald-400'
                                                            : 'text-slate-500 hover:text-slate-300'
                                                            }`}
                                                    >
                                                        {challengerName}
                                                    </button>
                                                    <button
                                                        onClick={() => setViewStatsMode('opponent')}
                                                        className={`flex-1 py-2 text-xs sm:text-sm font-bold uppercase transition-colors ${viewStatsMode === 'opponent'
                                                            ? 'bg-red-900/50 text-red-400 border-b-2 border-red-400'
                                                            : 'text-slate-500 hover:text-slate-300'
                                                            }`}
                                                    >
                                                        {opponentName}
                                                    </button>
                                                </div>

                                                {/* Damage Summary */}
                                                <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 text-xs border-y border-white/10 py-3 bg-black/20">
                                                    <div className="text-center p-1">
                                                        <p className="text-slate-500 mb-1 uppercase text-[10px] sm:text-xs">Gây ra</p>
                                                        <p className="text-amber-400 font-bold text-sm sm:text-lg">{formatNumber(currentStats.damageDealt)}</p>
                                                    </div>
                                                    <div className="text-center p-1">
                                                        <p className="text-slate-500 mb-1 uppercase text-[10px] sm:text-xs">Nhận vào</p>
                                                        <p className="text-red-400 font-bold text-sm sm:text-lg">{formatNumber(currentStats.damageTaken)}</p>
                                                    </div>
                                                    <div className="text-center p-1">
                                                        <p className="text-slate-500 mb-1 uppercase text-[10px] sm:text-xs">Hồi phục</p>
                                                        <p className="text-emerald-400 font-bold text-sm sm:text-lg">{formatNumber(currentStats.healing)}</p>
                                                    </div>
                                                    <div className="text-center p-1">
                                                        <p className="text-slate-500 mb-1 uppercase text-[10px] sm:text-xs">Né / Bạo</p>
                                                        <p className="text-blue-400 font-bold text-sm sm:text-lg">
                                                            {currentStats.dodgeCount} <span className="text-slate-500">/</span> <span className="text-yellow-400">{currentStats.critCount}</span>
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Detailed Skill Stats - Simplified for Pixel UI */}
                                                <div className="mb-4 bg-black p-3 border-2 border-slate-700 text-left">
                                                    <p className="text-white mb-2 underline decoration-dashed text-[10px] sm:text-xs uppercase text-center">Chi tiết kỹ năng</p>
                                                    <div className="space-y-1.5 max-h-[140px] sm:max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                                                        {Object.entries(currentStats.skills)
                                                            .sort((a, b) => b[1].damage - a[1].damage)
                                                            .map(([name, data]) => (
                                                                <div key={name} className="flex flex-col text-xs sm:text-sm border-b border-white/5 pb-1 mb-1 last:border-0 last:mb-0">
                                                                    <div className="flex justify-between items-center">
                                                                        <div className="flex-1 truncate pr-2">
                                                                            <span className={name === 'Đánh thường' ? 'text-slate-400' : 'text-purple-300'}>{name}</span>
                                                                            <span className="text-slate-600 ml-1">x{data.count}</span>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <span className="text-amber-500 font-mono">{formatNumber(data.damage)}</span>
                                                                        </div>
                                                                    </div>
                                                                    {/* Additional Stats: Heal */}
                                                                    {(data.heal > 0) && (
                                                                        <div className="flex justify-between items-center text-[10px] text-slate-500 mt-0.5 pl-2">
                                                                            <span>Hồi phục:</span>
                                                                            <span className="text-emerald-400 font-mono">+{formatNumber(data.heal)}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        {Object.keys(currentStats.skills).length === 0 && (
                                                            <p className="text-slate-500 text-center italic text-xs py-2">Chưa sử dụng kỹ năng nào</p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Rewards (Only show if we won or it's draw - showing MY rewards usually, or just general rewards? Log says winnerExp etc. The original logic showed based on isWin. Let's keep it simple: Show rewards if "I" (challenger) got any, or if "opponent" got any depending on view? No, rewards are for the PLAYER. Keep original logic.) */}
                                                {rewards && (
                                                    <div className="bg-black p-4 border-2 border-slate-700 mb-4 text-left">
                                                        <p className="text-white mb-2 underline decoration-dashed text-[10px] sm:text-xs">NHẬN ĐƯỢC:</p>
                                                        <div className="flex justify-between text-emerald-400 text-xs sm:text-sm mb-1">
                                                            <span>TU VI:</span>
                                                            <span>+{formatNumber(isWin ? rewards.winnerExp : rewards.loserExp)}</span>
                                                        </div>
                                                        <div className="flex justify-between text-yellow-400 text-xs sm:text-sm">
                                                            <span>LINH THẠCH:</span>
                                                            <span>+{formatNumber(isWin ? rewards.winnerSpiritStones : rewards.loserSpiritStones)}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Close Button */}
                                                <button
                                                    onClick={onComplete}
                                                    className="w-full bg-white text-black font-bold py-3 sm:py-4 hover:bg-slate-200 active:translate-y-1 transition-transform uppercase text-sm sm:text-base border-2 border-transparent hover:border-slate-400"
                                                >
                                                    TIẾP TỤC ▶
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>,
        document.body
    );
});

export default BattleScene;
