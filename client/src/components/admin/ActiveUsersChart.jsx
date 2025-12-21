import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../api";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer
} from "recharts";
import { Loader2, RefreshCw, Users } from "lucide-react";

/**
 * ActiveUsersChart - Simple chart showing daily active users only
 */
export default function ActiveUsersChart() {
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [days, setDays] = useState(14);

    const loadChartData = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const response = await api(`/api/admin/stats/daily?days=${days}`);
            if (response.success && response.chartData) {
                setChartData(response.chartData);
            }
        } catch (err) {
            setError(err.message || "Không thể tải dữ liệu");
        } finally {
            setLoading(false);
        }
    }, [days]);

    useEffect(() => {
        loadChartData();
    }, [loadChartData]);

    const dayOptions = [
        { value: 7, label: "7 ngày" },
        { value: 14, label: "14 ngày" },
        { value: 30, label: "30 ngày" },
    ];

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 shadow-lg">
                    <p className="font-bold text-neutral-900 dark:text-white mb-1">{label}</p>
                    <div className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full bg-amber-500" />
                        <span className="text-neutral-600 dark:text-neutral-400">Hoạt động:</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">{payload[0].value}</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
                <span className="ml-2 text-sm text-neutral-500">Đang tải...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-6">
                <p className="text-red-500 text-sm mb-2">{error}</p>
                <button
                    onClick={loadChartData}
                    className="text-sm px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700"
                >
                    Thử lại
                </button>
            </div>
        );
    }

    // Calculate stats
    const totalActive = chartData.reduce((sum, d) => sum + (d.activeUsers || 0), 0);
    const avgActive = chartData.length > 0 ? Math.round(totalActive / chartData.length) : 0;
    const maxActive = Math.max(...chartData.map(d => d.activeUsers || 0));

    return (
        <div className="space-y-4">
            {/* Controls only - no title */}
            <div className="flex items-center justify-end gap-2">
                <select
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="px-2 py-1 text-xs rounded-lg bg-neutral-100 dark:bg-neutral-800 border-0 outline-none"
                >
                    {dayOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                <button
                    onClick={loadChartData}
                    className="p-1.5 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
                >
                    <RefreshCw className="w-3 h-3" />
                </button>
            </div>

            {/* Chart first */}
            <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <defs>
                            <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-700" />
                        <XAxis
                            dataKey="label"
                            tick={{ fontSize: 10 }}
                            className="text-neutral-500"
                        />
                        <YAxis
                            tick={{ fontSize: 10 }}
                            className="text-neutral-500"
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="activeUsers"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorActive)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
