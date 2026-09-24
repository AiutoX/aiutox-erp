/**
 * CommentAttachments component
 * Displays attachments for a comment
 */

import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Paperclip, Trash2 } from "lucide-react";
import { useFile } from "~/features/files/hooks/useFiles";
import type { CommentAttachment } from "~/features/comments/types/comment.types";

interface CommentAttachmentsProps {
  attachments: CommentAttachment[];
  onRemove?: (attachmentId: string) => void;
  canRemove?: boolean;
}

function formatFileSize(size?: number): string {
  if (!size) return "";
  const units = ["B", "KB", "MB", "GB"];
  let unitIndex = 0;
  let fileSize = size;

  while (fileSize >= 1024 && unitIndex < units.length - 1) {
    fileSize /= 1024;
    unitIndex++;
  }

  return `${fileSize.toFixed(1)} ${units[unitIndex]}`;
}

function AttachmentRow({
  attachment,
  canRemove,
  onRemove,
  removeLabel,
  uploadedLabel,
}: {
  attachment: CommentAttachment;
  canRemove: boolean;
  onRemove?: (attachmentId: string) => void;
  removeLabel: string;
  uploadedLabel: string;
}) {
  // CommentAttachment only stores file_id — name/size/mime_type live on the
  // real files-module File record, resolved here rather than assumed present.
  const { file, loading } = useFile(attachment.file_id);

  return (
    <div className="flex items-center justify-between p-2 border rounded-md">
      <div className="flex items-center space-x-2 min-w-0">
        <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="text-sm min-w-0">
          <div className="font-medium truncate">
            {loading ? "…" : file?.original_name || attachment.file_id}
          </div>
          <div className="text-muted-foreground text-xs">
            {formatFileSize(file?.size)} {file?.size ? "•" : ""} {uploadedLabel}{" "}
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
          aria-label={removeLabel}
          title={removeLabel}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
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

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">
              {t("comments.attachment.title")}
            </span>
            <Badge variant="secondary">{attachments.length}</Badge>
          </div>

          <div className="space-y-2">
            {attachments.map((attachment) => (
              <AttachmentRow
                key={attachment.id}
                attachment={attachment}
                canRemove={canRemove}
                onRemove={onRemove}
                removeLabel={t("comments.attachment.remove")}
                uploadedLabel={t("comments.attachment.uploaded")}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
