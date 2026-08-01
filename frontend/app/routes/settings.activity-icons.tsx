/**
 * Activity Icons Settings Page
 * Page for customizing activity icon configurations
 */

import { ProtectedRoute } from "~/components/auth/ProtectedRoute";
import { PageLayout } from "~/components/layout/PageLayout";
import { ActivityIconCustomizer } from "~/features/activity-icons/components/ActivityIconCustomizer";
import { useTranslation } from "~/lib/i18n/useTranslation";

export default function ActivityIconsSettingsPage() {
  const { t } = useTranslation();

  return (
    <ProtectedRoute>
      <PageLayout
        title={t("activityIcons.pageTitle") || "Iconos de Actividades"}
        description={
          t("activityIcons.pageDescription") ||
          "Personaliza los iconos para diferentes tipos de actividades y sus estados"
        }
      >
        <ActivityIconCustomizer />
      </PageLayout>
    </ProtectedRoute>
  );
}
