/**
 * PubSub page
 * Main page for PubSub monitoring and management
 */

import { useTranslation } from "~/lib/i18n/useTranslation";
import { PageLayout } from "~/components/layout/PageLayout";
import { Card, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { PubSubDashboard } from "~/features/pubsub/components/PubSubDashboard";
import { useHasAnyPermission } from "~/hooks/usePermissions";

export default function PubSubPage() {
  const { t } = useTranslation();
  const hasAccess = useHasAnyPermission(["pubsub.view", "pubsub.manage"]);

  if (!hasAccess) {
    return (
      <PageLayout title={t("pubsub.title")}>
        <Card>
          <CardHeader>
            <CardTitle>{t("pubsub.title")}</CardTitle>
            <CardDescription>{t("pubsub.permissionDenied")}</CardDescription>
          </CardHeader>
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={t("pubsub.title")} description={t("pubsub.description")}>
      <PubSubDashboard />
    </PageLayout>
  );
}
