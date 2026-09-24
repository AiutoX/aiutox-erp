import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { StockMoveList } from "~/features/inventory/components/StockMoveList";

export function meta() {
  return [{ title: "Movimientos de Inventario - AiutoX ERP" }];
}

export default function InventoryMovementsPage() {
  const { t } = useTranslation();
  const [productFilter, setProductFilter] = useState("");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {t("inventory.stockMoves.title")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t("inventory.description")}
        </p>
      </div>

      {/* Product filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium whitespace-nowrap">
          {t("inventory.stockMoves.product")}:
        </label>
        <input
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          placeholder="UUID del producto (opcional)"
          className="rounded-md border px-3 py-1.5 text-sm w-80 focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {productFilter && (
          <button
            onClick={() => setProductFilter("")}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        )}
      </div>

      <div className="rounded-lg border p-4">
        <StockMoveList
          params={{
            page: 1,
            page_size: 50,
            product_id: productFilter || undefined,
          }}
        />
      </div>
    </div>
  );
}
