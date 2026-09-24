/**
 * EntityCommentList component
 * Generic, reusable comment list for one entity (entity_type + entity_id), backed
 * by the real comments API. Any module embeds real, threaded, author-authorized
 * comments by rendering this with its own entity_type/entity_id — no per-module
 * comment storage or API needed.
 */

import { useMemo } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useHasPermission } from "~/hooks/usePermissions";
import { showToast } from "~/components/common/Toast";
import { CommentThread } from "./CommentThread";
import { CommentForm } from "./CommentForm";
import {
  useComments,
  useCreateComment,
  useCreateCommentWithAttachment,
  useUpdateComment,
  useDeleteComment,
} from "~/features/comments/hooks/useComments";
import type {
  Comment,
  CommentThread as CommentThreadType,
} from "~/features/comments/types/comment.types";

interface EntityCommentListProps {
  entityType: string;
  entityId: string;
  showTitle?: boolean;
  // Gated by the consuming module's own comments_attachments_enabled
  // tenant config — false by default, no attach affordance renders unless
  // the caller explicitly opts in.
  attachmentsEnabled?: boolean;
}

/** GET /comments returns every comment for the entity flat (parents and
 * replies mixed together) — group them client-side so replies nest under
 * their parent instead of rendering as their own separate top-level thread. */
function groupIntoThreads(comments: Comment[]): CommentThreadType[] {
  const repliesByParent = new Map<string, Comment[]>();
  const topLevel: Comment[] = [];

  for (const comment of comments) {
    if (comment.parent_id) {
      const existing = repliesByParent.get(comment.parent_id) ?? [];
      existing.push(comment);
      repliesByParent.set(comment.parent_id, existing);
    } else {
      topLevel.push(comment);
    }
  }

  return topLevel.map((comment) => {
    const replies = repliesByParent.get(comment.id) ?? [];
    return { comment, replies, total_replies: replies.length };
  });
}

export function EntityCommentList({
  entityType,
  entityId,
  showTitle = true,
  attachmentsEnabled = false,
}: EntityCommentListProps) {
  const { t } = useTranslation();
  const canCreate = useHasPermission("comments.create");
  const { data, isLoading, refetch } = useComments({
    entity_type: entityType,
    entity_id: entityId,
  });
  const createCommentMutation = useCreateComment();
  const createCommentWithAttachmentMutation = useCreateCommentWithAttachment();
  const updateCommentMutation = useUpdateComment();
  const deleteCommentMutation = useDeleteComment();

  const comments = useMemo(() => data?.data ?? [], [data?.data]);
  const threads = useMemo(() => groupIntoThreads(comments), [comments]);

  // No file staged -> byte-for-byte the same call as before (zero extra
  // work). A staged file routes through the composite endpoint instead;
  // the comment always succeeds there too, so a "failed" attachment_status
  // surfaces as a toast, not a mutation error.
  const submitComment = (
    content: string,
    file: File | undefined,
    parentId?: string
  ) => {
    if (file) {
      createCommentWithAttachmentMutation.mutate(
        {
          payload: {
            entity_type: entityType,
            entity_id: entityId,
            content,
            parent_id: parentId,
          },
          file,
        },
        {
          onSuccess: (response) => {
            if (response.data.attachment_status === "failed") {
              showToast(t("comments.attachment.failedToast"), "error");
            }
          },
        }
      );
      return;
    }

    createCommentMutation.mutate({
      entity_type: entityType,
      entity_id: entityId,
      content,
      parent_id: parentId,
    });
  };

  const handleCreate = (content: string, file?: File) => {
    submitComment(content, file);
  };

  const handleReply = (parentId: string, content: string, file?: File) => {
    submitComment(content, file, parentId);
  };

  const handleEdit = (commentId: string, content: string) => {
    updateCommentMutation.mutate({ id: commentId, payload: { content } });
  };

  const handleDelete = (commentId: string) => {
    deleteCommentMutation.mutate(commentId);
  };

  return (
    <Card>
      {showTitle && (
        <CardHeader>
          <CardTitle>{t("comments.title")}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary" />
            <span>{t("comments.status.loading")}</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            {t("comments.list.empty")}
          </div>
        ) : (
          <div className="space-y-4">
            {threads.map((thread) => (
              <CommentThread
                key={thread.comment.id}
                thread={thread}
                onReply={handleReply}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onRefresh={() => void refetch()}
                attachmentsEnabled={attachmentsEnabled}
              />
            ))}
          </div>
        )}

        {canCreate && (
          <CommentForm
            onSubmit={handleCreate}
            loading={
              createCommentMutation.isPending ||
              createCommentWithAttachmentMutation.isPending
            }
            attachmentsEnabled={attachmentsEnabled}
          />
        )}
      </CardContent>
    </Card>
  );
}
