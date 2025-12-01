import { useState, useCallback } from 'react';
import { api } from '../api';

/**
 * Custom hook for admin actions (ban, unban, notifications)
 */
export function useAdminActions() {
  // ==================== STATE ====================
  
  const [banForm, setBanForm] = useState({ 
    userId: "",
    duration: "",
    reason: ""
  });
  const [notificationForm, setNotificationForm] = useState({ 
    title: "",
    message: "",
    targetRole: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // ==================== BAN ACTIONS ====================

  const banUser = useCallback(async (userId, duration, reason) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Parse duration correctly - handle "permanent" option
      let banDurationMinutes = null;
      if (duration && duration !== "permanent") {
        banDurationMinutes = parseInt(duration);
      }
      
      await api("/api/admin/ban-user", {
        method: "POST",
        body: { userId, banDurationMinutes, reason }
      });

      setSuccess(`Đã cấm người dùng ${userId} thành công`);
      setBanForm({ userId: "", duration: "", reason: "" });
      
      return true;
    } catch (e) {
      setError(`Lỗi cấm người dùng: ${e.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const unbanUser = useCallback(async (userId) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await api("/api/admin/unban-user", {
        method: "POST",
        body: { userId }
      });

      setSuccess(`Đã bỏ cấm người dùng ${userId} thành công`);
      return true;
    } catch (e) {
      setError(`Lỗi bỏ cấm người dùng: ${e.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== NOTIFICATION ACTIONS ====================

  const sendNotification = useCallback(async (title, message, targetRole) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await api("/api/admin/send-notification", {
        method: "POST",
        body: { title, message, targetRole }
      });

      setSuccess("Đã gửi thông báo thành công");
      setNotificationForm({ title: "", message: "", targetRole: "" });
      
      return true;
    } catch (e) {
      setError(`Lỗi gửi thông báo: ${e.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== FORM HANDLERS ====================

  const handleBanSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!banForm.userId || !banForm.duration || !banForm.reason) {
      setError("Vui lòng điền đầy đủ thông tin");
      return false;
    }

    return await banUser(banForm.userId, banForm.duration, banForm.reason);
  }, [banForm, banUser]);

  const handleNotificationSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!notificationForm.title || !notificationForm.message) {
      setError("Vui lòng điền đầy đủ thông tin");
      return;
    }

    await sendNotification(
      notificationForm.title, 
      notificationForm.message, 
      notificationForm.targetRole
    );
  }, [notificationForm, sendNotification]);

  // ==================== CLEAR FUNCTIONS ====================

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearSuccess = useCallback(() => {
    setSuccess(null);
  }, []);

  // ==================== RETURN ====================

  return {
    // State
    banForm,
    notificationForm,
    loading,
    error,
    success,
    
    // Setters
    setBanForm,
    setNotificationForm,
    
    // Actions
    banUser,
    unbanUser,
    sendNotification,
    
    // Form handlers
    handleBanSubmit,
    handleNotificationSubmit,
    
    // Clear functions
    clearError,
    clearSuccess
  };
}
