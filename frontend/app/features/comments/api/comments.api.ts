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
  const response = await apiClient.get<StandardListResponse<CommentMention>>(
    "/comments/mentions",
    {
      params: {
        page: params?.page || 1,
        page_size: params?.page_size || 20,
        user_id: params?.user_id,
      },
    }
  );
  return response.data;
}
