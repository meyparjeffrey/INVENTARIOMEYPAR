import type { Nullable, Timestamp, UUID } from './common';
import type { Product } from './Product';
import type { InventoryMovement } from './InventoryMovement';
import type { ProductBatch } from './Product';

/**
 * Tipos de informes disponibles en el sistema.
 */
export type ReportType =
  | 'INVENTORY'
  | 'ABC_ANALYSIS'
  | 'MOVEMENTS'
  | 'STOCK_ROTATION'
  | 'FINANCIAL'
  | 'BATCHES'
  | 'EXPIRING_BATCHES'
  | 'DEFECTS'
  | 'LOW_STOCK'
  | 'SUPPLIER_QUALITY'
  | 'CONSUMPTION_TRENDS'
  | 'REORDER_PREDICTIONS'
  | 'BATCH_ANOMALIES'
  | 'STOCK_OPTIMIZATION';

/**
 * Categorías de informes para organización en la UI.
 */
export type ReportCategory =
  | 'INVENTORY'
  | 'MOVEMENTS'
  | 'BATCHES'
  | 'FINANCIAL'
  | 'SUPPLIERS'
  | 'ANALYSIS'
  | 'AI';

/**
 * Formato de exportación de informes.
 */
export type ReportExportFormat = 'EXCEL' | 'PDF' | 'CSV';

/**
 * Filtros base para informes con fechas.
 */
export interface BaseReportFilters {
  dateFrom?: Nullable<Timestamp>;
  dateTo?: Nullable<Timestamp>;
}

/**
 * Filtros para informe de inventario.
 */
export interface InventoryReportFilters extends BaseReportFilters {
  category?: Nullable<string>;
  includeInactive?: boolean;
  lowStockOnly?: boolean;
  withBatches?: boolean;
  warehouse?: Nullable<'MEYPAR' | 'OLIVA_TORRAS' | 'FURGONETA'>;
}

/**
 * Filtros para informe de movimientos.
 */
export interface MovementsReportFilters extends BaseReportFilters {
  productId?: Nullable<UUID>;
  batchId?: Nullable<UUID>;
  userId?: Nullable<UUID>;
  movementType?: Nullable<'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER'>;
  reasonCategory?: Nullable<string>;
}

/**
 * Filtros para informe de lotes.
 */
export interface BatchesReportFilters extends BaseReportFilters {
  productId?: Nullable<UUID>;
  supplierId?: Nullable<UUID>;
  status?: Nullable<'OK' | 'DEFECTIVE' | 'BLOCKED' | 'CONSUMED' | 'EXPIRED'>;
  expiringDays?: Nullable<number>;
}

/**
 * Filtros para informe financiero.
 */
export interface FinancialReportFilters extends BaseReportFilters {
  category?: Nullable<string>;
  warehouse?: Nullable<'MEYPAR' | 'OLIVA_TORRAS' | 'FURGONETA'>;
}

/**
 * Datos de un producto en un informe de inventario.
 */
export interface InventoryReportItem {
  product: Product;
  currentStock: number;
  stockMin: number;
  stockMax?: Nullable<number>;
  valueAtCost: number;
  valueAtSale: number;
  location: string;
  category?: Nullable<string>;
  isLowStock: boolean;
  batchesCount?: number;
  criticalBatchesCount?: number;
}

/**
 * Informe de inventario actual.
 */
export interface InventoryReport {
  type: 'INVENTORY';
  generatedAt: Timestamp;
  filters: InventoryReportFilters;
  items: InventoryReportItem[];
  summary: {
    totalProducts: number;
    totalValueAtCost: number;
    totalValueAtSale: number;
    totalUnits: number;
    lowStockCount: number;
    categoriesCount: number;
  };
}

/**
 * Clasificación ABC de un producto.
 */
export interface ABCClassification {
  category: 'A' | 'B' | 'C';
  product: Product;
  value: number;
  percentage: number;
  cumulativePercentage: number;
}

/**
 * Informe de análisis ABC.
 */
export interface ABCReport {
  type: 'ABC_ANALYSIS';
  generatedAt: Timestamp;
  classifications: ABCClassification[];
  summary: {
    categoryA: { count: number; value: number; percentage: number };
    categoryB: { count: number; value: number; percentage: number };
    categoryC: { count: number; value: number; percentage: number };
    totalValue: number;
  };
}

/**
 * Datos de movimiento con información extendida.
 */
export interface MovementReportItem extends InventoryMovement {
  productCode: string;
  productName: string;
  userName?: Nullable<string>;
  batchCode?: Nullable<string>;
}

/**
 * Informe de movimientos.
 */
export interface MovementsReport {
  type: 'MOVEMENTS';
  generatedAt: Timestamp;
  filters: MovementsReportFilters;
  items: MovementReportItem[];
  summary: {
    totalMovements: number;
    totalEntries: number;
    totalExits: number;
    totalAdjustments: number;
    totalTransfers: number;
    entriesQuantity: number;
    exitsQuantity: number;
  };
  chartData: Array<{
    date: string;
    entries: number;
    exits: number;
    adjustments: number;
  }>;
}

/**
 * Datos de rotación de stock.
 */
export interface StockRotationItem {
  product: Product;
  currentStock: number;
  averageDailyConsumption: number;
  daysOfRotation: number;
  rotationCategory: 'FAST' | 'MEDIUM' | 'SLOW' | 'NONE';
  totalConsumed: number;
  period: string;
}

/**
 * Informe de rotación de stock.
 */
export interface StockRotationReport {
  type: 'STOCK_ROTATION';
  generatedAt: Timestamp;
  period: 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR';
  items: StockRotationItem[];
  summary: {
    fastRotation: number;
    mediumRotation: number;
    slowRotation: number;
    noRotation: number;
  };
}

/**
 * Informe financiero.
 */
export interface FinancialReport {
  type: 'FINANCIAL';
  generatedAt: Timestamp;
  filters: FinancialReportFilters;
  summary: {
    totalValueAtCost: number;
    totalValueAtSale: number;
    potentialMargin: number;
    marginPercentage: number;
    totalUnits: number;
  };
  byCategory: Array<{
    category: string;
    valueAtCost: number;
    valueAtSale: number;
    units: number;
    percentage: number;
  }>;
  byWarehouse: Array<{
    warehouse: string;
    valueAtCost: number;
    valueAtSale: number;
    units: number;
  }>;
}

/**
 * Informe de lotes.
 */
export interface BatchesReport {
  type: 'BATCHES';
  generatedAt: Timestamp;
  filters: BatchesReportFilters;
  items: Array<{
    batch: ProductBatch;
    product: Product;
    supplierName?: Nullable<string>;
    daysUntilExpiry?: Nullable<number>;
  }>;
  summary: {
    totalBatches: number;
    okBatches: number;
    defectiveBatches: number;
    blockedBatches: number;
    expiringBatches: number;
  };
}

/**
 * Informe de lotes próximos a caducar.
 */
export interface ExpiringBatchesReport {
  type: 'EXPIRING_BATCHES';
  generatedAt: Timestamp;
  days: number;
  items: Array<{
    batch: ProductBatch;
    product: Product;
    daysUntilExpiry: number;
    isUrgent: boolean;
  }>;
  summary: {
    totalExpiring: number;
    urgent: number;
    warning: number;
  };
}

/**
 * Informe de defectos.
 */
export interface DefectsReport {
  type: 'DEFECTS';
  generatedAt: Timestamp;
  items: Array<{
    batch: ProductBatch;
    product: Product;
    supplierName?: Nullable<string>;
    defectQuantity: number;
    defectType: string;
    reportedAt: Timestamp;
  }>;
  bySupplier: Array<{
    supplierId: UUID;
    supplierName: string;
    totalDefects: number;
    totalBatches: number;
    defectRate: number;
  }>;
  summary: {
    totalDefects: number;
    totalDefectiveUnits: number;
    suppliersAffected: number;
  };
}

/**
 * Informe de stock bajo.
 */
export interface LowStockReport {
  type: 'LOW_STOCK';
  generatedAt: Timestamp;
  items: Array<{
    product: Product;
    currentStock: number;
    stockMin: number;
    deficit: number;
    estimatedDaysUntilEmpty: number;
    valueAtCost: number;
    location: string;
  }>;
  summary: {
    totalProducts: number;
    totalDeficit: number;
    totalValue: number;
    urgent: number;
    warning: number;
  };
}

/**
 * Informe de calidad de proveedores.
 */
export interface SupplierQualityReport {
  type: 'SUPPLIER_QUALITY';
  generatedAt: Timestamp;
  items: Array<{
    supplierId: UUID;
    supplierName: string;
    qualityRating: number;
    totalBatches: number;
    defectiveBatches: number;
    defectRate: number;
    totalDefectiveUnits: number;
  }>;
  summary: {
    totalSuppliers: number;
    averageRating: number;
    suppliersWithDefects: number;
  };
}

/**
 * Informe de tendencias de consumo.
 */
export interface ConsumptionTrendsReport {
  type: 'CONSUMPTION_TRENDS';
  generatedAt: Timestamp;
  period: 'WEEK' | 'MONTH' | 'QUARTER';
  chartData: Array<{
    date: string;
    totalConsumed: number;
    topProducts: Array<{
      productId: UUID;
      productCode: string;
      productName: string;
      quantity: number;
    }>;
  }>;
  topProducts: Array<{
    product: Product;
    totalConsumed: number;
    averageDaily: number;
    trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  }>;
}

/**
 * Predicción de reposición de un producto.
 */
export interface ReorderPrediction {
  productId: UUID;
  productCode: string;
  productName: string;
  currentStock: number;
  stockMin: number;
  averageDailyConsumption: number;
  daysUntilMin: number;
  suggestedReorderQuantity: number;
  confidence: number;
  preferredSupplier?: Nullable<{
    id: UUID;
    name: string;
    leadTimeDays: number;
  }>;
}

/**
 * Informe de predicciones de reposición (IA).
 */
export interface ReorderPredictionsReport {
  type: 'REORDER_PREDICTIONS';
  generatedAt: Timestamp;
  daysAhead: number;
  predictions: ReorderPrediction[];
  summary: {
    totalPredictions: number;
    urgent: number;
    warning: number;
    totalSuggestedQuantity: number;
  };
}

/**
 * Anomalía detectada en un lote.
 */
export interface BatchAnomaly {
  batchId: UUID;
  batchCode: string;
  productId: UUID;
  productCode: string;
  productName: string;
  anomalyType: 'HIGH_DEFECT_RATE' | 'ABNORMAL_CONSUMPTION' | 'EXPIRING_SOON' | 'BLOCKED_TOO_LONG';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  detectedAt: Timestamp;
}

/**
 * Informe de anomalías de lotes (IA).
 */
export interface BatchAnomaliesReport {
  type: 'BATCH_ANOMALIES';
  generatedAt: Timestamp;
  anomalies: BatchAnomaly[];
  summary: {
    totalAnomalies: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

/**
 * Sugerencia de optimización de stock.
 */
export interface StockOptimization {
  productId: UUID;
  productCode: string;
  productName: string;
  currentStockMin: number;
  suggestedStockMin: number;
  currentStockMax?: Nullable<number>;
  suggestedStockMax?: Nullable<number>;
  reasoning: string;
  confidence: number;
}

/**
 * Informe de optimización de stock (IA).
 */
export interface StockOptimizationReport {
  type: 'STOCK_OPTIMIZATION';
  generatedAt: Timestamp;
  optimizations: StockOptimization[];
  summary: {
    totalOptimizations: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
  };
}

/**
 * Unión de todos los tipos de informes.
 */
export type Report =
  | InventoryReport
  | ABCReport
  | MovementsReport
  | StockRotationReport
  | FinancialReport
  | BatchesReport
  | ExpiringBatchesReport
  | DefectsReport
  | LowStockReport
  | SupplierQualityReport
  | ConsumptionTrendsReport
  | ReorderPredictionsReport
  | BatchAnomaliesReport
  | StockOptimizationReport;

/**
 * Configuración de exportación de un informe.
 */
export interface ReportExportConfig {
  format: ReportExportFormat;
  includeCharts?: boolean;
  includeFilters?: boolean;
  columns?: string[];
  fileName?: string;
  language?: 'es-ES' | 'ca-ES';
}

/**
 * Metadatos de un informe generado.
 */
export interface ReportMetadata {
  id: UUID;
  type: ReportType;
  category: ReportCategory;
  generatedAt: Timestamp;
  generatedBy: UUID;
  filters: Record<string, unknown>;
  exportConfig?: Nullable<ReportExportConfig>;
}

