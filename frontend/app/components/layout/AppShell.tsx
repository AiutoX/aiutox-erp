import { useEffect, memo, lazy, Suspense, useState, type ReactNode } from "react";
import { useLocation } from "react-router";
import { MainContent } from "./MainContent";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Dialog, DialogContent, DialogTitle } from "~/components/ui/dialog";
import { initializeModules } from "~/stores/modulesStore";
import { useSidebarStore } from "~/stores/sidebarStore";
import { useCalendarModalStore } from "~/stores/calendarModalStore";
import { PasswordChangeBanner } from "~/components/notifications/PasswordChangeBanner";
import { useAuthStore } from "~/stores/authStore";
import { useHasPermission } from "~/hooks/usePermissions";
import { FloatingChatButton } from "~/features/automation/ai/components/FloatingChatButton";
import { EmbeddedAssistant } from "~/features/automation/ai/components/EmbeddedAssistant";

const TaskCalendar = lazy(() =>
  import("~/features/tasks/components/TaskCalendar").then((m) => ({
    default: m.TaskCalendar,
  }))
);

const RequirePasswordChangeModal = lazy(() =>
  import("~/components/auth/RequirePasswordChangeModal").then((m) => ({
    default: m.RequirePasswordChangeModal,
  }))
);

/**
 * AppShell - Componente principal del layout
 *
 * Layout tipo AppShell con Header, Sidebar, MainContent y Footer.
 * Maneja el estado del sidebar (abierto/cerrado) y proporciona
 * la estructura base para todas las páginas de la aplicación.
 *
 * Responsive:
 * - Desktop (lg+): Sidebar siempre visible, puede colapsarse
 * - Tablet (md-lg): Sidebar colapsado por defecto
 * - Móvil (< md): Sidebar como drawer (overlay)
 */
interface AppShellProps {
  children: ReactNode;
}

function AppShellComponent({ children }: AppShellProps) {
  const {
    isSidebarOpen,
    isSidebarCollapsed,
    setIsSidebarOpen,
    setIsSidebarCollapsed,
    toggleSidebar,
    toggleCollapse,
  } = useSidebarStore();
  const calendarModal = useCalendarModalStore((state) => state);
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const hasAiUse = useHasPermission("ai.use");
  const [chatOpen, setChatOpen] = useState(false);
  const location = useLocation();
  const erpContext = {
    module: location.pathname.split("/").filter(Boolean)[0] ?? null,
    record_id: location.pathname.split("/").filter(Boolean)[1] ?? null,
    record_type: null,
  };

  // Initialize modules and encryption secret on mount
  useEffect(() => {
    // Fetch encryption secret first (required for module cache)
    import("~/stores/encryptionStore")
      .then(({ useEncryptionStore }) => {
        useEncryptionStore
          .getState()
          .fetchSecret()
          .catch((error) => {
            console.warn("Failed to fetch encryption secret:", error);
          });
      })
      .catch(() => {
        // Ignore if store not available
      });

    // Then initialize modules
    initializeModules().catch((error) => {
      console.error("Failed to initialize modules:", error);
    });
  }, []);

  // Manejar responsive: sidebar colapsado por defecto en tablet
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        // Desktop: sidebar expandido por defecto
        setIsSidebarCollapsed(false);
        setIsSidebarOpen(true);
      } else if (window.innerWidth >= 768) {
        // Tablet: sidebar colapsado
        setIsSidebarCollapsed(true);
        setIsSidebarOpen(true);
      } else {
        // Móvil: sidebar cerrado por defecto
        setIsSidebarOpen(false);
      }
    };

    handleResize(); // Ejecutar al montar
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setIsSidebarOpen, setIsSidebarCollapsed]);

  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
  };

  useEffect(() => {
    const handlePopState = () => {
      const state = window.history.state as { calendarModal?: boolean } | null;
      if (!state?.calendarModal && calendarModal.isOpen) {
        calendarModal.close({ updateHistory: false });
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [calendarModal]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Suspense fallback={null}>
        <RequirePasswordChangeModal
          isOpen={!!user?.must_change_password}
          reason="first_login"
          onPasswordChanged={() => updateUser({ must_change_password: false })}
        />
      </Suspense>
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={handleSidebarClose}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleCollapse}
      />
      <div className="flex flex-col flex-1 overflow-hidden min-h-0">
        <PasswordChangeBanner />
        <Header
          onSidebarToggle={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
          isSidebarCollapsed={isSidebarCollapsed}
        />
        <MainContent>{children}</MainContent>
        <Footer />
      </div>
      <Dialog
        open={calendarModal.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            calendarModal.close();
          }
        }}
      >
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Calendario de Tareas</DialogTitle>
          <Suspense fallback={null}>
            <TaskCalendar />
          </Suspense>
        </DialogContent>
      </Dialog>
      {hasAiUse && (
        <>
          <FloatingChatButton
            onClick={() => setChatOpen((v) => !v)}
            open={chatOpen}
          />
          <EmbeddedAssistant
            open={chatOpen}
            onClose={() => setChatOpen(false)}
            context={erpContext}
          />
        </>
      )}
    </div>
  );
}

export const AppShell = memo(AppShellComponent);
