/**
 * Public Layout Component
 * Minimalist layout for public pages (login, forgot password, etc.)
 */

import type { ReactNode } from "react";
import { Link } from "react-router";

export interface PublicLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

/**
 * Layout común para páginas públicas
 * Centrado vertical y horizontal, con logo y card para contenido
 */
export function PublicLayout({
  children,
  title,
  description,
}: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Logo/Header */}
        <div className="text-center">
          <Link to="/login" className="inline-block">
            <img
              src="/logo.png"
              alt="AiutoX ERP"
              className="h-16 w-auto mx-auto"
              width={250}
              height={40}
            />
          </Link>
          {title && (
            <h2 className="mt-6 text-2xl font-semibold text-foreground">
              {title}
            </h2>
          )}
          {description && (
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          )}
        </div>

        {/* Content Card */}
        <div className="bg-card rounded-lg shadow-md p-8 border border-border">
          {children}
        </div>

        {/* Footer Links */}
        <div className="text-center text-sm text-muted-foreground">
          <Link
            to="/login"
            className="text-primary hover:text-primary/80 transition-colors"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
