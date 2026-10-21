/**
 * /config/catalogs -- catalogs admin screen (ISSUE-031, AC-UI-01).
 *
 * Thin route file. ROUTE_PERMISSIONS only drives the post-login redirect
 * check, so the direct-URL guard is PermissionRoute here. The page owns its
 * ConfigPageLayout (title, subtitle, "Configuración / Catálogos" breadcrumb).
 *
 * AiutoX ERP Core -- Frankpach
 */

import { PermissionRoute } from "~/components/auth/PermissionRoute";
import { CatalogsConfigPage } from "~/features/catalogs/pages/CatalogsConfigPage";

export function meta() {
  return [{ title: "Catálogos - AiutoX ERP" }];
}

export default function ConfigCatalogsRoute() {
  return (
    <PermissionRoute permission="catalogs.manage" redirectTo="/unauthorized">
      <CatalogsConfigPage />
    </PermissionRoute>
  );
}
