import { useAuthStore } from "~/stores/authStore";
import { Building2, ChevronsUpDown } from "lucide-react";

/**
 * TenantSwitcher - Componente para mostrar y cambiar entre tenants
 *
 * Actualmente muestra el tenant actual del usuario.
 * En el futuro, permitirá cambiar entre múltiples tenants si el usuario
 * tiene acceso a más de uno.
 */
interface TenantSwitcherProps {
  isCollapsed?: boolean;
}

export function TenantSwitcher({ isCollapsed = false }: TenantSwitcherProps) {
  const user = useAuthStore((state) => state.user);

  if (!user) return null;

  const currentTenant = {
    id: user.tenant_id,
    name: user.tenant_name || "Mi Organización",
  };

  if (isCollapsed) {
    return (
      <div
        className="flex items-center justify-center p-2"
        title={currentTenant.name}
      >
        <Building2 className="h-5 w-5 text-primary" />
      </div>
    );
  }

  return (
    <button
      className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg transition-all duration-150 ease-cubic-bezier(0.4,0,0.2,1) hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-sm bg-muted/60"
      aria-label="Cambiar organización"
      title="Cambiar organización"
      // TODO: Implementar funcionalidad de cambio de tenant cuando haya múltiples
      disabled
    >
      <div className="flex items-center justify-center h-8 w-8 rounded-md bg-primary/10 shrink-0">
        <Building2 className="h-4 w-4 text-primary" />
      </div>
      <div className="flex flex-col items-start flex-1 min-w-0">
        <span className="text-xs font-semibold text-foreground truncate w-full">
          {currentTenant.name}
        </span>
        <span className="text-xs text-muted-foreground truncate w-full">
          Organización actual
        </span>
      </div>
      <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}
