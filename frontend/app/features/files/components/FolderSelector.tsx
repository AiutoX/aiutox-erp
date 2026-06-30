/**
 * FolderSelector Component
 * Allows selecting a folder from a tree structure
 */

import { useState, useCallback } from "react";
import { Folder, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { FolderTree } from "./FolderTree";
import { useFolderTree, useFolderCreate } from "../hooks/useFolders";
import { showToast } from "~/components/common/Toast";
import { useTranslation } from "~/lib/i18n/useTranslation";
import type { FolderTreeItem } from "../api/folders.api";

export interface FolderSelectorProps {
  selectedFolderId?: string | null;
  onSelectFolder: (folderId: string | null) => void;
  entityType?: string | null;
  entityId?: string | null;
}

/**
 * FolderSelector component
 */
export function FolderSelector({
  selectedFolderId,
  onSelectFolder,
  entityType,
  entityId,
}: FolderSelectorProps) {
  const [open, setOpen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDescription, setNewFolderDescription] = useState("");
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(
    null
  );
  const { t } = useTranslation();

  const { tree, loading, error, refresh } = useFolderTree({
    entity_type: entityType || undefined,
    entity_id: entityId || undefined,
  });

  const { mutate: createFolder, isPending: creating } = useFolderCreate();

  const handleToggleExpand = useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  const handleSelectFolder = useCallback(
    (folderId: string | null) => {
      onSelectFolder(folderId);
      setOpen(false);
    },
    [onSelectFolder]
  );

  const handleCreateFolder = useCallback(() => {
    if (!newFolderName.trim()) {
      showToast(
        t("files.folderNameRequired") || "Nombre de carpeta requerido",
        "error"
      );
      return;
    }

    createFolder(
      {
        name: newFolderName.trim(),
        description: newFolderDescription.trim() || null,
        parent_id: newFolderParentId || null,
        entity_type: entityType || null,
        entity_id: entityId || null,
      },
      {
        onSuccess: (response) => {
          showToast(
            t("files.folderCreated") || "Carpeta creada exitosamente",
            "success"
          );
          setNewFolderName("");
          setNewFolderDescription("");
          setNewFolderParentId(null);
          setCreateFolderOpen(false);
          // Expand parent folder if exists
          if (newFolderParentId) {
            setExpandedFolders((prev) => new Set(prev).add(newFolderParentId));
          }
          // Select the newly created folder
          handleSelectFolder(response.data.id);
        },
        onError: () => {
          showToast(
            t("files.folderCreateError") || "Error al crear carpeta",
            "error"
          );
        },
      }
    );
  }, [
    newFolderName,
    newFolderDescription,
    newFolderParentId,
    entityType,
    entityId,
    createFolder,
    handleSelectFolder,
    t,
  ]);

  const getSelectedFolderName = useCallback(() => {
    if (!selectedFolderId) {
      return t("files.rootFolder") || "Raíz";
    }
    const findFolder = (folders: FolderTreeItem[]): FolderTreeItem | null => {
      for (const folder of folders) {
        if (folder.id === selectedFolderId) {
          return folder;
        }
        if (folder.children) {
          const found = findFolder(folder.children);
          if (found) return found;
        }
      }
      return null;
    };
    const folder = findFolder(tree);
    return folder?.name || t("files.unknownFolder") || "Desconocido";
  }, [selectedFolderId, tree, t]);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full justify-start">
            <Folder className="mr-2 h-4 w-4" />
            <span className="flex-1 text-left truncate">
              {error
                ? t("files.error") || "Error al cargar carpetas"
                : getSelectedFolderName()}
            </span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("files.selectFolder") || "Seleccionar Carpeta"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="max-h-[400px] overflow-y-auto border rounded-md p-2">
              {loading ? (
                <div className="flex items-center justify-center p-4">
                  <p className="text-sm text-muted-foreground">
                    {t("files.loading") || "Cargando..."}
                  </p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center p-4 space-y-2">
                  <p className="text-sm text-destructive">
                    {t("files.error") || "Error al cargar carpetas"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {error instanceof Error ? error.message : String(error)}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Retry loading
                      void refresh();
                    }}
                  >
                    {t("common.retry") || "Reintentar"}
                  </Button>
                </div>
              ) : (
                <FolderTree
                  folders={tree}
                  selectedFolderId={selectedFolderId}
                  onSelectFolder={handleSelectFolder}
                  expandedFolders={expandedFolders}
                  onToggleExpand={handleToggleExpand}
                  showRoot
                  onRootSelect={() => handleSelectFolder(null)}
                />
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setCreateFolderOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("files.createFolder") || "Crear Carpeta"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
              >
                {t("common.cancel") || "Cancelar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("files.createFolder") || "Crear Carpeta"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="folder-name">
                {t("files.name") || "Nombre"} *
              </Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder={
                  t("files.folderNamePlaceholder") || "Nombre de la carpeta"
                }
              />
            </div>
            <div>
              <Label htmlFor="folder-description">
                {t("files.description") || "Descripción"}
              </Label>
              <Textarea
                id="folder-description"
                value={newFolderDescription}
                onChange={(e) => setNewFolderDescription(e.target.value)}
                placeholder={
                  t("files.folderDescriptionPlaceholder") ||
                  "Descripción opcional"
                }
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setCreateFolderOpen(false);
                  setNewFolderName("");
                  setNewFolderDescription("");
                  setNewFolderParentId(null);
                }}
              >
                {t("common.cancel") || "Cancelar"}
              </Button>
              <Button
                onClick={() => void handleCreateFolder()}
                disabled={creating}
              >
                {creating
                  ? t("common.creating") || "Creando..."
                  : t("common.create") || "Crear"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
