/**
 * Data source label lookup for reporting UI.
 * The /reporting/data-sources API only returns `name: source_type.capitalize()`
 * (e.g. "Products"), not a real translated label, so the Lista/Visor tabs
 * translate the raw `data_source_type` themselves via i18n instead.
 */

export function getDataSourceLabel(
  dataSourceType: string,
  t: (key: string) => string
): string {
  const translated = t(`reporting.dataSources.${dataSourceType}`);
  if (translated !== `reporting.dataSources.${dataSourceType}`) {
    return translated;
  }
  return dataSourceType.charAt(0).toUpperCase() + dataSourceType.slice(1);
}
