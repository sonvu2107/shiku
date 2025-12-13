import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api';
import {
    Server,
    Database,
    HardDrive,
    Cpu,
    Clock,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    XCircle,
    Loader2
} from 'lucide-react';

/**
 * SystemHealth component - Displays server health status
 * Shows: Uptime, Memory, Database, Redis, Cache stats
 */
export default function SystemHealth() {
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastRefresh, setLastRefresh] = useState(null);

    const fetchHealth = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api('/api/health/detailed');
            setHealth(res);
            setError(null);
            setLastRefresh(new Date());
        } catch (err) {
            setError(err.message || 'Không thể tải thông tin hệ thống');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHealth();
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchHealth, 30000);
        return () => clearInterval(interval);
    }, [fetchHealth]);

    const getStatusIcon = (status) => {
        if (status === 'connected' || status === 'healthy' || status === 'OK') {
            return <CheckCircle2 className="text-green-500" size={16} />;
        }
        if (status === 'disconnected' || status === 'unhealthy' || status === 'ERROR') {
            return <XCircle className="text-red-500" size={16} />;
        }
        return <AlertCircle className="text-yellow-500" size={16} />;
    };

    const getStatusColor = (status) => {
        if (status === 'connected' || status === 'healthy' || status === 'OK') {
            return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
        }
        if (status === 'disconnected' || status === 'unhealthy' || status === 'ERROR') {
            return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
        }
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
    };

    const parseMemoryValue = (str) => {
        if (!str) return 0;
        const match = str.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
    };

    if (loading && !health) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        );
    }

    if (error && !health) {
        return (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600 dark:text-red-400 text-sm">
                <AlertCircle className="inline mr-2" size={16} />
                {error}
            </div>
        );
    }

    const heapUsed = parseMemoryValue(health?.memory?.heapUsed);
    const heapTotal = parseMemoryValue(health?.memory?.heapTotal);
    const memoryPercent = heapTotal > 0 ? Math.round((heapUsed / heapTotal) * 100) : 0;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <Server size={20} className="text-blue-500" />
                    Trạng thái Hệ thống
                </h3>
                <button
                    onClick={fetchHealth}
                    disabled={loading}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-50 transition-colors"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Làm mới
                </button>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(health?.status)}`}>
                    {getStatusIcon(health?.status)}
                    {health?.status}
                </span>
                {lastRefresh && (
                    <span className="text-xs text-neutral-500">
                        Cập nhật: {lastRefresh.toLocaleTimeString('vi-VN')}
                    </span>
                )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Uptime */}
                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
                    <div className="flex items-center gap-2 text-neutral-500 text-xs mb-1">
                        <Clock size={14} />
                        Uptime
                    </div>
                    <div className="text-lg font-bold text-neutral-900 dark:text-white">
                        {health?.uptime?.formatted || 'N/A'}
                    </div>
                </div>

                {/* Environment */}
                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
                    <div className="flex items-center gap-2 text-neutral-500 text-xs mb-1">
                        <Server size={14} />
                        Environment
                    </div>
                    <div className="text-lg font-bold text-neutral-900 dark:text-white capitalize">
                        {health?.environment || 'N/A'}
                    </div>
                </div>

                {/* Node Version */}
                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
                    <div className="flex items-center gap-2 text-neutral-500 text-xs mb-1">
                        <Cpu size={14} />
                        Node.js
                    </div>
                    <div className="text-lg font-bold text-neutral-900 dark:text-white">
                        {health?.node || 'N/A'}
                    </div>
                </div>

                {/* CPU Cores */}
                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
                    <div className="flex items-center gap-2 text-neutral-500 text-xs mb-1">
                        <Cpu size={14} />
                        CPU Cores
                    </div>
                    <div className="text-lg font-bold text-neutral-900 dark:text-white">
                        {health?.platform?.cpuCount || 'N/A'}
                    </div>
                </div>
            </div>

            {/* Memory Usage */}
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2 text-sm font-medium">
                        <HardDrive size={16} className="text-purple-500" />
                        Bộ nhớ
                    </span>
                    <span className="text-sm text-neutral-500">
                        {health?.memory?.heapUsed} / {health?.memory?.heapTotal}
                    </span>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2.5 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${memoryPercent > 80 ? 'bg-red-500' : memoryPercent > 60 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                        style={{ width: `${memoryPercent}%` }}
                    />
                </div>
                <div className="flex justify-between mt-1 text-xs text-neutral-500">
                    <span>RSS: {health?.memory?.rss}</span>
                    <span className="font-medium">{memoryPercent}% sử dụng</span>
                </div>
            </div>

            {/* Services Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Database */}
                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm font-medium">
                            <Database size={16} className="text-blue-500" />
                            MongoDB
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(health?.database?.status)}`}>
                            {getStatusIcon(health?.database?.status)}
                            {health?.database?.status}
                        </span>
                    </div>
                </div>

                {/* Redis */}
                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm font-medium">
                            <Database size={16} className="text-red-500" />
                            Redis
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(health?.redis?.status || health?.redis?.connected ? 'connected' : 'disabled')}`}>
                            {getStatusIcon(health?.redis?.status || (health?.redis?.connected ? 'connected' : 'disabled'))}
                            {health?.redis?.status || (health?.redis?.connected ? 'connected' : 'disabled')}
                        </span>
                    </div>
                </div>

                {/* Cache */}
                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm font-medium">
                            <HardDrive size={16} className="text-green-500" />
                            Cache
                        </span>
                        <span className="text-xs text-neutral-500">
                            Hit rate: {health?.cache?.memory?.hitRate || 'N/A'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
