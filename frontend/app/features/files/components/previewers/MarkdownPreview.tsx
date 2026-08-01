/**
 * MarkdownPreview Component
 * Displays Markdown files with syntax highlighting and GFM support.
 */

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useFileContent } from "../../hooks/useFiles";
import { Card, CardContent } from "~/components/ui/card";
import { useTranslation } from "~/lib/i18n/useTranslation";

export interface MarkdownPreviewProps {
  fileId: string;
  fileName: string;
}

/**
 * MarkdownPreview component
 */
export function MarkdownPreview({ fileId }: MarkdownPreviewProps) {
  const { t } = useTranslation();
  const { data: content, isLoading, error } = useFileContent(fileId);

  const remarkPlugins = useMemo(() => [remarkGfm], []);

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

  // Limit content size for preview (5MB max)
  const MAX_CONTENT_SIZE = 5 * 1024 * 1024; // 5MB
  if (content.length > MAX_CONTENT_SIZE) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">
            {t("files.fileTooLarge") ||
              "File is too large to preview. Please download it."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="border rounded-md overflow-auto max-h-[600px] prose prose-sm dark:prose-invert max-w-none p-4">
          <ReactMarkdown remarkPlugins={remarkPlugins}>{content}</ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}
