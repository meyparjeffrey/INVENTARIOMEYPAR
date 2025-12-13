/**
 * Página principal de informes.
 *
 * Muestra categorías de informes, permite generar diferentes tipos de informes,
 * configurar filtros y exportar resultados.
 *
 * @module @presentation/pages/ReportsPage
 * @requires @presentation/hooks/useReports
 * @requires @presentation/context/LanguageContext
 * @requires @presentation/context/AuthContext
 */

import {
  Package,
  ArrowLeftRight,
  Layers,
  DollarSign,
  Factory,
  Brain,
  RefreshCw,
  BarChart3,
  AlertTriangle,
  X,
} from 'lucide-react';
import * as React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useReports } from '../hooks/useReports';
import { Button } from '../components/ui/Button';
import type { ReportCategory, ReportType, Report } from '@domain/entities/Report';
import { ReportPreview } from '../components/reports/ReportPreview';
import { InventoryReportView } from '../components/reports/InventoryReportView';
import { MovementsReportView } from '../components/reports/MovementsReportView';
import { LowStockReportView } from '../components/reports/LowStockReportView';
import { ABCReportView } from '../components/reports/ABCReportView';
import { FinancialReportView } from '../components/reports/FinancialReportView';
import { BatchesReportView } from '../components/reports/BatchesReportView';
import { ExportService } from '@application/services/ExportService';

/**
 * Configuración de categorías de informes.
 */
interface ReportCategoryConfig {
  id: ReportCategory;
  icon: React.ReactNode;
  color: string;
  reportTypes: Array<{
    id: ReportType;
    nameKey: string;
    descriptionKey: string;
  }>;
}

/**
 * Página principal de informes.
 */
export function ReportsPage() {
  const { t } = useLanguage();
  const { authContext } = useAuth();
  const {
    report,
    loading,
    error,
    generateInventoryReport,
    generateABCReport,
    generateMovementsReport,
    generateStockRotationReport,
    generateFinancialReport,
    generateBatchesReport,
    generateExpiringBatchesReport,
    generateDefectsReport,
    generateLowStockReport,
    generateSupplierQualityReport,
    generateConsumptionTrendsReport,
    generateReorderPredictionsReport,
    generateBatchAnomaliesReport,
    generateStockOptimizationReport,
    clearReport,
  } = useReports();

  const [selectedCategory, setSelectedCategory] = React.useState<ReportCategory | null>(
    null,
  );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedReportType, setSelectedReportType] = React.useState<ReportType | null>(
    null,
  );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showFilters, setShowFilters] = React.useState(false);

  // Verificar permisos
  const canViewReports = authContext?.permissions?.includes('reports.view') ?? false;
  const canExportExcel =
    authContext?.permissions?.includes('reports.export_excel') ?? false;
  const canExportPDF = authContext?.permissions?.includes('reports.export_pdf') ?? false;

  // Configuración de categorías
  const categories: ReportCategoryConfig[] = React.useMemo(
    () => [
      {
        id: 'INVENTORY',
        icon: <Package className="h-8 w-8" />,
        color: 'emerald',
        reportTypes: [
          {
            id: 'INVENTORY',
            nameKey: 'reports.types.inventory',
            descriptionKey: 'reports.descriptions.inventory',
          },
          {
            id: 'LOW_STOCK',
            nameKey: 'reports.types.lowStock',
            descriptionKey: 'reports.descriptions.lowStock',
          },
          {
            id: 'ABC_ANALYSIS',
            nameKey: 'reports.types.abcAnalysis',
            descriptionKey: 'reports.descriptions.abcAnalysis',
          },
          {
            id: 'STOCK_ROTATION',
            nameKey: 'reports.types.stockRotation',
            descriptionKey: 'reports.descriptions.stockRotation',
          },
        ],
      },
      {
        id: 'MOVEMENTS',
        icon: <ArrowLeftRight className="h-8 w-8" />,
        color: 'blue',
        reportTypes: [
          {
            id: 'MOVEMENTS',
            nameKey: 'reports.types.movements',
            descriptionKey: 'reports.descriptions.movements',
          },
          {
            id: 'CONSUMPTION_TRENDS',
            nameKey: 'reports.types.consumptionTrends',
            descriptionKey: 'reports.descriptions.consumptionTrends',
          },
        ],
      },
      {
        id: 'BATCHES',
        icon: <Layers className="h-8 w-8" />,
        color: 'purple',
        reportTypes: [
          {
            id: 'BATCHES',
            nameKey: 'reports.types.batches',
            descriptionKey: 'reports.descriptions.batches',
          },
          {
            id: 'EXPIRING_BATCHES',
            nameKey: 'reports.types.expiringBatches',
            descriptionKey: 'reports.descriptions.expiringBatches',
          },
          {
            id: 'DEFECTS',
            nameKey: 'reports.types.defects',
            descriptionKey: 'reports.descriptions.defects',
          },
        ],
      },
      {
        id: 'FINANCIAL',
        icon: <DollarSign className="h-8 w-8" />,
        color: 'amber',
        reportTypes: [
          {
            id: 'FINANCIAL',
            nameKey: 'reports.types.financial',
            descriptionKey: 'reports.descriptions.financial',
          },
        ],
      },
      {
        id: 'SUPPLIERS',
        icon: <Factory className="h-8 w-8" />,
        color: 'orange',
        reportTypes: [
          {
            id: 'SUPPLIER_QUALITY',
            nameKey: 'reports.types.supplierQuality',
            descriptionKey: 'reports.descriptions.supplierQuality',
          },
        ],
      },
      {
        id: 'ANALYSIS',
        icon: <BarChart3 className="h-8 w-8" />,
        color: 'indigo',
        reportTypes: [
          {
            id: 'ABC_ANALYSIS',
            nameKey: 'reports.types.abcAnalysis',
            descriptionKey: 'reports.descriptions.abcAnalysis',
          },
          {
            id: 'STOCK_ROTATION',
            nameKey: 'reports.types.stockRotation',
            descriptionKey: 'reports.descriptions.stockRotation',
          },
          {
            id: 'CONSUMPTION_TRENDS',
            nameKey: 'reports.types.consumptionTrends',
            descriptionKey: 'reports.descriptions.consumptionTrends',
          },
        ],
      },
      {
        id: 'AI',
        icon: <Brain className="h-8 w-8" />,
        color: 'pink',
        reportTypes: [
          {
            id: 'REORDER_PREDICTIONS',
            nameKey: 'reports.types.reorderPredictions',
            descriptionKey: 'reports.descriptions.reorderPredictions',
          },
          {
            id: 'BATCH_ANOMALIES',
            nameKey: 'reports.types.batchAnomalies',
            descriptionKey: 'reports.descriptions.batchAnomalies',
          },
          {
            id: 'STOCK_OPTIMIZATION',
            nameKey: 'reports.types.stockOptimization',
            descriptionKey: 'reports.descriptions.stockOptimization',
          },
        ],
      },
    ],
    [],
  );

  /**
   * Renderiza la vista específica según el tipo de informe.
   */
  const renderReportView = React.useCallback((report: Report) => {
    switch (report.type) {
      case 'INVENTORY':
        return <InventoryReportView report={report} />;
      case 'MOVEMENTS':
        return <MovementsReportView report={report} />;
      case 'LOW_STOCK':
        return <LowStockReportView report={report} />;
      case 'ABC_ANALYSIS':
        return <ABCReportView report={report} />;
      case 'FINANCIAL':
        return <FinancialReportView report={report} />;
      case 'BATCHES':
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return <BatchesReportView report={report as any} />;
      case 'EXPIRING_BATCHES':
        // ExpiringBatchesReport tiene estructura similar, se puede adaptar
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return <BatchesReportView report={report as any} />;
      default:
        return (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Vista previa no disponible para este tipo de informe.
            </p>
          </div>
        );
    }
  }, []);

  /**
   * Maneja la exportación de un informe.
   */
  const handleExport = React.useCallback(
    async (format: 'EXCEL' | 'PDF' | 'CSV') => {
      if (!report) return;

      // Obtener idioma actual del contexto
      const currentLang = authContext?.settings?.language || 'ca-ES';
      const lang = currentLang === 'ca-ES' ? 'ca-ES' : 'es-ES';

      try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const reportTypeName =
          t(`reports.types.${report.type.toLowerCase()}`) || report.type;
        const config = {
          fileName: `informe_${report.type.toLowerCase()}_${new Date().toISOString().split('T')[0]}`,
          format: format.toLowerCase() as 'xlsx' | 'csv' | 'pdf',
          columns: [],
          language: lang as 'es-ES' | 'ca-ES',
        };

        // Todas las funciones ahora son asíncronas, así que siempre usamos await
        switch (report.type) {
          case 'INVENTORY':
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await ExportService.exportInventoryReport(report as any, config);
            break;
          case 'MOVEMENTS':
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await ExportService.exportMovementsReport(report as any, config);
            break;
          case 'ABC_ANALYSIS':
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await ExportService.exportABCReport(report as any, config);
            break;
          case 'FINANCIAL':
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await ExportService.exportFinancialReport(report as any, config);
            break;
          case 'LOW_STOCK':
            // Usar exportInventoryReport para stock bajo
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await ExportService.exportInventoryReport(report as any, config);
            break;
          case 'BATCHES':
          case 'EXPIRING_BATCHES':
            // Exportar lotes usando exportBatches si está disponible
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (report.type === 'BATCHES' && (report as any).items) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const batches = (report as any).items.map((item: any) => ({
                ...item.batch,
                productName: item.product?.name,
              }));
              ExportService.exportBatches(batches, {
                ...config,
                columns: [
                  'batchCode',
                  'productName',
                  'quantityTotal',
                  'quantityAvailable',
                  'status',
                  'expiryDate',
                ],
              });
            } else {
              // eslint-disable-next-line no-console
              console.warn('Exportación de lotes no implementada aún');
            }
            break;
          default:
            // eslint-disable-next-line no-console
            console.warn(
              'Exportación no implementada para este tipo de informe:',
              report.type,
            );
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error al exportar informe:', error);
        alert(t('reports.exportError') || 'Error al exportar el informe');
      }
    },
    [report, authContext, t],
  );

  /**
   * Maneja la impresión del informe.
   */
  const handlePrint = React.useCallback(() => {
    if (!report) return;

    // Crear una ventana nueva para imprimir
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert(t('reports.printError') || 'No se pudo abrir la ventana de impresión');
      return;
    }

    // Obtener el contenido del informe
    const reportTypeName = t(`reports.types.${report.type.toLowerCase()}`) || report.type;
    const generatedDate = new Date(report.generatedAt).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Generar HTML para imprimir
    let content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportTypeName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #1f2937; }
            .header { margin-bottom: 20px; }
            .date { color: #6b7280; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
            th { background-color: #f3f4f6; font-weight: bold; }
            .summary { margin-top: 20px; padding: 15px; background-color: #f9fafb; border-radius: 8px; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${reportTypeName}</h1>
            <p class="date">Generado el ${generatedDate}</p>
          </div>
    `;

    // Añadir contenido según el tipo de informe
    switch (report.type) {
      case 'INVENTORY':
      case 'LOW_STOCK': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invReport = report as any;
        content += `
          <div class="summary">
            <h3>Resumen</h3>
            <p>Total Productos: ${invReport.summary?.totalProducts || 0}</p>
            <p>Valor a Coste: ${(invReport.summary?.totalValueAtCost || 0).toFixed(2)} €</p>
            <p>Valor a Venta: ${(invReport.summary?.totalValueAtSale || 0).toFixed(2)} €</p>
            <p>Productos en Alarma: ${invReport.summary?.lowStockCount || 0}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Stock</th>
                <th>Mínimo</th>
                <th>Ubicación</th>
                <th>Valor Coste</th>
              </tr>
            </thead>
            <tbody>
        `;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (invReport.items || []).slice(0, 100).forEach((item: any) => {
          content += `
            <tr>
              <td>${item.product?.code || ''}</td>
              <td>${item.product?.name || ''}</td>
              <td>${item.currentStock || 0}</td>
              <td>${item.stockMin || 0}</td>
              <td>${item.location || ''}</td>
              <td>${(item.valueAtCost || 0).toFixed(2)} €</td>
            </tr>
          `;
        });
        content += '</tbody></table>';
        break;
      }
      case 'MOVEMENTS': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const movReport = report as any;
        content += `
          <div class="summary">
            <h3>Resumen</h3>
            <p>Total Movimientos: ${movReport.summary?.totalMovements || 0}</p>
            <p>Entradas: ${movReport.summary?.totalEntries || 0}</p>
            <p>Salidas: ${movReport.summary?.totalExits || 0}</p>
            <p>Ajustes: ${movReport.summary?.totalAdjustments || 0}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Motivo</th>
              </tr>
            </thead>
            <tbody>
        `;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (movReport.items || []).slice(0, 100).forEach((item: any) => {
          content += `
            <tr>
              <td>${new Date(item.movementDate).toLocaleDateString('es-ES')}</td>
              <td>${item.movementType || ''}</td>
              <td>${item.productName || ''}</td>
              <td>${item.quantity || 0}</td>
              <td>${item.requestReason || ''}</td>
            </tr>
          `;
        });
        content += '</tbody></table>';
        break;
      }
      default:
        content += `<p>Vista previa no disponible para impresión de este tipo de informe.</p>`;
    }

    content += `
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();

    // Esperar a que se cargue el contenido antes de imprimir
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }, [report, t]);

  /**
   * Maneja el compartir del informe.
   */
  const handleShare = React.useCallback(async () => {
    if (!report) return;

    const reportTypeName = t(`reports.types.${report.type.toLowerCase()}`) || report.type;
    const generatedDate = new Date(report.generatedAt).toLocaleDateString('es-ES');

    // Preparar datos para compartir
    const shareData = {
      title: `${reportTypeName} - ${generatedDate}`,
      text: `${reportTypeName}\nGenerado el ${generatedDate}\n\n`,
      url: window.location.href,
    };

    try {
      // Intentar usar Web Share API si está disponible
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback: copiar al portapapeles
        const textToCopy = `${shareData.title}\n${shareData.text}${shareData.url}`;
        await navigator.clipboard.writeText(textToCopy);
        alert(t('reports.copiedToClipboard') || 'Enlace copiado al portapapeles');
      }
    } catch (error) {
      // Si el usuario cancela, no hacer nada
      if ((error as Error).name !== 'AbortError') {
        // Fallback: copiar al portapapeles
        try {
          const textToCopy = `${shareData.title}\n${shareData.text}${shareData.url}`;
          await navigator.clipboard.writeText(textToCopy);
          alert(t('reports.copiedToClipboard') || 'Enlace copiado al portapapeles');
        } catch (clipboardError) {
          // eslint-disable-next-line no-console
          console.error('Error al compartir:', clipboardError);
          alert(t('reports.shareError') || 'Error al compartir el informe');
        }
      }
    }
  }, [report, t]);

  /**
   * Maneja la generación de un informe según su tipo.
   */
  const handleGenerateReport = React.useCallback(
    async (reportType: ReportType) => {
      setSelectedReportType(reportType);
      setShowFilters(false);

      try {
        switch (reportType) {
          case 'INVENTORY':
            await generateInventoryReport();
            break;
          case 'ABC_ANALYSIS':
            await generateABCReport();
            break;
          case 'MOVEMENTS':
            await generateMovementsReport();
            break;
          case 'STOCK_ROTATION':
            await generateStockRotationReport();
            break;
          case 'FINANCIAL':
            await generateFinancialReport();
            break;
          case 'BATCHES':
            await generateBatchesReport();
            break;
          case 'EXPIRING_BATCHES':
            await generateExpiringBatchesReport(30);
            break;
          case 'DEFECTS':
            await generateDefectsReport();
            break;
          case 'LOW_STOCK':
            await generateLowStockReport();
            break;
          case 'SUPPLIER_QUALITY':
            await generateSupplierQualityReport();
            break;
          case 'CONSUMPTION_TRENDS':
            await generateConsumptionTrendsReport();
            break;
          case 'REORDER_PREDICTIONS':
            await generateReorderPredictionsReport(7);
            break;
          case 'BATCH_ANOMALIES':
            await generateBatchAnomaliesReport();
            break;
          case 'STOCK_OPTIMIZATION':
            await generateStockOptimizationReport();
            break;
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error generando informe:', err);
      }
    },
    [
      generateInventoryReport,
      generateABCReport,
      generateMovementsReport,
      generateStockRotationReport,
      generateFinancialReport,
      generateBatchesReport,
      generateExpiringBatchesReport,
      generateDefectsReport,
      generateLowStockReport,
      generateSupplierQualityReport,
      generateConsumptionTrendsReport,
      generateReorderPredictionsReport,
      generateBatchAnomaliesReport,
      generateStockOptimizationReport,
    ],
  );

  // Si no tiene permisos, mostrar mensaje
  if (!canViewReports) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-gray-50">
            {t('reports.noPermission') || 'Sin permisos'}
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t('reports.noPermissionMessage') ||
              'No tienes permisos para ver informes. Contacta con un administrador.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
            {t('reports.title') || 'Informes'}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('reports.subtitle') ||
              'Genera y exporta informes detallados de tu inventario'}
          </p>
        </div>
        {report && (
          <Button variant="outline" size="sm" onClick={clearReport}>
            <X className="mr-2 h-4 w-4" />
            {t('common.close') || 'Cerrar'}
          </Button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <div className="flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-primary-600" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">
            {t('reports.generating') || 'Generando informe...'}
          </span>
        </div>
      )}

      {/* Report preview - Se mostrará cuando haya un informe generado */}
      {report && !loading && (
        <div className="space-y-6">
          <ReportPreview
            report={report}
            loading={loading}
            onExport={handleExport}
            onPrint={handlePrint}
            onShare={handleShare}
            canExportExcel={canExportExcel}
            canExportPDF={canExportPDF}
          />
          {renderReportView(report)}
        </div>
      )}

      {/* Categories grid - Solo mostrar si no hay informe generado */}
      {!report && !loading && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => {
                  setSelectedCategory(category.id);
                  setSelectedReportType(null);
                }}
                className={`group relative overflow-hidden rounded-xl border-2 border-gray-200 bg-white p-6 text-left transition-all hover:border-${category.color}-300 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:hover:border-${category.color}-600`}
              >
                <div
                  className={`mb-4 inline-flex rounded-lg bg-${category.color}-100 p-3 text-${category.color}-600 dark:bg-${category.color}-900/30 dark:text-${category.color}-400`}
                >
                  {category.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                  {t(`reports.categories.${category.id.toLowerCase()}`) || category.id}
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {category.reportTypes.length}{' '}
                  {t('reports.reportTypes') || 'tipos de informes'}
                </p>
                <div className="mt-4 flex items-center text-sm font-medium text-primary-600 dark:text-primary-400">
                  {t('reports.viewReports') || 'Ver informes'}
                  <ArrowLeftRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </button>
            ))}
          </div>

          {/* Report types for selected category */}
          {selectedCategory && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
                  {t(`reports.categories.${selectedCategory.toLowerCase()}`) ||
                    selectedCategory}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCategory(null);
                    setSelectedReportType(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categories
                  .find((c) => c.id === selectedCategory)
                  ?.reportTypes.map((reportType) => (
                    <div
                      key={reportType.id}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-4 transition-all hover:border-primary-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-900 dark:hover:border-primary-600"
                    >
                      <h3 className="font-semibold text-gray-900 dark:text-gray-50">
                        {t(reportType.nameKey) || reportType.id}
                      </h3>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {t(reportType.descriptionKey) || 'Descripción del informe'}
                      </p>
                      <Button
                        className="mt-4 w-full"
                        size="sm"
                        onClick={() => handleGenerateReport(reportType.id)}
                        disabled={loading}
                      >
                        {t('reports.generate') || 'Generar'}
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
