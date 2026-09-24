/**
 * Task Search Hooks
 * TanStack Query hooks for advanced task search
 * Sprint 2.5 - Fase 2
 */

import { useQuery } from "@tanstack/react-query";
import {
  searchTasks,
  getPopularTags,
  suggestTags,
  type TaskSearchParams,
} from "../api/task-search.api";

/**
 * Hook para búsqueda avanzada de tareas
 */
export function useTaskSearch(
  params: TaskSearchParams,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ["tasks", "search", params],
    queryFn: () => searchTasks(params),
    staleTime: 1000 * 30, // 30 segundos
    retry: 2,
    enabled:
      enabled &&
      (!!params.q || !!params.tag_ids || !!params.status || !!params.priority),
  });
}

/**
 * Hook para obtener tags populares
 */
export function usePopularTags(limit: number = 20) {
  return useQuery({
    queryKey: ["tasks", "tags", "popular", limit],
    queryFn: () => getPopularTags(limit),
    staleTime: 1000 * 60 * 10, // 10 minutos
    retry: 2,
  });
}

/**
 * Hook para sugerencias de tags
 */
export function useTagSuggestions(query: string, limit: number = 10) {
  return useQuery({
    queryKey: ["tasks", "tags", "suggest", query, limit],
    queryFn: () => suggestTags(query, limit),
    staleTime: 1000 * 60, // 1 minuto
    retry: 1,
    enabled: query.length >= 2, // Solo buscar si hay al menos 2 caracteres
  });
}
