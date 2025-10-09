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
      setError(null); // Clear error on success
    } catch (e) {
      console.error("Error loading stats:", e);
      setError("Không thể tải thống kê");
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      // Reduce limit to improve performance - only load what's needed for display
      // Use pagination on frontend if needed for large user bases
      const res = await api("/api/admin/users?page=1&limit=100");
      setUsers(res.users || []);
      setError(null); // Clear error on success
    } catch (e) {
      console.error("Error loading users:", e);
      setUsers([]); // Reset to empty array on error
      setError("Không thể tải danh sách người dùng");
    }
  }, []);

  const loadOnlineUsers = useCallback(async () => {
    try {
      const res = await api("/api/admin/online-users");
      setOnlineUsers(res.onlineUsers || []);
      setLastUpdate(new Date());
    } catch (e) {
      console.error("Error loading online users:", e);
      setOnlineUsers([]); // Reset to empty array on error
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

  // ==================== OPTIMIZED SINGLE USER LOAD ====================
  
  const loadSingleUser = useCallback(async (userId) => {
    try {
      const res = await api(`/api/admin/users/${userId}`);
      return res.user;
    } catch (e) {
      throw new Error("Không thể tải thông tin user");
    }
  }, []);

  const updateSingleUserInState = useCallback((userId, updatedUserData) => {
    setUsers(prev => prev.map(u => 
      u._id === userId ? { ...u, ...updatedUserData } : u
    ));
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
  }, []); // Remove dependencies to avoid infinite loops

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
        loadStats();
        loadOnlineUsers(); // Only refresh critical data
        // Set up interval for visible page
        interval = setInterval(() => {
          loadStats();
          loadOnlineUsers(); // Only auto-refresh time-sensitive data
        }, 60000); // 60 seconds
      }
    };

    // Initial setup
    if (!document.hidden) {
      interval = setInterval(() => {
        loadStats();
        loadOnlineUsers(); // Only auto-refresh time-sensitive data
      }, 60000);
    }

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // Remove dependencies to avoid infinite loops

  // ==================== CLEAR FUNCTIONS ====================

  const clearError = useCallback(() => {
    setError(null);
  }, []);

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
    loadSingleUser,
    updateSingleUserInState,
    clearError,
    setUsers // Expose setUsers for optimistic updates
  };
}
