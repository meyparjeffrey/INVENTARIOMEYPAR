/**
 * Servicio de generación de informes.
 *
 * Coordina la obtención de datos, cálculos, agregaciones
 * y preparación para visualización y exportación.
 *
 * @module @application/services/ReportService
 * @requires @domain/entities/Report
 * @requires @domain/repositories/ProductRepository
 * @requires @infrastructure/supabase/supabaseClient
 */

import type {
  ReportFilters,
  ReportKPIs,
  ChartConfig,
  ChartData,
  ChartType,
  ExecutiveSummaryReport,
  StockAnalysisReport,
  MovementsAnalysisReport,
  BatchesReport,
  SuppliersReport,
  AuditReport,
  LocationsReport,
  AISuggestionsReport,
} from '@domain/entities/Report';
import type { Product } from '@domain/entities';
import type { ProductRepository } from '@domain/repositories/ProductRepository';
import { SupabaseProductRepository } from '@infrastructure/repositories/SupabaseProductRepository';
import { supabaseClient } from '@infrastructure/supabase/supabaseClient';

/**
 * Servicio de generación de informes.
 */
export class ReportService {
  constructor(
    private productRepository: ProductRepository = new SupabaseProductRepository(),
    private language: 'es-ES' | 'ca-ES' = 'ca-ES',
  ) {}

  /**
   * Establece el idioma para las traducciones.
   */
  setLanguage(language: 'es-ES' | 'ca-ES'): void {
    this.language = language;
  }

  /**
   * Genera resumen ejecutivo del inventario.
   */
  async generateExecutiveSummary(
    filters: ReportFilters,
  ): Promise<ExecutiveSummaryReport> {
    // Obtener todos los productos activos
    const products = await this.productRepository.getAll({
      includeInactive: filters.includeInactive ?? false,
      warehouse: filters.warehouse,
      category: filters.category,
    });

    // Calcular valor total del inventario
    const totalValue = products.reduce((sum, p) => {
      const value = Number(p.costPrice) * p.stockCurrent;
      return sum + (isNaN(value) ? 0 : value);
    }, 0);

    // Contar productos en alarma
    const lowStockCount = products.filter((p) => p.stockCurrent < p.stockMin).length;

    // Obtener movimientos del período
    let movementsCount = 0;
    if (filters.dateFrom || filters.dateTo) {
      const { count } = await supabaseClient
        .from('inventory_movements')
        .select('*', { count: 'exact', head: true })
        .gte('movement_date', filters.dateFrom || '1900-01-01')
        .lte('movement_date', filters.dateTo || new Date().toISOString());
      movementsCount = count || 0;
    } else {
      // Últimos 30 días por defecto
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { count } = await supabaseClient
        .from('inventory_movements')
        .select('*', { count: 'exact', head: true })
        .gte('movement_date', thirtyDaysAgo.toISOString());
      movementsCount = count || 0;
    }

    // Calcular rotación de inventario (simplificado: movimientos / productos)
    const turnoverRate =
      products.length > 0 ? Number((movementsCount / products.length).toFixed(2)) : 0;

    // Valor promedio por producto
    const avgStockValue = products.length > 0 ? totalValue / products.length : 0;

    // Productos sin movimiento (últimos 90 días)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const { data: recentMovements } = await supabaseClient
      .from('inventory_movements')
      .select('product_id')
      .gte('movement_date', ninetyDaysAgo.toISOString());
    const productsWithMovement = new Set(recentMovements?.map((m) => m.product_id) || []);
    const productsWithoutMovement = products.filter(
      (p) => !productsWithMovement.has(p.id),
    ).length;

    // Preparar KPIs
    const kpis: ExecutiveSummaryReport['kpis'] = {
      totalValue,
      totalProducts: products.length,
      lowStockCount,
      movementsCount,
      turnoverRate,
      avgStockValue,
      productsWithoutMovement,
    };

    // Preparar gráficos
    const charts = this.prepareExecutiveSummaryCharts(products);

    // Preparar tabla de datos
    const tableData = this.prepareExecutiveSummaryTable(products);

    return {
      id: `executive_summary_${Date.now()}`,
      type: 'executive_summary',
      title:
        this.language === 'ca-ES'
          ? "Resum Executiu de l'Inventari"
          : 'Resumen Ejecutivo del Inventario',
      description:
        this.language === 'ca-ES'
          ? "KPIs principals, valor de l'inventari i mètriques clau"
          : 'KPIs principales, valor del inventario y métricas clave',
      generatedAt: new Date().toISOString(),
      filters,
      kpis,
      charts,
      tableData,
      language: this.language,
    };
  }

  /**
   * Prepara gráficos para el resumen ejecutivo.
   */
  private prepareExecutiveSummaryCharts(products: Product[]): ChartConfig[] {
    const charts: ChartConfig[] = [];

    // Gráfico de distribución por categoría
    const categoryCounts = products.reduce(
      (acc, p) => {
        const category = p.category || 'Sin categoría';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    charts.push({
      type: 'pie',
      title:
        this.language === 'ca-ES'
          ? 'Distribució per Categoria'
          : 'Distribución por Categoría',
      data: {
        labels: Object.keys(categoryCounts),
        datasets: [
          {
            label: this.language === 'ca-ES' ? 'Productes' : 'Productos',
            data: Object.values(categoryCounts),
          },
        ],
      },
    });

    // Gráfico de top 10 productos por valor
    const productsByValue = products
      .map((p) => ({
        code: p.code,
        name: p.name,
        value: Number(p.costPrice) * p.stockCurrent,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    charts.push({
      type: 'bar',
      title:
        this.language === 'ca-ES'
          ? 'Top 10 Productes per Valor'
          : 'Top 10 Productos por Valor',
      data: {
        labels: productsByValue.map((p) => p.code),
        datasets: [
          {
            label: this.language === 'ca-ES' ? 'Valor (€)' : 'Valor (€)',
            data: productsByValue.map((p) => p.value),
          },
        ],
      },
    });

    return charts;
  }

  /**
   * Prepara tabla de datos para el resumen ejecutivo.
   */
  private prepareExecutiveSummaryTable(products: Product[]): {
    headers: string[];
    rows: Array<Record<string, string | number | null>>;
    totals?: Record<string, string | number>;
  } {
    const headers =
      this.language === 'ca-ES'
        ? [
            'Codi',
            'Nom',
            'Categoria',
            'Estoc Actual',
            'Estoc Mínim',
            'Preu Cost',
            'Valor',
          ]
        : [
            'Código',
            'Nombre',
            'Categoría',
            'Stock Actual',
            'Stock Mínimo',
            'Precio Coste',
            'Valor',
          ];

    const rows = products.map((p) => {
      const costPrice = p.costPrice ?? 0;
      const costPriceValue = Number(costPrice) || 0;
      const value = costPriceValue * p.stockCurrent;
      
      return {
        [headers[0]]: p.code,
        [headers[1]]: p.name,
        [headers[2]]: p.category || '-',
        [headers[3]]: p.stockCurrent,
        [headers[4]]: p.stockMin,
        [headers[5]]: costPriceValue > 0 ? costPriceValue.toFixed(2) : '0.00',
        [headers[6]]: value > 0 ? value.toFixed(2) : '0.00',
      };
    });

    const totals = {
      [headers[0]]: this.language === 'ca-ES' ? 'TOTAL' : 'TOTAL',
      [headers[1]]: '',
      [headers[2]]: '',
      [headers[3]]: products.reduce((sum, p) => sum + p.stockCurrent, 0),
      [headers[4]]: '',
      [headers[5]]: '',
      [headers[6]]: products
        .reduce((sum, p) => {
          const costPrice = p.costPrice ?? 0;
          const costPriceValue = Number(costPrice) || 0;
          return sum + costPriceValue * p.stockCurrent;
        }, 0)
        .toFixed(2),
    };

    return { headers, rows, totals };
  }

  /**
   * Genera análisis de stock y alarmas.
   */
  async generateStockAnalysis(filters: ReportFilters): Promise<StockAnalysisReport> {
    const products = await this.productRepository.getAll({
      includeInactive: filters.includeInactive ?? false,
      warehouse: filters.warehouse,
      category: filters.category,
    });

    // Productos críticos (stock < stock_min)
    const criticalProducts = products.filter((p) => p.stockCurrent < p.stockMin);
    const criticalCount = criticalProducts.length;

    // Alta alerta (stock_min <= stock <= stock_min * 1.15)
    const highAlertCount = products.filter(
      (p) => p.stockCurrent >= p.stockMin && p.stockCurrent <= p.stockMin * 1.15,
    ).length;

    // Alerta media (stock_min * 1.15 < stock <= stock_min * 1.5)
    const mediumAlertCount = products.filter(
      (p) => p.stockCurrent > p.stockMin * 1.15 && p.stockCurrent <= p.stockMin * 1.5,
    ).length;

    // Calcular días promedio hasta agotarse (simplificado)
    const productsWithMovement = criticalProducts
      .map((p) => {
        const dailyConsumption = p.stockMin / 30; // Asumiendo consumo diario basado en stock_min
        return dailyConsumption > 0 ? p.stockCurrent / dailyConsumption : 0;
      })
      .filter((days) => days > 0);
    const avgDaysUntilDepletion =
      productsWithMovement.length > 0
        ? productsWithMovement.reduce((a, b) => a + b, 0) / productsWithMovement.length
        : 0;

    // Productos críticos con sugerencias de reposición
    // Removido .slice(0, 50) para exportar TODOS los productos críticos
    const criticalProductsData = criticalProducts
      .map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        stockCurrent: p.stockCurrent,
        stockMin: p.stockMin,
        daysUntilDepletion: Math.floor(
          (p.stockMin / 30 > 0 ? p.stockCurrent / (p.stockMin / 30) : 0),
        ),
        suggestedReorder: Math.max(p.stockMin - p.stockCurrent, p.stockMin * 0.5),
      }));

    const kpis: StockAnalysisReport['kpis'] = {
      criticalCount,
      highAlertCount,
      mediumAlertCount,
      avgDaysUntilDepletion: Math.floor(avgDaysUntilDepletion),
    };

    const charts = this.prepareStockAnalysisCharts(products, criticalProducts);

    const tableData = this.prepareStockAnalysisTable(criticalProductsData);

    return {
      id: `stock_analysis_${Date.now()}`,
      type: 'stock_analysis',
      title:
        this.language === 'ca-ES'
          ? "Anàlisi d'Estoc i Alarmes"
          : 'Análisis de Stock y Alarmas',
      description:
        this.language === 'ca-ES'
          ? "Productes crítics, alertes i projeccions d'estoc"
          : 'Productos críticos, alertas y proyecciones de stock',
      generatedAt: new Date().toISOString(),
      filters,
      kpis,
      charts,
      tableData,
      language: this.language,
      criticalProducts: criticalProductsData,
    };
  }

  /**
   * Prepara gráficos para análisis de stock.
   */
  private prepareStockAnalysisCharts(
    products: Product[],
    criticalProducts: Product[],
  ): ChartConfig[] {
    const charts: ChartConfig[] = [];

    // Distribución por nivel de alerta
    const alertLevels = {
      [this.language === 'ca-ES' ? 'Crític' : 'Crítico']: criticalProducts.length,
      [this.language === 'ca-ES' ? 'Alta Alerta' : 'Alta Alerta']: products.filter(
        (p) => p.stockCurrent >= p.stockMin && p.stockCurrent <= p.stockMin * 1.15,
      ).length,
      [this.language === 'ca-ES' ? 'Alerta Mitjana' : 'Alerta Media']: products.filter(
        (p) => p.stockCurrent > p.stockMin * 1.15 && p.stockCurrent <= p.stockMin * 1.5,
      ).length,
      [this.language === 'ca-ES' ? 'Normal' : 'Normal']: products.filter(
        (p) => p.stockCurrent > p.stockMin * 1.5,
      ).length,
    };

    charts.push({
      type: 'pie',
      title:
        this.language === 'ca-ES'
          ? 'Distribució per Nivell d\'Alerta'
          : 'Distribución por Nivel de Alerta',
      data: {
        labels: Object.keys(alertLevels),
        datasets: [
          {
            label: this.language === 'ca-ES' ? 'Productes' : 'Productos',
            data: Object.values(alertLevels),
          },
        ],
      },
    });

    return charts;
  }

  /**
   * Prepara tabla de datos para análisis de stock.
   */
  private prepareStockAnalysisTable(
    criticalProducts: Array<{
      id: string;
      code: string;
      name: string;
      stockCurrent: number;
      stockMin: number;
      daysUntilDepletion: number;
      suggestedReorder: number;
    }>,
  ): {
    headers: string[];
    rows: Array<Record<string, string | number | null>>;
    totals?: Record<string, string | number>;
  } {
    const headers =
      this.language === 'ca-ES'
        ? ['Codi', 'Nom', 'Estoc Actual', 'Estoc Mínim', 'Dies Fins Agotar', 'Reposició Suggerida']
        : ['Código', 'Nombre', 'Stock Actual', 'Stock Mínimo', 'Días Hasta Agotar', 'Reposición Sugerida'];

    const rows = criticalProducts.map((p) => ({
      [headers[0]]: p.code,
      [headers[1]]: p.name,
      [headers[2]]: p.stockCurrent,
      [headers[3]]: p.stockMin,
      [headers[4]]: p.daysUntilDepletion,
      [headers[5]]: Math.ceil(p.suggestedReorder),
    }));

    return { headers, rows };
  }

  /**
   * Genera análisis de movimientos.
   */
  async generateMovementsAnalysis(
    filters: ReportFilters,
  ): Promise<MovementsAnalysisReport> {
    const dateFrom = filters.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const dateTo = filters.dateTo || new Date().toISOString();

    let query = supabaseClient
      .from('inventory_movements')
      .select('*, profiles!inventory_movements_user_id_fkey(first_name, last_name)')
      .gte('movement_date', dateFrom)
      .lte('movement_date', dateTo);

    if (filters.warehouse) {
      query = query.eq('warehouse', filters.warehouse);
    }
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters.productId) {
      query = query.eq('product_id', filters.productId);
    }

    const { data: movements, error } = await query;

    if (error) {
      throw new Error(`Error obteniendo movimientos: ${error.message}`);
    }

    const movementsData = movements || [];

    // Contar por tipo
    const totalEntries = movementsData.filter((m) => m.movement_type === 'IN').length;
    const totalExits = movementsData.filter((m) => m.movement_type === 'OUT').length;
    const totalAdjustments = movementsData.filter((m) => m.movement_type === 'ADJUSTMENT').length;
    const totalTransfers = movementsData.filter((m) => m.movement_type === 'TRANSFER').length;

    // Movimientos por almacén
    const movementsByWarehouse: Record<string, number> = {};
    movementsData.forEach((m) => {
      const warehouse = m.warehouse || 'N/A';
      movementsByWarehouse[warehouse] = (movementsByWarehouse[warehouse] || 0) + 1;
    });

    // Movimientos por razón
    const movementsByReason: Record<string, number> = {};
    movementsData.forEach((m) => {
      const reason = m.request_reason || 'Sin motivo';
      movementsByReason[reason] = (movementsByReason[reason] || 0) + 1;
    });

    // Movimientos por usuario
    const userMovements: Record<string, { userId: string; userName: string; count: number }> = {};
    movementsData.forEach((m) => {
      if (m.user_id) {
        const profile = m.profiles;
        const userName = profile
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Usuario'
          : 'Usuario';
        if (!userMovements[m.user_id]) {
          userMovements[m.user_id] = {
            userId: m.user_id,
            userName,
            count: 0,
          };
        }
        userMovements[m.user_id].count++;
      }
    });

    // Top productos movidos
    const productMovements: Record<string, number> = {};
    movementsData.forEach((m) => {
      if (m.product_id) {
        productMovements[m.product_id] = (productMovements[m.product_id] || 0) + 1;
      }
    });
    const topMovedProducts = Object.keys(productMovements).length;

    const kpis: MovementsAnalysisReport['kpis'] = {
      totalEntries,
      totalExits,
      totalAdjustments,
      totalTransfers,
      movementsByWarehouse,
      topMovedProducts,
    };

    const charts = this.prepareMovementsAnalysisCharts(movementsData, movementsByReason);

    // Para visualización: limitar a 100. Para exportación: todos los datos
    // Guardamos todos los datos en tableData para que la exportación incluya todo
    const tableData = this.prepareMovementsAnalysisTable(movementsData); // TODOS los datos para exportación

    return {
      id: `movements_analysis_${Date.now()}`,
      type: 'movements_analysis',
      title:
        this.language === 'ca-ES'
          ? 'Anàlisi de Moviments'
          : 'Análisis de Movimientos',
      description:
        this.language === 'ca-ES'
          ? 'Moviments per tipus, raó, magatzem i usuari'
          : 'Movimientos por tipo, razón, almacén y usuario',
      generatedAt: new Date().toISOString(),
      filters,
      kpis,
      charts,
      tableData,
      language: this.language,
      movementsByReason,
      movementsByUser: Object.values(userMovements),
    };
  }

  /**
   * Prepara gráficos para análisis de movimientos.
   */
  private prepareMovementsAnalysisCharts(
    movements: unknown[],
    movementsByReason: Record<string, number>,
  ): ChartConfig[] {
    const charts: ChartConfig[] = [];

    // Gráfico de movimientos por tipo
    const typeCounts = {
      [this.language === 'ca-ES' ? 'Entrades' : 'Entradas']: (movements as { movement_type: string }[]).filter(
        (m) => m.movement_type === 'IN',
      ).length,
      [this.language === 'ca-ES' ? 'Sortides' : 'Salidas']: (movements as { movement_type: string }[]).filter(
        (m) => m.movement_type === 'OUT',
      ).length,
      [this.language === 'ca-ES' ? 'Ajustos' : 'Ajustes']: (movements as { movement_type: string }[]).filter(
        (m) => m.movement_type === 'ADJUSTMENT',
      ).length,
      [this.language === 'ca-ES' ? 'Transferències' : 'Transferencias']: (movements as { movement_type: string }[]).filter(
        (m) => m.movement_type === 'TRANSFER',
      ).length,
    };

    charts.push({
      type: 'bar',
      title:
        this.language === 'ca-ES'
          ? 'Moviments per Tipus'
          : 'Movimientos por Tipo',
      data: {
        labels: Object.keys(typeCounts),
        datasets: [
          {
            label: this.language === 'ca-ES' ? 'Quantitat' : 'Cantidad',
            data: Object.values(typeCounts),
          },
        ],
      },
    });

    // Top 10 razones
    const topReasons = Object.entries(movementsByReason)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    charts.push({
      type: 'bar',
      title:
        this.language === 'ca-ES'
          ? 'Top 10 Motius de Moviment'
          : 'Top 10 Motivos de Movimiento',
      data: {
        labels: topReasons.map(([reason]) => reason),
        datasets: [
          {
            label: this.language === 'ca-ES' ? 'Quantitat' : 'Cantidad',
            data: topReasons.map(([, count]) => count),
          },
        ],
      },
    });

    return charts;
  }

  /**
   * Prepara tabla de datos para análisis de movimientos.
   */
  private prepareMovementsAnalysisTable(movements: unknown[]): {
    headers: string[];
    rows: Array<Record<string, string | number | null>>;
    totals?: Record<string, string | number>;
  } {
    const headers =
      this.language === 'ca-ES'
        ? ['Data', 'Tipus', 'Producte', 'Quantitat', 'Motiu', 'Magatzem', 'Usuari']
        : ['Fecha', 'Tipo', 'Producto', 'Cantidad', 'Motivo', 'Almacén', 'Usuario'];

    const rows = movements.map((m: any) => ({
      [headers[0]]: new Date(m.movement_date).toLocaleDateString(this.language),
      [headers[1]]: m.movement_type,
      [headers[2]]: m.product_id || '-',
      [headers[3]]: m.quantity,
      [headers[4]]: m.request_reason || '-',
      [headers[5]]: m.warehouse || '-',
      [headers[6]]:
        m.profiles && (m.profiles.first_name || m.profiles.last_name)
          ? `${m.profiles.first_name || ''} ${m.profiles.last_name || ''}`.trim()
          : '-',
    }));

    return { headers, rows };
  }

  /**
   * Genera control de lotes.
   */
  async generateBatchesReport(filters: ReportFilters): Promise<BatchesReport> {
    let query = supabaseClient.from('product_batches').select('*, products!inner(code, name)');

    if (filters.productId) {
      query = query.eq('product_id', filters.productId);
    }

    const { data: batches, error } = await query;

    if (error) {
      throw new Error(`Error obteniendo lotes: ${error.message}`);
    }

    const batchesData = batches || [];

    // Contar por estado
    const okBatches = batchesData.filter((b: { status: string }) => b.status === 'OK').length;
    const defectiveBatches = batchesData.filter((b: { status: string }) => b.status === 'DEFECTIVE').length;
    const blockedBatches = batchesData.filter((b: { status: string }) => b.status === 'BLOCKED').length;
    const expiredBatches = batchesData.filter((b: { status: string }) => b.status === 'EXPIRED').length;

    // Próximos a caducar
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const expiringSoon30 = batchesData.filter((b: { expiry_date: string | null }) => {
      if (!b.expiry_date) return false;
      const expiry = new Date(b.expiry_date);
      return expiry > now && expiry <= in30Days;
    }).length;

    const expiringSoon60 = batchesData.filter((b: { expiry_date: string | null }) => {
      if (!b.expiry_date) return false;
      const expiry = new Date(b.expiry_date);
      return expiry > in30Days && expiry <= in60Days;
    }).length;

    // Lotes próximos a caducar con detalles
    const expiringBatches = batchesData
      .filter((b: { expiry_date: string | null; quantity_available: number }) => {
        if (!b.expiry_date || b.quantity_available <= 0) return false;
        const expiry = new Date(b.expiry_date);
        return expiry > now && expiry <= in60Days;
      })
      .map((b: any) => {
        const expiry = new Date(b.expiry_date);
        const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        return {
          id: b.id,
          batchCode: b.batch_code,
          productName: b.products?.name || '-',
          expiryDate: b.expiry_date,
          daysUntilExpiry,
          quantityAvailable: b.quantity_available,
        };
      })
      .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
      // Removido .slice(0, 50) para exportar TODOS los lotes próximos a caducar

    const kpis: BatchesReport['kpis'] = {
      totalBatches: batchesData.length,
      okBatches,
      defectiveBatches,
      blockedBatches,
      expiredBatches,
      expiringSoon30,
      expiringSoon60,
    };

    const charts = this.prepareBatchesCharts(batchesData);

    const tableData = this.prepareBatchesTable(expiringBatches);

    return {
      id: `batches_control_${Date.now()}`,
      type: 'batches_control',
      title:
        this.language === 'ca-ES' ? 'Control de Lots' : 'Control de Lotes',
      description:
        this.language === 'ca-ES'
          ? 'Estats, caducitats i defectes de lots'
          : 'Estados, caducidades y defectos de lotes',
      generatedAt: new Date().toISOString(),
      filters,
      kpis,
      charts,
      tableData,
      language: this.language,
      expiringBatches,
    };
  }

  /**
   * Prepara gráficos para control de lotes.
   */
  private prepareBatchesCharts(batches: unknown[]): ChartConfig[] {
    const charts: ChartConfig[] = [];
    const typedBatches = batches as Array<{ status: string }>;

    const statusCounts = {
      [this.language === 'ca-ES' ? 'OK' : 'OK']: typedBatches.filter(
        (b) => b.status === 'OK',
      ).length,
      [this.language === 'ca-ES' ? 'Defectuós' : 'Defectuoso']: typedBatches.filter(
        (b) => b.status === 'DEFECTIVE',
      ).length,
      [this.language === 'ca-ES' ? 'Bloquejat' : 'Bloqueado']: typedBatches.filter(
        (b) => b.status === 'BLOCKED',
      ).length,
      [this.language === 'ca-ES' ? 'Caducat' : 'Caducado']: typedBatches.filter(
        (b) => b.status === 'EXPIRED',
      ).length,
    };

    charts.push({
      type: 'pie',
      title:
        this.language === 'ca-ES'
          ? 'Distribució per Estat'
          : 'Distribución por Estado',
      data: {
        labels: Object.keys(statusCounts),
        datasets: [
          {
            label: this.language === 'ca-ES' ? 'Lots' : 'Lotes',
            data: Object.values(statusCounts),
          },
        ],
      },
    });

    return charts;
  }

  /**
   * Prepara tabla de datos para control de lotes.
   */
  private prepareBatchesTable(
    expiringBatches: Array<{
      id: string;
      batchCode: string;
      productName: string;
      expiryDate: string;
      daysUntilExpiry: number;
      quantityAvailable: number;
    }>,
  ): {
    headers: string[];
    rows: Array<Record<string, string | number | null>>;
    totals?: Record<string, string | number>;
  } {
    const headers =
      this.language === 'ca-ES'
        ? ['Codi Lot', 'Producte', 'Data Caducitat', 'Dies Fins Caducitat', 'Quantitat Disponible']
        : ['Código Lote', 'Producto', 'Fecha Caducidad', 'Días Hasta Caducidad', 'Cantidad Disponible'];

    const rows = expiringBatches.map((b) => ({
      [headers[0]]: b.batchCode,
      [headers[1]]: b.productName,
      [headers[2]]: new Date(b.expiryDate).toLocaleDateString(this.language),
      [headers[3]]: b.daysUntilExpiry,
      [headers[4]]: b.quantityAvailable,
    }));

    return { headers, rows };
  }

  /**
   * Genera análisis de proveedores.
   */
  async generateSuppliersReport(filters: ReportFilters): Promise<SuppliersReport> {
    const { data: suppliers, error } = await supabaseClient
      .from('suppliers')
      .select('*')
      .eq('is_active', filters.includeInactive ? undefined : true);

    if (error) {
      throw new Error(`Error obteniendo proveedores: ${error.message}`);
    }

    const suppliersData = suppliers || [];
    const activeSuppliers = suppliersData.filter((s: { is_active: boolean }) => s.is_active).length;
    const inactiveSuppliers = suppliersData.filter((s: { is_active: boolean }) => !s.is_active).length;

    // Obtener lotes por proveedor
    const { data: batches } = await supabaseClient
      .from('product_batches')
      .select('supplier_id, status, quality_score');

    const batchesBySupplier: Record<string, any[]> = {};
    batches?.forEach((b: { supplier_id: string | null }) => {
      if (b.supplier_id) {
        if (!batchesBySupplier[b.supplier_id]) {
          batchesBySupplier[b.supplier_id] = [];
        }
        batchesBySupplier[b.supplier_id].push(b);
      }
    });

    // Calcular métricas por proveedor
    const suppliersDataWithMetrics = suppliersData.map((s: any) => {
      const supplierBatches = batchesBySupplier[s.id] || [];
      const defectiveBatches = supplierBatches.filter(
        (b: { status: string }) => b.status === 'DEFECTIVE',
      ).length;
      const defectiveRate =
        supplierBatches.length > 0 ? (defectiveBatches / supplierBatches.length) * 100 : 0;
      const avgQuality =
        supplierBatches.length > 0
          ? supplierBatches.reduce(
              (sum: number, b: { quality_score: number }) => sum + (b.quality_score || 0),
              0,
            ) / supplierBatches.length
          : s.quality_rating || 0;

      // Calcular valor total (simplificado)
      const totalValue = supplierBatches.reduce(
        (sum: number, b: any) => sum + (b.cost_per_unit || 0) * (b.quantity_total || 0),
        0,
      );

      return {
        id: s.id,
        name: s.name,
        batchesSupplied: supplierBatches.length,
        defectiveRate: Number(defectiveRate.toFixed(2)),
        qualityRating: Number(avgQuality.toFixed(2)),
        leadTimeDays: s.lead_time_days || 0,
        totalValue,
      };
    });

    const totalBatchesSupplied = batches?.length || 0;
    const totalDefectiveBatches =
      batches?.filter((b: { status: string }) => b.status === 'DEFECTIVE').length || 0;
    const avgQualityRating =
      suppliersDataWithMetrics.length > 0
        ? suppliersDataWithMetrics.reduce((sum, s) => sum + s.qualityRating, 0) /
          suppliersDataWithMetrics.length
        : 0;
    const avgLeadTime =
      suppliersDataWithMetrics.length > 0
        ? suppliersDataWithMetrics.reduce((sum, s) => sum + s.leadTimeDays, 0) /
          suppliersDataWithMetrics.length
        : 0;

    const kpis: SuppliersReport['kpis'] = {
      activeSuppliers,
      inactiveSuppliers,
      totalBatchesSupplied,
      totalDefectiveBatches,
      avgQualityRating: Number(avgQualityRating.toFixed(2)),
      avgLeadTime: Number(avgLeadTime.toFixed(0)),
    };

    const charts = this.prepareSuppliersCharts(suppliersData, suppliersDataWithMetrics);

    const tableData = this.prepareSuppliersTable(suppliersDataWithMetrics);

    return {
      id: `suppliers_analysis_${Date.now()}`,
      type: 'suppliers_analysis',
      title:
        this.language === 'ca-ES'
          ? 'Anàlisi de Proveïdors'
          : 'Análisis de Proveedores',
      description:
        this.language === 'ca-ES'
          ? "Qualitat, temps d'entrega i taxes de defectes"
          : 'Calidad, tiempos de entrega y tasas de defectos',
      generatedAt: new Date().toISOString(),
      filters,
      kpis,
      charts,
      tableData,
      language: this.language,
      suppliersData: suppliersDataWithMetrics,
    };
  }

  /**
   * Prepara gráficos para análisis de proveedores.
   */
  private prepareSuppliersCharts(
    suppliers: unknown[],
    suppliersWithMetrics: Array<{
      name: string;
      defectiveRate: number;
      qualityRating: number;
    }>,
  ): ChartConfig[] {
    const charts: ChartConfig[] = [];

    // Top 10 proveedores por calidad
    const topByQuality = [...suppliersWithMetrics]
      .sort((a, b) => b.qualityRating - a.qualityRating)
      .slice(0, 10);

    charts.push({
      type: 'bar',
      title:
        this.language === 'ca-ES'
          ? 'Top 10 Proveïdors per Qualitat'
          : 'Top 10 Proveedores por Calidad',
      data: {
        labels: topByQuality.map((s) => s.name),
        datasets: [
          {
            label: this.language === 'ca-ES' ? 'Qualitat' : 'Calidad',
            data: topByQuality.map((s) => s.qualityRating),
          },
        ],
      },
    });

    return charts;
  }

  /**
   * Prepara tabla de datos para análisis de proveedores.
   */
  private prepareSuppliersTable(
    suppliersData: Array<{
      id: string;
      name: string;
      batchesSupplied: number;
      defectiveRate: number;
      qualityRating: number;
      leadTimeDays: number;
      totalValue: number;
    }>,
  ): {
    headers: string[];
    rows: Array<Record<string, string | number | null>>;
    totals?: Record<string, string | number>;
  } {
    const headers =
      this.language === 'ca-ES'
        ? ['Nom', 'Lots Subministrats', 'Taxa Defectes (%)', 'Qualitat', 'Temps Entrega (dies)', 'Valor Total']
        : ['Nombre', 'Lotes Suministrados', 'Tasa Defectos (%)', 'Calidad', 'Tiempo Entrega (días)', 'Valor Total'];

    const rows = suppliersData.map((s) => ({
      [headers[0]]: s.name,
      [headers[1]]: s.batchesSupplied,
      [headers[2]]: s.defectiveRate.toFixed(2),
      [headers[3]]: s.qualityRating.toFixed(2),
      [headers[4]]: s.leadTimeDays,
      [headers[5]]: s.totalValue.toFixed(2),
    }));

    return { headers, rows };
  }

  /**
   * Genera informe de auditoría.
   */
  async generateAuditReport(filters: ReportFilters): Promise<AuditReport> {
    const dateFrom = filters.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const dateTo = filters.dateTo || new Date().toISOString();

    let query = supabaseClient
      .from('audit_logs')
      .select('*, profiles!audit_logs_user_id_fkey(first_name, last_name)')
      .gte('created_at', dateFrom)
      .lte('created_at', dateTo);

    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }

    const { data: logs, error } = await query;

    if (error) {
      throw new Error(`Error obteniendo logs de auditoría: ${error.message}`);
    }

    const logsData = logs || [];

    // Contar por acción
    const creates = logsData.filter((l: { action: string }) => l.action === 'CREATE').length;
    const updates = logsData.filter((l: { action: string }) => l.action === 'UPDATE').length;
    const deletes = logsData.filter((l: { action: string }) => l.action === 'DELETE').length;
    const views = logsData.filter((l: { action: string }) => l.action === 'VIEW').length;
    const exports = logsData.filter((l: { action: string }) => l.action === 'EXPORT').length;
    const logins = logsData.filter((l: { action: string }) => l.action === 'LOGIN').length;

    // Acciones por tipo
    const actionsByType: Record<string, number> = {};
    logsData.forEach((l: { action: string }) => {
      actionsByType[l.action] = (actionsByType[l.action] || 0) + 1;
    });

    // Actividad por usuario
    const userActivity: Record<string, { userId: string; userName: string; actionCount: number }> = {};
    logsData.forEach((l: any) => {
      if (l.user_id) {
        const profile = l.profiles;
        const userName = profile
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Usuario'
          : 'Usuario';
        if (!userActivity[l.user_id]) {
          userActivity[l.user_id] = {
            userId: l.user_id,
            userName,
            actionCount: 0,
          };
        }
        userActivity[l.user_id].actionCount++;
      }
    });

    const mostActiveUser = Object.values(userActivity)
      .sort((a, b) => b.actionCount - a.actionCount)[0]?.userName || '-';

    const kpis: AuditReport['kpis'] = {
      totalActions: logsData.length,
      creates,
      updates,
      deletes,
      views,
      exports,
      logins,
      mostActiveUser,
    };

    const charts = this.prepareAuditCharts(logsData, actionsByType);

    // Para exportación: todos los datos (sin límite de 100)
    const tableData = this.prepareAuditTable(logsData);

    return {
      id: `audit_${Date.now()}`,
      type: 'audit',
      title:
        this.language === 'ca-ES'
          ? 'Auditoria i Traçabilitat'
          : 'Auditoría y Trazabilidad',
      description:
        this.language === 'ca-ES'
          ? "Logs d'auditoria, modificacions i activitat d'usuaris"
          : 'Logs de auditoría, modificaciones y actividad de usuarios',
      generatedAt: new Date().toISOString(),
      filters,
      kpis,
      charts,
      tableData,
      language: this.language,
      actionsByType,
      activityByUser: Object.values(userActivity),
    };
  }

  /**
   * Prepara gráficos para informe de auditoría.
   */
  private prepareAuditCharts(
    logs: unknown[],
    actionsByType: Record<string, number>,
  ): ChartConfig[] {
    const charts: ChartConfig[] = [];

    charts.push({
      type: 'bar',
      title:
        this.language === 'ca-ES'
          ? 'Accions per Tipus'
          : 'Acciones por Tipo',
      data: {
        labels: Object.keys(actionsByType),
        datasets: [
          {
            label: this.language === 'ca-ES' ? 'Quantitat' : 'Cantidad',
            data: Object.values(actionsByType),
          },
        ],
      },
    });

    return charts;
  }

  /**
   * Prepara tabla de datos para informe de auditoría.
   */
  private prepareAuditTable(logs: unknown[]): {
    headers: string[];
    rows: Array<Record<string, string | number | null>>;
    totals?: Record<string, string | number>;
  } {
    const headers =
      this.language === 'ca-ES'
        ? ['Data', 'Usuari', 'Acció', 'Entitat', 'Camp', 'Valor Antic', 'Valor Nou']
        : ['Fecha', 'Usuario', 'Acción', 'Entidad', 'Campo', 'Valor Antiguo', 'Valor Nuevo'];

    const rows = logs.map((l: any) => ({
      [headers[0]]: new Date(l.created_at).toLocaleDateString(this.language),
      [headers[1]]:
        l.profiles && (l.profiles.first_name || l.profiles.last_name)
          ? `${l.profiles.first_name || ''} ${l.profiles.last_name || ''}`.trim()
          : '-',
      [headers[2]]: l.action,
      [headers[3]]: l.entity_type || '-',
      [headers[4]]: l.field_name || '-',
      [headers[5]]: l.old_value || '-',
      [headers[6]]: l.new_value || '-',
    }));

    return { headers, rows };
  }

  /**
   * Genera análisis de ubicaciones.
   */
  async generateLocationsReport(filters: ReportFilters): Promise<LocationsReport> {
    let query = supabaseClient.from('product_locations').select('*');

    if (filters.warehouse) {
      query = query.eq('warehouse', filters.warehouse);
    }

    const { data: locations, error } = await query;

    if (error) {
      throw new Error(`Error obteniendo ubicaciones: ${error.message}`);
    }

    const locationsData = locations || [];

    // Ubicaciones por almacén
    const locationsByWarehouse: Record<string, number> = {};
    locationsData.forEach((l: { warehouse: string }) => {
      locationsByWarehouse[l.warehouse] = (locationsByWarehouse[l.warehouse] || 0) + 1;
    });

    // Stock por almacén
    const stockByWarehouse: Record<string, number> = {};
    locationsData.forEach((l: { warehouse: string; quantity: number }) => {
      stockByWarehouse[l.warehouse] = (stockByWarehouse[l.warehouse] || 0) + (l.quantity || 0);
    });

    // Productos sin ubicación
    const { data: allProducts } = await supabaseClient
      .from('products')
      .select('id')
      .eq('is_active', true);
    const productsWithLocation = new Set(
      locationsData.map((l: { product_id: string }) => l.product_id),
    );
    const productsWithoutLocation =
      (allProducts?.filter((p) => !productsWithLocation.has(p.id)).length || 0);

    // Top ubicaciones
    const locationCounts: Record<string, { warehouse: string; aisle: string; shelf: string; productCount: number; totalStock: number }> = {};
    locationsData.forEach((l: { warehouse: string; aisle: string; shelf: string; product_id: string; quantity: number }) => {
      const key = `${l.warehouse}-${l.aisle}-${l.shelf}`;
      if (!locationCounts[key]) {
        locationCounts[key] = {
          warehouse: l.warehouse,
          aisle: l.aisle,
          shelf: l.shelf,
          productCount: 0,
          totalStock: 0,
        };
      }
      locationCounts[key].productCount++;
      locationCounts[key].totalStock += l.quantity || 0;
    });

    const topLocations = Object.values(locationCounts)
      .sort((a, b) => b.totalStock - a.totalStock);
      // Removido .slice(0, 20) para exportar TODAS las ubicaciones

    const avgProductsPerLocation =
      locationsData.length > 0
        ? (allProducts?.length || 0) / locationsData.length
        : 0;

    const kpis: LocationsReport['kpis'] = {
      totalLocations: locationsData.length,
      locationsByWarehouse,
      productsWithoutLocation,
      avgProductsPerLocation: Number(avgProductsPerLocation.toFixed(2)),
    };

    const charts = this.prepareLocationsCharts(locationsData, stockByWarehouse);

    const tableData = this.prepareLocationsTable(topLocations);

    return {
      id: `locations_${Date.now()}`,
      type: 'locations',
      title:
        this.language === 'ca-ES'
          ? "Anàlisi d'Ubicacions"
          : 'Análisis de Ubicaciones',
      description:
        this.language === 'ca-ES'
          ? "Estoc per magatzem i distribució d'ubicacions"
          : 'Stock por almacén y distribución de ubicaciones',
      generatedAt: new Date().toISOString(),
      filters,
      kpis,
      charts,
      tableData,
      language: this.language,
      stockByWarehouse,
      topLocations,
    };
  }

  /**
   * Prepara gráficos para análisis de ubicaciones.
   */
  private prepareLocationsCharts(
    locations: unknown[],
    stockByWarehouse: Record<string, number>,
  ): ChartConfig[] {
    const charts: ChartConfig[] = [];

    charts.push({
      type: 'bar',
      title:
        this.language === 'ca-ES'
          ? 'Estoc per Magatzem'
          : 'Stock por Almacén',
      data: {
        labels: Object.keys(stockByWarehouse),
        datasets: [
          {
            label: this.language === 'ca-ES' ? 'Estoc' : 'Stock',
            data: Object.values(stockByWarehouse),
          },
        ],
      },
    });

    return charts;
  }

  /**
   * Prepara tabla de datos para análisis de ubicaciones.
   */
  private prepareLocationsTable(
    topLocations: Array<{
      warehouse: string;
      aisle: string;
      shelf: string;
      productCount: number;
      totalStock: number;
    }>,
  ): {
    headers: string[];
    rows: Array<Record<string, string | number | null>>;
    totals?: Record<string, string | number>;
  } {
    const headers =
      this.language === 'ca-ES'
        ? ['Magatzem', 'Passadís', 'Estanteria', 'Productes', 'Estoc Total']
        : ['Almacén', 'Pasillo', 'Estantería', 'Productos', 'Stock Total'];

    const rows = topLocations.map((l) => ({
      [headers[0]]: l.warehouse,
      [headers[1]]: l.aisle,
      [headers[2]]: l.shelf,
      [headers[3]]: l.productCount,
      [headers[4]]: l.totalStock,
    }));

    return { headers, rows };
  }

  /**
   * Genera informe de sugerencias IA.
   */
  async generateAISuggestionsReport(
    filters: ReportFilters,
  ): Promise<AISuggestionsReport> {
    let query = supabaseClient.from('ai_suggestions').select('*');

    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    const { data: suggestions, error } = await query;

    if (error) {
      throw new Error(`Error obteniendo sugerencias: ${error.message}`);
    }

    const suggestionsData = suggestions || [];

    // Contar por estado
    const pending = suggestionsData.filter((s: { status: string }) => s.status === 'PENDING').length;
    const accepted = suggestionsData.filter((s: { status: string }) => s.status === 'ACCEPTED').length;
    const dismissed = suggestionsData.filter((s: { status: string }) => s.status === 'DISMISSED').length;
    const expired = suggestionsData.filter((s: { status: string }) => s.status === 'EXPIRED').length;

    const activeSuggestions = pending + accepted;

    // Tasa de aceptación
    const totalReviewed = accepted + dismissed;
    const acceptanceRate = totalReviewed > 0 ? (accepted / totalReviewed) * 100 : 0;

    // Por tipo
    const suggestionsByType: Record<string, number> = {};
    suggestionsData.forEach((s: { suggestion_type: string }) => {
      suggestionsByType[s.suggestion_type] = (suggestionsByType[s.suggestion_type] || 0) + 1;
    });

    // Por prioridad
    const suggestionsByPriority: Record<string, number> = {};
    suggestionsData.forEach((s: { priority: string }) => {
      suggestionsByPriority[s.priority] = (suggestionsByPriority[s.priority] || 0) + 1;
    });

    const kpis: AISuggestionsReport['kpis'] = {
      activeSuggestions,
      pending,
      accepted,
      dismissed,
      expired,
      acceptanceRate: Number(acceptanceRate.toFixed(2)),
    };

    const charts = this.prepareAISuggestionsCharts(suggestionsData, suggestionsByType, suggestionsByPriority);

    // Para exportación: todos los datos (sin límite de 50)
    const tableData = this.prepareAISuggestionsTable(suggestionsData);

    return {
      id: `ai_suggestions_${Date.now()}`,
      type: 'ai_suggestions',
      title:
        this.language === 'ca-ES'
          ? "Suggeriments d'IA"
          : 'Sugerencias de IA',
      description:
        this.language === 'ca-ES'
          ? "Suggeriments actius, prioritats i taxa d'acceptació"
          : 'Sugerencias activas, prioridades y tasa de aceptación',
      generatedAt: new Date().toISOString(),
      filters,
      kpis,
      charts,
      tableData,
      language: this.language,
      suggestionsByType,
      suggestionsByPriority,
    };
  }

  /**
   * Prepara gráficos para informe de sugerencias IA.
   */
  private prepareAISuggestionsCharts(
    suggestions: unknown[],
    suggestionsByType: Record<string, number>,
    suggestionsByPriority: Record<string, number>,
  ): ChartConfig[] {
    const charts: ChartConfig[] = [];

    charts.push({
      type: 'pie',
      title:
        this.language === 'ca-ES'
          ? 'Suggeriments per Tipus'
          : 'Sugerencias por Tipo',
      data: {
        labels: Object.keys(suggestionsByType),
        datasets: [
          {
            label: this.language === 'ca-ES' ? 'Quantitat' : 'Cantidad',
            data: Object.values(suggestionsByType),
          },
        ],
      },
    });

    charts.push({
      type: 'bar',
      title:
        this.language === 'ca-ES'
          ? 'Suggeriments per Prioritat'
          : 'Sugerencias por Prioridad',
      data: {
        labels: Object.keys(suggestionsByPriority),
        datasets: [
          {
            label: this.language === 'ca-ES' ? 'Quantitat' : 'Cantidad',
            data: Object.values(suggestionsByPriority),
          },
        ],
      },
    });

    return charts;
  }

  /**
   * Prepara tabla de datos para informe de sugerencias IA.
   */
  private prepareAISuggestionsTable(suggestions: unknown[]): {
    headers: string[];
    rows: Array<Record<string, string | number | null>>;
    totals?: Record<string, string | number>;
  } {
    const headers =
      this.language === 'ca-ES'
        ? ['Títol', 'Tipus', 'Prioritat', 'Estat', 'Data Creació']
        : ['Título', 'Tipo', 'Prioridad', 'Estado', 'Fecha Creación'];

    const rows = suggestions.map((s: any) => ({
      [headers[0]]: s.title || '-',
      [headers[1]]: s.suggestion_type || '-',
      [headers[2]]: s.priority || '-',
      [headers[3]]: s.status || '-',
      [headers[4]]: new Date(s.created_at).toLocaleDateString(this.language),
    }));

    return { headers, rows };
  }

  /**
   * Genera informe personalizado desde plantilla.
   */
  async generateCustomReport(
    template: {
      tables: string[];
      fields: Record<string, string[]>;
      filters: ReportFilters;
      visualizations: Array<{
        type: string;
        dataSource: string;
        xAxis?: string;
        yAxis?: string;
        groupBy?: string;
      }>;
    },
    filters: ReportFilters,
  ): Promise<{
    id: string;
    type: 'custom';
    title: string;
    description: string;
    generatedAt: string;
    filters: ReportFilters;
    kpis: ReportKPIs;
    charts: ChartConfig[];
    tableData: {
      headers: string[];
      rows: Array<Record<string, string | number | null>>;
    };
    language: 'es-ES' | 'ca-ES';
  }> {
    // Combinar filtros de plantilla y parámetros
    const combinedFilters = { ...template.filters, ...filters };

    // Obtener datos de las tablas seleccionadas
    const data: Record<string, unknown[]> = {};

    for (const table of template.tables) {
      if (table === 'products') {
        const products = await this.productRepository.getAll({
          includeInactive: combinedFilters.includeInactive ?? false,
          warehouse: combinedFilters.warehouse,
          category: combinedFilters.category,
        });
        data[table] = products;
      } else {
        // Obtener datos de otras tablas
        let query = supabaseClient.from(table).select('*');

        if (combinedFilters.dateFrom) {
          query = query.gte('created_at', combinedFilters.dateFrom);
        }
        if (combinedFilters.dateTo) {
          query = query.lte('created_at', combinedFilters.dateTo);
        }

        const { data: tableData } = await query;
        data[table] = tableData || [];
      }
    }

    // Preparar KPIs básicos
    const kpis: ReportKPIs = {
      totalRecords: Object.values(data).reduce(
        (sum, arr) => sum + arr.length,
        0,
      ),
    };

    // Preparar gráficos según visualizaciones
    const charts: ChartConfig[] = template.visualizations.map((viz) => {
      const tableData = data[viz.dataSource] || [];
      return this.prepareCustomChart(viz, tableData);
    });

    // Preparar tabla de datos
    const tableData = this.prepareCustomTable(template, data);

    return {
      id: `custom_${Date.now()}`,
      type: 'custom',
      title:
        this.language === 'ca-ES'
          ? 'Informe Personalitzat'
          : 'Informe Personalizado',
      description:
        this.language === 'ca-ES'
          ? 'Informe generat des de plantilla personalitzada'
          : 'Informe generado desde plantilla personalizada',
      generatedAt: new Date().toISOString(),
      filters: combinedFilters,
      kpis,
      charts,
      tableData,
      language: this.language,
    };
  }

  /**
   * Prepara gráfico personalizado.
   */
  private prepareCustomChart(
    viz: {
      type: string;
      dataSource: string;
      xAxis?: string;
      yAxis?: string;
      groupBy?: string;
    },
    data: unknown[],
  ): ChartConfig {
    // Implementación básica - agrupar por campo si se especifica
    if (viz.groupBy && data.length > 0) {
      const grouped: Record<string, number> = {};
      data.forEach((item: any) => {
        const key = item[viz.groupBy!] || 'Sin categoría';
        grouped[key] = (grouped[key] || 0) + 1;
      });

      return {
        type: viz.type as ChartType,
        title: viz.groupBy || 'Distribución',
        data: {
          labels: Object.keys(grouped),
          datasets: [
            {
              label: 'Cantidad',
              data: Object.values(grouped),
            },
          ],
        },
      };
    }

    return {
      type: viz.type as ChartType,
      title: 'Datos',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Valores',
            data: [],
          },
        ],
      },
    };
  }

  /**
   * Prepara tabla personalizada.
   */
  private prepareCustomTable(
    template: {
      tables: string[];
      fields: Record<string, string[]>;
    },
    data: Record<string, unknown[]>,
  ): {
    headers: string[];
    rows: Array<Record<string, string | number | null>>;
  } {
    const headers: string[] = [];
    const rows: Array<Record<string, string | number | null>> = [];

    // Combinar campos de todas las tablas
    template.tables.forEach((table) => {
      const fields = template.fields[table] || [];
      fields.forEach((field) => {
        if (!headers.includes(field)) {
          headers.push(field);
        }
      });
    });

    // Preparar filas
    template.tables.forEach((table) => {
      const tableData = data[table] || [];
      const fields = template.fields[table] || [];

      tableData.forEach((item: any) => {
        const row: Record<string, string | number | null> = {};
        fields.forEach((field) => {
          row[field] = item[field] ?? null;
        });
        rows.push(row);
      });
    });

    return { headers, rows };
  }

  /**
   * Calcula KPIs avanzados.
   */
  calculateKPIs(data: unknown): ReportKPIs {
    // Implementación genérica de cálculo de KPIs
    if (Array.isArray(data)) {
      return {
        totalRecords: data.length,
      };
    }
    return {};
  }

  /**
   * Prepara datos para gráficos.
   */
  prepareChartData(data: unknown, chartType: string): ChartData {
    // Implementación genérica de preparación de datos
    if (Array.isArray(data) && data.length > 0) {
      // Intentar agrupar por primera propiedad
      const grouped: Record<string, number> = {};
      data.forEach((item: any) => {
        const keys = Object.keys(item);
        if (keys.length > 0) {
          const key = String(item[keys[0]] || 'Sin categoría');
          grouped[key] = (grouped[key] || 0) + 1;
        }
      });

      return {
        labels: Object.keys(grouped),
        datasets: [
          {
            label: 'Cantidad',
            data: Object.values(grouped),
          },
        ],
      };
    }

    return {
      labels: [],
      datasets: [],
    };
  }
}
