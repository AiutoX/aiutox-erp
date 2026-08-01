/**
 * Data Collection — Analytics dashboard page
 * Route: /data-collection/analytics
 * RBAC: page requires data_collection.analytics.read
 */

import { useTranslation } from "~/lib/i18n/useTranslation";
import { ProtectedRoute } from "~/components/auth/ProtectedRoute";
import { RequirePermission } from "~/components/auth/RequirePermission";
import { PageLayout } from "~/components/layout/PageLayout";
import { DashboardViewer } from "~/features/data_collection/components/dashboards/DashboardViewer";

export function meta() {
  return [{ title: "Analytics - Data Collection - AiutoX ERP" }];
}

export default function DataCollectionAnalyticsPage() {
  const { t } = useTranslation();

  return (
    <ProtectedRoute>
      <RequirePermission permission="data_collection.analytics.read">
        <PageLayout
          title={t("data_collection.analytics.title") ?? "Analytics"}
          description={
            t("data_collection.analytics.overview") ?? "Overview"
          }
          breadcrumb={[
            {
              label: t("data_collection.title") ?? "Data Collection",
              href: "/data-collection",
            },
            {
              label: t("data_collection.analytics.title") ?? "Analytics",
            },
          ]}
        >
          <DashboardViewer />
        </PageLayout>
      </RequirePermission>
    </ProtectedRoute>
  );
}
