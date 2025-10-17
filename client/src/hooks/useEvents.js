import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api.js";

/**
 * Hook để lấy danh sách events của user
 * @param {Object} options - Query options
 * @param {string} options.filter - Filter type: 'my', 'joined', 'upcoming', 'past'
 * @param {number} options.limit - Số lượng events giới hạn
 */
export function useMyEvents(options = {}) {
  const { filter = 'my', limit = 10 } = options;
  
  return useQuery({
    queryKey: ["myEvents", filter, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter) params.append('filter', filter);
      if (limit) params.append('limit', limit);
      
      const response = await api(`/api/events?${params.toString()}`);
      // Optional chaining để tránh crash nếu response không có data
      return response?.events ?? [];
    },
    staleTime: 5 * 60 * 1000, // 5 phút
    gcTime: 10 * 60 * 1000, // 10 phút
  });
}

/**
 * Hook để lấy chi tiết một event
 * @param {string} eventId - ID của event
 */
export function useEvent(eventId) {
  return useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const response = await api(`/api/events/${eventId}`);
      // Optional chaining để tránh crash nếu response không có data
      return response?.event ?? null;
    },
    enabled: !!eventId, // Chỉ fetch khi có eventId
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook để tạo event mới
 */
export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventData) => {
      const response = await api("/api/events", {
        method: "POST",
        body: JSON.stringify(eventData),
      });
      return response;
    },
    onSuccess: () => {
      // Invalidate tất cả các queries liên quan đến events
      queryClient.invalidateQueries({ queryKey: ["myEvents"] });
    },
  });
}

/**
 * Hook để update event
 */
export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, eventData }) => {
      const response = await api(`/api/events/${eventId}`, {
        method: "PUT",
        body: JSON.stringify(eventData),
      });
      return response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["event", variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ["myEvents"] });
    },
  });
}

/**
 * Hook để delete event
 */
export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId) => {
      const response = await api(`/api/events/${eventId}`, {
        method: "DELETE",
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myEvents"] });
    },
  });
}

/**
 * Hook để join event
 */
export function useJoinEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId) => {
      const response = await api(`/api/events/${eventId}/join`, {
        method: "POST",
      });
      return response;
    },
    onSuccess: (data, eventId) => {
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["myEvents"] });
    },
  });
}

/**
 * Hook để leave event
 */
export function useLeaveEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId) => {
      const response = await api(`/api/events/${eventId}/leave`, {
        method: "POST",
      });
      return response;
    },
    onSuccess: (data, eventId) => {
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["myEvents"] });
    },
  });
}
