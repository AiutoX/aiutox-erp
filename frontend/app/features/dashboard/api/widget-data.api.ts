/**
 * Widget data API — module-owned widget data endpoints.
 *
 * Each module serves its own widget's data from its own router, gated by that
 * module's real permission. core/widgets is the sole registry; the legacy
 * core/dashboard endpoints these used to call were deleted in DASH-006.
 *
 * Backend: GET /api/v1/real-estate/widgets/real_estate.dashboard/data,
 *          GET /api/v1/real-estate/widgets/cmms.dashboard/data,
 *          GET /api/v1/finances/widgets/finances.dashboard/data
 */

import apiClient from "~/lib/api/client";
import type { StandardResponse } from "~/lib/api/types/common.types";
import type {
  RealEstateDashboard,
  FinancialDashboard,
  CMOSDashboard,
} from "../types/dashboard.types";

export async function getRealEstateWidgetData(): Promise<
  StandardResponse<RealEstateDashboard>
> {
  const response = await apiClient.get<StandardResponse<RealEstateDashboard>>(
    "/real-estate/widgets/real_estate.dashboard/data"
  );
  return response.data;
}

export async function getFinancesWidgetData(): Promise<
  StandardResponse<FinancialDashboard>
> {
  const response = await apiClient.get<StandardResponse<FinancialDashboard>>(
    "/finances/widgets/finances.dashboard/data"
  );
  return response.data;
}

export async function getCmmsWidgetData(): Promise<
  StandardResponse<CMOSDashboard>
> {
  const response = await apiClient.get<StandardResponse<CMOSDashboard>>(
    "/real-estate/widgets/cmms.dashboard/data"
  );
  return response.data;
}
