import { X, Check, Download, FileSpreadsheet, FileText, Filter } from 'lucide-react';
import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../ui/Toast';
import { cn } from '../../lib/cn';

export interface ColumnOption {
  key: string;
  label: string;
  defaultSelected?: boolean;
}

export type ExportFormat = 'xlsx' | 'csv';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnOption[];
  onExport: (
    selectedColumns: string[],
    format: ExportFormat,
    includeFilters: boolean,
  ) => void;
  fileName?: string;
  /** Filtros activos que se pueden incluir en la exportación */
  activeFilters?: Record<string, string>;
  /** Mostrar selector de formato (por defecto true) */
  showFormatSelector?: boolean;
  /** Mostrar opción de incluir filtros (por defecto true si hay filtros) */
  showIncludeFilters?: boolean;
}

/**
 * Modal profesional de exportación con soporte Excel/CSV y filtros.
 */
export function ExportDialog({
  isOpen,
  onClose,
  columns,
  onExport,
  activeFilters,
  showFormatSelector = true,
  showIncludeFilters = true,
}: ExportDialogProps) {
  const { t } = useLanguage();
  const { error: showError } = useToast();
  const [selectedColumns, setSelectedColumns] = React.useState<Set<string>>(new Set());
  const [format, setFormat] = React.useState<ExportFormat>('xlsx');
  const [includeFilters, setIncludeFilters] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  // Actualizar columnas seleccionadas cuando se abre el diálogo o cambian las opciones
  React.useEffect(() => {
    if (isOpen) {
      setSelectedColumns(
        new Set(columns.filter((c) => c.defaultSelected !== false).map((c) => c.key)),
      );
    }
  }, [isOpen, columns]);

  const hasActiveFilters = activeFilters && Object.keys(activeFilters).length > 0;

  const handleToggleColumn = (key: string) => {
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedColumns.size === columns.length) {
      setSelectedColumns(new Set());
    } else {
      setSelectedColumns(new Set(columns.map((c) => c.key)));
    }
  };

  const handleExport = async () => {
    if (selectedColumns.size === 0) {
      showError(
        'Error de exportación',
        'Por favor, selecciona al menos una columna para exportar.',
      );
      return;
    }
    setExporting(true);
    try {
      // eslint-disable-next-line no-console
      console.log('Iniciando exportación:', {
        selectedColumns: Array.from(selectedColumns),
        format,
        includeFilters,
      });
      await onExport(Array.from(selectedColumns), format, includeFilters);
      // eslint-disable-next-line no-console
      console.log('Exportación completada exitosamente');
      onClose();
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error('Error durante la exportación:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Error desconocido al exportar los datos';
      showError('Error al exportar', errorMessage);
      // No cerramos el modal si hay error para que el usuario pueda intentar de nuevo
    } finally {
      setExporting(false);
    }
  };

  const formatOptions: {
    value: ExportFormat;
    label: string;
    icon: React.ReactNode;
    description: string;
  }[] = [
    {
      value: 'xlsx',
      label: 'Excel (.xlsx)',
      icon: <FileSpreadsheet className="h-5 w-5 text-emerald-600" />,
      description: t('export.formatExcelDesc') || 'Formato Excel con estilos',
    },
    {
      value: 'csv',
      label: 'CSV (.csv)',
      icon: <FileText className="h-5 w-5 text-blue-600" />,
      description: t('export.formatCsvDesc') || 'Texto plano separado por comas',
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop que cubre toda la pantalla desde arriba */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            style={{ top: 0, left: 0, right: 0, bottom: 0 }}
          />
          {/* Modal centrado */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header - Siempre visible en la parte superior */}
              <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                    {t('export.title') || 'Exportar Datos'}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t('export.subtitle') || 'Configura tu exportación'}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content - Scrollable pero con altura controlada */}
              <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
                {/* Selector de formato */}
                {showFormatSelector && (
                  <div className="mb-6">
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('export.format') || 'Formato de exportación'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {formatOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setFormat(option.value)}
                          className={cn(
                            'flex flex-col items-center gap-1 rounded-lg border p-3 transition',
                            format === option.value
                              ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500 dark:border-primary-400 dark:bg-primary-900/20'
                              : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600',
                          )}
                        >
                          {option.icon}
                          <span className="text-xs font-medium">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Incluir filtros */}
                {showIncludeFilters && hasActiveFilters && (
                  <div className="mb-6">
                    <label
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition',
                        includeFilters
                          ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
                          : 'border-gray-200 hover:border-gray-300 dark:border-gray-700',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={includeFilters}
                        onChange={(e) => setIncludeFilters(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Filter className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-50">
                            {t('export.includeFilters') || 'Incluir filtros aplicados'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {Object.keys(activeFilters).length}{' '}
                          {t('export.activeFilters') || 'filtros activos'}
                        </p>
                      </div>
                    </label>
                    {includeFilters && (
                      <div className="mt-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-900/50">
                        <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                          {t('export.filtersPreview') || 'Filtros a incluir:'}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(activeFilters).map(([key, value]) => (
                            <span
                              key={key}
                              className="inline-flex items-center rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-800 dark:bg-primary-900/30 dark:text-primary-300"
                            >
                              {key}: {value}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Selector de columnas */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('export.selectColumns') || 'Columnas a exportar'}
                    </label>
                    <button
                      onClick={handleSelectAll}
                      className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                    >
                      {selectedColumns.size === columns.length
                        ? t('export.deselectAll') || 'Deseleccionar todas'
                        : t('export.selectAll') || 'Seleccionar todas'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {columns.map((column) => {
                      const isSelected = selectedColumns.has(column.key);
                      return (
                        <label
                          key={column.key}
                          className={cn(
                            'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition',
                            isSelected
                              ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
                              : 'border-gray-200 hover:border-gray-300 dark:border-gray-700',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleColumn(column.key)}
                            className="h-3.5 w-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="flex-1 truncate text-sm text-gray-900 dark:text-gray-50">
                            {column.label}
                          </span>
                          {isSelected && (
                            <Check className="h-3.5 w-3.5 flex-shrink-0 text-primary-600" />
                          )}
                        </label>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      {selectedColumns.size} / {columns.length}{' '}
                      {t('export.selected') || 'seleccionadas'}
                    </span>
                    {selectedColumns.size === 0 && (
                      <span className="text-amber-600 dark:text-amber-400">
                        {t('export.errorNoColumns') || 'Selecciona al menos una columna'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer - Siempre visible en la parte inferior */}
              <div className="flex-shrink-0 flex items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-xl">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('export.fileNote') || 'El archivo se descargará automáticamente'}
                </p>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={onClose}>
                    {t('common.cancel') || 'Cancelar'}
                  </Button>
                  <Button
                    onClick={handleExport}
                    disabled={selectedColumns.size === 0 || exporting}
                    className="min-w-[130px]"
                  >
                    {exporting ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
                        {t('export.exporting') || 'Exportando...'}
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        {t('export.export') || 'Exportar'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
