/**
 * Config Webhooks Page
 * Main webhooks configuration page
 */

import { ProtectedRoute } from "~/components/auth/ProtectedRoute";
import { PageLayout } from "~/components/layout/PageLayout";
import { WebhookSettings } from "~/features/tasks/components/WebhookSettings";

export default function ConfigWebhooksPage() {
  return (
    <ProtectedRoute>
      <PageLayout
        title="Webhooks"
        breadcrumb={[
          { label: "Configuración", href: "/config" },
          { label: "Webhooks" },
        ]}
      >
        <WebhookSettings />
      </PageLayout>
    </ProtectedRoute>
  );
}
