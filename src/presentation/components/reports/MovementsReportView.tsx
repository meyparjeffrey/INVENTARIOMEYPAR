/**
 * Vista de informe de movimientos.
 * 
 * Muestra tabla de movimientos y gráfico temporal.
 * 
 * @module @presentation/components/reports/MovementsReportView
 */

import * as React from 'react';
import type { MovementsReport } from '@domain/entities/Report';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { ArrowDownRight, ArrowUpRight, RefreshCw } from 'lucide-react';

export interface MovementsReportViewProps {
  /** Informe de movimientos */
  report: MovementsReport;
}

/**
 * Vista de informe de movimientos.
 */
export function MovementsReportView({ report }: MovementsReportViewProps) {
  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-gray-500" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total Movimientos
            </p>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-50">
            {report.summary.totalMovements}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-emerald-500" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Entradas
            </p>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-50">
            {report.summary.totalEntries}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {report.summary.entriesQuantity} unidades
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <ArrowDownRight className="h-5 w-5 text-red-500" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Salidas
            </p>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-50">
            {report.summary.totalExits}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {report.summary.exitsQuantity} unidades
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-500" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Ajustes
            </p>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-50">
            {report.summary.totalAdjustments}
          </p>
        </div>
      </div>

      {/* Gráfico temporal */}
      {report.chartData.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-50">
            Movimientos por Día
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={report.chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="entries" fill="#10b981" name="Entradas" />
              <Bar dataKey="exits" fill="#ef4444" name="Salidas" />
              <Bar dataKey="adjustments" fill="#3b82f6" name="Ajustes" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabla de movimientos */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Tipo
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Producto
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Cantidad
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Motivo
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Usuario
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {report.items.slice(0, 50).map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {new Date(item.movementDate).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        item.movementType === 'IN'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
                          : item.movementType === 'OUT'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                      }`}
                    >
                      {item.movementType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-50">
                    <div>
                      <div className="font-medium">{item.productCode}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {item.productName}
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-gray-50">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {item.requestReason}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {item.userName ?? '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {report.items.length > 50 && (
          <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 text-center text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
            Mostrando 50 de {report.items.length} movimientos
          </div>
        )}
      </div>
    </div>
  );
}

