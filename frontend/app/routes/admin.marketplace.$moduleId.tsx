import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "~/hooks/useAuth";
import { ModuleDetailPage } from "~/features/marketplace/components/ModuleDetailPage";

const MARKETPLACE_ENABLED = import.meta.env.VITE_MARKETPLACE_ENABLED !== "false";

export function meta() {
  return [
    { title: "Module Details - AiutoX ERP" },
    { name: "description", content: "View module details and start a free trial" },
  ];
}

export default function AdminMarketplaceModuleRoute() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!MARKETPLACE_ENABLED) {
      navigate("/", { replace: true });
      return;
    }
    const isAdmin =
      user?.roles && user.roles.some((role) => String(role) === "admin");
    if (!user || !isAdmin) {
      navigate("/unauthorized");
    }
  }, [user, navigate]);

  if (!MARKETPLACE_ENABLED) {
    return null;
  }

  const isAdmin =
    user?.roles && user.roles.some((role) => String(role) === "admin");
  if (!user || !isAdmin) {
    return null;
  }

  return <ModuleDetailPage />;
}
