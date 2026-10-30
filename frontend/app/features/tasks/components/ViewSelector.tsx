/**
 * ViewSelector component
 * Dropdown to select, create, and manage saved task views.
 */

import { useState } from "react";
import { Bookmark, Plus, Trash2, Star } from "lucide-react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useSavedViews } from "~/features/tasks/hooks/useSavedViews";
import type { SavedView } from "~/features/tasks/types/task.types";

interface ViewSelectorProps {
  currentFilters: SavedView["filters"];
  currentSort: SavedView["sort_config"];
  onApplyView: (view: SavedView) => void;
}

export function ViewSelector({
  currentFilters,
  currentSort,
  onApplyView,
}: ViewSelectorProps) {
  const { t } = useTranslation();
  const { views, createView, deleteView, isCreating } = useSavedViews();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  const handleSaveView = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    await createView({
      name: trimmed,
      filters: currentFilters,
      sort_config: currentSort,
      column_config: {},
      is_default: false,
      is_public: false,
    });
    setNewName("");
    setShowCreate(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      void handleSaveView();
    } else if (e.key === "Escape") {
      setShowCreate(false);
      setNewName("");
    }
  };

  const handleDelete = async (e: React.MouseEvent, viewId: string) => {
    e.stopPropagation();
    await deleteView(viewId);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Bookmark className="h-3.5 w-3.5" />
          {t("tasks.savedViews.title")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {views.length === 0 && !showCreate && (
          <div className="px-2 py-3 text-xs text-muted-foreground text-center">
            {t("tasks.savedViews.noViews")}
          </div>
        )}

        {views.map((view) => (
          <DropdownMenuItem
            key={view.id}
            className="flex items-center justify-between group cursor-pointer"
            onClick={() => onApplyView(view)}
          >
            <div className="flex items-center gap-2 truncate">
              {view.is_default && (
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 shrink-0" />
              )}
              <span className="truncate">{view.name}</span>
            </div>
            <button
              type="button"
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0"
              onClick={(e) => void handleDelete(e, view.id)}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        {showCreate ? (
          <div className="px-2 py-1.5">
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("tasks.savedViews.namePlaceholder")}
              className="h-7 text-sm"
              disabled={isCreating}
            />
            <div className="flex gap-1 mt-1.5">
              <Button
                size="sm"
                variant="default"
                className="h-6 text-xs flex-1"
                onClick={() => void handleSaveView()}
                disabled={isCreating || !newName.trim()}
              >
                {t("common.save")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs"
                onClick={() => {
                  setShowCreate(false);
                  setNewName("");
                }}
              >
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-2" />
            {t("tasks.savedViews.saveCurrentView")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
