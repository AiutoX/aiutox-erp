/**
 * TextPreview Component
 * Displays plain text files with syntax highlighting
 */

import { useFileContent } from "../../hooks/useFiles";
import { Card, CardContent } from "~/components/ui/card";
import { useTranslation } from "~/lib/i18n/useTranslation";

export interface TextPreviewProps {
  fileId: string;
  fileName: string;
}

/**
 * TextPreview component
 */
export function TextPreview({ fileId }: TextPreviewProps) {
  const { t } = useTranslation();
  const { data: content, isLoading, error } = useFileContent(fileId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p>{t("files.loading")}</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-destructive">
            {t("files.error") || "Error loading file content"}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!content) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">
            {t("files.previewNotAvailable") || "Preview not available"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="border rounded-md overflow-auto max-h-[600px]">
          <pre className="p-4 text-sm font-mono whitespace-pre-wrap wrap-break-words bg-muted/50">
            {content}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
