/**
 * UsersList Component
 * Displays a list of users with SavedFilters integration, pagination, and actions.
 */

import { useCallback, useEffect, useState } from "react";
// import { useQueryClient } from "@tanstack/react-query"; // Unused for now
// import { Link } from "react-router"; // Unused for now
import { Button } from "~/components/ui/button";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "~/components/ui/dropdown-menu"; // Unused for now
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Save,
  CheckSquare,
  Square,
  Trash2,
  Power,
  PowerOff,
} from "lucide-react";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import { showToast } from "~/components/common/Toast";
import { UserListSkeleton } from "~/components/common/UserListSkeleton";
import { EmptyState } from "~/components/common/EmptyState";
import { ErrorState } from "~/components/common/ErrorState";
// import {
//   Tooltip,
//   TooltipContent,
//   TooltipTrigger,
// } from "~/components/ui/tooltip"; // Unused for now
import { TooltipProvider } from "~/components/ui/tooltip";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { useDebouncedValue } from "~/hooks/useDebouncedValue";
import { SavedFilters } from "../../views/components/SavedFilters";
import { FilterEditorModal } from "../../views/components/FilterEditorModal";
import { FilterManagementModal } from "../../views/components/FilterManagementModal";
import { userFieldsConfig } from "../../views/config/userFields";
import { useSavedFilters } from "../../views/hooks/useSavedFilters";
import { useFilterUrlSync } from "../../views/hooks/useFilterUrlSync";
import { useUsers, useDeleteUser, useBulkUsersAction } from "../hooks/useUsers"; // userKeys unused for now
import type {
  SavedFilter,
  SavedFilterCreate,
} from "../../views/types/savedFilter.types";
// import { getUser } from "../api/users.api"; // Unused for now
import { UserRow } from "./UserRow";

export interface UsersListProps {
  onManageFiltersClick?: () => void;
}

/**
 * UsersList component with SavedFilters integration
 */
export function UsersList({ onManageFiltersClick }: UsersListProps) {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20); // Default page size
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(
    undefined
  );

  const [editorOpen, setEditorOpen] = useState(false);
  const [managementOpen, setManagementOpen] = useState(false);
  const [editingFilter, setEditingFilter] = useState<SavedFilter | null>(null);
  const [_savingCurrentFilter, setSavingCurrentFilter] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    userId: string | null;
  }>({ open: false, userId: null });
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
    new Set()
  );
  const [bulkActionConfirm, setBulkActionConfirm] = useState<{
    open: boolean;
    action: "activate" | "deactivate" | "delete" | null;
  }>({ open: false, action: null });
  const { t } = useTranslation();

  const { filterId, updateFilterId } = useFilterUrlSync();
  const savedFiltersHook = useSavedFilters("users", true);
  const {
    defaultFilter: _defaultFilter,
    getDefaultFilter,
    refreshFilters,
    createFilter,
    filters: savedFiltersList,
    defaultFilter: savedFiltersDefaultFilter,
    loading: savedFiltersLoading,
    error: savedFiltersError,
    getMyFilters: savedFiltersGetMyFilters,
    getSharedFilters: savedFiltersGetSharedFilters,
  } = savedFiltersHook;

  // Use the new useUsers hook with debounced search
  const { users, loading, error, pagination, refresh } = useUsers({
    page,
    page_size: pageSize,
    search: debouncedSearch || undefined,
    is_active: isActiveFilter,
    saved_filter_id: filterId || undefined,
  });

  const { remove: deleteUser, loading: deleting } = useDeleteUser();
  const { execute: bulkAction, loading: bulkActionLoading } =
    useBulkUsersAction();
  // const queryClient = useQueryClient(); // Unused for now

  // Define handleDeleteUser first
  const handleDeleteUser = useCallback(async (userId: string) => {
    setDeleteConfirm({ open: true, userId });
  }, []);

  // Memoize delete handler (now handleDeleteUser is defined)
  const handleDeleteUserMemoized = useCallback(
    (userId: string) => {
      handleDeleteUser(userId);
    },
    [handleDeleteUser]
  );

  // Apply default filter on mount if no filter in URL
  useEffect(() => {
    if (!filterId) {
      const defaultFilterForModule = getDefaultFilter("users");
      if (defaultFilterForModule) {
        updateFilterId(defaultFilterForModule.id);
      }
    }
  }, [filterId, getDefaultFilter, updateFilterId]);

  const handleApplyFilter = (newFilterId: string | null) => {
    updateFilterId(newFilterId);
    // Reset to page 1 when filter changes
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.userId) return;

    const success = await deleteUser(deleteConfirm.userId);
    if (success) {
      showToast("Usuario eliminado exitosamente", "success");
      refresh();
    } else {
      showToast("Error al eliminar el usuario", "error");
    }
    setDeleteConfirm({ open: false, userId: null });
  };

  const handleSaveCurrentFilter = () => {
    // Open editor modal to save current filter
    // Note: In a real implementation, we'd need to capture the current filter state
    // For now, we'll open the editor and let the user build the filter
    setEditingFilter(null);
    setSavingCurrentFilter(true);
    setEditorOpen(true);
  };

  const handleSaveFilter = async (filterData: SavedFilterCreate) => {
    const saved = await createFilter(filterData);
    if (saved) {
      setEditorOpen(false);
      setEditingFilter(null);
      setSavingCurrentFilter(false);
      await refreshFilters();
      // Optionally apply the new filter
      updateFilterId(saved.id);
    }
    return saved;
  };

  const handleEditFilter = (filter: SavedFilter) => {
    setEditingFilter(filter);
    setEditorOpen(true);
  };

  const handleManageFilters = () => {
    setManagementOpen(true);
    if (onManageFiltersClick) {
      onManageFiltersClick();
    }
  };

  // Bulk selection handlers
  const handleSelectAll = useCallback(() => {
    if (selectedUserIds.size === users.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(users.map((u) => u.id)));
    }
  }, [selectedUserIds.size, users]);

  const handleSelectUser = useCallback((userId: string) => {
    setSelectedUserIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  }, []);

  // Bulk action handlers
  const handleBulkAction = useCallback(
    async (action: "activate" | "deactivate" | "delete") => {
      if (selectedUserIds.size === 0) return;

      const result = await bulkAction(action, Array.from(selectedUserIds));
      if (result) {
        const successMsg =
          action === "activate"
            ? `${result.success} ${t("users.bulkActivateSuccess") || "usuarios activados exitosamente"}`
            : action === "deactivate"
              ? `${result.success} ${t("users.bulkDeactivateSuccess") || "usuarios desactivados exitosamente"}`
              : `${result.success} ${t("users.bulkDeleteSuccess") || "usuarios eliminados exitosamente"}`;

        if (result.failed > 0) {
          showToast(`${successMsg}. ${result.failed} fallaron.`, "warning");
        } else {
          showToast(successMsg, "success");
        }
        setSelectedUserIds(new Set());
        refresh();
      } else {
        showToast(
          t("users.bulkActionError") || "Error al realizar la acción masiva",
          "error"
        );
      }
    },
    [selectedUserIds, bulkAction, refresh, t]
  );

  const handleBulkActionClick = useCallback(
    (action: "activate" | "deactivate" | "delete") => {
      setBulkActionConfirm({ open: true, action });
    },
    []
  );

  const confirmBulkAction = useCallback(async () => {
    if (bulkActionConfirm.action) {
      await handleBulkAction(bulkActionConfirm.action);
      setBulkActionConfirm({ open: false, action: null });
    }
  }, [bulkActionConfirm.action, handleBulkAction]);

  // const _currentFilter = filterId
  //   ? users.length > 0 || loading
  //     ? t("savedFilters.applying")
  //     : null
  //   : null; // Unused for now

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-4">
            <div className="space-y-1">
              <CardTitle className="text-base">
                {t("users.sectionTitle")}
              </CardTitle>
              <CardDescription>{t("users.sectionDescription")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("users.filtersTitle")}
              </p>
              {/* Filters and Actions Bar */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <SavedFilters
                    module="users"
                    fields={userFieldsConfig}
                    onApply={handleApplyFilter}
                    currentFilterId={filterId}
                    onManageClick={handleManageFilters}
                    filters={savedFiltersList}
                    defaultFilter={savedFiltersDefaultFilter}
                    loading={savedFiltersLoading}
                    error={savedFiltersError}
                    getMyFilters={savedFiltersGetMyFilters}
                    getSharedFilters={savedFiltersGetSharedFilters}
                    refreshFilters={refreshFilters}
                    createFilter={createFilter}
                    autoLoad={false}
                  />
                  {filterId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveCurrentFilter}
                      className="gap-2"
                    >
                      <Save className="h-4 w-4" />
                      <span className="hidden sm:inline">
                        {t("savedFilters.saveCurrent")}
                      </span>
                    </Button>
                  )}
                </div>
                {/* Bulk Actions Bar */}
                {selectedUserIds.size > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {selectedUserIds.size} {t("users.selected")}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkActionClick("activate")}
                      disabled={bulkActionLoading}
                      className="gap-2"
                    >
                      <Power className="h-4 w-4" />
                      {t("users.activate")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkActionClick("deactivate")}
                      disabled={bulkActionLoading}
                      className="gap-2"
                    >
                      <PowerOff className="h-4 w-4" />
                      {t("users.deactivate")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkActionClick("delete")}
                      disabled={bulkActionLoading}
                      className="gap-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      {t("users.delete")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedUserIds(new Set())}
                    >
                      {t("users.clearSelection")}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <input
                type="text"
                placeholder={t("users.search")}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-md"
              />
              <select
                value={
                  isActiveFilter === undefined
                    ? "all"
                    : isActiveFilter
                      ? "active"
                      : "inactive"
                }
                onChange={(e) => {
                  const value = e.target.value;
                  setIsActiveFilter(
                    value === "all" ? undefined : value === "active"
                  );
                  setPage(1);
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-[150px]"
              >
                <option value="all">{t("users.allStatus")}</option>
                <option value="active">{t("users.active")}</option>
                <option value="inactive">{t("users.inactive")}</option>
              </select>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="space-y-4">
                <UserListSkeleton rows={pageSize} />
              </div>
            )}

            {/* Error State */}
            {error && (
              <ErrorState
                message={`${t("users.error")}: ${error.message}`}
                onRetry={() => refresh()}
                inCard={false}
              />
            )}

            {/* Users Table */}
            {!loading && !error && (
              <>
                {users.length === 0 ? (
                  <EmptyState
                    title={
                      debouncedSearch ||
                      filterId ||
                      isActiveFilter !== undefined
                        ? t("users.noUsersFound")
                        : t("users.noUsers")
                    }
                    description={
                      debouncedSearch ||
                      filterId ||
                      isActiveFilter !== undefined
                        ? t("users.noUsersFoundDesc")
                        : t("users.noUsersDesc")
                    }
                    inCard={false}
                  />
                ) : (
                  <>
                    <div className="rounded-md border overflow-x-auto">
                      <table className="w-full min-w-[640px]">
                        <thead>
                          <tr className="border-b bg-muted/40">
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground w-12">
                              <button
                                onClick={handleSelectAll}
                                className="flex items-center justify-center"
                                aria-label={t("users.selectAll")}
                              >
                                {selectedUserIds.size === users.length &&
                                users.length > 0 ? (
                                  <CheckSquare className="h-5 w-5" />
                                ) : (
                                  <Square className="h-5 w-5" />
                                )}
                              </button>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {t("users.email")}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">
                              {t("users.name")}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden lg:table-cell">
                              {t("users.jobTitle")}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {t("users.status")}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden xl:table-cell">
                              {t("users.created")}
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {t("users.actions")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((user) => (
                            <UserRow
                              key={user.id}
                              user={user}
                              onDelete={handleDeleteUserMemoized}
                              deleting={deleting}
                              selected={selectedUserIds.has(user.id)}
                              onSelect={() => handleSelectUser(user.id)}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {pagination && pagination.total_pages > 1 && (
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          {t("users.showing")} {users.length} {t("users.of")}{" "}
                          {pagination.total} {t("users.users")}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handlePageChange(Math.max(1, page - 1))
                            }
                            disabled={page === 1}
                          >
                            {t("users.previous")}
                          </Button>
                          <span className="text-sm">
                            {t("users.page")} {page} {t("users.of")}{" "}
                            {pagination.total_pages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handlePageChange(
                                Math.min(pagination.total_pages, page + 1)
                              )
                            }
                            disabled={page >= pagination.total_pages}
                          >
                            {t("users.next")}
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, userId: null })}
        onConfirm={confirmDelete}
        title={t("users.confirmDeleteTitle") || "Eliminar Usuario"}
        description={
          t("users.confirmDelete") ||
          "¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer."
        }
        confirmText={t("users.delete") || "Eliminar"}
        cancelText={t("users.cancel") || "Cancelar"}
        variant="destructive"
        loading={deleting}
      />

      {/* Filter Editor Modal */}
      <FilterEditorModal
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setEditingFilter(null);
          setSavingCurrentFilter(false);
        }}
        onSave={handleSaveFilter}
        filter={editingFilter}
        module="users"
        fields={userFieldsConfig}
      />

      {/* Filter Management Modal */}
      <FilterManagementModal
        open={managementOpen}
        onClose={() => setManagementOpen(false)}
        module="users"
        onEditFilter={handleEditFilter}
      />

      {/* Bulk Action Confirmation Dialog */}
      <ConfirmDialog
        open={bulkActionConfirm.open}
        onClose={() => setBulkActionConfirm({ open: false, action: null })}
        onConfirm={confirmBulkAction}
        title={
          bulkActionConfirm.action === "activate"
            ? t("users.confirmBulkActivateTitle") || "Activar Usuarios"
            : bulkActionConfirm.action === "deactivate"
              ? t("users.confirmBulkDeactivateTitle") || "Desactivar Usuarios"
              : t("users.confirmBulkDeleteTitle") || "Eliminar Usuarios"
        }
        description={
          bulkActionConfirm.action === "activate"
            ? (
                t("users.confirmBulkActivate") ||
                `¿Estás seguro de que deseas activar ${selectedUserIds.size} usuario(s)?`
              ).replace("{count}", selectedUserIds.size.toString())
            : bulkActionConfirm.action === "deactivate"
              ? (
                  t("users.confirmBulkDeactivate") ||
                  `¿Estás seguro de que deseas desactivar ${selectedUserIds.size} usuario(s)? Los usuarios quedarán inactivos pero no se eliminarán.`
                ).replace("{count}", selectedUserIds.size.toString())
              : (
                  t("users.confirmBulkDelete") ||
                  `¿Estás seguro de que deseas ELIMINAR PERMANENTEMENTE ${selectedUserIds.size} usuario(s)? Esta acción NO se puede deshacer y eliminará todos los datos relacionados (cascade).`
                ).replace("{count}", selectedUserIds.size.toString())
        }
        confirmText={
          bulkActionConfirm.action === "activate"
            ? t("users.activate") || "Activar"
            : bulkActionConfirm.action === "deactivate"
              ? t("users.deactivate") || "Desactivar"
              : t("users.delete") || "Eliminar"
        }
        cancelText={t("users.cancel") || "Cancelar"}
        variant={
          bulkActionConfirm.action === "delete" ? "destructive" : "default"
        }
        loading={bulkActionLoading}
      />
    </TooltipProvider>
  );
}
