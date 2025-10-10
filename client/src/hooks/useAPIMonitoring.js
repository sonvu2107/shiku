import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import socketService from '../socket';

/**
 * Custom hook for API monitoring with real-time updates
 * @returns {Object} API monitoring data and functions
 */
export function useAPIMonitoring() {
  const [stats, setStats] = useState(null);
  const [rateLimits, setRateLimits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [realtimeUpdates, setRealtimeUpdates] = useState([]);
  const [isRealtimeEnabled, setIsRealtimeEnabled] = useState(true);

  // Fetch API stats
  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, rateLimitsRes] = await Promise.all([
        api('/api/api-monitoring/stats'),
        api('/api/api-monitoring/rate-limits')
      ]);
      
      setStats(statsRes.data);
      setRateLimits(rateLimitsRes.data);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
      // Silent handling for API stats error
    } finally {
      setLoading(false);
    }
  }, []);

  // Reset stats
  const resetStats = useCallback(async () => {
    try {
      await api('/api/api-monitoring/reset', { method: 'POST' });
      await fetchStats();
    } catch (err) {
      setError(err.message);
    }
  }, [fetchStats]);

  // Real-time WebSocket updates
  useEffect(() => {
    if (!isRealtimeEnabled) return undefined;

    let isSubscribed = true;
    let socketRef = null;

    const handleRealtimeUpdate = (update) => {
      if (update.type !== 'api_call') return;

      setStats(prevStats => {
        if (!prevStats) return null;

        return {
          ...prevStats,
          overview: {
            ...prevStats.overview,
            totalRequests: update.data.totalRequests,
            rateLimitHits: update.data.rateLimitHits
          },
          topEndpoints: Object.entries(update.data.requestsByEndpoint)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([endpoint, count]) => ({ endpoint, count })),
          hourlyDistribution: Array.from({ length: 24 }, (_, hour) => ({
            hour,
            requests: update.data.hourlyDistribution[hour] || 0
          }))
        };
      });

      setRealtimeUpdates(prev => {
        const newUpdate = {
          ...update.data,
          id: Date.now() + Math.random()
        };
        return [newUpdate, ...prev.slice(0, 49)];
      });

      setLastUpdate(new Date());
    };

    const cleanupFns = [];

    const attachListener = async () => {
      await socketService.ensureConnection();
      if (!isSubscribed) return;
      const socket = socketService.socket;
      if (!socket || typeof socket.on !== "function") {
        return;
      }

      socketRef = socket;

      const joinMonitoringRoom = () => {
        try {
          socketRef.emit("join-api-monitoring");
        } catch (_) {
          // Silent error
        }
      };

      joinMonitoringRoom();
      socketRef.on("connect", joinMonitoringRoom);
      socketRef.io?.on?.("reconnect", joinMonitoringRoom);
      socketRef.on("api_monitoring_update", handleRealtimeUpdate);

      cleanupFns.push(() => {
        socketRef.off("connect", joinMonitoringRoom);
        socketRef.io?.off?.("reconnect", joinMonitoringRoom);
      });
    };

    attachListener();

    return () => {
      isSubscribed = false;
      if (socketRef && typeof socketRef.off === 'function') {
        socketRef.off('api_monitoring_update', handleRealtimeUpdate);
      }
      cleanupFns.forEach((fn) => {
        try {
          fn();
        } catch (_) {
          // ignore
        }
      });
    };
  }, [isRealtimeEnabled]);

  // Load real-time updates from database on mount
  useEffect(() => {
    const loadRealtimeUpdates = async () => {
      try {
        const response = await api('/api/api-monitoring/stats');
        if (response.realtimeUpdates) {
          setRealtimeUpdates(response.realtimeUpdates.map(update => ({
            ...update,
            id: update.timestamp + Math.random()
          })));
        }
      } catch (error) {
        // Silent handling for real-time updates error
      }
    };

    loadRealtimeUpdates();
  }, []);

  // Auto refresh (fallback when real-time is disabled)
  useEffect(() => {
    fetchStats();
    
    // Auto refresh every 30 seconds only if real-time is disabled
    const interval = setInterval(() => {
      if (!isRealtimeEnabled) {
        fetchStats();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchStats, isRealtimeEnabled]);

  return {
    stats,
    rateLimits,
    loading,
    error,
    lastUpdate,
    realtimeUpdates,
    isRealtimeEnabled,
    fetchStats,
    resetStats,
    setIsRealtimeEnabled
  };
}
