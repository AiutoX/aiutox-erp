import { useState } from "react";
import { ProtectedRoute } from "~/components/auth/ProtectedRoute";
import { RequirePermission } from "~/components/auth/RequirePermission";
import { ErrorBoundary } from "~/components/common/ErrorBoundary";
import { PageLayout } from "~/components/layout/PageLayout";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useTranslation } from "~/lib/i18n/useTranslation";
import {
  PeriodList,
  DocumentList,
  CashFlowChart,
  ProfitLossTable,
  usePeriods,
  useDocuments,
} from "~/features/finances";

export function meta() {
  return [
    { title: "Finances - AiutoX ERP" },
    { name: "description", content: "Financial management and periods" },
  ];
}

// ─── Period status badge variant mapping ─────────────────────────────────────

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const PERIOD_STATUS_VARIANT: Record<string, BadgeVariant> = {
  open: "default",
  closed: "secondary",
  archived: "outline",
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();
const CURRENT_MONTH = NOW.getMonth() + 1;
const PREV_MONTH = CURRENT_MONTH === 1 ? 12 : CURRENT_MONTH - 1;
const PREV_MONTH_YEAR = CURRENT_MONTH === 1 ? CURRENT_YEAR - 1 : CURRENT_YEAR;

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FinancesPage() {
  const { t } = useTranslation();
  const [docTypeFilter, setDocTypeFilter] = useState<string>("");

  const { data: periodsData, isLoading: periodsLoading } = usePeriods({
    limit: 50,
  });
  const periods = periodsData?.data?.data ?? [];

  const { data: docsData, isLoading: docsLoading } = useDocuments({
    doc_type: docTypeFilter || undefined,
    limit: 100,
  });
  const documents = docsData?.data?.data ?? [];

  const DOC_TYPES = ["invoice", "receipt", "ledger_entry"];

  return (
    <ProtectedRoute>
      <RequirePermission permission="finances.read">
        <PageLayout
          title={t("finances.title")}
          description={t("finances.description")}
        >
          <Tabs defaultValue="overview">
            <TabsList className="mb-6">
              <TabsTrigger value="overview">
                {t("finances.periods")}
              </TabsTrigger>
              <TabsTrigger value="cash_flow">{t("cashFlow.title")}</TabsTrigger>
              <TabsTrigger value="pnl">{t("profitLoss.title")}</TabsTrigger>
              <TabsTrigger value="documents">
                {t("finances.documents")}
              </TabsTrigger>
            </TabsList>

            {/* ─── Tab: Periods ──────────────────────────────────────────────── */}
            <TabsContent value="overview">
              <ErrorBoundary>
                {periodsLoading ? (
                  <Skeleton className="h-48 w-full rounded-lg" />
                ) : (
                  <div className="rounded-md border overflow-hidden">
                    <PeriodList periods={periods} isLoading={periodsLoading} />
                  </div>
                )}
              </ErrorBoundary>

              {/* Period status legend */}
              {periods.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {Object.entries(PERIOD_STATUS_VARIANT).map(
                    ([status, variant]) => (
                      <Badge
                        key={status}
                        variant={variant}
                        className="capitalize"
                      >
                        {t(`periods.${status}`)}
                      </Badge>
                    )
                  )}
                </div>
              )}
            </TabsContent>

            {/* ─── Tab: Cash Flow ────────────────────────────────────────────── */}
            <TabsContent value="cash_flow">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      {t("cashFlow.title")} — {PREV_MONTH_YEAR}/
                      {String(PREV_MONTH).padStart(2, "0")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ErrorBoundary>
                      <CashFlowChart
                        fromYear={PREV_MONTH_YEAR}
                        fromMonth={PREV_MONTH}
                        toYear={PREV_MONTH_YEAR}
                        toMonth={PREV_MONTH}
                      />
                    </ErrorBoundary>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      {t("cashFlow.title")} — {CURRENT_YEAR}/
                      {String(CURRENT_MONTH).padStart(2, "0")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ErrorBoundary>
                      <CashFlowChart
                        fromYear={CURRENT_YEAR}
                        fromMonth={CURRENT_MONTH}
                        toYear={CURRENT_YEAR}
                        toMonth={CURRENT_MONTH}
                      />
                    </ErrorBoundary>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ─── Tab: P&L ─────────────────────────────────────────────────── */}
            <TabsContent value="pnl">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card>
                  <CardContent className="pt-4">
                    <ErrorBoundary>
                      <ProfitLossTable
                        year={PREV_MONTH_YEAR}
                        month={PREV_MONTH}
                      />
                    </ErrorBoundary>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <ErrorBoundary>
                      <ProfitLossTable
                        year={CURRENT_YEAR}
                        month={CURRENT_MONTH}
                      />
                    </ErrorBoundary>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ─── Tab: Documents ────────────────────────────────────────────── */}
            <TabsContent value="documents">
              <div className="flex gap-2 flex-wrap mb-4">
                {["", ...DOC_TYPES].map((dt) => (
                  <button
                    key={dt}
                    onClick={() => setDocTypeFilter(dt)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      docTypeFilter === dt
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-muted"
                    }`}
                  >
                    {dt ? t(`document.${dt}`) : t("documents.title")}
                  </button>
                ))}
              </div>

              <ErrorBoundary>
                {docsLoading ? (
                  <Skeleton className="h-48 w-full rounded-lg" />
                ) : (
                  <div className="rounded-md border overflow-hidden">
                    <DocumentList
                      documents={documents}
                      isLoading={docsLoading}
                    />
                  </div>
                )}
              </ErrorBoundary>
            </TabsContent>
          </Tabs>
        </PageLayout>
      </RequirePermission>
    </ProtectedRoute>
  );
}
