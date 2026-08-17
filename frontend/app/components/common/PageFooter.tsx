/**
 * PageFooter - Footer sticky con acciones
 *
 * Componente para footers consistentes con acciones (Reset, Save, etc.)
 */

import type { ReactNode } from "react";
import { cn } from "~/lib/utils";

export interface PageFooterProps {
  /** Contenido del footer */
  children: ReactNode;
  /** Clases CSS adicionales */
  className?: string;
  /** Si el footer es sticky */
  sticky?: boolean;
}

/**
 * Footer reutilizable para páginas
 */
export function PageFooter({
  children,
  className,
  sticky = true,
}: PageFooterProps) {
  return (
    <div
      className={cn(
        "border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        sticky && "sticky bottom-0 z-10",
        className
      )}
    >
      <div className="container mx-auto py-4">{children}</div>
    </div>
  );
}
