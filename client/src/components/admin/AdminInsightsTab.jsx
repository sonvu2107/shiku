import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../api";
import { SpotlightCard } from "../ui/DesignSystem";
import { motion } from "framer-motion";
import { cn } from "../../utils/cn";
import {
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    Users,
    FileText,
    MessageCircle,
    Heart,
    RefreshCw
} from "lucide-react";

/**
 * AdminInsightsTab - Tab hiển thị các chỉ số hành vi cốt lõi
 * Giúp theo dõi sức khỏe sản phẩm: activation, engagement, retention
 */
export default function AdminInsightsTab() {
    const [insights, setInsights] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadInsights = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api("/api/admin/stats/insights");
            if (res.success) {
                setInsights(res.insights);
            }
        } catch (e) {
            setError("Không thể tải dữ liệu insights");
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadInsights();
    }, [loadInsights]);

    const getStatusColor = (status) => {
        switch (status) {
            case "healthy":
                return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
            case "warning":
                return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
            case "critical":
                return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
            default:
                return "text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800";
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case "healthy":
                return <CheckCircle2 size={20} className="text-green-600 dark:text-green-400" />;
            case "warning":
                return <AlertTriangle size={20} className="text-yellow-600 dark:text-yellow-400" />;
            case "critical":
                return <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />;
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="py-20 flex justify-center">
                <Loader2 className="animate-spin" size={32} />
            </div>
        );
    }

    if (error) {
        return (
            <SpotlightCard className="p-6 text-center">
                <AlertTriangle className="mx-auto mb-4 text-red-500" size={48} />
                <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                <button
                    onClick={loadInsights}
                    className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg font-bold"
                >
                    Thử lại
                </button>
            </SpotlightCard>
        );
    }

    if (!insights) return null;

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Chỉ số hành vi</h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Theo dõi sức khỏe sản phẩm</p>
                </div>
                <button
                    onClick={loadInsights}
                    disabled={loading}
                    className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            {/* Core Metrics - 3 chỉ số quan trọng nhất */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(insights.core).map(([key, metric]) => (
                    <SpotlightCard
                        key={key}
                        className={cn(
                            "p-5 border-2 transition-all",
                            getStatusColor(metric.status)
                        )}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                                <div className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                                    {metric.label}
                                </div>
                                <div className="text-3xl font-bold">
                                    {metric.value}{typeof metric.value === 'number' && metric.value <= 100 && key !== 'avgCommentsPerPost' ? '%' : ''}
                                </div>
                            </div>
                            {getStatusIcon(metric.status)}
                        </div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">
                            {metric.description}
                        </div>
                        <div className="mt-2 text-xs font-medium">
                            Ngưỡng khỏe mạnh: ≥ {metric.threshold}{typeof metric.threshold === 'number' && metric.threshold <= 100 && key !== 'avgCommentsPerPost' ? '%' : ''}
                        </div>
                    </SpotlightCard>
                ))}
            </div>

            {/* Secondary Metrics */}
            <SpotlightCard className="p-5">
                <h3 className="font-bold text-lg mb-4">Chỉ số phụ</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {Object.entries(insights.secondary).map(([key, metric]) => (
                        <div key={key} className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                            <div className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">
                                {metric.value}{key.includes('Rate') ? '%' : ''}
                            </div>
                            <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                {metric.label}
                            </div>
                            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                {metric.description}
                            </div>
                        </div>
                    ))}
                </div>
            </SpotlightCard>

            {/* 7-Day Comparison */}
            <SpotlightCard className="p-5">
                <h3 className="font-bold text-lg mb-4">So sánh 7 ngày gần nhất</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                        <Users className="mx-auto mb-2 text-blue-500" size={24} />
                        <div className="text-2xl font-bold">{insights.comparison.last7Days.newUsers}</div>
                        <div className="text-xs text-neutral-500">User mới</div>
                    </div>
                    <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                        <FileText className="mx-auto mb-2 text-green-500" size={24} />
                        <div className="text-2xl font-bold">{insights.comparison.last7Days.newPosts}</div>
                        <div className="text-xs text-neutral-500">Bài mới</div>
                    </div>
                    <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                        <MessageCircle className="mx-auto mb-2 text-purple-500" size={24} />
                        <div className="text-2xl font-bold">{insights.comparison.last7Days.newComments}</div>
                        <div className="text-xs text-neutral-500">Comment mới</div>
                    </div>
                    <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                        <div className="text-2xl font-bold">{insights.comparison.last7Days.userPostRate}%</div>
                        <div className="text-xs text-neutral-500">User mới có đăng bài</div>
                    </div>
                </div>
            </SpotlightCard>

            {/* Engagement Breakdown */}
            <SpotlightCard className="p-5">
                <h3 className="font-bold text-lg mb-4">Phân loại người dùng</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {insights.engagement.usersWhoCommented}
                        </div>
                        <div className="text-sm font-medium text-green-700 dark:text-green-300">
                            Người đã comment
                        </div>
                        <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                            Tương tác sâu
                        </div>
                    </div>
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                        <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                            {insights.engagement.usersWhoUpvoted}
                        </div>
                        <div className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                            Người đã upvote
                        </div>
                        <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                            Tương tác nông
                        </div>
                    </div>
                    <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                        <div className="text-2xl font-bold text-neutral-600 dark:text-neutral-400">
                            {Math.max(0, insights.engagement.lurkers)}
                        </div>
                        <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                            Lurkers
                        </div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                            Chưa tương tác
                        </div>
                    </div>
                </div>
            </SpotlightCard>

            {/* All-time Stats */}
            <SpotlightCard className="p-5">
                <h3 className="font-bold text-lg mb-4">Tổng quan toàn thời gian</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-center">
                    <div>
                        <div className="text-xl font-bold">{insights.comparison.allTime.users}</div>
                        <div className="text-xs text-neutral-500">Users</div>
                    </div>
                    <div>
                        <div className="text-xl font-bold">{insights.comparison.allTime.usersWithPosts}</div>
                        <div className="text-xs text-neutral-500">Có bài viết</div>
                    </div>
                    <div>
                        <div className="text-xl font-bold">{insights.comparison.allTime.posts}</div>
                        <div className="text-xs text-neutral-500">Bài viết</div>
                    </div>
                    <div>
                        <div className="text-xl font-bold">{insights.comparison.allTime.postsWithComments}</div>
                        <div className="text-xs text-neutral-500">Bài có comment</div>
                    </div>
                    <div>
                        <div className="text-xl font-bold">{insights.comparison.allTime.comments}</div>
                        <div className="text-xs text-neutral-500">Comments</div>
                    </div>
                    <div>
                        <div className="text-xl font-bold">{insights.comparison.allTime.upvotes}</div>
                        <div className="text-xs text-neutral-500">Upvotes</div>
                    </div>
                </div>
            </SpotlightCard>
        </motion.div>
    );
}
