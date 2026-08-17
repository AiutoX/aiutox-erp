/**
 * JsonPreview Component
 * Displays JSON files with syntax highlighting
 */

import { useMemo, type CSSProperties } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import pkg from "react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus";
const { vscDarkPlus } = pkg;
import { useFileContent } from "../../hooks/useFiles";
import { Card, CardContent } from "~/components/ui/card";
import { useTranslation } from "~/lib/i18n/useTranslation";

export interface JsonPreviewProps {
  fileId: string;
  fileName: string;
}

/**
 * JsonPreview component
 */
export function JsonPreview({ fileId }: JsonPreviewProps) {
  const { t } = useTranslation();
  const { data: content, isLoading, error } = useFileContent(fileId);

  const formattedJson = useMemo(() => {
    if (!content) return "";
    try {
      const parsed = JSON.parse(content);
      return JSON.stringify(parsed, null, 2);
    } catch (err) {
      // If not valid JSON, return original content
      return content;
    }
  }, [content]);

  const isValidJson = useMemo(() => {
    if (!content) return false;
    try {
      JSON.parse(content);
      return true;
    } catch {
      return false;
    }
  }, [content]);

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
        <div className="border rounded-md overflow-auto max-h-150">
          {isValidJson ? (
            <SyntaxHighlighter
              language="json"
              style={vscDarkPlus as unknown as Record<string, CSSProperties>}
              customStyle={{
                margin: 0,
                borderRadius: "0.375rem",
              }}
            >
              {formattedJson}
            </SyntaxHighlighter>
          ) : (
            <div className="p-4">
              <p className="text-sm text-muted-foreground mb-2">
                {t("files.invalidJson") || "Invalid JSON format"}
              </p>
              <pre className="text-sm font-mono whitespace-pre-wrap wrap-break-words">
                {content}
              </pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
