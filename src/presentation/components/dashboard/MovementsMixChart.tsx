import * as React from 'react';
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { useLanguage } from '../../context/LanguageContext';

export interface MovementsMixChartProps {
  entries: number;
  exits: number;
  adjustments: number;
}

/**
 * Donut chart: mix de movimientos (entradas/salidas/ajustes) por cantidad.
 */
export function MovementsMixChart({
  entries,
  exits,
  adjustments,
}: MovementsMixChartProps) {
  const { t } = useLanguage();

  const data = React.useMemo(
    () => [
      { name: t('dashboard.entries'), value: entries, color: '#10b981' },
      { name: t('dashboard.exits'), value: exits, color: '#ef4444' },
      { name: t('dashboard.adjustments'), value: adjustments, color: '#3b82f6' },
    ],
    [t, entries, exits, adjustments],
  );

  const total = entries + exits + adjustments;

  if (total <= 0) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400 dark:text-gray-500">
        <p>{t('dashboard.noData')}</p>
      </div>
    );
  }

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; payload: { color: string } }>;
  }) => {
    if (!active || !payload || payload.length === 0) return null;
    const item = payload[0];
    const value = typeof item.value === 'number' ? item.value : Number(item.value) || 0;
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;

    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <p className="mb-1 font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          <span className="font-semibold">{value}</span> ({pct}%)
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={256}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={62}
            outerRadius={92}
            paddingAngle={2}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-3 gap-2 text-xs">
        {data.map((d) => (
          <div
            key={d.name}
            className="flex items-center justify-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 dark:border-gray-700 dark:bg-gray-900/30"
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="text-gray-600 dark:text-gray-300">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
