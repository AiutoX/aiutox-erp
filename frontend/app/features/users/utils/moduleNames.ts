/**
 * Resolve a display name for a module ID.
 *
 * Business modules (crm, billing, inventory, etc.) own their translated name
 * in their own feature's i18n (`{module}.moduleName`); core modules are
 * covered centrally in `permissions.moduleNames`. Falls back to the raw
 * module ID when neither has a key for it yet.
 *
 * `t()` returns the key itself (never undefined/empty) when a key is
 * missing, so a missing translation must be detected by comparing the
 * result against the key we asked for.
 */
export function translateModuleName(
  t: (key: string) => string,
  moduleId: string,
  fallback: string = moduleId
): string {
  const coreKey = `permissions.moduleNames.${moduleId}`;
  const coreName = t(coreKey);
  if (coreName !== coreKey) return coreName;

  const businessKey = `${moduleId}.moduleName`;
  const businessName = t(businessKey);
  if (businessName !== businessKey) return businessName;

  return fallback;
}
