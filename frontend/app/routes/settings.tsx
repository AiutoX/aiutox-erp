/**
 * Settings Page
 *
 * Configuraciones personales del usuario: zona horaria, formatos de fecha y hora, moneda e idioma
 */

import { useState } from "react";
// import { useNavigate } from "react-router";
import { PageLayout } from "~/components/layout/PageLayout";
import { useAuthStore } from "~/stores/authStore";
import { useUser, useUpdateUser } from "~/features/users/hooks/useUsers";
import { showToast } from "~/components/common/Toast";
import { LoadingState } from "~/components/common/LoadingState";
import { ErrorState } from "~/components/common/ErrorState";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Button } from "~/components/ui/button";
import type { UserUpdate } from "~/features/users/types/user.types";

const TIMEZONES = [
  "America/Mexico_City",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Sao_Paulo",
  "America/Buenos_Aires",
  "America/Santiago",
  "America/Bogota",
  "Europe/London",
  "Europe/Paris",
  "Europe/Madrid",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
  "UTC",
];

const DATE_FORMATS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (31/12/2025)" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (12/31/2025)" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (2025-12-31)" },
  { value: "DD-MM-YYYY", label: "DD-MM-YYYY (31-12-2025)" },
] as const;

const TIME_FORMATS = [
  { value: "12h", label: "12 horas (AM/PM)" },
  { value: "24h", label: "24 horas" },
] as const;

const CURRENCIES = [
  { value: "MXN", label: "Peso Mexicano" },
  { value: "USD", label: "Dólar Estadounidense" },
  { value: "EUR", label: "Euro" },
  { value: "GBP", label: "Libra Esterlina" },
  { value: "CAD", label: "Dólar Canadiense" },
  { value: "ARS", label: "Peso Argentino" },
  { value: "BRL", label: "Real Brasileño" },
  { value: "CLP", label: "Peso Chileno" },
  { value: "COP", label: "Peso Colombiano" },
  { value: "JPY", label: "Yen Japonés" },
  { value: "CNY", label: "Yuan Chino" },
] as const;

const LANGUAGES = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" },
  { value: "pt", label: "Português" },
  { value: "ja", label: "日本語" },
  { value: "zh", label: "中文" },
] as const;

export default function SettingsPage() {
  const { user: authUser } = useAuthStore();
  const { user, loading, error } = useUser(authUser?.id || null);
  const { mutateAsync: updateUserAsync, isPending: updating } = useUpdateUser();

  const [settings, setSettings] = useState({
    timezone: user?.timezone || "America/Mexico_City",
    preferred_language: user?.preferred_language || "es",
  });

  const handleSave = async () => {
    if (!authUser?.id) return;

    try {
      const updateData: UserUpdate = {
        timezone: settings.timezone,
        preferred_language: settings.preferred_language,
      };

      await updateUserAsync({ userId: authUser.id, data: updateData });
      showToast("Configuraciones guardadas exitosamente", "success");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al guardar configuraciones";
      showToast(errorMessage, "error");
    }
  };

  const handleCancel = () => {
    setSettings({
      timezone: user?.timezone || "America/Mexico_City",
      preferred_language: user?.preferred_language || "es",
    });
  };

  if (loading) return <LoadingState />;
  if (error)
    return (
      <ErrorState message={error instanceof Error ? error.message : "Error"} />
    );

  return (
    <PageLayout
      title="Configuraciones Personales"
      description="Configura tus preferencias de localización"
      breadcrumb={[
        { label: "Inicio", href: "/" },
        { label: "Configuraciones" },
      ]}
    >
      <div className="max-w-3xl space-y-6">
        {/* Localización */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Localización</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Configura zona horaria, formatos de fecha y hora, moneda e idioma
          </p>

          <div className="space-y-6">
            {/* Zona Horaria */}
            <div className="space-y-2">
              <Label htmlFor="timezone">Zona Horaria</Label>
              <Select
                value={settings.timezone}
                onValueChange={(value) =>
                  setSettings({ ...settings, timezone: value })
                }
              >
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Formato de Fecha */}
            <div className="space-y-2">
              <Label htmlFor="date_format">Formato de Fecha</Label>
              <Select value={DATE_FORMATS[0].value} disabled>
                <SelectTrigger id="date_format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMATS.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                El formato de fecha se configura a nivel del sistema por el
                administrador
              </p>
            </div>

            {/* Formato de Hora */}
            <div className="space-y-2">
              <Label htmlFor="time_format">Formato de Hora</Label>
              <Select value={TIME_FORMATS[1].value} disabled>
                <SelectTrigger id="time_format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_FORMATS.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                El formato de hora se configura a nivel del sistema por el
                administrador
              </p>
            </div>

            {/* Moneda */}
            <div className="space-y-2">
              <Label htmlFor="currency">Moneda</Label>
              <Select value={CURRENCIES[8].value} disabled>
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                La moneda se configura a nivel del sistema por el administrador
              </p>
            </div>

            {/* Idioma */}
            <div className="space-y-2">
              <Label htmlFor="language">Idioma</Label>
              <Select
                value={settings.preferred_language}
                onValueChange={(value) =>
                  setSettings({ ...settings, preferred_language: value })
                }
              >
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-4 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              onClick={() => void handleSave()}
              disabled={updating}
              className="flex-1"
            >
              {updating ? "Guardando..." : "Guardar Cambios"}
            </Button>
            <Button
              onClick={handleCancel}
              variant="outline"
              disabled={updating}
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>
        </div>

        {/* Nota informativa */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex">
            <div className="shrink-0">
              <svg
                className="h-5 w-5 text-blue-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Información importante
              </h3>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <p>
                  Algunas configuraciones como el formato de fecha, hora y
                  moneda se definen a nivel del sistema por el administrador.
                  Puedes cambiar tu zona horaria e idioma preferido desde aquí.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
