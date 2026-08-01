/**
 * Automation Create - redirect to /automation
 * Create flow is handled via the Dialog in automation.tsx
 */

import { Navigate } from "react-router";

export default function AutomationCreateRedirect() {
  return <Navigate to="/automation" replace />;
}
