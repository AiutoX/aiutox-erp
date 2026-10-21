/**
 * CountrySelect — searchable ISO 3166-1 country combobox (contract C25,
 * ISSUE-029, AC-LIB-07). Search is client-side and accent-insensitive over
 * the localized name and the ISO code, against the full cached
 * `useCountries()` payload (about 250 rows) — no request per keystroke.
 * Options are alphabetical by localized name; `pinned` codes render in a
 * "Frecuentes" group above "Todos".
 *
 * Also hosts `ReferenceCombobox`, the `Popover` + `Command` combobox shared
 * with `CurrencySelect`. Its structure and loading / error states mirror
 * `CatalogSelect` (the `features/real_estate/shared/OrganizationCombobox.tsx`
 * pattern — copied, not imported, per the "shared code must not import from
 * ~/features/{business}/" rule).
 */

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader2, RotateCcw } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { cn } from "~/lib/utils";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { resolveLabel } from "./hooks";
import { normalizeSearchText, useCountries } from "./reference-hooks";
import type { SelectFieldA11yProps } from "./types";

export interface CountrySelectProps extends SelectFieldA11yProps {
  /** Selected ISO 3166-1 alpha-2 code, or null. */
  value: string | null;
  onChange: (code: string) => void;
  /** Codes shown first under "Frecuentes", in the order given. */
  pinned?: string[];
  disabled?: boolean;
  placeholder?: string;
}

export function CountrySelect({
  value,
  onChange,
  pinned,
  disabled = false,
  placeholder,
  id,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: CountrySelectProps) {
  const { t, language } = useTranslation();
  const { data, isLoading, isError, refetch } = useCountries();

  const groups = useMemo<ReferenceOptionGroup[]>(() => {
    const collator = new Intl.Collator(language, { sensitivity: "base" });
    const options: ReferenceOption[] = (data?.items ?? [])
      .map((item) => {
        const label = resolveLabel(item.names, language, item.code);
        return { code: item.code, label, searchTerms: [label, item.code] };
      })
      .sort((a, b) => collator.compare(a.label, b.label));

    const pinnedCodes = pinned ?? [];
    const pinnedOptions = pinnedCodes
      .map((code) => options.find((option) => option.code === code))
      .filter((option): option is ReferenceOption => option !== undefined);

    if (pinnedOptions.length === 0) {
      return [{ id: "all", options }];
    }

    return [
      {
        id: "pinned",
        heading: t("catalogs.select.frequentGroup"),
        options: pinnedOptions,
      },
      {
        id: "all",
        heading: t("catalogs.select.allGroup"),
        options: options.filter((option) => !pinnedCodes.includes(option.code)),
      },
    ];
  }, [data, language, pinned, t]);

  return (
    <ReferenceCombobox
      testIdPrefix="country-select"
      groups={groups}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      id={id}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
    />
  );
}

/** One selectable option of a `ReferenceCombobox`. */
export interface ReferenceOption {
  code: string;
  /** Text shown in the list and, when selected, in the trigger. */
  label: string;
  /** Strings matched (accent/case-insensitively) against the search. */
  searchTerms: string[];
}

/** A group of options; `heading` is omitted for a single unlabeled group. */
export interface ReferenceOptionGroup {
  id: string;
  heading?: string;
  options: ReferenceOption[];
}

export interface ReferenceComboboxProps extends SelectFieldA11yProps {
  /** Prefix of every `data-testid` (`{prefix}-trigger`, `{prefix}-retry`…). */
  testIdPrefix: string;
  groups: ReferenceOptionGroup[];
  value: string | null;
  onChange: (code: string) => void;
  disabled: boolean;
  placeholder?: string;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function ReferenceCombobox({
  testIdPrefix,
  groups,
  value,
  onChange,
  disabled,
  placeholder,
  isLoading,
  isError,
  onRetry,
  id,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: ReferenceComboboxProps) {
  const { t } = useTranslation();
  const a11y = {
    id,
    "aria-invalid": ariaInvalid,
    "aria-describedby": ariaDescribedBy,
  };
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const visibleGroups = useMemo(() => {
    const query = normalizeSearchText(search.trim());
    if (!query) return groups.filter((group) => group.options.length > 0);
    return groups
      .map((group) => ({
        ...group,
        options: group.options.filter((option) =>
          option.searchTerms.some((term) =>
            normalizeSearchText(term).includes(query)
          )
        ),
      }))
      .filter((group) => group.options.length > 0);
  }, [groups, search]);

  if (isLoading) {
    return (
      <Button
        type="button"
        variant="outline"
        disabled
        {...a11y}
        data-testid={`${testIdPrefix}-trigger`}
        className="w-full justify-between font-normal text-muted-foreground"
      >
        {t("catalogs.select.loading")}
        <Loader2
          data-testid={`${testIdPrefix}-spinner`}
          className="ml-2 h-4 w-4 shrink-0 animate-spin"
        />
      </Button>
    );
  }

  if (isError) {
    return (
      <div className="flex w-full items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled
          {...a11y}
          data-testid={`${testIdPrefix}-trigger`}
          className="w-full justify-between font-normal text-muted-foreground"
        >
          {t("catalogs.select.error")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("catalogs.select.retry")}
          data-testid={`${testIdPrefix}-retry`}
          onClick={onRetry}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const selected = value
    ? groups
        .flatMap((group) => group.options)
        .find((option) => option.code === value)
    : undefined;
  // A stored code missing from the dataset (e.g. an inactive row) still
  // shows as its raw code rather than disappearing.
  const triggerLabel = value
    ? (selected?.label ?? value)
    : (placeholder ?? t("catalogs.select.placeholder"));

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          {...a11y}
          disabled={disabled}
          data-testid={`${testIdPrefix}-trigger`}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command>
          <CommandInput
            placeholder={t("catalogs.select.searchPlaceholder")}
            aria-label={t("catalogs.select.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <CommandList role="listbox">
            {visibleGroups.length === 0 && (
              <CommandEmpty>{t("catalogs.select.empty")}</CommandEmpty>
            )}
            {visibleGroups.map((group) => (
              <CommandGroup
                key={group.id}
                heading={group.heading}
                data-testid={`${testIdPrefix}-group-${group.id}`}
              >
                {group.options.map((option) => (
                  <CommandItem
                    key={option.code}
                    role="option"
                    aria-selected={value === option.code}
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
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
