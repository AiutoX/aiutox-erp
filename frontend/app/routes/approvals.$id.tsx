import { useParams } from "react-router";
import { PageLayout } from "~/components/layout/PageLayout";
import { Button } from "~/components/ui/button";
import { ApprovalRequestCard } from "~/features/approvals/components/ApprovalRequestCard";
import { useApprovalRequest } from "~/features/approvals/hooks/useApprovals";

export default function ApprovalDetailRoute() {
  const { id } = useParams<{ id: string }>();
  const {
    data: requestResponse,
    isLoading,
    error,
    refetch,
  } = useApprovalRequest(id || "");

  const request = requestResponse?.data;

  const handleApprove = (
    requestId: string,
    action: string,
    decision?: { comment?: string }
  ) => {
    console.error("Approve request:", requestId, action, decision);
  };

  const handleReject = (
    requestId: string,
    action: string,
    decision?: { comment?: string }
  ) => {
    console.error("Reject request:", requestId, action, decision);
  };

  const handleDelegate = (
    requestId: string,
    action: string,
    decision?: { comment?: string }
  ) => {
    console.error("Delegate request:", requestId, action, decision);
  };

  return (
    <PageLayout
      title="Detalles de Solicitud"
      breadcrumb={[
        { label: "Aprobaciones", href: "/approvals" },
        { label: id || "" },
      ]}
      loading={isLoading}
      error={error}
    >
      <div className="space-y-6">
        {/* Header with actions */}
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => window.history.back()}>
            Volver
          </Button>
          <Button onClick={() => void refetch()}>Actualizar</Button>
        </div>

        {/* Request Details */}
        {request && (
          <ApprovalRequestCard
            request={request}
            onAction={(requestId, action, decision) => {
              if (action === "approve") {
                handleApprove(requestId, action, decision);
              } else if (action === "reject") {
                handleReject(requestId, action, decision);
              } else if (action === "delegate") {
                handleDelegate(requestId, action, decision);
              }
            }}
            showActions={true}
          />
        )}

        {!request && !isLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No se encontró la solicitud</p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
