/**
 * Filter Management Modal Component
 * Allows users to view, edit, delete, and share/unshare saved filters.
 */

import { Edit, Share2, Star, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { useTranslation } from "~/lib/i18n/useTranslation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import type {
  SavedFilter,
  SavedFilterUpdate,
} from "../types/savedFilter.types";
import { useSavedFilters } from "../hooks/useSavedFilters";
import {
  canDeleteFilter,
  canEditFilter,
  canShareFilter,
} from "../utils/permissions";
import { useAuthStore } from "~/stores/authStore";

export interface FilterManagementModalProps {
  open: boolean;
  onClose: () => void;
  module: string;
  onEditFilter?: (filter: SavedFilter) => void;
}

/**
 * Filter Management Modal component
 */
export function FilterManagementModal({
  open,
  onClose,
  module,
  onEditFilter,
}: FilterManagementModalProps) {
  const {
    filters: _filters,
    defaultFilter,
    loading,
    error,
    getMyFilters,
    getSharedFilters,
    updateFilter,
    removeFilter,
    refreshFilters,
  } = useSavedFilters(module, true);

  const currentUser = useAuthStore((state) => state.user);
  const { t } = useTranslation();
  const [deletingFilterId, setDeletingFilterId] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const myFilters = getMyFilters(module);
  const sharedFilters = getSharedFilters(module);

  const handleDelete = async (filterId: string) => {
    setDeletingFilterId(filterId);
    setConfirmDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (deletingFilterId) {
      const success = await removeFilter(deletingFilterId);
      if (success) {
        setConfirmDeleteOpen(false);
        setDeletingFilterId(null);
        await refreshFilters();
      }
    }
  };

  const handleToggleShare = async (filter: SavedFilter) => {
    const updateData: SavedFilterUpdate = {
      is_shared: !filter.is_shared,
    };
    await updateFilter(filter.id, updateData);
    await refreshFilters();
  };

  const handleEdit = (filter: SavedFilter) => {
    if (onEditFilter) {
      onEditFilter(filter);
      onClose();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestionar Filtros Guardados</DialogTitle>
            <DialogDescription>
              Administra tus filtros guardados. Puedes editar, eliminar o
              compartir filtros.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {loading && (
              <div className="text-center py-8 text-muted-foreground">
                {t("savedFilters.loading")}
              </div>
            )}

            {error && (
              <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                Error: {error.message}
              </div>
            )}

            {!loading && !error && (
              <div className="space-y-6">
                {/* Default Filter */}
                {defaultFilter && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">
                      Filtro por Defecto
                    </h3>
                    <div className="rounded-md border p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            <span className="font-medium">
                              {defaultFilter.name}
                            </span>
                          </div>
                          {defaultFilter.description && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {defaultFilter.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {canEditFilter(defaultFilter, currentUser) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(defaultFilter)}
                              title={t("savedFilters.edit")}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* My Filters */}
                {myFilters.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Mis Filtros</h3>
                    <div className="space-y-2">
                      {myFilters.map((filter) => (
                        <div key={filter.id} className="rounded-md border p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <span className="font-medium">{filter.name}</span>
                              {filter.description && (
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {filter.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {canEditFilter(filter, currentUser) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(filter)}
                                  title={t("savedFilters.edit")}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {canShareFilter(filter, currentUser) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => void handleToggleShare(filter)}
                                  title={
                                    filter.is_shared
                                      ? t("savedFilters.unshare")
                                      : t("savedFilters.share")
                                  }
                                >
                                  {filter.is_shared ? (
                                    <X className="h-4 w-4" />
                                  ) : (
                                    <Share2 className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                              {canDeleteFilter(filter, currentUser, module) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => void handleDelete(filter.id)}
                                  title="Eliminar"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Shared Filters */}
                {sharedFilters.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">
                      {t("savedFilters.sharedFilters")}
                    </h3>
                    <div className="space-y-2">
                      {sharedFilters.map((filter) => (
                        <div key={filter.id} className="rounded-md border p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Share2 className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {filter.name}
                                </span>
                              </div>
                              {filter.description && (
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {filter.description}
                                </p>
                              )}
                              <p className="mt-1 text-xs text-muted-foreground">
                                Compartido por el equipo
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              {canDeleteFilter(filter, currentUser, module) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => void handleDelete(filter.id)}
                                  title={t("savedFilters.deleteOnlyAdmins")}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {!defaultFilter &&
                  myFilters.length === 0 &&
                  sharedFilters.length === 0 && (
                    <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                      No hay filtros guardados. Crea tu primer filtro desde el
                      editor.
                    </div>
                  )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              {t("savedFilters.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar filtro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El filtro será eliminado
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("savedFilters.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("savedFilters.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
