/**
 * Componente de KPI para informes.
 *
 * Muestra un indicador clave de rendimiento con valor,
 * etiqueta, icono opcional y variación opcional.
 *
 * @module @presentation/components/reports/ReportKPI
 */

import * as React from 'react';
import { cn } from '../../lib/cn';
// formatCurrency se importará cuando sea necesario

export interface ReportKPIProps {
  /** Etiqueta del KPI */
  label: string;
  /** Valor del KPI */
  value: number | string;
  /** Icono opcional */
  icon?: React.ReactNode;
  /** Color de acento */
  accentColor?: 'blue' | 'green' | 'amber' | 'purple' | 'red' | 'indigo';
  /** Formato del valor (number, currency, percentage) */
  format?: 'number' | 'currency' | 'percentage';
  /** Variación opcional (ej: +5.2%) */
  variation?: number;
  /** Si está cargando */
  loading?: boolean;
  /** Idioma para formateo */
  language?: 'es-ES' | 'ca-ES';
}

const accentColors = {
  blue: 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20',
  green: 'border-l-green-500 bg-green-50 dark:bg-green-950/20',
  amber: 'border-l-amber-500 bg-amber-50 dark:bg-amber-950/20',
  purple: 'border-l-purple-500 bg-purple-50 dark:bg-purple-950/20',
  red: 'border-l-red-500 bg-red-50 dark:bg-red-950/20',
  indigo: 'border-l-indigo-500 bg-indigo-50 dark:bg-indigo-950/20',
};

/**
 * Componente de KPI para informes.
 */
export function ReportKPI({
  label,
  value,
  icon,
  accentColor = 'blue',
  format = 'number',
  variation,
  loading = false,
  language = 'ca-ES',
}: ReportKPIProps) {
  const formatValue = (val: number | string): string => {
    if (loading) return '...';
    if (typeof val === 'string') return val;

    switch (format) {
      case 'currency': {
        const numVal = typeof val === 'number' ? val : parseFloat(String(val));
        return new Intl.NumberFormat(language, {
          style: 'currency',
          currency: 'EUR',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(numVal);
      }
      case 'percentage':
        return `${val.toFixed(1)}%`;
      case 'number':
      default:
        return val.toLocaleString(language);
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border-l-4 p-4 shadow-sm transition-all duration-200 hover:shadow-md',
        accentColors[accentColor],
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-50">
            {formatValue(value)}
          </p>
          {variation !== undefined && (
            <p
              className={cn(
                'mt-1 text-xs font-medium',
                variation >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400',
              )}
            >
              {variation >= 0 ? '+' : ''}
              {variation.toFixed(1)}%
            </p>
          )}
        </div>
        {icon && (
          <div className="ml-4 rounded-full bg-white/50 p-2 dark:bg-gray-800/50">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
