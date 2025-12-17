import * as React from 'react';
import { SupabaseProductRepository } from '@infrastructure/repositories/SupabaseProductRepository';
import { supabaseClient } from '@infrastructure/supabase/supabaseClient';
import { useRealtime } from './useRealtime';

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

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function getRangeStart(now: Date, range: DashboardRange) {
  const today = startOfDay(now);
  if (range === '7d') {
    const d = new Date(today);
    d.setDate(d.getDate() - 6);
    return d;
  }
  if (range === '30d') {
    const d = new Date(today);
    d.setDate(d.getDate() - 29);
    return d;
  }
  // 12m: desde el primer día del mes de hace 11 meses
  return new Date(now.getFullYear(), now.getMonth() - 11, 1);
}

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
      const rangeStart = getRangeStart(now, range);

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

      const chartBuckets: Array<{
        key: string;
        label: string;
        entries: number;
        exits: number;
        adjustments: number;
      }> = [];

      if (range === '12m') {
        // 12 meses: del mes actual hacia atrás 11 meses
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
          const label = d.toLocaleDateString(locale, {
            month: 'short',
            year: '2-digit',
          });
          chartBuckets.push({ key, label, entries: 0, exits: 0, adjustments: 0 });
        }
      } else {
        const days = range === '30d' ? 30 : 7;
        for (let i = days - 1; i >= 0; i--) {
          const d = new Date(todayStart);
          d.setDate(d.getDate() - i);
          const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
          const label = d.toLocaleDateString(locale, {
            weekday: 'short',
            day: 'numeric',
          });
          chartBuckets.push({ key, label, entries: 0, exits: 0, adjustments: 0 });
        }
      }

      const bucketMap = new Map(chartBuckets.map((b) => [b.key, b]));

      movementRows.forEach((m) => {
        const d = new Date(m.movement_date);
        const type = m.movement_type;
        const qty = typeof m.quantity === 'number' ? m.quantity : Number(m.quantity) || 0;

        const key =
          range === '12m'
            ? `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
            : `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

        const bucket = bucketMap.get(key);
        if (!bucket) return;

        if (type === 'IN') bucket.entries += qty;
        else if (type === 'OUT') bucket.exits += qty;
        else if (type === 'ADJUSTMENT') bucket.adjustments += Math.abs(qty);
      });

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
