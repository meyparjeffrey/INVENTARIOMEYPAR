/**
 * Vista de análisis ABC.
 * 
 * Muestra clasificación ABC con gráfico de Pareto.
 * 
 * @module @presentation/components/reports/ABCReportView
 */

import * as React from 'react';
import type { ABCReport } from '@domain/entities/Report';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart
} from 'recharts';
import { TrendingUp, Package } from 'lucide-react';

export interface ABCReportViewProps {
  /** Informe ABC */
  report: ABCReport;
}

/**
 * Vista de análisis ABC.
 */
export function ABCReportView({ report }: ABCReportViewProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(value);
  };

  // Preparar datos para gráfico de Pareto
  const paretoData = report.classifications.map((item) => ({
    product: item.product.code,
    value: item.value,
    cumulative: item.cumulativePercentage
  }));

  return (
    <div className="space-y-6">
      {/* Resumen por categoría */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border-2 border-blue-500 bg-blue-50 p-4 dark:bg-blue-900/20">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
              Categoría A
            </p>
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-900 dark:text-blue-200">
            {report.summary.categoryA.count}
          </p>
          <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
            {formatCurrency(report.summary.categoryA.value)} (
            {report.summary.categoryA.percentage.toFixed(1)}%)
          </p>
        </div>

        <div className="rounded-lg border-2 border-amber-500 bg-amber-50 p-4 dark:bg-amber-900/20">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              Categoría B
            </p>
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-900 dark:text-amber-200">
            {report.summary.categoryB.count}
          </p>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
            {formatCurrency(report.summary.categoryB.value)} (
            {report.summary.categoryB.percentage.toFixed(1)}%)
          </p>
        </div>

        <div className="rounded-lg border-2 border-gray-500 bg-gray-50 p-4 dark:bg-gray-900/20">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
              Categoría C
            </p>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-200">
            {report.summary.categoryC.count}
          </p>
          <p className="mt-1 text-xs text-gray-700 dark:text-gray-300">
            {formatCurrency(report.summary.categoryC.value)} (
            {report.summary.categoryC.percentage.toFixed(1)}%)
          </p>
        </div>
      </div>

      {/* Gráfico de Pareto */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-50">
          Gráfico de Pareto
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={paretoData.slice(0, 20)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="product" angle={-45} textAnchor="end" height={100} />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="value"
              fill="#3b82f6"
              name="Valor"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulative"
              stroke="#ef4444"
              strokeWidth={2}
              name="Acumulado %"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla de clasificación */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Categoría
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Código
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Nombre
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Valor
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Porcentaje
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Acumulado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {report.classifications.map((item, index) => (
                <tr
                  key={item.product.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        item.category === 'A'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                          : item.category === 'B'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200'
                      }`}
                    >
                      {item.category}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-50">
                    {item.product.code}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {item.product.name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-gray-50">
                    {formatCurrency(item.value)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                    {item.percentage.toFixed(2)}%
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                    {item.cumulativePercentage.toFixed(2)}%
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

