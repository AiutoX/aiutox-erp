/**
 * Utility functions for file operations
 */

/**
 * Format file size in bytes to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1]?.toLowerCase() || "" : "";
}

/**
 * Check if file is an image
 */
export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

/**
 * Check if file is a PDF
 */
export function isPdfFile(mimeType: string): boolean {
  return mimeType === "application/pdf";
}

/**
 * Check if file is Markdown
 */
export function isMarkdownFile(mimeType: string, filename?: string): boolean {
  return (
    mimeType === "text/markdown" ||
    mimeType === "text/x-markdown" ||
    filename?.toLowerCase().endsWith(".md") === true ||
    filename?.toLowerCase().endsWith(".markdown") === true
  );
}

/**
 * Check if file is plain text
 */
export function isTextFile(mimeType: string): boolean {
  return (
    mimeType.startsWith("text/") &&
    mimeType !== "text/markdown" &&
    mimeType !== "text/x-markdown"
  );
}

/**
 * Check if file is CSV
 */
export function isCsvFile(mimeType: string, filename?: string): boolean {
  return (
    mimeType === "text/csv" ||
    mimeType === "application/csv" ||
    filename?.toLowerCase().endsWith(".csv") === true
  );
}

/**
 * Check if file is JSON
 */
export function isJsonFile(mimeType: string, filename?: string): boolean {
  return (
    mimeType === "application/json" ||
    mimeType === "text/json" ||
    filename?.toLowerCase().endsWith(".json") === true
  );
}

/**
 * Check if file is code (based on common code MIME types)
 */
export function isCodeFile(mimeType: string, filename?: string): boolean {
  const codeMimeTypes = [
    "text/javascript",
    "text/typescript",
    "application/javascript",
    "application/typescript",
    "text/x-python",
    "text/x-java",
    "text/x-c",
    "text/x-c++",
    "text/x-csharp",
    "text/x-php",
    "text/x-ruby",
    "text/x-go",
    "text/x-rust",
    "text/x-swift",
    "text/x-kotlin",
    "text/x-scala",
    "text/x-clojure",
    "text/x-haskell",
    "text/x-lua",
    "text/x-perl",
    "text/x-shellscript",
    "text/x-sql",
    "text/x-html",
    "text/x-css",
    "text/x-scss",
    "text/x-less",
    "text/x-xml",
    "text/x-yaml",
    "text/x-toml",
    "text/x-ini",
  ];

  const codeExtensions = [
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".py",
    ".java",
    ".c",
    ".cpp",
    ".cc",
    ".cxx",
    ".cs",
    ".php",
    ".rb",
    ".go",
    ".rs",
    ".swift",
    ".kt",
    ".scala",
    ".clj",
    ".hs",
    ".lua",
    ".pl",
    ".sh",
    ".bash",
    ".zsh",
    ".fish",
    ".sql",
    ".html",
    ".htm",
    ".css",
    ".scss",
    ".sass",
    ".less",
    ".xml",
    ".yaml",
    ".yml",
    ".toml",
    ".ini",
    ".conf",
    ".config",
    ".vue",
    ".svelte",
    ".dart",
    ".r",
    ".m",
    ".mm",
  ];

  return (
    codeMimeTypes.includes(mimeType) ||
    !!(
      filename &&
      codeExtensions.some((ext) => filename.toLowerCase().endsWith(ext))
    )
  );
}

/**
 * Check if file can be previewed
 */
export function canPreviewFile(mimeType: string, filename?: string): boolean {
  return (
    isImageFile(mimeType) ||
    isPdfFile(mimeType) ||
    isMarkdownFile(mimeType, filename) ||
    isTextFile(mimeType) ||
    isCsvFile(mimeType, filename) ||
    isJsonFile(mimeType, filename) ||
    isCodeFile(mimeType, filename)
  );
}

/**
 * Get preview type for a file
 */
export function getPreviewType(
  mimeType: string,
  filename?: string
):
  | "image"
  | "pdf"
  | "markdown"
  | "text"
  | "csv"
  | "json"
  | "code"
  | "unsupported" {
  if (isImageFile(mimeType)) return "image";
  if (isPdfFile(mimeType)) return "pdf";
  if (isMarkdownFile(mimeType, filename)) return "markdown";
  if (isCsvFile(mimeType, filename)) return "csv";
  if (isJsonFile(mimeType, filename)) return "json";
  if (isCodeFile(mimeType, filename)) return "code";
  if (isTextFile(mimeType)) return "text";
  return "unsupported";
}
