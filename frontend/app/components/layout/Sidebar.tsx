import { useEffect, memo } from "react";
import { useAuthStore } from "~/stores/authStore";
import { useModulesStore } from "~/stores/modulesStore";
import { useThemeConfig } from "~/hooks/useThemeConfig";
import { NavigationTree } from "./NavigationTree";
import { TenantSwitcher } from "./TenantSwitcher";
import { cn } from "~/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useTranslation } from "~/lib/i18n/useTranslation";

/**
 * Sidebar - Barra lateral de navegación
 *
 * Muestra navegación jerárquica (3 niveles) con autodiscovery de módulos.
 * Filtra automáticamente por permisos del usuario.
 * Soporta estados expandido/colapsado y drawer móvil.
 */
interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

function SidebarComponent({
  isOpen = true,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userId = useAuthStore((state) => state.user?.id);
  const tenantId = useAuthStore((state) => state.user?.tenant_id);
  const { loadModules } = useModulesStore();
  const { t } = useTranslation();
  const { theme } = useThemeConfig();

  // Cargar módulos cuando el usuario esté autenticado
  useEffect(() => {
    if (isAuthenticated) {
      loadModules().catch((error) => {
        console.error("Failed to load modules:", error);
      });
    }
  }, [isAuthenticated, userId, tenantId, loadModules]);

  // Cerrar sidebar en móvil cuando se hace clic fuera
  useEffect(() => {
    if (isOpen && window.innerWidth < 1024) {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (!target.closest("[data-sidebar]")) {
          onClose?.();
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
    return undefined;
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop para móvil */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        data-sidebar
        style={{ "--foreground": "var(--sidebar-text)" } as React.CSSProperties}
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50",
          "w-64 bg-[hsl(var(--sidebar))] shadow-[2px_0_8px_rgba(0,0,0,0.04)]",
          "flex flex-col h-screen lg:h-full",
          "transition-[width,transform] duration-200 ease-in-out",
          "lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
          isCollapsed && "lg:w-20"
        )}
        role="navigation"
        aria-label={t("layout.sidebar.navigationAria")}
      >
        {/* Logo/Header */}
        <div className="h-16 px-4 flex items-center justify-center bg-[hsl(var(--sidebar))] overflow-hidden transition-all duration-200">
          <div className="flex items-center gap-3 w-full min-w-0">
            <img
              src={theme.logo_small || "/logo-icon.png"}
              alt="AiutoX Logo"
              className="h-10 w-10 object-contain shrink-0 transition-all duration-200"
            />
            <img
              src={theme.logo_name || "/logo-name.png"}
              alt="AiutoX"
              className={cn(
                "h-6 object-contain transition-all duration-300 ease-in-out",
                isCollapsed
                  ? "opacity-0 w-0 invisible scale-95"
                  : "opacity-100 w-auto visible scale-100"
              )}
            />
          </div>
        </div>

        {/* Tenant Switcher */}
        {isAuthenticated && (
          <div className="px-2 py-2.5 bg-muted/40">
            <TenantSwitcher isCollapsed={isCollapsed} />
          </div>
        )}

        {/* Navigation Menu - Hierarchical Navigation Tree */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {isAuthenticated ? (
            <NavigationTree isCollapsed={isCollapsed} />
          ) : (
            <div
              className={cn(
                "px-4 py-8 text-center text-sm text-muted-foreground",
                isCollapsed && "px-2"
              )}
            >
              {isCollapsed ? (
                <span role="img" aria-label={t("layout.sidebar.locked")}>
                  🔒
                </span>
              ) : (
                t("layout.sidebar.loginToSeeNavigation")
              )}
            </div>
          )}
        </nav>

        {/* Botón de colapsar/expandir (solo desktop) */}
        <div className="hidden lg:flex items-center justify-center h-12 bg-[hsl(var(--sidebar))]">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-9 w-9 hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
            aria-label={
              isCollapsed
                ? t("layout.sidebar.expandMenu")
                : t("layout.sidebar.collapseMenu")
            }
            title={
              isCollapsed
                ? t("layout.sidebar.expandMenu")
                : t("layout.sidebar.collapseMenu")
            }
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      </aside>
    </>
  );
}

export const Sidebar = memo(SidebarComponent);
