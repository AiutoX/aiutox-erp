import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Download } from "lucide-react";

interface TaskAuditTrailProps {
  taskId: string;
}

interface AuditLog {
  id: string;
  action: string;
  user_name: string;
  old_values: Record<string, unknown>;
  new_values: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

export function TaskAuditTrail({ taskId }: TaskAuditTrailProps) {
  // TODO: Implementar hook useTaskAudit cuando el endpoint esté disponible
  const auditLogs: AuditLog[] = [];
  const isLoading = false;

  const handleExport = () => {
    // TODO: Implementar export cuando el endpoint esté disponible
    console.log("Export audit trail for task:", taskId);
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      created: "Creada",
      updated: "Actualizada",
      status_changed: "Estado Cambiado",
      assigned: "Asignada",
      completed: "Completada",
      deleted: "Eliminada",
    };
    return labels[action] || action;
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      created: "bg-green-100 text-green-800",
      updated: "bg-blue-100 text-blue-800",
      status_changed: "bg-purple-100 text-purple-800",
      assigned: "bg-yellow-100 text-yellow-800",
      completed: "bg-emerald-100 text-emerald-800",
      deleted: "bg-red-100 text-red-800",
    };
    return colors[action] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">Cargando historial...</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Historial de Cambios</h4>
        <Button size="sm" variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-1" />
          Exportar
        </Button>
      </div>

      <div className="space-y-2">
        {auditLogs.map((log) => (
          <Card key={log.id} className="p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={getActionColor(log.action)}>
                    {getActionLabel(log.action)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {log.user_name}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", {
                    locale: es,
                  })}
                  {log.ip_address && ` • IP: ${log.ip_address}`}
                </p>
                {Object.keys(log.new_values).length > 0 && (
                  <div className="mt-2 text-xs">
                    <p className="font-medium">Cambios:</p>
                    <div className="mt-1 space-y-1">
                      {Object.entries(log.new_values).map(([key, value]) => (
                        <div key={key} className="flex gap-2">
                          <span className="text-muted-foreground">{key}:</span>
                          <span className="line-through text-muted-foreground">
                            {JSON.stringify(log.old_values[key])}
                          </span>
                          <span>→</span>
                          <span className="font-medium">
                            {JSON.stringify(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}

        {auditLogs.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No hay historial de cambios disponible
          </p>
        )}
      </div>
    </div>
  );
}
