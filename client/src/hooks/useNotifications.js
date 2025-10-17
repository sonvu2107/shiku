import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api.js";

/**
 * Hook để lấy danh sách notifications
 * Sử dụng React Query để cache và tự động refetch
 */
export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await api("/api/notifications");
      // API trả về { notifications, total, unreadCount, page, pages }
      return response;
    },
    staleTime: 2 * 60 * 1000, // 2 phút
    gcTime: 5 * 60 * 1000, // 5 phút
    refetchInterval: 3 * 60 * 1000, // Auto refetch mỗi 3 phút
  });
}

/**
 * Hook để đếm số notifications chưa đọc
 * Refetch thường xuyên hơn để cập nhật badge
 */
export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: ["unreadNotificationsCount"],
    queryFn: async () => {
      const response = await api("/api/notifications/unread-count");
      // API trả về { unreadCount }
      return response;
    },
    staleTime: 1 * 60 * 1000, // 1 phút
    gcTime: 3 * 60 * 1000, // 3 phút
    refetchInterval: 2 * 60 * 1000, // Auto refetch mỗi 2 phút
  });
}

/**
 * Hook để mark notification as read
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId) => {
      const response = await api(`/api/notifications/${notificationId}/read`, {
        method: "PUT",
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unreadNotificationsCount"] });
    },
  });
}

/**
 * Hook để mark all notifications as read
 */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api("/api/notifications/mark-all-read", {
        method: "PUT",
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unreadNotificationsCount"] });
    },
  });
}

/**
 * Hook để delete notification
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId) => {
      const response = await api(`/api/notifications/${notificationId}`, {
        method: "DELETE",
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unreadNotificationsCount"] });
    },
  });
}
