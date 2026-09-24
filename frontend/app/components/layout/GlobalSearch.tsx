/**
 * GlobalSearch — Cmd+K command palette for cross-entity search.
 *
 * Behaviour:
 *  - Press Cmd+K (Mac) / Ctrl+K (Windows/Linux) to open the dialog
 *  - Clicking the search trigger also opens it
 *  - Debounce 300 ms before calling POST /api/v1/search (the only method the
 *    backend route accepts — GET was never implemented server-side)
 *  - Results grouped by entity type (derived client-side from the flat
 *    result list) with icon + label sourced from GET /search/searchable-types
 *    — never a hardcoded registry, so a new SearchProvider shows up here
 *    automatically with no frontend change.
 *  - Click a result → navigate to result.url (already resolved server-side)
 *  - ESC / click-outside → close
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import { SearchIcon } from "@hugeicons/core-free-icons";
import { FileText } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "~/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { useTranslation } from "~/lib/i18n/useTranslation";
import {
  search,
  type SearchResultItem,
  type SearchableType,
} from "~/features/search/api/search.api";
import { useSearchableTypes } from "~/features/search/hooks/useSearch";
import { useHasPermission } from "~/hooks/usePermissions";

// ─── Component ────────────────────────────────────────────────────────────────

interface GlobalSearchProps {
  /** If true, renders just the trigger bar (no floating behavior needed). */
  className?: string;
}

export function GlobalSearch({ className }: GlobalSearchProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState<boolean>(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAccess = useHasPermission("search.view");

  const { data: searchableTypes } = useSearchableTypes(hasAccess);
  const typeByEntityType = useMemo(() => {
    const map: Record<string, SearchableType> = {};
    for (const entry of searchableTypes ?? []) map[entry.entity_type] = entry;
    return map;
  }, [searchableTypes]);

  const labelForEntityType = useCallback(
    (entityType: string, fallbackLabel: string) => {
      const translated = t(`search.entityTypes.${entityType}`);
      return translated === `search.entityTypes.${entityType}`
        ? fallbackLabel
        : translated;
    },
    [t]
  );

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!hasAccess || !query.trim() || query.trim().length < 2) {
      setResults(null);
      return;
    }
    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const response = await search({ query: query.trim(), limit: 30 });
        setResults(response.data);
      } catch {
        setResults(null);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, hasAccess]);

  const handleSelect = useCallback(
    (url: string) => {
      setOpen(false);
      setQuery("");
      setResults(null);
      void navigate(url);
    },
    [navigate]
  );

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) {
      setQuery("");
      setResults(null);
    }
  };

  const resultsByType = useMemo(() => {
    const grouped: Record<string, SearchResultItem[]> = {};
    for (const result of results ?? []) {
      (grouped[result.type] ??= []).push(result);
    }
    return grouped;
  }, [results]);

  const totalResults = results?.length ?? 0;

  return (
    <>
      {/* Trigger — mimics the existing search bar style */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full flex items-center gap-2 pl-10 pr-4 py-2 border border-input/50 bg-muted/30 rounded-md text-sm text-muted-foreground focus:outline-none hover:bg-muted/50 transition-colors ${className ?? ""}`}
        aria-label={t("layout.header.searchAria")}
      >
        <HugeiconsIcon
          icon={SearchIcon}
          size={16}
          color="hsl(var(--muted-foreground))"
          className="absolute"
          strokeWidth={1.5}
        />
        <span className="pl-5 truncate">
          {t("layout.header.searchPlaceholder")}
        </span>
        <kbd className="ml-auto pointer-events-none hidden select-none items-center gap-1 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="overflow-hidden p-0 shadow-xl max-w-xl">
          <DialogTitle className="sr-only">
            {t("layout.header.searchPlaceholder")}
          </DialogTitle>
          <Command>
            <div className="flex items-center border-b px-3">
              <HugeiconsIcon
                icon={SearchIcon}
                size={16}
                color="hsl(var(--muted-foreground))"
                strokeWidth={1.5}
                className="shrink-0"
              />
              <CommandInput
                className="ml-2"
                placeholder={t("layout.header.searchPlaceholder")}
                value={query}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setQuery(e.target.value)
                }
                autoFocus
              />
              {isSearching && (
                <div className="ml-2 h-3 w-3 animate-spin rounded-full border border-muted-foreground border-t-transparent" />
              )}
            </div>

            <CommandList className="max-h-80">
              {query.trim().length >= 2 &&
                !isSearching &&
                totalResults === 0 && (
                  <CommandEmpty>{t("search.noResults")}</CommandEmpty>
                )}

              {query.trim().length < 2 && (
                <CommandEmpty className="text-xs text-muted-foreground">
                  {t("search.typeToSearch")}
                </CommandEmpty>
              )}

              {Object.entries(resultsByType).map(([entityType, items]) => {
                if (!items.length) return null;
                const typeInfo = typeByEntityType[entityType];
                const heading = labelForEntityType(
                  entityType,
                  typeInfo?.label ?? entityType
                );
                return (
                  <CommandGroup key={entityType} heading={heading}>
                    {items.map((item) => (
                      <CommandItem
                        key={`${entityType}-${item.id}`}
                        value={`${entityType}-${item.id}`}
                        onSelect={() => handleSelect(item.url)}
                      >
                        {/* typeInfo.icon is a backend-declared string identifier
                            (SearchIndexDefinition.icon), not a component — no
                            string-to-lucide-icon mapping exists yet, so every
                            result uses one generic icon rather than
                            reintroducing a hardcoded per-type icon registry. */}
                        <FileText className="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{item.title}</span>
                        {item.description && (
                          <span className="ml-2 truncate text-xs text-muted-foreground">
                            {item.description}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
