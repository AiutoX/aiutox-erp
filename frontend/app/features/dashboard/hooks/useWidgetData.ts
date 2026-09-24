/**
 * Widget data hooks — React Query with 5-minute stale time.
 *
 * One hook per module-owned widget data endpoint (see api/widget-data.api.ts).
 */

import { useQuery } from "@tanstack/react-query";
import {
  getCmmsWidgetData,
  getFinancesWidgetData,
  getRealEstateWidgetData,
} from "../api/widget-data.api";

const STALE = 1000 * 60 * 5; // 5 minutes

export function useRealEstateWidgetData() {
  return useQuery({
    queryKey: ["widget-data", "real-estate"],
    queryFn: async () => {
      const res = await getRealEstateWidgetData();
      if (!res.data) throw new Error("No data from real-estate widget");
      return res.data;
    },
    staleTime: STALE,
    gcTime: STALE * 2,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

export function useFinancesWidgetData() {
  return useQuery({
    queryKey: ["widget-data", "finances"],
    queryFn: async () => {
      const res = await getFinancesWidgetData();
      if (!res.data) throw new Error("No data from finances widget");
      return res.data;
    },
    staleTime: STALE,
    gcTime: STALE * 2,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

export function useCmmsWidgetData() {
  return useQuery({
    queryKey: ["widget-data", "cmms"],
    queryFn: async () => {
      const res = await getCmmsWidgetData();
      if (!res.data) throw new Error("No data from CMMS widget");
      return res.data;
    },
    staleTime: STALE,
    gcTime: STALE * 2,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
