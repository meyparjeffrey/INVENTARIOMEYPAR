/**
 * Vista de informe de lotes.
 * 
 * Muestra estado de lotes con información detallada.
 * 
 * @module @presentation/components/reports/BatchesReportView
 */

import * as React from 'react';
import type { BatchesReport } from '@domain/entities/Report';
import { Layers, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';

export interface BatchesReportViewProps {
  /** Informe de lotes */
  report: BatchesReport;
}

/**
 * Vista de informe de lotes.
 */
export function BatchesReportView({ report }: BatchesReportViewProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OK':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'DEFECTIVE':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'BLOCKED':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'EXPIRED':
        return <Clock className="h-4 w-4 text-gray-500" />;
      default:
        return <Layers className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      OK: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
      DEFECTIVE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
      BLOCKED: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
      CONSUMED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200',
      EXPIRED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200'
    };
    return badges[status as keyof typeof badges] || badges.OK;
  };

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-gray-500" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total Lotes
            </p>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-50">
            {report.summary.totalBatches}
          </p>
        </div>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
              OK
            </p>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-900 dark:text-emerald-200">
            {report.summary.okBatches}
          </p>
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <p className="text-sm font-medium text-red-900 dark:text-red-200">
              Defectuosos
            </p>
          </div>
          <p className="mt-2 text-2xl font-bold text-red-900 dark:text-red-200">
            {report.summary.defectiveBatches}
          </p>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              Bloqueados
            </p>
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-900 dark:text-amber-200">
            {report.summary.blockedBatches}
          </p>
        </div>

        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <p className="text-sm font-medium text-orange-900 dark:text-orange-200">
              Próximos a Caducar
            </p>
          </div>
          <p className="mt-2 text-2xl font-bold text-orange-900 dark:text-orange-200">
            {report.summary.expiringBatches}
          </p>
        </div>
      </div>

      {/* Tabla de lotes */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Código Lote
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Producto
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Proveedor
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Total
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Disponible
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Defectuosos
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Caducidad
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {report.items.map((item) => (
                <tr
                  key={item.batch.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-50">
                    {item.batch.batchCode}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    <div>
                      <div className="font-medium">{item.product.code}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {item.product.name}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {item.supplierName ?? '-'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-900 dark:text-gray-50">
                    {item.batch.quantityTotal}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                    {item.batch.quantityAvailable}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-red-600 dark:text-red-400">
                    {item.batch.defectiveQty > 0 ? item.batch.defectiveQty : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadge(
                        item.batch.status
                      )}`}
                    >
                      {getStatusIcon(item.batch.status)}
                      {item.batch.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {item.batch.expiryDate
                      ? new Date(item.batch.expiryDate).toLocaleDateString(
                          'es-ES'
                        )
                      : '-'}
                    {item.daysUntilExpiry !== undefined &&
                      item.daysUntilExpiry !== null &&
                      item.daysUntilExpiry <= 30 && (
                        <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                          ({item.daysUntilExpiry} días)
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

