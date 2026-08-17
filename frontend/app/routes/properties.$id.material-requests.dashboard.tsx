/**
 * Material Request Tracking Dashboard
 * Route: /properties/:id/material-requests/dashboard
 * Permission: maintenance.material_requests.view_all_in_property (enforced by API)
 */

import { useParams } from "react-router";
import { ProtectedRoute } from "~/components/auth/ProtectedRoute";
import { PageLayout } from "~/components/layout/PageLayout";
import { TrackingDashboard } from "~/features/real_estate/maintenance";
import { useTranslation } from "~/lib/i18n/useTranslation";

export default function MaterialRequestDashboardPage() {
  const { id: propertyId } = useParams<{ id: string }>();
  const { t } = useTranslation();

  if (!propertyId) {
    return null;
  }

  return (
    <ProtectedRoute>
      <PageLayout title={t("maintenance.dashboard.title")}>
        <TrackingDashboard propertyId={propertyId} />
      </PageLayout>
    </ProtectedRoute>
  );
}
