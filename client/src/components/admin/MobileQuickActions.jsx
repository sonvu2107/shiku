import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Eye,
    MessageCircle,
    FileText,
    Wifi,
    Ban,
    ChevronUp,
    ChevronDown,
    Activity,
    X
} from 'lucide-react';

/**
 * MobileQuickActions - Quick actions panel for mobile admin
 * Shows key stats and quick ban functionality
 */
export default function MobileQuickActions({
    stats,
    onlineCount = 0,
    onBanUser,
    loading = false
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showBanModal, setShowBanModal] = useState(false);
    const [banEmail, setBanEmail] = useState('');
    const [banReason, setBanReason] = useState('');

    const quickStats = [
        {
            icon: Users,
            label: 'Users',
            value: stats?.overview?.totalUsers?.count || 0,
            color: 'text-blue-500',
            bg: 'bg-blue-100 dark:bg-blue-900/30'
        },
        {
            icon: FileText,
            label: 'Posts',
            value: stats?.overview?.totalPosts?.count || 0,
            color: 'text-purple-500',
            bg: 'bg-purple-100 dark:bg-purple-900/30'
        },
        {
            icon: Wifi,
            label: 'Online',
            value: onlineCount,
            color: 'text-green-500',
            bg: 'bg-green-100 dark:bg-green-900/30'
        },
        {
            icon: Eye,
            label: 'Views',
            value: stats?.overview?.totalViews?.count || 0,
            color: 'text-orange-500',
            bg: 'bg-orange-100 dark:bg-orange-900/30'
        }
    ];

    const handleQuickBan = async () => {
        if (!banEmail.trim()) return;

        try {
            await onBanUser?.(banEmail, banReason || 'Vi phạm quy định');
            setShowBanModal(false);
            setBanEmail('');
            setBanReason('');
        } catch (err) {
            console.error('Ban failed:', err);
        }
    };

    return (
        <>
            {/* Mobile Quick Stats Bar - Only visible on mobile */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700 shadow-lg">
                {/* Toggle Button */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400"
                >
                    <Activity size={16} />
                    Quick Stats
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>

                {/* Expandable Content */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            {/* Stats Grid */}
                            <div className="grid grid-cols-4 gap-2 px-3 pb-3">
                                {quickStats.map((stat, i) => (
                                    <div
                                        key={i}
                                        className={`p-2 rounded-xl text-center ${stat.bg}`}
                                    >
                                        <stat.icon size={18} className={`mx-auto ${stat.color}`} />
                                        <div className={`text-lg font-bold ${stat.color}`}>
                                            {typeof stat.value === 'number'
                                                ? stat.value.toLocaleString()
                                                : stat.value}
                                        </div>
                                        <div className="text-xs text-neutral-500">{stat.label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Quick Actions */}
                            <div className="flex gap-2 px-3 pb-3">
                                <button
                                    onClick={() => setShowBanModal(true)}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl font-medium text-sm"
                                >
                                    <Ban size={16} />
                                    Quick Ban
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Collapsed Mini Stats */}
                {!isExpanded && (
                    <div className="flex justify-around pb-2 px-4">
                        {quickStats.slice(0, 4).map((stat, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                                <stat.icon size={14} className={stat.color} />
                                <span className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
                                    {typeof stat.value === 'number' && stat.value > 999
                                        ? (stat.value / 1000).toFixed(1) + 'k'
                                        : stat.value}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Quick Ban Modal */}
            <AnimatePresence>
                {showBanModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="md:hidden fixed inset-0 z-50 bg-black/50 flex items-end"
                        onClick={() => setShowBanModal(false)}
                    >
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25 }}
                            className="w-full bg-white dark:bg-neutral-900 rounded-t-2xl p-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                                    Quick Ban User
                                </h3>
                                <button
                                    onClick={() => setShowBanModal(false)}
                                    className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <input
                                    type="email"
                                    value={banEmail}
                                    onChange={(e) => setBanEmail(e.target.value)}
                                    placeholder="Email người dùng"
                                    className="w-full px-4 py-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl border-none outline-none focus:ring-2 focus:ring-red-500"
                                />
                                <textarea
                                    value={banReason}
                                    onChange={(e) => setBanReason(e.target.value)}
                                    placeholder="Lý do (tùy chọn)"
                                    rows={2}
                                    className="w-full px-4 py-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl border-none outline-none focus:ring-2 focus:ring-red-500 resize-none"
                                />
                                <button
                                    onClick={handleQuickBan}
                                    disabled={!banEmail.trim() || loading}
                                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl disabled:opacity-50 transition-colors"
                                >
                                    {loading ? 'Đang xử lý...' : 'Xác nhận Ban'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
