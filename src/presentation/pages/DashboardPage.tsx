import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Layers,
  Lightbulb,
  Package,
  RefreshCw,
} from 'lucide-react';
import * as React from 'react';
import { AlertList } from '../components/dashboard/AlertList';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { MovementsChart } from '../components/dashboard/MovementsChart';
import { CurrentAlarmsCard } from '../components/dashboard/CurrentAlarmsCard';
import { TopProducts } from '../components/dashboard/TopProducts';
import { useDashboard } from '../hooks/useDashboard';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/Button';

/**
 * Página principal del dashboard con métricas avanzadas, valor de inventario y gráficos.
 */
export function DashboardPage() {
  const { t, language } = useLanguage();
  const {
    stats,
    loading,
    movementsLoading,
    movementChartData,
    range,
    setRange,
    referenceDate,
    goToPreviousPeriod,
    goToNextPeriod,
    goToToday,
    alarmProducts,
    refresh,
  } = useDashboard(language);
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const rangeLabel = React.useMemo(() => {
    if (range === '7d') {
      const start = new Date(referenceDate);
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `${start.toLocaleDateString(language, { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString(language, { day: 'numeric', month: 'short' })}`;
    }
    if (range === '30d') {
      return referenceDate.toLocaleDateString(language, { month: 'long', year: 'numeric' });
    }
    return referenceDate.getFullYear().toString();
  }, [range, referenceDate, language]);

  const totals = React.useMemo(() => {
    return movementChartData.reduce(
      (acc, d) => {
        acc.entries += d.entries;
        acc.exits += d.exits;
        acc.adjustments += d.adjustments;
        return acc;
      },
      { entries: 0, exits: 0, adjustments: 0 },
    );
  }, [movementChartData]);

  return (
    <div className="space-y-6">
      {/* Título con botón de refrescar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
            {t('dashboard.title')}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {new Date().toLocaleDateString(language, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      {/* Resumen operativo - Tarjetas superiores */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="relative overflow-hidden rounded-xl border-l-4 border-l-emerald-500 bg-gradient-to-br from-white to-emerald-50 p-6 shadow-sm dark:from-gray-800 dark:to-emerald-950/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('dashboard.units')}
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50">
                {loading ? '...' : stats.totalUnits.toLocaleString(language)}
              </p>
              <p className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                <Package className="mr-1 h-4 w-4" />
                {loading ? '...' : stats.totalProducts.toLocaleString(language)}{' '}
                {t('dashboard.products')}
              </p>
            </div>
            <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/30">
              <Boxes className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border-l-4 border-l-purple-500 bg-gradient-to-br from-white to-purple-50 p-6 shadow-sm dark:from-gray-800 dark:to-purple-950/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('dashboard.movementsToday')}
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50">
                {loading ? '...' : stats.movementsToday.toLocaleString(language)}
              </p>
              <p className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                <Layers className="mr-1 h-4 w-4" />
                {t('dashboard.movements')}
              </p>
            </div>
            <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900/30">
              <ArrowUpRight className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border-l-4 border-l-amber-500 bg-gradient-to-br from-white to-amber-50 p-6 shadow-sm dark:from-gray-800 dark:to-amber-950/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('dashboard.lowStockAlerts')}
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50">
                {loading ? '...' : stats.lowStockCount.toLocaleString(language)}
              </p>
              <p className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                <Package className="mr-1 h-4 w-4" />
                {t('dashboard.products')}
              </p>
            </div>
            <div className="rounded-full bg-amber-100 p-3 dark:bg-amber-900/30">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border-l-4 border-l-blue-500 bg-gradient-to-br from-white to-blue-50 p-6 shadow-sm dark:from-gray-800 dark:to-blue-950/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('dashboard.aiSuggestions')}
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50">
                {loading ? '...' : stats.aiSuggestions.toLocaleString(language)}
              </p>
              <p className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                <Lightbulb className="mr-1 h-4 w-4" />
                {t('dashboard.aiSuggestions')}
              </p>
            </div>
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
              <Lightbulb className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Sección principal en columnas */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        {/* Columna Izquierda: Gráficas y Actividad (2/3) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Gráfica de movimientos mejorada */}
          <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            {movementsLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-sm dark:bg-gray-800/50">
                <RefreshCw className="h-8 w-8 animate-spin text-primary-600" />
              </div>
            )}
            
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                  {t('dashboard.movementsChart')}
                </h3>
                <div className="mt-1 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    {t('dashboard.entries')}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-red-500"></span>
                    {t('dashboard.exits')}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                    {t('dashboard.adjustments')}
                  </span>
                </div>
              </div>

              {/* Navegación de periodos INTEGRADA */}
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-900/30">
                  {(
                    [
                      { key: '7d', label: '7d' },
                      { key: '30d', label: '30d' },
                      { key: '12m', label: '12m' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setRange(opt.key)}
                      className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                        range === opt.key
                          ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-gray-50'
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                  <button
                    onClick={goToPreviousPeriod}
                    className="border-r border-gray-200 p-1.5 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
                  >
                    <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </button>
                  <button
                    onClick={goToToday}
                    className="px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    {rangeLabel}
                  </button>
                  <button
                    onClick={goToNextPeriod}
                    className="border-l border-gray-200 p-1.5 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
                  >
                    <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mb-6 grid grid-cols-3 gap-4">
              <div className="rounded-xl bg-emerald-50/50 p-3 dark:bg-emerald-900/10">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  {t('dashboard.entries')}
                </div>
                <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                  {totals.entries.toLocaleString(language)}
                </div>
              </div>
              <div className="rounded-xl bg-red-50/50 p-3 dark:bg-red-900/10">
                <div className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                  {t('dashboard.exits')}
                </div>
                <div className="text-xl font-bold text-red-700 dark:text-red-300">
                  {totals.exits.toLocaleString(language)}
                </div>
              </div>
              <div className="rounded-xl bg-blue-50/50 p-3 dark:bg-blue-900/10">
                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  {t('dashboard.adjustments')}
                </div>
                <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
                  {totals.adjustments.toLocaleString(language)}
                </div>
              </div>
            </div>
            
            <MovementsChart data={movementChartData} />
          </div>

          <ActivityFeed />
        </div>

        <div className="space-y-6">
          <CurrentAlarmsCard products={alarmProducts} />
          <AlertList />
          <TopProducts period="month" />
        </div>
      </div>
    </div>
  );
}
