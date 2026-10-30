import { Menu, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useTranslation } from "~/lib/i18n/useTranslation";
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
  const { t } = useTranslation();
  const Icon = isOpen ? X : Menu;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={cn(
        "lg:hidden hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]",
        className
      )}
      aria-label={isOpen ? t("layout.header.closeMenu") : t("layout.header.openMenu")}
      aria-expanded={isOpen}
    >
      <Icon size={24} color="currentColor" strokeWidth={1.5} />
    </Button>
  );
}
