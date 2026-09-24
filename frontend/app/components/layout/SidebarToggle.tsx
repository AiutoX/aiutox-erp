import { HugeiconsIcon } from "@hugeicons/react";
import { PlugIcon, DownloadIcon } from "@hugeicons/core-free-icons";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

/**
 * SidebarToggle - Botón para abrir/cerrar el sidebar
 *
 * Visible principalmente en móvil y tablet. En desktop, el sidebar
 * puede tener su propio toggle de collapse/expand.
 */
interface SidebarToggleProps {
  onClick?: () => void;
  isOpen?: boolean;
  className?: string;
}

export function SidebarToggle({
  onClick,
  isOpen = false,
  className,
}: SidebarToggleProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={cn(
        "lg:hidden hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]",
        className
      )}
      aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
      aria-expanded={isOpen}
    >
      <HugeiconsIcon
        icon={isOpen ? DownloadIcon : PlugIcon}
        size={24}
        color="currentColor"
        strokeWidth={1.5}
      />
    </Button>
  );
}
