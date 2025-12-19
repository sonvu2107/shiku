import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api.js";

/**
 * Hook to fetch the user's list of events
 * @param {Object} options - Query options
 * @param {string} options.filter - Filter type: 'my', 'joined', 'upcoming', 'past'
 * @param {number} options.limit - Maximum number of events
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
      // Optional chaining to avoid crash if response has no data
      return response?.events ?? [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3, // Retry 3 times before showing error
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
  });
}

/**
 * Hook to fetch the details of an event
 * @param {string} eventId - Event ID
 */
export function useEvent(eventId) {
  return useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const response = await api(`/api/events/${eventId}`);
      // Optional chaining to avoid crash if response has no data
      return response?.event ?? null;
    },
    enabled: !!eventId, // Only fetch when eventId is present
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 3, // Retry 3 times before showing error
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
  });
}

/**
 * Hook to create a new event
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
      // Invalidate all queries related to events
      queryClient.invalidateQueries({ queryKey: ["myEvents"] });
    },
  });
}

/**
 * Hook to update an event
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
 * Hook to delete an event
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
 * Hook to join an event
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
 * Hook to leave an event
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
