/**
 * Public barrel for the catalogs frontend library (contract C24, ISSUE-027).
 */

export { fetchCatalogItems, fetchCatalogsResolve } from "./api";
export type { FetchCatalogItemsOptions } from "./api";

export {
  useCatalog,
  useCatalogs,
  useCatalogLabel,
  useCatalogLabelResolver,
  resolveLabel,
} from "./hooks";
export type { UseCatalogOptions } from "./hooks";

export { CatalogSelect } from "./CatalogSelect";
export type { CatalogSelectProps } from "./CatalogSelect";

export { CatalogMultiSelect } from "./CatalogMultiSelect";
export type { CatalogMultiSelectProps } from "./CatalogMultiSelect";

export type {
  CatalogItem,
  CatalogItemsResponse,
  ResolvedList,
  CatalogResolveResponse,
  SelectFieldA11yProps,
} from "./types";

// Reference data (contract C25, ISSUE-029)
export {
  fetchCountries,
  fetchCurrencies,
  fetchLanguages,
} from "./reference-api";
export type {
  RefCountry,
  RefCurrency,
  RefLanguage,
  ReferenceDatasetResponse,
  RefCountriesResponse,
  RefCurrenciesResponse,
  RefLanguagesResponse,
  ReferenceQueryOptions,
} from "./reference-api";

export {
  useCountries,
  useCurrencies,
  useLanguages,
  normalizeSearchText,
  REFERENCE_STALE_TIME_MS,
} from "./reference-hooks";

export { CountrySelect } from "./CountrySelect";
export type { CountrySelectProps } from "./CountrySelect";

export { CurrencySelect } from "./CurrencySelect";
export type { CurrencySelectProps } from "./CurrencySelect";

// Administrative divisions (contract C26, ISSUE-030)
export {
  fetchDivisions,
  useDivisions,
  DIVISIONS_PAGE_SIZE,
} from "./useDivisions";
export type {
  RefAdminDivision,
  RefDivisionsPage,
  DivisionLevel,
  FetchDivisionsParams,
  UseDivisionsOptions,
} from "./useDivisions";

export { DivisionSelect } from "./DivisionSelect";
export type { DivisionSelectProps } from "./DivisionSelect";
