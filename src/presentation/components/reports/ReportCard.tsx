/**
 * Componente de tarjeta de informe predefinido.
 *
 * Muestra una tarjeta con información del informe, preview de KPIs
 * y acciones rápidas (Ver, Exportar, Programar).
 *
 * @module @presentation/components/reports/ReportCard
 */

import { Download, Eye, Calendar } from 'lucide-react';
import * as React from 'react';
import { Button } from '../ui/Button';
import { useLanguage } from '../../context/LanguageContext';
import { cn } from '../../lib/cn';

export interface ReportCardProps {
  /** Tipo de informe */
  type?:
    | 'executive_summary'
    | 'stock_analysis'
    | 'movements_analysis'
    | 'batches_control'
    | 'suppliers_analysis'
    | 'audit'
    | 'locations'
    | 'ai_suggestions';
  /** Título del informe */
  title: string;
  /** Descripción del informe */
  description: string;
  /** Icono del informe */
  icon: React.ReactNode;
  /** Color de acento */
  accentColor?: 'blue' | 'green' | 'amber' | 'purple' | 'red' | 'indigo';
  /** Callback al hacer clic en Ver */
  onView: () => void;
  /** Callback al hacer clic en Exportar */
  onExport: () => void;
  /** Callback al hacer clic en Programar */
  onSchedule?: () => void;
  /** Si está cargando */
  loading?: boolean;
}

const accentColors = {
  blue: 'border-l-blue-500 bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-950/20',
  green:
    'border-l-green-500 bg-gradient-to-br from-white to-green-50 dark:from-gray-800 dark:to-green-950/20',
  amber:
    'border-l-amber-500 bg-gradient-to-br from-white to-amber-50 dark:from-gray-800 dark:to-amber-950/20',
  purple:
    'border-l-purple-500 bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-950/20',
  red: 'border-l-red-500 bg-gradient-to-br from-white to-red-50 dark:from-gray-800 dark:to-red-950/20',
  indigo:
    'border-l-indigo-500 bg-gradient-to-br from-white to-indigo-50 dark:from-gray-800 dark:to-indigo-950/20',
};

const iconColors = {
  blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
};

/**
 * Tarjeta de informe predefinido.
 */
export function ReportCard({
  title,
  description,
  icon,
  accentColor = 'blue',
  onView,
  onExport,
  onSchedule,
  loading = false,
}: ReportCardProps) {
  const { t } = useLanguage();

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border-l-4 p-6 shadow-sm transition-all duration-300 hover:shadow-md',
        accentColors[accentColor],
      )}
    >
      {/* Efecto de brillo en hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative">
        {/* Header con icono y título */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-lg transition-colors duration-300',
                iconColors[accentColor],
              )}
            >
              {icon}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                {title}
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {description}
              </p>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onView}
            disabled={loading}
            className="flex-1"
          >
            <Eye className="mr-2 h-4 w-4" />
            {t('reports.view')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            disabled={loading}
            className="flex-1"
          >
            <Download className="mr-2 h-4 w-4" />
            {t('reports.export')}
          </Button>
          {onSchedule && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSchedule}
              disabled={loading}
              className="flex-1"
            >
              <Calendar className="mr-2 h-4 w-4" />
              {t('reports.schedule')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
