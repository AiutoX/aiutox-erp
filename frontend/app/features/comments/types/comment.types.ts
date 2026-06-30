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
  created_by: string;
  mentions: string[];
  attachments: CommentAttachment[];
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
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
