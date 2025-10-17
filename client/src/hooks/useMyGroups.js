import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api.js";

/**
 * Hook để lấy danh sách groups của user hiện tại
 * Sử dụng React Query để cache và tự động refetch
 */
export function useMyGroups() {
  return useQuery({
    queryKey: ["myGroups"],
    queryFn: async () => {
      const response = await api("/api/groups/my-groups");
      // Optional chaining để tránh crash nếu response không có data
      return {
        ...response,
        data: response?.data ?? { groups: [] },
      };
    },
    staleTime: 5 * 60 * 1000, // 5 phút
    gcTime: 10 * 60 * 1000, // 10 phút
  });
}

/**
 * Hook để tạo group mới
 * Tự động invalidate cache sau khi tạo thành công
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
      // Invalidate và refetch groups list
      queryClient.invalidateQueries({ queryKey: ["myGroups"] });
    },
  });
}

/**
 * Hook để join group
 * Tự động invalidate cache sau khi join thành công
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
 * Hook để leave group
 * Tự động invalidate cache sau khi leave thành công
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
