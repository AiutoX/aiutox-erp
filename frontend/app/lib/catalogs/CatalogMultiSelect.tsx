/**
 * CatalogMultiSelect — wraps `components/ui/multi-select.tsx`'s `MultiSelect`
 * with the tenant's effective catalog options (contract C24, ISSUE-028).
 * Reuses ISSUE-027's `useCatalog`/`resolveLabel` contract and the
 * "(inactivo)" suffix convention for hidden/deprecated selected codes.
 *
 * `MultiSelect` has no `disabled` prop (multi-select.tsx:22-29) and must not
 * be modified (shared component, other consumers), so loading/error states
 * render a standalone disabled placeholder trigger instead of mounting it.
 */

import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "~/components/ui/button";
import { MultiSelect } from "~/components/ui/multi-select";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { useCatalogForSelection, resolveLabel } from "./hooks";
import type { SelectFieldA11yProps } from "./types";

export interface CatalogMultiSelectProps extends SelectFieldA11yProps {
  listKey: string;
  selected: string[];
  onChange: (codes: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function CatalogMultiSelect({
  listKey,
  selected,
  onChange,
  disabled = false,
  placeholder,
  id,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: CatalogMultiSelectProps) {
  const { t, language } = useTranslation();
  const {
    data: items,
    isLoading,
    isError,
    refetch,
  } = useCatalogForSelection(listKey, selected);

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
        data-testid="catalog-multiselect-trigger"
        className="w-full justify-between font-normal text-muted-foreground"
      >
        {t("catalogs.select.loading")}
        <Loader2
          data-testid="catalog-multiselect-spinner"
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
          data-testid="catalog-multiselect-trigger"
          className="w-full justify-between font-normal text-muted-foreground"
        >
          {t("catalogs.select.error")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("catalogs.select.retry")}
          data-testid="catalog-multiselect-retry"
          onClick={() => refetch()}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const options = (items ?? []).map((item) => {
    const base = resolveLabel(item.labels, language, item.code);
    const label = item.is_selectable
      ? base
      : `${base} (${t("catalogs.select.inactive")})`;
    return { value: item.code, label };
  });

  // `MultiSelect` has no `disabled` prop (multi-select.tsx:22-29) and must not
  // be modified — render the same placeholder trigger, disabled, instead.
  if (disabled) {
    return (
      <Button
        type="button"
        variant="outline"
        disabled
        {...a11y}
        data-testid="catalog-multiselect-trigger"
        className="w-full justify-between font-normal text-muted-foreground"
      >
        {resolvedPlaceholder}
      </Button>
    );
  }

  return (
    <MultiSelect
      options={options}
      selected={selected}
      onChange={onChange}
      placeholder={resolvedPlaceholder}
      {...a11y}
    />
  );
}
