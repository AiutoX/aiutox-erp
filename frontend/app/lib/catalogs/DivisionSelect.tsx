/**
 * DivisionSelect — dependent administrative-division select (contract C26,
 * ISSUE-030, AC-LIB-08). Level 1 lists a country's departments; level 2
 * lists the municipalities under `parentCode` and stays disabled with
 * "Selecciona primero el departamento" until a parent is set. Options read
 * "Medellín · 05001"; codes stay strings with leading zeros (RULE-019).
 *
 * - A country with `has_divisions=false` (from `useCountries()`) renders a
 *   free-text `Input` bound to the same `value` / `onChange` contract (E-16).
 * - Changing `country` (or `parentCode`, for level 2) clears a value that
 *   belonged to the previous scope via `onChange(null)`.
 * - A parent's full child list loads in one request and is filtered
 *   client-side, accent-insensitively (PERF-07).
 * - At >=768px it is the shared `ReferenceCombobox` (`Popover` + `Command`,
 *   as in `CountrySelect`); below 768px it opens a full-height bottom `Sheet`
 *   with a sticky search input over the same `Command` list.
 *
 * AiutoX ERP Core -- Frankpach
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { cn } from "~/lib/utils";
import { useTranslation } from "~/lib/i18n/useTranslation";
import {
  ReferenceCombobox,
  type ReferenceOption,
  type ReferenceOptionGroup,
} from "./CountrySelect";
import { normalizeSearchText, useCountries } from "./reference-hooks";
import { useDivisions, type DivisionLevel } from "./useDivisions";
import type { SelectFieldA11yProps } from "./types";

const TEST_ID_PREFIX = "division-select";

/** Below Tailwind's `md` breakpoint (768px) the select opens as a Sheet. */
const MOBILE_QUERY = "(max-width: 767px)";

export interface DivisionSelectProps extends SelectFieldA11yProps {
  /** ISO 3166-1 alpha-2 code, uppercase (as `CountrySelect` reports it). */
  country: string;
  /** 1 = department, 2 = municipality. */
  level: DivisionLevel;
  /** Level-1 code the level-2 list depends on; ignored for level 1. */
  parentCode?: string | null;
  /** Selected division code (or free text for a country without divisions). */
  value: string | null;
  /** Receives the picked code, or null when the selection is cleared. */
  onChange: (code: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function DivisionSelect({
  country,
  level,
  parentCode,
  value,
  onChange,
  disabled = false,
  placeholder,
  id,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: DivisionSelectProps) {
  const { t } = useTranslation();
  const isMobile = useIsBelowMd();
  const parent = level === 2 ? parentCode || null : null;

  useClearOnScopeChange(country, parent, value, onChange);

  const countries = useCountries();
  const countryRow = countries.data?.items.find(
    (item) => item.code === country
  );
  const hasDivisions = countryRow?.has_divisions === true;
  const awaitingParent = level === 2 && parent === null;
  const a11y = {
    id,
    "aria-invalid": ariaInvalid,
    "aria-describedby": ariaDescribedBy,
  };

  const divisions = useDivisions({
    country,
    level,
    parentCode: parent,
    enabled: hasDivisions && !awaitingParent,
  });

  const options = useMemo<ReferenceOption[]>(
    () =>
      // Kept in the backend's order (name, then code).
      (divisions.data?.items ?? []).map((item) => ({
        code: item.code,
        label: `${item.name} · ${item.code}`,
        searchTerms: [item.name, item.code],
      })),
    [divisions.data]
  );
  const groups = useMemo<ReferenceOptionGroup[]>(
    () => [{ id: "all", options }],
    [options]
  );

  if (country && countries.isSuccess && !hasDivisions) {
    return (
      <Input
        type="text"
        data-testid={`${TEST_ID_PREFIX}-input`}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        disabled={disabled}
        placeholder={placeholder}
        {...a11y}
      />
    );
  }

  const isLoading = countries.isLoading || divisions.isLoading;
  const isError = countries.isError || divisions.isError;
  const locked = disabled || !country || awaitingParent;
  const effectivePlaceholder = awaitingParent
    ? t("catalogs.select.selectParentFirst")
    : placeholder;

  if (isMobile && !locked && !isLoading && !isError) {
    return (
      <DivisionSheetSelect
        options={options}
        value={value}
        onChange={onChange}
        placeholder={effectivePlaceholder}
        {...a11y}
      />
    );
  }

  return (
    <ReferenceCombobox
      testIdPrefix={TEST_ID_PREFIX}
      groups={groups}
      value={value}
      onChange={onChange}
      disabled={locked}
      placeholder={effectivePlaceholder}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => {
        if (countries.isError) void countries.refetch();
        else void divisions.refetch();
      }}
      {...a11y}
    />
  );
}

interface DivisionSheetSelectProps extends SelectFieldA11yProps {
  options: ReferenceOption[];
  value: string | null;
  onChange: (code: string) => void;
  placeholder?: string;
}

/** Mobile variant: a full-height bottom Sheet with a sticky search input. */
function DivisionSheetSelect({
  options,
  value,
  onChange,
  placeholder,
  id,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: DivisionSheetSelectProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const visibleOptions = useMemo(() => {
    const query = normalizeSearchText(search.trim());
    if (!query) return options;
    return options.filter((option) =>
      option.searchTerms.some((term) =>
        normalizeSearchText(term).includes(query)
      )
    );
  }, [options, search]);

  const defaultPlaceholder = placeholder ?? t("catalogs.select.placeholder");
  const selected = value
    ? options.find((option) => option.code === value)
    : undefined;
  // Same rule as ReferenceCombobox: an unknown stored code shows as itself.
  const triggerLabel = value ? (selected?.label ?? value) : defaultPlaceholder;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          id={id}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          data-testid={`${TEST_ID_PREFIX}-trigger`}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        data-testid={`${TEST_ID_PREFIX}-sheet`}
        aria-describedby={undefined}
        className="flex h-full flex-col gap-0 p-0"
      >
        <SheetTitle className="sr-only">{defaultPlaceholder}</SheetTitle>
        <Command className="min-h-0 flex-1 rounded-none">
          <div
            data-testid={`${TEST_ID_PREFIX}-search`}
            className="sticky top-0 z-10 shrink-0 border-b bg-[hsl(var(--popover))] py-2 pl-3 pr-12"
          >
            <CommandInput
              placeholder={t("catalogs.select.searchPlaceholder")}
              aria-label={t("catalogs.select.searchPlaceholder")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <CommandList role="listbox" className="max-h-none flex-1 p-1">
            {visibleOptions.length === 0 && (
              <CommandEmpty>{t("catalogs.select.empty")}</CommandEmpty>
            )}
            {visibleOptions.map((option) => (
              <CommandItem
                key={option.code}
                role="option"
                aria-selected={value === option.code}
                className="py-3"
                onSelect={() => {
                  onChange(option.code);
                  setSearch("");
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === option.code ? "opacity-100" : "opacity-0"
                  )}
                />
                {option.label}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Calls `onChange(null)` when the scope (`country`, or the level-2 parent)
 * actually changes while a value from the previous scope is still selected.
 * A value the caller sets in the same update as the new scope (e.g. a saved
 * record loading) is kept; first mount and unchanged re-renders never clear.
 */
function useClearOnScopeChange(
  country: string,
  parent: string | null,
  value: string | null,
  onChange: (code: string | null) => void
) {
  const previous = useRef({ country, parent, value });

  useEffect(() => {
    const prev = previous.current;
    previous.current = { country, parent, value };
    const scopeChanged = prev.country !== country || prev.parent !== parent;
    if (scopeChanged && value && value === prev.value) {
      onChange(null);
    }
  }, [country, parent, value, onChange]);
}

/** True below Tailwind's `md` breakpoint. SSR-safe: false until mounted. */
function useIsBelowMd(): boolean {
  const [isBelowMd, setIsBelowMd] = useState(matchesMobile);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }
    const media = window.matchMedia(MOBILE_QUERY);
    const onMediaChange = (event: MediaQueryListEvent) =>
      setIsBelowMd(event.matches);
    setIsBelowMd(media.matches);
    media.addEventListener("change", onMediaChange);
    return () => media.removeEventListener("change", onMediaChange);
  }, []);

  return isBelowMd;
}

function matchesMobile(): boolean {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }
  return window.matchMedia(MOBILE_QUERY).matches;
}
