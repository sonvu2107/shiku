import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api.js";

/**
 * Hook to fetch the notifications list
 * Uses React Query for caching and automatic refetching
 */
export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await api("/api/notifications");
      // API returns { notifications, total, unreadCount, page, pages }
      return response;
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    // Removed refetchInterval to prevent overwriting optimistic updates
    retry: 3, // Retry 3 times before showing error
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
  });
}

/**
 * Hook to fetch unread notifications count
 * Refetch more frequently to keep the UI badge updated
 */
export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: ["unreadNotificationsCount"],
    queryFn: async () => {
      const response = await api("/api/notifications/unread-count");
      // API returns { unreadCount }
      return response;
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    // Removed refetchInterval to prevent overwriting optimistic updates
    retry: 3, // Retry 3 times before showing error
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
  });
}

/**
 * Hook to mark a notification as read
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
    // Optimistic update - UI phản hồi ngay lập tức
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      await queryClient.cancelQueries({ queryKey: ["unreadNotificationsCount"] });

      const previousNotifications = queryClient.getQueryData(["notifications"]);
      const previousUnreadCount = queryClient.getQueryData(["unreadNotificationsCount"]);

      // Optimistically mark the notification as read
      queryClient.setQueryData(["notifications"], (old) => {
        if (!old?.notifications) return old;
        return {
          ...old,
          notifications: old.notifications.map((n) =>
            n._id === notificationId ? { ...n, read: true } : n
          ),
        };
      });

      // Optimistically decrement unread count
      queryClient.setQueryData(["unreadNotificationsCount"], (old) => {
        if (!old) return old;
        return { unreadCount: Math.max(0, (old.unreadCount || 0) - 1) };
      });

      return { previousNotifications, previousUnreadCount };
    },
    onError: (_err, _notificationId, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(["notifications"], context.previousNotifications);
      }
      if (context?.previousUnreadCount) {
        queryClient.setQueryData(["unreadNotificationsCount"], context.previousUnreadCount);
      }
    },
    onSettled: () => {
      // Delay invalidation to let backend cache invalidate first
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        queryClient.invalidateQueries({ queryKey: ["unreadNotificationsCount"] });
      }, 500);
    },
  });
}

/**
 * Hook to mark all notifications as read
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
    // Optimistic update - UI phản hồi ngay lập tức
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      await queryClient.cancelQueries({ queryKey: ["unreadNotificationsCount"] });

      // Snapshot previous values for rollback
      const previousNotifications = queryClient.getQueryData(["notifications"]);
      const previousUnreadCount = queryClient.getQueryData(["unreadNotificationsCount"]);

      // Optimistically update unreadCount to 0
      queryClient.setQueryData(["unreadNotificationsCount"], { unreadCount: 0 });

      // Optimistically mark all notifications as read
      queryClient.setQueryData(["notifications"], (old) => {
        if (!old?.notifications) return old;
        return {
          ...old,
          notifications: old.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        };
      });

      // Return context with snapshots for rollback
      return { previousNotifications, previousUnreadCount };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(["notifications"], context.previousNotifications);
      }
      if (context?.previousUnreadCount) {
        queryClient.setQueryData(["unreadNotificationsCount"], context.previousUnreadCount);
      }
    },
    onSuccess: () => {
      // Don't refetch immediately - let optimistic update persist
      // Backend cache has been invalidated by the API route
      // If we refetch too soon, we might get stale data
    },
    onSettled: () => {
      // Delay invalidation to let backend cache invalidate first
      // This prevents fetching stale cached data immediately after mutation
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        queryClient.invalidateQueries({ queryKey: ["unreadNotificationsCount"] });
      }, 500); // 500ms delay
    },
  });
}

/**
 * Hook to delete a notification
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
    // Optimistic update - xóa ngay khỏi UI
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      await queryClient.cancelQueries({ queryKey: ["unreadNotificationsCount"] });

      const previousNotifications = queryClient.getQueryData(["notifications"]);
      const previousUnreadCount = queryClient.getQueryData(["unreadNotificationsCount"]);

      // Find the notification to check if it was unread
      const targetNotification = previousNotifications?.notifications?.find(
        (n) => n._id === notificationId
      );
      const wasUnread = targetNotification && !targetNotification.read;

      // Optimistically remove the notification
      queryClient.setQueryData(["notifications"], (old) => {
        if (!old?.notifications) return old;
        return {
          ...old,
          notifications: old.notifications.filter((n) => n._id !== notificationId),
          total: Math.max(0, (old.total || 0) - 1),
        };
      });

      // Optimistically decrement unread count if the deleted notification was unread
      if (wasUnread) {
        queryClient.setQueryData(["unreadNotificationsCount"], (old) => {
          if (!old) return old;
          return { unreadCount: Math.max(0, (old.unreadCount || 0) - 1) };
        });
      }

      return { previousNotifications, previousUnreadCount };
    },
    onError: (_err, _notificationId, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(["notifications"], context.previousNotifications);
      }
      if (context?.previousUnreadCount) {
        queryClient.setQueryData(["unreadNotificationsCount"], context.previousUnreadCount);
      }
    },
    onSettled: () => {
      // Delay invalidation to let backend cache invalidate first
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        queryClient.invalidateQueries({ queryKey: ["unreadNotificationsCount"] });
      }, 500);
    },
  });
}
