/**
 * Tasks Webhooks Settings Page
 */

import { PermissionRoute } from "~/components/auth/PermissionRoute";
import { PageLayout } from "~/components/layout/PageLayout";
import { WebhookSettings } from "~/features/tasks/components/WebhookSettings";

export default function TasksWebhooksPage() {
  return (
    <PermissionRoute permission="tasks.manage">
      <PageLayout
        title="Webhooks de Tareas"
        breadcrumb={[
          { label: "Tasks", href: "/tasks" },
          { label: "Configuración", href: "/tasks/settings" },
          { label: "Webhooks" },
        ]}
      >
        <WebhookSettings />
      </PageLayout>
    </PermissionRoute>
  );
}
