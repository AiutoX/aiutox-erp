/**
 * Governance disabled-reason resolver (ISSUE-032, contract C28).
 *
 * Returns the i18n key that explains why "add item" is unavailable for a
 * catalog list, in the PRD's resolved TT-01 order (`08-prd.md`, "Resolved
 * in this phase" table): `is_locked` -> `tenant_can_manage` ->
 * `is_extensible`. This order supersedes `06-interface-design.md`'s
 * original tooltip prose order per CLAUDE.md's "PRD wins for everything
 * else" rule.
 *
 * Consumed by ISSUE-034/037 (items table, add-item flow) -- not by any UI
 * in this issue.
 *
 * AiutoX ERP Core -- Frankpach
 */

import type { CatalogListAdmin } from "../types/catalogsAdmin.types";

export function disabledAddReason(list: CatalogListAdmin): string | null {
  if (list.is_locked) {
    return "catalogs.admin.addDisabled.locked";
  }
  if (!list.tenant_can_manage) {
    return "catalogs.admin.addDisabled.notManaged";
  }
  if (!list.is_extensible) {
    return "catalogs.admin.addDisabled.notExtensible";
  }
  return null;
}
