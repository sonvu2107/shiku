import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api.js";

/**
 * Hook để lấy danh sách bạn bè
 * Sử dụng React Query để cache và tự động refetch
 */
export function useFriends() {
  return useQuery({
    queryKey: ["friends"],
    queryFn: async () => {
      const response = await api("/api/friends");
      // Optional chaining để tránh crash nếu response không có data
      return response?.friends ?? [];
    },
    staleTime: 5 * 60 * 1000, // 5 phút
    gcTime: 10 * 60 * 1000, // 10 phút
  });
}

/**
 * Hook để lấy danh sách friend requests
 */
export function useFriendRequests() {
  return useQuery({
    queryKey: ["friendRequests"],
    queryFn: async () => {
      const response = await api("/api/friends/requests");
      // Optional chaining để tránh crash nếu response không có data
      return response?.requests ?? [];
    },
    staleTime: 2 * 60 * 1000, // 2 phút (cập nhật thường xuyên hơn)
    gcTime: 5 * 60 * 1000, // 5 phút
  });
}

/**
 * Hook để lấy danh sách bạn bè online
 */
export function useOnlineFriends() {
  return useQuery({
    queryKey: ["onlineFriends"],
    queryFn: async () => {
      const response = await api("/api/friends/list");
      // Filter chỉ những bạn bè online
      // Optional chaining để tránh crash nếu response không có data
      const onlineFriends = (response?.friends ?? []).filter(friend => friend.isOnline === true);
      return { friends: onlineFriends };
    },
    staleTime: 1 * 60 * 1000, // 1 phút (cập nhật thường xuyên)
    gcTime: 3 * 60 * 1000, // 3 phút
    refetchInterval: 2 * 60 * 1000, // Auto refetch mỗi 2 phút
  });
}

/**
 * Hook để gửi friend request
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
 * Hook để accept friend request
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
 * Hook để decline friend request
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
 * Hook để remove friend
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
