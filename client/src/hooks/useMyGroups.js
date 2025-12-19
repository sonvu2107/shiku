import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api.js";

/**
 * Hook to fetch the current user's groups
 * Uses React Query for caching and automatic refetching
 */
export function useMyGroups() {
  return useQuery({
    queryKey: ["myGroups"],
    queryFn: async () => {
      const response = await api("/api/groups/my-groups");
      // Optional chaining to avoid crash if response has no data
      return {
        ...response,
        data: response?.data ?? { groups: [] },
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3, // Retry 3 times before showing error
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
  });
}

/**
 * Hook to create a new group
 * Automatically invalidates cache after successful creation
 */
export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupData) => {
      const response = await api("/api/groups", {
        method: "POST",
        body: JSON.stringify(groupData),
      });
      return response;
    },
    onSuccess: () => {
      // Invalidate and refetch groups list
      queryClient.invalidateQueries({ queryKey: ["myGroups"] });
    },
  });
}

/**
 * Hook to join a group
 * Automatically invalidates cache after successful join
 */
export function useJoinGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId) => {
      const response = await api(`/api/groups/${groupId}/join`, {
        method: "POST",
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myGroups"] });
    },
  });
}

/**
 * Hook to leave a group
 * Automatically invalidates cache after successful leave
 */
export function useLeaveGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId) => {
      const response = await api(`/api/groups/${groupId}/leave`, {
        method: "POST",
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myGroups"] });
    },
  });
}
