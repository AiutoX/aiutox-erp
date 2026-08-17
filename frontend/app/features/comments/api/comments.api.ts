/**
 * Comments API functions
 * Provides API integration for comments module
 * Following frontend-api.md rules
 */

import apiClient from "~/lib/api/client";
import type {
  StandardResponse,
  StandardListResponse,
} from "~/lib/api/types/common.types";
import type {
  Comment,
  CommentCreate,
  CommentUpdate,
  CommentAttachment,
  CommentAttachmentCreate,
  CommentFilters,
  CommentMention,
  CommentMentionFilters,
  CommentRevision,
  CommentWithAttachmentResult,
} from "~/features/comments/types/comment.types";

// Comments API functions

/**
 * List comments with pagination and filters
 * GET /api/v1/comments
 *
 * Requires: comments.view permission
 */
export async function listComments(
  params?: CommentFilters
): Promise<StandardListResponse<Comment>> {
  const response = await apiClient.get<StandardListResponse<Comment>>(
    "/comments",
    {
      params: {
        page: params?.page || 1,
        page_size: params?.page_size || 20,
        entity_type: params?.entity_type,
        entity_id: params?.entity_id,
        parent_id: params?.parent_id,
        created_by: params?.created_by,
        mentions: params?.mentions,
      },
    }
  );
  return response.data;
}

/**
 * Get comment by ID
 * GET /api/v1/comments/{id}
 *
 * Requires: comments.view permission
 */
export async function getComment(
  id: string
): Promise<StandardResponse<Comment>> {
  const response = await apiClient.get<StandardResponse<Comment>>(
    `/comments/${id}`
  );
  return response.data;
}

/**
 * Get a comment's direct replies (one level, not deeply nested)
 * GET /api/v1/comments/{id}/thread
 *
 * Requires: comments.view permission
 */
export async function getCommentThread(
  id: string
): Promise<StandardListResponse<Comment>> {
  const response = await apiClient.get<StandardListResponse<Comment>>(
    `/comments/${id}/thread`
  );
  return response.data;
}

/**
 * Create new comment
 * POST /api/v1/comments
 *
 * Requires: comments.create permission
 */
export async function createComment(
  payload: CommentCreate
): Promise<StandardResponse<Comment>> {
  const response = await apiClient.post<StandardResponse<Comment>>(
    "/comments",
    payload
  );
  return response.data;
}

/**
 * Create a comment with an optional attached file, in one request.
 * POST /api/v1/comments/with-attachment (multipart/form-data)
 *
 * The comment always succeeds if this resolves — check attachment_status
 * on the result for whether the file itself was actually attached.
 *
 * Requires: comments.create permission
 */
export async function createCommentWithAttachment(
  payload: CommentCreate,
  file: File
): Promise<StandardResponse<CommentWithAttachmentResult>> {
  const formData = new FormData();
  formData.append("entity_type", payload.entity_type);
  formData.append("entity_id", payload.entity_id);
  formData.append("content", payload.content);
  if (payload.parent_id) {
    formData.append("parent_id", payload.parent_id);
  }
  formData.append("file", file);

  const response = await apiClient.post<
    StandardResponse<CommentWithAttachmentResult>
  >("/comments/with-attachment", formData);
  return response.data;
}

/**
 * Update existing comment
 * PUT /api/v1/comments/{id}
 *
 * Requires: comments.edit permission
 */
export async function updateComment(
  id: string,
  payload: CommentUpdate
): Promise<StandardResponse<Comment>> {
  const response = await apiClient.put<StandardResponse<Comment>>(
    `/comments/${id}`,
    payload
  );
  return response.data;
}

/**
 * Get a comment's revision history (CMT-008)
 * GET /api/v1/comments/{id}/revisions
 *
 * Requires: comments.manage permission — moderation/accountability
 * visibility only, never shown to the comment's own author.
 */
export async function getCommentRevisions(
  id: string
): Promise<StandardListResponse<CommentRevision>> {
  const response = await apiClient.get<StandardListResponse<CommentRevision>>(
    `/comments/${id}/revisions`
  );
  return response.data;
}

/**
 * Delete comment (soft delete)
 * DELETE /api/v1/comments/{id}
 *
 * Requires: comments.delete permission
 */
export async function deleteComment(
  id: string
): Promise<StandardResponse<null>> {
  const response = await apiClient.delete<StandardResponse<null>>(
    `/comments/${id}`
  );
  return response.data;
}

// Comment Attachments API functions

/**
 * Upload attachment to comment
 * POST /api/v1/comments/{id}/attachments
 *
 * Requires: comments.create permission
 */
export async function uploadAttachment(
  id: string,
  payload: CommentAttachmentCreate
): Promise<StandardResponse<CommentAttachment>> {
  const response = await apiClient.post<StandardResponse<CommentAttachment>>(
    `/comments/${id}/attachments`,
    payload
  );
  return response.data;
}

/**
 * Delete attachment from comment
 * DELETE /api/v1/comments/{id}/attachments/{attachment_id}
 *
 * Requires: comments.delete permission
 */
export async function deleteAttachment(
  id: string,
  attachmentId: string
): Promise<StandardResponse<null>> {
  const response = await apiClient.delete<StandardResponse<null>>(
    `/comments/${id}/attachments/${attachmentId}`
  );
  return response.data;
}

// Comment Mentions API functions

/**
 * List mentions for a user
 * GET /api/v1/comments/mentions
 *
 * Requires: comments.view permission
 */
export async function listMentions(
  params?: CommentMentionFilters
): Promise<StandardListResponse<CommentMention>> {
  // GET /comments/mentions always scopes to the authenticated caller server-side —
  // there is no user_id filter param (mentions of another user aren't this user's
  // to read).
  const response = await apiClient.get<StandardListResponse<CommentMention>>(
    "/comments/mentions",
    {
      params: {
        page: params?.page || 1,
        page_size: params?.page_size || 20,
      },
    }
  );
  return response.data;
}
