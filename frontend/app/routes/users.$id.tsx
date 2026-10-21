/**
 * User Detail Page
 *
 * Displays user details with tabs for general info, organizations, contact methods, roles, and permissions
 * Uses PageLayout for consistent visual structure
 */

import type { Route } from "./+types/users.$id";
import { useParams } from "react-router";
import { PageLayout } from "~/components/layout/PageLayout";
import { UserDetail } from "~/features/users/components/UserDetail";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { LoadingState } from "~/components/common/LoadingState";
import { ErrorState } from "~/components/common/ErrorState";
import { useUser } from "~/features/users/hooks/useUsers";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Detalle de Usuario - AiutoX ERP" },
    { name: "description", content: "Detalles del usuario" },
  ];
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { user, loading, error } = useUser(id || null);

  return (
    <PageLayout
      title={
        user
          ? `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
            user.email
          : t("users.title") || "Usuario"
      }
      description={
        user?.email || t("users.description") || "Detalles del usuario"
      }
      breadcrumb={[
        { label: t("users.title") || "Usuarios", href: "/users" },
        { label: user?.email || id || "" },
      ]}
      loading={loading}
      error={error}
    >
      {loading && <LoadingState />}
      {error && (
        <ErrorState
          message={
            error instanceof Error ? error.message : t("users.error") || "Error"
          }
        />
      )}
      {user && <UserDetail />}
    </PageLayout>
  );
}
