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

export interface AlarmProductLite {
  id: string;
  code: string;
  name: string;
  stockCurrent: number;
  stockMin: number;
  category?: string | null;
  warehouse?: string | null;
  aisle?: string | null;
  shelf?: string | null;
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Hook para obtener datos del dashboard con métricas avanzadas.
 */
export function useDashboard(locale: string = 'es-ES') {
  const [loading, setLoading] = React.useState(true);
  const [movementsLoading, setMovementsLoading] = React.useState(true);
  const [range, setRange] = React.useState<DashboardRange>('7d');
  const [referenceDate, setReferenceDate] = React.useState<Date>(new Date());
  const [alarmProducts, setAlarmProducts] = React.useState<AlarmProductLite[]>([]);
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

  // Funciones de navegación
  const goToPreviousPeriod = React.useCallback(() => {
    setReferenceDate((prev) => {
      const d = new Date(prev);
      if (range === '7d') d.setDate(d.getDate() - 7);
      else if (range === '30d') {
        d.setDate(1);
        d.setMonth(d.getMonth() - 1);
      }
      else if (range === '12m') d.setFullYear(d.getFullYear() - 1);
      return d;
    });
  }, [range]);

  const goToNextPeriod = React.useCallback(() => {
    setReferenceDate((prev) => {
      const d = new Date(prev);
      if (range === '7d') d.setDate(d.getDate() + 7);
      else if (range === '30d') {
        d.setDate(1);
        d.setMonth(d.getMonth() + 1);
      }
      else if (range === '12m') d.setFullYear(d.getFullYear() + 1);
      return d;
    });
  }, [range]);

  const goToToday = React.useCallback(() => {
    setReferenceDate(new Date());
  }, []);

  // Cargar estadísticas generales (solo una vez o cuando hay cambios en productos)
  const loadGeneralStats = React.useCallback(async () => {
    try {
      setLoading(true);
      const productRepo = new SupabaseProductRepository();

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

      // Lista para alarmas actuales
      setAlarmProducts(
        allProducts.data
          .filter((p) => p.stockCurrent <= p.stockMin)
          .map((p) => ({
            id: p.id,
            code: p.code,
            name: p.name,
            stockCurrent: p.stockCurrent,
            stockMin: p.stockMin,
            category: p.category ?? null,
            warehouse: p.warehouse ?? null,
            aisle: p.aisle ?? null,
            shelf: p.shelf ?? null,
          })),
      );

      // Obtener sugerencias IA pendientes
      const { count: suggestionsCount } = await supabaseClient
        .from('ai_suggestions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PENDING');

      setStats((prev) => ({
        ...prev,
        totalProducts,
        lowStockCount,
        aiSuggestions: suggestionsCount ?? 0,
        totalUnits,
        categoriesCount: categories.size,
      }));
    } catch (error) {
      console.error('Error cargando estadísticas generales del dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar estadísticas de movimientos (cuando cambia el rango o la fecha de referencia)
  const loadMovementsStats = React.useCallback(async () => {
    try {
      setMovementsLoading(true);
      const now = new Date();
      const todayStart = startOfDay(now);
      const rangeStart = getDashboardRangeStart(referenceDate, range);
      
      let rangeEnd = new Date(rangeStart);
      if (range === '7d') {
        rangeEnd.setDate(rangeEnd.getDate() + 6);
        rangeEnd.setHours(23, 59, 59, 999);
      } else if (range === '30d') {
        rangeEnd.setMonth(rangeEnd.getMonth() + 1);
        rangeEnd.setDate(0);
        rangeEnd.setHours(23, 59, 59, 999);
      } else {
        rangeEnd = new Date(rangeStart.getFullYear(), 11, 31, 23, 59, 59, 999);
      }

      const { data: movements } = await supabaseClient
        .from('inventory_movements')
        .select('movement_type, quantity, movement_date')
        .gte('movement_date', rangeStart.toISOString())
        .lte('movement_date', rangeEnd.toISOString());

      const movementRows = movements ?? [];

      const movementsToday = movementRows.filter((m) => {
        const d = new Date(m.movement_date);
        return d.getTime() >= todayStart.getTime() && d.getTime() <= now.getTime();
      }).length;

      const movementsRange = movementRows.length;

      const chartBuckets = buildMovementBuckets(referenceDate, range, locale);
      applyMovementsToBuckets(chartBuckets, movementRows, range);
      
      setMovementChartData(
        chartBuckets.map((b) => ({
          date: b.label,
          entries: b.entries,
          exits: b.exits,
          adjustments: b.adjustments,
        })),
      );

      setStats((prev) => ({
        ...prev,
        movementsToday,
        movementsRange,
      }));
    } catch (error) {
      console.error('Error cargando movimientos del dashboard:', error);
    } finally {
      setMovementsLoading(false);
    }
  }, [range, referenceDate, locale]);

  // Efectos de carga inicial
  React.useEffect(() => {
    loadGeneralStats();
  }, [loadGeneralStats]);

  React.useEffect(() => {
    loadMovementsStats();
  }, [loadMovementsStats]);

  // Recargar estadísticas cuando cambien los productos
  useRealtime({
    table: 'products',
    onInsert: () => loadGeneralStats(),
    onUpdate: () => loadGeneralStats(),
    onDelete: () => loadGeneralStats(),
  });

  // Recargar movimientos en tiempo real
  useRealtime({
    table: 'inventory_movements',
    onInsert: () => loadMovementsStats(),
    onUpdate: () => loadMovementsStats(),
    onDelete: () => loadMovementsStats(),
  });

  // Recargar sugerencias IA
  useRealtime({
    table: 'ai_suggestions',
    onInsert: () => loadGeneralStats(),
    onUpdate: () => loadGeneralStats(),
    onDelete: () => loadGeneralStats(),
  });

  return {
    stats,
    loading,
    movementsLoading,
    movementChartData,
    range,
    setRange,
    referenceDate,
    goToPreviousPeriod,
    goToNextPeriod,
    goToToday,
    alarmProducts,
    refresh: () => {
      loadGeneralStats();
      loadMovementsStats();
    },
  };
}
