import { Link, useLocation } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import type { NavItem as NavItemType } from "~/config/navigation";
import { cn } from "~/lib/utils";

/**
 * NavItem - Item individual de navegación del sidebar
 *
 * Renderiza un item de navegación con icono, label y badge opcional.
 * Resalta cuando la ruta actual coincide con el item.
 */
interface NavItemProps {
  item: NavItemType;
  isActive: boolean;
  isCollapsed: boolean;
}

export function NavItem({ item, isActive, isCollapsed }: NavItemProps) {
  const location = useLocation();
  const isCurrentActive = isActive || location.pathname === item.to;

  return (
    <Link
      to={item.to || "#"}
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium",
        "transition-all duration-200 ease-in-out",
        "hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        isCurrentActive
          ? "bg-primary/10 text-primary"
          : "text-foreground hover:text-primary",
        isCollapsed && "justify-center"
      )}
      aria-current={isCurrentActive ? "page" : undefined}
      aria-label={isCollapsed ? item.label : undefined}
    >
      <HugeiconsIcon
        icon={item.icon}
        size={20}
        color={
          isCurrentActive ? "hsl(var(--primary))" : "hsl(var(--foreground))"
        }
        strokeWidth={1.5}
      />
      {!isCollapsed && (
        <>
          <span className="flex-1">{item.label}</span>
          {item.badge !== undefined && item.badge > 0 && (
            <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold text-primary-foreground bg-primary rounded-full">
              {item.badge > 99 ? "99+" : item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}
