import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "~/hooks/useAuth";
import { useHasPermission } from "~/hooks/usePermissions";
import { ModulesPage } from "~/features/admin";

export function meta() {
  return [
    { title: "Module Management - AiutoX ERP" },
    { name: "description", content: "Manage tenant modules and their lifecycle" },
  ];
}

export default function AdminModulesRoute() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Matches the backend's gate on GET/PUT /config/modules* (config.view/config.manage).
  // Previously checked `user.roles.some(role => role === "admin")`, a literal role
  // string that never matched the "*" wildcard role real superadmins actually have —
  // useHasPermission already resolves "*" correctly (see usePermissions.ts).
  const canViewModules = useHasPermission("config.view");

  useEffect(() => {
    if (!user || !canViewModules) {
      navigate("/unauthorized");
    }
  }, [user, canViewModules, navigate]);

  if (!user || !canViewModules) {
    return null;
  }

  return <ModulesPage />;
}
