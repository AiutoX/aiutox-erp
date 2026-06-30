/**
 * CommentItem component
 * Displays a single comment with actions
 */

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import type { Comment } from "~/features/comments/types/comment.types";

interface CommentItemProps {
  comment: Comment;
  onEdit?: (commentId: string, content: string) => void;
  onDelete?: (commentId: string) => void;
  onReply?: () => void;
}

export function CommentItem({
  comment,
  onEdit,
  onDelete,
  onReply,
}: CommentItemProps) {
  const { t } = useTranslation();
  const dateLocale = es;

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "PPP", { locale: dateLocale });
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(comment.id, comment.content);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(comment.id);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex space-x-3">
          {/* Avatar */}
          <Avatar className="h-8 w-8">
            <AvatarImage src={undefined} />
            <AvatarFallback>
              {comment.created_by.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="flex-1 space-y-2">
            {/* Header */}
            <div className="flex items-center space-x-2">
              <span className="font-medium text-sm">{comment.created_by}</span>
              <span className="text-xs text-muted-foreground">
                {formatDate(comment.created_at)}
              </span>
              {comment.is_edited && (
                <span className="text-xs text-muted-foreground">
                  {t("comments.edited")}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="text-sm">{comment.content}</div>

            {/* Mentions */}
            {comment.mentions.length > 0 && (
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

            {/* Actions */}
            <div className="flex space-x-2">
              {onReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onReply}
                  className="h-auto p-0 text-xs"
                >
                  {t("comments.reply")}
                </Button>
              )}
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEdit}
                  className="h-auto p-0 text-xs"
                >
                  {t("comments.edit")}
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="h-auto p-0 text-xs text-red-600 hover:text-red-700"
                >
                  {t("comments.delete")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
