/**
 * Card para cada tipo de informe específico.
 * 
 * Muestra nombre, descripción, icono y botón para generar el informe.
 * 
 * @module @presentation/components/reports/ReportTypeCard
 */

import { motion } from 'framer-motion';
import * as React from 'react';
import { FileText, Play } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/cn';

export interface ReportTypeCardProps {
  /** ID del tipo de informe */
  id: string;
  /** Nombre del informe */
  name: string;
  /** Descripción del informe */
  description: string;
  /** Icono del informe */
  icon?: React.ReactNode;
  /** Si está cargando */
  loading?: boolean;
  /** Callback al generar */
  onGenerate?: () => void;
}

/**
 * Card de tipo de informe.
 */
export function ReportTypeCard({
  name,
  description,
  icon,
  loading,
  onGenerate
}: ReportTypeCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-gray-200 bg-gray-50 p-4 transition-all hover:border-primary-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-900 dark:hover:border-primary-600"
    >
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="rounded-lg bg-primary-100 p-2 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
            {icon}
          </div>
        ) : (
          <FileText className="h-6 w-6 text-gray-400" />
        )}
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-gray-50">
            {name}
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {description}
          </p>
          {onGenerate && (
            <Button
              className="mt-4 w-full"
              size="sm"
              onClick={onGenerate}
              disabled={loading}
            >
              <Play className="mr-2 h-4 w-4" />
              {loading ? 'Generando...' : 'Generar'}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

