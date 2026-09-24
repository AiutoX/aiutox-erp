/**
 * User Permissions Page
 *
 * Manages user permissions with tabs/accordions by module
 * Uses PageLayout for consistent visual structure
 */

import type { Route } from "./+types/users.$id.permissions";
import { useParams } from "react-router";
import { PageLayout } from "~/components/layout/PageLayout";
import { UserPermissionsManager } from "~/features/users/components/UserPermissionsManager";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { LoadingState } from "~/components/common/LoadingState";
import { ErrorState } from "~/components/common/ErrorState";
import { useUser } from "~/features/users/hooks/useUsers";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Permisos de Usuario - AiutoX ERP" },
    { name: "description", content: "Gestiona los permisos del usuario" },
  ];
}

export default function UserPermissionsPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { user, loading, error } = useUser(id || null);

  return (
    <PageLayout
      title={t("users.permissionsTitle") || "Permisos del Usuario"}
      description={
        user?.email
          ? `${t("users.permissionsDescription") || "Gestiona los permisos de"} ${user.email}`
          : t("users.permissionsDescription") ||
            "Gestiona los permisos del usuario"
      }
      breadcrumb={[
        { label: t("users.title") || "Usuarios", href: "/users" },
        { label: user?.email || id || "", href: `/users/${id}` },
        { label: t("users.permissionsTitle") || "Permisos" },
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
      {user && <UserPermissionsManager user={user} />}
    </PageLayout>
  );
}
