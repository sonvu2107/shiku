import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api';
import {
    Activity,
    TrendingUp,
    TrendingDown,
    Clock,
    Zap,
    AlertTriangle,
    CheckCircle2,
    RefreshCw,
    BarChart3
} from 'lucide-react';

/**
 * PerformanceCharts - Component displaying performance metrics (P95 latency, slowest endpoints)
 * Shows: P95 bar chart, slowest endpoints ranking, overall health status
 */
export default function PerformanceCharts() {
    const [perfData, setPerfData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(new Date());

    const fetchPerformanceData = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api('/api/api-monitoring/performance', { method: 'GET' });
            if (response.success) {
                setPerfData(response.data);
                setLastUpdate(new Date());
                setError(null);
            }
        } catch (err) {
            setError(err.message || 'Failed to fetch performance data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPerformanceData();
        const interval = setInterval(fetchPerformanceData, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, [fetchPerformanceData]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'excellent': return 'text-green-600 bg-green-100';
            case 'good': return 'text-blue-600 bg-blue-100';
            case 'warning': return 'text-yellow-600 bg-yellow-100';
            case 'critical': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getLatencyColor = (p95, thresholds) => {
        if (p95 < thresholds.good) return 'bg-green-500';
        if (p95 < thresholds.warning) return 'bg-blue-500';
        if (p95 < thresholds.critical) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const getLatencyTextColor = (p95, thresholds) => {
        if (p95 < thresholds.good) return 'text-green-600';
        if (p95 < thresholds.warning) return 'text-blue-600';
        if (p95 < thresholds.critical) return 'text-yellow-600';
        return 'text-red-600';
    };

    if (loading && !perfData) {
        return (
            <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                <span>Loading performance data...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center text-red-600">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    <span>Error: {error}</span>
                </div>
                <button
                    onClick={fetchPerformanceData}
                    className="mt-2 text-sm text-red-600 hover:underline"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!perfData) {
        return (
            <div className="text-center py-8 text-gray-500">
                No performance data available yet
            </div>
        );
    }

    const { overall, slowestEndpoints, topTrafficEndpoints } = perfData;
    const thresholds = overall.thresholds;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Performance Monitoring
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    Updated: {lastUpdate.toLocaleTimeString()}
                    <button
                        onClick={fetchPerformanceData}
                        className="p-1 hover:bg-gray-100 rounded"
                        disabled={loading}
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Overall Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Health Status */}
                <div className={`p-4 rounded-lg ${getStatusColor(overall.healthStatus)}`}>
                    <div className="flex items-center gap-2 mb-2">
                        {overall.healthStatus === 'excellent' || overall.healthStatus === 'good' ? (
                            <CheckCircle2 className="w-5 h-5" />
                        ) : (
                            <AlertTriangle className="w-5 h-5" />
                        )}
                        <span className="font-medium capitalize">{overall.healthStatus}</span>
                    </div>
                    <div className="text-2xl font-bold">{overall.p95}ms</div>
                    <div className="text-sm opacity-75">P95 Latency</div>
                </div>

                {/* P50 */}
                <div className="p-4 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                    <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-5 h-5 text-green-600" />
                        <span className="font-medium">Median</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600">{overall.p50}ms</div>
                    <div className="text-sm text-gray-500">P50 Latency</div>
                </div>

                {/* Average */}
                <div className="p-4 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                        <span className="font-medium">Average</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">{overall.avg}ms</div>
                    <div className="text-sm text-gray-500">Avg Response</div>
                </div>

                {/* Samples */}
                <div className="p-4 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                    <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="w-5 h-5 text-purple-600" />
                        <span className="font-medium">Samples</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-600">{overall.totalSamples.toLocaleString()}</div>
                    <div className="text-sm text-gray-500">{overall.endpointCount} endpoints</div>
                </div>
            </div>

            {/* P95 Latency Bar Chart - Slowest Endpoints */}
            <div className="bg-white dark:bg-neutral-900 border rounded-lg p-4">
                <h4 className="text-base font-semibold mb-4 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    Slowest Endpoints (by P95)
                </h4>
                <div className="space-y-3">
                    {slowestEndpoints.length === 0 ? (
                        <div className="text-center text-gray-500 py-4">
                            No latency data collected yet
                        </div>
                    ) : (
                        slowestEndpoints.map((endpoint, index) => (
                            <div key={endpoint.endpoint} className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <span className="font-medium text-gray-500 w-6">{index + 1}.</span>
                                        <span className="truncate" title={endpoint.endpoint}>
                                            {endpoint.endpoint}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <span className={`font-bold ${getLatencyTextColor(endpoint.p95, thresholds)}`}>
                                            {endpoint.p95}ms
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            ({endpoint.requestCount} req)
                                        </span>
                                    </div>
                                </div>
                                {/* Bar */}
                                <div className="w-full bg-gray-200 dark:bg-neutral-700 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full transition-all ${getLatencyColor(endpoint.p95, thresholds)}`}
                                        style={{
                                            width: `${Math.min(100, (endpoint.p95 / Math.max(slowestEndpoints[0]?.p95 || 1, 1)) * 100)}%`
                                        }}
                                    />
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Legend */}
                <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-green-500" />
                        <span>&lt;{thresholds.good}ms (Excellent)</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-blue-500" />
                        <span>&lt;{thresholds.warning}ms (Good)</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-yellow-500" />
                        <span>&lt;{thresholds.critical}ms (Warning)</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-red-500" />
                        <span>&gt;={thresholds.critical}ms (Critical)</span>
                    </div>
                </div>
            </div>

            {/* Top Traffic Endpoints */}
            <div className="bg-white dark:bg-neutral-900 border rounded-lg p-4">
                <h4 className="text-base font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                    Top Traffic Endpoints
                </h4>
                <div className="space-y-2">
                    {topTrafficEndpoints.length === 0 ? (
                        <div className="text-center text-gray-500 py-4">
                            No traffic data collected yet
                        </div>
                    ) : (
                        topTrafficEndpoints.map((endpoint, index) => (
                            <div key={endpoint.endpoint} className="flex items-center justify-between py-2 border-b last:border-0">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="font-medium text-gray-500 w-6">{index + 1}.</span>
                                    <span className="truncate text-sm" title={endpoint.endpoint}>
                                        {endpoint.endpoint}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 flex-shrink-0 text-sm">
                                    <span className="text-gray-600">{endpoint.requestCount} req</span>
                                    <span className={`font-medium ${getLatencyTextColor(endpoint.p95, thresholds)}`}>
                                        P95: {endpoint.p95}ms
                                    </span>
                                    <span className="text-gray-400">Avg: {endpoint.avg}ms</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Detailed Stats Table */}
            <div className="bg-white dark:bg-neutral-900 border rounded-lg p-4">
                <h4 className="text-base font-semibold mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Detailed Latency Stats
                </h4>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b text-left">
                                <th className="pb-2 font-medium">Endpoint</th>
                                <th className="pb-2 font-medium text-right">Count</th>
                                <th className="pb-2 font-medium text-right">Avg</th>
                                <th className="pb-2 font-medium text-right">P50</th>
                                <th className="pb-2 font-medium text-right">P95</th>
                                <th className="pb-2 font-medium text-right">P99</th>
                                <th className="pb-2 font-medium text-right">Max</th>
                            </tr>
                        </thead>
                        <tbody>
                            {perfData.allEndpoints?.slice(0, 15).map((ep) => (
                                <tr key={ep.endpoint} className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-neutral-800">
                                    <td className="py-2 truncate max-w-[200px]" title={ep.endpoint}>
                                        {ep.endpoint}
                                    </td>
                                    <td className="py-2 text-right text-gray-500">{ep.requestCount}</td>
                                    <td className="py-2 text-right">{ep.avg}ms</td>
                                    <td className="py-2 text-right text-green-600">{ep.p50}ms</td>
                                    <td className={`py-2 text-right font-medium ${getLatencyTextColor(ep.p95, thresholds)}`}>
                                        {ep.p95}ms
                                    </td>
                                    <td className="py-2 text-right text-orange-600">{ep.p99}ms</td>
                                    <td className="py-2 text-right text-red-600">{ep.max}ms</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
