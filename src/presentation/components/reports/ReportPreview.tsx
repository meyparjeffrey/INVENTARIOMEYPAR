/**
 * Vista previa del informe generado.
 *
 * Muestra tabla con datos, gráficos interactivos, métricas resumidas
 * y botones para exportar, imprimir y compartir.
 *
 * @module @presentation/components/reports/ReportPreview
 */

import * as React from 'react';
import type { Report } from '@domain/entities/Report';
import { Download, FileText, Printer, Share2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { useLanguage } from '../../context/LanguageContext';

export interface ReportPreviewProps {
  /** Informe a mostrar */
  report: Report;
  /** Si está cargando */
  loading?: boolean;
  /** Callback al exportar */
  onExport?: (format: 'EXCEL' | 'PDF' | 'CSV') => void;
  /** Callback al imprimir */
  onPrint?: () => void;
  /** Callback al compartir */
  onShare?: () => void;
  /** Si tiene permisos para exportar Excel */
  canExportExcel?: boolean;
  /** Si tiene permisos para exportar PDF */
  canExportPDF?: boolean;
}

/**
 * Vista previa de informe.
 */
export function ReportPreview({
  report,
  loading,
  onExport,
  onPrint,
  onShare,
  canExportExcel = true,
  canExportPDF = true,
}: ReportPreviewProps) {
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-r-transparent" />
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            {t('reports.generating') || 'Cargando informe...'}
          </p>
        </div>
      </div>
    );
  }

  const reportTypeName = t(`reports.types.${report.type.toLowerCase()}`) || report.type;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {/* Header con acciones */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
            {reportTypeName}
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {t('reports.generatedOn') || 'Generado el'}{' '}
            {new Date(report.generatedAt).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <div className="flex gap-2">
          {canExportExcel && (
            <Button variant="outline" size="sm" onClick={() => onExport?.('EXCEL')}>
              <Download className="mr-2 h-4 w-4" />
              Excel
            </Button>
          )}
          {canExportPDF && (
            <Button variant="outline" size="sm" onClick={() => onExport?.('PDF')}>
              <FileText className="mr-2 h-4 w-4" />
              {t('reports.exportPDF') || 'PDF'}
            </Button>
          )}
          {canExportExcel && (
            <Button variant="outline" size="sm" onClick={() => onExport?.('CSV')}>
              <Download className="mr-2 h-4 w-4" />
              {t('reports.exportCSV') || 'CSV'}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onPrint}>
            <Printer className="mr-2 h-4 w-4" />
            {t('reports.print') || 'Imprimir'}
          </Button>
          <Button variant="outline" size="sm" onClick={onShare}>
            <Share2 className="mr-2 h-4 w-4" />
            {t('reports.share') || 'Compartir'}
          </Button>
        </div>
      </div>
    </div>
  );
}
