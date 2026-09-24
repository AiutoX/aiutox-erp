/**
 * ConfigSection - Sección agrupada de campos con título y descripción
 *
 * Componente para agrupar campos relacionados en páginas de configuración
 */

import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { cn } from "~/lib/utils";

export interface ConfigSectionProps {
  /** Título de la sección */
  title: string;
  /** Descripción opcional de la sección */
  description?: string;
  /** Contenido de la sección */
  children: ReactNode;
  /** Clases CSS adicionales */
  className?: string;
  /** Si la sección está colapsada (futuro) */
  collapsible?: boolean;
}

/**
 * Sección agrupada para configuración
 */
export function ConfigSection({
  title,
  description,
  children,
  className,
}: ConfigSectionProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}
