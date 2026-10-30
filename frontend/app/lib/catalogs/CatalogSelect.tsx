/**
 * CatalogSelect — renders a tenant's effective catalog options as a select
 * (contract C24, ISSUE-027). Looks and behaves like the existing shadcn
 * `Select` (MODULE-SPEC Section 6). Branches internally on item count:
 * <= 15 items renders the plain `components/ui/select.tsx` listbox; > 15
 * renders a searchable combobox (`Popover` + `Command`, the pattern of
 * `features/real_estate/shared/OrganizationCombobox.tsx` — copied, not
 * imported, per the "shared code must not import from
 * ~/features/{business}/" rule).
 */

import { useState, type ReactNode } from "react";
import { Check, ChevronsUpDown, Loader2, RotateCcw } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
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
import type { CatalogItem, SelectFieldA11yProps } from "./types";
import { useCatalogForSelection, resolveLabel } from "./hooks";

const COMBOBOX_THRESHOLD = 15;

export interface CatalogSelectProps extends SelectFieldA11yProps {
  listKey: string;
  value: string | null;
  onChange: (code: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function CatalogSelect({
  listKey,
  value,
  onChange,
  disabled = false,
  placeholder,
  id,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: CatalogSelectProps) {
  const { t, language } = useTranslation();
  const {
    data: items,
    isLoading,
    isError,
    refetch,
  } = useCatalogForSelection(listKey, value ? [value] : []);

  const resolvedPlaceholder = placeholder ?? t("catalogs.select.placeholder");
  const a11y = {
    id,
    "aria-invalid": ariaInvalid,
    "aria-describedby": ariaDescribedBy,
  };

  if (isLoading) {
    return (
      <Button
        type="button"
        variant="outline"
        disabled
        {...a11y}
        data-testid="catalog-select-trigger"
        className="w-full justify-between font-normal text-muted-foreground"
      >
        {t("catalogs.select.loading")}
        <Loader2
          data-testid="catalog-select-spinner"
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
          data-testid="catalog-select-trigger"
          className="w-full justify-between font-normal text-muted-foreground"
        >
          {t("catalogs.select.error")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("catalogs.select.retry")}
          data-testid="catalog-select-retry"
          onClick={() => refetch()}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const options = items ?? [];

  const labelFor = (code: string, labels: Record<string, string>) =>
    resolveLabel(labels, language, code);

  // Plain text of an option (search matching); the "(inactivo)" suffix is part
  // of what the user types against, as in the rendered row.
  const displayText = (code: string) => {
    const item = options.find((candidate) => candidate.code === code);
    if (!item) return code;
    const base = labelFor(item.code, item.labels);
    return item.is_selectable
      ? base
      : `${base} (${t("catalogs.select.inactive")})`;
  };

  // What is rendered: the label, plus the muted "(inactivo)" span for a code
  // that is no longer selectable (AC-LIB-03).
  const displayLabel = (code: string): ReactNode => {
    const item = options.find((candidate) => candidate.code === code);
    if (!item) return code;
    const base = labelFor(item.code, item.labels);
    if (item.is_selectable) return base;
    return (
      <>
        {base}{" "}
        <span className="text-muted-foreground">
          ({t("catalogs.select.inactive")})
        </span>
      </>
    );
  };

  if (options.length > COMBOBOX_THRESHOLD) {
    return (
      <CatalogCombobox
        options={options}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={resolvedPlaceholder}
        displayLabel={displayLabel}
        displayText={displayText}
        {...a11y}
      />
    );
  }

  return (
    <Select
      value={value ?? undefined}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger
        {...a11y}
        data-testid="catalog-select-trigger"
        className={cn(!value && "text-muted-foreground")}
      >
        <SelectValue placeholder={resolvedPlaceholder}>
          {value ? displayLabel(value) : undefined}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((item) => (
          <SelectItem key={item.code} value={item.code}>
            {displayLabel(item.code)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface CatalogComboboxProps extends SelectFieldA11yProps {
  options: CatalogItem[];
  value: string | null;
  onChange: (code: string) => void;
  disabled: boolean;
  placeholder: string;
  displayLabel: (code: string) => ReactNode;
  displayText: (code: string) => string;
}

function CatalogCombobox({
  options,
  value,
  onChange,
  disabled,
  placeholder,
  displayLabel,
  displayText,
  id,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: CatalogComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { t } = useTranslation();

  const filtered = options.filter((item) =>
    displayText(item.code).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          id={id}
          disabled={disabled}
          data-testid="catalog-select-trigger"
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground"
          )}
        >
          {value ? displayLabel(value) : placeholder}
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <CommandList>
            {filtered.length === 0 && (
              <CommandEmpty>{t("catalogs.select.empty")}</CommandEmpty>
            )}
            <CommandGroup>
              {filtered.map((item) => (
                <CommandItem
                  key={item.code}
                  onSelect={() => {
                    onChange(item.code);
                    setSearch("");
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === item.code ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {displayLabel(item.code)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
