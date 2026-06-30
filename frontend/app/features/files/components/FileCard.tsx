/**
 * FileCard Component
 * Displays a file as a card in grid view
 */

import { Download, Eye, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { formatFileSize } from "../utils/fileUtils";
import type { File } from "../types/file.types";

export interface FileCardProps {
  file: File;
  onView?: (file: File) => void;
  onDownload?: (fileId: string, fileName: string) => void;
  onDelete?: (fileId: string) => void;
  downloading?: boolean;
  deleting?: boolean;
}

/**
 * FileCard component
 */
export function FileCard({
  file,
  onView,
  onDownload,
  onDelete,
  downloading = false,
  deleting = false,
}: FileCardProps) {
  const { t } = useTranslation();

  const isImage = file.mime_type.startsWith("image/");
  const previewUrl = isImage
    ? `/api/v1/files/${file.id}/preview?width=200&height=200`
    : null;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        {/* Preview/Thumbnail */}
        <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={file.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="text-4xl text-muted-foreground">
              {file.extension?.toUpperCase().replace(".", "") || "FILE"}
            </div>
          )}
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
            {onView && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onView(file)}
                className="mr-2"
              >
                <Eye className="h-4 w-4 mr-1" />
                {t("files.view")}
              </Button>
            )}
          </div>
        </div>

        {/* File Info */}
        <div className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate" title={file.name}>
                {file.name}
              </h3>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(file.size)}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onView && (
                  <DropdownMenuItem onClick={() => onView(file)}>
                    <Eye className="mr-2 h-4 w-4" />
                    {t("files.view")}
                  </DropdownMenuItem>
                )}
                {onDownload && (
                  <DropdownMenuItem
                    onClick={() => onDownload(file.id, file.original_name)}
                    disabled={downloading}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {t("files.download")}
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(file.id)}
                    className="text-destructive"
                    disabled={deleting}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("files.delete")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
