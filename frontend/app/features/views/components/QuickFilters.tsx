/**
 * Quick Filters Component
 * Displays filter chips for quick access to common filters.
 */

import { X } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import type { SavedFilter } from "../types/savedFilter.types";

export interface QuickFiltersProps {
  filters: SavedFilter[];
  activeFilterId?: string | null;
  onApply: (filterId: string | null) => void;
  maxVisible?: number; // Maximum number of chips to show
}

/**
 * Quick Filters component
 * Shows filter chips for quick access
 */
export function QuickFilters({
  filters,
  activeFilterId,
  onApply,
  maxVisible = 5,
}: QuickFiltersProps) {
  const visibleFilters = filters.slice(0, maxVisible);
  const hasMore = filters.length > maxVisible;

  if (filters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {visibleFilters.map((filter) => {
        const isActive = activeFilterId === filter.id;
        return (
          <Badge
            key={filter.id}
            variant={isActive ? "default" : "outline"}
            className="cursor-pointer gap-1 px-3 py-1"
            onClick={() => onApply(isActive ? null : filter.id)}
          >
            {filter.name}
            {isActive && (
              <X
                className="ml-1 h-3 w-3"
                onClick={(e) => {
                  e.stopPropagation();
                  onApply(null);
                }}
              />
            )}
          </Badge>
        );
      })}
      {hasMore && (
        <Badge variant="outline" className="px-3 py-1">
          +{filters.length - maxVisible} más
        </Badge>
      )}
    </div>
  );
}
