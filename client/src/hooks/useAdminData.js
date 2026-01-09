import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api';
import { io } from 'socket.io-client';

/**
 * Custom hook for admin data management
 * Features: Pagination, WebSocket realtime updates, server-side search/filter
 */
export function useAdminData() {
  // ==================== STATE ====================

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [totalVisitors, setTotalVisitors] = useState(0);
  const [visitorStats, setVisitorStats] = useState(null);
  const [systemMetrics, setSystemMetrics] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [securityAlerts, setSecurityAlerts] = useState([]);

  // ==================== PAGINATION STATE ====================

  const [userPagination, setUserPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [userFilters, setUserFilters] = useState({
    search: '',
    role: '',
    banned: ''
  });
  const [usersLoading, setUsersLoading] = useState(false);

  // WebSocket ref
  const socketRef = useRef(null);
  const isSocketConnected = useRef(false);

  // ==================== API FUNCTIONS ====================

  const loadStats = useCallback(async () => {
    try {
      const res = await api("/api/admin/stats");
      setStats(res.stats);
      setError(null);
    } catch (e) {
      console.error("Error loading stats:", e);
      setError("Không thể tải thống kê");
    }
  }, []);

  /**
   * Load users with pagination and filters
   */
  const loadUsers = useCallback(async (options = {}) => {
    const {
      page = userPagination.page,
      limit = userPagination.limit,
      search = userFilters.search,
      role = userFilters.role,
      banned = userFilters.banned
    } = options;

    setUsersLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      if (search) params.set('search', search);
      if (role) params.set('role', role);
      if (banned) params.set('banned', banned);

      const res = await api(`/api/admin/users?${params.toString()}`);
      setUsers(res.users || []);

      if (res.pagination) {
        setUserPagination({
          page: res.pagination.page,
          limit: res.pagination.limit,
          total: res.pagination.total,
          totalPages: res.pagination.totalPages,
          hasNextPage: res.pagination.hasNextPage,
          hasPrevPage: res.pagination.hasPrevPage
        });
      }
      setError(null);
    } catch (e) {
      console.error("Error loading users:", e);
      setUsers([]);
      setError("Không thể tải danh sách người dùng");
    } finally {
      setUsersLoading(false);
    }
  }, [userPagination.page, userPagination.limit, userFilters]);

  /**
   * Change user page
   */
  const goToPage = useCallback((page) => {
    if (page >= 1 && page <= userPagination.totalPages) {
      loadUsers({ page });
    }
  }, [loadUsers, userPagination.totalPages]);

  /**
   * Update user filters (debounced search should be handled in component)
   */
  const updateUserFilters = useCallback((newFilters) => {
    setUserFilters(prev => ({ ...prev, ...newFilters }));
    // Reset to page 1 when filters change
    loadUsers({ page: 1, ...newFilters });
  }, [loadUsers]);

  const loadOnlineUsers = useCallback(async () => {
    try {
      const res = await api("/api/admin/online-users");
      setOnlineUsers(res.onlineUsers || []);
      setLastUpdate(new Date());
    } catch (e) {
      console.error("Error loading online users:", e);
      setOnlineUsers([]);
      setError("Không thể tải danh sách người online");
    }
  }, []);

  const loadTotalVisitors = useCallback(async () => {
    try {
      const res = await api("/api/admin/total-visitors");
      setTotalVisitors(res.totalVisitors || 0);
      setVisitorStats(res);
    } catch (e) {
      setError("Không thể tải thống kê người truy cập");
    }
  }, []);

  const loadSystemMetrics = useCallback(async () => {
    try {
      const res = await api("/api/admin/stats/system-metrics");
      if (res.success) {
        setSystemMetrics(res.metrics);
      }
    } catch (e) {
      console.error("Error loading system metrics:", e);
      // Silent fail - không cần hiển thị error cho metrics
    }
  }, []);

  // ==================== OPTIMIZED SINGLE USER LOAD ====================

  const loadSingleUser = useCallback(async (userId) => {
    try {
      const res = await api(`/api/admin/users/${userId}`);
      return res.user;
    } catch (e) {
      throw new Error("Không thể tải thông tin người dùng");
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
        loadUsers({ page: 1 }),
        loadOnlineUsers(),
        loadTotalVisitors()
      ]);
    } catch (e) {
      setError("Có lỗi khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  const updateOfflineUsers = useCallback(async () => {
    try {
      await api("/api/admin/update-offline-users", { method: "POST" });
      await loadOnlineUsers();
      return { success: true };
    } catch (e) {
      // Silent handling
      console.error("Error updating offline users:", e);
      return { success: false, error: e.message };
    }
  }, [loadOnlineUsers]);

  // ==================== WEBSOCKET SETUP ====================

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Connect to socket
    const socket = io(import.meta.env.VITE_API_URL || window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      isSocketConnected.current = true;
      // Join admin dashboard room
      socket.emit('join-admin-dashboard');
    });

    socket.on('disconnect', () => {
      isSocketConnected.current = false;
    });

    // Listen for realtime admin updates
    socket.on('admin:stats-update', (data) => {
      if (data.stats) {
        setStats(data.stats);
      }
      setLastUpdate(new Date());
    });

    // Listen for security alerts
    socket.on('security:alert', (alert) => {
      setSecurityAlerts(prev => [alert, ...prev].slice(0, 20)); // Keep last 20
    });

    socket.on('admin:online-users-update', (data) => {
      if (data.onlineUsers) {
        setOnlineUsers(data.onlineUsers);
      }
      if (data.count !== undefined) {
        // Just update count without full list
        setLastUpdate(new Date());
      }
    });

    return () => {
      socket.off('security:alert');
      socket.off('admin:stats-update');
      socket.off('admin:online-users-update');
      socket.disconnect();
      socketRef.current = null;
      isSocketConnected.current = false;
    };
  }, []);

  // ==================== EFFECTS ====================

  // Initial load only once
  useEffect(() => {
    refreshAllData();
  }, []);

  // Fallback polling (only if WebSocket not connected)
  useEffect(() => {
    let interval;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (interval) clearInterval(interval);
      } else {
        // Only poll if WebSocket not connected
        if (!isSocketConnected.current) {
          loadStats();
          loadOnlineUsers();
        }
        interval = setInterval(() => {
          if (!isSocketConnected.current) {
            loadStats();
            loadOnlineUsers();
          }
        }, 60000);
      }
    };

    if (!document.hidden) {
      interval = setInterval(() => {
        if (!isSocketConnected.current) {
          loadStats();
          loadOnlineUsers();
        }
      }, 60000);
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // System metrics polling (every 5 seconds when on online tab)
  useEffect(() => {
    let interval;

    // Chỉ poll system metrics khi đang xem tab online
    // Tab detection sẽ được handle ở component level thông qua props
    // Để tránh coupling, ta expose loadSystemMetrics và component sẽ gọi

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

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
    systemMetrics,
    lastUpdate,
    loading,
    error,

    // Security Alerts
    securityAlerts,
    dismissAlert: (id) => setSecurityAlerts(prev => prev.filter(a => a.id !== id)),

    // Pagination
    userPagination,
    userFilters,
    usersLoading,
    goToPage,
    updateUserFilters,

    // Functions
    refreshAllData,
    updateOfflineUsers,
    loadStats,
    loadUsers,
    loadOnlineUsers,
    loadTotalVisitors,
    loadSystemMetrics,
    loadSingleUser,
    updateSingleUserInState,
    clearError,
    setUsers
  };
}
