/**
 * CMMS Route — Work Order & Asset management (Maintenance module)
 * Five tabs: Work Orders | Assets | Inspections | KPIs
 * RBAC: page requires maintenance.read; write actions require maintenance.write;
 *       delete actions require maintenance.delete
 */

import { useEffect, useState } from "react";
import { ProtectedRoute } from "~/components/auth/ProtectedRoute";
import { RequirePermission } from "~/components/auth/RequirePermission";
import { ErrorBoundary } from "~/components/common/ErrorBoundary";
import { PageLayout } from "~/components/layout/PageLayout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { usePermissions } from "~/hooks/usePermissions";
import { useAuthStore } from "~/stores/authStore";
import {
  AssetCard,
  AssetForm,
  AssignmentDialog,
  InspectionForm,
  MaintenanceDashboard,
  OwnerSelfServiceModal,
  WorkOrderForm,
  WorkOrderList,
  WorkOrderWizard,
  useAssets,
  useAssignableOrganizations,
  useAssignWorkOrder,
  useCompleteWorkOrder,
  useCreateAsset,
  useCreateWorkOrder,
  useDeleteAsset,
  useDeleteWorkOrder,
  useMaintenanceKpis,
  useMaintenanceUsers,
  useReassignWorkOrder,
  useCancelWorkOrder,
  useRejectWorkOrder,
  useRequestInspection,
  useStartWorkOrder,
  useDeleteWorkOrderPhoto,
  useUpdateAsset,
  useUpdateWorkOrder,
  useWorkOrder,
  useWorkOrderAfterPhotoUpload,
  useWorkOrderBeforePhotoUpload,
  useWorkOrders,
  useWorkOrderVerificationPhotoUpload,
  useWorkOrderWorkPhotoUpload,
  type Asset,
  type AssetCreate,
  type AssetUpdate,
  type WizardUserRole,
  type WorkOrder,
  type WorkOrderCreate,
} from "~/features/real_estate/maintenance";

export function meta() {
  return [
    { title: "CMMS - AiutoX ERP" },
    { name: "description", content: "Work order and asset management" },
  ];
}

// ─── Quick-filter chip bar ────────────────────────────────────────────────────

const WO_FILTERS: Array<{ value: string; activeClass: string; inactiveClass: string }> = [
  {
    value: "",
    activeClass: "bg-primary text-primary-foreground border-primary",
    inactiveClass: "hover:bg-muted",
  },
  {
    value: "borrador",
    activeClass: "bg-slate-500 text-white border-slate-500",
    inactiveClass: "border-slate-400/50 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/30",
  },
  {
    value: "asignada",
    activeClass: "bg-blue-500 text-white border-blue-500",
    inactiveClass: "border-blue-400/50 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30",
  },
  {
    value: "en_progreso",
    activeClass: "bg-indigo-500 text-white border-indigo-500",
    inactiveClass: "border-indigo-400/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30",
  },
  {
    value: "en_revision",
    activeClass: "bg-yellow-500 text-white border-yellow-500",
    inactiveClass: "border-yellow-400/50 text-yellow-600 dark:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-950/30",
  },
  {
    value: "completada",
    activeClass: "bg-green-600 text-white border-green-600",
    inactiveClass: "border-green-500/50 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30",
  },
  {
    value: "cancelada",
    activeClass: "bg-red-600 text-white border-red-600",
    inactiveClass: "border-red-500/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30",
  },
];

// ─── State types ──────────────────────────────────────────────────────────────

type AssetDialogMode = "create" | "edit" | null;
type WoSheetMode = "create" | "edit" | "view" | null;

type DeleteTarget =
  | { kind: "asset"; item: Asset }
  | { kind: "workOrder"; item: WorkOrder }
  | null;

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null;
  unit?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">
          {value != null ? value.toFixed(1) : "—"}
          {unit && (
            <span className="text-sm font-normal text-muted-foreground ml-1">
              {unit}
            </span>
          )}
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CmmsPage() {
  const { t } = useTranslation();
  const { hasRole, hasPermission } = usePermissions();
  const currentUser = useAuthStore((state) => state.user);
  const wizardUserRole: WizardUserRole = {
    currentUserId: currentUser?.id,
    isAdmin:
      hasRole("admin") ||
      hasRole("owner") ||
      hasPermission("*") ||
      hasPermission("maintenance.admin"),
  };

  // ── Tab state ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("dashboard");

  // ── Work Order state ──────────────────────────────────────────────────────
  const [woFilter, setWoFilter] = useState<string>("");
  const [woOwnerOnly, setWoOwnerOnly] = useState(false);
  const [woPage, setWoPage] = useState(1);
  const [woOrdering, setWoOrdering] = useState("created_at_desc");
  const WO_PAGE_SIZE = 20;
  const [woMode, setWoMode] = useState<WoSheetMode>(null);
  const [selectedWo, setSelectedWo] = useState<WorkOrder | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── Asset state ───────────────────────────────────────────────────────────
  const [assetMode, setAssetMode] = useState<AssetDialogMode>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // ── Inspection state ──────────────────────────────────────────────────────
  const [createInspectionOpen, setCreateInspectionOpen] = useState(false);

  // ── Delete state ──────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

  // ── Assignment dialog state ───────────────────────────────────────────────
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  // Skip-prevention justification dialog (inspector == executor on complete)
  const [skipPreventionOpen, setSkipPreventionOpen] = useState(false);
  const [skipPreventionNotes, setSkipPreventionNotes] = useState("");

  // ── Owner self-service shortcut state ─────────────────────────────────────
  const [ownerSelfServiceWo, setOwnerSelfServiceWo] = useState<WorkOrder | null>(
    null
  );

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: woData, isLoading: woLoading } = useWorkOrders({
    estado: woFilter || null,
    page: woPage,
    page_size: WO_PAGE_SIZE,
    ordering: woOrdering,
    exclude_cancelada: !woFilter,
  });
  const allWorkOrders = woData?.data?.items ?? [];
  const woTotal = woData?.data?.total ?? 0;
  const woTotalPages = Math.max(1, Math.ceil(woTotal / WO_PAGE_SIZE));
  const workOrders = woOwnerOnly
    ? allWorkOrders.filter((wo) => wo.self_performed_by_owner)
    : allWorkOrders;

  const { data: assetsData, isLoading: assetsLoading } = useAssets({
    page_size: 100,
  });
  const assets = assetsData?.data?.items ?? [];

  const { data: assignableOrgsData } = useAssignableOrganizations({ page_size: 100 });
  const assignableOrganizations = assignableOrgsData?.data?.items ?? [];



  const { data: kpisData, isLoading: kpisLoading } = useMaintenanceKpis();
  const kpis = kpisData?.data;

  // Users for assignment (uses maintenance endpoint, no auth.manage_users required)
  const { data: maintenanceUsersData } = useMaintenanceUsers();
  const maintenanceUsers = maintenanceUsersData?.data ?? [];

  // Live work order data when viewing detail (avoids stale state after photo upload)
  const { data: liveWoData } = useWorkOrder(
    selectedWo?.id ?? "",
    woMode === "view"
  );
  const liveWorkOrder = liveWoData?.data ?? selectedWo;

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createWo = useCreateWorkOrder();
  const updateWo = useUpdateWorkOrder(selectedWo?.id ?? "");
  const deleteWo = useDeleteWorkOrder();
  const assignWo = useAssignWorkOrder(selectedWo?.id ?? "");
  const startWo = useStartWorkOrder(selectedWo?.id ?? "");
  const requestInspectionWo = useRequestInspection(selectedWo?.id ?? "");
  const completeWo = useCompleteWorkOrder(selectedWo?.id ?? "");
  const reassignWo = useReassignWorkOrder(selectedWo?.id ?? "");
  const rejectWo = useRejectWorkOrder(selectedWo?.id ?? "");
  const cancelWo = useCancelWorkOrder(selectedWo?.id ?? "");
  const beforePhotoUpload = useWorkOrderBeforePhotoUpload(selectedWo?.id ?? "");
  const workPhotoUpload = useWorkOrderWorkPhotoUpload(selectedWo?.id ?? "");
  const verificationPhotoUpload = useWorkOrderVerificationPhotoUpload(
    selectedWo?.id ?? ""
  );
  const afterPhotoUpload = useWorkOrderAfterPhotoUpload(selectedWo?.id ?? "");
  const deleteWoPhoto = useDeleteWorkOrderPhoto(selectedWo?.id ?? "");

  const isUploadingWoPhoto =
    beforePhotoUpload.isPending ||
    workPhotoUpload.isPending ||
    verificationPhotoUpload.isPending ||
    afterPhotoUpload.isPending;

  const isTransitioning =
    assignWo.isPending ||
    startWo.isPending ||
    requestInspectionWo.isPending ||
    completeWo.isPending ||
    reassignWo.isPending ||
    rejectWo.isPending ||
    cancelWo.isPending;

  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset(selectedAsset?.id ?? "");
  const deleteAsset = useDeleteAsset();

  const isDeleting = deleteAsset.isPending || deleteWo.isPending;

  // ── Work Order handlers ───────────────────────────────────────────────────

  const handleCreateWo = async (data: WorkOrderCreate) => {
    const result = await createWo.mutateAsync(data);
    const created = (result as { data?: WorkOrder })?.data ?? null;
    if (created) {
      setSelectedWo(created);
      setWoMode("view");
    } else {
      setWoMode(null);
    }
  };

  const handleEditWo = async (data: WorkOrderCreate) => {
    if (!selectedWo?.id) return;
    await updateWo.mutateAsync(data);
    setWoMode(null);
    setSelectedWo(null);
  };

  const handleAssign = () => {
    setAssignDialogOpen(true);
  };

  const handleStart = async () => {
    if (!selectedWo?.id) return;
    try {
      await startWo.mutateAsync();
    } catch {
      // Error surfaced by mutation hook
    }
  };

  const handleRequestInspection = async () => {
    if (!selectedWo?.id) return;
    try {
      await requestInspectionWo.mutateAsync(undefined);
    } catch {
      // Error surfaced by mutation hook
    }
  };

  const handleComplete = async () => {
    if (!selectedWo?.id) return;
    // If inspector and executor are the same person, ask for justification
    // notes via dialog before completing
    if (
      selectedWo.inspected_by &&
      selectedWo.executed_by &&
      selectedWo.inspected_by === selectedWo.executed_by
    ) {
      setSkipPreventionNotes("");
      setSkipPreventionOpen(true);
      return;
    }
    try {
      await completeWo.mutateAsync(undefined);
    } catch {
      // Error surfaced by mutation hook
    }
  };

  const handleCompleteWithJustification = async () => {
    if (!selectedWo?.id || !skipPreventionNotes.trim()) return;
    try {
      await completeWo.mutateAsync(skipPreventionNotes.trim());
      setSkipPreventionOpen(false);
      setSkipPreventionNotes("");
    } catch {
      // Error surfaced by mutation hook
    }
  };

  const handleCancel = async () => {
    if (!selectedWo?.id) return;
    try {
      await cancelWo.mutateAsync(undefined);
      setSelectedWo(null);
      setWoMode(null);
    } catch {
      // Error surfaced by mutation hook
    }
  };

  const handleReject = async (rejectionNotes: string) => {
    if (!selectedWo?.id) return;
    try {
      await rejectWo.mutateAsync(rejectionNotes);
    } catch {
      // Error surfaced by mutation hook
    }
  };

  const handleInspectionReportChange = (text: string) => {
    if (!selectedWo?.id) return;
    updateWo.mutate({ inspection_report: text });
  };

  const handleExecutionReportChange = (text: string) => {
    if (!selectedWo?.id) return;
    updateWo.mutate({ execution_report: text });
  };

  const handleApprovalNotesChange = (text: string) => {
    if (!selectedWo?.id) return;
    updateWo.mutate({ approval_notes: text });
  };

  const handleMaterialCostChange = (cost: string) => {
    if (!selectedWo?.id) return;
    updateWo.mutate({ material_cost: cost });
  };

  const handleLaborCostChange = (cost: string) => {
    if (!selectedWo?.id) return;
    updateWo.mutate({ labor_cost: cost });
  };

  // ── Asset handlers ────────────────────────────────────────────────────────

  const handleAssetSubmit = async (data: AssetCreate | AssetUpdate) => {
    if (assetMode === "create") {
      await createAsset.mutateAsync(data as AssetCreate);
    } else if (assetMode === "edit" && selectedAsset) {
      await updateAsset.mutateAsync(data);
    }
    setAssetMode(null);
    setSelectedAsset(null);
  };

  const handleAssetEdit = (asset: Asset) => {
    setSelectedAsset(asset);
    setAssetMode("edit");
  };

  const handleAssetDelete = (asset: Asset) => {
    setDeleteTarget({ kind: "asset", item: asset });
  };


  // ── Delete confirm ────────────────────────────────────────────────────────

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === "asset") {
      await deleteAsset.mutateAsync(deleteTarget.item.id);
    } else if (deleteTarget.kind === "workOrder") {
      await deleteWo.mutateAsync(deleteTarget.item.id);
    }
    setDeleteTarget(null);
  };

  const isWoSheetOpen = woMode !== null;
  const isAssetDialogOpen = assetMode !== null;

  return (
    <ProtectedRoute>
      <RequirePermission permission="maintenance.read">
        <PageLayout
          title={t("maintenance.title")}
          description={t("maintenance.subtitle")}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 flex-wrap h-auto gap-1">
              <TabsTrigger value="dashboard">
                {t("maintenance.maintenanceDashboard.title")}
              </TabsTrigger>
              <TabsTrigger value="work-orders">
                {t("maintenance.workOrder.titlePlural")}
              </TabsTrigger>
              <TabsTrigger value="assets">
                {t("maintenance.asset.titlePlural")}
              </TabsTrigger>
              <TabsTrigger value="inspections">
                {t("maintenance.inspection.titlePlural")}
              </TabsTrigger>
              <TabsTrigger value="kpis">
                {t("maintenance.kpis.title")}
              </TabsTrigger>
            </TabsList>

            {/* ─── Tab: Dashboard ────────────────────────────────────────────── */}
            <TabsContent value="dashboard">
              <ErrorBoundary>
                <MaintenanceDashboard
                  onViewWorkOrder={(wo) => {
                    setSelectedWo(wo);
                    setWoMode("view");
                    setActiveTab("work-orders");
                  }}
                  onViewPendingList={() => {
                    setWoFilter("borrador");
                    setWoPage(1);
                    setActiveTab("work-orders");
                  }}
                />
              </ErrorBoundary>
            </TabsContent>

            {/* ─── Tab: Work Orders ─────────────────────────────────────────── */}
            <TabsContent value="work-orders">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex gap-2 flex-wrap">
                  {WO_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => { setWoFilter(f.value); setWoPage(1); }}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors min-h-8 ${
                        woFilter === f.value ? f.activeClass : f.inactiveClass
                      }`}
                    >
                      {f.value
                        ? t(`maintenance.workOrder.status.${f.value}`)
                        : t("maintenance.common.all")}
                    </button>
                  ))}
                  <button
                    onClick={() => setWoOwnerOnly((prev) => !prev)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors min-h-8 ${
                      woOwnerOnly
                        ? "bg-amber-500 text-white border-amber-500"
                        : "border-amber-400/60 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                    }`}
                  >
                    {t("maintenance.workOrder.selfPerformedByOwner.filter")}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={woOrdering}
                    onChange={(e) => { setWoOrdering(e.target.value); setWoPage(1); }}
                    className="text-xs h-8 px-2 rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    aria-label={t("maintenance.common.sortBy")}
                  >
                    {(["created_at_desc", "created_at_asc", "prioridad_desc", "sla_asc", "estado"] as const).map((key) => (
                      <option key={key} value={key}>
                        {t(`maintenance.common.ordering.${key}`)}
                      </option>
                    ))}
                  </select>
                  <RequirePermission permission="maintenance.write">
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedWo(null);
                        setWoMode("create");
                      }}
                    >
                      + {t("maintenance.workOrder.new")}
                    </Button>
                  </RequirePermission>
                </div>
              </div>

              <ErrorBoundary>
                {woLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <WorkOrderList
                    workOrders={workOrders}
                    onSelect={(wo) => {
                      setSelectedWo(wo);
                      setWoMode("view");
                    }}
                    onEdit={(wo) => {
                      setSelectedWo(wo);
                      setWoMode("edit");
                    }}
                    onDelete={(wo) =>
                      setDeleteTarget({ kind: "workOrder", item: wo })
                    }
                    onOwnerSelfService={(wo) => setOwnerSelfServiceWo(wo)}
                  />
                )}
              </ErrorBoundary>

              {/* Pagination */}
              {woTotalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-4 py-2">
                  <button
                    onClick={() => setWoPage((p) => Math.max(1, p - 1))}
                    disabled={woPage <= 1}
                    className="text-xs px-3 py-1.5 rounded border transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted min-h-8"
                  >
                    {t("maintenance.common.prevPage")}
                  </button>
                  <span className="text-xs text-muted-foreground">
                    {t("maintenance.common.page")} {woPage} {t("maintenance.common.of")} {woTotalPages}
                  </span>
                  <button
                    onClick={() => setWoPage((p) => Math.min(woTotalPages, p + 1))}
                    disabled={woPage >= woTotalPages}
                    className="text-xs px-3 py-1.5 rounded border transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted min-h-8"
                  >
                    {t("maintenance.common.nextPage")}
                  </button>
                </div>
              )}
            </TabsContent>

            {/* ─── Tab: Assets ──────────────────────────────────────────────── */}
            <TabsContent value="assets">
              <div className="flex justify-end mb-4">
                <RequirePermission permission="maintenance.write">
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedAsset(null);
                      setAssetMode("create");
                    }}
                  >
                    + {t("maintenance.asset.new")}
                  </Button>
                </RequirePermission>
              </div>
              <ErrorBoundary>
                {assetsLoading ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full rounded-lg" />
                    ))}
                  </div>
                ) : assets.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    {t("maintenance.asset.empty")}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {assets.map((asset: Asset) => (
                      <AssetCard
                        key={asset.id}
                        asset={asset}
                        onEdit={() => handleAssetEdit(asset)}
                        onDelete={() => handleAssetDelete(asset)}
                      />
                    ))}
                  </div>
                )}
              </ErrorBoundary>
            </TabsContent>

            {/* ─── Tab: Inspections ─────────────────────────────────────────── */}
            <TabsContent value="inspections">
              <div className="flex justify-end mb-4">
                <RequirePermission permission="maintenance.write">
                  <Button
                    size="sm"
                    onClick={() => setCreateInspectionOpen(true)}
                  >
                    + {t("maintenance.inspection.new")}
                  </Button>
                </RequirePermission>
              </div>
              <p className="text-sm text-muted-foreground py-8 text-center">
                {t("maintenance.inspection.empty")}
              </p>
            </TabsContent>

            {/* ─── Tab: KPIs ────────────────────────────────────────────────── */}
            <TabsContent value="kpis">
              <ErrorBoundary>
                {kpisLoading ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-24 w-full rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <KpiCard
                        label={t("maintenance.kpis.mttr")}
                        value={kpis?.mttr ?? null}
                        unit={t("maintenance.kpis.mttrUnit")}
                      />
                      <KpiCard
                        label={t("maintenance.kpis.mtbf")}
                        value={null}
                        unit={t("maintenance.kpis.mtbfUnit")}
                      />
                      <KpiCard
                        label={t("maintenance.kpis.pctPm")}
                        value={kpis?.pct_pm ?? null}
                        unit="%"
                      />
                      <KpiCard
                        label={t("maintenance.kpis.ratioPmCm")}
                        value={kpis?.ratio_pm_cm ?? null}
                      />
                    </div>

                    {kpis?.top_assets_failures &&
                      kpis.top_assets_failures.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold mb-3">
                            {t("maintenance.kpis.topFailures")}
                          </h3>
                          <div className="rounded-md border overflow-hidden">
                            {kpis.top_assets_failures.map(
                              (
                                item: { asset_id: string; failures: number },
                                idx: number
                              ) => (
                                <div
                                  key={item.asset_id}
                                  className="flex items-center justify-between px-4 py-2 border-b last:border-0 text-sm"
                                >
                                  <span className="text-muted-foreground">
                                    {idx + 1}.
                                  </span>
                                  <span className="flex-1 ml-2 truncate">
                                    {item.asset_id}
                                  </span>
                                  <Badge variant="destructive">
                                    {item.failures}
                                  </Badge>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </ErrorBoundary>
            </TabsContent>
          </Tabs>

          {/* ─── WO detail (create / edit / view) ───────────────────────────── */}
          {(() => {
            const woTitle =
              woMode === "create"
                ? t("maintenance.workOrder.new")
                : woMode === "edit"
                  ? t("maintenance.workOrder.edit")
                  : t("maintenance.workOrder.detail");

            const woBody = (
              <div className="mt-4 flex-1 min-h-0 flex flex-col">
                {(woMode === "create" || woMode === "edit") && (
                  <div className="overflow-y-auto">
                    {woMode === "create" && (
                      <WorkOrderForm
                        onSubmit={handleCreateWo}
                        onCancel={() => {
                          setWoMode(null);
                        }}
                        loading={createWo.isPending}
                      />
                    )}
                    {woMode === "edit" && selectedWo && (
                      <WorkOrderForm
                        workOrder={selectedWo}
                        onSubmit={handleEditWo}
                        onCancel={() => {
                          setWoMode(null);
                          setSelectedWo(null);
                        }}
                        loading={updateWo.isPending}
                      />
                    )}
                  </div>
                )}
                {woMode === "view" && selectedWo && liveWorkOrder && (
                  <div className="flex-1 min-h-0 flex flex-col gap-4">
                    <div className="flex-1 min-h-0">
                      <WorkOrderWizard
                      workOrder={liveWorkOrder}
                      userRole={wizardUserRole}
                      onUploadBeforePhotos={(files) =>
                        beforePhotoUpload.mutate(files)
                      }
                      onUploadWorkPhotos={(files) =>
                        workPhotoUpload.mutate(files)
                      }
                      onUploadVerificationPhotos={(files) =>
                        verificationPhotoUpload.mutate(files)
                      }
                      onUploadAfterPhotos={(files) =>
                        afterPhotoUpload.mutate(files)
                      }
                      onDeletePhoto={(fieldName, fileId) =>
                        deleteWoPhoto.mutate({ fieldName, fileId })
                      }
                      onInspectionReportChange={handleInspectionReportChange}
                      onExecutionReportChange={handleExecutionReportChange}
                      onApprovalNotesChange={handleApprovalNotesChange}
                      onMaterialCostChange={handleMaterialCostChange}
                      onLaborCostChange={handleLaborCostChange}
                      onAssign={handleAssign}
                      onReassign={handleAssign}
                      onStart={handleStart}
                      onRequestInspection={handleRequestInspection}
                      onComplete={handleComplete}
                      onCancel={handleCancel}
                      onReject={handleReject}
                      onOwnerSelfService={() => setOwnerSelfServiceWo(liveWorkOrder)}
                      isUploading={isUploadingWoPhoto}
                      isTransitioning={isTransitioning}
                      />
                    </div>
                    <div className="shrink-0 flex gap-2">
                      <RequirePermission permission="maintenance.write">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setWoMode("edit")}
                        >
                          {t("maintenance.common.edit")}
                        </Button>
                      </RequirePermission>
                      <RequirePermission permission="maintenance.delete">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setDeleteTarget({
                              kind: "workOrder",
                              item: selectedWo,
                            });
                            setWoMode(null);
                          }}
                        >
                          {t("maintenance.common.delete")}
                        </Button>
                      </RequirePermission>
                    </div>
                  </div>
                )}
              </div>
            );

            const handleWoOpenChange = (open: boolean) => {
              if (!open) {
                setWoMode(null);
                setSelectedWo(null);
              }
            };

            if (isMobile) {
              return (
                <Sheet open={isWoSheetOpen} onOpenChange={handleWoOpenChange}>
                  <SheetContent
                    side="right"
                    className="w-150 flex flex-col bg-slate-100"
                  >
                    <SheetHeader className="shrink-0">
                      <SheetTitle>{woTitle}</SheetTitle>
                    </SheetHeader>
                    {woBody}
                  </SheetContent>
                </Sheet>
              );
            }

            return (
              <Dialog open={isWoSheetOpen} onOpenChange={handleWoOpenChange}>
                <DialogContent className="max-w-3xl w-[90vw] h-[85vh] flex flex-col">
                  <DialogHeader className="shrink-0">
                    <DialogTitle>{woTitle}</DialogTitle>
                  </DialogHeader>
                  {woBody}
                </DialogContent>
              </Dialog>
            );
          })()}

          {/* ─── Asset Dialog (create / edit) ────────────────────────────────── */}
          <Dialog
            open={isAssetDialogOpen}
            onOpenChange={(open) => {
              if (!open) {
                setAssetMode(null);
                setSelectedAsset(null);
              }
            }}
          >
            <DialogContent className="max-w-lg overflow-y-auto max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>
                  {assetMode === "create"
                    ? t("maintenance.asset.new")
                    : t("maintenance.common.edit") +
                      " " +
                      t("maintenance.asset.title")}
                </DialogTitle>
              </DialogHeader>
              <AssetForm
                asset={selectedAsset ?? undefined}
                onSubmit={handleAssetSubmit}
                onCancel={() => {
                  setAssetMode(null);
                  setSelectedAsset(null);
                }}
                loading={createAsset.isPending || updateAsset.isPending}
              />
            </DialogContent>
          </Dialog>

          {/* ─── Create Inspection Sheet ──────────────────────────────────────── */}
          <Sheet
            open={createInspectionOpen}
            onOpenChange={setCreateInspectionOpen}
          >
            <SheetContent side="right" className="w-150 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>{t("maintenance.inspection.new")}</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <InspectionForm
                  propertyId=""
                  onSubmit={() => setCreateInspectionOpen(false)}
                />
              </div>
            </SheetContent>
          </Sheet>

          {/* ─── Delete Confirmation AlertDialog ─────────────────────────────── */}
          <AlertDialog
            open={deleteTarget !== null}
            onOpenChange={(open) => {
              if (!open) setDeleteTarget(null);
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {deleteTarget?.kind === "asset"
                    ? t("maintenance.common.deleteConfirm.asset.title")
                    : t("maintenance.common.deleteConfirm.workOrder.title")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {deleteTarget?.kind === "asset"
                    ? t("maintenance.common.deleteConfirm.asset.description")
                    : t("maintenance.common.deleteConfirm.workOrder.description")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>
                  {t("maintenance.workOrder.actions.cancel")}
                </AlertDialogCancel>
                <RequirePermission permission="maintenance.delete">
                  <AlertDialogAction
                    onClick={handleDeleteConfirm}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? "…" : t("maintenance.common.delete")}
                  </AlertDialogAction>
                </RequirePermission>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* ─── Assignment Dialog ───────────────────────────────────────────── */}
          <AssignmentDialog
            open={assignDialogOpen}
            onOpenChange={setAssignDialogOpen}
            users={maintenanceUsers}
            organizations={assignableOrganizations}
            onAssign={async (assignedTo, assignedToType) => {
              if (!selectedWo) return;
              try {
                const currentEstado = liveWorkOrder?.estado ?? selectedWo.estado;
                if (currentEstado === "borrador") {
                  await assignWo.mutateAsync({ assignedTo, assignedToType });
                } else {
                  await reassignWo.mutateAsync({ assignedTo, assignedToType });
                }
                setAssignDialogOpen(false);
              } catch {
                // Error surfaced by mutation hook
              }
            }}
            isLoading={assignWo.isPending || reassignWo.isPending}
          />

          {/* ─── Owner Self-Service Modal ────────────────────────────────────── */}
          {ownerSelfServiceWo && (
            <OwnerSelfServiceModal
              workOrder={ownerSelfServiceWo}
              isOpen={!!ownerSelfServiceWo}
              onClose={() => setOwnerSelfServiceWo(null)}
            />
          )}

          {/* ─── Skip-Prevention Justification Dialog ────────────────────────── */}
          <Dialog
            open={skipPreventionOpen}
            onOpenChange={(open) => {
              setSkipPreventionOpen(open);
              if (!open) setSkipPreventionNotes("");
            }}
          >
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-sm font-medium">
                  {t("maintenance.workOrder.transitions.skipPreventionPrompt")}
                </DialogTitle>
              </DialogHeader>
              <textarea
                value={skipPreventionNotes}
                onChange={(e) => setSkipPreventionNotes(e.target.value)}
                rows={3}
                autoFocus
                className="w-full text-sm rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 min-h-11"
                  onClick={() => {
                    setSkipPreventionOpen(false);
                    setSkipPreventionNotes("");
                  }}
                >
                  {t("maintenance.workOrder.actions.cancel")}
                </Button>
                <Button
                  type="button"
                  className="flex-1 min-h-11"
                  disabled={!skipPreventionNotes.trim() || completeWo.isPending}
                  onClick={handleCompleteWithJustification}
                >
                  {t("maintenance.workOrder.actions.complete")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </PageLayout>
      </RequirePermission>
    </ProtectedRoute>
  );
}
