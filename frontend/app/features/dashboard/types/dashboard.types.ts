/**
 * Dashboard types — aligned with backend app/core/dashboard/schemas.py
 */

export interface OcupacionWidget {
  total: number;
  ocupados: number;
  disponibles: number;
  mantenimiento: number;
  otros: number;
}

export interface AgingBucket {
  count: number;
  total: number;
}

export interface CarteraAging {
  "0_30": AgingBucket;
  "31_60": AgingBucket;
  "61_90": AgingBucket;
  over_90: AgingBucket;
}

export interface ContratoVencimiento {
  id: string;
  property_id: string;
  canon_actual: number;
  fecha_fin: string;
  estado: string;
  dias_restantes: number;
}

export interface OtCritica {
  id: string;
  titulo: string;
  prioridad: string;
  estado: string;
  property_id: string;
}

export interface RealEstateDashboard {
  ocupacion: OcupacionWidget;
  cartera_aging: CarteraAging;
  contratos_por_vencer: ContratoVencimiento[];
  mantenimientos_criticos: OtCritica[];
}

export interface PLMensual {
  year: number;
  month: number;
  total_income: number;
  total_expenses: number;
  net_result: number;
}

export interface CashFlowPoint {
  period: string;
  income: number;
  expenses: number;
  net: number;
}

export interface TopProperty {
  property_id: string;
  total_revenue: number;
}

export interface TopDebtor {
  entity_id: string;
  entity_type: string;
  total_debt: number;
  charge_count: number;
}

export interface FinancialDashboard {
  pl_mensual: PLMensual;
  flujo_caja: CashFlowPoint[];
  top_rentables: TopProperty[];
  top_morosos: TopDebtor[];
}

export interface OtByStatus {
  status: string;
  count: number;
}

export interface MttrPoint {
  period: string;
  avg_hours: number;
}

export interface TopAssetFallas {
  asset_id: string;
  failures: number;
}

export interface CMOSDashboard {
  ots_por_estado: OtByStatus[];
  mttr_tendencia: MttrPoint[];
  pct_pm: number | null;
  top_activos_fallas: TopAssetFallas[];
}
