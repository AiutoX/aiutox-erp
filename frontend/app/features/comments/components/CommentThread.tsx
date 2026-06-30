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
  onReply?: (parentId: string, content: string) => void;
  onEdit?: (commentId: string, content: string) => void;
  onDelete?: (commentId: string) => void;
  onRefresh?: () => void;
}

export function CommentThread({
  thread,
  loading,
  onReply,
  onEdit,
  onDelete,
  onRefresh,
}: CommentThreadProps) {
  const { t } = useTranslation();
  const [showReplyForm, setShowReplyForm] = useState(false);

  const handleReply = (content: string) => {
    if (onReply) {
      onReply(thread.comment.id, content);
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
            <span>{t("comments.loading")}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main comment */}
      <CommentItem
        comment={thread.comment}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onReply={() => setShowReplyForm(true)}
      />

      {/* Reply form */}
      {showReplyForm && (
        <div className="ml-12">
          <CommentForm
            onSubmit={handleReply}
            onCancel={() => setShowReplyForm(false)}
            placeholder={t("comments.reply.placeholder")}
            buttonText={t("comments.reply.submit")}
          />
        </div>
      )}

      {/* Replies */}
      {thread.replies.length > 0 && (
        <div className="ml-12 space-y-3">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span>
              {thread.total_replies} {t("comments.replies.count")}
            </span>
            {thread.total_replies > thread.replies.length && (
              <Button
                variant="link"
                size="sm"
                onClick={onRefresh}
                className="h-auto p-0 text-xs"
              >
                {t("comments.replies.loadMore")}
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
