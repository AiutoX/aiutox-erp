/**
 * Admin setup page - Initial system configuration
 */

import { AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SetupForm } from "~/components/admin/SetupForm";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useSetupStatus } from "~/hooks/useSetupStatus";

export default function AdminSetupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: status, isLoading, isError } = useSetupStatus();

  // Redirect to login if setup is completed
  useEffect(() => {
    if (status?.setup_completed) {
      navigate("/login", { replace: true });
    }
  }, [status, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {t("setup.loading")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("setup.error.title")}</AlertTitle>
          <AlertDescription>{t("setup.error.message")}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Setup already completed
  if (status?.setup_completed) {
    return null; // Will redirect via useEffect
  }

  // Setup window closed
  if (!status?.window_open) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Alert variant="destructive" className="max-w-md">
          <Clock className="h-4 w-4" />
          <AlertTitle>{t("setup.windowClosed.title")}</AlertTitle>
          <AlertDescription>{t("setup.windowClosed.message")}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold">
              {t("setup.welcome.title")}
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              {t("setup.welcome.subtitle")}
            </p>
          </CardHeader>
        </Card>

        {/* Status Alert */}
        {status?.setup_required && (
          <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertTitle>{t("setup.status.required.title")}</AlertTitle>
            <AlertDescription>
              {t("setup.status.required.message")}
            </AlertDescription>
          </Alert>
        )}

        {/* Setup Form */}
        <SetupForm
          onSuccess={() => {
            // Redirect to login after successful setup
            setTimeout(() => {
              navigate("/login", { replace: true });
            }, 2000);
          }}
        />

        {/* Footer Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>{t("setup.info.security.title")}:</strong>{" "}
                {t("setup.info.security.message")}
              </p>
              <p>
                <strong>{t("setup.info.window.title")}:</strong>{" "}
                {t("setup.info.window.message").replace(
                  "{{minutes}}",
                  status?.expires_at ? "10" : "N/A"
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
