import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { InventoryKPIDashboard } from "~/features/inventory/components/InventoryKPIDashboard";
import { LocationList } from "~/features/inventory/components/LocationList";
import { LotList } from "~/features/inventory/components/LotList";
import { NewOperationDialog } from "~/features/inventory/components/NewOperationDialog";
import { OperationDetail } from "~/features/inventory/components/OperationDetail";
import { OperationList } from "~/features/inventory/components/OperationList";
import { OrderPointList } from "~/features/inventory/components/OrderPointList";
import { WarehouseList } from "~/features/inventory/components/WarehouseList";
import { useStockSummary } from "~/features/inventory/hooks/useInventory";
import type {
  StockOperation,
  Warehouse,
} from "~/features/inventory/types/inventory.types";

export function meta() {
  return [{ title: "Inventario - AiutoX ERP" }];
}

type Tab =
  | "warehouses"
  | "operations"
  | "lots"
  | "order-points"
  | "stock-summary";

const TABS: Tab[] = [
  "warehouses",
  "operations",
  "lots",
  "order-points",
  "stock-summary",
];

const TAB_LABELS: Record<Tab, string> = {
  warehouses: "Almacenes",
  operations: "Operaciones",
  lots: "Lotes",
  "order-points": "Puntos de reorden",
  "stock-summary": "Resumen de stock",
};

export default function InventoryPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("warehouses");
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(
    null
  );
  const [selectedOperation, setSelectedOperation] =
    useState<StockOperation | null>(null);
  const [showNewOperation, setShowNewOperation] = useState(false);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{t("inventory.title")}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("inventory.description")}
          </p>
        </div>
        {activeTab === "operations" && (
          <button
            onClick={() => setShowNewOperation(true)}
            className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {t("inventory.operations.create")}
          </button>
        )}
      </div>

      {/* KPI Dashboard */}
      <InventoryKPIDashboard />

      {/* Tabs */}
      <div>
        <div className="flex gap-1 border-b overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSelectedOperation(null);
              }}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {/* Tab: Warehouses & Locations */}
          {activeTab === "warehouses" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-lg border p-4">
                <WarehouseList onSelectWarehouse={setSelectedWarehouse} />
              </div>
              <div className="rounded-lg border p-4">
                {selectedWarehouse ? (
                  <LocationList
                    warehouseId={selectedWarehouse.id}
                    warehouseName={selectedWarehouse.name}
                  />
                ) : (
                  <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                    {t("inventory.locations.selectWarehouseHint")}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab: Operations */}
          {activeTab === "operations" && (
            <div className="space-y-4">
              {selectedOperation ? (
                <div className="rounded-lg border p-4">
                  <OperationDetail
                    operation={selectedOperation}
                    onClose={() => setSelectedOperation(null)}
                  />
                </div>
              ) : (
                <div className="rounded-lg border p-4">
                  <OperationList
                    warehouseId={selectedWarehouse?.id}
                    onSelectOperation={setSelectedOperation}
                  />
                </div>
              )}
            </div>
          )}

          {/* Tab: Lots */}
          {activeTab === "lots" && (
            <div className="rounded-lg border p-4">
              <LotList />
            </div>
          )}

          {/* Tab: Order Points */}
          {activeTab === "order-points" && (
            <div className="rounded-lg border p-4">
              <OrderPointList warehouseId={selectedWarehouse?.id} />
            </div>
          )}

          {/* Tab: Stock Summary */}
          {activeTab === "stock-summary" && (
            <div className="rounded-lg border p-4">
              <StockSummaryTab />
            </div>
          )}
        </div>
      </div>

      {/* New Operation Dialog */}
      {showNewOperation && (
        <NewOperationDialog
          onClose={() => setShowNewOperation(false)}
          warehouseId={selectedWarehouse?.id}
        />
      )}
    </div>
  );
}

function StockSummaryTab() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useStockSummary();
  const items = data?.data ?? [];

  if (isLoading)
    return (
      <p className="text-muted-foreground text-sm py-8 text-center">
        {t("inventory.loading")}
      </p>
    );
  if (isError)
    return (
      <p className="text-destructive text-sm py-8 text-center">
        {t("inventory.error")}
      </p>
    );
  if (items.length === 0)
    return (
      <p className="text-muted-foreground text-sm py-8 text-center">
        {t("inventory.stockSummary.empty")}
      </p>
    );

  return (
    <div className="overflow-x-auto">
      <h2 className="text-lg font-semibold mb-3">
        {t("inventory.stockSummary.title")}
      </h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 text-xs text-muted-foreground">
            <th className="px-3 py-2 text-left">
              {t("inventory.stockSummary.product")}
            </th>
            <th className="px-3 py-2 text-left">
              {t("inventory.stockSummary.location")}
            </th>
            <th className="px-3 py-2 text-right">
              {t("inventory.stockSummary.quantity")}
            </th>
            <th className="px-3 py-2 text-right">
              {t("inventory.stockSummary.reserved")}
            </th>
            <th className="px-3 py-2 text-right">
              {t("inventory.stockSummary.available")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-muted/30">
              <td className="px-3 py-2 font-mono text-xs">
                {item.product_id.slice(0, 8)}
              </td>
              <td className="px-3 py-2 font-mono text-xs">
                {item.location_id.slice(0, 8)}
              </td>
              <td className="px-3 py-2 text-right font-mono">
                {Number(item.quantity)}
              </td>
              <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                {Number(item.reserved_quantity)}
              </td>
              <td className="px-3 py-2 text-right font-mono">
                {Number(item.quantity) - Number(item.reserved_quantity)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
