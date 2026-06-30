/**
 * Dashboard API — aggregated KPI endpoints
 * Backend: GET /api/v1/dashboard/{real-estate|financial|cmms}
 */

import apiClient from "~/lib/api/client";
import type { StandardResponse } from "~/lib/api/types/common.types";
import type {
  RealEstateDashboard,
  FinancialDashboard,
  CMOSDashboard,
} from "../types/dashboard.types";

const BASE = "/dashboard";

export async function getRealEstateDashboard(): Promise<
  StandardResponse<RealEstateDashboard>
> {
  const response = await apiClient.get<StandardResponse<RealEstateDashboard>>(
    `${BASE}/real-estate`
  );
  return response.data;
}

export async function getFinancialDashboard(): Promise<
  StandardResponse<FinancialDashboard>
> {
  const response = await apiClient.get<StandardResponse<FinancialDashboard>>(
    `${BASE}/financial`
  );
  return response.data;
}

export async function getCMOSDashboard(): Promise<
  StandardResponse<CMOSDashboard>
> {
  const response = await apiClient.get<StandardResponse<CMOSDashboard>>(
    `${BASE}/cmms`
  );
  return response.data;
}
