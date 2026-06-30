/**
 * PageLayout - Layout base reutilizable para todas las páginas
 *
 * Proporciona una estructura consistente con:
 * - Header con título, descripción y breadcrumb opcional
 * - Contenedor principal con padding consistente
 * - Footer sticky opcional con botones de acción
 * - Manejo de estados: loading, error, success
 * - Soporte para tabs y contenido directo
 * - Integración con dark mode
 */

import type { ReactNode } from "react";
import { Link } from "react-router";
import { cn } from "~/lib/utils";
import { Skeleton } from "~/components/ui/skeleton";
import { Card, CardContent } from "~/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useTranslation } from "~/lib/i18n/useTranslation";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageLayoutProps {
  /** Título de la página */
  title: string;
  /** Descripción opcional de la página */
  description?: string;
  /** Breadcrumb opcional */
  breadcrumb?: BreadcrumbItem[];
  /** Footer sticky opcional con acciones */
  footer?: ReactNode;
  /** Estado de carga - muestra skeleton */
  loading?: boolean;
  /** Error a mostrar - muestra mensaje de error */
  error?: Error | string | null;
  /** Contenido de la página */
  children: ReactNode;
  /** Clases CSS adicionales para el contenedor */
  className?: string;
  /** Si es true, el contenedor no tiene padding lateral (útil para tablas full-width) */
  fullWidth?: boolean;
}

/**
 * Componente de layout base para páginas
 */
export function PageLayout({
  title,
  description,
  breadcrumb,
  footer,
  loading = false,
  error = null,
  children,
  className,
  fullWidth = false,
}: PageLayoutProps) {
  const { t } = useTranslation();

  // Renderizar breadcrumb si existe
  const renderBreadcrumb = () => {
    if (!breadcrumb || breadcrumb.length === 0) return null;

    return (
      <nav aria-label={t("layout.breadcrumb")} className="mb-4">
        <ol className="flex items-center space-x-2 text-sm text-muted-foreground">
          {breadcrumb.map((item, index) => (
            <li key={index} className="flex items-center">
              {index > 0 && <span className="mx-2">/</span>}
              {item.href ? (
                <Link
                  to={item.href}
                  className="hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={
                    index === breadcrumb.length - 1
                      ? "text-foreground font-medium"
                      : ""
                  }
                >
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    );
  };

  // Renderizar estado de carga
  if (loading) {
    return (
      <div className={cn("container mx-auto py-6 space-y-6", className)}>
        {renderBreadcrumb()}
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          {description && <Skeleton className="h-4 w-96" />}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Renderizar estado de error
  if (error) {
    const errorMessage = error instanceof Error ? error.message : error;

    return (
      <div className={cn("container mx-auto py-6 space-y-6", className)}>
        {renderBreadcrumb()}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{title}</h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">
                  {t("common.errorLoadingTitle")}
                </h3>
                <p className="text-sm text-muted-foreground">{errorMessage}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Renderizar contenido normal
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div
        className={cn(
          fullWidth ? "w-full px-0" : "container mx-auto",
          "py-6 space-y-6 flex-1",
          className
        )}
      >
        {renderBreadcrumb()}

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{title}</h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>

        {/* Contenido */}
        <div className="flex-1">{children}</div>
      </div>

      {/* Footer sticky */}
      {footer && (
        <div className="sticky bottom-0 z-10 border-t border-border/70 shadow-[0_-2px_8px_rgba(0,0,0,0.04)] bg-background/98 backdrop-blur supports-backdrop-filter:bg-background/95">
          <div
            className={cn(
              fullWidth ? "w-full px-6" : "container mx-auto",
              "py-4"
            )}
          >
            {footer}
          </div>
        </div>
      )}
    </div>
  );
}
