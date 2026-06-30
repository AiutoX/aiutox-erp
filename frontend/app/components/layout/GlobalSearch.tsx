/**
 * GlobalSearch — Cmd+K command palette for cross-entity search.
 *
 * Behaviour:
 *  - Press Cmd+K (Mac) / Ctrl+K (Windows/Linux) to open the dialog
 *  - Clicking the search trigger also opens it
 *  - Debounce 300 ms before calling GET /api/v1/search/?q=...
 *  - Results grouped by entity_type with icon + label
 *  - Click a result → navigate to entity detail page
 *  - ESC / click-outside → close
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import { SearchIcon } from "@hugeicons/core-free-icons";
import {
  Building2,
  Home,
  User,
  FileText,
  Wrench,
  Archive,
  type LucideIcon,
} from "lucide-react";
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
import apiClient from "~/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchResult {
  id: string;
  title: string;
  content?: string;
  entity_type: string;
  entity_id: string;
}

interface SearchResponse {
  query: string;
  total: number;
  results: Record<string, SearchResult[]>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ENTITY_LABELS: Record<string, string> = {
  property: "Inmuebles",
  lease_tenant: "Inquilinos",
  owner: "Propietarios",
  lease_agreement: "Contratos",
  work_order: "Órdenes de trabajo",
  asset: "Activos CMMS",
};

const ENTITY_ROUTES: Record<string, (id: string) => string> = {
  property: (id) => `/properties/${id}`,
  lease_tenant: (id) => `/leases?tab=tenants&id=${id}`,
  owner: (id) => `/leases?tab=owners&id=${id}`,
  lease_agreement: (id) => `/leases/${id}`,
  work_order: (id) => `/maintenance/work-orders/${id}`,
  asset: (id) => `/maintenance/assets/${id}`,
};

const ENTITY_ICONS: Record<string, LucideIcon> = {
  property: Home,
  lease_tenant: User,
  owner: Building2,
  lease_agreement: FileText,
  work_order: Wrench,
  asset: Archive,
};

async function fetchSearchResults(
  query: string
): Promise<SearchResponse | null> {
  if (query.trim().length < 2) return null;
  try {
    const res = await apiClient.get<{ data: SearchResponse }>("/search/", {
      params: { q: query.trim(), limit: 30 },
    });
    return res.data.data;
  } catch {
    return null;
  }
}

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
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (!query.trim() || query.trim().length < 2) {
      setResults(null);
      return;
    }
    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      const data = await fetchSearchResults(query);
      setResults(data);
      setIsSearching(false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelect = useCallback(
    (entityType: string, entityId: string) => {
      setOpen(false);
      setQuery("");
      setResults(null);
      const routeFn = ENTITY_ROUTES[entityType];
      if (routeFn) {
        void navigate(routeFn(entityId));
      }
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

  const totalResults = results
    ? Object.values(results.results).reduce((acc, arr) => acc + arr.length, 0)
    : 0;

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

              {results &&
                Object.entries(results.results).map(([entityType, items]) => {
                  if (!items.length) return null;
                  const Icon = ENTITY_ICONS[entityType];
                  return (
                    <CommandGroup
                      key={entityType}
                      heading={ENTITY_LABELS[entityType] ?? entityType}
                    >
                      {items.map((item) => (
                        <CommandItem
                          key={item.entity_id}
                          value={`${entityType}-${item.entity_id}`}
                          onSelect={() =>
                            handleSelect(entityType, item.entity_id)
                          }
                        >
                          {Icon && (
                            <Icon className="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          )}
                          <span className="truncate">{item.title}</span>
                          {item.content && (
                            <span className="ml-2 truncate text-xs text-muted-foreground">
                              {item.content}
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
