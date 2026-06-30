import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useHasAnyPermission } from "~/hooks/usePermissions";
import { AgentRunHistoryPage } from "~/features/automation/components/AgentRunHistoryPage";

export default function ConfigAutomationAgentsPage() {
  const navigate = useNavigate();
  const hasAccess = useHasAnyPermission(["automation.read"]);

  useEffect(() => {
    if (!hasAccess) {
      void navigate("/unauthorized");
    }
  }, [hasAccess, navigate]);

  if (!hasAccess) return null;

  return <AgentRunHistoryPage />;
}
