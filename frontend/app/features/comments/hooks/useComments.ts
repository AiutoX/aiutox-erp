/**
 * Comments hooks
 * Provides TanStack Query hooks for comments module
 * Following frontend-api.md rules
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listComments,
  getComment,
  createComment,
  updateComment,
  deleteComment,
  uploadAttachment,
  deleteAttachment,
  listMentions,
} from "~/features/comments/api/comments.api";
import type {
  CommentUpdate,
  CommentFilters,
  CommentAttachmentCreate,
  CommentMentionFilters,
} from "~/features/comments/types/comment.types";

// Comments Query hooks
export function useComments(params?: CommentFilters) {
  return useQuery({
    queryKey: ["comments", params],
    queryFn: () => listComments(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
}

export function useComment(id: string) {
  return useQuery({
    queryKey: ["comments", id],
    queryFn: () => getComment(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    enabled: !!id,
  });
}

// Comments Mutation hooks
export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createComment,
    onSuccess: () => {
      // Invalidate comments list queries
      queryClient.invalidateQueries({ queryKey: ["comments"] });
    },
    onError: (error) => {
      console.error("Failed to create comment:", error);
    },
  });
}

export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CommentUpdate }) =>
      updateComment(id, payload),
    onSuccess: (_, variables) => {
      // Invalidate specific comment and list queries
      queryClient.invalidateQueries({ queryKey: ["comments", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["comments"] });
    },
    onError: (error) => {
      console.error("Failed to update comment:", error);
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteComment,
    onSuccess: () => {
      // Invalidate comments list queries
      queryClient.invalidateQueries({ queryKey: ["comments"] });
    },
    onError: (error) => {
      console.error("Failed to delete comment:", error);
    },
  });
}

// Comment Attachments hooks
export function useCommentAttachments() {
  const queryClient = useQueryClient();

  const upload = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: CommentAttachmentCreate;
    }) => uploadAttachment(id, payload),
    onSuccess: (_, variables) => {
      // Invalidate specific comment query
      queryClient.invalidateQueries({ queryKey: ["comments", variables.id] });
    },
    onError: (error) => {
      console.error("Failed to upload attachment:", error);
    },
  });

  const remove = useMutation({
    mutationFn: ({ id, attachmentId }: { id: string; attachmentId: string }) =>
      deleteAttachment(id, attachmentId),
    onSuccess: (_, variables) => {
      // Invalidate specific comment query
      queryClient.invalidateQueries({ queryKey: ["comments", variables.id] });
    },
    onError: (error) => {
      console.error("Failed to delete attachment:", error);
    },
  });

  return {
    upload,
    remove,
  };
}

// Comment Mentions hooks
export function useMentions(params?: CommentMentionFilters) {
  return useQuery({
    queryKey: ["mentions", params],
    queryFn: () => listMentions(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
}
