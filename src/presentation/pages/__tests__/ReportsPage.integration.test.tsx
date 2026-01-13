/**
 * Tests de integración para ReportsPage.
 *
 * Verifica la integración completa entre componentes,
 * servicios y hooks de la página de informes.
 *
 * @module @presentation/pages/__tests__/ReportsPage.integration.test
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportsPage } from '../ReportsPage';
import { ReportService } from '@application/services/ReportService';
import type { ExecutiveSummaryReport } from '@domain/entities/Report';

// Mock de ReportService
vi.mock('@application/services/ReportService', () => ({
  ReportService: vi.fn().mockImplementation(() => ({
    generateExecutiveSummary: vi.fn(),
    generateStockAnalysis: vi.fn(),
    generateMovementsAnalysis: vi.fn(),
    generateBatchesReport: vi.fn(),
    generateSuppliersReport: vi.fn(),
    generateAuditReport: vi.fn(),
    generateLocationsReport: vi.fn(),
    generateAISuggestionsReport: vi.fn(),
    setLanguage: vi.fn(),
  })),
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

// Mock de componentes de informes
vi.mock('../../components/reports/ReportCard', () => ({
  ReportCard: ({ title, onView, onExport, onSchedule }: any) => (
    <div data-testid="report-card">
      <h3>{title}</h3>
      <button onClick={onView}>Ver</button>
      <button onClick={onExport}>Exportar</button>
      <button onClick={onSchedule}>Programar</button>
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
  ReportCharts: ({ charts }: any) => (
    <div data-testid="report-charts">
      {charts?.length || 0} gráficos
    </div>
  ),
}));

vi.mock('../../components/reports/ReportTable', () => ({
  ReportTable: ({ data }: any) => (
    <div data-testid="report-table">
      {data?.headers?.length || 0} columnas
    </div>
  ),
}));

vi.mock('../../components/reports/ReportFilters', () => ({
  ReportFiltersComponent: ({ onApply, onClear }: any) => (
    <div data-testid="report-filters">
      <button onClick={onApply}>Aplicar</button>
      <button onClick={onClear}>Limpiar</button>
    </div>
  ),
}));

describe('ReportsPage Integration', () => {
  let mockReportService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockReportService = {
      generateExecutiveSummary: vi.fn().mockResolvedValue({
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
            data: { labels: ['A', 'B'], datasets: [{ label: 'Categorías', data: [5, 5] }] },
          },
        ],
        tableData: {
          headers: ['Código', 'Nombre'],
          rows: [{ Código: 'PROD001', Nombre: 'Producto 1' }],
        },
        language: 'es-ES',
      } as ExecutiveSummaryReport),
      generateStockAnalysis: vi.fn(),
      generateMovementsAnalysis: vi.fn(),
      generateBatchesReport: vi.fn(),
      generateSuppliersReport: vi.fn(),
      generateAuditReport: vi.fn(),
      generateLocationsReport: vi.fn(),
      generateAISuggestionsReport: vi.fn(),
      setLanguage: vi.fn(),
    };

    (ReportService as any).mockImplementation(() => mockReportService);
  });

  it('debe renderizar la página de informes correctamente', () => {
    render(<ReportsPage />);
    
    expect(screen.getByText('reports.title')).toBeInTheDocument();
    expect(screen.getAllByTestId('report-card').length).toBeGreaterThan(0);
  });

  it('debe generar y mostrar informe ejecutivo completo', async () => {
    const user = userEvent.setup();
    render(<ReportsPage />);

    const viewButtons = screen.getAllByText('Ver');
    await user.click(viewButtons[0]);

    await waitFor(() => {
      expect(mockReportService.generateExecutiveSummary).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('Resumen Ejecutivo')).toBeInTheDocument();
    });
  });

  it('debe aplicar filtros y regenerar informe', async () => {
    const user = userEvent.setup();
    render(<ReportsPage />);

    // Abrir filtros
    const filterButton = screen.getByText('reports.filters');
    await user.click(filterButton);

    // Aplicar filtros
    const applyButton = screen.getByText('Aplicar');
    await user.click(applyButton);

    await waitFor(() => {
      expect(mockReportService.generateExecutiveSummary).toHaveBeenCalled();
    });
  });

  it('debe limpiar filtros correctamente', async () => {
    const user = userEvent.setup();
    render(<ReportsPage />);

    // Abrir filtros
    const filterButton = screen.getByText('reports.filters');
    await user.click(filterButton);

    // Limpiar filtros
    const clearButton = screen.getByText('Limpiar');
    await user.click(clearButton);

    await waitFor(() => {
      expect(mockReportService.generateExecutiveSummary).toHaveBeenCalledWith({});
    });
  });

  it('debe mostrar KPIs correctamente cuando se genera un informe', async () => {
    const user = userEvent.setup();
    render(<ReportsPage />);

    const viewButtons = screen.getAllByText('Ver');
    await user.click(viewButtons[0]);

    await waitFor(() => {
      const kpis = screen.getAllByTestId('report-kpi');
      expect(kpis.length).toBeGreaterThan(0);
    });
  });

  it('debe mostrar gráficos cuando se genera un informe', async () => {
    const user = userEvent.setup();
    render(<ReportsPage />);

    const viewButtons = screen.getAllByText('Ver');
    await user.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('report-charts')).toBeInTheDocument();
    });
  });

  it('debe mostrar tabla de datos cuando se genera un informe', async () => {
    const user = userEvent.setup();
    render(<ReportsPage />);

    const viewButtons = screen.getAllByText('Ver');
    await user.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('report-table')).toBeInTheDocument();
    });
  });

  it('debe manejar errores de generación correctamente', async () => {
    const user = userEvent.setup();
    mockReportService.generateExecutiveSummary.mockRejectedValueOnce(
      new Error('Error de conexión'),
    );

    render(<ReportsPage />);

    const viewButtons = screen.getAllByText('Ver');
    await user.click(viewButtons[0]);

    await waitFor(() => {
      expect(mockReportService.generateExecutiveSummary).toHaveBeenCalled();
    });
  });

  it('debe volver a la lista de informes desde la vista de informe', async () => {
    const user = userEvent.setup();
    render(<ReportsPage />);

    // Generar informe
    const viewButtons = screen.getAllByText('Ver');
    await user.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Resumen Ejecutivo')).toBeInTheDocument();
    });

    // Volver
    const backButton = screen.getByText('common.back');
    await user.click(backButton);

    await waitFor(() => {
      expect(screen.getAllByTestId('report-card').length).toBeGreaterThan(0);
    });
  });
});
