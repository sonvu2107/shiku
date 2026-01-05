/**
 * Thiên Hạ Ký - World Events Chronicle
 * Hiển thị các sự kiện đáng nhớ trong thiên hạ
 */
import { useState, useEffect, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Clock } from 'lucide-react';
import { useCultivation } from '../../../hooks/useCultivation';
import { api } from '../../../api';
import LoadingSkeleton from './LoadingSkeleton.jsx';

const ThienHaKy = memo(function ThienHaKy() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadEvents = useCallback(async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const response = await api('/api/cultivation/world-events?limit=20');
            if (response.success) {
                setEvents(response.data || []);
            }
        } catch (err) {
            console.error('Load world events error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadEvents();

        // Auto refresh mỗi 60s
        const interval = setInterval(() => loadEvents(true), 60000);
        return () => clearInterval(interval);
    }, [loadEvents]);

    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Vừa xong';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
        return date.toLocaleDateString('vi-VN');
    };

    if (loading) {
        return <LoadingSkeleton />;
    }

    return (
        <div className="space-y-3 pb-2">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gold font-title tracking-wide text-xl lg:text-2xl pl-2 border-l-4 border-amber-500">
                        THIÊN HẠ KÝ
                    </h3>
                </div>
                <button
                    onClick={() => loadEvents(true)}
                    disabled={refreshing}
                    className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors disabled:opacity-50"
                    title="Làm mới"
                >
                    <RefreshCw className={`w-4 h-4 text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Subtitle */}
            <p className="text-sm text-slate-400 italic">
                Những chuyện xảy ra trong thiên hạ hôm nay...
            </p>

            {/* Events List */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                <AnimatePresence mode="popLayout">
                    {events.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-12"
                        >
                            <p className="text-slate-500">Thiên hạ yên bình, chưa có sự kiện nào...</p>
                            <p className="text-xs text-slate-600 mt-1">Hãy là người tạo nên lịch sử!</p>
                        </motion.div>
                    ) : (
                        events.map((event, idx) => {
                            return (
                                <motion.div
                                    key={event._id || idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.2, delay: idx * 0.03 }}
                                    className="spirit-tablet rounded-lg p-3 hover:bg-slate-800/40 transition-colors"
                                >
                                    {/* Content */}
                                    <div className="w-full">
                                        <p className="text-sm text-slate-200 leading-relaxed">
                                            <span className="font-semibold text-amber-300">{event.username}</span>
                                            {' '}
                                            <span className="text-slate-300">
                                                {event.text?.replace(event.username, '').trim() || 'có sự kiện mới'}
                                            </span>
                                        </p>

                                        {/* Time */}
                                        <div className="flex items-center gap-1 mt-1">
                                            <Clock className="w-3 h-3 text-slate-500" />
                                            <span className="text-xs text-slate-500">{formatTime(event.createdAt)}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>

            {/* Footer info */}
            {events.length > 0 && (
                <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-700/50">
                    <p>Sự kiện tự động cập nhật mỗi phút • Reset vào 00:00</p>
                </div>
            )}
        </div>
    );
});

export default ThienHaKy;
