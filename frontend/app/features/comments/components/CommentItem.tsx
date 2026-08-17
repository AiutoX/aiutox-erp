/**
 * CommentItem component
 * Displays a single comment with actions
 */

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Reply, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { useAuthStore } from "~/stores/authStore";
import { useHasPermission } from "~/hooks/usePermissions";
import { useUser } from "~/features/users/hooks/useUsers";
import { splitMentionSegments } from "~/features/comments/utils/mentions";
import { CommentForm } from "./CommentForm";
import { CommentRevisionHistory } from "./CommentRevisionHistory";
import { CommentAttachments } from "./CommentAttachments";
import { useCommentAttachments } from "~/features/comments/hooks/useComments";
import type { Comment } from "~/features/comments/types/comment.types";

interface CommentItemProps {
  comment: Comment;
  onEdit?: (commentId: string, content: string) => void;
  onDelete?: (commentId: string) => void;
  onReply?: () => void;
  // True when this comment is soft-deleted but still has live replies (CMT-007)
  // — renders a "[deleted]" placeholder instead of the real content, with no
  // actions, rather than showing deleted content or letting replies hang with
  // no visible parent.
  isDeletedPlaceholder?: boolean;
}

export function CommentItem({
  comment,
  onEdit,
  onDelete,
  onReply,
  isDeletedPlaceholder = false,
}: CommentItemProps) {
  const { t } = useTranslation();
  const dateLocale = es;
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [showRevisionHistory, setShowRevisionHistory] = useState(false);
  const currentUserId = useAuthStore((state) => state.user?.id);
  // CMT-008: revision history is a moderation/accountability tool, visible
  // only to comments.manage — never the comment's own author, even for
  // their own edits.
  const canViewRevisionHistory = useHasPermission("comments.manage");
  const { user: author } = useUser(comment.created_by || null);
  const authorDisplayName =
    author?.full_name || author?.email || comment.created_by || t("comments.unknownAuthor");
  const isAuthor = currentUserId === comment.created_by;
  // can_edit/can_delete are computed server-side (ownership + comments.manage
  // + the per-tenant edit/delete time window, CMT-009) — the single source of
  // truth for whether these actions should be offered right now. Do not
  // re-derive them client-side (e.g. from isAuthor alone), since that would
  // miss the time-window expiry the backend already knows about.
  const canEdit = comment.can_edit;
  const canDelete = comment.can_delete;
  const { remove: removeAttachmentMutation } = useCommentAttachments();

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "PPP", { locale: dateLocale });
  };

  const handleEditSubmit = (content: string) => {
    if (onEdit) {
      onEdit(comment.id, content);
    }
    setIsEditing(false);
  };

  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete(comment.id);
    }
    setIsConfirmingDelete(false);
  };

  return (
    <Card className={isAuthor ? "bg-accent" : undefined}>
      <CardContent className="p-4">
        <div className="flex space-x-3">
          {/* Avatar */}
          <Avatar className="h-8 w-8">
            <AvatarImage src={undefined} />
            <AvatarFallback>
              {authorDisplayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="flex-1 space-y-2">
            {/* Header */}
            <div className="flex items-center space-x-2">
              <span className="font-medium text-sm">{authorDisplayName}</span>
              <span className="text-xs text-muted-foreground">
                {formatDate(comment.created_at)}
              </span>
              {comment.is_edited && !isDeletedPlaceholder && (
                <span className="text-xs text-muted-foreground">
                  {t("comments.status.edited")}
                </span>
              )}
              {comment.is_edited && !isDeletedPlaceholder && canViewRevisionHistory && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setShowRevisionHistory((prev) => !prev)}
                  className="h-auto p-0 text-xs"
                >
                  {t("comments.revisions.viewHistory")}
                </Button>
              )}
            </div>

            {showRevisionHistory && !isDeletedPlaceholder && (
              <CommentRevisionHistory commentId={comment.id} />
            )}

            {isDeletedPlaceholder ? (
              <div className="text-sm italic text-muted-foreground">
                {t("comments.status.deletedPlaceholder")}
              </div>
            ) : isEditing ? (
              <CommentForm
                initialContent={comment.content}
                onSubmit={handleEditSubmit}
                onCancel={() => setIsEditing(false)}
                buttonText={t("comments.action.save")}
              />
            ) : (
              <>
                {/* Content */}
                <div className="text-sm">
                  {splitMentionSegments(comment.content).map((segment, index) =>
                    segment.type === "mention" ? (
                      <span
                        key={index}
                        className="font-medium text-primary"
                      >
                        {segment.value}
                      </span>
                    ) : (
                      <span key={index}>{segment.value}</span>
                    )
                  )}
                </div>

                {/* Mentions */}
                {comment.mentions && comment.mentions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {comment.mentions.map((mention) => (
                      <span
                        key={mention}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                      >
                        @{mention}
                      </span>
                    ))}
                  </div>
                )}

                {/* Attachments */}
                {comment.attachments && comment.attachments.length > 0 && (
                  <CommentAttachments
                    attachments={comment.attachments}
                    canRemove={canEdit}
                    onRemove={(attachmentId) =>
                      removeAttachmentMutation.mutate({
                        id: comment.id,
                        attachmentId,
                      })
                    }
                  />
                )}

                {/* Actions */}
                <div className="flex space-x-1">
                  {onReply && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onReply}
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      title={t("comments.action.reply")}
                      aria-label={t("comments.action.reply")}
                    >
                      <Reply className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {onEdit && canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsEditing(true)}
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      title={t("comments.action.edit")}
                      aria-label={t("comments.action.edit")}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {onDelete && canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsConfirmingDelete(true)}
                      className="h-6 w-6 text-red-600 hover:text-red-700"
                      title={t("comments.action.delete")}
                      aria-label={t("comments.action.delete")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>

      <AlertDialog
        open={isConfirmingDelete}
        onOpenChange={setIsConfirmingDelete}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("comments.action.delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("comments.confirm.delete")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("comments.action.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
