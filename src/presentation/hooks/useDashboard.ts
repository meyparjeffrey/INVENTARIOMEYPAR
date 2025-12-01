import * as React from "react";
import { SupabaseProductRepository } from "@infrastructure/repositories/SupabaseProductRepository";
import { supabaseClient } from "@infrastructure/supabase/supabaseClient";
import { useRealtime } from "./useRealtime";

export interface DashboardStats {
  totalProducts: number;
  lowStockCount: number;
  criticalBatches: number;
  aiSuggestions: number;
  inventoryValue: number;
  inventoryValueAtSale: number;
  totalUnits: number;
  categoriesCount: number;
  movementsToday: number;
  movementsWeek: number;
}

export interface MovementChartData {
  date: string;
  entries: number;
  exits: number;
  adjustments: number;
}

/**
 * Hook para obtener datos del dashboard con métricas avanzadas.
 */
export function useDashboard() {
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState<DashboardStats>({
    totalProducts: 0,
    lowStockCount: 0,
    criticalBatches: 0,
    aiSuggestions: 0,
    inventoryValue: 0,
    inventoryValueAtSale: 0,
    totalUnits: 0,
    categoriesCount: 0,
    movementsToday: 0,
    movementsWeek: 0
  });
  const [movementChartData, setMovementChartData] = React.useState<MovementChartData[]>([]);

  const loadStats = React.useCallback(async () => {
    try {
      const productRepo = new SupabaseProductRepository(supabaseClient);

      // Obtener total de productos activos
      const activeProducts = await productRepo.list({ includeInactive: false }, { page: 1, pageSize: 1 });
      const totalProducts = activeProducts.total ?? 0;

      // Obtener todos los productos para calcular valor del inventario
      const allProducts = await productRepo.list(
        { includeInactive: false },
        { page: 1, pageSize: 10000 }
      );

      // Calcular estadísticas de inventario
      let inventoryValue = 0;
      let inventoryValueAtSale = 0;
      let totalUnits = 0;
      const categories = new Set<string>();
      let lowStockCount = 0;

      allProducts.data.forEach((p) => {
        inventoryValue += p.stockCurrent * (p.costPrice ?? 0);
        inventoryValueAtSale += p.stockCurrent * (p.salePrice ?? p.costPrice ?? 0);
        totalUnits += p.stockCurrent;
        if (p.category) categories.add(p.category);
        if (p.stockCurrent <= p.stockMin) lowStockCount++;
      });

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

      // Obtener movimientos de hoy
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: movementsTodayCount } = await supabaseClient
        .from("inventory_movements")
        .select("*", { count: "exact", head: true })
        .gte("movement_date", today.toISOString());

      // Obtener movimientos de la semana
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: movementsWeekCount } = await supabaseClient
        .from("inventory_movements")
        .select("*", { count: "exact", head: true })
        .gte("movement_date", weekAgo.toISOString());

      // Obtener datos para gráfico de movimientos (últimos 7 días)
      const chartData: MovementChartData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const { data: dayMovements } = await supabaseClient
          .from("inventory_movements")
          .select("movement_type, quantity")
          .gte("movement_date", date.toISOString())
          .lt("movement_date", nextDate.toISOString());

        const dayData: MovementChartData = {
          date: date.toLocaleDateString("es-ES", { weekday: "short", day: "numeric" }),
          entries: 0,
          exits: 0,
          adjustments: 0
        };

        (dayMovements ?? []).forEach((m) => {
          if (m.movement_type === "IN") dayData.entries += m.quantity;
          else if (m.movement_type === "OUT") dayData.exits += m.quantity;
          else if (m.movement_type === "ADJUSTMENT") dayData.adjustments += m.quantity;
        });

        chartData.push(dayData);
      }

      setMovementChartData(chartData);

      setStats({
        totalProducts,
        lowStockCount,
        criticalBatches: criticalBatchesCount ?? 0,
        aiSuggestions: suggestionsCount ?? 0,
        inventoryValue,
        inventoryValueAtSale,
        totalUnits,
        categoriesCount: categories.size,
        movementsToday: movementsTodayCount ?? 0,
        movementsWeek: movementsWeekCount ?? 0
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

  return { stats, loading, movementChartData, refresh: loadStats };
}

