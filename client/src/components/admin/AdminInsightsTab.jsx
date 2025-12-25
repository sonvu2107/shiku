import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../api";
import { SpotlightCard } from "../ui/DesignSystem";
import { motion } from "framer-motion";
import { cn } from "../../utils/cn";
import {
    AlertTriangle,
    CheckCircle2,
    Loader2,
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
                return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800/50";
            case "warning":
                return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-800/50";
            case "critical":
                return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/50";
            default:
                return "text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700/50";
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

    const formatNumber = (num) => {
        if (num >= 1000) {
            return num.toLocaleString('vi-VN');
        }
        return num;
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
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Theo dõi sức khỏe sản phẩm (30 ngày)</p>
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

            {/* Key Insights Highlights */}
            {insights.highlights && insights.highlights.length > 0 && (
                <SpotlightCard className="p-5">
                    <h3 className="font-bold text-lg mb-4">Nhận định quan trọng</h3>
                    <div className="space-y-3">
                        {insights.highlights.map((insight, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    "p-3 rounded-lg border",
                                    insight.type === "critical" && "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50",
                                    insight.type === "warning" && "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800/50",
                                    insight.type === "info" && "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50",
                                    insight.type === "healthy" && "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800/50"
                                )}
                            >
                                <div className={cn(
                                    "font-medium text-sm",
                                    insight.type === "critical" && "text-red-700 dark:text-red-300",
                                    insight.type === "warning" && "text-yellow-700 dark:text-yellow-300",
                                    insight.type === "info" && "text-blue-700 dark:text-blue-300",
                                    insight.type === "healthy" && "text-green-700 dark:text-green-300"
                                )}>
                                    {insight.text}
                                </div>
                                {insight.action && (
                                    <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                        → {insight.action}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </SpotlightCard>
            )}

            {/* User Funnel (30d) */}
            {insights.funnel && (
                <SpotlightCard className="p-5">
                    <h3 className="font-bold text-lg mb-4">Phễu người dùng (30 ngày)</h3>

                    {/* Funnel Visualization */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800/50 text-center">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {formatNumber(insights.funnel.activeUsers.value)}
                            </div>
                            <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                Có truy cập
                            </div>
                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                Truy cập trong 30 ngày qua
                            </div>
                        </div>

                        <div className="p-4 bg-green-50 dark:bg-green-950/40 rounded-xl border border-green-200 dark:border-green-800/50 text-center">
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {formatNumber(insights.funnel.engagedUsers.value)}
                            </div>
                            <div className="text-sm font-medium text-green-700 dark:text-green-300">
                                Có tương tác
                            </div>
                            <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                                Đã upvote hoặc bình luận
                            </div>
                        </div>

                        <div className="p-4 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800/50 text-center">
                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                {formatNumber(insights.funnel.creators.value)}
                            </div>
                            <div className="text-sm font-medium text-purple-700 dark:text-purple-300">
                                Đăng bài
                            </div>
                            <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                                Đã viết ít nhất 1 bài
                            </div>
                        </div>
                    </div>

                    {/* Conversion Rates & Lurkers */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-lg border border-neutral-100 dark:border-neutral-700/50 text-center">
                            <div className="text-xl font-bold">{insights.funnel.engagedFromActive.value}%</div>
                            <div className="text-xs text-neutral-500">Tỉ lệ tương tác</div>
                        </div>
                        <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-lg border border-neutral-100 dark:border-neutral-700/50 text-center">
                            <div className="text-xl font-bold">{insights.funnel.creatorsFromActive.value}%</div>
                            <div className="text-xs text-neutral-500">Tỉ lệ đăng bài</div>
                        </div>
                        <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-lg border border-neutral-100 dark:border-neutral-700/50 text-center">
                            <div className="text-xl font-bold">{insights.funnel.creatorsAmongEngaged.value}%</div>
                            <div className="text-xs text-neutral-500">Người đăng bài có tương tác</div>
                        </div>
                        <div className="p-3 bg-neutral-100 dark:bg-neutral-800/60 rounded-lg border border-neutral-200 dark:border-neutral-700/50 text-center">
                            <div className="text-xl font-bold text-neutral-600 dark:text-neutral-400">
                                {formatNumber(insights.funnel.lurkers.value)}
                            </div>
                            <div className="text-xs text-neutral-500">Chỉ xem, không tương tác</div>
                        </div>
                    </div>

                    {insights.funnel.engagedUsers.note && (
                        <div className="mt-3 text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 p-2 rounded">
                            Lưu ý: {insights.funnel.engagedUsers.note}
                        </div>
                    )}
                </SpotlightCard>
            )}

            {/* Engagement Breakdown (30d) */}
            {insights.engagementBreakdown && (
                <SpotlightCard className="p-5">
                    <h3 className="font-bold text-lg mb-4">Phân loại người tương tác (30 ngày)</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-950/40 rounded-xl border border-yellow-200 dark:border-yellow-800/50">
                            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                                {formatNumber(insights.engagementBreakdown.voteOnly.value)}
                            </div>
                            <div className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                                Chỉ upvote
                            </div>
                            <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                Upvote nhưng không bình luận
                            </div>
                        </div>
                        <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800/50">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {formatNumber(insights.engagementBreakdown.commentOnly.value)}
                            </div>
                            <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                Chỉ bình luận
                            </div>
                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                Bình luận nhưng không upvote
                            </div>
                        </div>
                        <div className="p-4 bg-green-50 dark:bg-green-950/40 rounded-xl border border-green-200 dark:border-green-800/50">
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {formatNumber(insights.engagementBreakdown.both.value)}
                            </div>
                            <div className="text-sm font-medium text-green-700 dark:text-green-300">
                                Cả hai
                            </div>
                            <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                                Vừa upvote vừa bình luận
                            </div>
                        </div>
                    </div>
                </SpotlightCard>
            )}

            {/* Secondary Metrics */}
            <SpotlightCard className="p-5">
                <h3 className="font-bold text-lg mb-4">Chỉ số phụ</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(insights.secondary).map(([key, metric]) => (
                        <div key={key} className="p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-100 dark:border-neutral-700/50">
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

            {/* 30-Day Comparison */}
            <SpotlightCard className="p-5">
                <h3 className="font-bold text-lg mb-4">30 ngày gần nhất</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-100 dark:border-neutral-700/50">
                        <div className="text-2xl font-bold">{formatNumber(insights.comparison.last30Days?.activeUsers || 0)}</div>
                        <div className="text-xs text-neutral-500">Người hoạt động</div>
                    </div>
                    <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-100 dark:border-neutral-700/50">
                        <div className="text-2xl font-bold">{formatNumber(insights.comparison.last30Days?.newPosts || 0)}</div>
                        <div className="text-xs text-neutral-500">Bài mới</div>
                    </div>
                    <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-100 dark:border-neutral-700/50">
                        <div className="text-2xl font-bold">{formatNumber(insights.comparison.last30Days?.newComments || 0)}</div>
                        <div className="text-xs text-neutral-500">Bình luận mới</div>
                    </div>
                    <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-100 dark:border-neutral-700/50">
                        <div className="text-2xl font-bold">{insights.comparison.last30Days?.postCommentRate || 0}%</div>
                        <div className="text-xs text-neutral-500">Bài có bình luận</div>
                    </div>
                </div>
            </SpotlightCard>

            {/* All-time Stats */}
            <SpotlightCard className="p-5">
                <h3 className="font-bold text-lg mb-4">Tổng quan toàn thời gian</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-center">
                    <div>
                        <div className="text-xl font-bold">{formatNumber(insights.comparison.allTime.users)}</div>
                        <div className="text-xs text-neutral-500">Tổng người dùng</div>
                    </div>
                    <div>
                        <div className="text-xl font-bold">{formatNumber(insights.comparison.allTime.usersWithPosts)}</div>
                        <div className="text-xs text-neutral-500">Có bài viết</div>
                    </div>
                    <div>
                        <div className="text-xl font-bold">{formatNumber(insights.comparison.allTime.posts)}</div>
                        <div className="text-xs text-neutral-500">Bài viết</div>
                    </div>
                    <div>
                        <div className="text-xl font-bold">{formatNumber(insights.comparison.allTime.postsWithComments)}</div>
                        <div className="text-xs text-neutral-500">Có bình luận</div>
                    </div>
                    <div>
                        <div className="text-xl font-bold">{formatNumber(insights.comparison.allTime.comments)}</div>
                        <div className="text-xs text-neutral-500">Bình luận</div>
                    </div>
                    <div>
                        <div className="text-xl font-bold">{formatNumber(insights.comparison.allTime.upvotes)}</div>
                        <div className="text-xs text-neutral-500">Upvotes</div>
                    </div>
                </div>
            </SpotlightCard>
        </motion.div>
    );
}
