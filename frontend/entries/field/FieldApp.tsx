/**
 * FieldApp — root component for AiutoX Field App.
 *
 * Architecture:
 *  - Standalone SPA (NOT React Router framework app)
 *  - Uses createBrowserRouter from react-router-dom directly
 *  - PINGate wraps all authenticated routes
 *  - No sidebar, no ERP navigation
 *
 * Routes:
 *  /field           → FormQueue (Phase F2)
 *  /field/form/:id  → FieldFormRenderer (Phase F3)
 *  /field/settings  → FieldSettings (Phase F3)
 */
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { useSyncWatchdog } from "~/features/data_collection/hooks/useSyncWatchdog";
import { PINGate } from "./components/auth/PINGate";
import { FieldLayout } from "./components/layout/FieldLayout";
import { FormQueue } from "./components/queue/FormQueue";
import { FieldSettings } from "./components/settings/FieldSettings";
import { FieldFormRenderer } from "./components/renderer/FieldFormRenderer";

// ─── Inner app (rendered inside PINGate + FieldLayout) ───────────────────────

function FieldHome() {
  const navigate = useNavigate();
  return (
    <FieldLayout onSettingsClick={() => navigate("/field/settings")}>
      <FormQueue />
    </FieldLayout>
  );
}

function FieldSettingsPage() {
  const navigate = useNavigate();
  return (
    <FieldLayout onSettingsClick={() => navigate("/field/settings")}>
      <FieldSettings />
    </FieldLayout>
  );
}

// ─── Router ─────────────────────────────────────────────────────────────────

const router = createBrowserRouter(
  [
    {
      path: "/field",
      element: (
        <PINGate>
          <FieldHome />
        </PINGate>
      ),
    },
    {
      path: "/field/settings",
      element: (
        <PINGate>
          <FieldSettingsPage />
        </PINGate>
      ),
    },
    {
      // FieldFormRenderer has its own sticky header — no FieldLayout wrapper
      path: "/field/form/:id",
      element: (
        <PINGate>
          <div className="flex flex-col h-svh bg-background text-foreground overflow-hidden">
            <FieldFormRenderer />
          </div>
        </PINGate>
      ),
    },
    {
      // Catch-all: redirect unknown /field/* to /field
      path: "/field/*",
      element: <Navigate to="/field" replace />,
    },
  ],
  { basename: "/" }
);

// ─── Root component ──────────────────────────────────────────────────────────

export function FieldApp() {
  // Mount sync watchdog once at root so it runs on ALL field routes,
  // including /field/form/:id which has no FieldLayout/FieldSyncBadge.
  useSyncWatchdog();
  return <RouterProvider router={router} />;
}
