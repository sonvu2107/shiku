import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api.js";

/**
 * Hook to fetch the friends list
 * Uses React Query for caching and automatic refetching
 */
export function useFriends() {
  return useQuery({
    queryKey: ["friends"],
    queryFn: async () => {
      const response = await api("/api/friends");
      // Optional chaining to avoid crash if response has no data
      return response?.friends ?? [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3, // Retry 3 times before showing error
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
  });
}

/**
 * Hook to fetch friend requests
 */
export function useFriendRequests() {
  return useQuery({
    queryKey: ["friendRequests"],
    queryFn: async () => {
      const response = await api("/api/friends/requests");
      // Optional chaining to avoid crash if response has no data
      return response?.requests ?? [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes (refetch more frequently)
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 3, // Retry 3 times before showing error
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
  });
}

/**
 * Hook to fetch the list of online friends
 */
export function useOnlineFriends() {
  return useQuery({
    queryKey: ["onlineFriends"],
    queryFn: async () => {
      const response = await api("/api/friends/list");
      // Filter only online friends
      // Optional chaining to avoid crash if response has no data
      const onlineFriends = (response?.friends ?? []).filter(friend => friend.isOnline === true);
      return { friends: onlineFriends };
    },
    staleTime: 1 * 60 * 1000, // 1 minute (update frequently)
    gcTime: 3 * 60 * 1000, // 3 minutes
    refetchInterval: 2 * 60 * 1000, // Auto refetch every 2 minutes
    retry: 3, // Retry 3 times before showing error
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
  });
}

/**
 * Hook to send a friend request
 */
export function useSendFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId) => {
      const response = await api(`/api/friends/request/${userId}`, {
        method: "POST",
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
    },
  });
}

/**
 * Hook to accept a friend request
 */
export function useAcceptFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId) => {
      const response = await api(`/api/friends/accept/${userId}`, {
        method: "POST",
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
      queryClient.invalidateQueries({ queryKey: ["onlineFriends"] });
    },
  });
}

/**
 * Hook to decline a friend request
 */
export function useDeclineFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId) => {
      const response = await api(`/api/friends/decline/${userId}`, {
        method: "POST",
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
    },
  });
}

/**
 * Hook to remove a friend
 */
export function useRemoveFriend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId) => {
      const response = await api(`/api/friends/remove/${userId}`, {
        method: "DELETE",
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["onlineFriends"] });
    },
  });
}
