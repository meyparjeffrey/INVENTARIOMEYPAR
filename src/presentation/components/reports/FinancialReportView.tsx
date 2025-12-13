/**
 * Vista de informe financiero.
 * 
 * Muestra métricas financieras, valor de inventario y márgenes.
 * 
 * @module @presentation/components/reports/FinancialReportView
 */

import * as React from 'react';
import type { FinancialReport } from '@domain/entities/Report';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { DollarSign, TrendingUp, Package } from 'lucide-react';

export interface FinancialReportViewProps {
  /** Informe financiero */
  report: FinancialReport;
}

/**
 * Vista de informe financiero.
 */
export function FinancialReportView({ report }: FinancialReportViewProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(value);
  };

  // Datos para gráfico circular por categoría
  const categoryData = report.byCategory.map((item) => ({
    name: item.category,
    value: item.valueAtCost
  }));

  const COLORS = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4'
  ];

  return (
    <div className="space-y-6">
      {/* Resumen principal */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
              Valor a Coste
            </p>
          </div>
          <p className="mt-2 text-3xl font-bold text-emerald-900 dark:text-emerald-200">
            {formatCurrency(report.summary.totalValueAtCost)}
          </p>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
              Valor a Venta
            </p>
          </div>
          <p className="mt-2 text-3xl font-bold text-blue-900 dark:text-blue-200">
            {formatCurrency(report.summary.totalValueAtSale)}
          </p>
        </div>

        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <p className="text-sm font-medium text-purple-900 dark:text-purple-200">
              Margen Potencial
            </p>
          </div>
          <p className="mt-2 text-3xl font-bold text-purple-900 dark:text-purple-200">
            {formatCurrency(report.summary.potentialMargin)}
          </p>
          <p className="mt-1 text-sm text-purple-700 dark:text-purple-300">
            {report.summary.marginPercentage.toFixed(1)}%
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-gray-500" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total Unidades
            </p>
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50">
            {report.summary.totalUnits.toLocaleString('es-ES')}
          </p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Gráfico circular por categoría */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-50">
            Distribución por Categoría
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Tabla por categoría */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-50">
            Por Categoría
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Categoría
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Valor Coste
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Unidades
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {report.byCategory.map((item) => (
                  <tr
                    key={item.category}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-50">
                      {item.category}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right text-sm text-gray-900 dark:text-gray-50">
                      {formatCurrency(item.valueAtCost)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right text-sm text-gray-600 dark:text-gray-400">
                      {item.units}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right text-sm text-gray-600 dark:text-gray-400">
                      {item.percentage.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Tabla por almacén */}
      {report.byWarehouse.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-50">
            Por Almacén
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Almacén
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Valor a Coste
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Valor a Venta
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Unidades
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {report.byWarehouse.map((item) => (
                  <tr
                    key={item.warehouse}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-50">
                      {item.warehouse}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right text-sm text-gray-900 dark:text-gray-50">
                      {formatCurrency(item.valueAtCost)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right text-sm text-gray-900 dark:text-gray-50">
                      {formatCurrency(item.valueAtSale)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right text-sm text-gray-600 dark:text-gray-400">
                      {item.units}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

