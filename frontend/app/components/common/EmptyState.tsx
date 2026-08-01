/**
 * EmptyState - Estado vacío genérico
 *
 * Componente reutilizable para mostrar estados vacíos en listas y tablas
 */

import type { ReactNode } from "react";
import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { DownloadIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslation } from "~/lib/i18n/useTranslation";

export interface EmptyStateProps {
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
  /** Si mostrar dentro de un Card */
  inCard?: boolean;
}

/**
 * Estado vacío genérico
 */
export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
  inCard = true,
}: EmptyStateProps) {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t("common.emptyTitle");
  const resolvedDescription = description ?? t("common.emptyDescription");

  const content = (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        !inCard && "py-8",
        className
      )}
    >
      {icon || (
        <HugeiconsIcon
          icon={DownloadIcon}
          size={48}
          className="text-muted-foreground mb-4"
        />
      )}
      <h3 className="text-lg font-semibold mb-2">{resolvedTitle}</h3>
      {resolvedDescription && (
        <p className="text-sm text-muted-foreground mb-4 max-w-md">
          {resolvedDescription}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );

  if (inCard) {
    return (
      <Card>
        <CardContent>{content}</CardContent>
      </Card>
    );
  }

  return content;
}
