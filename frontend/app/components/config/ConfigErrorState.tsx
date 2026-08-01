/**
 * ConfigErrorState - Estado de error con mensaje y acción para páginas de configuración
 */

import type { ReactNode } from "react";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { AlertCircle } from "lucide-react";

export interface ConfigErrorStateProps {
  /** Título del error */
  title?: string;
  /** Mensaje de error */
  message: string;
  /** Acción opcional (botón de reintentar, etc.) */
  action?: ReactNode;
  /** Callback para acción de reintentar */
  onRetry?: () => void;
  /** Clases CSS adicionales */
  className?: string;
}

/**
 * Estado de error para configuración
 */
export function ConfigErrorState({
  title = "Error al cargar",
  message,
  action,
  onRetry,
  className,
}: ConfigErrorStateProps) {
  return (
    <Card className={cn("", className)}>
      <CardContent className="p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-destructive">{title}</h3>
            <p className="text-sm text-muted-foreground">{message}</p>
            {(action || onRetry) && (
              <div className="pt-2">
                {action || (
                  <Button variant="outline" size="sm" onClick={onRetry}>
                    Reintentar
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
