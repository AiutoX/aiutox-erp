/**
 * CommentAttachments component
 * Displays attachments for a comment
 */

import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import type { CommentAttachment } from "~/features/comments/types/comment.types";

interface CommentAttachmentsProps {
  attachments: CommentAttachment[];
  onRemove?: (attachmentId: string) => void;
  canRemove?: boolean;
}

export function CommentAttachments({
  attachments,
  onRemove,
  canRemove = false,
}: CommentAttachmentsProps) {
  const { t } = useTranslation();

  if (attachments.length === 0) {
    return null;
  }

  const getFileIcon = (_fileId: string) => {
    // Simple file type detection based on file ID or extension
    // In a real implementation, this would use the file metadata
    return "📎";
  };

  const formatFileSize = (size?: number) => {
    if (!size) return "";
    const units = ["B", "KB", "MB", "GB"];
    let unitIndex = 0;
    let fileSize = size;

    while (fileSize >= 1024 && unitIndex < units.length - 1) {
      fileSize /= 1024;
      unitIndex++;
    }

    return `${fileSize.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">
              {t("comments.attachments.title")}
            </span>
            <Badge variant="secondary">{attachments.length}</Badge>
          </div>

          <div className="space-y-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-2 border rounded-md"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">
                    {getFileIcon(attachment.file_id)}
                  </span>
                  <div className="text-sm">
                    <div className="font-medium">{attachment.file_id}</div>
                    <div className="text-muted-foreground text-xs">
                      {formatFileSize()} • {t("comments.attachments.uploaded")}{" "}
                      {new Date(attachment.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {canRemove && onRemove && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(attachment.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    {t("comments.attachments.remove")}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
