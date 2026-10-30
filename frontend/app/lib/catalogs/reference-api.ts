/**
 * API functions and types for the reference data datasets (contract C25,
 * ISSUE-029) — countries, currencies and languages served by
 * `GET /reference/*` (ISSUE-026, contract C23).
 *
 * Types mirror backend/app/core/reference_data/schemas.py verbatim; do not
 * add fields here that the backend does not return. All HTTP goes through
 * `apiClient` (baseURL already includes `/api/v1`), per CLAUDE.frontend.md.
 */

import apiClient from "~/lib/api/client";
import type { StandardResponse } from "~/lib/api/types/common.types";

/** One ISO 3166-1 country (`RefCountryOut`). */
export interface RefCountry {
  /** ISO 3166-1 alpha-2 code, uppercase. */
  code: string;
  /** Localized names: `{ es, en }`. */
  names: Record<string, string>;
  /** ISO 4217 code of the country's currency. */
  currency_code: string | null;
  /** True when administrative divisions exist for this country. */
  has_divisions: boolean;
  is_active: boolean;
}

/** One ISO 4217 currency (`RefCurrencyOut`). */
export interface RefCurrency {
  /** ISO 4217 code, uppercase. */
  code: string;
  /** Localized names: `{ es, en }`. */
  names: Record<string, string>;
  symbol: string;
  minor_units: number;
  is_active: boolean;
}

/** One ISO 639-1 language (`RefLanguageOut`). */
export interface RefLanguage {
  /** ISO 639-1 code, lowercase. */
  code: string;
  /** Localized names: `{ es, en }`. */
  names: Record<string, string>;
  native_name: string | null;
  is_active: boolean;
}

/** Payload of a non-paginated reference dataset endpoint. */
export interface ReferenceDatasetResponse<TItem> {
  /** Dataset edition from `ref_sync_state`; null only if never synced. */
  source_version: string | null;
  items: TItem[];
}

export type RefCountriesResponse = ReferenceDatasetResponse<RefCountry>;
export type RefCurrenciesResponse = ReferenceDatasetResponse<RefCurrency>;
export type RefLanguagesResponse = ReferenceDatasetResponse<RefLanguage>;

/** Optional server-side filters shared by the three dataset endpoints. */
export interface ReferenceQueryOptions {
  /** Server-side search (max 100 chars; the backend answers 422 beyond). */
  q?: string;
  /** Include rows with `is_active = false`. */
  includeInactive?: boolean;
}

async function fetchDataset<TItem>(
  path: string,
  opts?: ReferenceQueryOptions
): Promise<ReferenceDatasetResponse<TItem>> {
  const response = await apiClient.get<
    StandardResponse<ReferenceDatasetResponse<TItem>>
  >(path, {
    params: { q: opts?.q, include_inactive: opts?.includeInactive },
  });
  return response.data.data;
}

/** `GET /reference/countries` — ISO 3166-1 countries, ordered by code. */
export function fetchCountries(
  opts?: ReferenceQueryOptions
): Promise<RefCountriesResponse> {
  return fetchDataset<RefCountry>("/reference/countries", opts);
}

/** `GET /reference/currencies` — ISO 4217 currencies, ordered by code. */
export function fetchCurrencies(
  opts?: ReferenceQueryOptions
): Promise<RefCurrenciesResponse> {
  return fetchDataset<RefCurrency>("/reference/currencies", opts);
}

/** `GET /reference/languages` — ISO 639-1 languages, ordered by code. */
export function fetchLanguages(
  opts?: ReferenceQueryOptions
): Promise<RefLanguagesResponse> {
  return fetchDataset<RefLanguage>("/reference/languages", opts);
}
