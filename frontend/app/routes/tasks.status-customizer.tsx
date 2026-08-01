/**
 * Task Status Customizer Page
 * Página para personalizar estados de tareas
 * Sprint 2.2 - Fase 2
 */

import { ProtectedRoute } from "~/components/auth/ProtectedRoute";
import { PermissionRoute } from "~/components/auth/PermissionRoute";
import { PageLayout } from "~/components/layout/PageLayout";
import { StatusCustomizer } from "~/features/tasks/components/StatusCustomizer";
import { useTranslation } from "~/lib/i18n/useTranslation";

export default function TaskStatusCustomizerPage() {
  const { t } = useTranslation();

  return (
    <ProtectedRoute>
      <PermissionRoute permission="tasks.manage" redirectTo="/unauthorized">
      <PageLayout
        title={
          t("tasks.statusCustomizer.title") || "Personalizar Estados de Tareas"
        }
        description={
          t("tasks.statusCustomizer.description") ||
          "Configura estados personalizados para tus tareas"
        }
      >
        <StatusCustomizer />
      </PageLayout>
      </PermissionRoute>
    </ProtectedRoute>
  );
}
