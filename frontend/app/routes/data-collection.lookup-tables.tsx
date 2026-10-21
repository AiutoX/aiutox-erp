/**
 * Data Collection — Lookup Tables management page
 * Route: /data-collection/lookup-tables
 * RBAC: page requires data_collection.lookup_tables.read
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { ProtectedRoute } from "~/components/auth/ProtectedRoute";
import { RequirePermission } from "~/components/auth/RequirePermission";
import { PageLayout } from "~/components/layout/PageLayout";
import { LookupTableList } from "~/features/data_collection/components/lookup/LookupTableList";
import { LookupTableEditor } from "~/features/data_collection/components/lookup/LookupTableEditor";

export function meta() {
  return [{ title: "Lookup Tables - Data Collection - AiutoX ERP" }];
}

type ViewState =
  | { mode: "list" }
  | { mode: "new" }
  | { mode: "edit"; id: string };

export default function LookupTablesPage() {
  const { t } = useTranslation();
  const [view, setView] = useState<ViewState>({ mode: "list" });

  const isEditorOpen = view.mode === "new" || view.mode === "edit";

  return (
    <ProtectedRoute>
      <RequirePermission permission="data_collection.lookup_tables.read">
        <PageLayout
          title={
            t("data_collection.lookupTables.title") ?? "Lookup Tables"
          }
          description={
            t("data_collection.lookupTables.description") ??
            "Manage reusable option lists for dropdown and lookup fields"
          }
          breadcrumb={[
            {
              label: t("data_collection.title") ?? "Data Collection",
              href: "/data-collection",
            },
            {
              label:
                t("data_collection.lookupTables.title") ??
                "Lookup Tables",
            },
          ]}
        >
          {isEditorOpen ? (
            <div className="max-w-2xl">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-foreground">
                  {view.mode === "new"
                    ? (t("data_collection.lookupTables.newTable") ??
                      "New lookup table")
                    : (t("data_collection.lookupTables.editTable") ??
                      "Edit lookup table")}
                </h2>
              </div>
              <LookupTableEditor
                tableId={view.mode === "edit" ? view.id : undefined}
                onDone={() => setView({ mode: "list" })}
                onCancel={() => setView({ mode: "list" })}
              />
            </div>
          ) : (
            <LookupTableList
              onEdit={(id) => setView({ mode: "edit", id })}
              onNew={() => setView({ mode: "new" })}
            />
          )}
        </PageLayout>
      </RequirePermission>
    </ProtectedRoute>
  );
}
