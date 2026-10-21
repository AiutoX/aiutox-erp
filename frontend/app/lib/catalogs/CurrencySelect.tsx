/**
 * CurrencySelect — searchable ISO 4217 currency combobox (contract C25,
 * ISSUE-029, AC-LIB-09). Each option reads "COP — Peso colombiano ($)":
 * `${code} — ${resolveLabel(names, lang, code)} (${symbol})`. Search is
 * client-side and accent-insensitive over the code and the localized name,
 * against the full cached `useCurrencies()` payload; options keep the
 * backend's order (by code), which matches the code-first display.
 */

import { useMemo } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { resolveLabel } from "./hooks";
import { useCurrencies } from "./reference-hooks";
import { ReferenceCombobox, type ReferenceOptionGroup } from "./CountrySelect";
import type { SelectFieldA11yProps } from "./types";

export interface CurrencySelectProps extends SelectFieldA11yProps {
  /** Selected ISO 4217 code, or null. */
  value: string | null;
  onChange: (code: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function CurrencySelect({
  value,
  onChange,
  disabled = false,
  placeholder,
  id,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: CurrencySelectProps) {
  const { language } = useTranslation();
  const { data, isLoading, isError, refetch } = useCurrencies();

  const groups = useMemo<ReferenceOptionGroup[]>(() => {
    const options = (data?.items ?? []).map((item) => {
      const name = resolveLabel(item.names, language, item.code);
      return {
        code: item.code,
        label: `${item.code} — ${name} (${item.symbol})`,
        searchTerms: [item.code, name],
      };
    });
    return [{ id: "all", options }];
  }, [data, language]);

  return (
    <ReferenceCombobox
      testIdPrefix="currency-select"
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
