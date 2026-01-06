/**
 * Arena Tab - Ranked Arena Component
 * Võ Đài Xếp Hạng
 * 
 * Features:
 * - Rank display with tier logo, MMR, progress
 * - Auto matchmaking with bot fallback
 * - Match history
 * - Leaderboard
 * - Season info and rewards
 */
import { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../../api';
import { useCultivation } from '../../../hooks/useCultivation.jsx';
import FlyingReward from './FlyingReward.jsx';

// ==================== CONSTANTS ====================

const RANK_TIERS = [
    { tier: 1, name: 'Phàm Giả', minMmr: 0, color: '#9CA3AF', logo: '/assets/rank_area/phamgia.png', title: '/assets/rank_title/phamgia.jpg' },
    { tier: 2, name: 'Tu Sĩ', minMmr: 800, color: '#10B981', logo: '/assets/rank_area/tusi.png', title: '/assets/rank_title/tusi.jpg' },
    { tier: 3, name: 'Tinh Anh', minMmr: 1200, color: '#3B82F6', logo: '/assets/rank_area/tinhanh.png', title: '/assets/rank_title/tinhanh.jpg' },
    { tier: 4, name: 'Thiên Kiêu', minMmr: 1600, color: '#8B5CF6', logo: '/assets/rank_area/thienkieu.png', title: '/assets/rank_title/thienkieu.jpg' },
    { tier: 5, name: 'Vương Giả', minMmr: 2000, color: '#F59E0B', logo: '/assets/rank_area/vuonggia.png', title: '/assets/rank_title/vuonggia.jpg' },
    { tier: 6, name: 'Bá Chủ', minMmr: 2400, color: '#EF4444', logo: '/assets/rank_area/bachu.png', title: '/assets/rank_title/bachu.jpg' },
    { tier: 7, name: 'Chí Tôn', minMmr: 2800, color: '#EC4899', logo: '/assets/rank_area/chiton.png', title: '/assets/rank_title/chiton.jpg' },
    { tier: 8, name: 'Tiên Tôn', minMmr: 3200, color: '#FFD700', logo: '/assets/rank_area/tienton.png', title: '/assets/rank_title/tienton.jpg', faction: 'tien' },
    { tier: 8, name: 'Ma Tôn', minMmr: 3200, color: '#7C3AED', logo: '/assets/rank_area/maton.png', title: '/assets/rank_title/maton.jpg', faction: 'ma' },
    { tier: 9, name: 'Truyền Thuyết', minMmr: 4000, color: '#FF00FF', logo: '/assets/rank_area/truyenthuyet.png', title: '/assets/rank_title/truyenthuyet.jpg' }
];

// ==================== SUB COMPONENTS ====================

/**
 * Rank Badge Display
 */
const RankBadge = memo(function RankBadge({ rankData, showProgress = true, onFindMatch, cooldown, isSearching, disabled }) {
    if (!rankData) return null;

    const tierInfo = RANK_TIERS.find(t => t.name === rankData.tierName) || RANK_TIERS[1];

    // Cooldown handling
    const [countdown, setCountdown] = useState(0);
    useEffect(() => {
        if (cooldown?.inCooldown && cooldown.remainingSeconds > 0) {
            setCountdown(cooldown.remainingSeconds);
            const interval = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [cooldown]);
    const isOnCooldown = countdown > 0;

    return (
        <div className="spirit-tablet rounded-xl p-4 lg:p-6 relative overflow-hidden">
            {/* Decorative Corners */}
            <div className="spirit-corner spirit-corner-tl border-amber-500/40"></div>
            <div className="spirit-corner spirit-corner-tr border-amber-500/40"></div>
            <div className="spirit-corner spirit-corner-bl border-amber-500/40"></div>
            <div className="spirit-corner spirit-corner-br border-amber-500/40"></div>

            {/* Qi Particles */}
            <div className="qi-particle" style={{ top: '10%', left: '10%', animationDelay: '0s' }}></div>
            <div className="qi-particle" style={{ top: '15%', right: '15%', animationDelay: '1s' }}></div>
            <div className="qi-particle" style={{ bottom: '20%', left: '20%', animationDelay: '2s' }}></div>
            <div className="qi-particle" style={{ bottom: '15%', right: '10%', animationDelay: '1.5s' }}></div>

            {/* Floating Chinese Characters */}
            <span className="floating-char" style={{ left: '5%', top: '25%', animationDelay: '0s' }}>武</span>
            <span className="floating-char" style={{ right: '8%', top: '30%', animationDelay: '1s' }}>鬥</span>
            <span className="floating-char" style={{ left: '10%', bottom: '30%', animationDelay: '2s' }}>戰</span>
            <span className="floating-char" style={{ right: '12%', bottom: '25%', animationDelay: '1.5s' }}>勝</span>

            {/* Rank Logo & Info */}
            <div className="flex flex-col items-center relative">
                {/* Rank Name & MMR - Above logo */}
                <div className="text-center mb-4">
                    <h2
                        className="text-3xl sm:text-4xl lg:text-5xl font-title tracking-widest mb-3 realm-name-glow uppercase"
                        style={{ color: tierInfo.color }}
                    >
                        {rankData.tierName}
                    </h2>

                    {/* Decorative Line */}
                    <div className="h-[1px] w-32 sm:w-40 md:w-48 mx-auto bg-gradient-to-r from-transparent via-amber-500/50 to-transparent relative mb-3">
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                    </div>

                    {/* MMR Points */}
                    <p className="text-slate-400 text-sm uppercase tracking-widest">
                        {rankData.mmr} <span className="text-gold font-bold">MMR</span>
                    </p>
                </div>

                {/* Rank Logo - Below name */}
                <div className="relative w-48 h-48 lg:w-56 lg:h-56">
                    {/* Animated Ring */}
                    <div className="absolute inset-0 border-2 border-amber-500/30 rounded-full animate-spin" style={{ animationDuration: '15s' }}></div>
                    <div className="absolute inset-2 border border-amber-500/20 rounded-full animate-spin" style={{ animationDuration: '20s', animationDirection: 'reverse' }}></div>

                    <img
                        src={tierInfo.logo}
                        alt={rankData.tierName}
                        className="w-full h-full object-contain drop-shadow-lg relative z-10"
                        style={{
                            filter: `drop-shadow(0 0 15px ${tierInfo.color}80)`,
                            mixBlendMode: 'lighten'
                        }}
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/assets/default-rank.png';
                        }}
                    />
                </div>

                {/* Placement Info */}
                {!rankData.isPlaced && (
                    <div className="text-center text-sm text-amber-300/70">
                        <span className="font-semibold">Trận xếp hạng: </span>
                        {rankData.placementMatches}/10
                        <span className="ml-2">({rankData.placementWins} thắng)</span>
                    </div>
                )}

                {/* Progress to Next Tier */}
                {showProgress && rankData.nextTier && (
                    <div className="w-full max-w-xs">
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                            <span>{rankData.tierName}</span>
                            <span>{rankData.nextTier.name}</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full rounded-full"
                                style={{
                                    background: `linear-gradient(to right, ${tierInfo.color}, ${RANK_TIERS.find(t => t.name === rankData.nextTier.name)?.color || '#F59E0B'})`
                                }}
                                initial={{ width: 0 }}
                                animate={{ width: `${rankData.progress}%` }}
                                transition={{ duration: 0.5 }}
                            />
                        </div>
                        <p className="text-xs text-center text-slate-400 mt-1">
                            Còn {rankData.nextTier.mmrNeeded} MMR nữa
                        </p>
                    </div>
                )}

                {/* Find Match Button - Inside card */}
                {onFindMatch && (
                    <button
                        onClick={onFindMatch}
                        disabled={disabled || isOnCooldown || isSearching}
                        className={`
                            w-full max-w-xs py-2.5 px-4 rounded-lg font-semibold text-sm transition-all mt-2
                            ${isOnCooldown || disabled
                                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                : isSearching
                                    ? 'bg-amber-600 text-amber-100 animate-pulse'
                                    : 'bg-gradient-to-r from-amber-600 to-amber-800 text-amber-100 border border-amber-500/30 shadow-lg shadow-amber-900/30 hover:from-amber-500 hover:to-amber-700 hover:scale-105'
                            }
                        `}
                    >
                        {isOnCooldown ? (
                            <span>Chờ {countdown}s</span>
                        ) : isSearching ? (
                            <span>Đang tìm...</span>
                        ) : (
                            <span>TÌM TRẬN ĐẤU</span>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
});

/**
 * Stats Display
 */
const StatsDisplay = memo(function StatsDisplay({ rankData }) {
    if (!rankData) return null;

    const winRate = rankData.seasonWins + rankData.seasonLosses > 0
        ? ((rankData.seasonWins / (rankData.seasonWins + rankData.seasonLosses)) * 100).toFixed(1)
        : 0;

    return (
        <div className="spirit-tablet rounded-xl p-4">
            <h3 className="text-lg font-bold text-gold mb-3">Thống Kê Mùa</h3>

            {/* Win/Loss/Draw */}
            <div className="grid grid-cols-3 gap-2 text-center mb-3">
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2">
                    <p className="text-2xl font-bold text-green-400">{rankData.seasonWins}</p>
                    <p className="text-xs text-slate-400">Thắng</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2">
                    <p className="text-2xl font-bold text-red-400">{rankData.seasonLosses}</p>
                    <p className="text-xs text-slate-400">Thua</p>
                </div>
                <div className="bg-slate-500/10 border border-slate-500/30 rounded-lg p-2">
                    <p className="text-2xl font-bold text-slate-400">{rankData.seasonDraws}</p>
                    <p className="text-xs text-slate-400">Hòa</p>
                </div>
            </div>

            {/* Win Rate & Streaks */}
            <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-slate-400">Tỉ lệ thắng</span>
                    <span className="text-amber-300 font-semibold">{winRate}%</span>
                </div>
                {rankData.winStreak > 0 && (
                    <div className="flex justify-between text-green-400">
                        <span>Chuỗi thắng</span>
                        <span className="font-bold">{rankData.winStreak} trận</span>
                    </div>
                )}
                {rankData.lossStreak > 2 && (
                    <div className="flex justify-between text-red-400">
                        <span>Chuỗi thua</span>
                        <span className="font-bold">{rankData.lossStreak} trận (Bảo vệ MMR)</span>
                    </div>
                )}
                <div className="flex justify-between">
                    <span className="text-slate-400">Kỷ lục thắng liên tiếp</span>
                    <span className="text-amber-300">{rankData.bestWinStreak}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-400">MMR cao nhất</span>
                    <span className="text-amber-300">{rankData.highestMmr}</span>
                </div>
            </div>
        </div>
    );
});

/**
 * Matchmaking Button
 */
const MatchmakingButton = memo(function MatchmakingButton({
    onFindMatch,
    cooldown,
    isSearching,
    disabled
}) {
    const [countdown, setCountdown] = useState(0);

    useEffect(() => {
        if (cooldown?.inCooldown && cooldown.remainingSeconds > 0) {
            setCountdown(cooldown.remainingSeconds);
            const interval = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [cooldown]);

    const isOnCooldown = countdown > 0;

    return (
        <button
            onClick={onFindMatch}
            disabled={disabled || isOnCooldown || isSearching}
            className={`
        w-full py-4 rounded-xl font-bold text-lg transition-all
        ${isOnCooldown || disabled
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : isSearching
                        ? 'bg-amber-600 text-amber-100 animate-pulse'
                        : 'bg-gradient-to-r from-amber-600 to-amber-800 text-amber-100 border border-amber-500/30 shadow-lg shadow-amber-900/30 hover:from-amber-500 hover:to-amber-700 hover:scale-105'
                }
      `}
        >
            {isOnCooldown ? (
                <span>Chờ {countdown}s</span>
            ) : isSearching ? (
                <span>Đang tìm đối thủ...</span>
            ) : (
                <span>TÌM TRẬN ĐẤU</span>
            )}
        </button>
    );
});

/**
 * Match History Item
 */
const MatchHistoryItem = memo(function MatchHistoryItem({ match }) {
    const isWin = match.result === 'win';
    const isDraw = match.result === 'draw';

    const resultColor = isWin ? 'text-green-400' : isDraw ? 'text-slate-400' : 'text-red-400';
    const resultBg = isWin ? 'bg-green-500/10' : isDraw ? 'bg-slate-500/10' : 'bg-red-500/10';
    const resultBorder = isWin ? 'border-green-500/30' : isDraw ? 'border-slate-500/30' : 'border-red-500/30';

    return (
        <div className={`${resultBg} border ${resultBorder} rounded-lg p-3 flex items-center justify-between`}>
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden border border-amber-500/30">
                    {match.opponent.avatar ? (
                        <img
                            src={match.opponent.avatar}
                            alt={match.opponent.username}
                            className="w-full h-full object-cover"
                        />
                    ) : match.opponent.isBot ? (
                        <img
                            src="/assets/tienthan.jpg"
                            alt={match.opponent.username}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-amber-300 font-bold">
                            {match.opponent.username?.[0]?.toUpperCase() || '?'}
                        </div>
                    )}
                </div>
                <div>
                    <p className="font-semibold text-slate-200">
                        {match.opponent.username}
                    </p>
                    <p className="text-xs text-slate-400">
                        {new Date(match.createdAt).toLocaleDateString('vi-VN')}
                    </p>
                </div>
            </div>

            <div className="text-right">
                <p className={`font-bold ${resultColor}`}>
                    {isWin ? 'THẮNG' : isDraw ? 'HÒA' : 'THUA'}
                </p>
                <p className={`text-sm ${match.mmrChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {match.mmrChange >= 0 ? '+' : ''}{match.mmrChange} MMR
                </p>
            </div>
        </div>
    );
});

/**
 * Leaderboard Item
 */
const LeaderboardItem = memo(function LeaderboardItem({ player, currentUserId, index }) {
    const isCurrentUser = player.userId?.toString() === currentUserId?.toString();
    const tierInfo = RANK_TIERS.find(t => t.name === player.tierName) || RANK_TIERS[1];

    // Top 3 special styling
    const rankBg = index === 0 ? 'bg-yellow-500/20 border-yellow-500/50'
        : index === 1 ? 'bg-slate-400/20 border-slate-400/50'
            : index === 2 ? 'bg-amber-700/20 border-amber-700/50'
                : 'bg-slate-800/50 border-slate-700/30';

    return (
        <div className={`${rankBg} ${isCurrentUser ? 'ring-2 ring-amber-500' : ''} border rounded-lg p-3 flex items-center gap-3`}>
            <div className="w-8 text-center font-bold text-lg" style={{ color: tierInfo.color }}>
                {player.rank}
            </div>

            <div className="w-10 h-10 rounded-full overflow-hidden border-2" style={{ borderColor: tierInfo.color }}>
                {player.avatar ? (
                    <img src={player.avatar} alt={player.username} className="w-full h-full object-cover" />
                ) : (
                    <div
                        className="w-full h-full flex items-center justify-center font-bold"
                        style={{ backgroundColor: `${tierInfo.color}30`, color: tierInfo.color }}
                    >
                        {player.username?.[0]?.toUpperCase() || '?'}
                    </div>
                )}
            </div>

            <div className="flex-1">
                <p className={`font-semibold ${isCurrentUser ? 'text-amber-300' : 'text-slate-200'}`}>
                    {player.username}
                    {isCurrentUser && <span className="ml-1 text-xs">(Bạn)</span>}
                </p>
                <p className="text-xs" style={{ color: tierInfo.color }}>{player.tierName}</p>
            </div>

            <div className="text-right">
                <p className="font-bold text-amber-300">{player.mmr}</p>
                <p className="text-xs text-slate-400">{player.winRate}% thắng</p>
            </div>
        </div>
    );
});

/**
 * Season Info Panel
 */
const SeasonPanel = memo(function SeasonPanel({ seasonData, onClaimRewards }) {
    if (!seasonData) return null;

    return (
        <div className="spirit-tablet rounded-xl p-4">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="text-lg font-bold text-gold">{seasonData.season.name}</h3>
                    <p className="text-sm text-slate-400">
                        Còn {seasonData.season.daysRemaining} ngày
                    </p>
                </div>
                {seasonData.rewards.hasClaimed ? (
                    <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded">
                        Đã nhận thưởng
                    </span>
                ) : seasonData.season.daysRemaining === 0 && (
                    <button
                        onClick={onClaimRewards}
                        className="text-xs bg-amber-600 hover:bg-amber-500 text-white px-3 py-1 rounded-lg"
                    >
                        Nhận Thưởng
                    </button>
                )}
            </div>

            {/* Current tier rewards preview */}
            {seasonData.rewards.potential && (
                <div className="bg-slate-800/50 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-2">Phần thưởng dự kiến (Tier {seasonData.rewards.currentTier})</p>
                    <div className="flex gap-4 text-sm">
                        <span className="text-cyan-400">{seasonData.rewards.potential.spiritStones} Linh Thạch</span>
                        <span className="text-amber-400">{seasonData.rewards.potential.exp} Tu Vi</span>
                        {seasonData.rewards.potential.title && (
                            <span className="text-purple-400">{seasonData.rewards.potential.title}</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
});

/**
 * Bot Offer Modal
 */
const BotOfferModal = memo(function BotOfferModal({ bot, onAccept, onDecline }) {
    if (!bot) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={onDecline}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="spirit-tablet rounded-xl p-6 max-w-sm w-full"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="text-xl font-bold text-gold text-center mb-4">
                    Không tìm thấy đối thủ
                </h3>

                <div className="text-center mb-4">
                    <p className="text-slate-300 mb-2">Đấu với Tiên Ma?</p>
                    <p className="text-lg font-semibold text-purple-400">{bot.name}</p>
                    <p className="text-sm text-slate-400">
                        Tier: {bot.tierName} • MMR: ±{Math.round(bot.mmrChangeRate * 100)}%
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onDecline}
                        className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                        Tìm Tiếp
                    </button>
                    <button
                        onClick={onAccept}
                        className="flex-1 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-800 text-white hover:from-purple-500 hover:to-purple-700"
                    >
                        Đồng Ý
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
});

/**
 * Battle Result Modal - Shows after battle with animation
 */
const BattleResultModal = memo(function BattleResultModal({ result, onClose }) {
    if (!result) return null;

    const isWin = result.result === 'win';
    const isDraw = result.result === 'draw';
    const mmrChange = result.mmrChange || 0;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4"
            onClick={onClose}
        >
            {/* Screen Flash */}
            <motion.div
                className={`absolute inset-0 pointer-events-none ${isWin ? 'bg-amber-500/30' : isDraw ? 'bg-slate-500/20' : 'bg-red-500/30'}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.5 }}
            />

            {/* Victory/Defeat Particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {Array.from({ length: 20 }).map((_, i) => (
                    <motion.div
                        key={i}
                        className={`absolute w-2 h-2 rounded-full ${isWin ? 'bg-amber-400' : isDraw ? 'bg-slate-400' : 'bg-red-400'}`}
                        style={{
                            left: `${50 + (Math.random() - 0.5) * 60}%`,
                            top: '50%'
                        }}
                        initial={{ opacity: 0, y: 0, scale: 0 }}
                        animate={{
                            opacity: [0, 1, 0],
                            y: [0, -200 - Math.random() * 100],
                            x: [(Math.random() - 0.5) * 200],
                            scale: [0, 1 + Math.random(), 0]
                        }}
                        transition={{
                            duration: 1.5,
                            delay: i * 0.05,
                            ease: "easeOut"
                        }}
                    />
                ))}
            </div>

            <motion.div
                initial={{ scale: 0.5, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: "spring", bounce: 0.4 }}
                className="relative bg-gradient-to-b from-slate-900 to-slate-800 border-2 rounded-xl p-8 max-w-md w-full text-center shadow-2xl"
                style={{
                    borderColor: isWin ? '#F59E0B' : isDraw ? '#64748B' : '#EF4444',
                    boxShadow: `0 0 60px ${isWin ? 'rgba(245,158,11,0.4)' : isDraw ? 'rgba(100,116,139,0.3)' : 'rgba(239,68,68,0.4)'}`
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Result Title */}
                <motion.h2
                    className={`text-4xl lg:text-5xl font-bold font-title mb-4 ${isWin ? 'text-amber-400' : isDraw ? 'text-slate-400' : 'text-red-400'}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.2, 1] }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    style={{
                        textShadow: isWin
                            ? '0 0 30px rgba(245,158,11,0.8)'
                            : isDraw
                                ? '0 0 20px rgba(100,116,139,0.6)'
                                : '0 0 30px rgba(239,68,68,0.8)'
                    }}
                >
                    {isWin ? 'CHIẾN THẮNG!' : isDraw ? 'HÒA!' : 'THẤT BẠI!'}
                </motion.h2>

                {/* Opponent Info */}
                {result.opponent && (
                    <motion.div
                        className="mb-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <p className="text-slate-400 text-sm">Đối thủ</p>
                        <p className="text-lg text-slate-200 font-semibold">
                            {result.opponent.username}
                            {result.isBot && <span className="ml-2 text-xs text-purple-400">(Tiên Ma)</span>}
                        </p>
                    </motion.div>
                )}

                {/* MMR Change */}
                <motion.div
                    className={`text-3xl lg:text-4xl font-bold font-mono mb-6 ${mmrChange >= 0 ? 'text-green-400' : 'text-red-400'}`}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6, type: "spring" }}
                >
                    {mmrChange >= 0 ? '+' : ''}{mmrChange} MMR
                </motion.div>

                {/* Battle Stats */}
                {result.battleStats && (
                    <motion.div
                        className="grid grid-cols-2 gap-3 mb-6 text-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                    >
                        <div className="bg-slate-800/50 rounded-lg p-2">
                            <p className="text-slate-400">Sát thương gây ra</p>
                            <p className="text-amber-300 font-bold">{result.battleStats.damageDealt?.toLocaleString() || 0}</p>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-2">
                            <p className="text-slate-400">Sát thương nhận</p>
                            <p className="text-red-300 font-bold">{result.battleStats.damageTaken?.toLocaleString() || 0}</p>
                        </div>
                    </motion.div>
                )}

                {/* Close Button */}
                <motion.button
                    onClick={onClose}
                    className={`px-8 py-3 rounded-xl font-bold text-lg transition-all ${isWin
                        ? 'bg-gradient-to-r from-amber-600 to-amber-800 text-amber-100 hover:from-amber-500 hover:to-amber-700'
                        : 'bg-gradient-to-r from-slate-600 to-slate-800 text-slate-100 hover:from-slate-500 hover:to-slate-700'
                        }`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Tiếp Tục
                </motion.button>
            </motion.div>
        </motion.div>
    );
});

// ==================== MAIN COMPONENT ====================

const ArenaTab = memo(function ArenaTab({ onSwitchTab }) {
    const { cultivation, refresh } = useCultivation();
    const [activeView, setActiveView] = useState('rank'); // 'rank', 'history', 'leaderboard'
    const [loading, setLoading] = useState(true);
    const [rankData, setRankData] = useState(null);
    const [seasonData, setSeasonData] = useState(null);
    const [matchHistory, setMatchHistory] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [userRank, setUserRank] = useState(null);

    // Matchmaking states
    const [isSearching, setIsSearching] = useState(false);
    const [searchTimer, setSearchTimer] = useState(0);
    const [botOffer, setBotOffer] = useState(null);
    const [battleResult, setBattleResult] = useState(null);
    const [rewardsAnimation, setRewardsAnimation] = useState([]); // Animation state

    // ==================== API CALLS ====================

    const fetchRankData = useCallback(async () => {
        try {
            const response = await api('/api/arena/me');
            if (response?.success) {
                setRankData(response.data);
            }
        } catch (error) {
            // Silent error handling
        }
    }, []);

    const fetchSeasonData = useCallback(async () => {
        try {
            const response = await api('/api/arena/season');
            if (response?.success) {
                setSeasonData(response.data);
            }
        } catch (error) {
            // Silent error handling
        }
    }, []);

    const fetchMatchHistory = useCallback(async () => {
        try {
            const response = await api('/api/arena/history');
            if (response?.success) {
                setMatchHistory(response.data?.matches || []);
            }
        } catch (error) {
            // Silent error handling
        }
    }, []);

    const fetchLeaderboard = useCallback(async () => {
        try {
            const response = await api('/api/arena/leaderboard');
            if (response?.success) {
                setLeaderboard(response.data?.leaderboard || []);
                setUserRank(response.data?.userRank);
            }
        } catch (error) {
            // Silent error handling
        }
    }, []);

    // Initial load
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([
                fetchRankData(),
                fetchSeasonData()
            ]);
            setLoading(false);
        };
        loadData();
    }, [fetchRankData, fetchSeasonData]);

    // Load view-specific data
    useEffect(() => {
        if (activeView === 'history') {
            fetchMatchHistory();
        } else if (activeView === 'leaderboard') {
            fetchLeaderboard();
        }
    }, [activeView, fetchMatchHistory, fetchLeaderboard]);

    // ==================== MATCHMAKING ====================

    const handleFindMatch = useCallback(async () => {
        if (isSearching) return;

        setIsSearching(true);
        setSearchTimer(0);

        try {
            const response = await api('/api/arena/find-match', { method: 'POST' });

            if (response?.success) {
                if (response.found) {
                    // Found real opponent - challenge them
                    const opponent = response.data;
                    const challengeResponse = await api('/api/arena/challenge', {
                        method: 'POST',
                        body: { opponentId: opponent.opponentId }
                    });

                    if (challengeResponse?.success) {
                        // Switch to PK tab to show battle animation
                        if (onSwitchTab) {
                            // Store battle data for PKTab to pick up
                            sessionStorage.setItem('rankedBattle', JSON.stringify({
                                battleData: challengeResponse.data,
                                isRanked: true,
                                opponentId: opponent.opponentId
                            }));
                            onSwitchTab('pk');
                        }
                        // Refresh data after match
                        await fetchRankData();
                        await fetchMatchHistory();
                        // Refresh cultivation data để cập nhật độ bền trang bị
                        if (refresh) refresh();
                    }
                } else if (response.suggestBot) {
                    // No opponent found - offer bot
                    setBotOffer(response.data);
                }
            }
        } catch (error) {
            // Silent error handling
            if (error.response?.status === 429) {
                // Cooldown - update rank data to get new cooldown
                await fetchRankData();
            }
        } finally {
            setIsSearching(false);
        }
    }, [isSearching, fetchRankData, fetchMatchHistory]);

    const handleAcceptBot = useCallback(async () => {
        if (!botOffer) return;

        try {
            const response = await api('/api/arena/challenge-bot', {
                method: 'POST',
                body: { botId: botOffer.botId }
            });

            if (response?.success) {
                // Switch to PK tab to show battle animation
                if (onSwitchTab) {
                    sessionStorage.setItem('rankedBattle', JSON.stringify({
                        battleData: response.data,
                        isRanked: true,
                        isBot: true,
                        botName: botOffer.name
                    }));
                    onSwitchTab('pk');
                }
                await fetchRankData();
                await fetchMatchHistory();
                // Refresh cultivation data để cập nhật độ bền trang bị
                if (refresh) refresh();
            }
        } catch (error) {
            // Silent error handling
        } finally {
            setBotOffer(null);
        }
    }, [botOffer, fetchRankData, fetchMatchHistory]);

    const handleDeclineBot = useCallback(() => {
        setBotOffer(null);
    }, []);

    const handleClaimRewards = useCallback(async () => {
        try {
            const response = await api('/api/arena/claim-rewards', { method: 'POST' });
            if (response?.success) {
                // Trigger FlyingReward animation
                const animRewards = [];
                if (response.data.exp > 0) animRewards.push({ type: 'exp', amount: response.data.exp });
                if (response.data.spiritStones > 0) animRewards.push({ type: 'stone', amount: response.data.spiritStones });

                if (animRewards.length > 0) {
                    setRewardsAnimation(prev => [...prev, {
                        id: Date.now(),
                        startPos: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
                        rewards: animRewards
                    }]);
                }

                await fetchSeasonData();
                await fetchRankData();
                // alert(`Nhận thưởng thành công! +${response.data.spiritStones} Linh Thạch, +${response.data.exp} EXP`);
            }
        } catch (error) {
            alert(error.message || 'Không thể nhận thưởng');
        }
    }, [fetchSeasonData, fetchRankData]);

    // ==================== RENDER ====================

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-48 bg-slate-800/50 rounded-xl"></div>
                <div className="h-32 bg-slate-800/50 rounded-xl"></div>
                <div className="h-14 bg-slate-800/50 rounded-xl"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-4">
            {/* Header */}
            <div className="text-center">
                <h2 className="text-2xl lg:text-3xl font-bold text-gold font-title">VÕ ĐÀI XẾP HẠNG</h2>
                {seasonData?.season && (
                    <p className="text-sm text-slate-400 mt-1">
                        {seasonData.season.name} • Còn {seasonData.season.daysRemaining} ngày
                    </p>
                )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-cultivation">
                {[
                    { id: 'rank', label: 'Xếp Hạng' },
                    { id: 'history', label: 'Lịch Sử' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveView(tab.id)}
                        className={`
              px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap
              ${activeView === tab.id
                                ? 'bg-amber-600 text-amber-100 shadow-lg shadow-amber-900/50 border border-amber-400/50'
                                : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
                            }
            `}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
                {activeView === 'rank' && (
                    <motion.div
                        key="rank"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4"
                    >
                        {/* Rank Badge with integrated Find Match button */}
                        <RankBadge
                            rankData={rankData}
                            onFindMatch={handleFindMatch}
                            cooldown={rankData?.cooldown}
                            isSearching={isSearching}
                            disabled={!cultivation}
                        />

                        {/* Stats */}
                        {rankData?.isPlaced && <StatsDisplay rankData={rankData} />}

                        {/* Season Panel */}
                        <SeasonPanel
                            seasonData={seasonData}
                            onClaimRewards={handleClaimRewards}
                        />
                    </motion.div>
                )}

                {activeView === 'history' && (
                    <motion.div
                        key="history"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-2"
                    >
                        {matchHistory.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                Chưa có trận đấu nào
                            </div>
                        ) : (
                            matchHistory.slice(0, 20).map(match => (
                                <MatchHistoryItem key={match._id} match={match} />
                            ))
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bot Offer Modal */}
            <AnimatePresence>
                {botOffer && (
                    <BotOfferModal
                        bot={botOffer}
                        onAccept={handleAcceptBot}
                        onDecline={handleDeclineBot}
                    />
                )}
            </AnimatePresence>

            {/* Battle Result Modal */}
            <AnimatePresence>
                {battleResult && (
                    <BattleResultModal
                        result={battleResult}
                        onClose={() => setBattleResult(null)}
                    />
                )}
            </AnimatePresence>

            {/* Rewards Animation */}
            {rewardsAnimation.map(anim => (
                <FlyingReward
                    key={anim.id}
                    startPos={anim.startPos}
                    rewards={anim.rewards}
                    onComplete={() => setRewardsAnimation(prev => prev.filter(p => p.id !== anim.id))}
                />
            ))}
        </div>
    );
});

export default ArenaTab;
