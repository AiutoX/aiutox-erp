/**
 * ApprovalRequestList component
 * Displays a list of approval requests with filters and actions
 */

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { DataTable } from "~/components/common/DataTable";
import { SearchBar } from "~/components/common/SearchBar";
import type {
  ApprovalRequestResponse,
  ApprovalStatus,
} from "~/features/approvals/types/approval.types";

interface ApprovalRequestListProps {
  requests: ApprovalRequestResponse[];
  loading?: boolean;
  onRefresh?: () => void;
  onRequestSelect?: (request: ApprovalRequestResponse) => void;
  onRequestApprove?: (request: ApprovalRequestResponse) => void;
  onRequestReject?: (request: ApprovalRequestResponse) => void;
  onRequestDelegate?: (request: ApprovalRequestResponse) => void;
  onRequestCreate?: () => void;
}

const statusColors: Record<ApprovalStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  delegated: "bg-purple-100 text-purple-800 border-purple-200",
  cancelled: "bg-gray-100 text-gray-800 border-gray-200",
};

export function ApprovalRequestList({
  requests,
  loading,
  onRefresh,
  onRequestSelect,
  onRequestApprove,
  onRequestReject,
  onRequestDelegate,
  onRequestCreate,
}: ApprovalRequestListProps) {
  const dateLocale = es;

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "PPP", { locale: dateLocale });
  };

  const getStatusBadge = (status: ApprovalStatus) => {
    return (
      <Badge variant="outline" className={statusColors[status]}>
        {status}
      </Badge>
    );
  };

  const columns = [
    {
      key: "title",
      header: "Título",
      cell: (request: ApprovalRequestResponse) => (
        <div className="font-medium">{request.title}</div>
      ),
    },
    {
      key: "entity",
      header: "Entidad",
      cell: (request: ApprovalRequestResponse) => (
        <span className="text-sm">
          {request.entity_type}:{request.entity_id}
        </span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      cell: (request: ApprovalRequestResponse) =>
        getStatusBadge(request.status),
    },
    {
      key: "requested_by",
      header: "Solicitado por",
      cell: (request: ApprovalRequestResponse) => (
        <span className="text-sm">{request.requested_by || "N/A"}</span>
      ),
    },
    {
      key: "current_step",
      header: "Paso actual",
      cell: (request: ApprovalRequestResponse) => (
        <span className="text-sm">{request.current_step}</span>
      ),
    },
    {
      key: "created_at",
      header: "Creado",
      cell: (request: ApprovalRequestResponse) => (
        <span className="text-sm">{formatDate(request.created_at)}</span>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      cell: (request: ApprovalRequestResponse) => {
        const canApprove = request.status === "pending";

        return (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRequestSelect?.(request)}
            >
              Ver
            </Button>
            {canApprove && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRequestApprove?.(request)}
                  className="text-green-600 hover:text-green-700"
                >
                  Aprobar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRequestReject?.(request)}
                  className="text-red-600 hover:text-red-700"
                >
                  Rechazar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRequestDelegate?.(request)}
                  className="text-orange-600 hover:text-orange-700"
                >
                  Delegar
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary" />
            <span>Cargando...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!requests.length) {
    return (
      <Card data-testid="approval-empty-list">
        <CardContent className="p-8 text-center">
          <div className="text-muted-foreground">
            No hay solicitudes de aprobación
          </div>
          <Button onClick={onRequestCreate}>Crear solicitud</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="approval-request-list">
      {/* Header with actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Solicitudes de Aprobación</h2>
        <div className="flex space-x-2">
          <Button
            onClick={onRefresh}
            disabled={loading}
            data-testid="approval-refresh-button"
          >
            Actualizar
          </Button>
          <Button
            onClick={onRequestCreate}
            data-testid="approval-create-button"
          >
            Crear solicitud
          </Button>
        </div>
      </div>

      {/* Search bar */}
      <SearchBar
        placeholder="Buscar solicitudes..."
        onChange={() => {
          // Handle search
        }}
      />

      {/* Requests table */}
      <DataTable
        columns={columns}
        data={requests}
        pagination={{
          page: 1,
          pageSize: 20,
          total: requests.length,
          onPageChange: () => {
            // Handle pagination
          },
        }}
      />
    </div>
  );
}
