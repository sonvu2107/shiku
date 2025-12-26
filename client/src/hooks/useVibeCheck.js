/**
 * useVibeCheck Hook
 * 
 * React Query hooks cho Vibe Check feature
 * - Fetch today's vibe check
 * - Vote for an option
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api.js";

/**
 * Fetch vibe check hôm nay
 */
export function useVibeCheck() {
    return useQuery({
        queryKey: ["vibecheck", "today"],
        queryFn: async () => {
            const response = await api("/api/vibecheck/today");
            return response;
        },
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes
        retry: 2,
    });
}

/**
 * Vote cho 1 option
 */
export function useVibeCheckVote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (optionId) => {
            const response = await api("/api/vibecheck/vote", {
                method: "POST",
                body: { optionId },
            });
            return response;
        },
        // Optimistic update
        onMutate: async (optionId) => {
            await queryClient.cancelQueries({ queryKey: ["vibecheck", "today"] });

            const previous = queryClient.getQueryData(["vibecheck", "today"]);

            // Optimistically update the vote
            queryClient.setQueryData(["vibecheck", "today"], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    hasVoted: true,
                    userChoice: optionId,
                    totalVotes: old.totalVotes + 1,
                    options: old.options.map((opt) => ({
                        ...opt,
                        votes: opt.id === optionId ? opt.votes + 1 : opt.votes,
                    })),
                };
            });

            return { previous };
        },
        onError: (_err, _optionId, context) => {
            if (context?.previous) {
                queryClient.setQueryData(["vibecheck", "today"], context.previous);
            }
        },
        onSettled: () => {
            // Refetch to get accurate percentages
            queryClient.invalidateQueries({ queryKey: ["vibecheck", "today"] });
        },
    });
}

/**
 * Fetch lịch sử vibe check của user
 */
export function useVibeCheckHistory(limit = 7) {
    return useQuery({
        queryKey: ["vibecheck", "history", limit],
        queryFn: async () => {
            const response = await api(`/api/vibecheck/history?limit=${limit}`);
            return response;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });
}
