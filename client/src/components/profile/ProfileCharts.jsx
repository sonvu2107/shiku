import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../api";
import {
    BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { Loader2, RefreshCw, TrendingUp, BarChart3 } from "lucide-react";
import { SpotlightCard } from "../ui/SpotlightCard";

/**
 * ProfileCharts - Bar and Growth charts for user profile analytics
 */
export default function ProfileCharts() {
    const [chartData, setChartData] = useState([]);
    const [allTimeTotals, setAllTimeTotals] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [days, setDays] = useState(30);
    const [activeMetric, setActiveMetric] = useState("all");
    const [chartType, setChartType] = useState("bar");

    const loadChartData = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const response = await api(`/api/posts/analytics/daily?days=${days}`);
            if (response.success && response.chartData) {
                const baseline = response.baseline || { posts: 0, views: 0, upvotes: 0 };

                let cumulativePosts = baseline.posts;
                let cumulativeViews = baseline.views;
                let cumulativeUpvotes = baseline.upvotes;

                const enrichedData = response.chartData.map(item => {
                    cumulativePosts += item.posts;
                    cumulativeViews += item.views;
                    cumulativeUpvotes += item.upvotes;

                    return {
                        ...item,
                        cumulativePosts,
                        cumulativeViews,
                        cumulativeUpvotes
                    };
                });

                setChartData(enrichedData);
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
        { key: "views", label: "Lượt xem", color: "#10b981" },
        { key: "upvotes", label: "Upvote", color: "#000000" },
    ];

    const dayOptions = [
        { value: 7, label: "7 ngày" },
        { value: 30, label: "30 ngày" },
        { value: 90, label: "3 tháng" },
        { value: 365, label: "1 năm" }
    ];

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 shadow-lg">
                    <p className="font-bold text-neutral-900 dark:text-white mb-2">{label}</p>
                    {payload.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-neutral-600 dark:text-neutral-400">{entry.name}:</span>
                            <span className="font-semibold text-neutral-900 dark:text-white">{entry.value?.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <SpotlightCard className="p-6">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
                    <span className="ml-2 text-neutral-500">Đang tải biểu đồ...</span>
                </div>
            </SpotlightCard>
        );
    }

    if (error) {
        return (
            <SpotlightCard className="p-6">
                <div className="text-center py-8">
                    <p className="text-red-500 mb-4">{error}</p>
                    <button
                        onClick={loadChartData}
                        className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg"
                    >
                        Thử lại
                    </button>
                </div>
            </SpotlightCard>
        );
    }

    return (
        <SpotlightCard className="p-4 sm:p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                <h4 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="hidden sm:inline-block w-4 h-4 sm:w-5 sm:h-5" />
                    Biểu đồ hoạt động
                </h4>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Chart type toggle */}
                    {/* Chart type toggle */}
                    <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-full p-1 gap-1">
                        <button
                            onClick={() => setChartType("bar")}
                            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${chartType === "bar"
                                ? "bg-white dark:bg-black text-black dark:text-white shadow-sm"
                                : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                                }`}
                        >
                            Cột
                        </button>
                        <button
                            onClick={() => setChartType("growth")}
                            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${chartType === "growth"
                                ? "bg-white dark:bg-black text-black dark:text-white shadow-sm"
                                : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                                }`}
                        >
                            Tăng trưởng
                        </button>
                    </div>

                    <select
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                        className="px-2 py-1 rounded-lg text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border-0 outline-none"
                    >
                        {dayOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>

                    <button
                        onClick={loadChartData}
                        className="p-1.5 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
                        title="Làm mới"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Metric filter - horizontal scroll on mobile */}
            <div className="flex gap-2 mb-3 sm:mb-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap scrollbar-hide">
                {metrics.map((m) => (
                    <button
                        key={m.key}
                        onClick={() => setActiveMetric(m.key)}
                        className={`flex-shrink-0 px-2 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${activeMetric === m.key
                            ? "bg-black dark:bg-white text-white dark:text-black shadow-md"
                            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                            }`}
                        style={activeMetric === m.key && m.color ? { backgroundColor: m.color, color: "white" } : {}}
                    >
                        {m.label}
                    </button>
                ))}
            </div>

            {/* Chart - responsive height */}
            <div className="h-[220px] sm:h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    {chartType === "bar" ? (
                        <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-700" />
                            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={days > 30 ? Math.floor(days / 10) : 0} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />

                            {(activeMetric === "all" || activeMetric === "posts") && (
                                <Bar dataKey="posts" name="Bài viết" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            )}
                            {(activeMetric === "all" || activeMetric === "views") && (
                                <Bar dataKey="views" name="Lượt xem" fill="#10b981" radius={[4, 4, 0, 0]} />
                            )}
                            {(activeMetric === "all" || activeMetric === "upvotes") && (
                                <Bar dataKey="upvotes" name="Upvote" fill="#000000" radius={[4, 4, 0, 0]} />
                            )}
                        </BarChart>
                    ) : (
                        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <defs>
                                <linearGradient id="profileColorPosts" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                                </linearGradient>
                                <linearGradient id="profileColorViews" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                                </linearGradient>
                                <linearGradient id="profileColorUpvotes" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#000000" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#000000" stopOpacity={0.1} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-700" />
                            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={days > 30 ? Math.floor(days / 10) : 0} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />

                            {(activeMetric === "all" || activeMetric === "posts") && (
                                <Area type="monotone" dataKey="cumulativePosts" name="Tổng bài viết" stroke="#3b82f6" fillOpacity={1} fill="url(#profileColorPosts)" />
                            )}
                            {(activeMetric === "all" || activeMetric === "views") && (
                                <Area type="monotone" dataKey="cumulativeViews" name="Tổng lượt xem" stroke="#10b981" fillOpacity={1} fill="url(#profileColorViews)" />
                            )}
                            {(activeMetric === "all" || activeMetric === "upvotes") && (
                                <Area type="monotone" dataKey="cumulativeUpvotes" name="Tổng upvote" stroke="#000000" fillOpacity={1} fill="url(#profileColorUpvotes)" />
                            )}
                        </AreaChart>
                    )}
                </ResponsiveContainer>
            </div>

            {/* Summary */}
            {allTimeTotals && (
                <div className="mt-3 sm:mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                    <div className="text-center p-1.5 sm:p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                        <div className="text-base sm:text-xl font-bold text-blue-600 dark:text-blue-400">{allTimeTotals.posts}</div>
                        <div className="text-[9px] sm:text-xs text-neutral-600 dark:text-neutral-400">Bài viết</div>
                    </div>
                    <div className="text-center p-1.5 sm:p-2 bg-green-50 dark:bg-green-900/20 rounded-xl">
                        <div className="text-base sm:text-xl font-bold text-green-600 dark:text-green-400">{allTimeTotals.views?.toLocaleString()}</div>
                        <div className="text-[9px] sm:text-xs text-neutral-600 dark:text-neutral-400">Lượt xem</div>
                    </div>
                    <div className="text-center p-1.5 sm:p-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                        <div className="text-base sm:text-xl font-bold text-neutral-900 dark:text-white">{allTimeTotals.upvotes?.toLocaleString() || 0}</div>
                        <div className="text-[9px] sm:text-xs text-neutral-600 dark:text-neutral-400">Upvote</div>
                    </div>
                </div>
            )}
        </SpotlightCard>
    );
}
