/**
 * Vista de informe de stock bajo.
 * 
 * Muestra productos con stock bajo con días estimados hasta agotarse.
 * 
 * @module @presentation/components/reports/LowStockReportView
 */

import * as React from 'react';
import type { LowStockReport } from '@domain/entities/Report';
import { AlertTriangle, Clock, Package } from 'lucide-react';

export interface LowStockReportViewProps {
  /** Informe de stock bajo */
  report: LowStockReport;
}

/**
 * Vista de informe de stock bajo.
 */
export function LowStockReportView({ report }: LowStockReportViewProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-gray-500" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total Productos
            </p>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-50">
            {report.summary.totalProducts}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Urgente
            </p>
          </div>
          <p className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">
            {report.summary.urgent}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {'<'} 7 días
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Advertencia
            </p>
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {report.summary.warning}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            7-30 días
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-gray-500" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Déficit Total
            </p>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-50">
            {report.summary.totalDeficit}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            unidades
          </p>
        </div>
      </div>

      {/* Tabla de productos */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Código
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Nombre
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Stock Actual
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Mínimo
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Déficit
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Días Estimados
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Valor
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Ubicación
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {report.items
                .sort((a, b) => a.estimatedDaysUntilEmpty - b.estimatedDaysUntilEmpty)
                .map((item) => (
                  <tr
                    key={item.product.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-50">
                      {item.product.code}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {item.product.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-900 dark:text-gray-50">
                      {item.currentStock}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                      {item.stockMin}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-red-600 dark:text-red-400">
                      {item.deficit}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                      <span
                        className={`font-medium ${
                          item.estimatedDaysUntilEmpty <= 7
                            ? 'text-red-600 dark:text-red-400'
                            : item.estimatedDaysUntilEmpty <= 30
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {item.estimatedDaysUntilEmpty.toFixed(1)} días
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-900 dark:text-gray-50">
                      {formatCurrency(item.valueAtCost)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {item.location}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

