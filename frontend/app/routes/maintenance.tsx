/**
 * Maintenance Page
 * Public page shown during system maintenance
 */

import { PublicLayout } from "~/components/public/PublicLayout";
import { Wrench, Clock } from "lucide-react";

export function meta() {
  return [
    { title: "Mantenimiento - AiutoX ERP" },
    {
      name: "description",
      content: "El sistema está en mantenimiento",
    },
  ];
}

export default function MaintenancePage() {
  // Optional: Get maintenance message from env var
  const maintenanceMessage =
    import.meta.env.VITE_MAINTENANCE_MESSAGE ||
    "Estamos realizando mejoras en el sistema para brindarte una mejor experiencia.";

  const estimatedTime =
    import.meta.env.VITE_MAINTENANCE_TIME || "Pronto estaremos de vuelta.";

  return (
    <PublicLayout>
      <div className="space-y-6 text-center">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <Wrench className="h-20 w-20 text-[#023E87]" />
            <Clock className="h-8 w-8 text-[#00B6BC] absolute -bottom-2 -right-2" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-[#121212]">
            Mantenimiento en Curso
          </h1>
          <p className="text-[#3C3A47]">{maintenanceMessage}</p>
        </div>

        {/* Estimated Time */}
        {estimatedTime && (
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-[#3C3A47] flex items-center justify-center gap-2">
              <Clock className="h-4 w-4" />
              {estimatedTime}
            </p>
          </div>
        )}

        {/* Info */}
        <div className="pt-4">
          <p className="text-xs text-[#3C3A47]">
            Si tienes alguna pregunta urgente, por favor contacta al
            administrador del sistema.
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
