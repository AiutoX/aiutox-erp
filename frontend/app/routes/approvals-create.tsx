/**
 * Create Approval Flow Page
 * Página para crear un nuevo flujo de aprobación
 */

import { useNavigate } from "react-router";
// import { useTranslation } from "~/lib/i18n/useTranslation"; // Unused for now
import { PageLayout } from "~/components/layout/PageLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { useCreateApprovalFlow } from "~/features/approvals/hooks/useApprovals";
import type { ApprovalFlowCreate } from "~/features/approvals/types/approval.types";

import { ApprovalFlowForm } from "~/features/approvals/components/ApprovalFlowForm";

export default function ApprovalsCreatePage() {
  // const { t } = useTranslation(); // Unused for now
  const navigate = useNavigate();
  const createApprovalFlow = useCreateApprovalFlow();

  const handleSubmit = async (data: ApprovalFlowCreate) => {
    try {
      await createApprovalFlow.mutateAsync(data);
      void navigate("/approvals");
    } catch (error) {
      console.error("Error creating approval:", error);
    }
  };

  const handleCancel = () => {
    void navigate("/approvals");
  };

  return (
    <PageLayout title="Nuevo Flujo de Aprobación">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Crear Flujo de Aprobación</CardTitle>
            <CardDescription>
              Configura un nuevo flujo de aprobación para automatizar procesos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ApprovalFlowForm
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isLoading={createApprovalFlow.isPending}
            />
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
