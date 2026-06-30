import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "~/hooks/useAuth";
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

  useEffect(() => {
    // Guard: only admins can access this page
    const isAdmin =
      user?.roles && user.roles.some((role) => String(role) === "admin");
    if (!user || !isAdmin) {
      navigate("/unauthorized");
    }
  }, [user, navigate]);

  const isAdmin =
    user?.roles && user.roles.some((role) => String(role) === "admin");
  if (!user || !isAdmin) {
    return null;
  }

  return <ModulesPage />;
}
