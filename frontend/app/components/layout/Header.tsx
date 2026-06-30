import { memo, useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { GlobalSearch } from "./GlobalSearch";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Calendar01Icon } from "@hugeicons/core-free-icons";
import { MoonIcon, SunIcon } from "lucide-react";
import { UserMenu } from "./UserMenu";
import { SidebarToggle } from "./SidebarToggle";
import { NotificationBell } from "~/components/notifications/NotificationBell";
import { Button } from "~/components/ui/button";
import { useTheme } from "~/providers";
import { cn } from "~/lib/utils";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { useQuickActions } from "~/hooks/useQuickActions";
import {
  initializeQuickActions,
  quickActionsRegistry,
  type QuickAction,
} from "~/lib/quickActions/registry";
import { useQuickActionsStore } from "~/stores/quickActionsStore";
import { TaskQuickAdd } from "~/features/tasks/components/TaskQuickAdd";
import { useTaskModuleSettings } from "~/features/tasks/hooks/useTasks";
import { useCalendarModalStore } from "~/stores/calendarModalStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

/**
 * Header - Barra superior de la aplicación
 *
 * Contiene:
 * - Logo (izquierda)
 * - Search bar placeholder (centro, opcional)
 * - Notifications placeholder (derecha, opcional)
 * - User menu (derecha)
 */
interface HeaderProps {
  onSidebarToggle?: () => void;
  isSidebarOpen?: boolean;
  isSidebarCollapsed?: boolean;
}

type CSSPropertiesWithVars = React.CSSProperties & {
  [key: `--${string}`]: string | number;
};

function HeaderComponent({
  onSidebarToggle,
  isSidebarOpen,
  isSidebarCollapsed,
}: HeaderProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const quickActions = useQuickActions();
  const [isTaskQuickAddOpen, setIsTaskQuickAddOpen] = useState(false);
  const taskSettingsQuery = useTaskModuleSettings();
  const taskSettings = taskSettingsQuery.data?.data;
  const showCalendarButton = taskSettings?.calendar_enabled;
  const calendarModal = useCalendarModalStore();
  const isCalendarActive =
    location.pathname === "/calendar" || calendarModal.isOpen;

  // Inicializar acciones rápidas del sistema (solo una vez)
  useEffect(() => {
    initializeQuickActions();

    // También inicializar en el store de Zustand
    const { initializeActions } = useQuickActionsStore.getState();
    const allActions = quickActionsRegistry.getAll();
    if (allActions.length > 0) {
      initializeActions(allActions);
    }
  }, []);

  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("light");
    } else {
      // system - toggle to opposite of current resolved theme
      setTheme(resolvedTheme === "dark" ? "light" : "dark");
    }
  };

  const handleQuickActionClick = (action: QuickAction) => {
    if (action.id === "new-task") {
      setIsTaskQuickAddOpen(true);
    } else {
      void navigate(action.route);
    }
  };

  return (
    <header
      style={{ "--foreground": "var(--navbar-text)" } as CSSPropertiesWithVars}
      className="h-16 shrink-0 bg-[hsl(var(--navbar-bg))] text-[hsl(var(--navbar-text))] px-6 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
      role="banner"
    >
      {/* Sección izquierda: Logo y SidebarToggle (móvil) */}
      <div className="flex items-center gap-4">
        <SidebarToggle
          onClick={onSidebarToggle}
          isOpen={isSidebarOpen}
          className="lg:hidden"
        />
        {/* Logo en Header - aparece cuando sidebar está colapsado */}
        <Link
          to="/"
          className={cn(
            "hidden lg:flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded overflow-hidden",
            "transition-all duration-200 ease-in-out",
            isSidebarCollapsed
              ? "opacity-100 max-w-[200px] visible"
              : "opacity-0 max-w-0 invisible"
          )}
          aria-label={t("layout.header.goHome")}
        >
          <img
            src="/logo-name.png"
            alt="AiutoX ERP"
            className="h-6 object-contain"
          />
        </Link>
        {/* Logo móvil */}
        <Link
          to="/"
          className="lg:hidden flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
          aria-label={t("layout.header.goHome")}
        >
          <span className="text-xl font-bold text-primary">AiutoX ERP</span>
        </Link>
      </div>

      {/* Sección centro: GlobalSearch (Cmd+K) */}
      <div className="hidden md:flex flex-1 max-w-md mx-8 relative">
        <GlobalSearch className="w-full" />
      </div>

      {/* Sección derecha: Quick Actions, Theme Toggle, Notifications y UserMenu */}
      <div className="flex items-center gap-4">
        {/* Quick Actions Button (Desktop) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
              aria-label={t("layout.header.quickActions")}
            >
              <HugeiconsIcon icon={Add01Icon} size={20} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* Other Quick Actions */}
            {quickActions.map((action) => (
              <DropdownMenuItem
                key={action.id}
                onClick={() => handleQuickActionClick(action)}
              >
                {action.icon &&
                typeof action.icon === "function" &&
                action.icon() !== null ? (
                  <HugeiconsIcon
                    icon={action.icon()}
                    size={16}
                    className="mr-2"
                  />
                ) : (
                  <div className="w-4 h-4 mr-2 flex items-center justify-center">
                    <div className="w-2 h-2 bg-gray-400 rounded-full" />
                  </div>
                )}
                {t(action.label)}
              </DropdownMenuItem>
            ))}
            {quickActions.length === 0 && (
              <div style={{ padding: "8px", fontSize: "12px", color: "#999" }}>
                No hay acciones disponibles
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {showCalendarButton && (
          <Button
            variant={isCalendarActive ? "default" : "ghost"}
            size="icon"
            className={cn(
              "hidden lg:flex",
              !isCalendarActive &&
                "hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
            )}
            onClick={() => calendarModal.open(location.pathname)}
            aria-label={t("tasks.settings.calendar")}
            title={t("tasks.settings.calendar")}
          >
            <HugeiconsIcon icon={Calendar01Icon} size={18} />
          </Button>
        )}

        {/* TaskQuickAdd Modal (controlled) */}
        <TaskQuickAdd
          open={isTaskQuickAddOpen}
          onOpenChange={setIsTaskQuickAddOpen}
          defaultMode="task"
          onTaskCreated={() => setIsTaskQuickAddOpen(false)}
        />

        {/* Quick Add Task Button (Mobile - Floating) */}
        <div className="md:hidden">
          <TaskQuickAdd defaultMode="task" onTaskCreated={() => {}} />
        </div>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={
            resolvedTheme === "dark"
              ? t("layout.header.themeToLight")
              : t("layout.header.themeToDark")
          }
          className="hidden md:flex hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
        >
          {resolvedTheme === "dark" ? (
            <SunIcon className="h-5 w-5" />
          ) : (
            <MoonIcon className="h-5 w-5" />
          )}
        </Button>

        {/* Notifications */}
        <div className="hidden md:block">
          <NotificationBell />
        </div>

        <UserMenu />
      </div>
    </header>
  );
}

export const Header = memo(HeaderComponent);
