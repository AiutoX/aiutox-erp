/**
 * Verify Email Page
 * Public page for email verification with token
 */

import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { PublicLayout } from "~/components/public/PublicLayout";
import { Button } from "~/components/ui/button";
import { verifyEmail } from "~/lib/api/auth.api";
import { useTranslation } from "~/lib/i18n/useTranslation";
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
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setError(t("auth.verifyEmail.error.missingToken"));
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
              status?: number;
              data?: { error?: { code?: string; message?: string } };
            };
          };
          const status = axiosError.response?.status;
          const errorCode = axiosError.response?.data?.error?.code;

          if (status === 404) {
            // Endpoint not implemented yet -- distinct from a real verification
            // failure, must be checked before falling into the error-code branch
            // (a 404 also carries a `response`, so it would otherwise be
            // mistaken for a recognized/unrecognized API error code).
            setError(t("auth.verifyEmail.error.notImplemented"));
          } else if (errorCode === "AUTH_TOKEN_INVALID") {
            setError(t("auth.verifyEmail.error.AUTH_TOKEN_INVALID"));
          } else {
            // Never show the backend's raw `message` -- it's an internal API string,
            // not i18n text.
            setError(t("auth.verifyEmail.error.generic"));
          }
        } else {
          // No HTTP response reached the backend (network/CSP failure)
          setError(t("auth.verifyEmail.error.notImplemented"));
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
    // t is intentionally excluded: it is not memoized by useTranslation, and
    // this effect must only re-run when the verification token changes, not
    // on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
