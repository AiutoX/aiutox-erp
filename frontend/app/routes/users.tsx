/**
 * Users Route
 * Main page for user management with SavedFilters integration.
 * Uses PageLayout for consistent visual structure
 */

import type { Route } from "./+types/users";
import { UsersList } from "../features/users/components/UsersList";
import { PageLayout } from "~/components/layout/PageLayout";
import { useTranslation } from "~/lib/i18n/useTranslation";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Usuarios - AiutoX ERP" },
    { name: "description", content: "Gestión de usuarios del sistema" },
  ];
}

export default function UsersPage() {
  const { t } = useTranslation();

  const handleManageFiltersClick = () => {
    // This will open the FilterManagementModal in Phase 4
    // For now, just a placeholder
    console.warn("Open filter management");
  };

  return (
    <PageLayout
      title={t("users.title") || "Usuarios"}
      description={
        t("users.description") ||
        "Gestiona los usuarios del sistema y aplica filtros personalizados"
      }
    >
      <UsersList onManageFiltersClick={handleManageFiltersClick} />
    </PageLayout>
  );
}
