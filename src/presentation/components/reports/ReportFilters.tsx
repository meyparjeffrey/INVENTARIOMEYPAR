/**
 * Componente de filtros avanzados para informes.
 *
 * Permite filtrar informes por fecha, almacén, categoría, usuario, etc.
 *
 * @module @presentation/components/reports/ReportFilters
 */

import { Calendar, Filter, X } from 'lucide-react';
import * as React from 'react';
import { Button } from '../ui/Button';
import { useLanguage } from '../../context/LanguageContext';
import type { ReportFilters } from '@domain/entities/Report';

export interface ReportFiltersProps {
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  onApply: () => void;
  onClear: () => void;
}

/**
 * Componente de filtros avanzados para informes.
 */
export function ReportFiltersComponent({
  filters,
  onFiltersChange,
  onApply,
  onClear,
}: ReportFiltersProps) {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleDateRangeChange = (range: '7d' | '30d' | '3m' | '6m' | '12m' | 'custom') => {
    const now = new Date();
    let dateFrom: string | undefined;
    let dateTo: string | undefined;

    switch (range) {
      case '7d':
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        dateTo = now.toISOString();
        break;
      case '30d':
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        dateTo = now.toISOString();
        break;
      case '3m':
        dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
        dateTo = now.toISOString();
        break;
      case '6m':
        dateFrom = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString();
        dateTo = now.toISOString();
        break;
      case '12m':
        dateFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
        dateTo = now.toISOString();
        break;
      case 'custom':
        // Mantener fechas personalizadas si existen
        return;
    }

    onFiltersChange({ ...filters, dateFrom, dateTo });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            {t('reports.filters')}
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
        </Button>
      </div>

      {isOpen && (
        <div className="mt-4 space-y-4">
          {/* Rango de fechas rápido */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('reports.dateRange')}
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDateRangeChange('7d')}
              >
                {t('reports.last7Days')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDateRangeChange('30d')}
              >
                {t('reports.last30Days')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDateRangeChange('3m')}
              >
                {t('reports.last3Months')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDateRangeChange('6m')}
              >
                {t('reports.last6Months')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDateRangeChange('12m')}
              >
                {t('reports.last12Months')}
              </Button>
            </div>
          </div>

          {/* Fechas personalizadas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('reports.from')}
              </label>
              <input
                type="date"
                value={filters.dateFrom ? filters.dateFrom.split('T')[0] : ''}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    dateFrom: e.target.value ? `${e.target.value}T00:00:00.000Z` : undefined,
                  })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-50"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('reports.to')}
              </label>
              <input
                type="date"
                value={filters.dateTo ? filters.dateTo.split('T')[0] : ''}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    dateTo: e.target.value ? `${e.target.value}T23:59:59.999Z` : undefined,
                  })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-50"
              />
            </div>
          </div>

          {/* Almacén */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('table.warehouse')}
            </label>
            <select
              value={filters.warehouse || ''}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  warehouse: e.target.value
                    ? (e.target.value as 'MEYPAR' | 'OLIVA_TORRAS' | 'FURGONETA')
                    : undefined,
                })
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-50"
            >
              <option value="">{t('filters.all')}</option>
              <option value="MEYPAR">MEYPAR</option>
              <option value="OLIVA_TORRAS">OLIVA_TORRAS</option>
              <option value="FURGONETA">FURGONETA</option>
            </select>
          </div>

          {/* Incluir inactivos */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="includeInactive"
              checked={filters.includeInactive || false}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  includeInactive: e.target.checked,
                })
              }
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label
              htmlFor="includeInactive"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {t('products.includeInactive')}
            </label>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2">
            <Button onClick={onApply} className="flex-1">
              {t('reports.applyFilters')}
            </Button>
            <Button variant="outline" onClick={onClear} className="flex-1">
              {t('reports.clearFilters')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
