/**
 * ErrorState - Estado de error genérico
 *
 * Componente reutilizable para mostrar estados de error
 */

import type { ReactNode } from "react";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { AlertCircle } from "lucide-react";
import { useTranslation } from "~/lib/i18n/useTranslation";

export interface ErrorStateProps {
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
  /** Si mostrar dentro de un Card */
  inCard?: boolean;
}

/**
 * Estado de error genérico
 */
export function ErrorState({
  title,
  message,
  action,
  onRetry,
  className,
  inCard = true,
}: ErrorStateProps) {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t("common.errorLoadingTitle");

  const content = (
    <div className={cn("flex items-start gap-3", className)}>
      <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <h3 className="font-semibold text-destructive">{resolvedTitle}</h3>
        <p className="text-sm text-muted-foreground">{message}</p>
        {(action || onRetry) && (
          <div className="pt-2">
            {action || (
              <Button variant="outline" size="sm" onClick={onRetry}>
                {t("common.retry")}
              </Button>
            )}
          </div>
        )}
      </div>
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
