import { useNavigate } from "react-router";
import { useAuthStore } from "~/stores/authStore";
import { useHasPermission } from "~/hooks/usePermissions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { getAbsoluteUrl } from "~/lib/api/client";

/**
 * UserMenu - Menú dropdown del usuario
 *
 * Muestra avatar del usuario y opciones: Perfil, Configuración y Cerrar Sesión.
 */
export function UserMenu() {
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const hasAiConfig = useHasPermission("ai.config");

  // Obtener iniciales del usuario
  const getInitials = (name: string | null | undefined): string => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      const first = parts[0]?.[0] ?? "";
      const last = parts[parts.length - 1]?.[0] ?? "";
      const initials = `${first}${last}`.trim();
      return (
        initials.length > 0 ? initials : name.substring(0, 2)
      ).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  const displayName =
    user?.full_name || user?.email || t("layout.userMenu.fallbackName");

  // STATUS: ✅ Configurado para usar getAbsoluteUrl (2026-01-13)
  // NOTA: Convierte URLs relativas (/files/...) a absolutas usando VITE_API_BASE_URL
  // PROBLEMA CONOCIDO: Avatar no se muestra - pendiente de prueba
  // Todo: the avatar do not load pictures from the backend

  const avatarUrl = getAbsoluteUrl(user?.avatar_url);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full px-2 py-1 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label={t("layout.userMenu.label")}
        >
          <Avatar>
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
            <AvatarFallback className="bg-[hsl(var(--primary))] text-[hsl(var(--secondary))]">
              {getInitials(user?.full_name)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden md:block text-sm font-medium text-foreground">
            {displayName}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            {user?.email && (
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => navigate("/profile")}
          className="cursor-pointer hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
        >
          {t("layout.userMenu.profile")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate("/settings")}
          className="cursor-pointer hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
        >
          {t("layout.userMenu.settings")}
        </DropdownMenuItem>
        {hasAiConfig && (
          <DropdownMenuItem
            onClick={() => navigate("/settings/ai-provider")}
            className="cursor-pointer hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
          >
            {t("ai.settings.provider.nav_label")}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-destructive focus:text-destructive hover:bg-[hsl(var(--color-error))]/20 hover:text-[hsl(var(--color-error))]"
        >
          {t("layout.userMenu.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
