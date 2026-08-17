/**
 * Data Collection — Cases management page
 * Route: /data-collection/cases
 * RBAC: page requires data_collection.cases.read
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { ProtectedRoute } from "~/components/auth/ProtectedRoute";
import { RequirePermission } from "~/components/auth/RequirePermission";
import { PageLayout } from "~/components/layout/PageLayout";
import { CaseList } from "~/features/data_collection/components/cases/CaseList";
import { CaseForm } from "~/features/data_collection/components/cases/CaseForm";

export function meta() {
  return [{ title: "Cases - Data Collection - AiutoX ERP" }];
}

type ViewState =
  | { mode: "list" }
  | { mode: "new" }
  | { mode: "edit"; id: string };

export default function CasesPage() {
  const { t } = useTranslation();
  const [view, setView] = useState<ViewState>({ mode: "list" });

  const isFormOpen = view.mode === "new" || view.mode === "edit";

  return (
    <ProtectedRoute>
      <RequirePermission permission="data_collection.cases.read">
        <PageLayout
          title={t("data_collection.cases.title") ?? "Cases"}
          description={
            t("data_collection.cases.description") ??
            "Track and manage cases linked to ERP entities"
          }
          breadcrumb={[
            {
              label: t("data_collection.title") ?? "Data Collection",
              href: "/data-collection",
            },
            { label: t("data_collection.cases.title") ?? "Cases" },
          ]}
        >
          {isFormOpen ? (
            <div className="max-w-2xl">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-foreground">
                  {view.mode === "new"
                    ? (t("data_collection.cases.newCase") ?? "New case")
                    : (t("data_collection.cases.editCase") ??
                      "Edit case")}
                </h2>
              </div>
              <CaseForm
                caseId={view.mode === "edit" ? view.id : undefined}
                onSuccess={() => setView({ mode: "list" })}
                onCancel={() => setView({ mode: "list" })}
              />
            </div>
          ) : (
            <CaseList
              onEdit={(id) => setView({ mode: "edit", id })}
              onNew={() => setView({ mode: "new" })}
            />
          )}
        </PageLayout>
      </RequirePermission>
    </ProtectedRoute>
  );
}
