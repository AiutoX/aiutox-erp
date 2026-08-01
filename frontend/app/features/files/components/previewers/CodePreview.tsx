/**
 * CodePreview Component
 * Displays code files with syntax highlighting
 */

import { useMemo, type CSSProperties } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import pkg from "react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus";
const { vscDarkPlus } = pkg;
import { useFileContent } from "../../hooks/useFiles";
import { Card, CardContent } from "~/components/ui/card";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { getFileExtension } from "../../utils/fileUtils";

export interface CodePreviewProps {
  fileId: string;
  fileName: string;
}

/**
 * Map file extension to language for syntax highlighting
 */
function getLanguageFromExtension(filename: string): string {
  const ext = getFileExtension(filename).toLowerCase();
  const languageMap: Record<string, string> = {
    js: "javascript",
    jsx: "jsx",
    ts: "typescript",
    tsx: "tsx",
    py: "python",
    java: "java",
    c: "c",
    cpp: "cpp",
    cc: "cpp",
    cxx: "cpp",
    cs: "csharp",
    php: "php",
    rb: "ruby",
    go: "go",
    rs: "rust",
    swift: "swift",
    kt: "kotlin",
    scala: "scala",
    clj: "clojure",
    hs: "haskell",
    lua: "lua",
    pl: "perl",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    fish: "bash",
    sql: "sql",
    html: "html",
    htm: "html",
    css: "css",
    scss: "scss",
    sass: "scss",
    less: "less",
    xml: "xml",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    ini: "ini",
    conf: "ini",
    config: "ini",
    vue: "vue",
    svelte: "svelte",
    dart: "dart",
    r: "r",
    m: "objectivec",
    mm: "objectivec",
  };

  return languageMap[ext] || "text";
}

/**
 * CodePreview component
 */
export function CodePreview({ fileId, fileName }: CodePreviewProps) {
  const { t } = useTranslation();
  const { data: content, isLoading, error } = useFileContent(fileId);

  const language = useMemo(() => {
    return getLanguageFromExtension(fileName);
  }, [fileName]);

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
        <div className="border rounded-md overflow-auto max-h-150">
          <SyntaxHighlighter
            language={language}
            style={vscDarkPlus as unknown as Record<string, CSSProperties>}
            customStyle={{
              margin: 0,
              borderRadius: "0.375rem",
            }}
            showLineNumbers
          >
            {content}
          </SyntaxHighlighter>
        </div>
      </CardContent>
    </Card>
  );
}
