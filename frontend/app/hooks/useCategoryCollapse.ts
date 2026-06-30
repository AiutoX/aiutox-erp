import { useState, useCallback, useEffect } from "react";
import { useLocation } from "react-router";

interface UseCategoryCollapseOptions {
  maxExpanded?: number; // Máximo de categorías expandidas (default: 2)
}

/**
 * Hook para manejar el colapsado automático de categorías
 *
 * Reglas:
 * - Al entrar a Dashboard, todas las categorías colapsadas
 * - Solo la categoría activa (que contiene la ruta actual) está expandida
 * - Máximo 2 categorías pueden estar expandidas: activa + manual
 * - Al expandir una tercera categoría, se colapsa la activa anterior
 */
export function useCategoryCollapse({
  maxExpanded = 2,
}: UseCategoryCollapseOptions = {}) {
  const location = useLocation();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Determinar la categoría activa basada en la ruta actual
  useEffect(() => {
    // Lógica para determinar qué categoría contiene la ruta actual
    // Esto se puede personalizar según la estructura de rutas
    const path = location.pathname;

    // Si estamos en Dashboard, no hay categoría activa
    if (path === "/" || path === "/dashboard") {
      setActiveCategory(null);
      return;
    }

    // Determinar categoría basada en la ruta
    let newActiveCategory: string | null = null;

    if (
      path.startsWith("/tasks") ||
      path.startsWith("/approvals") ||
      path.startsWith("/files")
    ) {
      newActiveCategory = "Operación";
    } else if (path.startsWith("/products")) {
      newActiveCategory = "Gestión";
    } else if (path.startsWith("/search")) {
      newActiveCategory = "Análisis";
    } else if (path.startsWith("/automation")) {
      newActiveCategory = "Automatización";
    } else if (path.startsWith("/pubsub")) {
      newActiveCategory = "Sistema";
    } else if (
      path.startsWith("/config") ||
      path.startsWith("/users") ||
      path.startsWith("/roles")
    ) {
      newActiveCategory = "Configuración";
    }

    setActiveCategory(newActiveCategory);
  }, [location.pathname]);

  // Colapsar todas las categorías al entrar a Dashboard
  useEffect(() => {
    if (location.pathname === "/" || location.pathname === "/dashboard") {
      setExpandedCategories(new Set());
    }
  }, [location.pathname]);

  // Auto-expand la categoría activa
  useEffect(() => {
    if (activeCategory) {
      setExpandedCategories((prev) => {
        const newSet = new Set(prev);
        newSet.add(activeCategory);
        return newSet;
      });
    }
  }, [activeCategory]);

  /**
   * Toggle una categoría (expandir/colapsar)
   * Aplica la regla de máximo 2 categorías expandidas
   */
  const toggleCategory = useCallback(
    (categoryName: string) => {
      setExpandedCategories((prev) => {
        const isExpanded = prev.has(categoryName);
        const newSet = new Set(prev);

        if (isExpanded) {
          // Colapsar la categoría
          newSet.delete(categoryName);
        } else {
          // Expandir la categoría
          // Si ya hay maxExpanded categorías y esta no es la activa,
          // colapsar la categoría activa anterior
          if (newSet.size >= maxExpanded && categoryName !== activeCategory) {
            // Encontrar y colapsar la categoría activa anterior
            const activeCategoryToCollapse = Array.from(newSet).find(
              (c) => c !== activeCategory
            );
            if (activeCategoryToCollapse) {
              newSet.delete(activeCategoryToCollapse);
            }
          }
          newSet.add(categoryName);
        }

        return newSet;
      });
    },
    [activeCategory, maxExpanded]
  );

  /**
   * Verificar si una categoría está expandida
   */
  const isExpanded = useCallback(
    (categoryName: string) => {
      return expandedCategories.has(categoryName);
    },
    [expandedCategories]
  );

  /**
   * Colapsar todas las categorías manualmente
   */
  const collapseAll = useCallback(() => {
    setExpandedCategories(new Set());
  }, []);

  return {
    expandedCategories,
    activeCategory,
    toggleCategory,
    isExpanded,
    collapseAll,
  };
}
