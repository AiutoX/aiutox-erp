/**
 * Verify Email Page
 * Public page for email verification with token
 */

import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { PublicLayout } from "~/components/public/PublicLayout";
import { Button } from "~/components/ui/button";
import { verifyEmail } from "~/lib/api/auth.api";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export function meta() {
  return [
    { title: "Verificar Email - AiutoX ERP" },
    {
      name: "description",
      content: "Verifica tu dirección de email",
    },
  ];
}

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setError("Token de verificación no válido o faltante.");
      setIsLoading(false);
      return;
    }

    // Verify email
    verifyEmail(token)
      .then(() => {
        setIsSuccess(true);
      })
      .catch((error) => {
        // Handle error
        if (error && typeof error === "object" && "response" in error) {
          const axiosError = error as {
            response?: {
              data?: { error?: { code?: string; message?: string } };
            };
          };
          const errorCode = axiosError.response?.data?.error?.code;
          const errorMsg = axiosError.response?.data?.error?.message;

          if (errorCode === "AUTH_TOKEN_INVALID") {
            setError("El enlace de verificación ha expirado o es inválido.");
          } else {
            setError(
              errorMsg ||
                "Error al verificar el email. Por favor intenta nuevamente."
            );
          }
        } else {
          // If endpoint doesn't exist, show structure ready message
          setError(
            "La verificación de email aún no está disponible. El endpoint será implementado próximamente."
          );
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [searchParams]);

  if (isLoading) {
    return (
      <PublicLayout title="Verificando Email">
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <Loader2 className="h-12 w-12 text-[#023E87] animate-spin" />
          </div>
          <p className="text-sm text-[#3C3A47]">Verificando tu email...</p>
        </div>
      </PublicLayout>
    );
  }

  if (isSuccess) {
    return (
      <PublicLayout title="Email Verificado">
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-[#121212]">
              ¡Email Verificado!
            </h3>
            <p className="text-sm text-[#3C3A47]">
              Tu dirección de email ha sido verificada exitosamente.
            </p>
          </div>
          <div className="pt-4">
            <Button
              asChild
              variant="default"
              className="w-full bg-[#023E87] hover:bg-[#023E87]/90"
            >
              <Link to="/login">Iniciar Sesión</Link>
            </Button>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout title="Error de Verificación">
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <AlertCircle className="h-12 w-12 text-red-600" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-[#121212]">
            Verificación Fallida
          </h3>
          <p className="text-sm text-[#3C3A47]">
            {error ||
              "No se pudo verificar tu email. El enlace puede haber expirado o ser inválido."}
          </p>
        </div>
        <div className="pt-4 space-y-2">
          <Button
            asChild
            variant="default"
            className="w-full bg-[#023E87] hover:bg-[#023E87]/90"
          >
            <Link to="/login">Volver al inicio de sesión</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to="/login">Ir al inicio</Link>
          </Button>
        </div>
      </div>
    </PublicLayout>
  );
}
