/**
 * FolderTree Component
 * Displays a hierarchical tree of folders
 */

import { ChevronRight, ChevronDown, Folder, FolderOpen } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { useTranslation } from "~/lib/i18n/useTranslation";
import type { FolderTreeItem } from "../api/folders.api";

export interface FolderTreeProps {
  folders: FolderTreeItem[];
  selectedFolderId?: string | null;
  onSelectFolder?: (folderId: string | null) => void;
  expandedFolders?: Set<string>;
  onToggleExpand?: (folderId: string) => void;
  showRoot?: boolean;
  onRootSelect?: () => void;
}

/**
 * FolderTree component
 */
export function FolderTree({
  folders,
  selectedFolderId,
  onSelectFolder,
  expandedFolders = new Set(),
  onToggleExpand,
  showRoot = true,
  onRootSelect,
}: FolderTreeProps) {
  const { t } = useTranslation();

  const handleFolderClick = (folderId: string, hasChildren: boolean) => {
    if (hasChildren && onToggleExpand) {
      onToggleExpand(folderId);
    }
    onSelectFolder?.(folderId);
  };

  const renderFolder = (folder: FolderTreeItem, depth: number = 0) => {
    const hasChildren = folder.children && folder.children.length > 0;
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;

    return (
      <div key={folder.id} className="select-none">
        <div
          className={cn(
            "flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent transition-colors",
            isSelected && "bg-accent"
          )}
          style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}
          onClick={() => handleFolderClick(folder.id, hasChildren)}
        >
          {hasChildren ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand?.(folder.id);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <div className="w-4" />
          )}
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Folder className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="flex-1 truncate text-sm">{folder.name}</span>
          {folder.file_count > 0 && (
            <span className="text-xs text-muted-foreground">
              {folder.file_count}
            </span>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div>
            {folder.children.map((child) => renderFolder(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {showRoot && (
        <div
          className={cn(
            "flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent transition-colors",
            selectedFolderId === null && "bg-accent"
          )}
          onClick={onRootSelect}
        >
          <Folder className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 truncate text-sm font-medium">
            {t("files.rootFolder") || "Raíz"}
          </span>
        </div>
      )}
      {folders.map((folder) => renderFolder(folder))}
    </div>
  );
}
