/**
 * ConfigLoadingState - Estado de carga con Skeleton para páginas de configuración
 */

import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

export interface ConfigLoadingStateProps {
  /** Número de líneas de skeleton a mostrar */
  lines?: number;
  /** Si mostrar skeleton de título */
  showTitle?: boolean;
  /** Clases CSS adicionales */
  className?: string;
}

/**
 * Estado de carga para configuración
 */
export function ConfigLoadingState({
  lines = 3,
  showTitle = true,
  className,
}: ConfigLoadingStateProps) {
  return (
    <Card className={cn("", className)}>
      <CardContent className="p-6 space-y-4">
        {showTitle && <Skeleton className="h-8 w-64" />}
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton key={index} className="h-4 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}
