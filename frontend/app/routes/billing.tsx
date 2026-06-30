import { useState } from "react";
import { ProtectedRoute } from "~/components/auth/ProtectedRoute";
import { RequirePermission } from "~/components/auth/RequirePermission";
import { ErrorBoundary } from "~/components/common/ErrorBoundary";
import { PageLayout } from "~/components/layout/PageLayout";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Skeleton } from "~/components/ui/skeleton";
import { useTranslation } from "~/lib/i18n/useTranslation";
import {
  ChargeList,
  ChargeForm,
  useCharges,
  useCreateCharge,
  usePayments,
  type Charge,
  type ChargeCreate,
} from "~/features/billing";

export function meta() {
  return [
    { title: "Billing - AiutoX ERP" },
    { name: "description", content: "Charge and payment management" },
  ];
}

// ─── Status badge variant mapping ────────────────────────────────────────────

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const CHARGE_STATUS_VARIANT: Record<string, BadgeVariant> = {
  pending: "secondary",
  partial: "outline",
  paid: "default",
  overdue: "destructive",
  cancelled: "secondary",
};

// ─── Payments panel ───────────────────────────────────────────────────────────

function PaymentsPanel({ chargeId }: { chargeId: string }) {
  const { t } = useTranslation();
  const { data, isLoading } = usePayments({ charge_id: chargeId });
  const payments = data?.data?.data ?? [];

  if (isLoading) {
    return <Skeleton className="h-20 w-full" />;
  }

  if (payments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        {t("payments.empty")}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-md border mt-2">
      {payments.map((p) => (
        <li key={p.id} className="px-4 py-2 flex justify-between text-sm">
          <span className="text-muted-foreground capitalize">{p.method}</span>
          <span className="font-medium">
            {p.currency} {Number(p.amount).toLocaleString("es-CO")}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const { t } = useTranslation();

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedCharge, setSelectedCharge] = useState<Charge | null>(null);

  const { data, isLoading, isError } = useCharges({
    status: statusFilter || undefined,
    limit: 100,
  });
  const charges = data?.data?.data ?? [];

  const createCharge = useCreateCharge();

  const handleCreate = async (formData: ChargeCreate) => {
    await createCharge.mutateAsync(formData);
    setCreateOpen(false);
  };

  const STATUS_OPTIONS = ["pending", "partial", "paid", "overdue", "cancelled"];

  return (
    <ProtectedRoute>
      <RequirePermission permission="billing.read">
        <PageLayout
          title={t("billing.title")}
          description={t("billing.description")}
        >
          {/* ─── Toolbar ──────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex gap-2 flex-wrap">
              {["", ...STATUS_OPTIONS].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                    statusFilter === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  {s ? t(`charges.${s}`) : t("charges.title")}
                </button>
              ))}
            </div>

            <RequirePermission permission="billing.write">
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                + {t("charges.create")}
              </Button>
            </RequirePermission>
          </div>

          {/* ─── Charge list ──────────────────────────────────────────────── */}
          <ErrorBoundary>
            {isLoading && <Skeleton className="h-48 w-full rounded-lg" />}
            {isError && (
              <p className="text-destructive text-sm py-8 text-center">
                {t("billing.error")}
              </p>
            )}
            {!isLoading && !isError && (
              <div className="rounded-md border overflow-hidden">
                <ChargeList
                  charges={charges}
                  onSelect={(charge) => setSelectedCharge(charge)}
                />
              </div>
            )}
          </ErrorBoundary>

          {/* ─── Create charge dialog ─────────────────────────────────────── */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t("charges.create")}</DialogTitle>
              </DialogHeader>
              <ChargeForm
                onSubmit={handleCreate}
                isSubmitting={createCharge.isPending}
              />
            </DialogContent>
          </Dialog>

          {/* ─── Charge detail dialog ─────────────────────────────────────── */}
          <Dialog
            open={!!selectedCharge}
            onOpenChange={(open) => {
              if (!open) setSelectedCharge(null);
            }}
          >
            {selectedCharge && (
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {t("charges.status")}:
                    <Badge
                      variant={
                        CHARGE_STATUS_VARIANT[selectedCharge.status] ??
                        "outline"
                      }
                    >
                      {t(`charges.${selectedCharge.status}`)}
                    </Badge>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-muted-foreground">
                      {t("charge.description")}
                    </span>
                    <span>{selectedCharge.description ?? "—"}</span>
                    <span className="text-muted-foreground">
                      {t("charge.amount")}
                    </span>
                    <span className="font-semibold">
                      {selectedCharge.currency}{" "}
                      {Number(selectedCharge.amount).toLocaleString("es-CO")}
                    </span>
                    {selectedCharge.due_date && (
                      <>
                        <span className="text-muted-foreground">
                          {t("charge.due_date")}
                        </span>
                        <span>
                          {new Date(selectedCharge.due_date).toLocaleDateString(
                            "es-CO"
                          )}
                        </span>
                      </>
                    )}
                  </div>
                  <div>
                    <p className="font-medium mb-1">{t("payments.history")}</p>
                    <ErrorBoundary>
                      <PaymentsPanel chargeId={selectedCharge.id} />
                    </ErrorBoundary>
                  </div>
                </div>
              </DialogContent>
            )}
          </Dialog>
        </PageLayout>
      </RequirePermission>
    </ProtectedRoute>
  );
}
