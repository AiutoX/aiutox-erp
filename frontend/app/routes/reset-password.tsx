/**
 * Reset Password Page
 * Public page for resetting password with token
 */

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useSearchParams } from "react-router";
import { PublicLayout } from "~/components/public/PublicLayout";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  resetPasswordSchema,
  type ResetPasswordFormData,
} from "~/lib/validations/auth.schema";
import { resetPassword } from "~/lib/api/auth.api";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export function meta() {
  return [
    { title: "Restablecer Contraseña - AiutoX ERP" },
    {
      name: "description",
      content: "Restablece tu contraseña usando el enlace de recuperación",
    },
  ];
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const password = watch("password");
  const confirmPassword = watch("confirmPassword");

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (!tokenParam) {
      setError("Token de restablecimiento no válido o faltante.");
    } else {
      setToken(tokenParam);
    }
  }, [searchParams]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setError("Token de restablecimiento no válido.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await resetPassword(token, data.password);
      setIsSuccess(true);
      // Redirect to login after 2 seconds
      setTimeout(() => {
        void navigate("/login?message=password-reset-success", {
          replace: true,
        });
      }, 2000);
    } catch (error) {
      // Handle error
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: {
            data?: { error?: { code?: string; message?: string } };
          };
        };
        const errorCode = axiosError.response?.data?.error?.code;
        const errorMsg = axiosError.response?.data?.error?.message;

        if (
          errorCode === "AUTH_TOKEN_INVALID" ||
          errorCode === "AUTH_REFRESH_TOKEN_INVALID"
        ) {
          setError(
            "El enlace ha expirado o es inválido. Por favor solicita un nuevo enlace de recuperación."
          );
        } else {
          setError(
            errorMsg ||
              "Error al restablecer la contraseña. Por favor intenta nuevamente."
          );
        }
      } else {
        setError(
          "Error al restablecer la contraseña. Por favor intenta nuevamente."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <PublicLayout title="Token Inválido">
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              Enlace Inválido
            </h3>
            <p className="text-sm text-muted-foreground">
              El enlace de restablecimiento no es válido o ha expirado.
            </p>
          </div>
          <div className="pt-4 space-y-2">
            <Button asChild variant="default" className="w-full">
              <Link to="/forgot-password">Solicitar Nuevo Enlace</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/login">Volver al inicio de sesión</Link>
            </Button>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (isSuccess) {
    return (
      <PublicLayout title="Contraseña Restablecida">
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <CheckCircle2 className="h-12 w-12 text-[hsl(var(--color-success))]" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              ¡Contraseña Restablecida!
            </h3>
            <p className="text-sm text-muted-foreground">
              Tu contraseña ha sido restablecida exitosamente. Serás redirigido
              al inicio de sesión.
            </p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout title="Restablecer Contraseña">
      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        className="space-y-6"
      >
        {/* Error Message */}
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/30 p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Password Field */}
        <div className="space-y-2">
          <Label htmlFor="password">Nueva Contraseña</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            {...register("password")}
            disabled={isLoading}
            className={errors.password ? "border-destructive" : ""}
          />
          {errors.password && (
            <p className="text-sm text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            {...register("confirmPassword")}
            disabled={isLoading}
            className={
              errors.confirmPassword ||
              (confirmPassword && password !== confirmPassword)
                ? "border-destructive"
                : confirmPassword && password === confirmPassword
                  ? "border-[hsl(var(--color-success))]"
                  : ""
            }
          />
          {errors.confirmPassword && (
            <p className="text-sm text-destructive">
              {errors.confirmPassword.message}
            </p>
          )}
          {confirmPassword &&
            password &&
            password === confirmPassword &&
            !errors.confirmPassword && (
              <p className="text-sm text-[hsl(var(--color-success))]">
                Las contraseñas coinciden
              </p>
            )}
        </div>

        {/* Submit Button */}
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Restableciendo...
            </>
          ) : (
            "Restablecer Contraseña"
          )}
        </Button>

        {/* Back to Login */}
        <div className="text-center">
          <Link
            to="/login"
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            ← Volver al inicio de sesión
          </Link>
        </div>
      </form>
    </PublicLayout>
  );
}
