import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { useHasAnyPermission } from "~/hooks/usePermissions";
import { PageLayout } from "~/components/layout/PageLayout";
import { DigestSubscriptions } from "~/features/automation/components/DigestSubscriptions";

export default function ConfigAutomationDigestsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const hasAccess = useHasAnyPermission(["ai.use"]);

  useEffect(() => {
    if (!hasAccess) {
      void navigate("/unauthorized");
    }
  }, [hasAccess, navigate]);

  if (!hasAccess) return null;

  return (
    <PageLayout
      title={t("automation.digests.title")}
      description={t("automation.digests.description")}
    >
      <DigestSubscriptions />
    </PageLayout>
  );
}
