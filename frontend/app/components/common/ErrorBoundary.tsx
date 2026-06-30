/**
 * ErrorBoundary component
 * Captura errores de React y muestra UI de fallback
 */

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error capturado por ErrorBoundary:", error, errorInfo);

    // Llamar callback personalizado si existe
    this.props.onError?.(error, errorInfo);

    // Guardar errorInfo en el estado
    this.setState({ errorInfo });

    // En producción, enviar a servicio de monitoreo
    if (import.meta.env?.PROD) {
      // TODO: Integrar con Sentry u otro servicio
      // Sentry.captureException(error, { extra: errorInfo });
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      // Si hay fallback personalizado, usarlo
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI de error por defecto
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-2xl w-full border-destructive">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                    <svg
                      className="h-6 w-6 text-destructive"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      Algo salió mal
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Ha ocurrido un error inesperado
                    </p>
                  </div>
                </div>

                {/* Detalles del error en desarrollo */}
                {import.meta.env?.DEV && this.state.error && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <p className="text-sm font-mono text-destructive mb-2">
                      {this.state.error.toString()}
                    </p>
                    {this.state.errorInfo && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          Ver stack trace
                        </summary>
                        <pre className="mt-2 text-xs overflow-auto max-h-64 text-muted-foreground">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </details>
                    )}
                  </div>
                )}

                {/* Mensaje para usuario */}
                <p className="text-sm text-muted-foreground">
                  Puedes intentar recargar la página o volver a intentarlo más
                  tarde. Si el problema persiste, contacta a soporte.
                </p>

                {/* Acciones */}
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={this.handleReset}
                    variant="outline"
                    className="flex-1"
                  >
                    Intentar de nuevo
                  </Button>
                  <Button
                    onClick={this.handleReload}
                    variant="default"
                    className="flex-1"
                  >
                    Recargar página
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
