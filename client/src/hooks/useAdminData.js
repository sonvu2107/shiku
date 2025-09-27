import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

/**
 * Custom hook for admin data management
 * Tách logic quản lý dữ liệu admin ra khỏi component
 */
export function useAdminData() {
  // ==================== STATE ====================
  
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [totalVisitors, setTotalVisitors] = useState(0);
  const [visitorStats, setVisitorStats] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ==================== API FUNCTIONS ====================

  const loadStats = useCallback(async () => {
    try {
      const res = await api("/api/admin/stats");
      setStats(res.stats);
    } catch (e) {
      // Silent handling for stats loading error
      setError("Không thể tải thống kê");
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const res = await api("/api/admin/users");
      setUsers(res.users);
    } catch (e) {
      // Silent handling for users loading error
      setError("Không thể tải danh sách người dùng");
    }
  }, []);

  const loadOnlineUsers = useCallback(async () => {
    try {
      const res = await api("/api/admin/online-users");
      setOnlineUsers(res.onlineUsers || []);
      setLastUpdate(new Date());
    } catch (e) {
      // Silent handling for online users loading error
      setError("Không thể tải danh sách người online");
    }
  }, []);

  const loadTotalVisitors = useCallback(async () => {
    try {
      const res = await api("/api/admin/total-visitors");
      setTotalVisitors(res.totalVisitors || 0);
      setVisitorStats(res);
    } catch (e) {
      // Silent handling for visitors loading error
      setError("Không thể tải thống kê visitors");
    }
  }, []);

  // ==================== COMBINED FUNCTIONS ====================

  const refreshAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        loadStats(),
        loadUsers(),
        loadOnlineUsers(),
        loadTotalVisitors()
      ]);
    } catch (e) {
      setError("Có lỗi khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [loadStats, loadUsers, loadOnlineUsers, loadTotalVisitors]);

  const updateOfflineUsers = useCallback(async () => {
    try {
      await api("/api/admin/update-offline-users", { method: "POST" });
      await loadOnlineUsers(); // Refresh online users after update
    } catch (e) {
      // Silent handling for offline users update error
    }
  }, [loadOnlineUsers]);

  // ==================== EFFECTS ====================

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Auto refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshAllData();
    }, 30000);

    return () => clearInterval(interval);
  }, [refreshAllData]);

  // ==================== RETURN ====================

  return {
    // Data
    stats,
    users,
    onlineUsers,
    totalVisitors,
    visitorStats,
    lastUpdate,
    loading,
    error,
    
    // Functions
    refreshAllData,
    updateOfflineUsers,
    loadStats,
    loadUsers,
    loadOnlineUsers,
    loadTotalVisitors
  };
}
