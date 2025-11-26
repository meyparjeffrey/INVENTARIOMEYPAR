import * as React from "react";
import { SupabaseProductRepository } from "@infrastructure/repositories/SupabaseProductRepository";
import { supabaseClient } from "@infrastructure/supabase/supabaseClient";
import { useRealtime } from "./useRealtime";

/**
 * Hook para obtener datos del dashboard.
 */
export function useDashboard() {
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState({
    totalProducts: 0,
    lowStockCount: 0,
    criticalBatches: 0,
    aiSuggestions: 0
  });

  const loadStats = React.useCallback(async () => {
    try {
      const productRepo = new SupabaseProductRepository(supabaseClient);

      // Obtener total de productos activos
      const activeProducts = await productRepo.list({ includeInactive: false }, { page: 1, pageSize: 1 });
      const totalProducts = activeProducts.total ?? 0;

      // Obtener productos en alarma (stock <= stock_min)
      const lowStockProducts = await productRepo.list(
        { includeInactive: false },
        { page: 1, pageSize: 1000 }
      );
      const lowStockCount = lowStockProducts.data.filter(
        (p) => p.stockCurrent <= p.stockMin
      ).length;

      // Obtener lotes críticos
      const { count: criticalBatchesCount } = await supabaseClient
        .from("product_batches")
        .select("*", { count: "exact", head: true })
        .in("status", ["DEFECTIVE", "BLOCKED"]);

      // Obtener sugerencias IA pendientes
      const { count: suggestionsCount } = await supabaseClient
        .from("ai_suggestions")
        .select("*", { count: "exact", head: true })
        .eq("status", "PENDING");

      setStats({
        totalProducts,
        lowStockCount,
        criticalBatches: criticalBatchesCount ?? 0,
        aiSuggestions: suggestionsCount ?? 0
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error cargando estadísticas del dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Recargar estadísticas cuando cambien los productos
  useRealtime({
    table: "products",
    onInsert: () => {
      // Recargar stats cuando se añade un producto
      loadStats();
    },
    onUpdate: () => {
      // Recargar stats cuando se actualiza un producto (puede cambiar stock)
      loadStats();
    },
    onDelete: () => {
      // Recargar stats cuando se elimina un producto
      loadStats();
    }
  });

  // Recargar stats cuando cambien las sugerencias IA
  useRealtime({
    table: "ai_suggestions",
    onInsert: () => loadStats(),
    onUpdate: () => loadStats(),
    onDelete: () => loadStats()
  });

  // Recargar stats cuando cambien los lotes
  useRealtime({
    table: "product_batches",
    onInsert: () => loadStats(),
    onUpdate: () => loadStats(),
    onDelete: () => loadStats()
  });

  return { stats, loading };
}

