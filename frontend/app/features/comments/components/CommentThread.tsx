/**
 * CommentThread component
 * Displays a thread of comments with replies
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { CommentItem } from "./CommentItem";
import { CommentForm } from "./CommentForm";
import { type CommentThread as CommentThreadType } from "~/features/comments/types/comment.types";

interface CommentThreadProps {
  thread: CommentThreadType;
  loading?: boolean;
  onReply?: (parentId: string, content: string, file?: File) => void;
  onEdit?: (commentId: string, content: string) => void;
  onDelete?: (commentId: string) => void;
  onRefresh?: () => void;
  attachmentsEnabled?: boolean;
}

export function CommentThread({
  thread,
  loading,
  onReply,
  onEdit,
  onDelete,
  onRefresh,
  attachmentsEnabled = false,
}: CommentThreadProps) {
  const { t } = useTranslation();
  const [showReplyForm, setShowReplyForm] = useState(false);

  const handleReply = (content: string, file?: File) => {
    if (onReply) {
      onReply(thread.comment.id, content, file);
      setShowReplyForm(false);
    }
  };

  const handleEdit = (commentId: string, content: string) => {
    if (onEdit) {
      onEdit(commentId, content);
    }
  };

  const handleDelete = (commentId: string) => {
    if (onDelete) {
      onDelete(commentId);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary" />
            <span>{t("comments.status.loading")}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // A soft-deleted comment with zero replies has nothing depending on its
  // visibility — omit it entirely rather than showing an empty placeholder
  // (CMT-007). Only a deleted comment that still has live replies needs a
  // placeholder, so those replies don't appear to hang under a vanished parent.
  if (thread.comment.is_deleted && thread.replies.length === 0) {
    return null;
  }

  const isDeletedPlaceholder = thread.comment.is_deleted && thread.replies.length > 0;

  return (
    <div className="space-y-4">
      {/* Main comment */}
      <CommentItem
        comment={thread.comment}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onReply={() => setShowReplyForm(true)}
        isDeletedPlaceholder={isDeletedPlaceholder}
      />

      {/* Reply form */}
      {showReplyForm && (
        <div className="ml-12">
          <CommentForm
            onSubmit={handleReply}
            onCancel={() => setShowReplyForm(false)}
            placeholder={t("comments.reply.placeholder")}
            buttonText={t("comments.reply.submit")}
            attachmentsEnabled={attachmentsEnabled}
          />
        </div>
      )}

      {/* Replies */}
      {thread.replies.length > 0 && (
        <div className="ml-12 space-y-3">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span>
              {thread.total_replies} {t("comments.reply.title")}
            </span>
            {thread.total_replies > thread.replies.length && (
              <Button
                variant="link"
                size="sm"
                onClick={onRefresh}
                className="h-auto p-0 text-xs"
              >
                {t("comments.reply.loadMore")}
              </Button>
            )}
          </div>

          {thread.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onReply={() => setShowReplyForm(true)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
