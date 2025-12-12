import React, { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import {
    BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { Loader2, RefreshCw, Calendar, TrendingUp, BarChart3 } from "lucide-react";

/**
 * AdminCharts - Bar charts and Growth charts for daily statistics in Admin Dashboard
 */
export default function AdminCharts() {
    const [chartData, setChartData] = useState([]);
    const [allTimeTotals, setAllTimeTotals] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [days, setDays] = useState(14);
    const [activeMetric, setActiveMetric] = useState("all");
    const [chartType, setChartType] = useState("bar"); // 'bar' or 'growth'

    const loadChartData = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const response = await api(`/api/admin/stats/daily?days=${days}`);
            if (response.success && response.chartData) {
                // Get baseline (items before period start) from server
                const baseline = response.baseline || { posts: 0, users: 0, comments: 0, emotes: 0 };

                // Calculate cumulative growth for area chart, starting from baseline
                let cumulativePosts = baseline.posts;
                let cumulativeUsers = baseline.users;
                let cumulativeComments = baseline.comments;
                let cumulativeEmotes = baseline.emotes;

                const enrichedData = response.chartData.map(item => {
                    cumulativePosts += item.posts;
                    cumulativeUsers += item.users;
                    cumulativeComments += item.comments;
                    cumulativeEmotes += item.emotes;

                    return {
                        ...item,
                        cumulativePosts,
                        cumulativeUsers,
                        cumulativeComments,
                        cumulativeEmotes
                    };
                });

                setChartData(enrichedData);

                // Store all-time totals from server
                if (response.allTimeTotals) {
                    setAllTimeTotals(response.allTimeTotals);
                }
            }
        } catch (err) {
            setError(err.message || "Không thể tải dữ liệu biểu đồ");
        } finally {
            setLoading(false);
        }
    }, [days]);

    useEffect(() => {
        loadChartData();
    }, [loadChartData]);

    const metrics = [
        { key: "all", label: "Tất cả" },
        { key: "posts", label: "Bài viết", color: "#3b82f6" },
        { key: "users", label: "Người dùng", color: "#10b981" },
        { key: "comments", label: "Bình luận", color: "#8b5cf6" },
        { key: "emotes", label: "Cảm xúc", color: "#ef4444" },
    ];

    const dayOptions = [
        { value: 7, label: "7 ngày" },
        { value: 14, label: "14 ngày" },
        { value: 30, label: "30 ngày" },
        { value: 90, label: "3 tháng" },
        { value: 365, label: "1 năm" }
    ];

    // Custom tooltip
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 shadow-lg">
                    <p className="font-bold text-neutral-900 dark:text-white mb-2">{label}</p>
                    {payload.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-neutral-600 dark:text-neutral-400">{entry.name}:</span>
                            <span className="font-semibold text-neutral-900 dark:text-white">{entry.value}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl rounded-2xl p-6 border border-neutral-200/80 dark:border-neutral-800/80 shadow-sm">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
                    <span className="ml-2 text-neutral-500">Đang tải biểu đồ...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl rounded-2xl p-6 border border-neutral-200/80 dark:border-neutral-800/80 shadow-sm">
                <div className="text-center py-8">
                    <p className="text-red-500 mb-4">{error}</p>
                    <button
                        onClick={loadChartData}
                        className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
                    >
                        Thử lại
                    </button>
                </div>
            </div>
        );
    }

    // Get chart label based on time range
    const getXAxisTickFormatter = (value) => {
        if (days <= 14) return value;
        if (days <= 30) return value;
        // For longer periods, show less frequent labels
        return value;
    };

    return (
        <div className="bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-neutral-200/80 dark:border-neutral-800/80 shadow-sm">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-600 dark:text-neutral-400" />
                    <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                        Thống kê theo ngày
                    </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Chart type toggle */}
                    <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
                        <button
                            onClick={() => setChartType("bar")}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${chartType === "bar"
                                ? "bg-black dark:bg-white text-white dark:text-black"
                                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                                }`}
                        >
                            <BarChart3 className="w-4 h-4" />
                            <span className="hidden sm:inline">Cột</span>
                        </button>
                        <button
                            onClick={() => setChartType("growth")}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${chartType === "growth"
                                ? "bg-black dark:bg-white text-white dark:text-black"
                                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                                }`}
                        >
                            <TrendingUp className="w-4 h-4" />
                            <span className="hidden sm:inline">Tăng trưởng</span>
                        </button>
                    </div>

                    {/* Day selector */}
                    <select
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border-0 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {dayOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>

                    {/* Refresh button */}
                    <button
                        onClick={loadChartData}
                        className="p-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                        title="Làm mới"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Metric filter - horizontal scroll on mobile */}
            <div className="flex gap-2 mb-4 sm:mb-6 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap scrollbar-hide">
                {metrics.map((m) => (
                    <button
                        key={m.key}
                        onClick={() => setActiveMetric(m.key)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${activeMetric === m.key
                            ? "bg-black dark:bg-white text-white dark:text-black shadow-md"
                            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                            }`}
                        style={activeMetric === m.key && m.color ? { backgroundColor: m.color, color: "white" } : {}}
                    >
                        {m.label}
                    </button>
                ))}
            </div>

            {/* Chart - responsive height */}
            <div className="h-[250px] sm:h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    {chartType === "bar" ? (
                        <BarChart
                            data={chartData}
                            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-700" />
                            <XAxis
                                dataKey="label"
                                tick={{ fontSize: days > 30 ? 10 : 12 }}
                                interval={days > 30 ? Math.floor(days / 15) : 0}
                                className="text-neutral-600 dark:text-neutral-400"
                            />
                            <YAxis
                                tick={{ fontSize: 12 }}
                                className="text-neutral-600 dark:text-neutral-400"
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />

                            {(activeMetric === "all" || activeMetric === "posts") && (
                                <Bar dataKey="posts" name="Bài viết" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            )}
                            {(activeMetric === "all" || activeMetric === "users") && (
                                <Bar dataKey="users" name="Người dùng" fill="#10b981" radius={[4, 4, 0, 0]} />
                            )}
                            {(activeMetric === "all" || activeMetric === "comments") && (
                                <Bar dataKey="comments" name="Bình luận" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                            )}
                            {(activeMetric === "all" || activeMetric === "emotes") && (
                                <Bar dataKey="emotes" name="Cảm xúc" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            )}
                        </BarChart>
                    ) : (
                        <AreaChart
                            data={chartData}
                            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                        >
                            <defs>
                                <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                                </linearGradient>
                                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                                </linearGradient>
                                <linearGradient id="colorComments" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
                                </linearGradient>
                                <linearGradient id="colorEmotes" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-700" />
                            <XAxis
                                dataKey="label"
                                tick={{ fontSize: days > 30 ? 10 : 12 }}
                                interval={days > 30 ? Math.floor(days / 15) : 0}
                                className="text-neutral-600 dark:text-neutral-400"
                            />
                            <YAxis
                                tick={{ fontSize: 12 }}
                                className="text-neutral-600 dark:text-neutral-400"
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />

                            {(activeMetric === "all" || activeMetric === "posts") && (
                                <Area
                                    type="monotone"
                                    dataKey="cumulativePosts"
                                    name="Tổng bài viết"
                                    stroke="#3b82f6"
                                    fillOpacity={1}
                                    fill="url(#colorPosts)"
                                />
                            )}
                            {(activeMetric === "all" || activeMetric === "users") && (
                                <Area
                                    type="monotone"
                                    dataKey="cumulativeUsers"
                                    name="Tổng người dùng"
                                    stroke="#10b981"
                                    fillOpacity={1}
                                    fill="url(#colorUsers)"
                                />
                            )}
                            {(activeMetric === "all" || activeMetric === "comments") && (
                                <Area
                                    type="monotone"
                                    dataKey="cumulativeComments"
                                    name="Tổng bình luận"
                                    stroke="#8b5cf6"
                                    fillOpacity={1}
                                    fill="url(#colorComments)"
                                />
                            )}
                            {(activeMetric === "all" || activeMetric === "emotes") && (
                                <Area
                                    type="monotone"
                                    dataKey="cumulativeEmotes"
                                    name="Tổng cảm xúc"
                                    stroke="#ef4444"
                                    fillOpacity={1}
                                    fill="url(#colorEmotes)"
                                />
                            )}
                        </AreaChart>
                    )}
                </ResponsiveContainer>
            </div>

            {/* Summary - All-time totals */}
            {allTimeTotals && (
                <div className="mt-4 sm:mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                    <div className="text-center p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                        <div className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {allTimeTotals.posts}
                        </div>
                        <div className="text-[10px] sm:text-xs text-neutral-600 dark:text-neutral-400">Tổng bài viết</div>
                    </div>
                    <div className="text-center p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                        <div className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400">
                            {allTimeTotals.users}
                        </div>
                        <div className="text-[10px] sm:text-xs text-neutral-600 dark:text-neutral-400">Tổng người dùng</div>
                    </div>
                    <div className="text-center p-2 sm:p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                        <div className="text-lg sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {allTimeTotals.comments}
                        </div>
                        <div className="text-[10px] sm:text-xs text-neutral-600 dark:text-neutral-400">Tổng bình luận</div>
                    </div>
                    <div className="text-center p-2 sm:p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                        <div className="text-lg sm:text-2xl font-bold text-red-600 dark:text-red-400">
                            {allTimeTotals.emotes}
                        </div>
                        <div className="text-[10px] sm:text-xs text-neutral-600 dark:text-neutral-400">Tổng cảm xúc</div>
                    </div>
                </div>
            )}
        </div>
    );
}
