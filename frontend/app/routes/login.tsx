/**
 * Login Page
 * Public page for user authentication
 */

import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "~/hooks/useAuth";
import { useAuthStore } from "~/stores/authStore";
import { PublicLayout } from "~/components/public/PublicLayout";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { checkRateLimit } from "~/lib/security/rateLimit";
import { sanitizeEmail } from "~/lib/security/sanitize";
import { checkRoutePermission } from "~/lib/utils/routePermissions";
import { useTranslation } from "~/lib/i18n/useTranslation";

export function meta() {
  return [
    { title: "Iniciar Sesión - AiutoX ERP" },
    {
      name: "description",
      content: "Inicia sesión en tu cuenta de AiutoX ERP",
    },
  ];
}

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);
  const hasJustLoggedIn = useRef(false);

  // Form state simple sin react-hook-form
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    remember_me: false,
  });

  // Handle navigation after login success using useEffect
  // This takes priority over the isAuthenticated redirect
  useEffect(() => {
    if (pendingRedirect) {
      // Use requestAnimationFrame to ensure navigation happens after DOM is ready
      // This prevents issues when component unmounts during navigation
      const rafId = requestAnimationFrame(() => {
        void navigate(pendingRedirect, { replace: true });
        setPendingRedirect(null); // Clear after navigation
        hasJustLoggedIn.current = false; // Reset flag after navigation
      });

      return () => cancelAnimationFrame(rafId);
    }
    return undefined;
  }, [pendingRedirect, navigate]);

  // Handle redirect if already authenticated when page loads (not after login)
  // Only execute if user was already authenticated (not just logged in)
  useEffect(() => {
    if (isAuthenticated && !pendingRedirect && !hasJustLoggedIn.current) {
      const redirectParam = searchParams.get("redirect");
      let targetPath = "/dashboard";
      if (redirectParam) {
        // Check if user has permission for the redirect route
        const hasPermission = checkRoutePermission(
          redirectParam,
          user?.permissions || []
        );

        if (!hasPermission) {
          targetPath = `/unauthorized?attempted=${encodeURIComponent(redirectParam)}`;
        } else {
          targetPath = redirectParam;
        }
      }

      void navigate(targetPath, { replace: true });
    }
  }, [isAuthenticated, navigate, searchParams, user, pendingRedirect]);

  // Early return if authenticated (but hooks must be called first)
  // Don't return early if we have a pendingRedirect - let the navigation complete
  if (isAuthenticated && !pendingRedirect) {
    return null;
  }

  const handleSimpleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.warn("[Login] Simple submit called with formData:", {
      email: formData.email,
      passwordLength: formData.password?.length || 0,
      hasPassword: !!formData.password,
      rememberMe: formData.remember_me,
    });

    // Validación simple
    if (!formData.email || !formData.password) {
      setError(t("auth.login.requiredFields"));
      return;
    }

    if (formData.password.length < 8) {
      setError(t("auth.login.passwordTooShort"));
      return;
    }

    setIsLoading(true);
    setError(null);

    // Sanitize email input
    const sanitizedEmail = sanitizeEmail(formData.email);
    if (!sanitizedEmail) {
      setError(t("auth.login.invalidEmail"));
      setIsLoading(false);
      return;
    }

    try {
      const result = await login({
        email: sanitizedEmail,
        password: formData.password,
        remember_me: formData.remember_me,
      });

      if (result.success) {
        // Successful logins should not count towards rate limiting
        // No need to reset - we never increment for successful logins
        // This ensures rate limiting only applies to failed attempts

        // Successful login - no rate limit increment needed

        // Set loading to false
        setIsLoading(false);

        // Schedule navigation for after render completes using useEffect
        // Get user from store after login (it's been updated by useAuth().login())
        const loggedInUser = useAuthStore.getState().user;
        const redirectParam = searchParams.get("redirect");

        let targetPath = "/dashboard";
        if (redirectParam) {
          // Check if user has permission for the redirect route
          const userPermissions = loggedInUser?.permissions || [];
          const hasPermission = checkRoutePermission(
            redirectParam,
            userPermissions
          );

          if (!hasPermission) {
            targetPath = `/unauthorized?attempted=${encodeURIComponent(redirectParam)}`;
          } else {
            targetPath = redirectParam;
          }
        }

        hasJustLoggedIn.current = true; // Mark that we just logged in
        setPendingRedirect(targetPath);
      } else {
        // Handle login error
        let errorMessage = t("auth.login.error.AUTH_INVALID_CREDENTIALS");

        // Check for specific error codes and messages from backend
        if (
          result.error &&
          typeof result.error === "object" &&
          "response" in result.error
        ) {
          const axiosError = result.error as {
            response?: {
              status?: number;
              data?: {
                error?: { code?: string; message?: string };
                detail?:
                  | string
                  | { error?: { code?: string; message?: string } };
                message?: string;
              };
            };
          };

          const statusCode = axiosError.response?.status;
          // FastAPI puts error in detail field, which can be a string or an object
          const detailData = axiosError.response?.data?.detail;
          const errorCode =
            (typeof detailData === "object" && detailData?.error?.code) ||
            axiosError.response?.data?.error?.code;
          const errorMsg =
            (typeof detailData === "object" && detailData?.error?.message) ||
            axiosError.response?.data?.error?.message;
          const detail =
            typeof detailData === "string" ? detailData : undefined;
          const responseMessage = axiosError.response?.data?.message;

          // Handle specific error codes -- always via i18n keyed by backend error
          // code, never the raw backend `message`/`detail`/`responseMessage`, which
          // are internal API strings (e.g. "Invalid credentials"), not i18n text.
          if (errorCode === "AUTH_RATE_LIMIT_EXCEEDED" || statusCode === 429) {
            // Backend rate limit exceeded - increment frontend counter for consistency
            checkRateLimit("login", { maxRequests: 5, windowMs: 60000 });
            setError(t("auth.login.error.AUTH_RATE_LIMIT_EXCEEDED"));
            setIsLoading(false);
            return;
          } else if (
            errorCode === "AUTH_INVALID_CREDENTIALS" ||
            statusCode === 401
          ) {
            // 401 Unauthorized - invalid credentials (FAILED ATTEMPT)
            // Increment rate limit counter for failed login attempt
            checkRateLimit("login", { maxRequests: 5, windowMs: 60000 });
            setError(t("auth.login.error.AUTH_INVALID_CREDENTIALS"));
            setIsLoading(false);
            return;
          } else if (statusCode === 500) {
            errorMessage = t("auth.login.error.serverError");
            console.error("Login error 500:", axiosError.response?.data);
          } else if (errorCode || errorMsg || detail || responseMessage) {
            // Backend sent a message and/or an unrecognized code -- fall back to
            // generic copy rather than showing the internal string directly.
            errorMessage = t("auth.login.error.generic");
          } else if (result.error instanceof Error) {
            // No HTTP response reached the backend (e.g. network/CSP failure) --
            // result.error.message here is Axios's own string ("Network Error"),
            // not i18n text, so show our own copy instead.
            errorMessage = t("auth.login.error.network");
          }
        } else if (result.error instanceof Error) {
          errorMessage = t("auth.login.error.network");
        }

        setError(errorMessage);
        setIsLoading(false);
      }
    } catch {
      setError(t("auth.login.unexpectedError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PublicLayout title="Iniciar Sesión">
      <form
        onSubmit={(e) => {
          void handleSimpleSubmit(e);
        }}
        className="space-y-6"
      >
        {/* Error Message */}
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/30 p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="tu@email.com"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            disabled={isLoading}
          />
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            disabled={isLoading}
          />
        </div>

        {/* Remember Me Checkbox */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="remember_me"
            checked={formData.remember_me}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, remember_me: checked as boolean })
            }
            disabled={isLoading}
          />
          <Label
            htmlFor="remember_me"
            className="text-sm font-normal cursor-pointer"
          >
            Recordarme
          </Label>
        </div>

        {/* Forgot Password Link */}
        <div className="text-right">
          <Link
            to="/forgot-password"
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {/* Submit Button */}
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Iniciando sesión...
            </>
          ) : (
            "Iniciar Sesión"
          )}
        </Button>
      </form>
    </PublicLayout>
  );
}
