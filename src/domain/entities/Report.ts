/**
 * Entidades y tipos relacionados con informes.
 *
 * Define las interfaces y tipos para los diferentes tipos de informes,
 * KPIs, filtros y datos de visualización.
 *
 * @module @domain/entities/Report
 */

import type { UUID } from './common';

/**
 * Tipo de informe predefinido.
 */
export type ReportType =
  | 'executive_summary'
  | 'stock_analysis'
  | 'movements_analysis'
  | 'batches_control'
  | 'suppliers_analysis'
  | 'audit'
  | 'locations'
  | 'ai_suggestions'
  | 'custom';

/**
 * Formato de exportación.
 */
export type ExportFormat = 'xlsx' | 'pdf' | 'csv' | 'json';

/**
 * Tipo de gráfico disponible.
 */
export type ChartType =
  | 'area'
  | 'bar'
  | 'line'
  | 'pie'
  | 'scatter'
  | 'heatmap'
  | 'gauge'
  | 'treemap'
  | 'sankey'
  | 'radar';

/**
 * Filtros para informes.
 */
export interface ReportFilters {
  dateFrom?: string; // ISO string
  dateTo?: string; // ISO string
  warehouse?: 'MEYPAR' | 'OLIVA_TORRAS' | 'FURGONETA';
  category?: string;
  supplierId?: UUID;
  productId?: UUID;
  userId?: UUID;
  includeInactive?: boolean;
  [key: string]: unknown; // Para filtros adicionales específicos de cada informe
}

/**
 * KPIs de un informe.
 */
export interface ReportKPIs {
  [key: string]: number | string | Record<string, number> | null;
}

/**
 * Datos para gráficos.
 */
export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    [key: string]: unknown;
  }>;
}

/**
 * Configuración de un gráfico.
 */
export interface ChartConfig {
  type: ChartType;
  title: string;
  data: ChartData;
  options?: Record<string, unknown>;
}

/**
 * Datos de tabla de un informe.
 */
export interface ReportTableData {
  headers: string[];
  rows: Array<Record<string, string | number | null>>;
  totals?: Record<string, string | number>;
}

/**
 * Informe base con estructura común.
 */
export interface BaseReport {
  id: string;
  type: ReportType;
  title: string;
  description: string;
  generatedAt: string; // ISO string
  generatedBy?: UUID;
  filters: ReportFilters;
  kpis: ReportKPIs;
  charts: ChartConfig[];
  tableData: ReportTableData;
  language: 'es-ES' | 'ca-ES';
}

/**
 * Resumen ejecutivo del inventario.
 */
export interface ExecutiveSummaryReport extends BaseReport {
  type: 'executive_summary';
  kpis: BaseReport['kpis'] & {
    totalValue: number; // Valor total del inventario
    totalProducts: number; // Productos activos
    lowStockCount: number; // Productos en alarma
    movementsCount: number; // Movimientos en el período
    turnoverRate: number; // Rotación de inventario
    avgStockValue: number; // Valor promedio por producto
    productsWithoutMovement: number; // Productos sin movimiento en X días
  };
}

/**
 * Análisis de stock y alarmas.
 */
export interface StockAnalysisReport extends BaseReport {
  type: 'stock_analysis';
  kpis: BaseReport['kpis'] & {
    criticalCount: number; // stock < stock_min
    highAlertCount: number; // stock_min <= stock <= stock_min * 1.15
    mediumAlertCount: number; // stock_min * 1.15 < stock <= stock_min * 1.5
    avgDaysUntilDepletion: number; // Días promedio hasta agotarse
  };
  criticalProducts?: Array<{
    id: UUID;
    code: string;
    name: string;
    stockCurrent: number;
    stockMin: number;
    daysUntilDepletion: number;
    suggestedReorder: number;
  }>;
}

/**
 * Análisis de movimientos.
 */
export interface MovementsAnalysisReport extends BaseReport {
  type: 'movements_analysis';
  kpis: BaseReport['kpis'] & {
    totalEntries: number;
    totalExits: number;
    totalAdjustments: number;
    totalTransfers: number;
    movementsByWarehouse: Record<string, number>;
    topMovedProducts: number;
  };
  movementsByReason?: Record<string, number>;
  movementsByUser?: Array<{
    userId: UUID;
    userName: string;
    count: number;
  }>;
}

/**
 * Control de lotes.
 */
export interface BatchesReport extends BaseReport {
  type: 'batches_control';
  kpis: BaseReport['kpis'] & {
    totalBatches: number;
    okBatches: number;
    defectiveBatches: number;
    blockedBatches: number;
    expiredBatches: number;
    expiringSoon30: number; // Próximos a caducar en 30 días
    expiringSoon60: number; // Próximos a caducar en 60 días
  };
  expiringBatches?: Array<{
    id: UUID;
    batchCode: string;
    productName: string;
    expiryDate: string;
    daysUntilExpiry: number;
    quantityAvailable: number;
  }>;
}

/**
 * Análisis de proveedores.
 */
export interface SuppliersReport extends BaseReport {
  type: 'suppliers_analysis';
  kpis: BaseReport['kpis'] & {
    activeSuppliers: number;
    inactiveSuppliers: number;
    totalBatchesSupplied: number;
    totalDefectiveBatches: number;
    avgQualityRating: number;
    avgLeadTime: number;
  };
  suppliersData?: Array<{
    id: UUID;
    name: string;
    batchesSupplied: number;
    defectiveRate: number;
    qualityRating: number;
    leadTimeDays: number;
    totalValue: number;
  }>;
}

/**
 * Informe de auditoría.
 */
export interface AuditReport extends BaseReport {
  type: 'audit';
  kpis: BaseReport['kpis'] & {
    totalActions: number;
    creates: number;
    updates: number;
    deletes: number;
    views: number;
    exports: number;
    logins: number;
    mostActiveUser: string;
  };
  actionsByType?: Record<string, number>;
  activityByUser?: Array<{
    userId: UUID;
    userName: string;
    actionCount: number;
  }>;
}

/**
 * Análisis de ubicaciones.
 */
export interface LocationsReport extends BaseReport {
  type: 'locations';
  kpis: BaseReport['kpis'] & {
    totalLocations: number;
    locationsByWarehouse: Record<string, number>;
    productsWithoutLocation: number;
    avgProductsPerLocation: number;
  };
  stockByWarehouse?: Record<string, number>;
  topLocations?: Array<{
    warehouse: string;
    aisle: string;
    shelf: string;
    productCount: number;
    totalStock: number;
  }>;
}

/**
 * Informe de sugerencias de IA.
 */
export interface AISuggestionsReport extends BaseReport {
  type: 'ai_suggestions';
  kpis: BaseReport['kpis'] & {
    activeSuggestions: number;
    pending: number;
    accepted: number;
    dismissed: number;
    expired: number;
    acceptanceRate: number;
  };
  suggestionsByType?: Record<string, number>;
  suggestionsByPriority?: Record<string, number>;
}

/**
 * Informe personalizado.
 */
export interface CustomReport extends BaseReport {
  type: 'custom';
  templateId?: UUID;
  templateName?: string;
}

/**
 * Unión de todos los tipos de informe.
 */
export type Report =
  | ExecutiveSummaryReport
  | StockAnalysisReport
  | MovementsAnalysisReport
  | BatchesReport
  | SuppliersReport
  | AuditReport
  | LocationsReport
  | AISuggestionsReport
  | CustomReport;

/**
 * Configuración de programación de informe.
 */
export interface ReportSchedule {
  id: UUID;
  reportType: ReportType;
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  time: string; // HH:mm
  dayOfWeek?: number; // 0-6 para weekly
  dayOfMonth?: number; // 1-31 para monthly
  recipients: string[]; // Emails
  format: ExportFormat[];
  enabled: boolean;
  filters: ReportFilters;
  createdAt: string;
  updatedAt: string;
}

/**
 * Plantilla de informe personalizado.
 */
export interface ReportTemplate {
  id: UUID;
  name: string;
  description?: string;
  createdBy: UUID;
  createdAt: string;
  updatedAt: string;
  config: {
    tables: string[];
    fields: Record<string, string[]>;
    filters: ReportFilters;
    visualizations: ChartConfig[];
    aggregations?: Record<string, 'sum' | 'avg' | 'count' | 'min' | 'max'>;
  };
}
