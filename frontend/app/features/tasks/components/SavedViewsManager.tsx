/**
 * SavedViewsManager component
 * Manages saved views: list, create, edit, delete, and apply.
 */

import { useState } from "react";
import {
  Bookmark,
  Plus,
  Pencil,
  Trash2,
  Star,
  Globe,
  Lock,
} from "lucide-react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
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
import { cn } from "~/lib/utils";
import { useSavedViews } from "~/features/tasks/hooks/useSavedViews";
import { SavedViewForm } from "./SavedViewForm";
import type { SavedView, ViewCreate } from "~/features/tasks/types/task.types";

interface SavedViewsManagerProps {
  activeViewId?: string;
  onApplyView: (view: SavedView) => void;
  onClearView: () => void;
}

export function SavedViewsManager({
  activeViewId,
  onApplyView,
  onClearView,
}: SavedViewsManagerProps) {
  const { t } = useTranslation();
  const { views, isLoading, createView, updateView, deleteView, isCreating } =
    useSavedViews();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingView, setEditingView] = useState<SavedView | null>(null);
  const [deletingViewId, setDeletingViewId] = useState<string | null>(null);

  const handleCreate = async (data: ViewCreate) => {
    await createView(data);
    setIsFormOpen(false);
  };

  const handleUpdate = async (data: ViewCreate) => {
    if (!editingView) return;
    await updateView(editingView.id, data);
    setEditingView(null);
  };

  const handleDelete = async () => {
    if (!deletingViewId) return;
    await deleteView(deletingViewId);
    if (activeViewId === deletingViewId) {
      onClearView();
    }
    setDeletingViewId(null);
  };

  const handleApply = (view: SavedView) => {
    if (activeViewId === view.id) {
      onClearView();
    } else {
      onApplyView(view);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Bookmark className="h-3.5 w-3.5" />
            {t("tasks.savedViews.title")}
            {activeViewId && (
              <Badge
                variant="secondary"
                className="ml-1 px-1.5 py-0 text-[10px]"
              >
                1
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {isLoading ? (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              {t("common.loading")}...
            </div>
          ) : views.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              {t("tasks.savedViews.noViews")}
            </div>
          ) : (
            views.map((view) => (
              <DropdownMenuItem
                key={view.id}
                className={cn(
                  "flex items-center justify-between gap-2 cursor-pointer",
                  activeViewId === view.id && "bg-accent"
                )}
                onClick={() => handleApply(view)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {view.is_default && (
                    <Star className="h-3 w-3 shrink-0 text-yellow-500 fill-yellow-500" />
                  )}
                  <span className="truncate text-sm">{view.name}</span>
                  {view.is_public ? (
                    <Globe className="h-3 w-3 shrink-0 text-muted-foreground" />
                  ) : (
                    <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />
                  )}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingView(view);
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingViewId(view.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </DropdownMenuItem>
            ))
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onClick={() => setIsFormOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("tasks.savedViews.create")}
          </DropdownMenuItem>

          {activeViewId && (
            <DropdownMenuItem
              className="cursor-pointer gap-2 text-muted-foreground"
              onClick={onClearView}
            >
              {t("tasks.savedViews.clearView")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("tasks.savedViews.create")}</DialogTitle>
          </DialogHeader>
          <SavedViewForm
            onSubmit={handleCreate}
            onCancel={() => setIsFormOpen(false)}
            isSubmitting={isCreating}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={!!editingView}
        onOpenChange={(open) => !open && setEditingView(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("tasks.savedViews.edit")}</DialogTitle>
          </DialogHeader>
          {editingView && (
            <SavedViewForm
              initialData={editingView}
              onSubmit={handleUpdate}
              onCancel={() => setEditingView(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingViewId}
        onOpenChange={(open) => !open && setDeletingViewId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("tasks.savedViews.deleteConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("tasks.savedViews.deleteConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
