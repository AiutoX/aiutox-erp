/**
 * FileList Component
 * Displays a list of files with pagination and actions
 */

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  Download,
  Trash2,
  Eye,
  MoreVertical,
  Search,
  Grid3x3,
  List,
} from "lucide-react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import { showToast } from "~/components/common/Toast";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { useFiles, useFileDelete, useFileDownload } from "../hooks/useFiles";
import { FileGrid } from "./FileGrid";
import { FileFilters } from "./FileFilters";
import { useUsers } from "~/features/users/hooks/useUsers";
import { useFilePermissions } from "../hooks/useFilePermissions";
import { useHasPermission } from "~/hooks/usePermissions";
import type { File } from "../types/file.types";
import { formatFileSize } from "../utils/fileUtils";

type ViewMode = "list" | "grid";

const VIEW_MODE_STORAGE_KEY = "files_view_mode";

/**
 * FileListRow component - Individual row in the file list table
 */
function FileListRow({
  file,
  onFileSelect,
  onDownload,
  onDelete,
  downloading,
  deleting,
}: {
  file: File;
  onFileSelect?: (file: File) => void;
  onDownload: (fileId: string, filename: string) => void;
  onDelete: (fileId: string) => void;
  downloading: boolean;
  deleting: boolean;
}) {
  const { t } = useTranslation();
  const filePermissions = useFilePermissions(file.id, file);
  const hasFilesView = useHasPermission("files.view");
  const hasFilesManage = useHasPermission("files.manage");

  const canView = filePermissions.canView || hasFilesView;
  const canDownload = filePermissions.canDownload || hasFilesView;
  const canDelete = filePermissions.canDelete || hasFilesManage;

  return (
    <TableRow>
      <TableCell className="font-medium">{file.name}</TableCell>
      <TableCell>{file.mime_type}</TableCell>
      <TableCell>{formatFileSize(file.size)}</TableCell>
      <TableCell>
        {file.uploaded_by_user?.full_name || file.uploaded_by || "-"}
      </TableCell>
      <TableCell>{new Date(file.created_at).toLocaleDateString()}</TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canView && (
              <DropdownMenuItem onClick={() => onFileSelect?.(file)}>
                <Eye className="mr-2 h-4 w-4" />
                {t("files.view")}
              </DropdownMenuItem>
            )}
            {canDownload && (
              <DropdownMenuItem
                onClick={() => onDownload(file.id, file.original_name)}
                disabled={downloading}
              >
                <Download className="mr-2 h-4 w-4" />
                {t("files.download")}
              </DropdownMenuItem>
            )}
            {canDelete && (
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
      </TableCell>
    </TableRow>
  );
}

export interface FileListProps {
  entityType?: string | null;
  entityId?: string | null;
  onFileSelect?: (file: File) => void;
}

/**
 * FileList component
 */
export function FileList({
  entityType,
  entityId,
  onFileSelect,
}: FileListProps) {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Load from localStorage, default to "list"
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      return (
        saved === "grid" || saved === "list" ? saved : "list"
      );
    }
    return "list";
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    fileId: string | null;
  }>({ open: false, fileId: null });
  const { t } = useTranslation();

  // Persist view mode to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
    }
  }, [viewMode]);

  const { files, loading, error, pagination, refresh } = useFiles({
    page,
    page_size: pageSize,
    entity_type: entityType || undefined,
    entity_id: entityId || undefined,
    tags: selectedTags.length > 0 ? selectedTags.join(",") : undefined,
  });

  const { users, error: usersError } = useUsers({ page_size: 100 });

  const { mutate: deleteFile, isPending: deleting } = useFileDelete();
  const { mutate: downloadFile, isPending: downloading } = useFileDownload();

  // State for filtered files from FileFilters component
  const [filteredFiles, setFilteredFiles] = useState<File[]>([]);
  const lastFilesSignatureRef = useRef<string>("");

  // Initialize filteredFiles when files change
  useEffect(() => {
    const signature = (files || []).map((f) => f.id).join("|");
    if (signature === lastFilesSignatureRef.current) return;
    lastFilesSignatureRef.current = signature;
    setFilteredFiles(files);
  }, [files]);

  // Transform users for filters - handle errors gracefully
  const availableUsers = useMemo(() => {
    if (usersError) {
      // If there's an error fetching users, return empty array
      // This prevents the filters from crashing
      console.warn("Failed to load users for filters:", usersError);
      return [];
    }
    return (users || []).map((u) => ({
      id: u.id,
      name:
        u.full_name ||
        `${u.first_name || ""} ${u.last_name || ""}`.trim() ||
        u.email,
      email: u.email,
    }));
  }, [users, usersError]);

  const handleDelete = useCallback((fileId: string) => {
    setDeleteConfirm({ open: true, fileId });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteConfirm.fileId) return;

    deleteFile(deleteConfirm.fileId, {
      onSuccess: () => {
        showToast(t("files.deleteSuccess"), "success");
        refresh();
        setDeleteConfirm({ open: false, fileId: null });
      },
      onError: () => {
        showToast(t("files.deleteError"), "error");
        setDeleteConfirm({ open: false, fileId: null });
      },
    });
  }, [deleteConfirm.fileId, deleteFile, refresh, t]);

  const handleDownload = useCallback(
    (fileId: string, fileName: string) => {
      downloadFile(fileId, {
        onSuccess: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        },
        onError: () => {
          showToast(t("files.error"), "error");
        },
      });
    },
    [downloadFile, t]
  );

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p>{t("files.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-destructive">{t("files.error")}</p>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-muted-foreground">{t("files.noFiles")}</p>
        <p className="text-sm text-muted-foreground mt-2">
          {t("files.noFilesDesc")}
        </p>
      </div>
    );
  }

  // Filter files by search term (client-side filtering for now)
  const searchFilteredFiles = search
    ? filteredFiles.filter(
        (file) =>
          file.name.toLowerCase().includes(search.toLowerCase()) ||
          file.mime_type.toLowerCase().includes(search.toLowerCase()) ||
          (file.description &&
            file.description.toLowerCase().includes(search.toLowerCase()))
      )
    : filteredFiles;

  return (
    <>
      <div className="space-y-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("files.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-1 border rounded-md">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-r-none"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="rounded-l-none"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <FileFilters
          files={files}
          onFilterChange={setFilteredFiles}
          availableUsers={availableUsers}
          selectedTags={selectedTags}
          onTagsChange={setSelectedTags}
        />
      </div>

      {viewMode === "grid" ? (
        <FileGrid
          files={searchFilteredFiles}
          onFileSelect={onFileSelect}
          onDownload={handleDownload}
          onDelete={handleDelete}
          downloading={downloading}
          deleting={deleting}
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("files.name")}</TableHead>
                <TableHead>{t("files.type")}</TableHead>
                <TableHead>{t("files.size")}</TableHead>
                <TableHead>{t("files.uploadedBy")}</TableHead>
                <TableHead>{t("files.uploadedAt")}</TableHead>
                <TableHead className="w-[100px]">
                  {t("files.actions") || "Acciones"}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {searchFilteredFiles.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {t("files.noFilesFound") || "No se encontraron archivos"}
                  </TableCell>
                </TableRow>
              ) : (
                searchFilteredFiles.map((file) => (
                  <FileListRow
                    key={file.id}
                    file={file}
                    onFileSelect={onFileSelect}
                    onDownload={handleDownload}
                    onDelete={handleDelete}
                    downloading={downloading}
                    deleting={deleting}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {pagination &&
        pagination.total_pages > 1 &&
        searchFilteredFiles.length > 0 && (
          <div className="flex items-center justify-between px-2 py-4">
            <div className="text-sm text-muted-foreground">
              {t("files.showing")} {(page - 1) * pageSize + 1} {t("files.to")}{" "}
              {Math.min(page * pageSize, pagination.total)} {t("files.of")}{" "}
              {pagination.total} {t("files.records")}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
              >
                {t("common.previous") || "Anterior"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= pagination.total_pages}
              >
                {t("common.next") || "Siguiente"}
              </Button>
            </div>
          </div>
        )}

      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, fileId: null })}
        onConfirm={confirmDelete}
        title={t("files.deleteConfirm")}
        description={t("files.deleteConfirmDesc")}
        variant="destructive"
        loading={deleting}
      />
    </>
  );
}
