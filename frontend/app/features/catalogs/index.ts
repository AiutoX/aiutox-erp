/**
 * Public barrel of the `catalogs` feature -- the catalogs admin screen
 * (ISSUE-031 shell, contract C27; ISSUE-032..038 build on it).
 *
 * The folder's `i18n/{es,en}.ts` is auto-discovered by the
 * `import.meta.glob("../../../features/**\/i18n/*.ts")` pattern in
 * `frontend/app/lib/i18n/translations/index.ts`. The catalogs *library*
 * used by forms -- `useCatalog`, `useCatalogs`, `useCatalogLabel`,
 * `CatalogSelect` -- lives in `~/lib/catalogs`, not here.
 *
 * AiutoX ERP Core -- Frankpach
 */

export {
  CATALOG_LISTS_QUERY_KEY,
  fetchCatalogLists,
} from "./api/catalogsAdmin";
export { useCatalogLists } from "./hooks/useCatalogLists";
export {
  CATALOG_LIST_SEARCH_PARAM,
  useSelectedCatalogList,
} from "./hooks/useSelectedCatalogList";
export type {
  SelectCatalogListOptions,
  SelectedCatalogList,
} from "./hooks/useSelectedCatalogList";
export { useIsDesktop } from "./hooks/useIsDesktop";
export { CatalogListNav } from "./components/CatalogListNav";
export type { CatalogListNavProps } from "./components/CatalogListNav";
export { CatalogsConfigPage } from "./pages/CatalogsConfigPage";
export type {
  CatalogListAdmin,
  CatalogViewerCapabilities,
  FetchCatalogListsParams,
} from "./types/catalogsAdmin.types";
