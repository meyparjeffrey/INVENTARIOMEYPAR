/**
 * Card visual para cada categoría de informes.
 * 
 * Muestra icono, título, descripción y contador de tipos de informes disponibles.
 * Incluye animaciones hover con Framer Motion.
 * 
 * @module @presentation/components/reports/ReportCategoryCard
 */

import { motion } from 'framer-motion';
import * as React from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface ReportCategoryCardProps {
  /** ID de la categoría */
  id: string;
  /** Icono de la categoría */
  icon: React.ReactNode;
  /** Título de la categoría */
  title: string;
  /** Descripción de la categoría */
  description?: string;
  /** Número de tipos de informes disponibles */
  reportTypesCount: number;
  /** Color de acento de la categoría */
  color: string;
  /** Callback al hacer clic */
  onClick?: () => void;
  /** Si está seleccionada */
  selected?: boolean;
}

/**
 * Card de categoría de informes.
 */
export function ReportCategoryCard({
  icon,
  title,
  description,
  reportTypesCount,
  color,
  onClick,
  selected
}: ReportCategoryCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-xl border-2 bg-white p-6 text-left transition-all dark:bg-gray-800',
        selected
          ? `border-${color}-500 shadow-lg`
          : `border-gray-200 hover:border-${color}-300 hover:shadow-lg dark:border-gray-700 dark:hover:border-${color}-600`,
        onClick && 'cursor-pointer'
      )}
    >
      <div
        className={cn(
          'mb-4 inline-flex rounded-lg p-3',
          `bg-${color}-100 text-${color}-600 dark:bg-${color}-900/30 dark:text-${color}-400`
        )}
      >
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
        {title}
      </h3>
      {description && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {description}
        </p>
      )}
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        {reportTypesCount} tipos de informes
      </p>
      <div className="mt-4 flex items-center text-sm font-medium text-primary-600 dark:text-primary-400">
        Ver informes
        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </motion.div>
  );
}

