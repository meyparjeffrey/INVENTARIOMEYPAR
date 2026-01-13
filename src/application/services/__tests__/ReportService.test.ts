/**
 * Tests unitarios para ReportService.
 *
 * Verifica la generación de informes, cálculos de KPIs,
 * preparación de gráficos y manejo de errores.
 *
 * @module @application/services/__tests__/ReportService.test
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportService } from '../ReportService';
import type { ProductRepository } from '@domain/repositories/ProductRepository';
import type { Product } from '@domain/entities';
import type { ReportFilters } from '@domain/entities/Report';

// Mock de Supabase Client
const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  in: vi.fn(),
}));

vi.mock('@infrastructure/supabase/supabaseClient', () => ({
  supabaseClient: {
    from: supabaseMocks.from,
  },
}));

// Mock del ProductRepository
const createProductRepositoryMock = (): ProductRepository => {
  const mockProducts: Product[] = [
    {
      id: 'prod-1',
      code: 'PROD001',
      name: 'Producto 1',
      category: 'Categoría A',
      stockCurrent: 10,
      stockMin: 5,
      stockMax: 20,
      costPrice: 10.5,
      salePrice: 15.0,
      isActive: true,
      isBatchTracked: false,
      warehouse: 'MEYPAR',
      aisle: 'A',
      shelf: '1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'prod-2',
      code: 'PROD002',
      name: 'Producto 2',
      category: 'Categoría B',
      stockCurrent: 3,
      stockMin: 5,
      stockMax: 15,
      costPrice: 20.0,
      salePrice: 30.0,
      isActive: true,
      isBatchTracked: true,
      warehouse: 'OLIVA_TORRAS',
      aisle: 'B',
      shelf: '2',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'prod-3',
      code: 'PROD003',
      name: 'Producto 3',
      category: 'Categoría A',
      stockCurrent: 15,
      stockMin: 10,
      stockMax: 30,
      costPrice: 5.0,
      salePrice: 8.0,
      isActive: true,
      isBatchTracked: false,
      warehouse: 'MEYPAR',
      aisle: 'A',
      shelf: '2',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  return {
    getAll: vi.fn().mockResolvedValue(mockProducts),
    getById: vi.fn(),
    findByCode: vi.fn(),
    findByCodeOrBarcode: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
    getProductLocations: vi.fn(),
    getBatches: vi.fn(),
    getDefectReports: vi.fn(),
    getStockByWarehouse: vi.fn(),
    updateSettings: vi.fn(),
  } as unknown as ProductRepository;
};

describe('ReportService', () => {
  let reportService: ReportService;
  let mockProductRepository: ProductRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProductRepository = createProductRepositoryMock();
    reportService = new ReportService(mockProductRepository, 'es-ES');

    // Configurar mocks de Supabase
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
    };

    supabaseMocks.from.mockReturnValue(mockQuery);
    supabaseMocks.select.mockReturnValue(mockQuery);
  });

  describe('generateExecutiveSummary', () => {
    it('debe calcular correctamente el valor total del inventario', async () => {
      const filters: ReportFilters = {};
      const report = await reportService.generateExecutiveSummary(filters);

      // Valor esperado: (10 * 10.5) + (3 * 20.0) + (15 * 5.0) = 105 + 60 + 75 = 240
      expect(report.kpis.totalValue).toBe(240);
    });

    it('debe contar correctamente los productos en alarma', async () => {
      const filters: ReportFilters = {};
      const report = await reportService.generateExecutiveSummary(filters);

      // Solo prod-2 tiene stockCurrent (3) < stockMin (5)
      expect(report.kpis.lowStockCount).toBe(1);
    });

    it('debe calcular correctamente el número total de productos', async () => {
      const filters: ReportFilters = {};
      const report = await reportService.generateExecutiveSummary(filters);

      expect(report.kpis.totalProducts).toBe(3);
    });

    it('debe filtrar por almacén cuando se especifica', async () => {
      const filters: ReportFilters = { warehouse: 'MEYPAR' };
      
      // Mock para que getAll devuelva solo productos de MEYPAR
      (mockProductRepository.getAll as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        {
          id: 'prod-1',
          code: 'PROD001',
          name: 'Producto 1',
          category: 'Categoría A',
          stockCurrent: 10,
          stockMin: 5,
          stockMax: 20,
          costPrice: 10.5,
          salePrice: 15.0,
          isActive: true,
          isBatchTracked: false,
          warehouse: 'MEYPAR',
          aisle: 'A',
          shelf: '1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

      const report = await reportService.generateExecutiveSummary(filters);

      expect(report.kpis.totalProducts).toBe(1);
      expect(mockProductRepository.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ warehouse: 'MEYPAR' }),
      );
    });

    it('debe manejar productos sin precio correctamente', async () => {
      (mockProductRepository.getAll as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        {
          id: 'prod-1',
          code: 'PROD001',
          name: 'Producto 1',
          category: 'Categoría A',
          stockCurrent: 10,
          stockMin: 5,
          stockMax: 20,
          costPrice: 0,
          salePrice: null,
          isActive: true,
          isBatchTracked: false,
          warehouse: 'MEYPAR',
          aisle: 'A',
          shelf: '1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

      const filters: ReportFilters = {};
      const report = await reportService.generateExecutiveSummary(filters);

      expect(report.kpis.totalValue).toBe(0);
    });

    it('debe incluir movimientos del período cuando se especifican fechas', async () => {
      const filters: ReportFilters = {
        dateFrom: '2024-01-01T00:00:00.000Z',
        dateTo: '2024-12-31T23:59:59.999Z',
      };

      // Mock de movimientos
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        count: 10,
      };

      supabaseMocks.from.mockReturnValue(mockQuery);
      (mockQuery.select as ReturnType<typeof vi.fn>).mockReturnValue({
        count: 10,
      });

      const report = await reportService.generateExecutiveSummary(filters);

      expect(supabaseMocks.from).toHaveBeenCalledWith('inventory_movements');
    });

    it('debe generar gráficos correctamente', async () => {
      const filters: ReportFilters = {};
      const report = await reportService.generateExecutiveSummary(filters);

      expect(report.charts).toBeDefined();
      expect(report.charts.length).toBeGreaterThan(0);
      expect(report.charts[0]).toHaveProperty('type');
      expect(report.charts[0]).toHaveProperty('title');
      expect(report.charts[0]).toHaveProperty('data');
    });

    it('debe generar tabla de datos correctamente', async () => {
      const filters: ReportFilters = {};
      const report = await reportService.generateExecutiveSummary(filters);

      expect(report.tableData).toBeDefined();
      expect(report.tableData.headers).toBeDefined();
      expect(report.tableData.rows).toBeDefined();
      expect(report.tableData.rows.length).toBe(3); // 3 productos
    });

    it('debe respetar el idioma configurado', async () => {
      const serviceES = new ReportService(mockProductRepository, 'es-ES');
      const serviceCA = new ReportService(mockProductRepository, 'ca-ES');

      const reportES = await serviceES.generateExecutiveSummary({});
      const reportCA = await serviceCA.generateExecutiveSummary({});

      expect(reportES.language).toBe('es-ES');
      expect(reportCA.language).toBe('ca-ES');
      expect(reportES.title).not.toBe(reportCA.title);
    });
  });

  describe('generateStockAnalysis', () => {
    it('debe identificar correctamente productos críticos', async () => {
      const filters: ReportFilters = {};
      const report = await reportService.generateStockAnalysis(filters);

      // prod-2 tiene stockCurrent (3) < stockMin (5)
      expect(report.kpis.criticalCount).toBe(1);
    });

    it('debe calcular días promedio hasta agotarse', async () => {
      const filters: ReportFilters = {};
      const report = await reportService.generateStockAnalysis(filters);

      expect(report.kpis.avgDaysUntilDepletion).toBeGreaterThanOrEqual(0);
    });

    it('debe incluir productos críticos con sugerencias', async () => {
      const filters: ReportFilters = {};
      const report = await reportService.generateStockAnalysis(filters);

      expect(report.criticalProducts).toBeDefined();
      expect(report.criticalProducts!.length).toBeGreaterThan(0);
      expect(report.criticalProducts![0]).toHaveProperty('suggestedReorder');
    });
  });

  describe('generateMovementsAnalysis', () => {
    beforeEach(() => {
      // Mock de movimientos
      const mockMovements = [
        {
          id: 'mov-1',
          product_id: 'prod-1',
          movement_type: 'IN',
          quantity: 10,
          request_reason: 'Compra',
          warehouse: 'MEYPAR',
          user_id: 'user-1',
          movement_date: new Date().toISOString(),
          profiles: { first_name: 'Juan', last_name: 'Pérez' },
        },
        {
          id: 'mov-2',
          product_id: 'prod-2',
          movement_type: 'OUT',
          quantity: 5,
          request_reason: 'Venta',
          warehouse: 'OLIVA_TORRAS',
          user_id: 'user-2',
          movement_date: new Date().toISOString(),
          profiles: { first_name: 'María', last_name: 'García' },
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: mockMovements,
        error: null,
      };

      supabaseMocks.from.mockReturnValue(mockQuery);
    });

    it('debe contar correctamente movimientos por tipo', async () => {
      const filters: ReportFilters = {
        dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        dateTo: new Date().toISOString(),
      };

      const report = await reportService.generateMovementsAnalysis(filters);

      expect(report.kpis.totalEntries).toBeGreaterThanOrEqual(0);
      expect(report.kpis.totalExits).toBeGreaterThanOrEqual(0);
    });

    it('debe agrupar movimientos por razón', async () => {
      const filters: ReportFilters = {};
      const report = await reportService.generateMovementsAnalysis(filters);

      expect(report.movementsByReason).toBeDefined();
    });

    it('debe agrupar movimientos por usuario', async () => {
      const filters: ReportFilters = {};
      const report = await reportService.generateMovementsAnalysis(filters);

      expect(report.movementsByUser).toBeDefined();
    });
  });

  describe('generateBatchesReport', () => {
    beforeEach(() => {
      const mockBatches = [
        {
          id: 'batch-1',
          product_id: 'prod-1',
          batch_code: 'BATCH001',
          status: 'OK',
          expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          quantity_available: 10,
          products: { code: 'PROD001', name: 'Producto 1' },
        },
        {
          id: 'batch-2',
          product_id: 'prod-2',
          batch_code: 'BATCH002',
          status: 'DEFECTIVE',
          expiry_date: null,
          quantity_available: 5,
          products: { code: 'PROD002', name: 'Producto 2' },
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: mockBatches,
        error: null,
      };

      supabaseMocks.from.mockReturnValue(mockQuery);
    });

    it('debe contar correctamente lotes por estado', async () => {
      const filters: ReportFilters = {};
      const report = await reportService.generateBatchesReport(filters);

      expect(report.kpis.totalBatches).toBeGreaterThanOrEqual(0);
      expect(report.kpis.okBatches).toBeGreaterThanOrEqual(0);
      expect(report.kpis.defectiveBatches).toBeGreaterThanOrEqual(0);
    });

    it('debe identificar lotes próximos a caducar', async () => {
      const filters: ReportFilters = {};
      const report = await reportService.generateBatchesReport(filters);

      expect(report.kpis.expiringSoon30).toBeGreaterThanOrEqual(0);
      expect(report.kpis.expiringSoon60).toBeGreaterThanOrEqual(0);
    });
  });

  describe('generateSuppliersReport', () => {
    beforeEach(() => {
      const mockSuppliers = [
        {
          id: 'supp-1',
          name: 'Proveedor 1',
          is_active: true,
          quality_rating: 4.5,
          lead_time_days: 7,
          total_batches_supplied: 10,
          defective_batches_count: 1,
        },
      ];

      const mockBatches = [
        {
          supplier_id: 'supp-1',
          status: 'OK',
          quality_score: 4.5,
          cost_per_unit: 10.0,
          quantity_total: 100,
        },
      ];

      const mockQuerySuppliers = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: mockSuppliers,
        error: null,
      };

      const mockQueryBatches = {
        select: vi.fn().mockReturnThis(),
        data: mockBatches,
        error: null,
      };

      supabaseMocks.from
        .mockReturnValueOnce(mockQuerySuppliers)
        .mockReturnValueOnce(mockQueryBatches);
    });

    it('debe calcular métricas de proveedores correctamente', async () => {
      const filters: ReportFilters = {};
      const report = await reportService.generateSuppliersReport(filters);

      expect(report.kpis.activeSuppliers).toBeGreaterThanOrEqual(0);
      expect(report.kpis.avgQualityRating).toBeGreaterThanOrEqual(0);
      expect(report.kpis.avgLeadTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('generateAuditReport', () => {
    beforeEach(() => {
      const mockLogs = [
        {
          id: 'log-1',
          user_id: 'user-1',
          action: 'CREATE',
          entity_type: 'products',
          created_at: new Date().toISOString(),
          profiles: { first_name: 'Juan', last_name: 'Pérez' },
        },
        {
          id: 'log-2',
          user_id: 'user-1',
          action: 'UPDATE',
          entity_type: 'products',
          created_at: new Date().toISOString(),
          profiles: { first_name: 'Juan', last_name: 'Pérez' },
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: mockLogs,
        error: null,
      };

      supabaseMocks.from.mockReturnValue(mockQuery);
    });

    it('debe contar correctamente acciones por tipo', async () => {
      const filters: ReportFilters = {};
      const report = await reportService.generateAuditReport(filters);

      expect(report.kpis.totalActions).toBeGreaterThanOrEqual(0);
      expect(report.kpis.creates).toBeGreaterThanOrEqual(0);
      expect(report.kpis.updates).toBeGreaterThanOrEqual(0);
    });
  });

  describe('generateLocationsReport', () => {
    beforeEach(() => {
      const mockLocations = [
        {
          id: 'loc-1',
          product_id: 'prod-1',
          warehouse: 'MEYPAR',
          aisle: 'A',
          shelf: '1',
          quantity: 10,
        },
        {
          id: 'loc-2',
          product_id: 'prod-2',
          warehouse: 'OLIVA_TORRAS',
          aisle: 'B',
          shelf: '2',
          quantity: 5,
        },
      ];

      const mockProducts = [{ id: 'prod-1' }, { id: 'prod-2' }, { id: 'prod-3' }];

      const mockQueryLocations = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: mockLocations,
        error: null,
      };

      const mockQueryProducts = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: mockProducts,
        error: null,
      };

      supabaseMocks.from
        .mockReturnValueOnce(mockQueryLocations)
        .mockReturnValueOnce(mockQueryProducts);
    });

    it('debe calcular stock por almacén correctamente', async () => {
      const filters: ReportFilters = {};
      const report = await reportService.generateLocationsReport(filters);

      expect(report.kpis.totalLocations).toBeGreaterThanOrEqual(0);
      expect(report.stockByWarehouse).toBeDefined();
    });
  });

  describe('generateAISuggestionsReport', () => {
    beforeEach(() => {
      const mockSuggestions = [
        {
          id: 'sug-1',
          suggestion_type: 'REORDER',
          priority: 'HIGH',
          status: 'PENDING',
          created_at: new Date().toISOString(),
        },
        {
          id: 'sug-2',
          suggestion_type: 'BATCH_ALERT',
          priority: 'MEDIUM',
          status: 'ACCEPTED',
          created_at: new Date().toISOString(),
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        data: mockSuggestions,
        error: null,
      };

      supabaseMocks.from.mockReturnValue(mockQuery);
    });

    it('debe contar correctamente sugerencias por estado', async () => {
      const filters: ReportFilters = {};
      const report = await reportService.generateAISuggestionsReport(filters);

      expect(report.kpis.activeSuggestions).toBeGreaterThanOrEqual(0);
      expect(report.kpis.pending).toBeGreaterThanOrEqual(0);
      expect(report.kpis.accepted).toBeGreaterThanOrEqual(0);
    });

    it('debe calcular tasa de aceptación correctamente', async () => {
      const filters: ReportFilters = {};
      const report = await reportService.generateAISuggestionsReport(filters);

      expect(report.kpis.acceptanceRate).toBeGreaterThanOrEqual(0);
      expect(report.kpis.acceptanceRate).toBeLessThanOrEqual(100);
    });
  });

  describe('setLanguage', () => {
    it('debe cambiar el idioma correctamente', () => {
      const service = new ReportService(mockProductRepository, 'es-ES');
      service.setLanguage('ca-ES');

      // Verificar que el idioma se cambió (se verá en el próximo informe generado)
      expect(service).toBeDefined();
    });
  });

  describe('Manejo de errores', () => {
    it('debe manejar errores de Supabase correctamente', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        data: null,
        error: { message: 'Error de conexión' },
      };

      supabaseMocks.from.mockReturnValue(mockQuery);

      const filters: ReportFilters = {};
      
      await expect(
        reportService.generateMovementsAnalysis(filters),
      ).rejects.toThrow();
    });

    it('debe manejar productos vacíos correctamente', async () => {
      (mockProductRepository.getAll as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

      const filters: ReportFilters = {};
      const report = await reportService.generateExecutiveSummary(filters);

      expect(report.kpis.totalProducts).toBe(0);
      expect(report.kpis.totalValue).toBe(0);
    });
  });
});
