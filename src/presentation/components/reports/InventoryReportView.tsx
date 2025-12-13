/**
 * Vista de informe de inventario.
 * 
 * Muestra tabla de productos con métricas, valores y ubicaciones.
 * 
 * @module @presentation/components/reports/InventoryReportView
 */

import * as React from 'react';
import type { InventoryReport } from '@domain/entities/Report';
import { Package, AlertTriangle, DollarSign } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface InventoryReportViewProps {
  /** Informe de inventario */
  report: InventoryReport;
}

/**
 * Vista de informe de inventario.
 */
export function InventoryReportView({ report }: InventoryReportViewProps) {
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            <DollarSign className="h-5 w-5 text-emerald-500" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Valor a Coste
            </p>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-50">
            {formatCurrency(report.summary.totalValueAtCost)}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-500" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Valor a Venta
            </p>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-50">
            {formatCurrency(report.summary.totalValueAtSale)}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              En Alarma
            </p>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-50">
            {report.summary.lowStockCount}
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
                  Stock
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Mínimo
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Ubicación
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Valor Coste
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Valor Venta
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {report.items.map((item) => (
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
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {item.location}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-900 dark:text-gray-50">
                    {formatCurrency(item.valueAtCost)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-900 dark:text-gray-50">
                    {formatCurrency(item.valueAtSale)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.isLowStock ? (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        Bajo
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
                        OK
                      </span>
                    )}
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

