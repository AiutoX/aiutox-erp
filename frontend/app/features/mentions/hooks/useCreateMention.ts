/**
 * React Query hook for mention mutations.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createMention,
  resolveMention,
  deleteMention,
} from "../api/mentions.api";
import type {
  CreateMentionPayload,
  ResolveMentionPayload,
} from "../types/mention.types";

const MENTIONS_QUERY_KEY = ["mentions"];

/**
 * Hook to create a mention.
 */
export function useCreateMention() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateMentionPayload) => createMention(payload),
    onSuccess: () => {
      // Invalidate mentions queries to refetch
      queryClient.invalidateQueries({
        queryKey: MENTIONS_QUERY_KEY,
      });
    },
  });
}

/**
 * Hook to resolve a mention (mark as read).
 */
export function useResolveMention() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      mentionId,
      payload,
    }: {
      mentionId: string;
      payload: ResolveMentionPayload;
    }) => resolveMention(mentionId, payload),
    onSuccess: () => {
      // Invalidate mentions queries to refetch
      queryClient.invalidateQueries({
        queryKey: MENTIONS_QUERY_KEY,
      });
    },
  });
}

/**
 * Hook to delete a mention.
 */
export function useDeleteMention() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (mentionId: string) => deleteMention(mentionId),
    onSuccess: () => {
      // Invalidate mentions queries to refetch
      queryClient.invalidateQueries({
        queryKey: MENTIONS_QUERY_KEY,
      });
    },
  });
}

/**
 * Hook to bulk resolve mentions (mark multiple as read).
 */
export function useBulkResolveMentions() {
  const queryClient = useQueryClient();
  const resolveMutation = useResolveMention();

  return useMutation({
    mutationFn: async (mentionIds: string[]) => {
      const results = await Promise.allSettled(
        mentionIds.map((id) =>
          resolveMutation.mutateAsync({
            mentionId: id,
            payload: { resolved: true },
          })
        )
      );
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: MENTIONS_QUERY_KEY,
      });
    },
  });
}

/**
 * Hook to bulk delete mentions.
 */
export function useBulkDeleteMentions() {
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteMention();

  return useMutation({
    mutationFn: async (mentionIds: string[]) => {
      const results = await Promise.allSettled(
        mentionIds.map((id) => deleteMutation.mutateAsync(id))
      );
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: MENTIONS_QUERY_KEY,
      });
    },
  });
}
