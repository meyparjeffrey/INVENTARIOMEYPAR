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
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Boxes,
  X,
  Download,
  Filter,
} from 'lucide-react';
import * as React from 'react';
import { ReportCard } from '../components/reports/ReportCard';
import { ReportKPI } from '../components/reports/ReportKPI';
import { ReportCharts } from '../components/reports/ReportCharts';
import { ReportTable } from '../components/reports/ReportTable';
import { useLanguage } from '../context/LanguageContext';
import { ReportService } from '@application/services/ReportService';
import { ReportExportService } from '@application/services/ReportExportService';
import type {
  ReportFilters,
  Report,
  ExecutiveSummaryReport,
  StockAnalysisReport,
  MovementsAnalysisReport,
  BatchesReport,
  SuppliersReport,
  AuditReport,
  LocationsReport,
  AISuggestionsReport,
} from '@domain/entities/Report';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { ReportFiltersComponent } from '../components/reports/ReportFilters';
import { ReportBuilder } from '../components/reports/ReportBuilder';
import { ReportScheduleDialog } from '../components/reports/ReportScheduleDialog';
import type { ReportSchedule } from '@domain/entities/Report';
import { SupabaseReportScheduleRepository } from '@infrastructure/repositories/SupabaseReportScheduleRepository';
import { SupabaseReportTemplateRepository } from '@infrastructure/repositories/SupabaseReportTemplateRepository';
import type { ReportTemplate } from '@infrastructure/repositories/SupabaseReportTemplateRepository';
import { useAuth } from '../context/AuthContext';

/**
 * Página principal de informes.
 */
export function ReportsPage() {
  const { t, language } = useLanguage();
  const toast = useToast();
  const authContext = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [currentReport, setCurrentReport] = React.useState<Report | null>(null);
  const reportService = React.useMemo(
    () => new ReportService(undefined, language),
    [language],
  );
  const scheduleRepository = React.useMemo(
    () => new SupabaseReportScheduleRepository(),
    [],
  );
  const templateRepository = React.useMemo(
    () => new SupabaseReportTemplateRepository(),
    [],
  );
  const [templates, setTemplates] = React.useState<ReportTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = React.useState<ReportTemplate | null>(null);
  const [scheduleDialogOpen, setScheduleDialogOpen] = React.useState(false);
  const [scheduleReportType, setScheduleReportType] = React.useState<string | null>(null);
  const [reportFilters, setReportFilters] = React.useState<ReportFilters>({});

  const handleGenerateReport = React.useCallback(
    async (type: string, filters: ReportFilters = {}) => {
      setLoading(true);
      try {
        let report: Report;
        switch (type) {
          case 'executive_summary':
            report = await reportService.generateExecutiveSummary(filters);
            break;
          case 'stock_analysis':
            report = await reportService.generateStockAnalysis(filters);
            break;
          case 'movements_analysis':
            report = await reportService.generateMovementsAnalysis(filters);
            break;
          case 'batches_control':
            report = await reportService.generateBatchesReport(filters);
            break;
          case 'suppliers_analysis':
            report = await reportService.generateSuppliersReport(filters);
            break;
          case 'audit':
            report = await reportService.generateAuditReport(filters);
            break;
          case 'locations':
            report = await reportService.generateLocationsReport(filters);
            break;
          case 'ai_suggestions':
            report = await reportService.generateAISuggestionsReport(filters);
            break;
          case 'custom':
            if (!editingTemplate) {
              throw new Error(
                language === 'ca-ES'
                  ? 'No hi ha cap plantilla personalitzada seleccionada'
                  : 'No hay ninguna plantilla personalizada seleccionada',
              );
            }
            report = await reportService.generateCustomReport(
              {
                ...editingTemplate.config,
                filters: (editingTemplate.config.filters as ReportFilters) || {},
              },
              (filters as ReportFilters) || {},
            );
            break;
          default:
            throw new Error(`Tipo de informe no implementado: ${type}`);
        }
        setCurrentReport(report);
        toast.success(t('reports.generate'), t('reports.export.success'));
      } catch (error) {
        console.error('Error generando informe:', error);
        toast.error(
          t('reports.error'),
          error instanceof Error ? error.message : t('reports.error'),
        );
      } finally {
        setLoading(false);
      }
    },
    [reportService, toast, t, language, editingTemplate],
  );

  const handleViewReport = React.useCallback(
    (type: string) => {
      handleGenerateReport(type, reportFilters);
    },
    [handleGenerateReport, reportFilters],
  );

  const handleExportReport = React.useCallback(
    async (type: string, format: 'xlsx' | 'csv' | 'pdf' | 'json' = 'xlsx') => {
      if (!currentReport) {
        // Si no hay informe generado, generarlo primero
        await handleGenerateReport(type);
        // Esperar un momento para que se genere
        setTimeout(() => {
          // El informe se generará y se mostrará, luego el usuario puede exportar
          toast.success(
            t('reports.generate'),
            language === 'ca-ES'
              ? "Genera l'informe primer i després exporta'l"
              : 'Genera el informe primero y luego expórtalo',
          );
        }, 100);
        return;
      }

      try {
        // Verificar que el reporte tiene tableData antes de exportar
        if (!currentReport.tableData || !currentReport.tableData.headers || currentReport.tableData.headers.length === 0) {
          console.warn('⚠️ Reporte sin tableData:', {
            type: currentReport.type,
            hasTableData: !!currentReport.tableData,
            hasHeaders: currentReport.tableData?.headers?.length > 0,
            tableData: currentReport.tableData,
          });
        } else {
          console.log('✅ Exportando reporte con tableData:', {
            type: currentReport.type,
            headers: currentReport.tableData.headers.length,
            rows: currentReport.tableData.rows.length,
            headersList: currentReport.tableData.headers,
            firstRow: currentReport.tableData.rows[0],
            hasTotals: !!currentReport.tableData.totals,
          });
        }

        let fileName: string;
        
        switch (format) {
          case 'xlsx':
            fileName = await ReportExportService.exportToExcel(currentReport);
            break;
          case 'csv':
            fileName = await ReportExportService.exportToCSV(currentReport);
            break;
          case 'json':
            fileName = await ReportExportService.exportToJSON(currentReport);
            break;
          case 'pdf':
            fileName = await ReportExportService.exportToPDF(currentReport);
            break;
          default:
            throw new Error('Formato de exportación no válido');
        }

        // Mensaje de éxito con nombre del archivo
        const formatName = format.toUpperCase();
        const successMessage =
          language === 'ca-ES'
            ? `Informe exportat correctament a ${formatName}: ${fileName}`
            : `Informe exportado correctamente a ${formatName}: ${fileName}`;
        
        toast.success(
          t('reports.export.success'),
          successMessage,
        );
      } catch (error) {
        console.error('Error exportando informe:', error);
        const errorMessage =
          language === 'ca-ES'
            ? error instanceof Error
              ? `Error exportant: ${error.message}`
              : 'Error exportant el informe'
            : error instanceof Error
              ? `Error exportando: ${error.message}`
              : 'Error exportando el informe';
        
        toast.error(t('reports.export.error'), errorMessage);
      }
    },
    [currentReport, handleGenerateReport, toast, t, language],
  );

  const [showFilters, setShowFilters] = React.useState(false);
  const [showBuilder, setShowBuilder] = React.useState(false);

  const handleScheduleReport = React.useCallback((type: string) => {
    setScheduleReportType(type);
    setScheduleDialogOpen(true);
  }, []);

  // Cargar plantillas al montar
  React.useEffect(() => {
    const loadTemplates = async () => {
      try {
        const loadedTemplates = await templateRepository.getAll();
        setTemplates(loadedTemplates);
      } catch (error) {
        console.error('Error cargando plantillas:', error);
      }
    };

    if (authContext?.authContext?.profile?.id) {
      loadTemplates();
    }
  }, [templateRepository, authContext?.authContext?.profile?.id]);

  const handleSaveSchedule = React.useCallback(
    async (schedule: ReportSchedule) => {
      try {
        if (schedule.id && schedule.id.startsWith('schedule_')) {
          // Nueva programación
          const created = await scheduleRepository.create({
            reportType: schedule.reportType,
            frequency: schedule.frequency,
            time: schedule.time,
            dayOfWeek: schedule.dayOfWeek,
            dayOfMonth: schedule.dayOfMonth,
            recipients: schedule.recipients,
            format: schedule.format,
            enabled: schedule.enabled,
            filters: schedule.filters,
          });
          // Programación creada exitosamente
        } else {
          // Actualizar existente
          await scheduleRepository.update(schedule.id, schedule);
        }

        toast.success(
          t('reports.schedule.success'),
          language === 'ca-ES'
            ? 'Informe programat correctament'
            : 'Informe programado correctamente',
        );
        setScheduleDialogOpen(false);
        setScheduleReportType(null);
      } catch (error) {
        toast.error(
          t('reports.schedule.error'),
          error instanceof Error ? error.message : t('reports.schedule.error'),
        );
      }
    },
    [toast, t, language, scheduleRepository],
  );

  const handleDeleteSchedule = React.useCallback(
    async (id: string) => {
      try {
        await scheduleRepository.delete(id);
        toast.success(
          t('reports.schedule.success'),
          language === 'ca-ES'
            ? 'Programació eliminada'
            : 'Programación eliminada',
        );
      } catch (error) {
        toast.error(
          t('reports.schedule.error'),
          error instanceof Error ? error.message : t('reports.schedule.error'),
        );
      }
    },
    [scheduleRepository, toast, t, language],
  );

  const handleApplyFilters = React.useCallback(() => {
    if (currentReport) {
      handleGenerateReport(currentReport.type, reportFilters);
    }
  }, [currentReport, reportFilters, handleGenerateReport]);

  const handleClearFilters = React.useCallback(() => {
    setReportFilters({});
    if (currentReport) {
      handleGenerateReport(currentReport.type, {});
    }
  }, [currentReport, handleGenerateReport]);

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

        {/* Botones de exportación */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportReport(currentReport.type, 'xlsx')}
          >
            <Download className="mr-2 h-4 w-4" />
            {t('reports.export.excel')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportReport(currentReport.type, 'csv')}
          >
            <Download className="mr-2 h-4 w-4" />
            {t('reports.export.csv')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportReport(currentReport.type, 'json')}
          >
            <Download className="mr-2 h-4 w-4" />
            {t('reports.export.json')}
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {currentReport.type === 'executive_summary' && (
            <>
              <ReportKPI
                label={t('reports.kpi.totalValue')}
                value={(currentReport as ExecutiveSummaryReport).kpis.totalValue}
                icon={<DollarSign className="h-5 w-5" />}
                accentColor="blue"
                format="currency"
                language={language}
              />
              <ReportKPI
                label={t('reports.kpi.totalProducts')}
                value={(currentReport as ExecutiveSummaryReport).kpis.totalProducts}
                icon={<Package className="h-5 w-5" />}
                accentColor="green"
                format="number"
                language={language}
              />
              <ReportKPI
                label={t('reports.kpi.lowStock')}
                value={(currentReport as ExecutiveSummaryReport).kpis.lowStockCount}
                icon={<AlertTriangle className="h-5 w-5" />}
                accentColor="amber"
                format="number"
                language={language}
              />
              <ReportKPI
                label={t('reports.kpi.movements')}
                value={(currentReport as ExecutiveSummaryReport).kpis.movementsCount}
                icon={<ArrowUpDown className="h-5 w-5" />}
                accentColor="purple"
                format="number"
                language={language}
              />
              <ReportKPI
                label={t('reports.kpi.turnover')}
                value={(currentReport as ExecutiveSummaryReport).kpis.turnoverRate}
                icon={<TrendingUp className="h-5 w-5" />}
                accentColor="indigo"
                format="number"
                language={language}
              />
              <ReportKPI
                label={t('reports.kpi.avgStock')}
                value={(currentReport as ExecutiveSummaryReport).kpis.avgStockValue}
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
                value={(currentReport as ExecutiveSummaryReport).kpis.productsWithoutMovement}
                icon={<X className="h-5 w-5" />}
                accentColor="red"
                format="number"
                language={language}
              />
            </>
          )}
          {currentReport.type === 'stock_analysis' && (
            <>
              <ReportKPI
                label={language === 'ca-ES' ? 'Crítics' : 'Críticos'}
                value={(currentReport as StockAnalysisReport).kpis.criticalCount}
                icon={<AlertTriangle className="h-5 w-5" />}
                accentColor="red"
                format="number"
                language={language}
              />
              <ReportKPI
                label={language === 'ca-ES' ? 'Alta Alerta' : 'Alta Alerta'}
                value={(currentReport as StockAnalysisReport).kpis.highAlertCount}
                icon={<TrendingDown className="h-5 w-5" />}
                accentColor="amber"
                format="number"
                language={language}
              />
              <ReportKPI
                label={language === 'ca-ES' ? 'Alerta Mitjana' : 'Alerta Media'}
                value={(currentReport as StockAnalysisReport).kpis.mediumAlertCount}
                icon={<Package className="h-5 w-5" />}
                accentColor="blue"
                format="number"
                language={language}
              />
              <ReportKPI
                label={
                  language === 'ca-ES'
                    ? 'Dies Mitjans Fins Agotar'
                    : 'Días Promedio Hasta Agotar'
                }
                value={(currentReport as StockAnalysisReport).kpis.avgDaysUntilDepletion}
                icon={<Calendar className="h-5 w-5" />}
                accentColor="purple"
                format="number"
                language={language}
              />
            </>
          )}
          {currentReport.type === 'movements_analysis' && (
            <>
              <ReportKPI
                label={language === 'ca-ES' ? 'Entrades' : 'Entradas'}
                value={(currentReport as MovementsAnalysisReport).kpis.totalEntries}
                icon={<ArrowUpDown className="h-5 w-5" />}
                accentColor="green"
                format="number"
                language={language}
              />
              <ReportKPI
                label={language === 'ca-ES' ? 'Sortides' : 'Salidas'}
                value={(currentReport as MovementsAnalysisReport).kpis.totalExits}
                icon={<ArrowUpDown className="h-5 w-5" />}
                accentColor="red"
                format="number"
                language={language}
              />
              <ReportKPI
                label={language === 'ca-ES' ? 'Ajustos' : 'Ajustes'}
                value={(currentReport as MovementsAnalysisReport).kpis.totalAdjustments}
                icon={<ArrowUpDown className="h-5 w-5" />}
                accentColor="amber"
                format="number"
                language={language}
              />
              <ReportKPI
                label={language === 'ca-ES' ? 'Transferències' : 'Transferencias'}
                value={(currentReport as MovementsAnalysisReport).kpis.totalTransfers}
                icon={<ArrowUpDown className="h-5 w-5" />}
                accentColor="purple"
                format="number"
                language={language}
              />
            </>
          )}
          {currentReport.type === 'batches_control' && (
            <>
              <ReportKPI
                label={t('reports.kpi.totalBatches')}
                value={(currentReport as BatchesReport).kpis.totalBatches}
                icon={<Layers className="h-5 w-5" />}
                accentColor="blue"
                format="number"
                language={language}
              />
              <ReportKPI
                label={language === 'ca-ES' ? 'Lots OK' : 'Lotes OK'}
                value={(currentReport as BatchesReport).kpis.okBatches}
                icon={<Package className="h-5 w-5" />}
                accentColor="green"
                format="number"
                language={language}
              />
              <ReportKPI
                label={t('reports.kpi.defectiveBatches')}
                value={(currentReport as BatchesReport).kpis.defectiveBatches}
                icon={<AlertTriangle className="h-5 w-5" />}
                accentColor="red"
                format="number"
                language={language}
              />
              <ReportKPI
                label={t('reports.kpi.expiringSoon')}
                value={(currentReport as BatchesReport).kpis.expiringSoon30}
                icon={<Calendar className="h-5 w-5" />}
                accentColor="amber"
                format="number"
                language={language}
              />
            </>
          )}
          {currentReport.type === 'suppliers_analysis' && (
            <>
              <ReportKPI
                label={t('reports.kpi.activeSuppliers')}
                value={(currentReport as SuppliersReport).kpis.activeSuppliers}
                icon={<Users className="h-5 w-5" />}
                accentColor="green"
                format="number"
                language={language}
              />
              <ReportKPI
                label={t('reports.kpi.avgQuality')}
                value={(currentReport as SuppliersReport).kpis.avgQualityRating}
                icon={<TrendingUp className="h-5 w-5" />}
                accentColor="blue"
                format="number"
                language={language}
              />
              <ReportKPI
                label={
                  language === 'ca-ES'
                    ? 'Temps Mitjà Entrega (dies)'
                    : 'Tiempo Promedio Entrega (días)'
                }
                value={(currentReport as SuppliersReport).kpis.avgLeadTime}
                icon={<Calendar className="h-5 w-5" />}
                accentColor="purple"
                format="number"
                language={language}
              />
            </>
          )}
          {currentReport.type === 'audit' && (
            <>
              <ReportKPI
                label={language === 'ca-ES' ? 'Total Accions' : 'Total Acciones'}
                value={(currentReport as AuditReport).kpis.totalActions}
                icon={<FileText className="h-5 w-5" />}
                accentColor="blue"
                format="number"
                language={language}
              />
              <ReportKPI
                label={language === 'ca-ES' ? 'Creacions' : 'Creaciones'}
                value={(currentReport as AuditReport).kpis.creates}
                icon={<Package className="h-5 w-5" />}
                accentColor="green"
                format="number"
                language={language}
              />
              <ReportKPI
                label={language === 'ca-ES' ? 'Actualitzacions' : 'Actualizaciones'}
                value={(currentReport as AuditReport).kpis.updates}
                icon={<TrendingUp className="h-5 w-5" />}
                accentColor="blue"
                format="number"
                language={language}
              />
              <ReportKPI
                label={language === 'ca-ES' ? 'Eliminacions' : 'Eliminaciones'}
                value={(currentReport as AuditReport).kpis.deletes}
                icon={<X className="h-5 w-5" />}
                accentColor="red"
                format="number"
                language={language}
              />
            </>
          )}
          {currentReport.type === 'locations' && (
            <>
              <ReportKPI
                label={t('reports.kpi.totalLocations')}
                value={(currentReport as LocationsReport).kpis.totalLocations}
                icon={<MapPin className="h-5 w-5" />}
                accentColor="blue"
                format="number"
                language={language}
              />
              <ReportKPI
                label={
                  language === 'ca-ES'
                    ? 'Productes sense Ubicació'
                    : 'Productos sin Ubicación'
                }
                value={(currentReport as LocationsReport).kpis.productsWithoutLocation}
                icon={<X className="h-5 w-5" />}
                accentColor="red"
                format="number"
                language={language}
              />
            </>
          )}
          {currentReport.type === 'ai_suggestions' && (
            <>
              <ReportKPI
                label={t('reports.kpi.activeSuggestions')}
                value={(currentReport as AISuggestionsReport).kpis.activeSuggestions}
                icon={<Lightbulb className="h-5 w-5" />}
                accentColor="amber"
                format="number"
                language={language}
              />
              <ReportKPI
                label={language === 'ca-ES' ? 'Pendents' : 'Pendientes'}
                value={(currentReport as AISuggestionsReport).kpis.pending}
                icon={<Calendar className="h-5 w-5" />}
                accentColor="blue"
                format="number"
                language={language}
              />
              <ReportKPI
                label={language === 'ca-ES' ? 'Acceptades' : 'Aceptadas'}
                value={(currentReport as AISuggestionsReport).kpis.accepted}
                icon={<TrendingUp className="h-5 w-5" />}
                accentColor="green"
                format="number"
                language={language}
              />
              <ReportKPI
                label={
                  language === 'ca-ES'
                    ? 'Taxa Acceptació (%)'
                    : 'Tasa Aceptación (%)'
                }
                value={(currentReport as AISuggestionsReport).kpis.acceptanceRate}
                icon={<TrendingUp className="h-5 w-5" />}
                accentColor="indigo"
                format="percentage"
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
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="mr-2 h-4 w-4" />
          {t('reports.filters')}
        </Button>
      </div>

      {/* Filtros */}
      {showFilters && (
        <ReportFiltersComponent
          filters={reportFilters}
          onFiltersChange={setReportFilters}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
        />
      )}

      {/* Grid de informes predefinidos */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <ReportCard
          type="executive_summary"
          title={t('reports.executiveSummary')}
          description={t('reports.executiveSummary.desc')}
          icon={<BarChart3 className="h-6 w-6" />}
          accentColor="blue"
          onView={() => handleViewReport('executive_summary')}
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
          onSchedule={() => handleScheduleReport('ai_suggestions')}
          loading={loading}
        />
      </div>

      {/* Botón para crear informe personalizado */}
      {!showBuilder && (
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
            onClick={() => setShowBuilder(true)}
            className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            {t('reports.custom')}
          </button>
        </div>
      )}

      {/* Lista de plantillas personalizadas */}
      {templates.length > 0 && !showBuilder && (
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-50">
            {language === 'ca-ES' ? 'Plantilles Personalitzades' : 'Plantillas Personalizadas'}
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50"
              >
                <h4 className="font-medium text-gray-900 dark:text-gray-50">
                  {template.name}
                </h4>
                {template.description && (
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {template.description}
                  </p>
                )}
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const report = await reportService.generateCustomReport(
                          {
                            ...template.config,
                            filters: (template.config.filters as ReportFilters) || {},
                          },
                          {} as ReportFilters,
                        );
                        setCurrentReport(report);
                        setShowBuilder(false);
                      } catch (error) {
                        toast.error(
                          t('reports.error'),
                          error instanceof Error
                            ? error.message
                            : t('reports.error'),
                        );
                      }
                    }}
                    className="flex-1 rounded bg-primary-600 px-3 py-1.5 text-sm text-white hover:bg-primary-700"
                  >
                    {t('reports.view')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTemplate(template);
                      setShowBuilder(true);
                    }}
                    className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  >
                    {language === 'ca-ES' ? 'Editar' : 'Editar'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await templateRepository.delete(template.id);
                        setTemplates((prev) => prev.filter((t) => t.id !== template.id));
                        toast.success(
                          t('reports.builder.saveTemplate'),
                          language === 'ca-ES'
                            ? 'Plantilla eliminada'
                            : 'Plantilla eliminada',
                        );
                      } catch (error) {
                        toast.error(
                          t('reports.builder.saveTemplate'),
                          error instanceof Error
                            ? error.message
                            : language === 'ca-ES'
                              ? 'Error eliminant plantilla'
                              : 'Error eliminando plantilla',
                        );
                      }
                    }}
                    className="rounded border border-red-300 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 dark:border-red-600 dark:bg-gray-700 dark:text-red-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Constructor de informes personalizados */}
      {showBuilder && (
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <ReportBuilder
            existingTemplate={editingTemplate}
            onSave={async (template) => {
              try {
                if (editingTemplate) {
                  // Actualizar plantilla existente
                  const updated = await templateRepository.update(editingTemplate.id, {
                    name: template.name,
                    description: template.description,
                    config: {
                      tables: template.tables,
                      fields: template.fields,
                      filters: template.filters,
                      visualizations: template.visualizations,
                    },
                  });
                  setTemplates((prev) =>
                    prev.map((t) => (t.id === editingTemplate.id ? updated : t)),
                  );
                  toast.success(
                    t('reports.builder.saveTemplate'),
                    language === 'ca-ES'
                      ? 'Plantilla actualitzada correctament'
                      : 'Plantilla actualizada correctamente',
                  );
                } else {
                  // Crear nueva plantilla
                  const created = await templateRepository.create({
                    name: template.name,
                    description: template.description,
                    config: {
                      tables: template.tables,
                      fields: template.fields,
                      filters: template.filters,
                      visualizations: template.visualizations,
                    },
                  });
                  setTemplates((prev) => [created, ...prev]);
                  toast.success(
                    t('reports.builder.saveTemplate'),
                    language === 'ca-ES'
                      ? 'Plantilla desada correctament'
                      : 'Plantilla guardada correctamente',
                  );
                }
                setShowBuilder(false);
                setEditingTemplate(null);
              } catch (error) {
                toast.error(
                  t('reports.builder.saveTemplate'),
                  error instanceof Error
                    ? error.message
                    : language === 'ca-ES'
                      ? 'Error desant plantilla'
                      : 'Error guardando plantilla',
                );
              }
            }}
            onCancel={() => {
              setShowBuilder(false);
              setEditingTemplate(null);
            }}
          />
        </div>
      )}

      {/* Diálogo de programación */}
      {scheduleReportType && (
        <ReportScheduleDialog
          reportType={scheduleReportType}
          open={scheduleDialogOpen}
          onClose={() => {
            setScheduleDialogOpen(false);
            setScheduleReportType(null);
          }}
          onSave={handleSaveSchedule}
        />
      )}
    </div>
  );
}
