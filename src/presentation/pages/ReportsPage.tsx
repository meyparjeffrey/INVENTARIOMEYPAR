/**
 * Página principal de informes.
 *
 * Muestra una lista de informes predefinidos con tarjetas,
 * permite generar, ver y exportar informes, y crear informes personalizados.
 *
 * @module @presentation/pages/ReportsPage
 * @requires @presentation/components/reports/ReportCard
 * @requires @application/services/ReportService
 * @requires @presentation/context/LanguageContext
 */

import {
  BarChart3,
  Package,
  TrendingDown,
  ArrowUpDown,
  Layers,
  Users,
  FileText,
  MapPin,
  Lightbulb,
  Plus,
  Calendar,
} from 'lucide-react';
import * as React from 'react';
import { ReportCard } from '../components/reports/ReportCard';
import { ReportKPI } from '../components/reports/ReportKPI';
import { ReportCharts } from '../components/reports/ReportCharts';
import { ReportTable } from '../components/reports/ReportTable';
import { useLanguage } from '../context/LanguageContext';
import { ReportService } from '@application/services/ReportService';
import type { ReportFilters, ExecutiveSummaryReport } from '@domain/entities/Report';
import {
  DollarSign,
  Package,
  AlertTriangle,
  ArrowUpDown,
  TrendingUp,
  Boxes,
  X,
} from 'lucide-react';

/**
 * Página principal de informes.
 */
export function ReportsPage() {
  const { t, language } = useLanguage();
  const [loading, setLoading] = React.useState(false);
  const [currentReport, setCurrentReport] = React.useState<ExecutiveSummaryReport | null>(
    null,
  );
  const reportService = React.useMemo(
    () => new ReportService(undefined, language),
    [language],
  );

  const handleGenerateReport = React.useCallback(
    async (type: string, filters: ReportFilters = {}) => {
      setLoading(true);
      try {
        let report;
        switch (type) {
          case 'executive_summary':
            report = await reportService.generateExecutiveSummary(filters);
            setCurrentReport(report);
            break;
          default:
            throw new Error(`Tipo de informe no implementado: ${type}`);
        }
      } catch (error) {
        console.error('Error generando informe:', error);
        // TODO: Mostrar toast de error
      } finally {
        setLoading(false);
      }
    },
    [reportService],
  );

  const handleViewReport = React.useCallback(
    (type: string) => {
      handleGenerateReport(type);
    },
    [handleGenerateReport],
  );

  const handleExportReport = React.useCallback((type: string) => {
    // TODO: Implementar exportación
    console.log('Exportar informe:', type);
  }, []);

  const handleScheduleReport = React.useCallback((type: string) => {
    // TODO: Implementar programación
    console.log('Programar informe:', type);
  }, []);

  // Si hay un informe generado, mostrarlo
  if (currentReport) {
    return (
      <div className="space-y-6">
        {/* Header con botón de volver */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
              {currentReport.title}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('reports.subtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCurrentReport(null)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {t('common.back')}
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {currentReport.type === 'executive_summary' && (
            <>
              <ReportKPI
                label={t('reports.kpi.totalValue')}
                value={currentReport.kpis.totalValue}
                icon={<DollarSign className="h-5 w-5" />}
                accentColor="blue"
                format="currency"
                language={language}
              />
              <ReportKPI
                label={t('reports.kpi.totalProducts')}
                value={currentReport.kpis.totalProducts}
                icon={<Package className="h-5 w-5" />}
                accentColor="green"
                format="number"
                language={language}
              />
              <ReportKPI
                label={t('reports.kpi.lowStock')}
                value={currentReport.kpis.lowStockCount}
                icon={<AlertTriangle className="h-5 w-5" />}
                accentColor="amber"
                format="number"
                language={language}
              />
              <ReportKPI
                label={t('reports.kpi.movements')}
                value={currentReport.kpis.movementsCount}
                icon={<ArrowUpDown className="h-5 w-5" />}
                accentColor="purple"
                format="number"
                language={language}
              />
              <ReportKPI
                label={t('reports.kpi.turnover')}
                value={currentReport.kpis.turnoverRate}
                icon={<TrendingUp className="h-5 w-5" />}
                accentColor="indigo"
                format="number"
                language={language}
              />
              <ReportKPI
                label={t('reports.kpi.avgStock')}
                value={currentReport.kpis.avgStockValue}
                icon={<Boxes className="h-5 w-5" />}
                accentColor="blue"
                format="currency"
                language={language}
              />
              <ReportKPI
                label={
                  language === 'ca-ES'
                    ? 'Productes sense Moviment'
                    : 'Productos sin Movimiento'
                }
                value={currentReport.kpis.productsWithoutMovement}
                icon={<X className="h-5 w-5" />}
                accentColor="red"
                format="number"
                language={language}
              />
            </>
          )}
        </div>

        {/* Gráficos */}
        {currentReport.charts.length > 0 && (
          <div>
            <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-50">
              {language === 'ca-ES' ? 'Gràfics' : 'Gráficos'}
            </h2>
            <ReportCharts charts={currentReport.charts} />
          </div>
        )}

        {/* Tabla de datos */}
        <div>
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-50">
            {t('reports.tableData')}
          </h2>
          <ReportTable data={currentReport.tableData} />
        </div>
      </div>
    );
  }

  // Vista principal con lista de informes
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
            {t('reports.title')}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('reports.subtitle')}
          </p>
        </div>
      </div>

      {/* Grid de informes predefinidos */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <ReportCard
          type="executive_summary"
          title={t('reports.executiveSummary')}
          description={t('reports.executiveSummary.desc')}
          icon={<BarChart3 className="h-6 w-6" />}
          accentColor="blue"
          onView={() => handleViewReport('executive_summary')}
          onExport={() => handleExportReport('executive_summary')}
          onSchedule={() => handleScheduleReport('executive_summary')}
          loading={loading}
        />

        <ReportCard
          type="stock_analysis"
          title={t('reports.stockAnalysis')}
          description={t('reports.stockAnalysis.desc')}
          icon={<TrendingDown className="h-6 w-6" />}
          accentColor="amber"
          onView={() => handleViewReport('stock_analysis')}
          onExport={() => handleExportReport('stock_analysis')}
          onSchedule={() => handleScheduleReport('stock_analysis')}
          loading={loading}
        />

        <ReportCard
          type="movements_analysis"
          title={t('reports.movementsAnalysis')}
          description={t('reports.movementsAnalysis.desc')}
          icon={<ArrowUpDown className="h-6 w-6" />}
          accentColor="purple"
          onView={() => handleViewReport('movements_analysis')}
          onExport={() => handleExportReport('movements_analysis')}
          onSchedule={() => handleScheduleReport('movements_analysis')}
          loading={loading}
        />

        <ReportCard
          type="batches_control"
          title={t('reports.batchesControl')}
          description={t('reports.batchesControl.desc')}
          icon={<Layers className="h-6 w-6" />}
          accentColor="green"
          onView={() => handleViewReport('batches_control')}
          onExport={() => handleExportReport('batches_control')}
          onSchedule={() => handleScheduleReport('batches_control')}
          loading={loading}
        />

        <ReportCard
          type="suppliers_analysis"
          title={t('reports.suppliersAnalysis')}
          description={t('reports.suppliersAnalysis.desc')}
          icon={<Users className="h-6 w-6" />}
          accentColor="indigo"
          onView={() => handleViewReport('suppliers_analysis')}
          onExport={() => handleExportReport('suppliers_analysis')}
          onSchedule={() => handleScheduleReport('suppliers_analysis')}
          loading={loading}
        />

        <ReportCard
          type="audit"
          title={t('reports.audit')}
          description={t('reports.audit.desc')}
          icon={<FileText className="h-6 w-6" />}
          accentColor="red"
          onView={() => handleViewReport('audit')}
          onExport={() => handleExportReport('audit')}
          onSchedule={() => handleScheduleReport('audit')}
          loading={loading}
        />

        <ReportCard
          type="locations"
          title={t('reports.locations')}
          description={t('reports.locations.desc')}
          icon={<MapPin className="h-6 w-6" />}
          accentColor="blue"
          onView={() => handleViewReport('locations')}
          onExport={() => handleExportReport('locations')}
          onSchedule={() => handleScheduleReport('locations')}
          loading={loading}
        />

        <ReportCard
          type="ai_suggestions"
          title={t('reports.aiSuggestions')}
          description={t('reports.aiSuggestions.desc')}
          icon={<Lightbulb className="h-6 w-6" />}
          accentColor="amber"
          onView={() => handleViewReport('ai_suggestions')}
          onExport={() => handleExportReport('ai_suggestions')}
          onSchedule={() => handleScheduleReport('ai_suggestions')}
          loading={loading}
        />
      </div>

      {/* Botón para crear informe personalizado */}
      <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800/50">
        <Plus className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-50">
          {t('reports.custom')}
        </h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {t('reports.builder.title')}
        </p>
        <button
          type="button"
          className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          {t('reports.custom')}
        </button>
      </div>

      {/* Sección de informes programados */}
      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            {t('reports.scheduled')}
          </h3>
        </div>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {t('reports.schedule.title')}
        </p>
        {/* TODO: Lista de informes programados */}
      </div>
    </div>
  );
}
