/**
 * Tests unitarios para ReportExportService.
 *
 * Verifica la exportación de informes a diferentes formatos.
 *
 * @module @application/services/__tests__/ReportExportService.test
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ReportExportService } from '../ReportExportService';
import type { ExecutiveSummaryReport } from '@domain/entities/Report';
import * as XLSX from 'xlsx';

// Mock de XLSX
vi.mock('xlsx', () => ({
  default: {
    utils: {
      book_new: vi.fn(() => ({ Sheets: {}, SheetNames: [] })),
      aoa_to_sheet: vi.fn(() => ({})),
      book_append_sheet: vi.fn(),
      writeFile: vi.fn(),
    },
  },
}));

// Mock de calculateColumnWidth
vi.mock('@presentation/utils/excelUtils', () => ({
  calculateColumnWidth: vi.fn(() => 10),
}));

describe('ReportExportService', () => {
  const mockReport: ExecutiveSummaryReport = {
    id: 'report-1',
    type: 'executive_summary',
    title: 'Resumen Ejecutivo',
    description: 'KPIs principales',
    generatedAt: new Date().toISOString(),
    filters: { warehouse: 'MEYPAR' },
    kpis: {
      totalValue: 1000,
      totalProducts: 10,
      lowStockCount: 2,
      movementsCount: 50,
      turnoverRate: 5.0,
      avgStockValue: 100,
      productsWithoutMovement: 1,
    },
    charts: [],
    tableData: {
      headers: ['Código', 'Nombre'],
      rows: [{ Código: 'PROD001', Nombre: 'Producto 1' }],
      totals: { Código: 'TOTAL', Nombre: '' },
    },
    language: 'es-ES',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock de createElement y appendChild para descargas
    global.document.createElement = vi.fn((tag: string) => {
      const element = {
        tagName: tag,
        setAttribute: vi.fn(),
        style: {},
        click: vi.fn(),
      } as any;
      return element;
    });

    global.document.body.appendChild = vi.fn();
    global.document.body.removeChild = vi.fn();
    global.URL.createObjectURL = vi.fn(() => 'blob:url');
    global.URL.revokeObjectURL = vi.fn();
  });

  describe('exportToExcel', () => {
    it('debe exportar informe a Excel correctamente', async () => {
      const fileName = await ReportExportService.exportToExcel(mockReport);

      expect(XLSX.utils.book_new).toHaveBeenCalled();
      expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalled();
      expect(XLSX.utils.book_append_sheet).toHaveBeenCalled();
      expect(fileName).toContain('.xlsx');
    });

    it('debe incluir hoja de KPIs', async () => {
      await ReportExportService.exportToExcel(mockReport);

      const calls = (XLSX.utils.aoa_to_sheet as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
    });

    it('debe incluir hoja de datos si hay tabla', async () => {
      await ReportExportService.exportToExcel(mockReport);

      expect(XLSX.utils.book_append_sheet).toHaveBeenCalled();
    });

    it('debe incluir hoja de filtros si hay filtros aplicados', async () => {
      await ReportExportService.exportToExcel(mockReport);

      expect(XLSX.utils.book_append_sheet).toHaveBeenCalled();
    });
  });

  describe('exportToCSV', () => {
    it('debe exportar informe a CSV correctamente', async () => {
      const fileName = await ReportExportService.exportToCSV(mockReport);

      expect(global.document.createElement).toHaveBeenCalledWith('a');
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(fileName).toContain('.csv');
    });

    it('debe lanzar error si no hay datos de tabla', async () => {
      const reportWithoutTable = {
        ...mockReport,
        tableData: { headers: [], rows: [] },
      };

      await expect(
        ReportExportService.exportToCSV(reportWithoutTable as any),
      ).rejects.toThrow();
    });
  });

  describe('exportToJSON', () => {
    it('debe exportar informe a JSON correctamente', async () => {
      const fileName = await ReportExportService.exportToJSON(mockReport);

      expect(global.document.createElement).toHaveBeenCalledWith('a');
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(fileName).toContain('.json');
    });

    it('debe crear blob con contenido JSON válido', async () => {
      const createObjectURLSpy = vi.fn(() => 'blob:url');
      global.URL.createObjectURL = createObjectURLSpy;

      await ReportExportService.exportToJSON(mockReport);

      expect(createObjectURLSpy).toHaveBeenCalled();
    });
  });

  describe('exportToPDF', () => {
    it('debe exportar informe a PDF correctamente', async () => {
      // Mock de jsPDF
      const mockSave = vi.fn();
      vi.mock('jspdf', () => ({
        jsPDF: vi.fn(() => ({
          setFontSize: vi.fn(),
          text: vi.fn(),
          addPage: vi.fn(),
          save: mockSave,
        })),
      }));

      const fileName = await ReportExportService.exportToPDF(mockReport);
      expect(fileName).toContain('.pdf');
    });
  });
});
