/**
 * FileGrid Component
 * Displays files in a grid layout
 */

import { FileCard } from "./FileCard";
import type { File } from "../types/file.types";

export interface FileGridProps {
  files: File[];
  onFileSelect?: (file: File) => void;
  onDownload?: (fileId: string, fileName: string) => void;
  onDelete?: (fileId: string) => void;
  downloading?: boolean;
  deleting?: boolean;
}

/**
 * FileGrid component
 */
export function FileGrid({
  files,
  onFileSelect,
  onDownload,
  onDelete,
  downloading = false,
  deleting = false,
}: FileGridProps) {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {files.map((file) => (
        <FileCard
          key={file.id}
          file={file}
          onView={onFileSelect}
          onDownload={onDownload}
          onDelete={onDelete}
          downloading={downloading}
          deleting={deleting}
        />
      ))}
    </div>
  );
}
