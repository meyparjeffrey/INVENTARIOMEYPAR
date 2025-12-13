/**
 * Hook para gestionar informes con generación y exportación.
 * 
 * Proporciona estado, funciones para generar diferentes tipos de informes,
 * cache de informes generados y funciones de exportación.
 * 
 * @module @presentation/hooks/useReports
 * @requires @application/services/ReportService
 * @requires @domain/entities/Report
 * 
 * @returns {Object} Objeto con estado de informes, funciones de generación y exportación
 * @example
 * const { report, loading, generateInventoryReport, exportReport } = useReports();
 * 
 * // Generar informe
 * await generateInventoryReport({ lowStockOnly: true });
 * 
 * // Exportar informe
 * await exportReport(report, { format: 'EXCEL' });
 */
import * as React from 'react';
import type {
  ABCReport,
  BatchAnomaliesReport,
  BatchesReport,
  ConsumptionTrendsReport,
  DefectsReport,
  ExpiringBatchesReport,
  FinancialReport,
  InventoryReport,
  InventoryReportFilters,
  LowStockReport,
  MovementsReport,
  MovementsReportFilters,
  ReorderPredictionsReport,
  Report,
  ReportExportConfig,
  ReportType,
  StockOptimizationReport,
  StockRotationReport,
  SupplierQualityReport
} from '@domain/entities/Report';
import { ReportService } from '@application/services/ReportService';

/**
 * Estado y funciones del hook useReports.
 */
export interface UseReportsReturn {
  /** Informe actual generado */
  report: Report | null;
  /** Estado de carga */
  loading: boolean;
  /** Error si ocurre */
  error: string | null;
  /** Cache de informes generados (por tipo) */
  reportCache: Map<ReportType, Report>;
  /** Generar informe de inventario */
  generateInventoryReport: (
    filters?: InventoryReportFilters
  ) => Promise<InventoryReport | null>;
  /** Generar análisis ABC */
  generateABCReport: () => Promise<ABCReport | null>;
  /** Generar informe de movimientos */
  generateMovementsReport: (
    filters?: MovementsReportFilters
  ) => Promise<MovementsReport | null>;
  /** Generar informe de rotación de stock */
  generateStockRotationReport: (
    period?: 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR'
  ) => Promise<StockRotationReport | null>;
  /** Generar informe financiero */
  generateFinancialReport: (filters?: any) => Promise<FinancialReport | null>;
  /** Generar informe de lotes */
  generateBatchesReport: (filters?: any) => Promise<BatchesReport | null>;
  /** Generar informe de lotes próximos a caducar */
  generateExpiringBatchesReport: (
    days?: number
  ) => Promise<ExpiringBatchesReport | null>;
  /** Generar informe de defectos */
  generateDefectsReport: () => Promise<DefectsReport | null>;
  /** Generar informe de stock bajo */
  generateLowStockReport: () => Promise<LowStockReport | null>;
  /** Generar informe de calidad de proveedores */
  generateSupplierQualityReport: () => Promise<SupplierQualityReport | null>;
  /** Generar informe de tendencias de consumo */
  generateConsumptionTrendsReport: (
    period?: 'WEEK' | 'MONTH' | 'QUARTER'
  ) => Promise<ConsumptionTrendsReport | null>;
  /** Generar informe de predicciones de reposición */
  generateReorderPredictionsReport: (
    daysAhead?: number
  ) => Promise<ReorderPredictionsReport | null>;
  /** Generar informe de anomalías de lotes */
  generateBatchAnomaliesReport: () => Promise<BatchAnomaliesReport | null>;
  /** Generar informe de optimización de stock */
  generateStockOptimizationReport: () => Promise<StockOptimizationReport | null>;
  /** Limpiar informe actual */
  clearReport: () => void;
  /** Limpiar cache de informes */
  clearCache: () => void;
  /** Obtener informe del cache */
  getCachedReport: (type: ReportType) => Report | undefined;
}

/**
 * Hook para gestionar informes.
 */
export function useReports(): UseReportsReturn {
  const [report, setReport] = React.useState<Report | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [reportCache, setReportCache] = React.useState<Map<ReportType, Report>>(
    new Map()
  );

  const serviceRef = React.useRef<ReportService>(new ReportService());

  /**
   * Función genérica para generar informes con manejo de errores y cache.
   */
  const generateReport = React.useCallback(
    async <T extends Report>(
      type: ReportType,
      generator: () => Promise<T>,
      useCache: boolean = true
    ): Promise<T | null> => {
      // Verificar cache
      if (useCache) {
        const cached = reportCache.get(type);
        if (cached) {
          setReport(cached);
          return cached as T;
        }
      }

      setLoading(true);
      setError(null);

      try {
        const generatedReport = await generator();
        setReport(generatedReport);

        // Guardar en cache
        if (useCache) {
          setReportCache((prev) => {
            const newCache = new Map(prev);
            newCache.set(type, generatedReport);
            return newCache;
          });
        }

        return generatedReport;
      } catch (err: any) {
        const errorMessage =
          err?.message ?? 'Error al generar el informe';
        setError(errorMessage);
        // eslint-disable-next-line no-console
        console.error('Error generando informe:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [reportCache]
  );

  /**
   * Genera informe de inventario.
   */
  const generateInventoryReport = React.useCallback(
    async (filters: InventoryReportFilters = {}) => {
      return generateReport<InventoryReport>(
        'INVENTORY',
        () => serviceRef.current.generateInventoryReport(filters),
        false // No usar cache para inventario (datos cambian frecuentemente)
      );
    },
    [generateReport]
  );

  /**
   * Genera análisis ABC.
   */
  const generateABCReport = React.useCallback(async () => {
    return generateReport<ABCReport>(
      'ABC_ANALYSIS',
      () => serviceRef.current.generateABCReport(),
      true
    );
  }, [generateReport]);

  /**
   * Genera informe de movimientos.
   */
  const generateMovementsReport = React.useCallback(
    async (filters: MovementsReportFilters = {}) => {
      return generateReport<MovementsReport>(
        'MOVEMENTS',
        () => serviceRef.current.generateMovementsReport(filters),
        false // No usar cache para movimientos (datos cambian frecuentemente)
      );
    },
    [generateReport]
  );

  /**
   * Genera informe de rotación de stock.
   */
  const generateStockRotationReport = React.useCallback(
    async (period: 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR' = 'MONTH') => {
      return generateReport<StockRotationReport>(
        'STOCK_ROTATION',
        () => serviceRef.current.generateStockRotationReport(period),
        false
      );
    },
    [generateReport]
  );

  /**
   * Genera informe financiero.
   */
  const generateFinancialReport = React.useCallback(
    async (filters: any = {}) => {
      return generateReport<FinancialReport>(
        'FINANCIAL',
        () => serviceRef.current.generateFinancialReport(filters),
        false
      );
    },
    [generateReport]
  );

  /**
   * Genera informe de lotes.
   */
  const generateBatchesReport = React.useCallback(
    async (filters: any = {}) => {
      return generateReport<BatchesReport>(
        'BATCHES',
        () => serviceRef.current.generateBatchesReport(filters),
        false
      );
    },
    [generateReport]
  );

  /**
   * Genera informe de lotes próximos a caducar.
   */
  const generateExpiringBatchesReport = React.useCallback(
    async (days: number = 30) => {
      return generateReport<ExpiringBatchesReport>(
        'EXPIRING_BATCHES',
        () => serviceRef.current.generateExpiringBatchesReport(days),
        false
      );
    },
    [generateReport]
  );

  /**
   * Genera informe de defectos.
   */
  const generateDefectsReport = React.useCallback(async () => {
    return generateReport<DefectsReport>(
      'DEFECTS',
      () => serviceRef.current.generateDefectsReport(),
      false
    );
  }, [generateReport]);

  /**
   * Genera informe de stock bajo.
   */
  const generateLowStockReport = React.useCallback(async () => {
    return generateReport<LowStockReport>(
      'LOW_STOCK',
      () => serviceRef.current.generateLowStockReport(),
      false
    );
  }, [generateReport]);

  /**
   * Genera informe de calidad de proveedores.
   */
  const generateSupplierQualityReport = React.useCallback(async () => {
    return generateReport<SupplierQualityReport>(
      'SUPPLIER_QUALITY',
      () => serviceRef.current.generateSupplierQualityReport(),
      true // Puede usar cache (datos no cambian tan frecuentemente)
    );
  }, [generateReport]);

  /**
   * Genera informe de tendencias de consumo.
   */
  const generateConsumptionTrendsReport = React.useCallback(
    async (period: 'WEEK' | 'MONTH' | 'QUARTER' = 'MONTH') => {
      return generateReport<ConsumptionTrendsReport>(
        'CONSUMPTION_TRENDS',
        () => serviceRef.current.generateConsumptionTrendsReport(period),
        false
      );
    },
    [generateReport]
  );

  /**
   * Genera informe de predicciones de reposición.
   */
  const generateReorderPredictionsReport = React.useCallback(
    async (daysAhead: number = 7) => {
      return generateReport<ReorderPredictionsReport>(
        'REORDER_PREDICTIONS',
        () => serviceRef.current.generateReorderPredictionsReport(daysAhead),
        false
      );
    },
    [generateReport]
  );

  /**
   * Genera informe de anomalías de lotes.
   */
  const generateBatchAnomaliesReport = React.useCallback(async () => {
    return generateReport<BatchAnomaliesReport>(
      'BATCH_ANOMALIES',
      () => serviceRef.current.generateBatchAnomaliesReport(),
      false
    );
  }, [generateReport]);

  /**
   * Genera informe de optimización de stock.
   */
  const generateStockOptimizationReport = React.useCallback(async () => {
    return generateReport<StockOptimizationReport>(
      'STOCK_OPTIMIZATION',
      () => serviceRef.current.generateStockOptimizationReport(),
      false
    );
  }, [generateReport]);

  /**
   * Limpia el informe actual.
   */
  const clearReport = React.useCallback(() => {
    setReport(null);
    setError(null);
  }, []);

  /**
   * Limpia el cache de informes.
   */
  const clearCache = React.useCallback(() => {
    setReportCache(new Map());
  }, []);

  /**
   * Obtiene un informe del cache.
   */
  const getCachedReport = React.useCallback(
    (type: ReportType): Report | undefined => {
      return reportCache.get(type);
    },
    [reportCache]
  );

  return {
    report,
    loading,
    error,
    reportCache,
    generateInventoryReport,
    generateABCReport,
    generateMovementsReport,
    generateStockRotationReport,
    generateFinancialReport,
    generateBatchesReport,
    generateExpiringBatchesReport,
    generateDefectsReport,
    generateLowStockReport,
    generateSupplierQualityReport,
    generateConsumptionTrendsReport,
    generateReorderPredictionsReport,
    generateBatchAnomaliesReport,
    generateStockOptimizationReport,
    clearReport,
    clearCache,
    getCachedReport
  };
}

