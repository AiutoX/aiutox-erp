/**
 * Approval Stats Component
 * Displays statistics and reports for approval requests
 */

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import type { ApprovalRequestResponse } from "../types/approval.types";

interface ApprovalStatsProps {
  requests: ApprovalRequestResponse[];
}

export function ApprovalStats({ requests }: ApprovalStatsProps) {
  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
    delegated: requests.filter((r) => r.status === "delegated").length,
  };

  const avgApprovalTime = (() => {
    const approvedRequests = requests.filter(
      (r) => r.status === "approved" && r.completed_at
    );
    if (approvedRequests.length === 0) return null;

    const totalTime = approvedRequests.reduce((acc, r) => {
      const created = new Date(r.created_at).getTime();
      const completed = new Date(r.completed_at!).getTime();
      return acc + (completed - created);
    }, 0);

    return Math.round(totalTime / approvedRequests.length / (1000 * 60 * 60)); // en horas
  })();

  const getCompletionRate = () => {
    if (stats.total === 0) return 0;
    return Math.round(((stats.approved + stats.rejected) / stats.total) * 100);
  };

  const getApprovalRate = () => {
    const completed = stats.approved + stats.rejected;
    if (completed === 0) return 0;
    return Math.round((stats.approved / completed) * 100);
  };

  const getRequestsByFlow = () => {
    const flowCounts: Record<string, number> = {};
    requests.forEach((r) => {
      const flowId = r.flow_id || "unknown";
      flowCounts[flowId] = (flowCounts[flowId] || 0) + 1;
    });
    return flowCounts;
  };

  const requestsByFlow = getRequestsByFlow();

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="text-xs text-gray-500 mt-1">Solicitudes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {stats.pending}
            </div>
            <p className="text-xs text-gray-500 mt-1">En espera</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Aprobadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats.approved}
            </div>
            <p className="text-xs text-gray-500 mt-1">Aceptadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Rechazadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {stats.rejected}
            </div>
            <p className="text-xs text-gray-500 mt-1">Denegadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Delegadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {stats.delegated}
            </div>
            <p className="text-xs text-gray-500 mt-1">Transferidas</p>
          </CardContent>
        </Card>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Tasa de Completación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-600">
              {getCompletionRate()}%
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {stats.approved + stats.rejected} de {stats.total} solicitudes
              completadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tasa de Aprobación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-600">
              {getApprovalRate()}%
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {stats.approved} aprobadas de {stats.approved + stats.rejected}{" "}
              completadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tiempo Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-purple-600">
              {avgApprovalTime !== null ? `${avgApprovalTime}h` : "N/A"}
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Tiempo promedio de aprobación
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Requests by Flow */}
      <Card>
        <CardHeader>
          <CardTitle>Solicitudes por Flujo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(requestsByFlow).map(([flowId, count]) => (
              <div key={flowId} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{flowId}</Badge>
                  <span className="text-sm text-gray-600">
                    {count} solicitud{count !== 1 ? "es" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{
                        width: `${(count / stats.total) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium">
                    {Math.round((count / stats.total) * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
