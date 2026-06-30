/**
 * Dashboard hooks — React Query with 5-minute stale time
 */

import { useQuery } from "@tanstack/react-query";
import {
  getCMOSDashboard,
  getFinancialDashboard,
  getRealEstateDashboard,
} from "../api/dashboard.api";

const STALE = 1000 * 60 * 5; // 5 minutes

export function useRealEstateDashboard() {
  return useQuery({
    queryKey: ["dashboard", "real-estate"],
    queryFn: async () => {
      const res = await getRealEstateDashboard();
      if (!res.data) throw new Error("No data from real-estate dashboard");
      return res.data;
    },
    staleTime: STALE,
    gcTime: STALE * 2,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

export function useFinancialDashboard() {
  return useQuery({
    queryKey: ["dashboard", "financial"],
    queryFn: async () => {
      const res = await getFinancialDashboard();
      if (!res.data) throw new Error("No data from financial dashboard");
      return res.data;
    },
    staleTime: STALE,
    gcTime: STALE * 2,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

export function useCMOSDashboard() {
  return useQuery({
    queryKey: ["dashboard", "cmms"],
    queryFn: async () => {
      const res = await getCMOSDashboard();
      if (!res.data) throw new Error("No data from CMMS dashboard");
      return res.data;
    },
    staleTime: STALE,
    gcTime: STALE * 2,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
