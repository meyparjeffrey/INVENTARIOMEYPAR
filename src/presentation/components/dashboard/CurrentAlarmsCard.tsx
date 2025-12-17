import * as React from 'react';
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

type AlarmGroupBy = 'category' | 'warehouse' | 'location';

export interface AlarmProductLite {
  id: string;
  code: string;
  name: string;
  stockCurrent: number;
  stockMin: number;
  category?: string | null;
  warehouse?: string | null;
  aisle?: string | null;
  shelf?: string | null;
}

const COLORS = [
  '#f59e0b',
  '#ef4444',
  '#3b82f6',
  '#10b981',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
];

function clampNonNeg(n: number) {
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function getLocationKey(p: AlarmProductLite) {
  const a = (p.aisle ?? '').trim();
  const s = (p.shelf ?? '').trim();
  if (!a && !s) return '';
  if (a && s) return `${a}-${s}`;
  return a || s;
}

export function CurrentAlarmsCard({ products }: { products: AlarmProductLite[] }) {
  const { t, language } = useLanguage();
  const [groupBy, setGroupBy] = React.useState<AlarmGroupBy>('category');

  const inAlarm = React.useMemo(() => {
    return (products ?? []).filter((p) => p.stockCurrent <= p.stockMin);
  }, [products]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, number>();
    const labelFor = (p: AlarmProductLite) => {
      if (groupBy === 'warehouse') {
        return (p.warehouse ?? '').trim() || t('dashboard.unknown');
      }
      if (groupBy === 'location') {
        return getLocationKey(p) || t('dashboard.noLocation');
      }
      // category
      return (p.category ?? '').trim() || t('dashboard.noCategory');
    };

    inAlarm.forEach((p) => {
      const key = labelFor(p);
      map.set(key, (map.get(key) ?? 0) + 1);
    });

    const rows = Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const maxSlices = 6;
    if (rows.length <= maxSlices) return rows;

    const head = rows.slice(0, maxSlices);
    const rest = rows.slice(maxSlices).reduce((sum, r) => sum + r.value, 0);
    return [...head, { name: t('dashboard.other'), value: rest }];
  }, [inAlarm, groupBy, t]);

  const total = grouped.reduce((sum, r) => sum + r.value, 0);

  const topProducts = React.useMemo(() => {
    const sorted = [...inAlarm].sort((a, b) => {
      const aDef = clampNonNeg(a.stockMin - a.stockCurrent);
      const bDef = clampNonNeg(b.stockMin - b.stockCurrent);
      if (bDef !== aDef) return bDef - aDef;
      return (b.stockMin ?? 0) - (a.stockMin ?? 0);
    });
    return sorted.slice(0, 5);
  }, [inAlarm]);

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number }>;
  }) => {
    if (!active || !payload || payload.length === 0) return null;
    const item = payload[0];
    const value = typeof item.value === 'number' ? item.value : Number(item.value) || 0;
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;

    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <p className="mb-1 font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          <span className="font-semibold">{value.toLocaleString(language)}</span> ({pct}%)
        </p>
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            {t('dashboard.currentAlarms')}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('dashboard.currentAlarms.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-semibold">
            {inAlarm.length.toLocaleString(language)}
          </span>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {t('dashboard.groupBy')}
        </span>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-900/30">
          {(
            [
              { key: 'category', label: t('dashboard.group.category') },
              { key: 'warehouse', label: t('dashboard.group.warehouse') },
              { key: 'location', label: t('dashboard.group.location') },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setGroupBy(opt.key)}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                groupBy === opt.key
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {inAlarm.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-gray-400 dark:text-gray-500">
          <p>{t('dashboard.alerts.noneInAlarm')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-1">
          <div>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={grouped}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={2}
                >
                  {grouped.map((d, idx) => (
                    <Cell key={d.name} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {grouped.map((d, idx) => (
                <div
                  key={d.name}
                  className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 dark:border-gray-700 dark:bg-gray-900/30"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <span className="text-gray-600 dark:text-gray-300">
                    {d.name} ({d.value.toLocaleString(language)})
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-50">
              {t('dashboard.alerts.topInAlarm')}
            </div>
            <div className="space-y-2">
              {topProducts.map((p) => {
                const deficit = clampNonNeg(p.stockMin - p.stockCurrent);
                const loc = getLocationKey(p);
                const metaParts = [
                  p.warehouse ? String(p.warehouse) : null,
                  loc ? loc : null,
                ].filter(Boolean);

                return (
                  <div
                    key={p.id}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-800"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-gray-900 dark:text-gray-50">
                          {p.code} · {p.name}
                        </div>
                        {metaParts.length > 0 && (
                          <div className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                            {metaParts.join(' · ')}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-amber-700 dark:text-amber-300">
                          -{deficit.toLocaleString(language)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {t('dashboard.alerts.currentMin', {
                            current: p.stockCurrent,
                            min: p.stockMin,
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
