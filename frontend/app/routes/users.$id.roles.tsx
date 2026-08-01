/**
 * User Roles Page
 *
 * Manages roles assigned to a user (global roles + custom roles)
 * Uses PageLayout for consistent visual structure
 */

import type { Route } from "./+types/users.$id.roles";
import { useParams } from "react-router";
import { PageLayout } from "~/components/layout/PageLayout";
import { UserRolesManager } from "~/features/users/components/UserRolesManager";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { LoadingState } from "~/components/common/LoadingState";
import { ErrorState } from "~/components/common/ErrorState";
import { useUser } from "~/features/users/hooks/useUsers";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Roles de Usuario - AiutoX ERP" },
    { name: "description", content: "Gestiona los roles del usuario" },
  ];
}

export default function UserRolesPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { user, loading, error } = useUser(id || null);

  return (
    <PageLayout
      title={t("users.rolesTitle") || "Roles del Usuario"}
      description={
        user?.email
          ? `${t("users.rolesDescription") || "Gestiona los roles de"} ${user.email}`
          : t("users.rolesDescription") || "Gestiona los roles del usuario"
      }
      breadcrumb={[
        { label: t("users.title") || "Usuarios", href: "/users" },
        { label: user?.email || id || "", href: `/users/${id}` },
        { label: t("users.rolesTitle") || "Roles" },
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
      {user && <UserRolesManager user={user} />}
    </PageLayout>
  );
}
