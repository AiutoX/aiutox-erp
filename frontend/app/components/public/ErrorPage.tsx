/**
 * Error Page Component
 * Base component for error pages (404, 403, 500, etc.)
 */

import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import {
  AlertCircle,
  FileX,
  Lock,
  Server,
  Home,
  ArrowLeft,
} from "lucide-react";

export interface ErrorPageProps {
  code: number;
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
  actionOnClick?: () => void;
  icon?: ReactNode;
}

/**
 * Componente base para páginas de error
 */
export function ErrorPage({
  code,
  title,
  message,
  actionLabel,
  actionHref,
  actionOnClick,
  icon,
}: ErrorPageProps) {
  const navigate = useNavigate();

  // Default icons based on error code
  const defaultIcon =
    icon ||
    (code === 404 ? (
      <FileX className="h-24 w-24 text-gray-400" />
    ) : code === 403 ? (
      <Lock className="h-24 w-24 text-gray-400" />
    ) : code === 500 ? (
      <Server className="h-24 w-24 text-gray-400" />
    ) : (
      <AlertCircle className="h-24 w-24 text-gray-400" />
    ));

  // Default action
  const defaultActionLabel =
    actionLabel || (code === 404 ? "Volver al inicio" : "Volver");
  const defaultActionHref = actionHref || (code === 404 ? "/login" : undefined);
  const defaultActionOnClick =
    actionOnClick || (code === 404 ? undefined : () => navigate(-1));

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">{defaultIcon}</div>

        {/* Error Code */}
        <div className="text-6xl font-bold text-[#023E87]">{code}</div>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-[#121212]">{title}</h1>

        {/* Message */}
        <p className="text-[#3C3A47]">{message}</p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {defaultActionHref ? (
            <Button
              asChild
              variant="default"
              className="bg-[#023E87] hover:bg-[#023E87]/90"
            >
              <Link to={defaultActionHref}>
                {code === 404 ? (
                  <Home className="mr-2 h-4 w-4" />
                ) : (
                  <ArrowLeft className="mr-2 h-4 w-4" />
                )}
                {defaultActionLabel}
              </Link>
            </Button>
          ) : (
            <Button
              onClick={defaultActionOnClick}
              variant="default"
              className="bg-[#023E87] hover:bg-[#023E87]/90"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {defaultActionLabel}
            </Button>
          )}

          {/* Link to login if not authenticated */}
          {code !== 404 && (
            <Button asChild variant="outline">
              <Link to="/login">Iniciar Sesión</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
