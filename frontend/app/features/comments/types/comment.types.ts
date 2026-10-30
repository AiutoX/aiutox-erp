/**
 * Comments types for AiutoX ERP
 * Based on docs/40-modules/comments.md
 */

// Comment types
export interface Comment {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  parent_id: string | null;
  content: string;
  // Nullable: backend CommentResponse.created_by is UUID | None (author's user
  // row can be gone by the time a comment is read; FK is ON DELETE SET NULL).
  created_by: string | null;
  // mentions: not returned by GET/POST /comments — mentions live in a separate
  // comment_mentions table, never inlined onto CommentResponse.
  mentions?: string[];
  // attachments: returned inline on CommentResponse (backend eager-reads the
  // Comment.attachments relationship), defaults to [] when there are none.
  attachments?: CommentAttachment[];
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  // Computed server-side (ownership + comments.manage + the per-tenant
  // edit/delete time window, CMT-009) — single source of truth for whether
  // the requesting user can edit/delete this comment right now. Do not
  // re-derive this client-side (e.g. from created_by === currentUserId alone)
  // since that would miss the time-window expiry the backend already knows.
  can_edit: boolean;
  can_delete: boolean;
}

// Comment creation payload
export interface CommentCreate {
  entity_type: string;
  entity_id: string;
  content: string;
  parent_id?: string | null;
  mentions?: string[];
  attachments?: CommentAttachmentCreate[];
}

// Comment update payload
export interface CommentUpdate {
  content?: string;
  mentions?: string[];
  attachments?: CommentAttachmentCreate[];
}

// Comment attachment
export interface CommentAttachment {
  id: string;
  comment_id: string;
  file_id: string;
  created_at: string;
}

// Comment attachment creation payload
export interface CommentAttachmentCreate {
  file_id: string;
}

// Result of POST /comments/with-attachment — the comment always succeeds if
// this is returned at all; only attachment_status can independently fail.
export interface CommentWithAttachmentResult {
  comment: Comment;
  attachment_status: "success" | "failed" | "skipped";
  attachment_error: string | null;
}

// Comment filters for listing
export interface CommentFilters {
  entity_type?: string;
  entity_id?: string;
  parent_id?: string | null;
  created_by?: string;
  mentions?: string[];
  page?: number;
  page_size?: number;
}

// Comment mention
export interface CommentMention {
  id: string;
  comment_id: string;
  user_id: string;
  user_name: string;
  created_at: string;
}

// Comment revision (CMT-008 — comments.manage only, never the comment's own author)
export interface CommentRevision {
  id: string;
  comment_id: string;
  content: string;
  edited_by: string | null;
  created_at: string;
}

// Comment mention filters
export interface CommentMentionFilters {
  user_id?: string;
  page?: number;
  page_size?: number;
}

// Comment thread (comment with replies)
export interface CommentThread {
  comment: Comment;
  replies: Comment[];
  total_replies: number;
}

// Comment statistics
export interface CommentStats {
  total_comments: number;
  total_threads: number;
  total_mentions: number;
  recent_comments: number;
}
