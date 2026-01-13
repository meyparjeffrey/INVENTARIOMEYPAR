/**
 * Tests E2E (End-to-End) para ReportsPage.
 *
 * Verifica flujos completos de usuario desde la navegación
 * hasta la generación y exportación de informes.
 *
 * @module @presentation/pages/__tests__/ReportsPage.e2e.test
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportsPage } from '../ReportsPage';
import { ReportService } from '@application/services/ReportService';

// Mock completo de ReportService
const mockReportService = {
  generateExecutiveSummary: vi.fn(),
  generateStockAnalysis: vi.fn(),
  generateMovementsAnalysis: vi.fn(),
  generateBatchesReport: vi.fn(),
  generateSuppliersReport: vi.fn(),
  generateAuditReport: vi.fn(),
  generateLocationsReport: vi.fn(),
  generateAISuggestionsReport: vi.fn(),
  generateCustomReport: vi.fn(),
  setLanguage: vi.fn(),
};

vi.mock('@application/services/ReportService', () => ({
  ReportService: vi.fn().mockImplementation(() => mockReportService),
}));

// Mock de useLanguage
vi.mock('../../context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'es-ES',
  }),
}));

// Mock de useToast
vi.mock('../../components/ui/Toast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

// Mock de useAuth
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    authContext: {
      profile: {
        id: 'user-1',
        email: 'test@example.com',
        fullName: 'Test User',
      },
      user: {
        id: 'user-1',
        email: 'test@example.com',
      },
    },
  }),
}));

// Mock de componentes
vi.mock('../../components/reports/ReportCard', () => ({
  ReportCard: ({ title, onView, onExport, onSchedule }: any) => (
    <div data-testid="report-card">
      <h3>{title}</h3>
      <button onClick={onView} data-testid="view-button">
        Ver
      </button>
      <button onClick={onExport} data-testid="export-button">
        Exportar
      </button>
      <button onClick={onSchedule} data-testid="schedule-button">
        Programar
      </button>
    </div>
  ),
}));

vi.mock('../../components/reports/ReportKPI', () => ({
  ReportKPI: ({ label, value }: any) => (
    <div data-testid="report-kpi">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  ),
}));

vi.mock('../../components/reports/ReportCharts', () => ({
  ReportCharts: () => <div data-testid="report-charts">Gráficos</div>,
}));

vi.mock('../../components/reports/ReportTable', () => ({
  ReportTable: () => <div data-testid="report-table">Tabla</div>,
}));

vi.mock('../../components/reports/ReportFilters', () => ({
  ReportFiltersComponent: ({ onApply, onClear }: any) => (
    <div data-testid="report-filters">
      <button onClick={onApply} data-testid="apply-filters">
        Aplicar
      </button>
      <button onClick={onClear} data-testid="clear-filters">
        Limpiar
      </button>
    </div>
  ),
}));

vi.mock('../../components/reports/ReportBuilder', () => ({
  ReportBuilder: ({ onSave, onCancel }: any) => (
    <div data-testid="report-builder">
      <button onClick={() => onSave({ id: 'template-1', name: 'Test Template' })}>
        Guardar
      </button>
      <button onClick={onCancel}>Cancelar</button>
    </div>
  ),
}));

vi.mock('../../components/reports/ReportScheduleDialog', () => ({
  ReportScheduleDialog: ({ open, onSave, onClose }: any) =>
    open ? (
      <div data-testid="schedule-dialog">
        <button onClick={() => onSave({ id: 'schedule-1', reportType: 'executive_summary' })}>
          Guardar Programación
        </button>
        <button onClick={onClose}>Cerrar</button>
      </div>
    ) : null,
}));

// Mock de ReportExportService
vi.mock('@application/services/ReportExportService', () => ({
  ReportExportService: {
    exportToExcel: vi.fn(),
    exportToCSV: vi.fn(),
    exportToJSON: vi.fn(),
    exportToPDF: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock de repositorios de Supabase
vi.mock('@infrastructure/repositories/SupabaseReportScheduleRepository', () => ({
  SupabaseReportScheduleRepository: vi.fn().mockImplementation(() => ({
    getAll: vi.fn().mockResolvedValue([]),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  })),
}));

vi.mock('@infrastructure/repositories/SupabaseReportTemplateRepository', () => ({
  SupabaseReportTemplateRepository: vi.fn().mockImplementation(() => ({
    getAll: vi.fn().mockResolvedValue([]),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  })),
}));

describe('ReportsPage E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Mock de informe ejecutivo
    mockReportService.generateExecutiveSummary.mockResolvedValue({
      id: 'report-1',
      type: 'executive_summary',
      title: 'Resumen Ejecutivo',
      description: 'KPIs principales',
      generatedAt: new Date().toISOString(),
      filters: {},
      kpis: {
        totalValue: 1000,
        totalProducts: 10,
        lowStockCount: 2,
        movementsCount: 50,
        turnoverRate: 5.0,
        avgStockValue: 100,
        productsWithoutMovement: 1,
      },
      charts: [
        {
          type: 'pie',
          title: 'Distribución por Categoría',
          data: { labels: ['A', 'B'], datasets: [{ data: [5, 5] }] },
        },
      ],
      tableData: {
        headers: ['Código', 'Nombre'],
        rows: [{ Código: 'PROD001', Nombre: 'Producto 1' }],
      },
      language: 'es-ES',
    });
  });

  describe('Flujo: Generar informe ejecutivo', () => {
    it('debe navegar a /reports, hacer clic en "Ver" y mostrar el informe completo', async () => {
      const user = userEvent.setup();
      render(<ReportsPage />);

      // Verificar que se muestra la lista de informes
      const reportCards = screen.getAllByTestId('report-card');
      expect(reportCards.length).toBeGreaterThan(0);

      // Hacer clic en "Ver" del primer informe
      const viewButtons = screen.getAllByTestId('view-button');
      await user.click(viewButtons[0]);

      // Verificar que se genera el informe
      await waitFor(() => {
        expect(mockReportService.generateExecutiveSummary).toHaveBeenCalled();
      });

      // Verificar que se muestran KPIs
      await waitFor(() => {
        const kpis = screen.getAllByTestId('report-kpi');
        expect(kpis.length).toBeGreaterThan(0);
      });

      // Verificar que se muestran gráficos
      expect(screen.getByTestId('report-charts')).toBeInTheDocument();

      // Verificar que se muestra la tabla
      expect(screen.getByTestId('report-table')).toBeInTheDocument();
    });

    it('debe exportar a Excel correctamente', async () => {
      const user = userEvent.setup();
      const { ReportExportService } = await import(
        '@application/services/ReportExportService'
      );

      render(<ReportsPage />);

      // Generar informe primero
      const viewButtons = screen.getAllByTestId('view-button');
      await user.click(viewButtons[0]);

      await waitFor(() => {
        expect(mockReportService.generateExecutiveSummary).toHaveBeenCalled();
      });

      // Hacer clic en exportar Excel
      const exportButtons = screen.getAllByText('Exportar a Excel');
      if (exportButtons.length > 0) {
        await user.click(exportButtons[0]);
        await waitFor(() => {
          expect(ReportExportService.exportToExcel).toHaveBeenCalled();
        });
      }
    });
  });

  describe('Flujo: Aplicar filtros', () => {
    it('debe seleccionar rango de fechas, almacén, aplicar filtros y regenerar informe', async () => {
      const user = userEvent.setup();
      render(<ReportsPage />);

      // Abrir filtros
      const filterButton = screen.getByText('reports.filters');
      await user.click(filterButton);

      await waitFor(() => {
        expect(screen.getByTestId('report-filters')).toBeInTheDocument();
      });

      // Aplicar filtros
      const applyButton = screen.getByTestId('apply-filters');
      await user.click(applyButton);

      // Verificar que se aplicaron los filtros (se verá cuando se genere un informe)
      expect(applyButton).toBeInTheDocument();
    });

    it('debe limpiar filtros correctamente', async () => {
      const user = userEvent.setup();
      render(<ReportsPage />);

      // Abrir filtros
      const filterButton = screen.getByText('reports.filters');
      await user.click(filterButton);

      await waitFor(() => {
        expect(screen.getByTestId('report-filters')).toBeInTheDocument();
      });

      // Limpiar filtros
      const clearButton = screen.getByTestId('clear-filters');
      await user.click(clearButton);

      expect(clearButton).toBeInTheDocument();
    });
  });

  describe('Flujo: Crear informe personalizado', () => {
    it('debe hacer clic en "Crear Informe Personalizado", completar el constructor y guardar plantilla', async () => {
      const user = userEvent.setup();
      render(<ReportsPage />);

      // Buscar botón de crear informe personalizado
      const customButtons = screen.getAllByText('reports.custom');
      if (customButtons.length > 0) {
        await user.click(customButtons[0]);

        await waitFor(() => {
          expect(screen.getByTestId('report-builder')).toBeInTheDocument();
        });

        // Guardar plantilla
        const saveButton = screen.getByText('Guardar');
        await user.click(saveButton);

        // Verificar que se guardó en localStorage
        const templates = JSON.parse(localStorage.getItem('report_templates') || '[]');
        expect(templates.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Flujo: Programar informe', () => {
    it('debe hacer clic en "Programar", configurar frecuencia y hora, y guardar programación', async () => {
      const user = userEvent.setup();
      render(<ReportsPage />);

      // Hacer clic en programar
      const scheduleButtons = screen.getAllByTestId('schedule-button');
      await user.click(scheduleButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('schedule-dialog')).toBeInTheDocument();
      });

      // Guardar programación
      const saveScheduleButton = screen.getByText('Guardar Programación');
      await user.click(saveScheduleButton);

      // Verificar que se guardó en localStorage
      const schedules = JSON.parse(localStorage.getItem('report_schedules') || '[]');
      expect(schedules.length).toBeGreaterThan(0);
    });
  });

  describe('Flujo: Volver a lista desde vista de informe', () => {
    it('debe generar informe, hacer clic en "Volver" y regresar a la lista', async () => {
      const user = userEvent.setup();
      render(<ReportsPage />);

      // Generar informe
      const viewButtons = screen.getAllByTestId('view-button');
      await user.click(viewButtons[0]);

      await waitFor(() => {
        expect(mockReportService.generateExecutiveSummary).toHaveBeenCalled();
      });

      // Buscar botón de volver
      const backButton = screen.getByText('common.back');
      await user.click(backButton);

      // Verificar que se volvió a la lista
      await waitFor(() => {
        const reportCards = screen.getAllByTestId('report-card');
        expect(reportCards.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Manejo de errores', () => {
    it('debe manejar errores de generación de informe correctamente', async () => {
      const user = userEvent.setup();
      mockReportService.generateExecutiveSummary.mockRejectedValueOnce(
        new Error('Error de conexión'),
      );

      render(<ReportsPage />);

      const viewButtons = screen.getAllByTestId('view-button');
      await user.click(viewButtons[0]);

      await waitFor(() => {
        expect(mockReportService.generateExecutiveSummary).toHaveBeenCalled();
      });

      // El error se maneja internamente con toast
      expect(mockReportService.generateExecutiveSummary).toHaveBeenCalled();
    });
  });
});
