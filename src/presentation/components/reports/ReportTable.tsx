/**
 * Componente de tabla de datos para informes.
 *
 * Muestra los datos del informe en formato tabla
 * con paginación y formato condicional.
 *
 * @module @presentation/components/reports/ReportTable
 */

import * as React from 'react';
import type { ReportTableData } from '@domain/entities/Report';
import { useLanguage } from '../../context/LanguageContext';

interface ReportTableProps {
  data: ReportTableData;
  loading?: boolean;
}

/**
 * Componente de tabla de datos para informes.
 */
export function ReportTable({ data, loading = false }: ReportTableProps) {
  const { t, language } = useLanguage();

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-r-transparent" />
        </div>
      </div>
    );
  }

  if (
    !data.headers ||
    data.headers.length === 0 ||
    !data.rows ||
    data.rows.length === 0
  ) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <p className="text-center text-gray-500 dark:text-gray-400">
          {t('reports.noData')}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              {data.headers.map((header, index) => (
                <th
                  key={index}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
            {data.rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                {data.headers.map((header, colIndex) => (
                  <td
                    key={colIndex}
                    className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-gray-50"
                  >
                    {row[header] !== null && row[header] !== undefined
                      ? typeof row[header] === 'number'
                        ? row[header].toLocaleString(language)
                        : String(row[header])
                      : '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {data.totals && (
            <tfoot className="bg-gray-100 dark:bg-gray-900">
              <tr className="font-semibold">
                {data.headers.map((header, index) => (
                  <td
                    key={index}
                    className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-gray-50"
                  >
                    {data.totals?.[header] !== null && data.totals?.[header] !== undefined
                      ? typeof data.totals[header] === 'number'
                        ? data.totals[header].toLocaleString(language)
                        : String(data.totals[header])
                      : ''}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
