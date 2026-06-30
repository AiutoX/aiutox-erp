import type { Route } from "./+types/home";
import { Navigate } from "react-router";
import { useAuthStore } from "~/stores/authStore";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "AiutoX ERP" },
    { name: "description", content: "Sistema ERP AiutoX" },
  ];
}

/**
 * Root route
 * - If not authenticated: redirect to /login
 * - If authenticated: show dashboard (for now, redirect to /users as placeholder)
 */
export default function Home() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to dashboard
  return <Navigate to="/dashboard" replace />;
}
