/**
 * UploadProgress Component
 * Muestra el progreso de subida de archivos
 */

import { HugeiconsIcon } from "@hugeicons/react";
import { Upload01Icon } from "@hugeicons/core-free-icons";
import { useTranslation } from "~/lib/i18n/useTranslation";

interface UploadProgressProps {
  progress: number;
  fileName: string;
  error?: string;
}

export function UploadProgress({
  progress,
  fileName,
  error,
}: UploadProgressProps) {
  const { t } = useTranslation();

  if (error) {
    return (
      <div className="flex items-center space-x-3 p-3 bg-destructive/10 border border-destructive/20 rounded">
        <div className="shrink-0">
          <div className="w-6 h-6 rounded bg-destructive/10 flex items-center justify-center">
            <span className="text-xs">❌</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-destructive truncate">
            {t("files.uploadError")}: {fileName}
          </p>
          <p className="text-xs text-destructive/70">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3 p-3 bg-muted/20 border border-dashed border-border rounded">
      <div className="shrink-0">
        <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
          <HugeiconsIcon
            icon={Upload01Icon}
            size={12}
            className="text-primary animate-pulse"
          />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {t("files.uploading")} {fileName}...
        </p>
        <div className="mt-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Progreso</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
