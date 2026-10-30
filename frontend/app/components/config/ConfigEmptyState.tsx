/**
 * ConfigEmptyState - Estado vacío consistente para páginas de configuración
 */

import type { ReactNode } from "react";
import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { DownloadIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export interface ConfigEmptyStateProps {
  /** Título del estado vacío */
  title?: string;
  /** Descripción del estado vacío */
  description?: string;
  /** Acción opcional (botón, link, etc.) */
  action?: ReactNode;
  /** Icono personalizado */
  icon?: ReactNode;
  /** Clases CSS adicionales */
  className?: string;
}

/**
 * Estado vacío para configuración
 */
export function ConfigEmptyState({
  title = "No hay elementos",
  description = "No se encontraron elementos para mostrar.",
  action,
  icon,
  className,
}: ConfigEmptyStateProps) {
  return (
    <Card className={cn("", className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        {icon || (
          <HugeiconsIcon
            icon={DownloadIcon}
            size={48}
            className="text-muted-foreground mb-4"
          />
        )}
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            {description}
          </p>
        )}
        {action && <div className="mt-2">{action}</div>}
      </CardContent>
    </Card>
  );
}
