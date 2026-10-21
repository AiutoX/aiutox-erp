/**
 * Leases Route — Ley 820/2003 compliant lease management
 * Single tab: Contracts only (Owners/Tenants managed via /organizations)
 * RBAC: page requires leases.read; write actions require leases.write
 */

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { ProtectedRoute } from "~/components/auth/ProtectedRoute";
import { RequirePermission } from "~/components/auth/RequirePermission";
import { ErrorBoundary } from "~/components/common/ErrorBoundary";
import { PageLayout } from "~/components/layout/PageLayout";
import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { useTranslation } from "~/lib/i18n/useTranslation";
import {
  LeaseDetail,
  LeaseForm,
  LeaseList,
  useCreateLease,
  useUpdateLease,
  useLease,
  type LeaseAgreement,
  type LeaseAgreementCreate,
  type LeaseAgreementUpdate,
} from "~/features/real_estate/leases";

export function meta() {
  return [
    { title: "Leases - AiutoX ERP" },
    {
      name: "description",
      content: "Lease agreement management (Ley 820/2003)",
    },
  ];
}

type LeaseSheetMode = "create" | "edit" | "view" | null;

export default function LeasesPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const leaseIdFromUrl = searchParams.get("lease_id");

  const [leaseMode, setLeaseMode] = useState<LeaseSheetMode>(null);
  const [selectedLease, setSelectedLease] = useState<LeaseAgreement | null>(
    null
  );

  const { data: leaseFromUrl } = useLease(leaseIdFromUrl);

  useEffect(() => {
    if (leaseIdFromUrl && leaseFromUrl) {
      setSelectedLease(leaseFromUrl);
      setLeaseMode("view");
    }
  }, [leaseIdFromUrl, leaseFromUrl]);

  const createLease = useCreateLease();
  const updateLease = useUpdateLease();

  const handleLeaseSubmit = async (
    data: LeaseAgreementCreate | LeaseAgreementUpdate
  ) => {
    if (leaseMode === "create") {
      await createLease.mutateAsync(data as LeaseAgreementCreate);
    } else if (leaseMode === "edit" && selectedLease) {
      await updateLease.mutateAsync({
        id: selectedLease.id,
        data: data,
      });
    }
    setLeaseMode(null);
    setSelectedLease(null);
  };

  const handleLeaseEdit = (lease: LeaseAgreement) => {
    setSelectedLease(lease);
    setLeaseMode("edit");
  };

  const handleLeaseView = (lease: LeaseAgreement) => {
    setSelectedLease(lease);
    setLeaseMode("view");
  };

  const isLeaseSheetOpen = leaseMode !== null;

  const handleSheetOpenChange = (open: boolean) => {
    if (!open) {
      setLeaseMode(null);
      setSelectedLease(null);
      if (leaseIdFromUrl) {
        const next = new URLSearchParams(searchParams);
        next.delete("lease_id");
        setSearchParams(next, { replace: true });
      }
    }
  };

  return (
    <ProtectedRoute>
      <RequirePermission permission="leases.read">
        <PageLayout
          title={t("leases.title")}
          description={t("leases.subtitle")}
        >
          <ErrorBoundary>
            <LeaseList
              onView={handleLeaseView}
              onEdit={handleLeaseEdit}
              onCreate={undefined}
            />
          </ErrorBoundary>

          <RequirePermission permission="leases.write">
            <div className="mt-4 flex justify-end">
              <Button onClick={() => setLeaseMode("create")}>
                + {t("leases.leases.create")}
              </Button>
            </div>
          </RequirePermission>

          {/* ─── Lease Sheet (create / edit / view) ──────────────────────────── */}
          <Sheet
            open={isLeaseSheetOpen}
            onOpenChange={handleSheetOpenChange}
          >
            <SheetContent side="right" className="w-150 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>
                  {leaseMode === "create"
                    ? t("leases.leases.create")
                    : leaseMode === "edit"
                      ? t("leases.actions.edit")
                      : t("leases.actions.viewDetails")}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                {(leaseMode === "create" || leaseMode === "edit") && (
                  <LeaseForm
                    lease={selectedLease ?? undefined}
                    onSubmit={handleLeaseSubmit}
                    onCancel={() => {
                      setLeaseMode(null);
                      setSelectedLease(null);
                    }}
                    loading={createLease.isPending || updateLease.isPending}
                  />
                )}
                {leaseMode === "view" && selectedLease && (
                  <LeaseDetail
                    leaseId={selectedLease.id}
                    onClose={() => {
                      setLeaseMode(null);
                      setSelectedLease(null);
                    }}
                  />
                )}
              </div>
            </SheetContent>
          </Sheet>
        </PageLayout>
      </RequirePermission>
    </ProtectedRoute>
  );
}
