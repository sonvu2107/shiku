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
      // Load all users with a large limit to ensure we get the complete count
      // Frontend cần tổng số users để hiển thị chính xác
      const res = await api("/api/admin/users?page=1&limit=1000");
      setUsers(res.users || []);
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

  // Initial load only once
  useEffect(() => {
    refreshAllData();
  }, []); // Empty dependency array - only run once

  // Auto refresh every 60 seconds when page is visible
  useEffect(() => {
    let interval;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Clear interval when page is hidden
        if (interval) clearInterval(interval);
      } else {
        // Refresh immediately when page becomes visible
        refreshAllData();
        // Set up interval for visible page
        interval = setInterval(() => {
          refreshAllData();
        }, 60000); // 60 seconds instead of 30
      }
    };

    // Initial setup
    if (!document.hidden) {
      interval = setInterval(() => {
        refreshAllData();
      }, 60000);
    }

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // Empty dependency array - stable interval

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
    loadTotalVisitors,
    setUsers // Expose setUsers for optimistic updates
  };
}
