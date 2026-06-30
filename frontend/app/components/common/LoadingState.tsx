/**
 * LoadingState - Estado de carga genérico
 *
 * Componente reutilizable para mostrar estados de carga
 */

import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

export interface LoadingStateProps {
  /** Número de líneas de skeleton a mostrar */
  lines?: number;
  /** Si mostrar skeleton de título */
  showTitle?: boolean;
  /** Clases CSS adicionales */
  className?: string;
  /** Si mostrar dentro de un Card */
  inCard?: boolean;
}

/**
 * Estado de carga genérico
 */
export function LoadingState({
  lines = 3,
  showTitle = true,
  className,
  inCard = true,
}: LoadingStateProps) {
  const content = (
    <div className={cn("space-y-4", className)}>
      {showTitle && <Skeleton className="h-8 w-64" />}
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className="h-4 w-full" />
      ))}
    </div>
  );

  if (inCard) {
    return (
      <Card>
        <CardContent className="p-6">{content}</CardContent>
      </Card>
    );
  }

  return content;
}
