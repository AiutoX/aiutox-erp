/**
 * Approvals page
 * Main page for approvals management
 */

import { useState } from "react";
import { PageLayout } from "~/components/layout/PageLayout";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ApprovalRequestList } from "~/features/approvals/components/ApprovalRequestList";
import { ApprovalFlowList } from "~/features/approvals/components/ApprovalFlowList";
import { ApprovalStats } from "~/features/approvals/components/ApprovalStats";
import { useApprovalRequests } from "~/features/approvals/hooks/useApprovals";
import type { ApprovalRequestResponse } from "~/features/approvals/types/approval.types";

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState("approvals");

  // Query hooks
  const {
    data: requestsData,
    isLoading,
    error,
    refetch,
  } = useApprovalRequests({
    page: 1,
    page_size: 100,
  });

  const handleApproveRequest = (request: ApprovalRequestResponse) => {
    console.error("Approve request:", request.id);
  };

  const handleRejectRequest = (request: ApprovalRequestResponse) => {
    console.error("Reject request:", request.id);
  };

  const handleDelegateRequest = (request: ApprovalRequestResponse) => {
    console.error("Delegate request:", request.id);
  };

  const requests = requestsData?.data || [];
  const total = requestsData?.meta?.total || 0;

  return (
    <PageLayout
      title="Aprobaciones"
      description="Gestiona las aprobaciones pendientes"
      loading={isLoading}
      error={error}
    >
      <div className="space-y-6">
        {/* Header with stats */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Badge variant="secondary">{total} Aprobaciones</Badge>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="approvals">Aprobaciones</TabsTrigger>
            <TabsTrigger value="flows">Flujos</TabsTrigger>
            <TabsTrigger value="stats">Estadísticas</TabsTrigger>
          </TabsList>

          <TabsContent value="approvals" className="mt-6">
            <ApprovalRequestList
              requests={requests}
              loading={isLoading}
              onRefresh={() => void refetch()}
              onRequestApprove={handleApproveRequest}
              onRequestReject={handleRejectRequest}
              onRequestDelegate={handleDelegateRequest}
            />
          </TabsContent>

          <TabsContent value="flows" className="mt-6">
            <ApprovalFlowList showPageLayout={false} />
          </TabsContent>

          <TabsContent value="stats" className="mt-6">
            <ApprovalStats requests={requests} />
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}
