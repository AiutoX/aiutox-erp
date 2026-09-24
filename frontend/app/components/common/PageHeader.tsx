/**
 * PageHeader - Header reutilizable con título, descripción, breadcrumb
 *
 * Componente para headers consistentes en todas las páginas
 */

import type { ReactNode } from "react";
import { Link } from "react-router";
import { cn } from "~/lib/utils";
import type { BreadcrumbItem } from "~/components/layout/PageLayout";
import { useTranslation } from "~/lib/i18n/useTranslation";

export interface PageHeaderProps {
  /** Título de la página */
  title: string;
  /** Descripción opcional */
  description?: string;
  /** Breadcrumb opcional */
  breadcrumb?: BreadcrumbItem[];
  /** Acciones opcionales (botones, etc.) */
  actions?: ReactNode;
  /** Clases CSS adicionales */
  className?: string;
}

/**
 * Header reutilizable para páginas
 */
export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  className,
}: PageHeaderProps) {
  const { t } = useTranslation();

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

  return (
    <div className={cn("space-y-2", className)}>
      {renderBreadcrumb()}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">{title}</h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
        )}
      </div>
    </div>
  );
}
