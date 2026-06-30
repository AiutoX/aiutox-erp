/**
 * Data Collection — main page (form list + FolderTree sidebar + navigation to builder)
 * RBAC: page requires data_collection.forms.read; write actions require data_collection.forms.write
 */

import { ProtectedRoute } from "~/components/auth/ProtectedRoute";
import { RequirePermission } from "~/components/auth/RequirePermission";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { DCFormList } from "~/features/data_collection/components/DCFormList";

export function meta() {
  return [{ title: "Data Collection - AiutoX ERP" }];
}

export default function DataCollectionPage() {
  const { t } = useTranslation();

  return (
    <ProtectedRoute>
      <RequirePermission permission="data_collection.forms.read">
        <div className="flex flex-col h-full">
          {/* Page header */}
          <div className="flex items-center px-6 py-4 border-b border-border shrink-0">
            <h1 className="text-lg font-semibold text-foreground">
              {t("data_collection.title") ?? "Data Collection"}
            </h1>
          </div>

          {/* FolderTree + form list */}
          <div className="flex-1 min-h-0">
            <DCFormList />
          </div>
        </div>
      </RequirePermission>
    </ProtectedRoute>
  );
}
