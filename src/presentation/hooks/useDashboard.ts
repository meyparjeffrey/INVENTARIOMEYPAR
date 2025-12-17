import * as React from 'react';
import { SupabaseProductRepository } from '@infrastructure/repositories/SupabaseProductRepository';
import { supabaseClient } from '@infrastructure/supabase/supabaseClient';
import { useRealtime } from './useRealtime';
import {
  applyMovementsToBuckets,
  buildMovementBuckets,
  getDashboardRangeStart,
} from '../utils/dashboardBuckets';

export type DashboardRange = '7d' | '30d' | '12m';

export interface DashboardStats {
  totalProducts: number;
  lowStockCount: number;
  aiSuggestions: number;
  totalUnits: number;
  categoriesCount: number;
  movementsToday: number;
  movementsRange: number;
}

export interface MovementChartData {
  date: string;
  entries: number;
  exits: number;
  adjustments: number;
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// startOfDay se mantiene localmente para cálculos rápidos de "hoy"

/**
 * Hook para obtener datos del dashboard con métricas avanzadas.
 */
export function useDashboard(locale: string = 'es-ES') {
  const [loading, setLoading] = React.useState(true);
  const [range, setRange] = React.useState<DashboardRange>('7d');
  const [stats, setStats] = React.useState<DashboardStats>({
    totalProducts: 0,
    lowStockCount: 0,
    aiSuggestions: 0,
    totalUnits: 0,
    categoriesCount: 0,
    movementsToday: 0,
    movementsRange: 0,
  });
  const [movementChartData, setMovementChartData] = React.useState<MovementChartData[]>(
    [],
  );

  const loadStats = React.useCallback(async () => {
    try {
      setLoading(true);
      const productRepo = new SupabaseProductRepository(supabaseClient);

      // Obtener total de productos activos
      const activeProducts = await productRepo.list(
        { includeInactive: false },
        { page: 1, pageSize: 1 },
      );
      const totalProducts = activeProducts.total ?? 0;

      // Obtener todos los productos para calcular KPIs operativos (sin precios)
      const allProducts = await productRepo.list(
        { includeInactive: false },
        { page: 1, pageSize: 10000 },
      );

      // Calcular estadísticas operativas
      let totalUnits = 0;
      const categories = new Set<string>();
      let lowStockCount = 0;

      allProducts.data.forEach((p) => {
        totalUnits += p.stockCurrent;
        if (p.category) categories.add(p.category);
        if (p.stockCurrent <= p.stockMin) lowStockCount++;
      });

      // Obtener sugerencias IA pendientes
      const { count: suggestionsCount } = await supabaseClient
        .from('ai_suggestions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PENDING');

      // Movimientos: 1 query por rango + agrupación en cliente
      const now = new Date();
      const todayStart = startOfDay(now);
      const rangeStart = getDashboardRangeStart(now, range);

      const { data: movements } = await supabaseClient
        .from('inventory_movements')
        .select('movement_type, quantity, movement_date')
        .gte('movement_date', rangeStart.toISOString())
        .lte('movement_date', now.toISOString());

      const movementRows = movements ?? [];

      const movementsToday = movementRows.filter((m) => {
        const d = new Date(m.movement_date);
        return d.getTime() >= todayStart.getTime();
      }).length;

      const movementsRange = movementRows.length;

      const chartBuckets = buildMovementBuckets(now, range, locale);
      applyMovementsToBuckets(chartBuckets, movementRows, range);
      setMovementChartData(
        chartBuckets.map((b) => ({
          date: b.label,
          entries: b.entries,
          exits: b.exits,
          adjustments: b.adjustments,
        })),
      );

      setStats({
        totalProducts,
        lowStockCount,
        aiSuggestions: suggestionsCount ?? 0,
        totalUnits,
        categoriesCount: categories.size,
        movementsToday,
        movementsRange,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error cargando estadísticas del dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, [range, locale]);

  React.useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Recargar estadísticas cuando cambien los productos
  useRealtime({
    table: 'products',
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
    },
  });

  // Recargar stats cuando cambien las sugerencias IA
  useRealtime({
    table: 'ai_suggestions',
    onInsert: () => loadStats(),
    onUpdate: () => loadStats(),
    onDelete: () => loadStats(),
  });

  return { stats, loading, movementChartData, range, setRange, refresh: loadStats };
}
