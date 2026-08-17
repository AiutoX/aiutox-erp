/**
 * SavedFilters Component
 * Generic reusable component for applying saved filters in any module.
 */

import { Filter, Plus, Star, Share2, Settings2 } from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import type {
  FieldConfig,
  SavedFilter as SavedFilterType,
  SavedFilterCreate,
} from "../types/savedFilter.types";
import { useSavedFilters } from "../hooks/useSavedFilters";
import { FilterEditorModal } from "./FilterEditorModal";
import { useTranslation } from "~/lib/i18n/useTranslation";

export interface SavedFiltersProps {
  module: string;
  fields: FieldConfig[];
  onApply?: (filterId: string | null) => void;
  currentFilterId?: string | null;
  onManageClick?: () => void;
  onSaveCurrentFilter?: () => void; // For quick save current filter
  // Optional: pass hook state from parent to avoid duplicate instances
  filters?: SavedFilterType[];
  defaultFilter?: SavedFilterType | null;
  loading?: boolean;
  error?: Error | null;
  getMyFilters?: (module: string) => SavedFilterType[];
  getSharedFilters?: (module: string) => SavedFilterType[];
  refreshFilters?: () => Promise<void>;
  createFilter?: (
    filterData: SavedFilterCreate
  ) => Promise<SavedFilterType | null>;
  autoLoad?: boolean; // If false, don't create own hook instance
}

/**
 * SavedFilters component for applying saved filters
 */
export function SavedFilters({
  module,
  fields,
  onApply,
  currentFilterId,
  onManageClick,
  // onSaveCurrentFilter, // Unused for now
  filters: propsFilters,
  defaultFilter: propsDefaultFilter,
  loading: propsLoading,
  error: propsError,
  getMyFilters: propsGetMyFilters,
  getSharedFilters: propsGetSharedFilters,
  refreshFilters: propsRefreshFilters,
  createFilter: propsCreateFilter,
  autoLoad = true,
}: SavedFiltersProps) {
  // Use hook only if props are not provided (parent not managing state)
  const hookState = useSavedFilters(module, autoLoad && !propsFilters);
  const {
    filters: hookFilters,
    defaultFilter: hookDefaultFilter,
    loading: hookLoading,
    error: hookError,
    getMyFilters: hookGetMyFilters,
    getSharedFilters: hookGetSharedFilters,
    refreshFilters: hookRefreshFilters,
    createFilter: hookCreateFilter,
  } = hookState;

  // Use props if provided, otherwise use hook state
  const filters = propsFilters ?? hookFilters;
  const defaultFilter = propsDefaultFilter ?? hookDefaultFilter;
  const loading = propsLoading ?? hookLoading;
  const error = propsError ?? hookError;
  const getMyFilters = propsGetMyFilters ?? hookGetMyFilters;
  const getSharedFilters = propsGetSharedFilters ?? hookGetSharedFilters;
  const refreshFilters = propsRefreshFilters ?? hookRefreshFilters;
  const createFilter = propsCreateFilter ?? hookCreateFilter;

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingFilter, setEditingFilter] = useState<SavedFilterType | null>(
    null
  );
  const { t } = useTranslation();

  // Group filters by type
  const { myFilters, sharedFilters } = useMemo(() => {
    const my = getMyFilters(module);
    const shared = getSharedFilters(module);
    return { myFilters: my, sharedFilters: shared };
  }, [module, getMyFilters, getSharedFilters]);

  // Get current filter name
  const currentFilter = useMemo(() => {
    if (!currentFilterId) return null;
    return filters.find((f) => f.id === currentFilterId) || null;
  }, [currentFilterId, filters]);

  const handleApplyFilter = (filterId: string | null) => {
    if (onApply) {
      onApply(filterId);
    }
  };

  const handleClearFilter = () => {
    handleApplyFilter(null);
  };

  const handleNewFilter = () => {
    setEditingFilter(null);
    setEditorOpen(true);
  };

  const handleSaveFilter = async (filterData: SavedFilterCreate) => {
    const saved = await createFilter(filterData);
    if (saved) {
      setEditorOpen(false);
      setEditingFilter(null);
      await refreshFilters();
      // Optionally apply the new filter
      if (onApply) {
        onApply(saved.id);
      }
    }
    return saved;
  };

  // const _handleQuickSave = () => { // Unused for now
  //   if (onSaveCurrentFilter) {
  //     onSaveCurrentFilter();
  //   } else {
  //     handleNewFilter();
  //   }
  // };

  if (loading && filters.length === 0) {
    return (
      <Button variant="outline" disabled>
        <Filter className="mr-2 h-4 w-4" />
        {t("savedFilters.loading")}
      </Button>
    );
  }

  // Only show error if we have an error AND no filters loaded AND not currently loading
  // This ensures we don't show stale errors after a successful load
  const shouldShowError = error && !loading && filters.length === 0;

  // Get user-friendly error message based on error type
  const getErrorMessage = (err: Error | null): string => {
    if (!err) return t("savedFilters.errorUnknown");

    const errorMessage = err.message.toLowerCase();

    // Check for network errors
    if (
      errorMessage.includes("network") ||
      errorMessage.includes("network error")
    ) {
      return t("savedFilters.errorNetwork");
    }

    // Check for CORS errors
    if (
      errorMessage.includes("cors") ||
      errorMessage.includes("blocked by cors")
    ) {
      return t("savedFilters.errorCORS");
    }

    // Check for server errors (5xx)
    if (
      errorMessage.includes("500") ||
      errorMessage.includes("internal server error")
    ) {
      return t("savedFilters.errorServer");
    }

    // Default error message
    return t("savedFilters.errorLoading");
  };

  if (shouldShowError) {
    return (
      <div className="text-sm text-destructive">{getErrorMessage(error)}</div>
    );
  }

  const hasFilters =
    defaultFilter || myFilters.length > 0 || sharedFilters.length > 0;

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            {currentFilter ? currentFilter.name : t("savedFilters.title")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>{t("savedFilters.title")}</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Default Filter */}
          {defaultFilter && (
            <>
              <DropdownMenuItem
                onClick={() => handleApplyFilter(defaultFilter.id)}
                className="gap-2"
              >
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span className="flex-1">{defaultFilter.name}</span>
                {currentFilterId === defaultFilter.id && (
                  <span className="text-xs text-muted-foreground">✓</span>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {/* My Filters */}
          {myFilters.length > 0 && (
            <>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {t("savedFilters.myFilters")}
              </DropdownMenuLabel>
              {myFilters.map((filter) => (
                <DropdownMenuItem
                  key={filter.id}
                  onClick={() => handleApplyFilter(filter.id)}
                  className="gap-2"
                >
                  <span className="flex-1">{filter.name}</span>
                  {currentFilterId === filter.id && (
                    <span className="text-xs text-muted-foreground">✓</span>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}

          {/* Shared Filters */}
          {sharedFilters.length > 0 && (
            <>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {t("savedFilters.shared")}
              </DropdownMenuLabel>
              {sharedFilters.map((filter) => (
                <DropdownMenuItem
                  key={filter.id}
                  onClick={() => handleApplyFilter(filter.id)}
                  className="gap-2"
                >
                  <Share2 className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">{filter.name}</span>
                  {currentFilterId === filter.id && (
                    <span className="text-xs text-muted-foreground">✓</span>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}

          {/* No filters message */}
          {!hasFilters && (
            <DropdownMenuItem disabled className="text-muted-foreground">
              {t("savedFilters.noFilters")}
            </DropdownMenuItem>
          )}

          {/* Clear filter option */}
          {currentFilterId && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleClearFilter}
                className="text-muted-foreground"
              >
                {t("savedFilters.clear")}
              </DropdownMenuItem>
            </>
          )}

          {/* New Filter Option */}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleNewFilter} className="gap-2">
            <Plus className="h-4 w-4" />
            <span>{t("savedFilters.newFilter")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Manage Filters Button */}
      {onManageClick && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onManageClick}
          title={t("savedFilters.manage")}
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      )}

      {/* Filter Editor Modal */}
      <FilterEditorModal
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setEditingFilter(null);
        }}
        onSave={handleSaveFilter}
        filter={editingFilter}
        module={module}
        fields={fields}
      />
    </div>
  );
}
