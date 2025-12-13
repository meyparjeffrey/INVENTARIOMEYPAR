/**
 * Servicio de generación de informes.
 * 
 * Proporciona métodos para generar diferentes tipos de informes
 * con filtros, visualizaciones y exportaciones.
 * 
 * @module @application/services/ReportService
 * @requires @domain/entities/Report
 * @requires @infrastructure/repositories
 * @requires @infrastructure/supabase/supabaseClient
 */

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
  StockOptimizationReport,
  StockRotationReport,
  SupplierQualityReport
} from '@domain/entities/Report';
import type { Product } from '@domain/entities/Product';
import type { ProductBatch } from '@domain/entities/Product';
import type { InventoryMovement } from '@domain/entities/InventoryMovement';
import { supabaseClient } from '@infrastructure/supabase/supabaseClient';
import {
  SupabaseProductRepository,
  SupabaseInventoryMovementRepository,
  SupabaseSupplierRepository
} from '@infrastructure/repositories';

/**
 * Servicio de generación de informes.
 */
export class ReportService {
  private productRepo: SupabaseProductRepository;
  private movementRepo: SupabaseInventoryMovementRepository;
  private supplierRepo: SupabaseSupplierRepository;

  constructor() {
    this.productRepo = new SupabaseProductRepository(supabaseClient);
    this.movementRepo = new SupabaseInventoryMovementRepository(supabaseClient);
    this.supplierRepo = new SupabaseSupplierRepository(supabaseClient);
  }

  /**
   * Genera informe de inventario actual.
   * 
   * @param filters - Filtros para el informe
   * @returns Informe de inventario con productos y métricas
   */
  async generateInventoryReport(
    filters: InventoryReportFilters = {}
  ): Promise<InventoryReport> {
    const generatedAt = new Date().toISOString();

    // Obtener productos con filtros
    const productFilters: any = {
      includeInactive: filters.includeInactive ?? false,
      category: filters.category,
      warehouse: filters.warehouse
    };

    if (filters.lowStockOnly) {
      // Filtrar productos con stock bajo
      const allProducts = await this.productRepo.list(productFilters, {
        page: 1,
        pageSize: 10000
      } as any);

      const lowStockProducts = allProducts.data.filter(
        (p) => p.stockCurrent <= p.stockMin
      );

      return this.buildInventoryReport(lowStockProducts, filters, generatedAt);
    }

    const products = await this.productRepo.list(productFilters, {
      page: 1,
      pageSize: 10000
    });

    return this.buildInventoryReport(products.data, filters, generatedAt);
  }

  /**
   * Construye el informe de inventario a partir de productos.
   */
  private buildInventoryReport(
    products: Product[],
    filters: InventoryReportFilters,
    generatedAt: string
  ): InventoryReport {
    const items = products.map((product) => {
      const valueAtCost = product.stockCurrent * (product.costPrice ?? 0);
      const valueAtSale =
        product.stockCurrent * (product.salePrice ?? product.costPrice ?? 0);
      const location = `${product.aisle}/${product.shelf}${
        product.locationExtra ? ` - ${product.locationExtra}` : ''
      }`;

      return {
        product,
        currentStock: product.stockCurrent,
        stockMin: product.stockMin,
        stockMax: product.stockMax ?? undefined,
        valueAtCost,
        valueAtSale,
        location,
        category: product.category ?? undefined,
        isLowStock: product.stockCurrent <= product.stockMin,
        batchesCount: 0, // Se calculará si es necesario
        criticalBatchesCount: 0 // Se calculará si es necesario
      };
    });

    // Calcular resumen
    const totalValueAtCost = items.reduce((sum, item) => sum + item.valueAtCost, 0);
    const totalValueAtSale = items.reduce((sum, item) => sum + item.valueAtSale, 0);
    const totalUnits = items.reduce((sum, item) => sum + item.currentStock, 0);
    const lowStockCount = items.filter((item) => item.isLowStock).length;
    const categories = new Set(
      items.map((item) => item.category).filter((c) => c !== undefined)
    );

    return {
      type: 'INVENTORY',
      generatedAt,
      filters,
      items,
      summary: {
        totalProducts: items.length,
        totalValueAtCost,
        totalValueAtSale,
        totalUnits,
        lowStockCount,
        categoriesCount: categories.size
      }
    };
  }

  /**
   * Genera análisis ABC de productos.
   * 
   * Clasifica productos por valor (80/20) usando el principio de Pareto.
   * 
   * @returns Informe ABC con clasificación A, B, C
   */
  async generateABCReport(): Promise<ABCReport> {
    const generatedAt = new Date().toISOString();

    // Obtener todos los productos activos
    const products = await this.productRepo.list(
      { includeInactive: false },
      { page: 1, pageSize: 10000 }
    );

    // Calcular valor de cada producto
    const productsWithValue = products.data
      .map((product) => {
        const value =
          product.stockCurrent * (product.salePrice ?? product.costPrice ?? 0);
        return {
          product,
          value
        };
      })
      .filter((p) => p.value > 0)
      .sort((a, b) => b.value - a.value);

    const totalValue = productsWithValue.reduce((sum, p) => sum + p.value, 0);

    // Clasificar ABC
    let cumulativeValue = 0;
    const classifications = productsWithValue.map((item, index) => {
      cumulativeValue += item.value;
      const percentage = (item.value / totalValue) * 100;
      const cumulativePercentage = (cumulativeValue / totalValue) * 100;

      let category: 'A' | 'B' | 'C';
      if (cumulativePercentage <= 80) {
        category = 'A';
      } else if (cumulativePercentage <= 95) {
        category = 'B';
      } else {
        category = 'C';
      }

      return {
        category,
        product: item.product,
        value: item.value,
        percentage,
        cumulativePercentage
      };
    });

    // Calcular resumen por categoría
    const categoryA = classifications.filter((c) => c.category === 'A');
    const categoryB = classifications.filter((c) => c.category === 'B');
    const categoryC = classifications.filter((c) => c.category === 'C');

    return {
      type: 'ABC_ANALYSIS',
      generatedAt,
      classifications,
      summary: {
        categoryA: {
          count: categoryA.length,
          value: categoryA.reduce((sum, c) => sum + c.value, 0),
          percentage: categoryA.reduce((sum, c) => sum + c.percentage, 0)
        },
        categoryB: {
          count: categoryB.length,
          value: categoryB.reduce((sum, c) => sum + c.value, 0),
          percentage: categoryB.reduce((sum, c) => sum + c.percentage, 0)
        },
        categoryC: {
          count: categoryC.length,
          value: categoryC.reduce((sum, c) => sum + c.value, 0),
          percentage: categoryC.reduce((sum, c) => sum + c.percentage, 0)
        },
        totalValue
      }
    };
  }

  /**
   * Genera informe de movimientos por período.
   * 
   * @param filters - Filtros para el informe
   * @returns Informe de movimientos con datos y gráficos
   */
  async generateMovementsReport(
    filters: MovementsReportFilters = {}
  ): Promise<MovementsReport> {
    const generatedAt = new Date().toISOString();

    // Obtener movimientos con filtros
    const movementFilters: any = {
      productId: filters.productId ?? undefined,
      batchId: filters.batchId ?? undefined,
      userId: filters.userId ?? undefined,
      movementType: filters.movementType ?? undefined,
      reasonCategory: filters.reasonCategory ?? undefined,
      dateFrom: filters.dateFrom ?? undefined,
      dateTo: filters.dateTo ?? undefined
    };

    const movements = await this.movementRepo.list(movementFilters, {
      page: 1,
      pageSize: 10000
    });

    // Mapear movimientos con información extendida
    const items = movements.data.map((movement) => {
      // Obtener información del producto y usuario desde la query
      const movementRow = movement as any;
      const product = movementRow.products;
      const profile = movementRow.profiles;

      return {
        ...movement,
        productCode: product?.code ?? '',
        productName: product?.name ?? '',
        userName: profile
          ? `${profile.first_name} ${profile.last_name}`
          : undefined,
        batchCode: undefined // Se puede obtener si es necesario
      };
    });

    // Calcular resumen
    const totalEntries = items.filter((m) => m.movementType === 'IN').length;
    const totalExits = items.filter((m) => m.movementType === 'OUT').length;
    const totalAdjustments = items.filter(
      (m) => m.movementType === 'ADJUSTMENT'
    ).length;
    const totalTransfers = items.filter((m) => m.movementType === 'TRANSFER')
      .length;

    const entriesQuantity = items
      .filter((m) => m.movementType === 'IN')
      .reduce((sum, m) => sum + m.quantity, 0);
    const exitsQuantity = items
      .filter((m) => m.movementType === 'OUT')
      .reduce((sum, m) => sum + m.quantity, 0);

    // Generar datos para gráfico (últimos 7 días si no hay filtro de fecha)
    const chartData = await this.generateMovementsChartData(filters);

    return {
      type: 'MOVEMENTS',
      generatedAt,
      filters,
      items,
      summary: {
        totalMovements: items.length,
        totalEntries,
        totalExits,
        totalAdjustments,
        totalTransfers,
        entriesQuantity,
        exitsQuantity
      },
      chartData
    };
  }

  /**
   * Genera datos para gráfico de movimientos.
   */
  private async generateMovementsChartData(
    filters: MovementsReportFilters
  ): Promise<
    Array<{
      date: string;
      entries: number;
      exits: number;
      adjustments: number;
    }>
  > {
    const chartData: Array<{
      date: string;
      entries: number;
      exits: number;
      adjustments: number;
    }> = [];

    // Determinar rango de fechas
    let dateFrom: Date;
    let dateTo: Date = new Date();

    if (filters.dateFrom && filters.dateTo) {
      dateFrom = new Date(filters.dateFrom);
      dateTo = new Date(filters.dateTo);
    } else {
      // Por defecto, últimos 7 días
      dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 7);
    }

    // Generar datos por día
    const currentDate = new Date(dateFrom);
    while (currentDate <= dateTo) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const dayMovements = await this.movementRepo.list(
        {
          ...filters,
          dateFrom: dayStart.toISOString(),
          dateTo: dayEnd.toISOString()
        },
        { page: 1, pageSize: 10000 }
      );

      const entries = dayMovements.data
        .filter((m) => m.movementType === 'IN')
        .reduce((sum, m) => sum + m.quantity, 0);
      const exits = dayMovements.data
        .filter((m) => m.movementType === 'OUT')
        .reduce((sum, m) => sum + m.quantity, 0);
      const adjustments = dayMovements.data
        .filter((m) => m.movementType === 'ADJUSTMENT')
        .reduce((sum, m) => sum + m.quantity, 0);

      chartData.push({
        date: currentDate.toLocaleDateString('es-ES', {
          weekday: 'short',
          day: 'numeric'
        }),
        entries,
        exits,
        adjustments
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return chartData;
  }

  /**
   * Genera informe de rotación de stock.
   * 
   * @param period - Período para calcular rotación
   * @returns Informe de rotación de stock
   */
  async generateStockRotationReport(
    period: 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR' = 'MONTH'
  ): Promise<StockRotationReport> {
    const generatedAt = new Date().toISOString();

    // Calcular fecha de inicio según período
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case 'WEEK':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'MONTH':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'QUARTER':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'YEAR':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    // Obtener productos activos
    const products = await this.productRepo.list(
      { includeInactive: false },
      { page: 1, pageSize: 10000 } as any
    );

    // Obtener movimientos de salida en el período
    const exitMovements = await this.movementRepo.list(
      {
        movementType: 'OUT',
        dateFrom: startDate.toISOString(),
        dateTo: now.toISOString()
      },
      { page: 1, pageSize: 10000 }
    );

    // Calcular consumo por producto
    const consumptionByProduct = new Map<string, number>();
    exitMovements.data.forEach((movement) => {
      const current = consumptionByProduct.get(movement.productId) ?? 0;
      consumptionByProduct.set(movement.productId, current + movement.quantity);
    });

    // Calcular días del período
    const daysInPeriod = Math.ceil(
      (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Generar items de rotación
    const items = products.data.map((product) => {
      const totalConsumed = consumptionByProduct.get(product.id) ?? 0;
      const averageDailyConsumption = totalConsumed / daysInPeriod;
      const daysOfRotation =
        averageDailyConsumption > 0
          ? product.stockCurrent / averageDailyConsumption
          : Infinity;

      let rotationCategory: 'FAST' | 'MEDIUM' | 'SLOW' | 'NONE';
      if (daysOfRotation === Infinity || daysOfRotation > 90) {
        rotationCategory = 'NONE';
      } else if (daysOfRotation <= 30) {
        rotationCategory = 'FAST';
      } else if (daysOfRotation <= 60) {
        rotationCategory = 'MEDIUM';
      } else {
        rotationCategory = 'SLOW';
      }

      return {
        product,
        currentStock: product.stockCurrent,
        averageDailyConsumption,
        daysOfRotation: daysOfRotation === Infinity ? 0 : daysOfRotation,
        rotationCategory,
        totalConsumed,
        period
      };
    });

    // Calcular resumen
    const fastRotation = items.filter((i) => i.rotationCategory === 'FAST')
      .length;
    const mediumRotation = items.filter(
      (i) => i.rotationCategory === 'MEDIUM'
    ).length;
    const slowRotation = items.filter((i) => i.rotationCategory === 'SLOW')
      .length;
    const noRotation = items.filter((i) => i.rotationCategory === 'NONE')
      .length;

    return {
      type: 'STOCK_ROTATION',
      generatedAt,
      period,
      items,
      summary: {
        fastRotation,
        mediumRotation,
        slowRotation,
        noRotation
      }
    };
  }

  /**
   * Genera informe financiero.
   * 
   * @param filters - Filtros para el informe
   * @returns Informe financiero con valor de inventario y márgenes
   */
  async generateFinancialReport(
    filters: any = {}
  ): Promise<FinancialReport> {
    const generatedAt = new Date().toISOString();

    // Obtener productos con filtros
    const productFilters: any = {
      includeInactive: false,
      category: filters.category,
      warehouse: filters.warehouse
    };

    const products = await this.productRepo.list(productFilters, {
      page: 1,
      pageSize: 10000
    } as any);

    // Calcular valores totales
    let totalValueAtCost = 0;
    let totalValueAtSale = 0;
    let totalUnits = 0;

    const byCategory = new Map<
      string,
      { valueAtCost: number; valueAtSale: number; units: number }
    >();
    const byWarehouse = new Map<
      string,
      { valueAtCost: number; valueAtSale: number; units: number }
    >();

    products.data.forEach((product) => {
      const valueAtCost = product.stockCurrent * (product.costPrice ?? 0);
      const valueAtSale =
        product.stockCurrent * (product.salePrice ?? product.costPrice ?? 0);

      totalValueAtCost += valueAtCost;
      totalValueAtSale += valueAtSale;
      totalUnits += product.stockCurrent;

      // Por categoría
      const category = product.category ?? 'Sin categoría';
      const catData = byCategory.get(category) ?? {
        valueAtCost: 0,
        valueAtSale: 0,
        units: 0
      };
      catData.valueAtCost += valueAtCost;
      catData.valueAtSale += valueAtSale;
      catData.units += product.stockCurrent;
      byCategory.set(category, catData);

      // Por almacén
      const warehouse = product.warehouse ?? 'Sin almacén';
      const whData = byWarehouse.get(warehouse) ?? {
        valueAtCost: 0,
        valueAtSale: 0,
        units: 0
      };
      whData.valueAtCost += valueAtCost;
      whData.valueAtSale += valueAtSale;
      whData.units += product.stockCurrent;
      byWarehouse.set(warehouse, whData);
    });

    const potentialMargin = totalValueAtSale - totalValueAtCost;
    const marginPercentage =
      totalValueAtCost > 0
        ? (potentialMargin / totalValueAtCost) * 100
        : 0;

    // Convertir mapas a arrays
    const byCategoryArray = Array.from(byCategory.entries()).map(
      ([category, data]) => ({
        category,
        ...data,
        percentage: (data.valueAtCost / totalValueAtCost) * 100
      })
    );

    const byWarehouseArray = Array.from(byWarehouse.entries()).map(
      ([warehouse, data]) => ({
        warehouse,
        ...data
      })
    );

    return {
      type: 'FINANCIAL',
      generatedAt,
      filters,
      summary: {
        totalValueAtCost,
        totalValueAtSale,
        potentialMargin,
        marginPercentage,
        totalUnits
      },
      byCategory: byCategoryArray,
      byWarehouse: byWarehouseArray
    };
  }

  /**
   * Genera informe de lotes.
   * 
   * @param filters - Filtros para el informe
   * @returns Informe de lotes con estados y métricas
   */
  async generateBatchesReport(filters: any = {}): Promise<BatchesReport> {
    const generatedAt = new Date().toISOString();

    // Obtener lotes desde Supabase
    let query = supabaseClient.from('product_batches').select(`
      *,
      products!product_batches_product_id_fkey(*),
      suppliers!product_batches_supplier_id_fkey(name)
    `);

    if (filters.productId) {
      query = query.eq('product_id', filters.productId);
    }
    if (filters.supplierId) {
      query = query.eq('supplier_id', filters.supplierId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data: batches, error } = await query;

    if (error) {
      throw new Error(`Error al obtener lotes: ${error.message}`);
    }

    const items = (batches ?? []).map((batch: any) => {
      const product = batch.products;
      const supplier = batch.suppliers;

      // Calcular días hasta caducidad si existe
      let daysUntilExpiry: number | undefined;
      if (batch.expiry_date) {
        const expiryDate = new Date(batch.expiry_date);
        const now = new Date();
        daysUntilExpiry = Math.ceil(
          (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
      }

      return {
        batch: {
          id: batch.id,
          productId: batch.product_id,
          supplierId: batch.supplier_id,
          batchCode: batch.batch_code,
          batchBarcode: batch.batch_barcode,
          quantityTotal: batch.quantity_total,
          quantityAvailable: batch.quantity_available,
          quantityReserved: batch.quantity_reserved ?? 0,
          defectiveQty: batch.defective_qty ?? 0,
          status: batch.status,
          blockedReason: batch.blocked_reason,
          qualityScore: batch.quality_score ?? 1.0,
          receivedAt: batch.received_at,
          expiryDate: batch.expiry_date,
          manufactureDate: batch.manufacture_date,
          costPerUnit: batch.cost_per_unit,
          locationOverride: batch.location_override,
          notes: batch.notes,
          createdAt: batch.created_at,
          updatedAt: batch.updated_at,
          createdBy: batch.created_by
        } as ProductBatch,
        product: product as Product,
        supplierName: supplier?.name,
        daysUntilExpiry
      };
    });

    // Calcular resumen
    const okBatches = items.filter((i) => i.batch.status === 'OK').length;
    const defectiveBatches = items.filter(
      (i) => i.batch.status === 'DEFECTIVE'
    ).length;
    const blockedBatches = items.filter(
      (i) => i.batch.status === 'BLOCKED'
    ).length;
    const expiringBatches = items.filter(
      (i) => i.daysUntilExpiry !== undefined && i.daysUntilExpiry <= 30
    ).length;

    return {
      type: 'BATCHES',
      generatedAt,
      filters,
      items,
      summary: {
        totalBatches: items.length,
        okBatches,
        defectiveBatches,
        blockedBatches,
        expiringBatches
      }
    };
  }

  /**
   * Genera informe de lotes próximos a caducar.
   * 
   * @param days - Días de antelación para considerar próximo a caducar
   * @returns Informe de lotes próximos a caducar
   */
  async generateExpiringBatchesReport(
    days: number = 30
  ): Promise<ExpiringBatchesReport> {
    const generatedAt = new Date().toISOString();

    // Calcular fecha límite
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() + days);

    // Obtener lotes con fecha de caducidad
    const { data: batches, error } = await supabaseClient
      .from('product_batches')
      .select(`
        *,
        products!product_batches_product_id_fkey(*)
      `)
      .not('expiry_date', 'is', null)
      .lte('expiry_date', limitDate.toISOString().split('T')[0])
      .eq('status', 'OK');

    if (error) {
      throw new Error(`Error al obtener lotes: ${error.message}`);
    }

    const items = (batches ?? []).map((batch: any) => {
      const product = batch.products;
      const expiryDate = new Date(batch.expiry_date);
      const now = new Date();
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        batch: {
          id: batch.id,
          productId: batch.product_id,
          supplierId: batch.supplier_id,
          batchCode: batch.batch_code,
          batchBarcode: batch.batch_barcode,
          quantityTotal: batch.quantity_total,
          quantityAvailable: batch.quantity_available,
          quantityReserved: batch.quantity_reserved ?? 0,
          defectiveQty: batch.defective_qty ?? 0,
          status: batch.status,
          blockedReason: batch.blocked_reason,
          qualityScore: batch.quality_score ?? 1.0,
          receivedAt: batch.received_at,
          expiryDate: batch.expiry_date,
          manufactureDate: batch.manufacture_date,
          costPerUnit: batch.cost_per_unit,
          locationOverride: batch.location_override,
          notes: batch.notes,
          createdAt: batch.created_at,
          updatedAt: batch.updated_at,
          createdBy: batch.created_by
        } as ProductBatch,
        product: product as Product,
        daysUntilExpiry,
        isUrgent: daysUntilExpiry <= 7
      };
    });

    const urgent = items.filter((i) => i.isUrgent).length;
    const warning = items.filter((i) => !i.isUrgent).length;

    return {
      type: 'EXPIRING_BATCHES',
      generatedAt,
      days,
      items,
      summary: {
        totalExpiring: items.length,
        urgent,
        warning
      }
    };
  }

  /**
   * Genera informe de defectos.
   * 
   * @returns Informe de defectos con análisis por proveedor
   */
  async generateDefectsReport(): Promise<DefectsReport> {
    const generatedAt = new Date().toISOString();

    // Obtener lotes defectuosos
    const { data: batches, error } = await supabaseClient
      .from('product_batches')
      .select(`
        *,
        products!product_batches_product_id_fkey(*),
        suppliers!product_batches_supplier_id_fkey(id, name)
      `)
      .eq('status', 'DEFECTIVE');

    if (error) {
      throw new Error(`Error al obtener lotes defectuosos: ${error.message}`);
    }

    // Obtener reportes de defectos
    const { data: defectReports, error: defectError } = await supabaseClient
      .from('batch_defect_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (defectError) {
      throw new Error(
        `Error al obtener reportes de defectos: ${defectError.message}`
      );
    }

    const items = (batches ?? []).map((batch: any) => {
      const product = batch.products;
      const supplier = batch.suppliers;

      // Buscar reporte de defecto más reciente
      const defectReport = defectReports?.find(
        (dr: any) => dr.batch_id === batch.id
      );

      return {
        batch: {
          id: batch.id,
          productId: batch.product_id,
          supplierId: batch.supplier_id,
          batchCode: batch.batch_code,
          batchBarcode: batch.batch_barcode,
          quantityTotal: batch.quantity_total,
          quantityAvailable: batch.quantity_available,
          quantityReserved: batch.quantity_reserved ?? 0,
          defectiveQty: batch.defective_qty ?? 0,
          status: batch.status,
          blockedReason: batch.blocked_reason,
          qualityScore: batch.quality_score ?? 1.0,
          receivedAt: batch.received_at,
          expiryDate: batch.expiry_date,
          manufactureDate: batch.manufacture_date,
          costPerUnit: batch.cost_per_unit,
          locationOverride: batch.location_override,
          notes: batch.notes,
          createdAt: batch.created_at,
          updatedAt: batch.updated_at,
          createdBy: batch.created_by
        } as ProductBatch,
        product: product as Product,
        supplierName: supplier?.name,
        defectQuantity: batch.defective_qty ?? 0,
        defectType: defectReport?.defect_type ?? 'UNKNOWN',
        reportedAt: defectReport?.created_at ?? batch.updated_at
      };
    });

    // Calcular por proveedor
    const bySupplierMap = new Map<
      string,
      {
        supplierId: string;
        supplierName: string;
        totalDefects: number;
        totalBatches: number;
        defectRate: number;
      }
    >();

    // Obtener todos los lotes por proveedor para calcular tasa
    const { data: allBatches } = await supabaseClient
      .from('product_batches')
      .select('supplier_id, status');

    const supplierBatchesCount = new Map<string, number>();
    (allBatches ?? []).forEach((batch: any) => {
      if (batch.supplier_id) {
        const count = supplierBatchesCount.get(batch.supplier_id) ?? 0;
        supplierBatchesCount.set(batch.supplier_id, count + 1);
      }
    });

    items.forEach((item) => {
      if (item.batch.supplierId) {
        const supplierId = item.batch.supplierId;
        const supplierName = item.supplierName ?? 'Sin proveedor';
        const totalBatches = supplierBatchesCount.get(supplierId) ?? 1;

        const existing = bySupplierMap.get(supplierId);
        if (existing) {
          existing.totalDefects += 1;
          existing.defectRate =
            (existing.totalDefects / existing.totalBatches) * 100;
        } else {
          bySupplierMap.set(supplierId, {
            supplierId,
            supplierName,
            totalDefects: 1,
            totalBatches,
            defectRate: (1 / totalBatches) * 100
          });
        }
      }
    });

    const bySupplier = Array.from(bySupplierMap.values());
    const totalDefectiveUnits = items.reduce(
      (sum: number, item: any) => sum + item.defectQuantity,
      0
    );

    return {
      type: 'DEFECTS',
      generatedAt,
      items,
      bySupplier,
      summary: {
        totalDefects: items.length,
        totalDefectiveUnits,
        suppliersAffected: bySupplier.length
      }
    };
  }

  /**
   * Genera informe de stock bajo.
   * 
   * @returns Informe de productos con stock bajo
   */
  async generateLowStockReport(): Promise<LowStockReport> {
    const generatedAt = new Date().toISOString();

    // Obtener productos activos
    const products = await this.productRepo.list(
      { includeInactive: false },
      { page: 1, pageSize: 10000 } as any
    );

    // Filtrar productos con stock bajo
    const lowStockProducts = products.data.filter(
      (p) => p.stockCurrent <= p.stockMin
    );

    // Obtener movimientos de salida para calcular días estimados
    const exitMovements = await this.movementRepo.list(
      {
        movementType: 'OUT',
        dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      { page: 1, pageSize: 10000 }
    );

    // Calcular consumo por producto
    const consumptionByProduct = new Map<string, number>();
    exitMovements.data.forEach((movement) => {
      const current = consumptionByProduct.get(movement.productId) ?? 0;
      consumptionByProduct.set(movement.productId, current + movement.quantity);
    });

    const items = lowStockProducts.map((product) => {
      const totalConsumed = consumptionByProduct.get(product.id) ?? 0;
      const averageDailyConsumption = totalConsumed / 30;
      const estimatedDaysUntilEmpty =
        averageDailyConsumption > 0
          ? product.stockCurrent / averageDailyConsumption
          : Infinity;

      const deficit = product.stockMin - product.stockCurrent;
      const valueAtCost = product.stockCurrent * (product.costPrice ?? 0);
      const location = `${product.aisle}/${product.shelf}${
        product.locationExtra ? ` - ${product.locationExtra}` : ''
      }`;

      return {
        product,
        currentStock: product.stockCurrent,
        stockMin: product.stockMin,
        deficit,
        estimatedDaysUntilEmpty:
          estimatedDaysUntilEmpty === Infinity ? 0 : estimatedDaysUntilEmpty,
        valueAtCost,
        location
      };
    });

    // Calcular resumen
    const urgent = items.filter((i) => i.estimatedDaysUntilEmpty <= 7).length;
    const warning = items.filter(
      (i) => i.estimatedDaysUntilEmpty > 7 && i.estimatedDaysUntilEmpty <= 30
    ).length;
    const totalDeficit = items.reduce((sum, item) => sum + item.deficit, 0);
    const totalValue = items.reduce((sum, item) => sum + item.valueAtCost, 0);

    return {
      type: 'LOW_STOCK',
      generatedAt,
      items,
      summary: {
        totalProducts: items.length,
        totalDeficit,
        totalValue,
        urgent,
        warning
      }
    };
  }

  /**
   * Genera informe de calidad de proveedores.
   * 
   * @returns Informe de calidad de proveedores
   */
  async generateSupplierQualityReport(): Promise<SupplierQualityReport> {
    const generatedAt = new Date().toISOString();

    // Obtener todos los proveedores
    const suppliersResult = await this.supplierRepo.list({});
    const suppliers = Array.isArray(suppliersResult) ? suppliersResult : suppliersResult.data || [];

    // Obtener lotes por proveedor
    const { data: batches, error } = await supabaseClient
      .from('product_batches')
      .select('supplier_id, status, defective_qty');

    if (error) {
      throw new Error(`Error al obtener lotes: ${error.message}`);
    }

    // Calcular métricas por proveedor
    const items = suppliers.map((supplier: any) => {
      const supplierBatches = (batches ?? []).filter(
        (b: any) => b.supplier_id === supplier.id
      );
      const totalBatches = supplierBatches.length;
      const defectiveBatches = supplierBatches.filter(
        (b: any) => b.status === 'DEFECTIVE'
      ).length;
      const totalDefectiveUnits = supplierBatches.reduce(
        (sum: number, b: any) => sum + (b.defective_qty ?? 0),
        0
      );
      const defectRate = totalBatches > 0 ? (defectiveBatches / totalBatches) * 100 : 0;

      return {
        supplierId: supplier.id,
        supplierName: supplier.name,
        qualityRating: supplier.qualityRating ?? 5.0,
        totalBatches,
        defectiveBatches,
        defectRate,
        totalDefectiveUnits
      };
    });

    // Calcular resumen
    const averageRating =
      items.length > 0
        ? items.reduce((sum: number, item: any) => sum + item.qualityRating, 0) / items.length
        : 0;
    const suppliersWithDefects = items.filter((item: any) => item.defectiveBatches > 0)
      .length;

    return {
      type: 'SUPPLIER_QUALITY',
      generatedAt,
      items,
      summary: {
        totalSuppliers: items.length,
        averageRating,
        suppliersWithDefects
      }
    };
  }

  /**
   * Genera informe de tendencias de consumo.
   * 
   * @param period - Período para el análisis
   * @returns Informe de tendencias de consumo
   */
  async generateConsumptionTrendsReport(
    period: 'WEEK' | 'MONTH' | 'QUARTER' = 'MONTH'
  ): Promise<ConsumptionTrendsReport> {
    const generatedAt = new Date().toISOString();

    // Calcular fecha de inicio
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case 'WEEK':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'MONTH':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'QUARTER':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 3);
        break;
    }

    // Obtener movimientos de salida
    const exitMovements = await this.movementRepo.list(
      {
        movementType: 'OUT',
        dateFrom: startDate.toISOString(),
        dateTo: now.toISOString()
      },
      { page: 1, pageSize: 10000 }
    );

    // Agrupar por fecha y producto
    const byDate = new Map<
      string,
      {
        totalConsumed: number;
        byProduct: Map<string, number>;
      }
    >();

    exitMovements.data.forEach((movement) => {
      const date = new Date(movement.movementDate)
        .toISOString()
        .split('T')[0];
      const dayData = byDate.get(date) ?? {
        totalConsumed: 0,
        byProduct: new Map<string, number>()
      };

      dayData.totalConsumed += movement.quantity;
      const productConsumed =
        dayData.byProduct.get(movement.productId) ?? 0;
      dayData.byProduct.set(
        movement.productId,
        productConsumed + movement.quantity
      );
      byDate.set(date, dayData);
    });

    // Obtener productos para nombres
    const products = await this.productRepo.list(
      { includeInactive: false },
      { page: 1, pageSize: 10000 }
    );
    const productMap = new Map(products.data.map((p) => [p.id, p]));

    // Generar datos del gráfico
    const chartData = Array.from(byDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => {
        // Top 5 productos del día
        const topProducts = Array.from(data.byProduct.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([productId, quantity]) => {
            const product = productMap.get(productId);
            return {
              productId,
              productCode: product?.code ?? '',
              productName: product?.name ?? '',
              quantity
            };
          });

        return {
          date: new Date(date).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short'
          }),
          totalConsumed: data.totalConsumed,
          topProducts
        };
      });

    // Calcular top productos del período
    const consumptionByProduct = new Map<string, number>();
    exitMovements.data.forEach((movement) => {
      const current = consumptionByProduct.get(movement.productId) ?? 0;
      consumptionByProduct.set(movement.productId, current + movement.quantity);
    });

    const daysInPeriod = Math.ceil(
      (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const topProducts = Array.from(consumptionByProduct.entries())
      .map(([productId, totalConsumed]) => {
        const product = productMap.get(productId);
        if (!product) return null;

        const averageDaily = totalConsumed / daysInPeriod;

        // Calcular tendencia comparando primera y segunda mitad del período
        const firstHalf = exitMovements.data
          .filter(
            (m) =>
              m.productId === productId &&
              new Date(m.movementDate) <
                new Date(
                  startDate.getTime() +
                    (now.getTime() - startDate.getTime()) / 2
                )
          )
          .reduce((sum, m) => sum + m.quantity, 0);

        const secondHalf = exitMovements.data
          .filter(
            (m) =>
              m.productId === productId &&
              new Date(m.movementDate) >=
                new Date(
                  startDate.getTime() +
                    (now.getTime() - startDate.getTime()) / 2
                )
          )
          .reduce((sum, m) => sum + m.quantity, 0);

        let trend: 'INCREASING' | 'DECREASING' | 'STABLE';
        if (secondHalf > firstHalf * 1.1) {
          trend = 'INCREASING';
        } else if (secondHalf < firstHalf * 0.9) {
          trend = 'DECREASING';
        } else {
          trend = 'STABLE';
        }

        return {
          product,
          totalConsumed,
          averageDaily,
          trend
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.totalConsumed - a.totalConsumed)
      .slice(0, 20);

    return {
      type: 'CONSUMPTION_TRENDS',
      generatedAt,
      period,
      chartData,
      topProducts
    };
  }

  /**
   * Genera informe de predicciones de reposición (IA).
   * 
   * Nota: Este método debería usar tools MCP cuando estén disponibles.
   * Por ahora, implementa una versión básica.
   * 
   * @param daysAhead - Días de antelación para la predicción
   * @returns Informe de predicciones de reposición
   */
  async generateReorderPredictionsReport(
    daysAhead: number = 7
  ): Promise<ReorderPredictionsReport> {
    const generatedAt = new Date().toISOString();

    // Obtener productos activos
    const products = await this.productRepo.list(
      { includeInactive: false },
      { page: 1, pageSize: 10000 } as any
    );

    // Obtener movimientos de salida de los últimos 90 días
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const exitMovements = await this.movementRepo.list(
      {
        movementType: 'OUT',
        dateFrom: ninetyDaysAgo.toISOString()
      },
      { page: 1, pageSize: 10000 }
    );

    // Calcular consumo promedio diario por producto
    const consumptionByProduct = new Map<string, number>();
    exitMovements.data.forEach((movement) => {
      const current = consumptionByProduct.get(movement.productId) ?? 0;
      consumptionByProduct.set(movement.productId, current + movement.quantity);
    });

    const daysInPeriod = 90;
    const predictions: any[] = [];

    products.data.forEach((product) => {
      const totalConsumed = consumptionByProduct.get(product.id) ?? 0;
      const averageDailyConsumption = totalConsumed / daysInPeriod;

      if (averageDailyConsumption > 0) {
        const daysUntilMin =
          (product.stockCurrent - product.stockMin) / averageDailyConsumption;

        // Solo incluir productos que llegarán al mínimo en los días especificados
        if (daysUntilMin <= daysAhead && daysUntilMin > 0) {
          const suggestedReorderQuantity = Math.max(
            product.stockMin * 2 - product.stockCurrent,
            product.stockMin
          );

          // Calcular confianza basada en cantidad de datos
          const movementCount = exitMovements.data.filter(
            (m) => m.productId === product.id
          ).length;
          const confidence = Math.min(movementCount / 10, 1.0);

          predictions.push({
            productId: product.id,
            productCode: product.code,
            productName: product.name,
            currentStock: product.stockCurrent,
            stockMin: product.stockMin,
            averageDailyConsumption,
            daysUntilMin,
            suggestedReorderQuantity,
            confidence,
            preferredSupplier: undefined // Se puede obtener del producto
          });
        }
      }
    });

    // Ordenar por urgencia (días restantes ASC)
    predictions.sort((a, b) => a.daysUntilMin - b.daysUntilMin);

    const urgent = predictions.filter((p) => p.daysUntilMin <= 3).length;
    const warning = predictions.filter(
      (p) => p.daysUntilMin > 3 && p.daysUntilMin <= 7
    ).length;
    const totalSuggestedQuantity = predictions.reduce(
      (sum, p) => sum + p.suggestedReorderQuantity,
      0
    );

    return {
      type: 'REORDER_PREDICTIONS',
      generatedAt,
      daysAhead,
      predictions,
      summary: {
        totalPredictions: predictions.length,
        urgent,
        warning,
        totalSuggestedQuantity
      }
    };
  }

  /**
   * Genera informe de anomalías de lotes (IA).
   * 
   * Nota: Este método debería usar tools MCP cuando estén disponibles.
   * 
   * @returns Informe de anomalías detectadas
   */
  async generateBatchAnomaliesReport(): Promise<BatchAnomaliesReport> {
    const generatedAt = new Date().toISOString();

    // Obtener lotes con estados problemáticos
    const { data: batches, error } = await supabaseClient
      .from('product_batches')
      .select(`
        *,
        products!product_batches_product_id_fkey(*),
        suppliers!product_batches_supplier_id_fkey(name)
      `)
      .in('status', ['DEFECTIVE', 'BLOCKED']);

    if (error) {
      throw new Error(`Error al obtener lotes: ${error.message}`);
    }

    const anomalies: any[] = [];

    (batches ?? []).forEach((batch: any) => {
      const product = batch.products;

      // Anomalía: Lote defectuoso
      if (batch.status === 'DEFECTIVE') {
        anomalies.push({
          batchId: batch.id,
          batchCode: batch.batch_code,
          productId: batch.product_id,
          productCode: product?.code ?? '',
          productName: product?.name ?? '',
          anomalyType: 'HIGH_DEFECT_RATE',
          severity: batch.defective_qty > batch.quantity_total * 0.5 ? 'CRITICAL' : 'HIGH',
          description: `Lote con ${batch.defective_qty} unidades defectuosas de ${batch.quantity_total} total`,
          detectedAt: batch.updated_at
        });
      }

      // Anomalía: Lote bloqueado por mucho tiempo
      if (batch.status === 'BLOCKED') {
        const blockedDate = new Date(batch.updated_at);
        const daysBlocked = Math.ceil(
          (Date.now() - blockedDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysBlocked > 7) {
          anomalies.push({
            batchId: batch.id,
            batchCode: batch.batch_code,
            productId: batch.product_id,
            productCode: product?.code ?? '',
            productName: product?.name ?? '',
            anomalyType: 'BLOCKED_TOO_LONG',
            severity: daysBlocked > 30 ? 'CRITICAL' : daysBlocked > 14 ? 'HIGH' : 'MEDIUM',
            description: `Lote bloqueado hace ${daysBlocked} días: ${batch.blocked_reason}`,
            detectedAt: batch.updated_at
          });
        }
      }
    });

    // Detectar lotes próximos a caducar
    const { data: expiringBatches } = await supabaseClient
      .from('product_batches')
      .select(`
        *,
        products!product_batches_product_id_fkey(*)
      `)
      .not('expiry_date', 'is', null)
      .eq('status', 'OK')
      .lte('expiry_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    (expiringBatches ?? []).forEach((batch: any) => {
      const product = batch.products;
      const expiryDate = new Date(batch.expiry_date);
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      anomalies.push({
        batchId: batch.id,
        batchCode: batch.batch_code,
        productId: batch.product_id,
        productCode: product?.code ?? '',
        productName: product?.name ?? '',
        anomalyType: 'EXPIRING_SOON',
        severity: daysUntilExpiry <= 7 ? 'CRITICAL' : daysUntilExpiry <= 14 ? 'HIGH' : 'MEDIUM',
        description: `Lote caduca en ${daysUntilExpiry} días`,
        detectedAt: new Date().toISOString()
      });
    });

    // Calcular resumen
    const critical = anomalies.filter((a) => a.severity === 'CRITICAL').length;
    const high = anomalies.filter((a) => a.severity === 'HIGH').length;
    const medium = anomalies.filter((a) => a.severity === 'MEDIUM').length;
    const low = anomalies.filter((a) => a.severity === 'LOW').length;

    return {
      type: 'BATCH_ANOMALIES',
      generatedAt,
      anomalies,
      summary: {
        totalAnomalies: anomalies.length,
        critical,
        high,
        medium,
        low
      }
    };
  }

  /**
   * Genera informe de optimización de stock (IA).
   * 
   * Nota: Este método debería usar tools MCP cuando estén disponibles.
   * 
   * @returns Informe de sugerencias de optimización
   */
  async generateStockOptimizationReport(): Promise<StockOptimizationReport> {
    const generatedAt = new Date().toISOString();

    // Obtener productos activos
    const products = await this.productRepo.list(
      { includeInactive: false },
      { page: 1, pageSize: 10000 } as any
    );

    // Obtener movimientos de salida de los últimos 90 días
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const exitMovements = await this.movementRepo.list(
      {
        movementType: 'OUT',
        dateFrom: ninetyDaysAgo.toISOString()
      },
      { page: 1, pageSize: 10000 }
    );

    // Calcular consumo promedio diario
    const consumptionByProduct = new Map<string, number>();
    exitMovements.data.forEach((movement) => {
      const current = consumptionByProduct.get(movement.productId) ?? 0;
      consumptionByProduct.set(movement.productId, current + movement.quantity);
    });

    const daysInPeriod = 90;
    const optimizations: any[] = [];

    products.data.forEach((product) => {
      const totalConsumed = consumptionByProduct.get(product.id) ?? 0;
      const averageDailyConsumption = totalConsumed / daysInPeriod;

      if (averageDailyConsumption > 0) {
        // Calcular stock mínimo sugerido (30 días de consumo)
        const suggestedStockMin = Math.ceil(averageDailyConsumption * 30);
        const suggestedStockMax = suggestedStockMin * 2;

        // Solo sugerir si hay diferencia significativa
        if (
          Math.abs(suggestedStockMin - product.stockMin) >
          product.stockMin * 0.2
        ) {
          const movementCount = exitMovements.data.filter(
            (m) => m.productId === product.id
          ).length;
          const confidence = Math.min(movementCount / 10, 1.0);

          optimizations.push({
            productId: product.id,
            productCode: product.code,
            productName: product.name,
            currentStockMin: product.stockMin,
            suggestedStockMin,
            currentStockMax: product.stockMax ?? undefined,
            suggestedStockMax,
            reasoning: `Basado en consumo promedio de ${averageDailyConsumption.toFixed(2)} unidades/día en los últimos 90 días`,
            confidence
          });
        }
      }
    });

    // Calcular resumen
    const highConfidence = optimizations.filter((o) => o.confidence >= 0.7)
      .length;
    const mediumConfidence = optimizations.filter(
      (o) => o.confidence >= 0.4 && o.confidence < 0.7
    ).length;
    const lowConfidence = optimizations.filter((o) => o.confidence < 0.4)
      .length;

    return {
      type: 'STOCK_OPTIMIZATION',
      generatedAt,
      optimizations,
      summary: {
        totalOptimizations: optimizations.length,
        highConfidence,
        mediumConfidence,
        lowConfidence
      }
    };
  }
}

