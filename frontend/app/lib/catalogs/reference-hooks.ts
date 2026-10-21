/**
 * TanStack Query hooks for the reference data datasets (contract C25,
 * ISSUE-029). Query keys are `["reference", dataset]`, extended with the
 * server-side filters only when a caller passes them; `staleTime` is 60
 * minutes (PERF-06) because reference data changes only on a dataset sync.
 */

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
  fetchCountries,
  fetchCurrencies,
  fetchLanguages,
  type RefCountriesResponse,
  type RefCurrenciesResponse,
  type RefLanguagesResponse,
  type ReferenceQueryOptions,
} from "./reference-api";

export const REFERENCE_STALE_TIME_MS = 1000 * 60 * 60; // 60 minutes (PERF-06)

/**
 * Builds `["reference", dataset]`, or `["reference", dataset, { q,
 * includeInactive }]` when any server-side filter is set, so the unfiltered
 * full list every select shares stays under one stable key.
 */
function referenceQueryKey(
  dataset: "countries" | "currencies" | "languages",
  opts?: ReferenceQueryOptions
): readonly unknown[] {
  const hasFilters =
    opts?.q !== undefined || opts?.includeInactive !== undefined;
  return hasFilters
    ? [
        "reference",
        dataset,
        { q: opts?.q, includeInactive: opts?.includeInactive },
      ]
    : ["reference", dataset];
}

/** ISO 3166-1 countries. Query key: `["reference", "countries"]`. */
export function useCountries(
  opts?: ReferenceQueryOptions
): UseQueryResult<RefCountriesResponse> {
  return useQuery({
    queryKey: referenceQueryKey("countries", opts),
    queryFn: () => fetchCountries(opts),
    staleTime: REFERENCE_STALE_TIME_MS,
  });
}

/** ISO 4217 currencies. Query key: `["reference", "currencies"]`. */
export function useCurrencies(
  opts?: ReferenceQueryOptions
): UseQueryResult<RefCurrenciesResponse> {
  return useQuery({
    queryKey: referenceQueryKey("currencies", opts),
    queryFn: () => fetchCurrencies(opts),
    staleTime: REFERENCE_STALE_TIME_MS,
  });
}

/**
 * ISO 639-1 languages. Query key: `["reference", "languages"]`. Exported for
 * future consumers only — no `LanguageSelect` exists this sprint
 * (MODULE-SPEC Section 4).
 */
export function useLanguages(
  opts?: ReferenceQueryOptions
): UseQueryResult<RefLanguagesResponse> {
  return useQuery({
    queryKey: referenceQueryKey("languages", opts),
    queryFn: () => fetchLanguages(opts),
    staleTime: REFERENCE_STALE_TIME_MS,
  });
}

/**
 * Folds a string for accent- and case-insensitive matching: NFD-decomposes
 * it, strips combining diacritical marks (U+0300..U+036F) and lowercases it,
 * so "México", "MEXICO" and "mexico" compare equal. No dependency needed.
 */
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
