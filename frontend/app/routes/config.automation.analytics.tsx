import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { useHasAnyPermission } from "~/hooks/usePermissions";
import { PageLayout } from "~/components/layout/PageLayout";
import { AnalyticsDashboard } from "~/features/automation/components/AnalyticsDashboard";

export default function ConfigAutomationAnalyticsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const hasAccess = useHasAnyPermission(["ai.config", "ai.audit"]);

  useEffect(() => {
    if (!hasAccess) {
      void navigate("/unauthorized");
    }
  }, [hasAccess, navigate]);

  if (!hasAccess) return null;

  return (
    <PageLayout
      title={t("automation.analytics.title")}
      description={t("automation.analytics.description")}
    >
      <AnalyticsDashboard />
    </PageLayout>
  );
}
