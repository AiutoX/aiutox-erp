/**
 * CatalogListNav -- left column of the catalogs admin screen (ISSUE-031).
 *
 * Grouped (by `owner_module`), collapsible and searchable list of the
 * catalogs the viewer may administer (AC-UI-04/05). Selection is owned by
 * the caller (the `?list=` query param, see useSelectedCatalogList).
 *
 * AiutoX ERP Core -- Frankpach
 */

import { useCallback, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Lock } from "lucide-react";
import { SearchBar } from "~/components/common/SearchBar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { resolveLabel } from "~/lib/catalogs";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { cn } from "~/lib/utils";
import { useOwnerModuleName } from "../hooks/useOwnerModuleName";
import type { CatalogListAdmin } from "../types/catalogsAdmin.types";

export interface CatalogListNavProps {
  lists: CatalogListAdmin[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  /** Narrow layout (<1024px): full-width rows with a trailing chevron. */
  showChevrons?: boolean;
  className?: string;
}

interface CatalogGroup {
  ownerModule: string;
  lists: CatalogListAdmin[];
}

/** Lowercases and strips diacritics so "genero" matches "Género". */
function normalizeForSearch(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function matchesQuery(
  list: CatalogListAdmin,
  normalizedQuery: string
): boolean {
  if (!normalizedQuery) return true;
  if (normalizeForSearch(list.key).includes(normalizedQuery)) return true;
  // Every language of `labels`, so a query in either UI language finds the row.
  return Object.values(list.labels).some((label) =>
    normalizeForSearch(label).includes(normalizedQuery)
  );
}

/** Groups in order of first appearance, preserving the backend's list order. */
function groupByOwnerModule(lists: CatalogListAdmin[]): CatalogGroup[] {
  const groups = new Map<string, CatalogListAdmin[]>();
  for (const list of lists) {
    const bucket = groups.get(list.owner_module);
    if (bucket) {
      bucket.push(list);
    } else {
      groups.set(list.owner_module, [list]);
    }
  }
  return Array.from(groups, ([ownerModule, grouped]) => ({
    ownerModule,
    lists: grouped,
  }));
}

export function CatalogListNav({
  lists,
  selectedKey,
  onSelect,
  showChevrons = false,
  className,
}: CatalogListNavProps) {
  const { t, language } = useTranslation();
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const groups = useMemo(() => {
    const normalizedQuery = normalizeForSearch(query.trim());
    return groupByOwnerModule(
      lists.filter((list) => matchesQuery(list, normalizedQuery))
    );
  }, [lists, query]);

  const groupLabel = useOwnerModuleName();

  const toggleGroup = useCallback((ownerModule: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(ownerModule)) {
        next.delete(ownerModule);
      } else {
        next.add(ownerModule);
      }
      return next;
    });
  }, []);

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn("space-y-3", className)}
        data-testid="catalog-list-nav"
      >
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder={t("catalogs.admin.searchPlaceholder")}
          data-testid="catalog-list-search"
        />

        {groups.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            {t("catalogs.admin.noSearchMatch")}
          </p>
        ) : (
          <nav
            aria-label={t("catalogs.admin.listNavLabel")}
            className="space-y-2"
          >
            {groups.map((group) => {
              const isOpen = !collapsed.has(group.ownerModule);
              const label = groupLabel(group.ownerModule);
              const GroupChevron = isOpen ? ChevronDown : ChevronRight;
              return (
                <section
                  key={group.ownerModule}
                  data-testid={`catalog-group-${group.ownerModule}`}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => toggleGroup(group.ownerModule)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
                  >
                    <GroupChevron
                      className="h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="flex-1 truncate text-left">{label}</span>
                    <span
                      data-testid="catalog-group-count"
                      className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums"
                    >
                      {group.lists.length}
                    </span>
                  </button>

                  {isOpen && (
                    <ul className="mt-1 space-y-1">
                      {group.lists.map((list) => {
                        const isSelected = list.key === selectedKey;
                        return (
                          <li key={list.key}>
                            <button
                              type="button"
                              data-testid={`catalog-row-${list.key}`}
                              aria-current={isSelected ? "true" : undefined}
                              onClick={() => onSelect(list.key)}
                              className={cn(
                                "flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors",
                                isSelected
                                  ? "border-border bg-muted shadow-[inset_3px_0_0_0_hsl(var(--brand-accent,var(--secondary)))]"
                                  : "border-transparent hover:bg-muted/50"
                              )}
                            >
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium">
                                  {resolveLabel(
                                    list.labels,
                                    language,
                                    list.key
                                  )}
                                </span>
                                {/* On the selected row's muted fill, muted text
                                    falls below 4.5:1 (axe color-contrast,
                                    AC-UI-28), so the key gets a stronger tone. */}
                                <span
                                  data-testid="catalog-row-key"
                                  className={cn(
                                    "block truncate font-mono text-xs",
                                    isSelected
                                      ? "text-foreground/75"
                                      : "text-muted-foreground"
                                  )}
                                >
                                  {list.key}
                                </span>
                              </span>
                              {!list.tenant_can_manage && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span
                                      data-testid="catalog-row-lock"
                                      aria-label={t(
                                        "catalogs.admin.lockedTooltip"
                                      )}
                                      className="shrink-0 text-muted-foreground"
                                    >
                                      <Lock
                                        className="h-3.5 w-3.5"
                                        aria-hidden="true"
                                      />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {t("catalogs.admin.lockedTooltip")}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {showChevrons && (
                                <ChevronRight
                                  data-testid="catalog-row-chevron"
                                  className="h-4 w-4 shrink-0 text-muted-foreground"
                                  aria-hidden="true"
                                />
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })}
          </nav>
        )}
      </div>
    </TooltipProvider>
  );
}
