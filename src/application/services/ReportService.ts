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

    const rows = products.map((p) => ({
      [headers[0]]: p.code,
      [headers[1]]: p.name,
      [headers[2]]: p.category || '-',
      [headers[3]]: p.stockCurrent,
      [headers[4]]: p.stockMin,
      [headers[5]]: Number(p.costPrice).toFixed(2),
      [headers[6]]: (Number(p.costPrice) * p.stockCurrent).toFixed(2),
    }));

    const totals = {
      [headers[0]]: this.language === 'ca-ES' ? 'TOTAL' : 'TOTAL',
      [headers[1]]: '',
      [headers[2]]: '',
      [headers[3]]: products.reduce((sum, p) => sum + p.stockCurrent, 0),
      [headers[4]]: '',
      [headers[5]]: '',
      [headers[6]]: products
        .reduce((sum, p) => sum + Number(p.costPrice) * p.stockCurrent, 0)
        .toFixed(2),
    };

    return { headers, rows, totals };
  }

  /**
   * Genera análisis de stock y alarmas.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async generateStockAnalysis(_filters: ReportFilters): Promise<StockAnalysisReport> {
    // Implementación básica - se completará en Fase 2
    throw new Error('Not implemented yet');
  }

  /**
   * Genera análisis de movimientos.
   */
  async generateMovementsAnalysis(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _filters: ReportFilters,
  ): Promise<MovementsAnalysisReport> {
    // Implementación básica - se completará en Fase 2
    throw new Error('Not implemented yet');
  }

  /**
   * Genera control de lotes.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async generateBatchesReport(_filters: ReportFilters): Promise<BatchesReport> {
    // Implementación básica - se completará en Fase 2
    throw new Error('Not implemented yet');
  }

  /**
   * Genera análisis de proveedores.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async generateSuppliersReport(_filters: ReportFilters): Promise<SuppliersReport> {
    // Implementación básica - se completará en Fase 2
    throw new Error('Not implemented yet');
  }

  /**
   * Genera informe de auditoría.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async generateAuditReport(_filters: ReportFilters): Promise<AuditReport> {
    // Implementación básica - se completará en Fase 2
    throw new Error('Not implemented yet');
  }

  /**
   * Genera análisis de ubicaciones.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async generateLocationsReport(_filters: ReportFilters): Promise<LocationsReport> {
    // Implementación básica - se completará en Fase 2
    throw new Error('Not implemented yet');
  }

  /**
   * Genera informe de sugerencias IA.
   */
  async generateAISuggestionsReport(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _filters: ReportFilters,
  ): Promise<AISuggestionsReport> {
    // Implementación básica - se completará en Fase 2
    throw new Error('Not implemented yet');
  }

  /**
   * Calcula KPIs avanzados.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  calculateKPIs(_data: unknown): ReportKPIs {
    // Implementación genérica de cálculo de KPIs
    return {};
  }

  /**
   * Prepara datos para gráficos.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  prepareChartData(_data: unknown, _chartType: string): ChartData {
    // Implementación genérica de preparación de datos
    return {
      labels: [],
      datasets: [],
    };
  }
}
